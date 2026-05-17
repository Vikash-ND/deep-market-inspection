from pydantic import BaseModel
from typing import Optional

class StockInfo(BaseModel):
    symbol: str
    name: str
    price: Optional[float]
    currency: str
    market_cap: Optional[float]
    volume: Optional[int]
    sector: str

class StockCandle(BaseModel):
    Date: str
    Open: float
    High: float
    Low: float
    Close: float
    Volume: int

class APIResponse(BaseModel):
    success: bool
    data: dict | list
    message: str = "OK"