import yfinance as yf
from app.cache import get_cache, set_cache

def get_stock_info(ticker: str) -> dict:
    key = f"info:{ticker.upper()}"
    cached = get_cache(key)
    if cached:
        return cached

    try:
        stock = yf.Ticker(ticker)
        info  = stock.info

        price = (
            info.get("currentPrice") or
            info.get("regularMarketPrice") or
            info.get("previousClose") or
            info.get("open")
        )

        prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose")
        change_pct = None
        if price and prev_close:
            change_pct = round(((float(price) - float(prev_close)) / float(prev_close)) * 100, 2)

        result = {
            "symbol":      ticker.upper(),
            "name":        info.get("longName") or info.get("shortName", "N/A"),
            "price":       round(float(price), 2) if price else None,
            "change_pct":  change_pct,
            "week52_high": info.get("fiftyTwoWeekHigh"),
            "week52_low":  info.get("fiftyTwoWeekLow"),
            "currency":    info.get("currency", "USD"),
            "market_cap":  info.get("marketCap"),
            "volume":      info.get("volume"),
            "sector":      info.get("sector", "N/A"),
        }
        set_cache(key, result)
        return result

    except Exception as e:
        return {
            "symbol":     ticker.upper(),
            "name":       "N/A",
            "price":      None,
            "change_pct": None,
            "currency":   "USD",
            "market_cap": None,
            "volume":     None,
            "sector":     "N/A",
        }

def get_stock_history(ticker: str, period: str = "1mo") -> list:
    key = f"history:{ticker.upper()}:{period}"
    cached = get_cache(key)
    if cached:
        return cached

    try:
        stock = yf.Ticker(ticker)
        hist  = stock.history(period=period)
        hist  = hist.reset_index()
        hist["Date"] = hist["Date"].astype(str)
        result = hist[["Date","Open","High","Low","Close","Volume"]].to_dict(orient="records")
        set_cache(key, result)
        return result
    except Exception as e:
        raise ValueError(f"Could not fetch history for {ticker}: {e}")

def get_multiple_stocks(tickers: list) -> list:
    return [get_stock_info(t) for t in tickers]

def get_quick_price(ticker: str):
    key = f"quick:{ticker.upper()}"
    cached = get_cache(key)
    if cached:
        return cached
    try:
        t    = yf.Ticker(ticker)
        hist = t.history(period="2d")
        if hist.empty:
            return None
        price = round(float(hist["Close"].iloc[-1]), 2)
        set_cache(key, {"price": price})
        return {"price": price}
    except:
        return None