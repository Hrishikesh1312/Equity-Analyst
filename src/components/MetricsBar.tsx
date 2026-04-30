import { motion } from "framer-motion";
import { StockInfo, formatMarketCap, formatPrice, formatVolume, formatEPS } from "../api/stock";

interface MetricsBarProps { stock: StockInfo; }

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "9px 16px", borderRight: "1px solid var(--border-subtle)" }}>
      <span style={{ fontSize: "9px", color: "var(--text-muted)", marginBottom: "3px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontSize: "12px", fontWeight: 500, color: color ?? "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </span>
    </div>
  );
}

export default function MetricsBar({ stock }: MetricsBarProps) {
  const currency = stock.currency || "INR";
  const total  = Math.max(stock.analyst_total, 1);
  const buyPct  = Math.round((stock.analyst_buy  / total) * 100);
  const holdPct = Math.round((stock.analyst_hold / total) * 100);
  const sellPct = 100 - buyPct - holdPct;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
      <div style={{ display: "flex", background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)", overflowX: "auto" }}>
        <Metric label="Mkt Cap"    value={formatMarketCap(stock.market_cap, currency)} />
        <Metric label="P/E"        value={stock.pe_ratio != null ? `${stock.pe_ratio.toFixed(1)}x` : "N/A"} />
        <Metric label="EPS"        value={stock.eps != null ? formatEPS(stock.eps, currency) : "N/A"} />
        <Metric label="52W High"   value={formatPrice(stock.week_52_high, currency)} color="var(--green)" />
        <Metric label="52W Low"    value={formatPrice(stock.week_52_low,  currency)} color="var(--red)" />
        <Metric label="Volume"     value={formatVolume(stock.volume)} />
        <div style={{ display: "flex", flexDirection: "column", padding: "9px 16px" }}>
          <span style={{ fontSize: "9px", color: "var(--text-muted)", marginBottom: "3px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Div Yield</span>
          <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace" }}>
            {stock.dividend_yield != null ? `${(stock.dividend_yield * 100).toFixed(2)}%` : "N/A"}
          </span>
        </div>
      </div>

      {/* Analyst bar */}
      <div style={{ padding: "10px 20px", background: "var(--bg-base)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "7px" }}>
          <span style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Analyst Consensus · {stock.analyst_total} analysts
          </span>
          {stock.target_price && (
            <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
              Target: {formatPrice(stock.target_price, currency)}
            </span>
          )}
        </div>
        <div style={{ display: "flex", height: "5px", borderRadius: "3px", overflow: "hidden", gap: "2px", marginBottom: "6px" }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${buyPct}%` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            style={{ background: "var(--green)", borderRadius: "3px 0 0 3px" }} />
          <motion.div initial={{ width: 0 }} animate={{ width: `${holdPct}%` }}
            transition={{ duration: 0.9, delay: 0.1, ease: "easeOut" }}
            style={{ background: "var(--amber)" }} />
          <motion.div initial={{ width: 0 }} animate={{ width: `${sellPct}%` }}
            transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
            style={{ background: "var(--red)", borderRadius: "0 3px 3px 0" }} />
        </div>
        <div style={{ display: "flex", gap: "14px", fontSize: "10px" }}>
          <span style={{ color: "var(--green)" }}>Buy {buyPct}%</span>
          <span style={{ color: "var(--amber)" }}>Hold {holdPct}%</span>
          <span style={{ color: "var(--red)" }}>Sell {sellPct}%</span>
        </div>
      </div>
    </motion.div>
  );
}

export function MetricsBarSkeleton() {
  return (
    <div>
      <div style={{ display: "flex", background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)" }}>
        {[...Array(7)].map((_, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", padding: "9px 16px", gap: "5px", borderRight: "1px solid var(--border-subtle)" }}>
            <div className="shimmer" style={{ height: "9px", width: "50px", borderRadius: "3px" }} />
            <div className="shimmer" style={{ height: "13px", width: "60px", borderRadius: "3px" }} />
          </div>
        ))}
      </div>
      <div style={{ padding: "10px 20px", background: "var(--bg-base)", borderBottom: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "7px" }}>
        <div className="shimmer" style={{ height: "9px", width: "160px", borderRadius: "3px" }} />
        <div className="shimmer" style={{ height: "5px", width: "100%", borderRadius: "3px" }} />
        <div style={{ display: "flex", gap: "14px" }}>
          {[...Array(3)].map((_, i) => <div key={i} className="shimmer" style={{ height: "10px", width: "50px", borderRadius: "3px" }} />)}
        </div>
      </div>
    </div>
  );
}
