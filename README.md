# Harvey — Local Multi-Product AI Sales Agent

A fork of [Sellbird (formerly Harvey)](https://github.com/ethanplusai/sellbird) converted into a fully local, multi-product AI sales agent. No paid APIs. No cloud inference. Everything runs on your machine.

---

## What it does

Harvey finds companies, researches them, generates ICPs, scores prospects, writes personalised cold emails, and classifies replies — all using a local Ollama model. Disconnect the internet after setup and the core AI workflows keep running.

| Workflow | Powered by |
|---|---|
| Business profile generation | Ollama (local) |
| Product-specific ICP generation | Ollama (local) |
| Prospect research from local data | Ollama + Sentence Transformers |
| Buying signal classification | Ollama (local) |
| Problem statement generation | Ollama (local) |
| Personalised email generation | Ollama (local) |
| Prospect scoring & prioritisation | Ollama (local) |
| Reply classification | Ollama (local) |
| Company discovery & web scraping | Scrapy + BeautifulSoup + Playwright (internet required) |

---

## Requirements

- Python 3.11+
- [Ollama](https://ollama.com/download) installed and running
- Node.js 18+ (for the React dashboard)
- 8 GB RAM minimum (16 GB recommended)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/arcanep00/sellbird.git harvey
cd harvey
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -e .
```

### 2. Install Ollama and pull a model

Download Ollama from https://ollama.com/download, then:

```bash
ollama serve
```

In a separate terminal, pull a model. Harvey auto-detects your hardware and recommends one — or pull manually:

```bash
# 16 GB RAM or 8+ GB GPU
ollama pull qwen3:14b

# 8–16 GB RAM
ollama pull qwen3:8b

# 4–8 GB RAM (most laptops)
ollama pull qwen3:4b

# Under 4 GB RAM
ollama pull qwen3:1.7b
```

### 3. Configure

```bash
cp .env.example .env
```

Edit `.env` and set `OLLAMA_BASE_URL` (default is `http://localhost:11434`).

Edit `sellbird.yaml` and fill in your `persona`, `product` and `icp` sections.

### 4. Start the API server

```bash
uvicorn sellbird.api.main:app --reload --port 8000
```

### 5. Start the React dashboard

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Configuration

`sellbird.yaml` is the main config file. The important sections:

```yaml
persona:
  name: "Alex"
  company: "Your Company"
  role: "Business Development"
  email: "alex@yourcompany.com"
  tone: "professional, consultative"

product:
  name: "Your Product"
  description: "What it does and who it helps"
  pricing: "Starting at $X/mo"
  key_benefits:
    - "Benefit 1"
    - "Benefit 2"

icp:
  industries:
    - "SaaS"
  company_size: "10-200 employees"
  titles:
    - "VP Marketing"
    - "Head of Growth"

brain:
  provider: "ollama"
  model: ""             # leave blank for auto-detection
  ollama_url: "http://localhost:11434"
```

---

## API Endpoints

The FastAPI backend runs on port 8000. All AI endpoints require Ollama running.

| Method | Path | What it does |
|---|---|---|
| GET | `/api/health` | Ollama status + hardware info |
| POST | `/api/business-profile` | Generate business profile |
| POST | `/api/icp` | Generate ICP for a product |
| POST | `/api/buying-signals` | Classify buying signals from company data |
| POST | `/api/problem-statement` | Generate problem statement for a prospect |
| POST | `/api/score-prospect` | Score a prospect 0–100 |
| POST | `/api/generate-email` | Write a personalised cold email |
| POST | `/api/classify-reply` | Classify a prospect reply |
| POST | `/api/research-prospect` | Research notes for outreach |
| POST | `/api/scrape-company` | Scrape a company website |
| POST | `/api/discover-companies` | Search web for companies |
| POST | `/api/scrape-and-classify` | Scrape + buying signal analysis |
| GET | `/api/prospects` | List prospects from database |
| POST | `/api/score-all-prospects` | Bulk score all prospects |
| GET | `/api/products` | List configured products |
| GET | `/api/queue` | Task queue status |

Interactive docs: http://localhost:8000/docs

---

## Offline acceptance test

After installing and pulling a model, disconnect your internet and run:

```bash
# Start Ollama (if not already running)
ollama serve

# Start the API
uvicorn sellbird.api.main:app --port 8000

# Test each workflow
curl -X POST http://localhost:8000/api/business-profile
curl -X POST http://localhost:8000/api/icp
curl -X POST http://localhost:8000/api/generate-email \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Jane","last_name":"Doe","title":"CEO","company":"Acme"}'
curl -X POST http://localhost:8000/api/classify-reply \
  -H "Content-Type: application/json" \
  -d '{"reply_text":"Thanks for reaching out, can we chat next week?"}'
```

All eight AI workflows must respond without internet access. The only parts that require internet are `/api/scrape-company` and `/api/discover-companies`.

---

## Hardware requirements

| Config | RAM | GPU | Recommended model |
|---|---|---|---|
| Minimal | 4–8 GB | None | qwen3:1.7b |
| Standard | 8–16 GB | None | qwen3:4b |
| Standard+ | 16 GB | None / any | qwen3:8b |
| High-performance | 32 GB+ or 16 GB VRAM | NVIDIA | qwen3:14b |

Harvey detects your hardware at startup and logs the recommendation. The `/api/health` endpoint returns this info too.

---

## Project structure

```
harvey/
├── sellbird/
│   ├── agents/
│   │   ├── sales_agent.py      # 6 AI workflows
│   │   ├── classifier.py       # buying signals, prospect research
│   │   ├── writer.py           # original email writer (kept)
│   │   └── scout.py            # original prospect finder (kept)
│   ├── api/
│   │   ├── main.py             # FastAPI app
│   │   └── routes.py           # all API endpoints
│   ├── collectors/
│   │   ├── scraper.py          # BeautifulSoup + Playwright
│   │   └── spider.py           # Scrapy + search discovery
│   ├── ollama_runtime.py       # Ollama inference layer
│   ├── hardware.py             # RAM/CPU/GPU detection
│   ├── embeddings.py           # Sentence Transformers
│   ├── task_queue.py           # offline task queue
│   ├── brain.py                # AI provider router (Ollama/Claude/Codex)
│   ├── state.py                # SQLite database + migrations
│   └── config.py               # YAML config loader
├── frontend/
│   ├── src/
│   │   ├── pages/              # Dashboard, Products, Prospects, EmailGen, Discover
│   │   └── components/         # ModelStatus (live Ollama health in sidebar)
│   ├── package.json
│   └── vite.config.js
├── sellbird.yaml               # main config
├── .env.example
└── requirements.txt
```

---

## Failure handling

If Ollama is not running when you call an AI endpoint, the API returns a clear error:

```json
{
  "detail": "Ollama is not running. Start it with: ollama serve"
}
```

It never silently falls back to a cloud API. Tasks submitted while Ollama is down are queued in memory (`/api/queue`) and can be retried once Ollama comes back.

---

## Known limitations

- Task queue is in-memory only — restarting the server clears it.
- Prospect discovery requires internet; the AI classification that follows does not.
- Email sending uses Harvey's original providers (Gmail, SMTP, Microsoft 365). Ollama only handles the AI reasoning, not the sending.
- Sentence Transformers model (`all-MiniLM-L6-v2`) downloads ~90 MB on first use.
- The frontend has no authentication — run it only on localhost.

---

## Licence

Harvey releases up to 0.3.x: **MIT** (see NOTICE).
Sellbird 0.4.0+: **AGPL-3.0**.
This fork's additions: **MIT**.
