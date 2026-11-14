from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("sellbird.embeddings")

_model = None
_model_name = "all-MiniLM-L6-v2"


def _load_model():
    global _model
    if _model is not None:
        return _model
    try:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(_model_name)
        logger.info(f"Embeddings: loaded model {_model_name}")
        return _model
    except ImportError:
        raise RuntimeError(
            "sentence-transformers is not installed. "
            "Run: pip install sentence-transformers"
        )
    except Exception as e:
        raise RuntimeError(f"Failed to load embedding model {_model_name}: {e}")


def embed(texts: list[str]) -> list[list[float]]:
    model = _load_model()
    embeddings = model.encode(texts, convert_to_numpy=True)
    return embeddings.tolist()


def embed_one(text: str) -> list[float]:
    return embed([text])[0]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def rank_by_similarity(query: str, candidates: list[str]) -> list[tuple[int, float]]:
    if not candidates:
        return []
    query_emb = embed_one(query)
    candidate_embs = embed(candidates)
    scores = [
        (i, cosine_similarity(query_emb, emb))
        for i, emb in enumerate(candidate_embs)
    ]
    scores.sort(key=lambda x: x[1], reverse=True)
    return scores


def find_similar_prospects(
    target_description: str,
    prospects: list[dict],
    top_k: int = 10,
) -> list[dict]:
    if not prospects:
        return []

    texts = []
    for p in prospects:
        parts = [
            p.get("title", ""),
            p.get("company", ""),
            p.get("industry", ""),
            p.get("personalization_notes", ""),
        ]
        texts.append(" ".join(filter(None, parts)))

    ranked = rank_by_similarity(target_description, texts)
    result = []
    for idx, score in ranked[:top_k]:
        entry = dict(prospects[idx])
        entry["similarity_score"] = round(score, 4)
        result.append(entry)
    return result


def is_available() -> bool:
    try:
        _load_model()
        return True
    except Exception:
        return False
