# Licences

Every model, library and major dependency used in this project is listed here with its licence.

## AI Models

| Model | Publisher | Licence | Notes |
|---|---|---|---|
| Qwen3 (1.7b, 4b, 8b, 14b) | Alibaba Cloud | Apache 2.0 | Default inference model. Commercial use permitted. |
| all-MiniLM-L6-v2 | sentence-transformers | Apache 2.0 | Used for local embeddings. ~90 MB download. |

Both models are open-weight and open-source under Apache 2.0. Neither requires a subscription, API key, or any form of token billing.

## Python Dependencies

| Package | Licence | Purpose |
|---|---|---|
| fastapi | MIT | REST API backend |
| uvicorn | BSD | ASGI server |
| pydantic | MIT | Config validation and request models |
| httpx | BSD | Async HTTP client (Ollama calls, web scraping) |
| aiosqlite | MIT | Async SQLite access |
| pyyaml | MIT | YAML config file parsing |
| python-dotenv | BSD | .env file loading |
| beautifulsoup4 | MIT | HTML parsing for web scraping |
| playwright | Apache 2.0 | JS-heavy site scraping |
| scrapy | BSD | Deep crawl spider |
| sentence-transformers | Apache 2.0 | Local embeddings |
| psutil | BSD | RAM/CPU detection |
| dnspython | ISC | DNS lookups for email verification |
| aiosmtplib | MIT | SMTP email sending |
| pytz | MIT | Timezone handling |

## Frontend Dependencies

| Package | Licence | Purpose |
|---|---|---|
| react | MIT | UI framework |
| react-dom | MIT | DOM renderer |
| react-router-dom | MIT | Client-side routing |
| vite | MIT | Build tool and dev server |

## Original Codebase

| Component | Licence |
|---|---|
| Harvey releases ≤ 0.3.x | MIT (see NOTICE) |
| Sellbird 0.4.0+ | AGPL-3.0 (see LICENSE) |
| This fork's additions | MIT |

The AGPL-3.0 applies to the original Sellbird code that was not part of the MIT-licensed Harvey releases. This fork's new files (ollama_runtime.py, hardware.py, embeddings.py, task_queue.py, agents/sales_agent.py, agents/classifier.py, api/, collectors/scraper.py, collectors/spider.py, frontend/) are MIT licensed.

## No paid dependencies

This project has zero paid dependencies. There are no:

- API keys that bill per token or per request
- Subscription services required for core functionality
- Cloud-hosted AI inference of any kind
- Hidden paid fallback mechanisms

The only paid component that may optionally be configured is an email sending provider (Gmail Workspace ~$7/mo), which is unrelated to AI inference and was part of the original Harvey.
