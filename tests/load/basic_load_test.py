"""Basic load test: concurrent GET / requests against BACKEND_URL; fails on errors or slow p95."""
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import requests

BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8988").rstrip("/")
TOTAL_REQUESTS = int(os.getenv("LOAD_TOTAL_REQUESTS", "500"))
CONCURRENCY = int(os.getenv("LOAD_CONCURRENCY", "20"))
MAX_P95_SECONDS = float(os.getenv("LOAD_MAX_P95_SECONDS", "1.0"))


def hit(_):
    start = time.perf_counter()
    try:
        ok = requests.get(f"{BACKEND_URL}/", timeout=10).status_code == 200
    except requests.RequestException:
        ok = False
    return ok, time.perf_counter() - start


def main():
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        results = list(pool.map(hit, range(TOTAL_REQUESTS)))

    failures = sum(1 for ok, _ in results if not ok)
    latencies = sorted(elapsed for _, elapsed in results)
    p95 = latencies[int(len(latencies) * 0.95) - 1]

    print(f"URL={BACKEND_URL} requests={TOTAL_REQUESTS} concurrency={CONCURRENCY}")
    print(f"failures={failures} p95={p95:.3f}s max={latencies[-1]:.3f}s")

    if failures or p95 > MAX_P95_SECONDS:
        sys.exit(1)


if __name__ == "__main__":
    main()
