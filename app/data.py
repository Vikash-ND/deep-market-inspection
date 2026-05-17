import yfinance as yf
import ta

def get_stock_info(ticker: str) -> dict:
    stock = yf.Ticker(ticker)
    info = stock.info
    return {
        "symbol": ticker.upper(),
        "name": info.get("longName", "N/A"),
        "price": info.get("currentPrice", info.get("regularMarketPrice")),
        "currency": info.get("currency", "USD"),
        "market_cap": info.get("marketCap"),
        "volume": info.get("volume"),
        "sector": info.get("sector", "N/A"),
    }

def get_stock_history(ticker: str, period: str = "1mo") -> list:
    stock = yf.Ticker(ticker)
    hist = stock.history(period=period)
    hist = hist.reset_index()
    hist["Date"] = hist["Date"].astype(str)
    return hist[["Date", "Open", "High", "Low", "Close", "Volume"]].to_dict(orient="records")