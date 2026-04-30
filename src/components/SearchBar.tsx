import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { searchStocks, SearchResult, normalizeIndianTicker } from "../api/stock";

interface SearchBarProps {
  onSearch: (ticker: string) => void;
  loading: boolean;
  zoom: number;
  onZoomChange: (z: number) => void;
}

const SUGGESTIONS = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS", "WIPRO.NS"];
const ZOOM_LEVELS = [85, 100, 115, 130];

export default function SearchBar({ onSearch, loading, zoom, onZoomChange }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 1) { setResults([]); setOpen(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const normalized = normalizeIndianTicker(query);
        const data = await searchStocks(normalized);
        setResults(data.slice(0, 7));
        setOpen(data.length > 0);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (ticker: string) => {
    setOpen(false);
    setResults([]);
    setQuery("");
    inputRef.current?.blur();
    onSearch(ticker);
  };

  const handleSubmit = () => {
    if (!query.trim()) return;
    const t = normalizeIndianTicker(query.trim());
    setOpen(false);
    setResults([]);
    setQuery("");
    onSearch(t);
  };

  const cycleZoom = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    const next = ZOOM_LEVELS[(idx + 1) % ZOOM_LEVELS.length];
    onZoomChange(next);
  };

  return (
    <div style={{
      padding: "10px 20px", flexShrink: 0,
      background: "var(--bg-surface)", borderBottom: "1px solid var(--border)",
    }}>
      <div ref={containerRef} style={{ position: "relative", display: "flex", gap: "10px", alignItems: "center" }}>
        {/* Input */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: "10px",
          borderRadius: "9px", padding: "9px 14px",
          background: "var(--bg-card)",
          border: `1px solid ${focused ? "var(--gold-border)" : "var(--border)"}`,
          transition: "border-color 0.2s",
        }}>
          {searching || loading ? (
            <motion.div
              style={{ width: "13px", height: "13px", borderRadius: "50%", flexShrink: 0,
                border: "1.5px solid var(--gold-border)", borderTopColor: "var(--gold)" }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
            />
          ) : (
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="6" cy="6" r="4.5" stroke="var(--text-muted)" strokeWidth="1.2" />
              <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search NSE/BSE ticker or company... (e.g. RELIANCE, TCS, INFY)"
            style={{ flex: 1, fontSize: "13px", fontWeight: 400, letterSpacing: "0.01em" }}
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
              style={{ fontSize: "11px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
              ✕
            </button>
          )}
        </div>

        {/* Zoom toggle */}
        <motion.button
          onClick={cycleZoom}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Cycle zoom level"
          style={{
            padding: "9px 14px", borderRadius: "9px", fontSize: "12px", fontWeight: 600,
            background: "var(--bg-elevated)", color: "var(--text-secondary)",
            border: "1px solid var(--border)", cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: "5px", flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
            <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="4" y1="6" x2="8" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="6" y1="4" x2="6" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          {zoom}%
        </motion.button>

        {/* Analyse button */}
        <motion.button
          onClick={handleSubmit}
          disabled={!query.trim() || loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: "9px 22px", borderRadius: "9px", fontSize: "13px", fontWeight: 600,
            background: "var(--gold)", color: "#241623", border: "none",
            cursor: query.trim() && !loading ? "pointer" : "not-allowed",
            opacity: query.trim() && !loading ? 1 : 0.45,
            fontFamily: "inherit", letterSpacing: "0.01em",
          }}
        >
          Analyse
        </motion.button>

        {/* Dropdown */}
        <AnimatePresence>
          {open && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute", top: "100%", left: 0, right: "170px", marginTop: "6px",
                borderRadius: "10px", overflow: "hidden", zIndex: 50,
                background: "var(--bg-card)", border: "1px solid var(--border)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
              }}
            >
              {results.map((r, i) => (
                <motion.button
                  key={r.ticker}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onMouseDown={() => handleSelect(r.ticker)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "12px",
                    padding: "10px 14px", textAlign: "left", background: "none", border: "none",
                    borderBottom: i < results.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 500, color: "var(--gold)", width: "120px", flexShrink: 0 }}>
                    {r.ticker}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.name}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", flexShrink: 0 }}>
                    {r.exchange}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick-pick chips */}
      {!query && (
        <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", alignSelf: "center", marginRight: "2px" }}>Quick:</span>
          {SUGGESTIONS.map((s) => (
            <motion.button
              key={s}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSelect(s)}
              style={{
                fontSize: "10px", fontWeight: 500, padding: "3px 9px", borderRadius: "20px",
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                color: "var(--text-secondary)", cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {s.replace(".NS", "")}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
