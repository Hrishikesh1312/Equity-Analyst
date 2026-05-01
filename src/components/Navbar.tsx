import { motion } from "framer-motion";

interface NavbarProps {
  activeTab: "stock" | "portfolio";
  onTabChange: (tab: "stock" | "portfolio") => void;
  ollamaReady: boolean;
}

export default function Navbar({ activeTab, onTabChange, ollamaReady }: NavbarProps) {

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        height: "48px",
        background: "var(--accent)",
        borderBottom: "1px solid rgba(201,168,76,0.15)",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "28px", height: "28px", borderRadius: "7px",
          background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <polyline points="1,10 4,6 7,8 10,3 13,5"
              stroke="#241623" strokeWidth="2" fill="none"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#E8EEF2", letterSpacing: "0.02em" }}>
            Equity Analyst
          </div>
          <div style={{ fontSize: "9px", color: "rgba(201,168,76,0.7)", letterSpacing: "0.08em", marginTop: "-1px" }}>
            NSE · BSE · INDIA
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{
        display: "flex", borderRadius: "8px", padding: "3px", gap: "2px",
        background: "rgba(0,0,0,0.25)", border: "1px solid rgba(201,168,76,0.15)",
      }}>
        {(["stock", "portfolio"] as const).map((tab) => {
          const active = activeTab === tab;
          return (
            <motion.button
              key={tab}
              onClick={() => onTabChange(tab)}
              style={{
                position: "relative", padding: "5px 16px", borderRadius: "6px",
                fontSize: "12px", fontWeight: 500, cursor: "pointer",
                border: "none", outline: "none", background: "none",
                color: active ? "#241623" : "rgba(232,238,242,0.55)",
                fontFamily: "inherit",
              }}
            >
              {active && (
                <motion.div
                  layoutId="tab-bg"
                  style={{ position: "absolute", inset: 0, borderRadius: "6px", background: "var(--gold)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span style={{ position: "relative", zIndex: 1 }}>
                {tab === "stock" ? "Stock Analysis" : "Portfolio"}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Right: Ollama status */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <motion.div
          style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: ollamaReady ? "var(--green)" : "var(--amber)",
          }}
          animate={ollamaReady ? { scale: [1, 1.4, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2.5 }}
        />
        <span style={{ fontSize: "11px", color: "rgba(232,238,242,0.5)" }}>
          {ollamaReady ? "llama3.2:3b · ready" : "Ollama offline"}
        </span>
      </div>
    </nav>
  );
}
