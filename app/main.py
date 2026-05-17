from fastapi import FastAPI, HTTPException
from app.data import get_stock_info, get_stock_history

app = FastAPI(title="Deep Market Inspection API")

@app.get("/")
def root():
    return {"message": "Deep Market Inspection API is running"}

@app.get("/stock/{ticker}")
def stock_info(ticker: str):
    try:
        return get_stock_info(ticker)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/stock/{ticker}/history")
def stock_history(ticker: str, period: str = "1mo"):
    try:
        return get_stock_history(ticker, period)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))