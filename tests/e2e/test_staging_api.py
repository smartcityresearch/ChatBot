"""Basic API checks against a deployed backend (STAGING_URL, e.g. http://localhost:8988)."""
import os

import pytest
import requests

STAGING_URL = os.getenv("STAGING_URL", "").rstrip("/")

pytestmark = pytest.mark.skipif(not STAGING_URL, reason="STAGING_URL not set")

TIMEOUT = 10


def test_root_is_up():
    response = requests.get(f"{STAGING_URL}/", timeout=TIMEOUT)
    assert response.status_code == 200
    assert "Smart City API is running" in response.json()["message"]


def test_openapi_lists_endpoints():
    response = requests.get(f"{STAGING_URL}/openapi.json", timeout=TIMEOUT)
    assert response.status_code == 200
    paths = response.json()["paths"]
    for path in ["/", "/query", "/query/full", "/debug"]:
        assert path in paths


def test_query_get_requires_q():
    response = requests.get(f"{STAGING_URL}/query", timeout=TIMEOUT)
    assert response.status_code == 422


def test_query_post_requires_body():
    response = requests.post(f"{STAGING_URL}/query", json={}, timeout=TIMEOUT)
    assert response.status_code == 422


def test_query_full_rejects_invalid_body():
    response = requests.post(f"{STAGING_URL}/query/full", json={"invalid": "data"}, timeout=TIMEOUT)
    assert response.status_code == 422


def test_unknown_route_returns_404():
    response = requests.get(f"{STAGING_URL}/does-not-exist", timeout=TIMEOUT)
    assert response.status_code == 404
