from __future__ import annotations

import asyncio
import json
import logging
from collections import deque
from datetime import datetime, timezone

logger = logging.getLogger("sellbird.task_queue")

_queue: deque[dict] = deque()
_lock = asyncio.Lock()


def _utcnow() -> str:
    return datetime.now(timezone.utc).replace(tzinfo=None).isoformat()


async def enqueue(task_type: str, payload: dict) -> str:
    task_id = f"{task_type}-{len(_queue)}-{_utcnow()}"
    async with _lock:
        _queue.append({
            "id": task_id,
            "type": task_type,
            "payload": payload,
            "queued_at": _utcnow(),
            "attempts": 0,
        })
    logger.info(f"Task queued: {task_type} (id={task_id})")
    return task_id


async def dequeue() -> dict | None:
    async with _lock:
        if _queue:
            return _queue.popleft()
    return None


async def pending() -> list[dict]:
    async with _lock:
        return list(_queue)


async def drain(handler, max_tasks: int = 10) -> int:
    from sellbird.ollama_runtime import check_ollama, OllamaError

    try:
        check_ollama()
    except OllamaError as e:
        logger.warning(f"Task queue drain skipped: {e}")
        return 0

    processed = 0
    for _ in range(max_tasks):
        task = await dequeue()
        if task is None:
            break
        try:
            await handler(task)
            processed += 1
        except Exception as e:
            task["attempts"] = task.get("attempts", 0) + 1
            logger.warning(f"Task {task['id']} failed (attempt {task['attempts']}): {e}")
            if task["attempts"] < 3:
                async with _lock:
                    _queue.append(task)

    if processed:
        logger.info(f"Task queue: processed {processed} task(s)")
    return processed


def queue_size() -> int:
    return len(_queue)
