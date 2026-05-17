from fastapi import APIRouter, HTTPException, Query
from app.data import get_stock_info, get_stock_history, get_multiple_stocks

router = APIRouter()

@router.get("/stock/{ticker}")
def stock_info(ticker: str):
    try:
        return get_stock_info(ticker)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/stock/{ticker}/history")
def stock_history(
    ticker: str,
    period: str = Query(default="1mo", enum=["1d","5d","1mo","3mo","6mo","1y","2y","5y"])
):
    try:
        return get_stock_history(ticker, period)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

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