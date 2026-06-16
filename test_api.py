from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_docs():
    res = client.get("/docs")
    assert res.status_code == 200

def test_openapi():
    res = client.get("/openapi.json")
    assert res.status_code == 200

def test_root():
    res = client.get("/")
    assert res.status_code == 200

def test_analysis_page():
    res = client.get("/analysis/AAPL")
    assert res.status_code == 200

def test_compare_page():
    res = client.get("/compare")
    assert res.status_code == 200

def test_robots():
    res = client.get("/robots.txt")
    assert res.status_code == 200

def test_sitemap():
    res = client.get("/sitemap.xml")
    assert res.status_code == 200

def test_search_missing_query():
    res = client.get("/api/v1/search")
    assert res.status_code == 422

def test_compare_missing_tickers():
    res = client.get("/api/v1/stocks/compare")
    assert res.status_code == 422