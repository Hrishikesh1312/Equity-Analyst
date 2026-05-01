from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
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


class AnalysisResponse(BaseModel):
    summary: str
    strengths: list[str]
    weaknesses: list[str]
    opportunities: list[str]
    threats: list[str]
    insights: list[str]
    recommendation: str
    valuation: str
    analysis_text: Optional[str] = None


class Message(BaseModel):
    role: str
    content: str


class OllamaStatus(BaseModel):
    ready: bool
    model: str
    message: str


class ChatRequest(BaseModel):
    ticker: str
    question: str
    history: list[Message] = []
    analysis: Optional[dict] = None


class ChatResponse(BaseModel):
    answer: str


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


async def call_ollama(messages: list[dict], max_tokens: int = 700) -> str:
    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(
            f"{OLLAMA_BASE}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": messages,
                "stream": False,
                "temperature": 0.2,
            },
        )
        res.raise_for_status()
        data = res.json()

    message = data.get("message", {})
    if isinstance(message, dict):
        return message.get("content", "")
    return str(message) if message else ""


def parse_json_from_text(text: str) -> Optional[dict]:
    """Extract and parse JSON from text, handling various formats."""
    import re

    # First try direct JSON parsing
    try:
        return json.loads(text.strip())
    except Exception:
        pass

    # Look for JSON object in text
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end >= 0 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except Exception:
            pass

    # Try to find JSON with regex (more flexible)
    json_pattern = r'\{.*\}'
    match = re.search(json_pattern, text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass

    return None


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
                rsi=float(rsi_series.iloc[idx]) if rsi_series is not None and rsi_series.iloc[idx] == rsi_series.iloc[idx] else None,
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


@app.get("/ai/analyze", response_model=AnalysisResponse)
async def analyze_stock(ticker: str):
    """Run AI analysis for a stock ticker."""
    t = ticker.upper()
    stock_info = await get_stock(t)
    description = (stock_info.description or "No description available.").strip()
    if len(description) > 1200:
        description = description[:1200] + "..."

    prompt = f"""
You are a senior equity analyst. Produce a concise analysis for the stock {stock_info.ticker} ({stock_info.name}).
Use the facts below and return ONLY valid JSON with these exact keys: summary, strengths, weaknesses, opportunities, threats, insights, recommendation, valuation. RESPOND ONLY WITH VALID JSON. NO OTHER TEXT.

Each SWOT field must be an array of strings. Each insight must be a string. Summary, recommendation, and valuation must be strings.

Example format:
{{
  "summary": "Brief overview of the company and current market position.",
  "strengths": ["Strong brand recognition", "Growing market share"],
  "weaknesses": ["High debt levels", "Dependence on key suppliers"],
  "opportunities": ["Expansion into emerging markets", "New product launches"],
  "threats": ["Increasing competition", "Regulatory changes"],
  "insights": ["Revenue growth has been consistent", "Management has strong track record"],
  "recommendation": "Buy/Hold/Sell",
  "valuation": "Fairly valued/Undervalued/Overvalued"
}}

Facts:
- Exchange: {stock_info.exchange}
- Sector: {stock_info.sector}
- Current price: {stock_info.current_price}
- Previous close: {stock_info.previous_close}
- Change %: {stock_info.change_pct:.2f}%
- Market cap: {stock_info.market_cap}
- P/E: {stock_info.pe_ratio or 'N/A'}
- EPS: {stock_info.eps or 'N/A'}
- 52W high/low: {stock_info.week_52_high}/{stock_info.week_52_low}
- Dividend yield: {stock_info.dividend_yield or 'N/A'}
- Analyst consensus: buy {stock_info.analyst_buy}, hold {stock_info.analyst_hold}, sell {stock_info.analyst_sell}
- Target price: {stock_info.target_price or 'N/A'}
- Business summary: {description}

Write in a confident, actionable tone. Keep the summary and recommendation short. Use bullets for insights.
"""

    messages = [
        {"role": "system", "content": "You are an expert equity analyst specialized in concise investment writeups."},
        {"role": "user", "content": prompt},
    ]

    try:
        answer = await call_ollama(messages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    parsed = parse_json_from_text(answer)
    if parsed is None:
        # Fallback: try to extract some basic info from the text
        return AnalysisResponse(
            summary=answer.strip()[:500] + "..." if len(answer.strip()) > 500 else answer.strip(),
            strengths=["Analysis generated but SWOT parsing failed"],
            weaknesses=["Analysis generated but SWOT parsing failed"],
            opportunities=["Analysis generated but SWOT parsing failed"],
            threats=["Analysis generated but SWOT parsing failed"],
            insights=["Please check the summary for detailed analysis"],
            recommendation="See summary above",
            valuation="N/A",
            analysis_text=answer.strip(),
        )

    # Ensure all required fields are present and properly typed
    def safe_list(value):
        if isinstance(value, list):
            return [str(item) for item in value if item]
        return []

    def safe_str(value, default=""):
        return str(value) if value else default

    return AnalysisResponse(
        summary=safe_str(parsed.get("summary", ""))[:2000],
        strengths=safe_list(parsed.get("strengths", [])),
        weaknesses=safe_list(parsed.get("weaknesses", [])),
        opportunities=safe_list(parsed.get("opportunities", [])),
        threats=safe_list(parsed.get("threats", [])),
        insights=safe_list(parsed.get("insights", [])),
        recommendation=safe_str(parsed.get("recommendation", "")),
        valuation=safe_str(parsed.get("valuation", "")),
        analysis_text=answer.strip(),
    )


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


@app.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(request: ChatRequest):
    if not request.ticker:
        raise HTTPException(status_code=400, detail="Ticker is required.")

    prompt_messages = [
        {
            "role": "system",
            "content": (
                "You are a practical equity research assistant. Use the provided stock analysis and past conversation history to answer follow-up questions clearly "
                "for an investor. If the user asks for a valuation or recommendation, use the analysis context and avoid repeating unrelated details."
            ),
        }
    ]

    if request.analysis is not None:
        analysis_dict = request.analysis if isinstance(request.analysis, dict) else request.analysis.dict()
        analysis_text = (
            f"Analysis summary: {analysis_dict.get('summary', '')}\n"
            f"Strengths: {', '.join(analysis_dict.get('strengths', []))}\n"
            f"Weaknesses: {', '.join(analysis_dict.get('weaknesses', []))}\n"
            f"Opportunities: {', '.join(analysis_dict.get('opportunities', []))}\n"
            f"Threats: {', '.join(analysis_dict.get('threats', []))}\n"
            f"Insights: {', '.join(analysis_dict.get('insights', []))}\n"
            f"Recommendation: {analysis_dict.get('recommendation', '')}\n"
            f"Valuation: {analysis_dict.get('valuation', '')}\n"
        )
        prompt_messages.append({"role": "system", "content": analysis_text})

    for message in request.history:
        if message.role in {"user", "assistant"}:
            prompt_messages.append({"role": message.role, "content": message.content})

    prompt_messages.append({"role": "user", "content": request.question})

    try:
        answer = await call_ollama(prompt_messages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


    return ChatResponse(answer=answer.strip())


# ── Portfolio Routes ─────────────────────────────────────────────────────────

class PortfolioPosition(BaseModel):
    id: str
    ticker: str
    quantity: float
    buy_price: float
    current_price: Optional[float] = None
    sector: Optional[str] = None
    name: Optional[str] = None


class PortfolioData(BaseModel):
    positions: list[PortfolioPosition]
    total_invested: float
    total_current_value: float
    total_gain_loss: float
    total_gain_loss_pct: float
    sector_allocation: dict[str, float]


class PortfolioAnalysisResponse(BaseModel):
    summary: str
    risks: list[str]
    opportunities: list[str]
    sector_balance: str
    concentration: str
    recommendations: list[str]
    suggested_rebalance: Optional[str] = None


class PortfolioPriceRequest(BaseModel):
    tickers: list[str]


@app.post("/portfolio/prices")
async def get_portfolio_prices(request: PortfolioPriceRequest):
    """Fetch current prices for portfolio tickers."""
    result = {}

    for ticker in request.tickers:
        try:
            yf_ticker = yf.Ticker(ticker)
            info = yf_ticker.info
            current = safe_float(info.get("currentPrice") or info.get("regularMarketPrice")) or 0.0
            sector = info.get("sector") or "Unknown"
            name = info.get("longName") or ticker

            result[ticker] = {
                "price": current,
                "sector": sector,
                "name": name,
            }
        except Exception:
            result[ticker] = {
                "price": 0.0,
                "sector": "Unknown",
                "name": ticker,
            }

    return result


@app.post("/portfolio/analyze", response_model=PortfolioAnalysisResponse)
async def analyze_portfolio(portfolio: PortfolioData):
    """Analyze portfolio for concentration risk, sector balance, and rebalancing."""
    total_value = portfolio.total_current_value or 1.0

    # Calculate concentration
    top_3_value = sorted(
        [p.quantity * (p.current_price or p.buy_price) for p in portfolio.positions],
        reverse=True,
    )[:3]
    top_3_pct = sum(top_3_value) / total_value * 100 if total_value > 0 else 0

    # Sector concentration
    sector_details = []
    for sector, value in sorted(
        portfolio.sector_allocation.items(), key=lambda x: x[1], reverse=True
    )[:3]:
        pct = (value / total_value * 100) if total_value > 0 else 0
        sector_details.append(f"{sector}: {pct:.1f}%")

    prompt = f"""
You are a portfolio advisor. Analyze this portfolio and return ONLY valid JSON with keys: summary, risks, opportunities, sector_balance, concentration, recommendations, suggested_rebalance.

Portfolio Summary:
- Total Invested: {portfolio.total_invested}
- Current Value: {portfolio.total_current_value}
- Gain/Loss: {portfolio.total_gain_loss} ({portfolio.total_gain_loss_pct:.2f}%)
- Top 3 holdings: {top_3_pct:.1f}% of portfolio
- Sector breakdown: {', '.join(sector_details)}
- Number of holdings: {len(portfolio.positions)}

Example format:
{{
  "summary": "Brief portfolio overview",
  "risks": ["Risk 1", "Risk 2"],
  "opportunities": ["Opportunity 1"],
  "sector_balance": "Assessment of sector diversification",
  "concentration": "Assessment of concentration risk",
  "recommendations": ["Recommendation 1"],
  "suggested_rebalance": "Specific rebalancing suggestion or null"
}}

Provide concise, actionable advice for an Indian investor.
"""

    messages = [
        {
            "role": "system",
            "content": "You are an expert portfolio advisor specializing in Indian equity markets.",
        },
        {"role": "user", "content": prompt},
    ]

    try:
        answer = await call_ollama(messages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    parsed = parse_json_from_text(answer)
    if parsed is None:
        return PortfolioAnalysisResponse(
            summary=answer.strip()[:500],
            risks=["Analysis generated but parsing failed"],
            opportunities=[],
            sector_balance="See summary",
            concentration="See summary",
            recommendations=[],
        )

    def safe_list(value):
        if isinstance(value, list):
            return [str(item) for item in value if item]
        return []

    def safe_str(value, default=""):
        return str(value) if value else default

    return PortfolioAnalysisResponse(
        summary=safe_str(parsed.get("summary", ""))[:2000],
        risks=safe_list(parsed.get("risks", [])),
        opportunities=safe_list(parsed.get("opportunities", [])),
        sector_balance=safe_str(parsed.get("sector_balance", "")),
        concentration=safe_str(parsed.get("concentration", "")),
        recommendations=safe_list(parsed.get("recommendations", [])),
        suggested_rebalance=safe_str(parsed.get("suggested_rebalance")),
    )


class PortfolioChatRequest(BaseModel):
    question: str
    history: list[Message] = []
    portfolio: PortfolioData
    analysis: Optional[dict] = None


@app.post("/portfolio/chat")
async def portfolio_chat(request: PortfolioChatRequest):
    """Chat about portfolio analysis."""
    messages = [
        {
            "role": "system",
            "content": "You are a portfolio advisor helping with questions about portfolio composition, diversification, and rebalancing.",
        }
    ]

    # Add portfolio context
    if request.analysis:
        analysis_text = (
            f"Portfolio Analysis:\n"
            f"Summary: {request.analysis.get('summary', '')}\n"
            f"Risks: {', '.join(request.analysis.get('risks', []))}\n"
            f"Recommendations: {', '.join(request.analysis.get('recommendations', []))}\n"
        )
        messages.append({"role": "system", "content": analysis_text})

    # Add chat history
    for msg in request.history:
        if msg.role in {"user", "assistant"}:
            messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": request.question})

    try:
        answer = await call_ollama(messages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return ChatResponse(answer=answer.strip())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
