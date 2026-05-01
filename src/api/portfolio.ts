import axios from "axios";

const BASE = "http://localhost:8000";

export interface Position {
  id: string;
  ticker: string;
  quantity: number;
  buy_price: number;
  current_price?: number;
  sector?: string;
  name?: string;
}

export interface Portfolio {
  positions: Position[];
  total_invested: number;
  total_current_value: number;
  total_gain_loss: number;
  total_gain_loss_pct: number;
  sector_allocation: Record<string, number>;
}

export interface PortfolioAnalysisResult {
  summary: string;
  risks: string[];
  opportunities: string[];
  sector_balance: string;
  concentration: string;
  recommendations: string[];
  suggested_rebalance?: string;
}

// Parse CSV file content
export function parsePortfolioCSV(csvText: string): Position[] {
  const lines = csvText
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0);

  // Skip header if present (ticker, quantity, buy_price)
  const dataLines =
    lines[0].toLowerCase().includes("ticker") ||
    lines[0].toLowerCase().includes("qty")
      ? lines.slice(1)
      : lines;

  return dataLines.map((line, index) => {
    const [ticker, qty, price] = line.split(",").map((s) => s.trim());

    if (!ticker || !qty || !price) {
      throw new Error(`Invalid CSV format at line ${index + 1}: ${line}`);
    }

    return {
      id: `pos-${Date.now()}-${index}`,
      ticker: ticker.toUpperCase(),
      quantity: parseFloat(qty),
      buy_price: parseFloat(price),
    };
  });
}

// Fetch current prices for all positions
export async function fetchPortfolioPrices(
  positions: Position[]
): Promise<Position[]> {
  if (positions.length === 0) return positions;

  try {
    const response = await axios.post(`${BASE}/portfolio/prices`, {
      tickers: positions.map((p) => p.ticker),
    });

    const priceMap = response.data;

    return positions.map((pos) => ({
      ...pos,
      current_price: priceMap[pos.ticker]?.price || pos.buy_price,
      sector: priceMap[pos.ticker]?.sector,
      name: priceMap[pos.ticker]?.name,
    }));
  } catch {
    // If batch fetch fails, return positions with current_price = buy_price as fallback
    return positions.map((pos) => ({
      ...pos,
      current_price: pos.buy_price,
    }));
  }
}

// Calculate portfolio metrics
export function calculatePortfolio(positions: Position[]): Portfolio {
  const total_invested = positions.reduce(
    (sum, p) => sum + p.quantity * p.buy_price,
    0
  );

  const total_current_value = positions.reduce(
    (sum, p) => sum + p.quantity * (p.current_price || p.buy_price),
    0
  );

  const total_gain_loss = total_current_value - total_invested;
  const total_gain_loss_pct =
    total_invested > 0 ? (total_gain_loss / total_invested) * 100 : 0;

  // Sector allocation
  const sector_allocation: Record<string, number> = {};
  positions.forEach((p) => {
    const sector = p.sector || "Unknown";
    const value = p.quantity * (p.current_price || p.buy_price);
    sector_allocation[sector] = (sector_allocation[sector] || 0) + value;
  });

  return {
    positions,
    total_invested: Math.round(total_invested),
    total_current_value: Math.round(total_current_value),
    total_gain_loss: Math.round(total_gain_loss),
    total_gain_loss_pct: parseFloat(total_gain_loss_pct.toFixed(2)),
    sector_allocation,
  };
}

// Get AI portfolio analysis
export async function analyzePortfolio(
  portfolio: Portfolio
): Promise<PortfolioAnalysisResult> {
  try {
    const response = await axios.post(`${BASE}/portfolio/analyze`, portfolio);
    return response.data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Portfolio analysis failed"
    );
  }
}

// Format currency for display
export function formatCurrency(value: number, currency = "INR"): string {
  const sym = currency === "INR" ? "₹" : "$";
  const cr = 1e7;
  const lakh = 1e5;

  if (currency === "INR") {
    if (value >= cr) return `${sym}${(value / cr).toFixed(2)} Cr`;
    if (value >= lakh) return `${sym}${(value / lakh).toFixed(2)} L`;
    return `${sym}${value.toLocaleString("en-IN")}`;
  }

  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

// Export portfolio to CSV
export function exportPortfolioCSV(portfolio: Portfolio): string {
  const header = "Ticker,Quantity,Buy Price,Current Price,Value,Gain/Loss,Gain/Loss %\n";

  const rows = portfolio.positions
    .map((p) => {
      const currentPrice = p.current_price || p.buy_price;
      const value = p.quantity * currentPrice;
      const gainLoss = value - p.quantity * p.buy_price;
      const gainLossPct =
        p.buy_price > 0
          ? ((gainLoss / (p.quantity * p.buy_price)) * 100).toFixed(2)
          : "0.00";

      return `${p.ticker},${p.quantity},${p.buy_price.toFixed(2)},${currentPrice.toFixed(2)},${value.toFixed(2)},${gainLoss.toFixed(2)},${gainLossPct}`;
    })
    .join("\n");

  return header + rows;
}
