import axios from "axios";

const BASE = "http://localhost:8000";

export interface StockInfo {
  ticker: string;
  name: string;
  exchange: string;
  sector: string;
  market_cap: number;
  current_price: number;
  previous_close: number;
  change: number;
  change_pct: number;
  pe_ratio: number | null;
  eps: number | null;
  week_52_high: number;
  week_52_low: number;
  dividend_yield: number | null;
  volume: number;
  avg_volume: number;
  recommendation: string;
  recommendation_mean: number | null;
  analyst_buy: number;
  analyst_hold: number;
  analyst_sell: number;
  analyst_total: number;
  target_price: number | null;
  description: string;
  currency: string;
}

export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi?: number | null;
  macd?: number | null;
  macd_signal?: number | null;
  bb_upper?: number | null;
  bb_middle?: number | null;
  bb_lower?: number | null;
}

export interface HistoryResponse {
  ticker: string;
  period: string;
  data: PricePoint[];
}

export interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
  type: string;
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  const res = await axios.get(`${BASE}/search`, { params: { q: query } });
  return res.data;
}

export async function getStockInfo(ticker: string): Promise<StockInfo> {
  const res = await axios.get(`${BASE}/stock/${ticker}`);
  return res.data;
}

export async function getHistory(
  ticker: string,
  period: "1d" | "1mo" | "6mo" | "1y" | "5y"
): Promise<HistoryResponse> {
  const res = await axios.get(`${BASE}/stock/${ticker}/history`, {
    params: { period },
  });
  return res.data;
}

// ── Indian number formatting ─────────────────────────────────

export function formatMarketCap(value: number, currency = "INR"): string {
  const sym = currency === "INR" ? "₹" : "$";
  if (currency === "INR") {
    const lCr = 1e12;
    const cr   = 1e7;
    const lakh = 1e5;
    if (value >= lCr)  return `${sym}${(value / lCr).toFixed(2)} L Cr`;
    if (value >= cr)   return `${sym}${(value / cr).toFixed(2)} Cr`;
    if (value >= lakh) return `${sym}${(value / lakh).toFixed(2)} L`;
    return `${sym}${value.toLocaleString("en-IN")}`;
  }
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9)  return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6)  return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

export function formatVolume(value: number): string {
  const cr   = 1e7;
  const lakh = 1e5;
  if (value >= cr)   return `${(value / cr).toFixed(2)} Cr`;
  if (value >= lakh) return `${(value / lakh).toFixed(2)} L`;
  if (value >= 1e3)  return `${(value / 1e3).toFixed(0)}K`;
  return value.toString();
}

export function formatPrice(value: number, currency = "INR"): string {
  const sym = currency === "INR" ? "₹" : "$";
  return `${sym}${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatEPS(value: number, currency = "INR"): string {
  const sym = currency === "INR" ? "₹" : "$";
  return `${sym}${value.toFixed(2)}`;
}

export function getRecommendationLabel(rec: string): {
  label: string; color: string; bg: string; border: string;
} {
  const r = rec.toLowerCase();
  if (r.includes("buy") || r.includes("strong buy") || r.includes("outperform"))
    return { label: "BUY",  color: "var(--green)", bg: "var(--green-dim)", border: "var(--green-border)" };
  if (r.includes("sell") || r.includes("strong sell") || r.includes("underperform"))
    return { label: "SELL", color: "var(--red)",   bg: "var(--red-dim)",   border: "var(--red-border)" };
  return   { label: "HOLD", color: "var(--amber)", bg: "var(--amber-dim)", border: "var(--amber-border)" };
}

/** Append .NS suffix for NSE if no exchange suffix present */
export function normalizeIndianTicker(ticker: string): string {
  const t = ticker.toUpperCase().trim();
  if (t.includes(".")) return t;
  return `${t}.NS`;
}
