import { motion } from "framer-motion";

interface AiPanelProps {
  ticker: string | null;
  ollamaReady: boolean;
}

export default function AiPanel({ ticker, ollamaReady }: AiPanelProps) {
  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--bg-surface)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded flex items-center justify-center shrink-0"
            style={{ background: "var(--cyan)" }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <circle cx="5" cy="5" r="1.8" fill="#050A0F" />
              <circle cx="1.8" cy="1.8" r="1" fill="#050A0F" opacity="0.55" />
              <circle cx="8.2" cy="1.8" r="1" fill="#050A0F" opacity="0.55" />
              <circle cx="1.8" cy="8.2" r="1" fill="#050A0F" opacity="0.55" />
              <circle cx="8.2" cy="8.2" r="1" fill="#050A0F" opacity="0.55" />
            </svg>
          </div>
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            AI Analysis
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              color: "var(--text-secondary)",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
            }}
          >
            llama3.2:3b
          </span>
        </div>

        <div
          className="flex items-center gap-1.5"
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: ollamaReady ? "var(--green)" : "var(--red)" }}
          />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {ollamaReady ? "Ready" : "Offline"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {!ticker ? (
          <EmptyState />
        ) : !ollamaReady ? (
          <OllamaOffline />
        ) : (
          <AwaitingAnalysis ticker={ticker} />
        )}
      </div>

      {/* Chat input - disabled in Sprint 1 */}
      <div
        className="shrink-0 px-3 py-3"
        style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}
      >
        <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
          Follow-up chat — available after analysis
        </div>
        <div className="flex gap-2 items-center">
          <div
            className="flex-1 rounded-lg px-3 py-2 text-xs"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            Search a stock to begin...
          </div>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--bg-elevated)", opacity: 0.4 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 6h10M7 2l4 4-4 4" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full text-center gap-3 px-6"
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2"
        style={{ background: "var(--cyan-dim)", border: "1px solid var(--cyan-border)" }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="4" stroke="var(--cyan)" strokeWidth="1.5" />
          <circle cx="4"  cy="4"  r="2" stroke="var(--cyan)" strokeWidth="1.2" opacity="0.5" />
          <circle cx="18" cy="4"  r="2" stroke="var(--cyan)" strokeWidth="1.2" opacity="0.5" />
          <circle cx="4"  cy="18" r="2" stroke="var(--cyan)" strokeWidth="1.2" opacity="0.5" />
          <circle cx="18" cy="18" r="2" stroke="var(--cyan)" strokeWidth="1.2" opacity="0.5" />
        </svg>
      </div>
      <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        Search for a stock to begin
      </p>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
        AI will generate a SWOT analysis, key insights, and valuation commentary using live market data.
      </p>
    </motion.div>
  );
}

function OllamaOffline() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full text-center gap-3 px-6"
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2"
        style={{ background: "var(--red-dim)", border: "1px solid var(--red-border)" }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="var(--red)" strokeWidth="1.5" />
          <line x1="10" y1="6" x2="10" y2="11" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="14" r="0.8" fill="var(--red)" />
        </svg>
      </div>
      <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        Ollama is not running
      </p>
      <p className="text-xs leading-relaxed font-mono" style={{ color: "var(--text-muted)" }}>
        Run: <span style={{ color: "var(--cyan)" }}>ollama serve</span>
        <br />then: <span style={{ color: "var(--cyan)" }}>ollama pull llama3.2:3b</span>
      </p>
    </motion.div>
  );
}

function AwaitingAnalysis({ ticker }: { ticker: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full text-center gap-3 px-6"
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2"
        style={{ background: "var(--cyan-dim)", border: "1px solid var(--cyan-border)" }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7" stroke="var(--cyan-border)" strokeWidth="1.5" />
            <path d="M10 3a7 7 0 0 1 7 7" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </motion.div>
      </div>
      <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        Ready to analyze {ticker}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
        AI analysis arrives in Sprint 3. The Ollama connection is live and ready.
      </p>
    </motion.div>
  );
}
