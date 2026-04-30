import { motion } from "framer-motion";
import { StockInfo, formatPrice, getRecommendationLabel } from "../api/stock";

interface StockHeaderProps {
  stock: StockInfo;
  period: string;
  onPeriodChange: (p: string) => void;
}

const PERIODS = [
  { label: "1D", value: "1d" },
  { label: "1M", value: "1mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "5Y", value: "5y" },
];

export default function StockHeader({ stock, period, onPeriodChange }: StockHeaderProps) {
  const rec = getRecommendationLabel(stock.recommendation);
  const isPositive = stock.change >= 0;
  const currency = stock.currency || "INR";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        padding: "12px 20px", display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", flexShrink: 0,
        background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ fontSize: "20px", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
            {stock.ticker.replace(".NS", "").replace(".BO", "")}
          </span>
          <span style={{
            fontSize: "10px", padding: "2px 7px", borderRadius: "4px", fontWeight: 500,
            color: "var(--gold)", background: "var(--gold-dim)", border: "1px solid var(--gold-border)",
          }}>
            {stock.exchange || "NSE"}
          </span>
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring" }}
            style={{
              fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px",
              color: rec.color, background: rec.bg, border: `1px solid ${rec.border}`,
              letterSpacing: "0.05em",
            }}
          >
            {rec.label}
          </motion.span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
          <span style={{ fontSize: "28px", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
            {formatPrice(stock.current_price, currency)}
          </span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ fontSize: "13px", fontWeight: 500, color: isPositive ? "var(--green)" : "var(--red)" }}
          >
            {isPositive ? "▲" : "▼"} {Math.abs(stock.change).toFixed(2)} ({isPositive ? "+" : ""}{stock.change_pct.toFixed(2)}%)
          </motion.span>
        </div>

        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
          {stock.name}&nbsp;&middot;&nbsp;{stock.sector}
        </div>
      </div>

      {/* Time range */}
      <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
        {PERIODS.map((p) => {
          const active = period === p.value;
          return (
            <motion.button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              style={{
                padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 500,
                color: active ? "#241623" : "var(--text-secondary)",
                background: active ? "var(--gold)" : "transparent",
                border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
                cursor: "pointer", outline: "none", fontFamily: "inherit",
              }}
            >
              {p.label}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

export function StockHeaderSkeleton() {
  return (
    <div style={{ padding: "12px 20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <div className="shimmer" style={{ height: "24px", width: "80px", borderRadius: "4px" }} />
          <div className="shimmer" style={{ height: "20px", width: "50px", borderRadius: "4px" }} />
          <div className="shimmer" style={{ height: "20px", width: "40px", borderRadius: "4px" }} />
        </div>
        <div className="shimmer" style={{ height: "34px", width: "160px", borderRadius: "4px" }} />
        <div className="shimmer" style={{ height: "14px", width: "200px", borderRadius: "4px" }} />
      </div>
      <div style={{ display: "flex", gap: "4px" }}>
        {[...Array(5)].map((_, i) => <div key={i} className="shimmer" style={{ height: "26px", width: "36px", borderRadius: "6px" }} />)}
      </div>
    </div>
  );
}
