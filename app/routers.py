from fastapi.responses import StreamingResponse
from app.pdf_export import generate_analysis_pdf
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
    
@router.get("/stock/{ticker}/related")
def related_stocks(ticker: str):    
    try:
        RELATED_MAP = {
            # US Tech
            "AAPL":  ["MSFT", "GOOGL", "META", "AMZN"],
            "MSFT":  ["AAPL", "GOOGL", "AMZN", "NVDA"],
            "GOOGL": ["MSFT", "META", "AMZN", "AAPL"],
            "META":  ["GOOGL", "SNAP", "PINS", "TWTR"],
            "NVDA":  ["AMD", "INTC", "QCOM", "TSM"],
            "AMZN":  ["MSFT", "GOOGL", "AAPL", "SHOP"],
            "TSLA":  ["GM", "F", "NIO", "RIVN"],
            "JPM":   ["BAC", "GS", "MS", "WFC"],

            # Indian stocks
            "RELIANCE.NS":   ["TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS"],
            "TCS.NS":        ["INFY.NS", "WIPRO.NS", "HCLTECH.NS", "TECHM.NS"],
            "INFY.NS":       ["TCS.NS", "WIPRO.NS", "HCLTECH.NS", "TECHM.NS"],
            "HDFCBANK.NS":   ["ICICIBANK.NS", "SBIN.NS", "AXISBANK.NS", "KOTAKBANK.NS"],
            "ICICIBANK.NS":  ["HDFCBANK.NS", "SBIN.NS", "AXISBANK.NS", "KOTAKBANK.NS"],
            "WIPRO.NS":      ["TCS.NS", "INFY.NS", "HCLTECH.NS", "TECHM.NS"],
            "ADANIENT.NS":   ["ADANIPORTS.NS", "ADANIPOWER.NS", "RELIANCE.NS"],
            "BAJFINANCE.NS": ["HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS"],
        }

        related_tickers = RELATED_MAP.get(ticker.upper(), [])

        if not related_tickers:
            stock    = yf.Ticker(ticker)
            info     = stock.info
            sector   = info.get("sector", "")
            related_tickers = []

        results = []
        for t in related_tickers[:4]:
            try:
                s    = yf.Ticker(t)
                info = s.info
                price = (
                    info.get("currentPrice") or
                    info.get("regularMarketPrice") or
                    info.get("previousClose")
                )
                results.append({
                    "symbol": t,
                    "name":   info.get("longName") or info.get("shortName", t),
                    "price":  round(float(price), 2) if price else None,
                    "currency": info.get("currency", "USD")
                })
            except:
                continue

        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
import random
from datetime import date

@router.get("/stock-of-the-day")
def stock_of_the_day():
    try:
        candidates = [
            "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA",
            "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "WIPRO.NS"
        ]

        # Deterministic pick based on today's date so it stays the same all day
        today_seed = date.today().toordinal()
        ticker = candidates[today_seed % len(candidates)]

        from app.analysis import get_full_analysis
        result = get_full_analysis(ticker, period="3mo")

        return {
            "ticker":  result["ticker"],
            "price":   result["latest_price"],
            "summary": result["summary"],
            "top_signal": result["signals"][0] if result["signals"] else None,
            "currency": "₹" if ticker.endswith(".NS") else "$"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/stock/{ticker}/analysis/pdf")
def download_analysis_pdf(ticker: str, period: str = Query(default="6mo")):
    try:
        data = get_full_analysis(ticker, period)
        pdf_buffer = generate_analysis_pdf(data)
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={ticker}_analysis.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))