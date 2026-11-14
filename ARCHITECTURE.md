# Architecture

## Overview

Harvey is a pipeline application. Each stage is independently runnable. The AI layer is a thin wrapper around a local Ollama HTTP API — there is no dependency on any cloud inference service.

```
React Dashboard (port 3000)
        |
        | HTTP (proxied by Vite in dev, served directly in prod)
        v
FastAPI Backend (port 8000)
  sellbird/api/routes.py
        |
        |-- AI workflows ──> sellbird/agents/sales_agent.py
        |                    sellbird/agents/classifier.py
        |                         |
        |                         v
        |                   sellbird/brain.py ──> Ollama HTTP API (port 11434)
        |
        |-- Web research ──> sellbird/collectors/scraper.py   (internet)
        |                    sellbird/collectors/spider.py    (internet)
        |
        |-- Embeddings ────> sellbird/embeddings.py           (local, Sentence Transformers)
        |
        |-- Storage ───────> sellbird/state.py                (SQLite)
        |
        |-- Task queue ────> sellbird/task_queue.py           (in-memory)
```

## AI layer

`sellbird/brain.py` is the AI router. It supports three providers:

- **ollama** (default) — calls the local Ollama HTTP API at `http://localhost:11434`
- **claude** — original Harvey behaviour, uses Claude Code CLI
- **codex** — original Harvey behaviour, uses Codex CLI

The provider is set in `sellbird.yaml` under `brain.provider`. The default is `ollama`. A failing Ollama instance never causes a silent fallback to a cloud API — the brain marks itself unavailable and returns an empty response.

`sellbird/ollama_runtime.py` handles the actual HTTP calls to Ollama:

- `check_ollama()` — synchronous health check, used at startup and in preflight
- `call_ollama()` — async inference call with timeout and error wrapping
- `pull_model()` — pulls a model by name if not already present

## Hardware detection

`sellbird/hardware.py` detects available RAM, CPU cores and GPU VRAM at startup. The result feeds `recommend_model()` which picks a Qwen3 variant:

| RAM / VRAM | Model |
|---|---|
| < 8 GB RAM, no GPU | qwen3:1.7b |
| 8–16 GB RAM | qwen3:4b |
| 16 GB RAM or 8 GB VRAM | qwen3:8b |
| 32 GB RAM or 16 GB VRAM | qwen3:14b |

If `brain.model` is set in `sellbird.yaml`, that overrides auto-detection.

## Database

`sellbird/state.py` uses SQLite with WAL mode (readers never block the writer). The schema is maintained through a linear migration list indexed by `PRAGMA user_version`.

This fork adds two migrations on top of Harvey's sixteen:

- **v17** — `products` table, `product_icps` table, `product_id` column on prospects and campaigns
- **v18** — `inference_log` table for tracking local model calls

## Internet boundary

The codebase keeps a hard boundary between internet-dependent and offline work:

**Requires internet:**
- `sellbird/collectors/scraper.py` — fetches company websites
- `sellbird/collectors/spider.py` — DuckDuckGo search, Scrapy crawls

**Works offline after model download:**
- All eight AI workflows in `sellbird/agents/`
- `sellbird/embeddings.py` — Sentence Transformers runs locally
- `sellbird/api/routes.py` — all AI endpoints
- `sellbird/state.py` — SQLite reads and writes

## Multi-product support

`sellbird/config.py` adds a `products: list[ProductConfig]` field to `SellbirdConfig`. The primary product lives under `product:` as before; additional products go under `products:`. Every AI workflow accepts an optional `product_id` parameter that selects which product to use.

## Task queue

`sellbird/task_queue.py` is a simple in-memory queue. When an AI endpoint is called and Ollama is unavailable, the caller can enqueue the task via `POST /api/queue`. The queue drains automatically when `check_ollama()` succeeds again. It does not persist across server restarts.

## Frontend

The React frontend in `frontend/` is a Vite app. During development, `vite.config.js` proxies `/api/*` to `http://localhost:8000`. In production you would serve the built `frontend/dist/` through a static file server and point the proxy at the same backend.

The five pages map directly to the assignment's required workflows:

| Page | Workflows |
|---|---|
| Dashboard | Hardware info, Ollama status, quick navigation |
| Products | Business profile generation, ICP generation |
| Prospects | Prospect research, scoring, reply classification |
| Email Generator | Problem statement, personalised email generation |
| Discover | Web scraping, company discovery, buying signal classification |
