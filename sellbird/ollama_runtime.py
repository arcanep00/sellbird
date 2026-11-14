from __future__ import annotations

import httpx
import logging
import json

logger = logging.getLogger("sellbird.ollama")

OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_TIMEOUT = 300.0


class OllamaError(Exception):
    pass


def check_ollama() -> str:
    try:
        r = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5.0)
        r.raise_for_status()
        return ""
    except httpx.ConnectError:
        raise OllamaError(
            "Ollama is not running. Start it with: ollama serve\n"
            "If not installed: https://ollama.com/download"
        )
    except Exception as e:
        raise OllamaError(f"Ollama health check failed: {e}")


def list_models() -> list[str]:
    try:
        r = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5.0)
        r.raise_for_status()
        data = r.json()
        return [m["name"] for m in data.get("models", [])]
    except Exception:
        return []


def model_exists(model: str) -> bool:
    return any(m.startswith(model.split(":")[0]) for m in list_models())


async def call_ollama(
    prompt: str,
    model: str,
    system: str = "",
    timeout: float = DEFAULT_TIMEOUT,
    expect_json: bool = False,
) -> str:
    payload: dict = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.3},
    }
    if system:
        payload["system"] = system
    if expect_json:
        payload["format"] = "json"

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            r = await client.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload)
            r.raise_for_status()
            data = r.json()
            return data.get("response", "").strip()
        except httpx.ConnectError:
            raise OllamaError(
                "Ollama is not running. Start it with: ollama serve"
            )
        except httpx.TimeoutException:
            raise OllamaError(f"Ollama request timed out after {timeout}s")
        except httpx.HTTPStatusError as e:
            body = e.response.text[:300]
            raise OllamaError(f"Ollama returned {e.response.status_code}: {body}")


async def pull_model(model: str) -> None:
    payload = {"name": model, "stream": False}
    async with httpx.AsyncClient(timeout=600.0) as client:
        try:
            r = await client.post(f"{OLLAMA_BASE_URL}/api/pull", json=payload)
            r.raise_for_status()
        except Exception as e:
            raise OllamaError(f"Failed to pull model {model}: {e}")
