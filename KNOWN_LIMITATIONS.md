# Known Limitations

## AI quality

- Smaller models (qwen3:1.7b, qwen3:4b) produce noticeably shorter and sometimes less nuanced outputs compared to larger models or cloud APIs. For best results use qwen3:8b or above.
- JSON parsing occasionally fails on the first attempt with smaller models. The brain retries automatically.
- Email generation quality depends heavily on the research notes provided. The more specific the input, the better the output.

## Task queue

- The task queue is in-memory only. If the API server restarts while tasks are queued, those tasks are lost. A persistent queue (SQLite-backed) is planned but not yet implemented.

## Web scraping

- Some websites block automated requests (Cloudflare, rate limiting). The scraper retries with backoff but cannot bypass active bot protection.
- JavaScript-rendered sites require Playwright. Playwright must be installed separately: `playwright install chromium`.
- Company discovery via DuckDuckGo is rate-limited on repeated use from the same IP.

## Frontend

- The React dashboard has no authentication. It is intended for local use only on `localhost`.
- The dashboard does not support adding prospects manually — they must come from the API or the existing Harvey discovery pipeline.
- The Products page reads product config from `sellbird.yaml`. To add a product you must edit the YAML file and restart the API server.

## Email sending

- This fork's AI layer replaces Claude/Codex with Ollama for all reasoning tasks. The actual email sending (SMTP, Gmail, Microsoft 365) still uses Harvey's original provider code.
- Instantly (Harvey's legacy sending provider) is not tested with the new Ollama backend.

## Embeddings

- `all-MiniLM-L6-v2` downloads approximately 90 MB on first use. This requires internet access once.
- Similarity search only works on prospects already in the database. It does not search the web.

## Multi-product

- Additional products under `products:` in `sellbird.yaml` are supported by the AI workflows but the original Harvey sending pipeline (writer, sender agents) only uses the primary `product:` section. Multi-product sending is not yet wired through.

## Offline test scope

- The offline acceptance test covers all eight AI workflows.
- Web scraping and company discovery are explicitly excluded — they require internet by design.
- The initial `ollama pull` and `pip install` require internet and must be done before going offline.
