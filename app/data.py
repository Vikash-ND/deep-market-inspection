import yfinance as yf
from app.cache import get_cache, set_cache

def get_stock_info(ticker: str) -> dict:
    key = f"info:{ticker.upper()}"
    cached = get_cache(key)
    if cached:
        return cached

    stock = yf.Ticker(ticker)
    info = stock.info
    result = {
        "symbol": ticker.upper(),
        "name": info.get("longName", "N/A"),
        "price": info.get("currentPrice", info.get("regularMarketPrice")),
        "currency": info.get("currency", "USD"),
        "market_cap": info.get("marketCap"),
        "volume": info.get("volume"),
        "sector": info.get("sector", "N/A"),
    }
    set_cache(key, result)
    return result

def get_stock_history(ticker: str, period: str = "1mo") -> list:
    key = f"history:{ticker.upper()}:{period}"
    cached = get_cache(key)
    if cached:
        return cached

    stock = yf.Ticker(ticker)
    hist = stock.history(period=period)
    hist = hist.reset_index()
    hist["Date"] = hist["Date"].astype(str)
    result = hist[["Date", "Open", "High", "Low", "Close", "Volume"]].to_dict(orient="records")
    set_cache(key, result)
    return result

def get_multiple_stocks(tickers: list) -> list:
    return [get_stock_info(t) for t in tickers]