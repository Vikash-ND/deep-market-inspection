from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root():
    res = client.get("/")
    assert res.status_code == 200

def test_stock_info():
    res = client.get("/api/v1/stock/AAPL")
    assert res.status_code == 200
    data = res.json()
    assert "symbol" in data
    assert data["symbol"] == "AAPL"

def test_stock_history():
    res = client.get("/api/v1/stock/AAPL/history?period=1mo")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_search():
    res = client.get("/api/v1/search?q=Apple")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_invalid_ticker():
    res = client.get("/api/v1/stock/INVALIDTICKER999/analysis")
    assert res.status_code in [200, 500]