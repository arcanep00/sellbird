from __future__ import annotations

import httpx
import logging
import json

logger = logging.getLogger("sellbird.ollama")

OLLAMA_BASE_URL = "http://localhost:11434"
LM_STUDIO_BASE_URL = "http://localhost:1235/v1"
DEFAULT_TIMEOUT = 300.0

_active_backend = None


def _detect_backend() -> str:
    global _active_backend
    if _active_backend:
        return _active_backend
    try:
        r = httpx.get(f"{LM_STUDIO_BASE_URL}/models", timeout=3.0)
        if r.status_code == 200:
            _active_backend = "lmstudio"
            logger.info("Using LM Studio backend at %s", LM_STUDIO_BASE_URL)
            return "lmstudio"
    except Exception:
        pass
    try:
        r = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3.0)
        if r.status_code == 200:
            _active_backend = "ollama"
            logger.info("Using Ollama backend at %s", OLLAMA_BASE_URL)
            return "ollama"
    except Exception:
        pass
    return "none"


class OllamaError(Exception):
    pass


def check_ollama() -> str:
    backend = _detect_backend()
    if backend == "none":
        raise OllamaError(
            "No local AI backend found.\n"
            "Option 1 — LM Studio: open LM Studio → Local Model API → turn on the server\n"
            "Option 2 — Ollama: run 'ollama serve'"
        )
    return ""


def list_models() -> list[str]:
    backend = _detect_backend()
    try:
        if backend == "lmstudio":
            r = httpx.get(f"{LM_STUDIO_BASE_URL}/models", timeout=5.0)
            r.raise_for_status()
            data = r.json()
            return [m["id"] for m in data.get("data", [])]
        elif backend == "ollama":
            r = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5.0)
            r.raise_for_status()
            data = r.json()
            return [m["name"] for m in data.get("models", [])]
    except Exception:
        pass
    return []


def model_exists(model: str) -> bool:
    models = list_models()
    if not models:
        return True
    return any(model.split(":")[0].lower() in m.lower() for m in models)


def _get_first_model() -> str:
    models = list_models()
    return models[0] if models else ""


async def call_ollama(
    prompt: str,
    model: str,
    system: str = "",
    timeout: float = DEFAULT_TIMEOUT,
    expect_json: bool = False,
) -> str:
    backend = _detect_backend()

    if backend == "lmstudio":
        return await _call_lmstudio(prompt, model, system, timeout, expect_json)
    elif backend == "ollama":
        return await _call_ollama_native(prompt, model, system, timeout, expect_json)
    else:
        raise OllamaError(
            "No local AI backend is running.\n"
            "Open LM Studio → Local Model API → enable the server, then try again."
        )


async def _call_lmstudio(
    prompt: str,
    model: str,
    system: str,
    timeout: float,
    expect_json: bool,
) -> str:
    actual_model = model or _get_first_model()

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload: dict = {
        "model": actual_model,
        "messages": messages,
        "temperature": 0.3,
        "stream": False,
    }
    if expect_json:
        payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            r = await client.post(f"{LM_STUDIO_BASE_URL}/chat/completions", json=payload)
            r.raise_for_status()
            data = r.json()
            content = data["choices"][0]["message"]["content"]
            return content.strip()
        except httpx.ConnectError:
            raise OllamaError(
                "LM Studio API is not running. Open LM Studio → Local Model API → enable the server."
            )
        except httpx.TimeoutException:
            raise OllamaError(f"LM Studio request timed out after {timeout}s")
        except httpx.HTTPStatusError as e:
            body = e.response.text[:300]
            raise OllamaError(f"LM Studio returned {e.response.status_code}: {body}")
        except (KeyError, IndexError) as e:
            raise OllamaError(f"Unexpected LM Studio response format: {e}")


async def _call_ollama_native(
    prompt: str,
    model: str,
    system: str,
    timeout: float,
    expect_json: bool,
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
            raise OllamaError("Ollama is not running. Start it with: ollama serve")
        except httpx.TimeoutException:
            raise OllamaError(f"Ollama request timed out after {timeout}s")
        except httpx.HTTPStatusError as e:
            body = e.response.text[:300]
            raise OllamaError(f"Ollama returned {e.response.status_code}: {body}")


async def pull_model(model: str) -> None:
    backend = _detect_backend()
    if backend == "lmstudio":
        logger.info("LM Studio: download models through the LM Studio UI (Explore tab)")
        return
    if backend == "ollama":
        payload = {"name": model, "stream": False}
        async with httpx.AsyncClient(timeout=600.0) as client:
            try:
                r = await client.post(f"{OLLAMA_BASE_URL}/api/pull", json=payload)
                r.raise_for_status()
            except Exception as e:
                raise OllamaError(f"Failed to pull model {model}: {e}")
