import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  TooltipProps,
} from "recharts";
import { HistoryResponse, PricePoint, formatPrice } from "../api/stock";

interface ChartPanelProps {
  history: HistoryResponse | null;
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

function indicatorTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
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
      {payload.map((item) => (
        <div key={item.dataKey as string} style={{ marginBottom: "4px", fontSize: "13px" }}>
          <span style={{ color: item.stroke }}>{item.name}: </span>
          {typeof item.value === "number" ? item.value.toFixed(2) : item.value}
        </div>
      ))}
    </div>
  );
}

function ChartPanel({ history, loading, error, onRetry }: ChartPanelProps) {
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

  const hasIndicators = history.data.some((point) => point.rsi != null);

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
            Price & Indicators
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
              {hasIndicators && (
                <>
                  <Line
                    type="monotone"
                    dataKey="bb_upper"
                    stroke="#F1C40F"
                    strokeWidth={1}
                    dot={false}
                    strokeDasharray="4 4"
                    animationDuration={800}
                  />
                  <Line
                    type="monotone"
                    dataKey="bb_middle"
                    stroke="#F9D98F"
                    strokeWidth={1}
                    dot={false}
                    strokeDasharray="3 3"
                    animationDuration={800}
                  />
                  <Line
                    type="monotone"
                    dataKey="bb_lower"
                    stroke="#F1C40F"
                    strokeWidth={1}
                    dot={false}
                    strokeDasharray="4 4"
                    animationDuration={800}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-[rgba(255,255,255,0.04)] p-4 h-52">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  RSI
                </div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Relative Strength
                </div>
              </div>
            </div>
            {hasIndicators ? (
              <ResponsiveContainer width="100%" height="80%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="2 2" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ReferenceLine y={70} stroke="#F59E0B" strokeDasharray="3 3" />
                  <ReferenceLine y={30} stroke="#10B981" strokeDasharray="3 3" />
                  <Tooltip content={indicatorTooltip} />
                  <Line type="monotone" dataKey="rsi" stroke="#6EE7B7" strokeWidth={2} dot={false} animationDuration={800} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "24px" }}>
                RSI data will appear after the first history load.
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-[rgba(255,255,255,0.04)] p-4 h-52">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  MACD
                </div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Trend momentum
                </div>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>12/26/9</div>
            </div>
            {hasIndicators ? (
              <ResponsiveContainer width="100%" height="80%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="2 2" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={indicatorTooltip} />
                  <Line type="monotone" dataKey="macd" stroke="#60A5FA" strokeWidth={2} dot={false} animationDuration={800} />
                  <Line type="monotone" dataKey="macd_signal" stroke="#F472B6" strokeWidth={2} dot={false} animationDuration={800} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "24px" }}>
                MACD data will appear after the first history load.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChartPanel;
