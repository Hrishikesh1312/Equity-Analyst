import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "./components/Navbar";
import SearchBar from "./components/SearchBar";
import StockHeader, { StockHeaderSkeleton } from "./components/StockHeader";
import MetricsBar from "./components/MetricsBar";
import ChartPanel from "./components/ChartPanel";
import AiPanel from "./components/AiPanel";
import { getStockInfo, getHistory, StockInfo, HistoryResponse } from "./api/stock";
import axios from "axios";

export default function App() {
  const [activeTab, setActiveTab] = useState<"stock" | "portfolio">("stock");
  const [ticker, setTicker] = useState<string | null>(null);
  const [stock, setStock] = useState<StockInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"1d" | "1mo" | "6mo" | "1y" | "5y">("1mo");
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [ollamaReady, setOllamaReady] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Apply zoom to document root
  useEffect(() => {
    
  }, [zoom]);

  // Check Ollama health on mount
  useEffect(() => {
    const checkOllama = async () => {
      try {
        const res = await axios.get("http://localhost:8000/ollama/status");
        setOllamaReady(res.data.ready);
      } catch {
        setOllamaReady(false);
      }
    };
    checkOllama();
    const interval = setInterval(checkOllama, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async (t: string) => {
    setTicker(t);
    setLoading(true);
    setError(null);
    setStock(null);
    setHistory(null);
    setHistoryError(null);
    try {
      const data = await getStockInfo(t);
      setStock(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(`Could not load data for "${t}". ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!stock) return;

    let isMounted = true;
    setHistoryLoading(true);
    setHistoryError(null);

    getHistory(stock.ticker, period)
      .then((data) => {
        if (isMounted) setHistory(data);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Unknown error";
        if (isMounted) setHistoryError(`Could not load chart history. ${msg}`);
      })
      .finally(() => {
        if (isMounted) setHistoryLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [stock, period]);

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        transform: `scale(${zoom / 100})`,
        transformOrigin: "top left",
        width: `${10000 / zoom}%`,
        height: `${10000 / zoom}%`,
        willChange: "transform",
        backfaceVisibility: "hidden",
      }}
    >
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ollamaReady={ollamaReady}
      />
      <SearchBar
        onSearch={handleSearch}
        loading={loading}
        zoom={zoom}
        onZoomChange={setZoom}
      />

      <AnimatePresence mode="wait">
        {activeTab === "stock" ? (
          <motion.div
            key="stock"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 min-h-0"
          >
            {/* Left column */}
            <div
              className="flex flex-col flex-1 min-w-0 overflow-hidden"
              style={{ borderRight: "1px solid var(--border)" }}
            >
              {/* Stock header */}
              <AnimatePresence mode="wait">
                {loading ? (
                  <StockHeaderSkeleton key="header-skeleton" />
                ) : stock ? (
                  <StockHeader
                    key={`header-${stock.ticker}`}
                    stock={stock}
                    period={period}
                    onPeriodChange={setPeriod}
                  />
                ) : null}
              </AnimatePresence>

              {/* Chart area placeholder - filled in Sprint 2 */}
              <div className="flex-1 overflow-hidden relative">
                {error && (
                  <div className="flex items-center justify-center h-full">
                    <div
                      className="text-sm px-6 py-4 rounded-xl max-w-sm text-center"
                      style={{
                        background: "var(--red-dim)",
                        border: "1px solid var(--red-border)",
                        color: "var(--red)",
                      }}
                    >
                      {error}
                    </div>
                  </div>
                )}

                {!error && !stock && !loading && (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <svg
                        width="64"
                        height="40"
                        viewBox="0 0 64 40"
                        fill="none"
                      >
                        <polyline
                          points="2,34 12,22 22,28 34,14 46,18 56,6"
                          stroke="var(--cyan-border)"
                          strokeWidth="1.5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="56"
                          cy="6"
                          r="3"
                          fill="var(--cyan)"
                          opacity="0.4"
                        />
                      </svg>
                    </motion.div>
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Search a stock to see charts &amp; data
                    </p>
                  </div>
                )}

                {loading && (
                  <div className="flex items-center justify-center h-full">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear",
                      }}
                      className="w-8 h-8 rounded-full"
                      style={{
                        border: "2px solid var(--cyan-dim)",
                        borderTopColor: "var(--cyan)",
                      }}
                    />
                  </div>
                )}

                {stock && !loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full"
                  >
                    {/* Metrics bar */}
                    <MetricsBar stock={stock} />

                    <ChartPanel
                      history={history}
                      stock={stock}
                      loading={historyLoading}
                      error={historyError}
                      onRetry={() => {
                        if (stock) {
                          setHistory(null);
                          setHistoryLoading(true);
                          setHistoryError(null);
                          getHistory(stock.ticker, period)
                            .then(setHistory)
                            .catch((e: unknown) => {
                              const msg = e instanceof Error ? e.message : "Unknown error";
                              setHistoryError(`Could not load chart history. ${msg}`);
                            })
                            .finally(() => setHistoryLoading(false));
                        }
                      }}
                    />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Right column: AI Panel */}
            <div className="w-80 shrink-0 flex flex-col overflow-hidden">
              <AiPanel ticker={ticker} ollamaReady={ollamaReady} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="portfolio"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="text-center">
              <p
                className="text-sm font-medium mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Portfolio tab
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Coming in Sprint 4
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
