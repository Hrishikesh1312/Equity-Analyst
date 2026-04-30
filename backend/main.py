from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import yfinance as yf
import httpx
import asyncio

try:
    import pandas_ta as ta
except ImportError:
    ta = None

app = FastAPI(title="Equity Analyst API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "tauri://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_BASE = "http://localhost:11434"
OLLAMA_MODEL = "llama3.2:3b"


# ── Models ─────────────────────────────────────────────────────────────────

class StockInfo(BaseModel):
    ticker: str
    name: str
    exchange: str
    sector: str
    market_cap: float
    current_price: float
    previous_close: float
    change: float
    change_pct: float
    pe_ratio: Optional[float]
    eps: Optional[float]
    week_52_high: float
    week_52_low: float
    dividend_yield: Optional[float]
    volume: float
    avg_volume: float
    recommendation: str
    recommendation_mean: Optional[float]
    analyst_buy: int
    analyst_hold: int
    analyst_sell: int
    analyst_total: int
    target_price: Optional[float]
    description: str
    currency: str


class PricePoint(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: float
    rsi: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    bb_upper: Optional[float] = None
    bb_middle: Optional[float] = None
    bb_lower: Optional[float] = None


class HistoryResponse(BaseModel):
    ticker: str
    period: str
    data: list[PricePoint]


class SearchResult(BaseModel):
    ticker: str
    name: str
    exchange: str
    type: str


class OllamaStatus(BaseModel):
    ready: bool
    model: str
    message: str


# ── Helpers ─────────────────────────────────────────────────────────────────

PERIOD_MAP = {
    "1d":  ("1d",  "5m"),
    "1mo": ("1mo", "1h"),
    "6mo": ("6mo", "1d"),
    "1y":  ("1y",  "1d"),
    "5y":  ("5y",  "1wk"),
}

def safe_float(val) -> Optional[float]:
    try:
        v = float(val)
        return None if (v != v) else v  # NaN check
    except Exception:
        return None

def safe_int(val, default: int = 0) -> int:
    try:
        return int(val)
    except Exception:
        return default


# ── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/search", response_model=list[SearchResult])
async def search_stocks(q: str = Query(..., min_length=1)):
    """Search for stocks by ticker or name using yfinance."""
    try:
        ticker = yf.Ticker(q.upper())
        info = ticker.info

        # yfinance doesn't have a true search endpoint — use basic info lookup
        # In Sprint 2 we can integrate a proper search API; for now return
        # the looked-up ticker if it resolves.
        name = info.get("longName") or info.get("shortName") or q.upper()
        exchange = info.get("exchange", "")
        q_type = info.get("quoteType", "EQUITY")

        results = [SearchResult(
            ticker=q.upper(),
            name=name,
            exchange=exchange,
            type=q_type,
        )]

        # Add common variations to make search feel responsive
        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stock/{ticker}", response_model=StockInfo)
async def get_stock(ticker: str):
    """Get full stock information."""
    t = ticker.upper()
    try:
        yf_ticker = yf.Ticker(t)
        info = yf_ticker.info

        if not info or "currentPrice" not in info and "regularMarketPrice" not in info:
            raise HTTPException(status_code=404, detail=f"Ticker '{t}' not found.")

        current = safe_float(info.get("currentPrice") or info.get("regularMarketPrice")) or 0.0
        prev_close = safe_float(info.get("previousClose") or info.get("regularMarketPreviousClose")) or current
        change = current - prev_close
        change_pct = (change / prev_close * 100) if prev_close else 0.0

        # Analyst data
        rec_info = info.get("recommendationKey", "hold")
        buy  = safe_int(info.get("numberOfAnalystOpinions", 0))
        # yfinance aggregates — approximate split
        rec_mean = safe_float(info.get("recommendationMean"))
        if rec_mean:
            total = max(buy, 1)
            buy_n  = max(0, round(total * max(0, (3 - rec_mean) / 2)))
            sell_n = max(0, round(total * max(0, (rec_mean - 3) / 2)))
            hold_n = max(0, total - buy_n - sell_n)
        else:
            buy_n = sell_n = hold_n = 0
            total = 0

        return StockInfo(
            ticker=t,
            name=info.get("longName") or info.get("shortName") or t,
            exchange=info.get("exchange") or info.get("fullExchangeName") or "",
            sector=info.get("sector") or info.get("industryDisp") or "Unknown",
            market_cap=safe_float(info.get("marketCap")) or 0.0,
            current_price=current,
            previous_close=prev_close,
            change=change,
            change_pct=change_pct,
            pe_ratio=safe_float(info.get("trailingPE") or info.get("forwardPE")),
            eps=safe_float(info.get("trailingEps")),
            week_52_high=safe_float(info.get("fiftyTwoWeekHigh")) or 0.0,
            week_52_low=safe_float(info.get("fiftyTwoWeekLow")) or 0.0,
            dividend_yield=safe_float(info.get("dividendYield")),
            volume=safe_float(info.get("volume") or info.get("regularMarketVolume")) or 0.0,
            avg_volume=safe_float(info.get("averageVolume")) or 0.0,
            recommendation=rec_info,
            recommendation_mean=rec_mean,
            analyst_buy=buy_n,
            analyst_hold=hold_n,
            analyst_sell=sell_n,
            analyst_total=total,
            target_price=safe_float(info.get("targetMeanPrice")),
            description=info.get("longBusinessSummary") or "",
            currency=info.get("currency") or ("INR" if t.endswith(".NS") or t.endswith(".BO") else "USD"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stock/{ticker}/history", response_model=HistoryResponse)
async def get_history(ticker: str, period: str = "1mo"):
    """Get OHLCV price history."""
    t = ticker.upper()
    yf_period, interval = PERIOD_MAP.get(period, ("1mo", "1h"))

    try:
        yf_ticker = yf.Ticker(t)
        hist = yf_ticker.history(period=yf_period, interval=interval)

        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No history for '{t}'.")

        rsi_series = None
        macd_df = None
        bb_df = None
        if ta is not None:
            try:
                rsi_series = ta.rsi(hist["Close"], length=14)
                macd_df = ta.macd(hist["Close"], fast=12, slow=26, signal=9)
                bb_df = ta.bbands(hist["Close"], length=20, std=2)
            except Exception:
                rsi_series = None
                macd_df = None
                bb_df = None

        points: list[PricePoint] = []
        for idx, (ts, row) in enumerate(hist.iterrows()):
            points.append(PricePoint(
                date=str(ts),
                open=round(float(row["Open"]), 4),
                high=round(float(row["High"]), 4),
                low=round(float(row["Low"]), 4),
                close=round(float(row["Close"]), 4),
                volume=float(row["Volume"]),
                rsi=float(rsi_series.iloc[idx]) if rsi_series is not None and not rsi_series.iloc[idx] != rsi_series.iloc[idx] else None,
                macd=float(macd_df.iloc[idx]["MACD_12_26_9"]) if macd_df is not None else None,
                macd_signal=float(macd_df.iloc[idx]["MACDs_12_26_9"]) if macd_df is not None else None,
                bb_upper=float(bb_df.iloc[idx]["BBU_20_2.0"]) if bb_df is not None else None,
                bb_middle=float(bb_df.iloc[idx]["BBM_20_2.0"]) if bb_df is not None else None,
                bb_lower=float(bb_df.iloc[idx]["BBL_20_2.0"]) if bb_df is not None else None,
            ))

        return HistoryResponse(ticker=t, period=period, data=points)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ollama/status", response_model=OllamaStatus)
async def ollama_status():
    """Check if Ollama is running and the model is available."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(f"{OLLAMA_BASE}/api/tags")
            if res.status_code == 200:
                models = [m["name"] for m in res.json().get("models", [])]
                model_ready = any(OLLAMA_MODEL in m for m in models)
                return OllamaStatus(
                    ready=model_ready,
                    model=OLLAMA_MODEL,
                    message="Ready" if model_ready else f"Model {OLLAMA_MODEL} not pulled. Run: ollama pull {OLLAMA_MODEL}",
                )
    except Exception:
        pass

    return OllamaStatus(
        ready=False,
        model=OLLAMA_MODEL,
        message="Ollama is not running. Run: ollama serve",
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
