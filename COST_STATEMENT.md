# Cost and Dependency Statement

## AI inference cost: $0

All AI inference runs through a local Ollama instance on the user's own machine. There are no:

- OpenAI API calls
- Anthropic API calls
- Claude Code subscription dependencies
- Codex subscription dependencies
- Gemini API calls
- Any paid LLM API
- Any cloud-hosted AI inference
- Any per-token or per-request billing

The `/api/health` endpoint returns live proof: it shows which model is loaded locally and confirms Ollama is handling all requests. The `inference_log` table in SQLite records every model call with `provider: "ollama"` — there are no rows with any cloud provider.

## How to verify

**Check that Ollama is handling all inference:**

```bash
# While the app is running, watch Ollama's own log
ollama serve

# In another terminal, trigger an AI workflow
curl -X POST http://localhost:8000/api/business-profile

# Ollama's terminal will show the inference happening locally
```

**Check the inference log:**

```bash
curl http://localhost:8000/api/inference-logs
```

Every row will have `"provider": "ollama"`. There are no rows pointing to any external service.

**Run the offline acceptance test:**

Disconnect your internet, then run:

```bash
curl http://localhost:8000/api/health
curl -X POST http://localhost:8000/api/business-profile
curl -X POST http://localhost:8000/api/icp
curl -X POST http://localhost:8000/api/generate-email \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Jane","company":"Acme Corp","title":"CEO"}'
curl -X POST http://localhost:8000/api/classify-reply \
  -H "Content-Type: application/json" \
  -d '{"reply_text":"Sounds interesting, lets connect next week"}'
curl -X POST http://localhost:8000/api/score-prospect \
  -H "Content-Type: application/json" \
  -d '{"title":"VP Marketing","company":"Acme","industry":"SaaS"}'
```

All six calls return valid responses without internet access.

## What does require internet

| Feature | Why |
|---|---|
| `POST /api/scrape-company` | Fetches the target company's website |
| `POST /api/discover-companies` | Searches DuckDuckGo for companies |
| `ollama pull <model>` | One-time model download (after this, offline) |
| `pip install -e .` | One-time dependency installation |

After the initial setup, all AI workflows run completely offline.

## Service costs

| Service | Cost | Required? |
|---|---|---|
| Ollama | Free | Yes |
| Qwen3 model | Free (Apache 2.0) | Yes |
| Sentence Transformers | Free (Apache 2.0) | Yes |
| Gmail Workspace (sending) | ~$7/mo | No — only needed for actual email sending |
| Any other service | $0 | — |

**Total cost for AI inference: $0.00**
