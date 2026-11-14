from __future__ import annotations

import platform
import shutil
import subprocess


def get_ram_gb() -> float:
    try:
        import psutil
        return psutil.virtual_memory().total / (1024 ** 3)
    except ImportError:
        pass
    try:
        if platform.system() == "Windows":
            out = subprocess.check_output(
                ["wmic", "computersystem", "get", "TotalPhysicalMemory"],
                text=True, timeout=5
            )
            for line in out.splitlines():
                line = line.strip()
                if line.isdigit():
                    return int(line) / (1024 ** 3)
    except Exception:
        pass
    return 0.0


def get_cpu_cores() -> int:
    try:
        import psutil
        return psutil.cpu_count(logical=False) or 2
    except ImportError:
        import os
        return os.cpu_count() or 2


def get_gpu_vram_gb() -> float:
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=memory.total", "--format=csv,noheader,nounits"],
            text=True, timeout=5, stderr=subprocess.DEVNULL
        )
        total = sum(float(v.strip()) for v in out.strip().splitlines() if v.strip())
        return total / 1024
    except Exception:
        pass
    if platform.system() == "Darwin":
        try:
            out = subprocess.check_output(
                ["system_profiler", "SPDisplaysDataType"],
                text=True, timeout=5
            )
            for line in out.splitlines():
                if "VRAM" in line and "MB" in line:
                    mb = float("".join(c for c in line if c.isdigit() or c == "."))
                    return mb / 1024
        except Exception:
            pass
    return 0.0


def has_gpu() -> bool:
    return get_gpu_vram_gb() > 0


def detect() -> dict:
    ram = get_ram_gb()
    cores = get_cpu_cores()
    vram = get_gpu_vram_gb()
    return {
        "ram_gb": round(ram, 1),
        "cpu_cores": cores,
        "gpu_vram_gb": round(vram, 1),
        "has_gpu": vram > 0,
        "platform": platform.system(),
    }


def recommend_model(hw: dict | None = None) -> dict:
    if hw is None:
        hw = detect()

    ram = hw.get("ram_gb", 0)
    vram = hw.get("gpu_vram_gb", 0)

    if vram >= 16 or ram >= 32:
        return {
            "model": "qwen3:14b",
            "config": "high-performance",
            "reason": f"{'GPU ' + str(vram) + 'GB VRAM' if vram >= 16 else str(ram) + 'GB RAM'} detected — using 14B model for best quality.",
        }
    elif vram >= 8 or ram >= 16:
        return {
            "model": "qwen3:8b",
            "config": "standard",
            "reason": f"{'GPU ' + str(vram) + 'GB VRAM' if vram >= 8 else str(ram) + 'GB RAM'} detected — using 8B model.",
        }
    elif ram >= 8:
        return {
            "model": "qwen3:4b",
            "config": "low-resource",
            "reason": f"{ram}GB RAM detected — using 4B model for compatibility.",
        }
    else:
        return {
            "model": "qwen3:1.7b",
            "config": "minimal",
            "reason": f"Low RAM ({ram}GB) — using smallest model. Consider upgrading RAM for better results.",
        }
