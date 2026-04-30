import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipProps,
} from "recharts";
import { HistoryResponse, PricePoint, formatPrice, StockInfo } from "../api/stock";

interface ChartPanelProps {
  history: HistoryResponse | null;
  stock: StockInfo | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

type ChartMode = "line" | "area" | "candlestick";

const MODE_LABELS: Record<ChartMode, string> = {
  line: "Line",
  area: "Area",
  candlestick: "Candlestick",
};

function shortDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function priceTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload as PricePoint;
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
        padding: "10px",
        borderRadius: "10px",
        minWidth: "160px",
      }}
    >
      <div style={{ fontSize: "12px", marginBottom: "6px", color: "var(--text-muted)" }}>
        {shortDateLabel(point.date)}
      </div>
      <div style={{ fontSize: "13px", marginBottom: "4px" }}>
        Close: {formatPrice(point.close)}
      </div>
      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
        Open {formatPrice(point.open)} · High {formatPrice(point.high)} · Low {formatPrice(point.low)}
      </div>
      {point.volume != null && (
        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
          Vol: {point.volume.toLocaleString()}
        </div>
      )}
    </div>
  );
}

function ChartPanel({ history, stock, loading, error, onRetry }: ChartPanelProps) {
  const [mode, setMode] = useState<ChartMode>("line");

  if (!history && loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
          Loading price history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-6">
        <div
          className="text-sm text-center"
          style={{ color: "var(--text-muted)" }}
        >
          {error}
        </div>
        <button
          onClick={onRetry}
          style={{
            padding: "10px 18px",
            borderRadius: "999px",
            background: "var(--cyan)",
            color: "#121212",
            border: "none",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!history) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3" style={{ color: "var(--text-muted)" }}>
        <div className="text-sm">Select a stock and time range to load charts.</div>
      </div>
    );
  }

  const chartData = history.data.map((point) => ({
    ...point,
    label: shortDateLabel(point.date),
  }));

  const minY = Math.min(...history.data.map((p) => p.low));
  const maxY = Math.max(...history.data.map((p) => p.high));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Price Chart
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
            {history.ticker} · {history.period.toUpperCase()}
          </div>
        </div>

        <div className="flex gap-2">
          {Object.entries(MODE_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMode(key as ChartMode)}
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: mode === key ? "var(--cyan)" : "var(--bg-surface)",
                color: mode === key ? "#121212" : "var(--text-secondary)",
                border: `1px solid ${mode === key ? "var(--cyan)" : "var(--border)"}`,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4 space-y-4">
        <div
          className="h-64 rounded-3xl bg-[rgba(255,255,255,0.04)] p-3"
          style={{ transform: "translateZ(0)", willChange: "transform" }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                domain={[minY * 0.98, maxY * 1.02]}
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={priceTooltip} />
              {mode !== "candlestick" ? (
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke="#00C2FF"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={800}
                />
              ) : (
                <Bar
                  dataKey="close"
                  fill="#60A5FA"
                  barSize={14}
                  radius={[6, 6, 0, 0]}
                />
              )}
              {mode === "area" && (
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke="#58D6FF"
                  fill="rgba(0,194,255,0.16)"
                  fillOpacity={0.8}
                  strokeWidth={2}
                  animationDuration={800}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {stock && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StockDetailCard label="Market Cap" value={formatMarketCap(stock.market_cap)} />
            <StockDetailCard label="P/E Ratio" value={stock.pe_ratio ? stock.pe_ratio.toFixed(2) : "N/A"} />
            <StockDetailCard label="EPS" value={stock.eps ? formatPrice(stock.eps) : "N/A"} />
            <StockDetailCard label="Dividend Yield" value={stock.dividend_yield ? `${(stock.dividend_yield * 100).toFixed(2)}%` : "N/A"} />
            <StockDetailCard label="52-Week High" value={formatPrice(stock.week_52_high)} />
            <StockDetailCard label="52-Week Low" value={formatPrice(stock.week_52_low)} />
            <StockDetailCard label="Avg Volume" value={formatVolume(stock.avg_volume)} />
            <StockDetailCard label="Target Price" value={stock.target_price ? formatPrice(stock.target_price) : "N/A"} />
            <StockDetailCard label="Sector" value={stock.sector} />
          </div>
        )}
      </div>
    </div>
  );
}

function StockDetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-[rgba(255,255,255,0.04)] p-3 border border-[rgba(255,255,255,0.08)]">
      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </div>
      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginTop: "4px" }}>
        {value}
      </div>
    </div>
  );
}

function formatMarketCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  return `$${cap.toFixed(0)}`;
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
  return vol.toFixed(0);
}

export default ChartPanel;
