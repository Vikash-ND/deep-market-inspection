from fastapi import APIRouter, HTTPException, Query
from app.data import get_stock_info, get_stock_history, get_multiple_stocks
from app.analysis import get_full_analysis
import yfinance as yf

router = APIRouter()

@router.get("/search")
def search_tickers(q: str = Query(..., description="Company name to search")):
    try:
        result = yf.Search(q, max_results=6)
        quotes = result.quotes
        suggestions = []
        for item in quotes:
            symbol = item.get("symbol", "")
            name   = item.get("longname") or item.get("shortname", "")
            etype  = item.get("quoteType", "")
            exchange = item.get("exchange", "")
            if symbol and name:
                suggestions.append({
                    "symbol": symbol,
                    "name": name,
                    "type": etype,
                    "exchange": exchange
                })
        return suggestions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stock/{ticker}")
def stock_info(ticker: str):
    try:
        return get_stock_info(ticker)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/stock/{ticker}/price")
def quick_price(ticker: str):
    from app.data import get_quick_price
    result = get_quick_price(ticker)
    if not result:
        return {"price": None}
    return result

@router.get("/stock/{ticker}/history")
def stock_history(
    ticker: str,
    period: str = Query(default="1mo", enum=["1d","5d","1mo","3mo","6mo","1y","2y","5y"])
):
    try:
        return get_stock_history(ticker, period)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/stock/{ticker}/analysis")
def stock_analysis(
    ticker: str,
    period: str = Query(default="6mo", enum=["3mo","6mo","1y","2y"])
):
    try:
        return get_full_analysis(ticker, period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stocks/compare")
def compare_stocks(
    tickers: str = Query(..., description="Comma-separated tickers e.g. AAPL,TSLA,MSFT")
):
    try:
        ticker_list = [t.strip().upper() for t in tickers.split(",")]
        if len(ticker_list) > 5:
            raise HTTPException(status_code=400, detail="Max 5 tickers at once")
        return get_multiple_stocks(ticker_list)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stock/{ticker}/news")
def stock_news(ticker: str):
    try:
        stock = yf.Ticker(ticker)
        news  = stock.news
        result = []
        for item in news[:8]:
            content = item.get("content", {})
            result.append({
                "title":     content.get("title", ""),
                "summary":   content.get("summary", ""),
                "url":       content.get("canonicalUrl", {}).get("url", ""),
                "published": content.get("pubDate", ""),
                "source":    content.get("provider", {}).get("displayName", "")
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))