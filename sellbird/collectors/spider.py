from __future__ import annotations

import asyncio
import json
import logging
import re
import tempfile
from pathlib import Path
from urllib.parse import urlparse

logger = logging.getLogger("sellbird.collectors.spider")


def run_spider(
    start_urls: list[str],
    allowed_domains: list[str] | None = None,
    max_pages: int = 20,
) -> list[dict]:
    try:
        import scrapy
        from scrapy.crawler import CrawlerProcess
        from scrapy.utils.project import get_project_settings
    except ImportError:
        logger.warning("scrapy not installed — using lightweight scraper instead")
        return _fallback_crawl(start_urls, max_pages)

    results = []
    output_file = Path(tempfile.mktemp(suffix=".json"))

    class CompanySpider(scrapy.Spider):
        name = "company"
        custom_settings = {
            "ROBOTSTXT_OBEY": True,
            "DOWNLOAD_DELAY": 1.0,
            "RANDOMIZE_DOWNLOAD_DELAY": True,
            "CONCURRENT_REQUESTS_PER_DOMAIN": 2,
            "USER_AGENT": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "LOG_LEVEL": "WARNING",
            "FEEDS": {str(output_file): {"format": "json", "overwrite": True}},
            "CLOSESPIDER_PAGECOUNT": max_pages,
        }

        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self.start_urls = start_urls
            self.allowed_domains = allowed_domains or [
                urlparse(u).netloc for u in start_urls
            ]

        def parse(self, response):
            title = response.css("title::text").get(default="").strip()
            description = (
                response.css('meta[name="description"]::attr(content)').get(default="")
                or response.css('meta[property="og:description"]::attr(content)').get(default="")
            ).strip()

            emails = list(set(re.findall(
                r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
                response.text,
            )))
            emails = [
                e for e in emails
                if not e.endswith((".png", ".jpg", ".svg"))
            ][:5]

            phones = list(set(re.findall(
                r"(\+?1?\s?[\(\-]?\d{3}[\)\-\s]?\s?\d{3}[\-\s]?\d{4})",
                response.text,
            )))[:3]

            body_text = " ".join(response.css("body *::text").getall())
            body_text = re.sub(r"\s+", " ", body_text).strip()[:2000]

            jobs = []
            for item in response.css("[class*=job], [class*=position], [class*=opening]"):
                job_title = item.css("h2::text, h3::text, h4::text, a::text").get(default="").strip()
                if 3 < len(job_title) < 100:
                    jobs.append(job_title)

            yield {
                "url": response.url,
                "domain": urlparse(response.url).netloc.lstrip("www."),
                "title": title,
                "description": description,
                "body_text": body_text,
                "emails": emails,
                "phones": phones,
                "job_postings": jobs[:10],
            }

            for link in response.css("a::attr(href)").getall()[:20]:
                yield response.follow(link, self.parse)

    settings = get_project_settings()
    settings.set("LOG_ENABLED", False)
    process = CrawlerProcess(settings)
    process.crawl(CompanySpider)
    process.start()

    if output_file.exists():
        try:
            with open(output_file, encoding="utf-8") as f:
                results = json.load(f)
        except Exception as e:
            logger.warning(f"Failed to read spider output: {e}")
        finally:
            output_file.unlink(missing_ok=True)

    return results


def _fallback_crawl(urls: list[str], max_pages: int = 20) -> list[dict]:
    from sellbird.collectors.scraper import scrape_batch

    async def _run():
        return await scrape_batch(urls[:max_pages])

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, _run())
                return future.result(timeout=120)
        return loop.run_until_complete(_run())
    except Exception as e:
        logger.error(f"Fallback crawl failed: {e}")
        return []


async def discover_companies_from_search(
    queries: list[str],
    max_per_query: int = 10,
) -> list[dict]:
    companies = []
    seen_domains = set()

    for query in queries:
        results = await _search_duckduckgo(query, max_per_query)
        for url, snippet in results:
            domain = urlparse(url).netloc.lstrip("www.")
            if not domain or domain in seen_domains:
                continue
            if _is_junk_domain(domain):
                continue
            seen_domains.add(domain)
            companies.append({
                "url": url,
                "domain": domain,
                "snippet": snippet,
                "source": "search",
            })

    return companies


async def _search_duckduckgo(query: str, max_results: int = 10) -> list[tuple[str, str]]:
    from urllib.parse import quote_plus
    import httpx
    from bs4 import BeautifulSoup

    url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            if resp.status_code != 200:
                return []
    except Exception as e:
        logger.debug(f"DDG search failed: {e}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    results = []
    for item in soup.select(".result")[:max_results]:
        link = item.select_one(".result__a")
        snippet_el = item.select_one(".result__snippet")
        if not (link and link.get("href")):
            continue
        href = str(link["href"])
        if "uddg=" in href:
            from urllib.parse import parse_qs
            try:
                params = parse_qs(urlparse(href).query)
                real = params.get("uddg", [])
                if real:
                    href = real[0]
            except Exception:
                pass
        snippet = snippet_el.get_text(strip=True) if snippet_el else ""
        if href.startswith("http"):
            results.append((href, snippet))

    return results


_JUNK_PATTERNS = [
    re.compile(p, re.I) for p in (
        r"(yelp|yellowpages|facebook|instagram|linkedin|twitter|indeed|glassdoor)\.",
        r"(wikipedia|reddit|quora|medium|forbes)\.",
        r"\.(edu|gov|mil)$",
        r"(directory|listings?|find-?a-)\.",
    )
]


def _is_junk_domain(domain: str) -> bool:
    return any(p.search(domain) for p in _JUNK_PATTERNS)
