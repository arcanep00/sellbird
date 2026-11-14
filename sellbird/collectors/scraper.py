from __future__ import annotations

import asyncio
import logging
import random
import re
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger("sellbird.collectors.scraper")

TIMEOUT = httpx.Timeout(connect=8.0, read=15.0, write=8.0, pool=8.0)

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
]

MAX_RETRIES = 2
BACKOFF_BASE = 1.5


def _headers() -> dict:
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }


async def fetch_page(url: str, timeout: float = 15.0) -> str | None:
    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                resp = await client.get(url, headers=_headers())
                if resp.status_code == 200:
                    return resp.text
                if resp.status_code in (429, 503, 502):
                    await asyncio.sleep(BACKOFF_BASE * (2 ** attempt))
                    continue
                return None
        except (httpx.TimeoutException, httpx.TransportError) as e:
            logger.debug(f"Fetch failed for {url}: {e}")
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(BACKOFF_BASE * (2 ** attempt))
        except Exception as e:
            logger.debug(f"Fetch unexpected error for {url}: {e}")
            return None
    return None


def extract_company_info(html: str, url: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()

    description = ""
    meta_desc = soup.find("meta", attrs={"name": "description"})
    if meta_desc and meta_desc.get("content"):
        description = str(meta_desc["content"]).strip()
    if not description:
        og_desc = soup.find("meta", property="og:description")
        if og_desc and og_desc.get("content"):
            description = str(og_desc["content"]).strip()

    body_text = soup.get_text(separator=" ", strip=True)
    body_text = re.sub(r"\s+", " ", body_text)[:3000]

    emails = list(set(re.findall(
        r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", html
    )))
    emails = [e for e in emails if not e.endswith((".png", ".jpg", ".svg", ".gif"))][:5]

    phone_matches = re.findall(
        r"(\+?1?\s?[\(\-]?\d{3}[\)\-\s]?\s?\d{3}[\-\s]?\d{4})", html
    )
    phones = list(set(phone_matches))[:3]

    social = {}
    for a in soup.find_all("a", href=True):
        href = str(a["href"])
        if "linkedin.com/company" in href:
            social["linkedin"] = href
        elif "twitter.com" in href or "x.com" in href:
            social["twitter"] = href
        elif "facebook.com" in href:
            social["facebook"] = href

    domain = urlparse(url).netloc.lstrip("www.")

    return {
        "url": url,
        "domain": domain,
        "title": title,
        "description": description,
        "body_text": body_text,
        "emails": emails,
        "phones": phones,
        "social": social,
    }


def extract_job_postings(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    jobs = []

    job_containers = soup.find_all(
        ["div", "li", "article"],
        class_=re.compile(r"(job|position|opening|career|vacancy)", re.I),
    )

    for container in job_containers[:20]:
        title_el = container.find(["h1", "h2", "h3", "h4", "a"])
        if not title_el:
            continue
        title = title_el.get_text(strip=True)
        if len(title) < 3 or len(title) > 150:
            continue

        location = ""
        loc_el = container.find(class_=re.compile(r"(location|city|office)", re.I))
        if loc_el:
            location = loc_el.get_text(strip=True)

        jobs.append({"title": title, "location": location})

    if not jobs:
        text = soup.get_text()
        matches = re.findall(
            r"((?:hiring|looking for|seeking|join our team)[^\n.]{10,100})", text, re.I
        )
        for m in matches[:5]:
            jobs.append({"title": m.strip(), "location": ""})

    return jobs


def find_contact_emails(html: str) -> list[str]:
    emails = re.findall(
        r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", html
    )
    cleaned = []
    for e in emails:
        e = e.lower().strip(".")
        if any(e.endswith(ext) for ext in (".png", ".jpg", ".svg", ".gif", ".webp")):
            continue
        if any(skip in e for skip in ("example.", "yoursite.", "domain.", "email@")):
            continue
        if e not in cleaned:
            cleaned.append(e)
    return cleaned[:10]


def find_people_on_page(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    people = []

    team_sections = soup.find_all(
        ["div", "section"],
        class_=re.compile(r"(team|staff|people|founder|about|leadership)", re.I),
    )

    for section in team_sections[:3]:
        cards = section.find_all(["div", "li", "article"], limit=10)
        for card in cards:
            name_el = card.find(["h2", "h3", "h4", "strong", "p"])
            if not name_el:
                continue
            name = name_el.get_text(strip=True)
            words = name.split()
            if len(words) < 2 or len(words) > 5:
                continue
            if any(c.isdigit() for c in name):
                continue

            title = ""
            title_el = card.find(
                ["p", "span"],
                class_=re.compile(r"(title|role|position|job)", re.I),
            )
            if title_el:
                title = title_el.get_text(strip=True)
            elif len(card.find_all("p")) >= 2:
                paras = card.find_all("p")
                if len(paras) > 1:
                    title = paras[1].get_text(strip=True)[:80]

            if name and name not in [p["name"] for p in people]:
                people.append({"name": name, "title": title})

    return people[:10]


async def scrape_company(url: str) -> dict:
    if not url.startswith("http"):
        url = "https://" + url

    html = await fetch_page(url)
    if not html:
        return {"url": url, "error": "Could not fetch page", "online": False}

    info = extract_company_info(html, url)

    careers_url = url.rstrip("/") + "/careers"
    careers_html = await fetch_page(careers_url)
    jobs = []
    if careers_html:
        jobs = extract_job_postings(careers_html)
    if not jobs:
        about_url = url.rstrip("/") + "/about"
        about_html = await fetch_page(about_url)
        if about_html:
            info["people"] = find_people_on_page(about_html)

    info["job_postings"] = jobs
    info["online"] = True
    return info


async def scrape_batch(urls: list[str], concurrency: int = 3) -> list[dict]:
    sem = asyncio.Semaphore(concurrency)

    async def _scrape_one(url: str) -> dict:
        async with sem:
            await asyncio.sleep(random.uniform(0.5, 1.5))
            return await scrape_company(url)

    tasks = [_scrape_one(url) for url in urls]
    return await asyncio.gather(*tasks)


async def fetch_with_playwright(url: str, wait_seconds: float = 2.0) -> str | None:
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.set_extra_http_headers({"User-Agent": random.choice(USER_AGENTS)})
            try:
                await page.goto(url, timeout=15000, wait_until="domcontentloaded")
                await asyncio.sleep(wait_seconds)
                html = await page.content()
                return html
            finally:
                await browser.close()
    except ImportError:
        logger.warning("playwright not installed — falling back to httpx")
        return await fetch_page(url)
    except Exception as e:
        logger.warning(f"Playwright fetch failed for {url}: {e}")
        return await fetch_page(url)


async def scrape_js_heavy(url: str) -> dict:
    html = await fetch_with_playwright(url)
    if not html:
        return {"url": url, "error": "Could not fetch page", "online": False}
    info = extract_company_info(html, url)
    info["jobs"] = extract_job_postings(html)
    info["people"] = find_people_on_page(html)
    info["online"] = True
    return info
