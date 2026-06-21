import ta
import pandas as pd
import yfinance as yf
from app.cache import get_cache, set_cache

def get_full_analysis(ticker: str, period: str = "6mo") -> dict:
    key = f"analysis:{ticker.upper()}:{period}"
    cached = get_cache(key)
    if cached:
        return cached

    stock = yf.Ticker(ticker)
    hist = stock.history(period=period)

    if hist.empty:
        raise ValueError(f"No data found for ticker {ticker}")

    close = hist["Close"]
    high  = hist["High"]
    low   = hist["Low"]
    volume = hist["Volume"]

    # --- Moving Averages ---
    hist["SMA_20"]  = ta.trend.sma_indicator(close, window=20)
    hist["SMA_50"]  = ta.trend.sma_indicator(close, window=50)
    hist["EMA_20"]  = ta.trend.ema_indicator(close, window=20)

    # --- RSI ---
    hist["RSI"] = ta.momentum.rsi(close, window=14)

    # --- MACD ---
    macd = ta.trend.MACD(close)
    hist["MACD"]        = macd.macd()
    hist["MACD_signal"] = macd.macd_signal()
    hist["MACD_diff"]   = macd.macd_diff()

    # --- Bollinger Bands ---
    bb = ta.volatility.BollingerBands(close, window=20)
    hist["BB_upper"]  = bb.bollinger_hband()
    hist["BB_middle"] = bb.bollinger_mavg()
    hist["BB_lower"]  = bb.bollinger_lband()

    # --- Signals ---
    latest = hist.iloc[-1]
    signals = []

    if latest["RSI"] > 70:
        signals.append({"indicator": "RSI", "signal": "SELL", "reason": "Overbought (RSI > 70)"})
    elif latest["RSI"] < 30:
        signals.append({"indicator": "RSI", "signal": "BUY", "reason": "Oversold (RSI < 30)"})
    else:
        signals.append({"indicator": "RSI", "signal": "NEUTRAL", "reason": f"RSI at {latest['RSI']:.2f}"})

    if latest["MACD"] > latest["MACD_signal"]:
        signals.append({"indicator": "MACD", "signal": "BUY", "reason": "MACD above signal line"})
    else:
        signals.append({"indicator": "MACD", "signal": "SELL", "reason": "MACD below signal line"})

    if latest["Close"] > latest["BB_upper"]:
        signals.append({"indicator": "Bollinger Bands", "signal": "SELL", "reason": "Price above upper band"})
    elif latest["Close"] < latest["BB_lower"]:
        signals.append({"indicator": "Bollinger Bands", "signal": "BUY", "reason": "Price below lower band"})
    else:
        signals.append({"indicator": "Bollinger Bands", "signal": "NEUTRAL", "reason": "Price within bands"})

    if latest["Close"] > latest["SMA_50"]:
        signals.append({"indicator": "SMA_50", "signal": "BUY", "reason": "Price above 50-day SMA"})
    else:
        signals.append({"indicator": "SMA_50", "signal": "SELL", "reason": "Price below 50-day SMA"})

    # --- Format output ---
    hist = hist.reset_index()
    hist["Date"] = hist["Date"].astype(str)
    hist = hist.fillna("null")

    columns = [
        "Date", "Open", "High", "Low", "Close", "Volume",
        "SMA_20", "SMA_50", "EMA_20",
        "RSI",
        "MACD", "MACD_signal", "MACD_diff",
        "BB_upper", "BB_middle", "BB_lower"
    ]

    avg_vol  = hist["Volume"].rolling(window=20).mean().iloc[-1]
    curr_vol = int(latest["Volume"])

    result = {
            "ticker":       ticker.upper(),
            "period":       period,
            "latest_price": round(latest["Close"], 2),
            "signals":      signals,
            "summary":      summarize_signals(signals),
            "volume":       curr_vol,
            "avg_volume":   int(avg_vol) if avg_vol else None,
            "data":         hist[columns].to_dict(orient="records")
        }

    set_cache(key, result)
    return result

 # --- Volume Signal ---
    avg_volume = hist["Volume"].rolling(window=20).mean().iloc[-1]
    curr_volume = latest["Volume"]
    if avg_volume and curr_volume:
                vol_ratio = curr_volume / avg_volume
                if vol_ratio > 1.5:
                    signals.append({
                        "indicator": "Volume",
                        "signal": "BUY",
                        "reason": f"Volume {round(vol_ratio, 1)}x above average — unusual activity"
                    })
                elif vol_ratio < 0.5:
                    signals.append({
                        "indicator": "Volume",
                        "signal": "NEUTRAL",
                        "reason": f"Volume {round(vol_ratio, 1)}x below average — low activity"
                    })
                else:
                    signals.append({
                        "indicator": "Volume",
                        "signal": "NEUTRAL",
                        "reason": f"Volume normal ({round(vol_ratio, 1)}x average)"
                    })
                    
    def summarize_signals(signals: list) -> str:
        counts = {"BUY": 0, "SELL": 0, "NEUTRAL": 0}
        for s in signals:
            counts[s["signal"]] += 1
        if counts["BUY"] > counts["SELL"]:
            return "BULLISH"
        elif counts["SELL"] > counts["BUY"]:
            return "BEARISH"
        else:
            return "NEUTRAL"