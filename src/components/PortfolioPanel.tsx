import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  Position,
  Portfolio,
  PortfolioAnalysisResult,
  parsePortfolioCSV,
  fetchPortfolioPrices,
  calculatePortfolio,
  analyzePortfolio,
  formatCurrency,
  exportPortfolioCSV,
} from "../api/portfolio";

interface PortfolioPanelProps {
  ollamaReady: boolean;
}

type Role = "system" | "user" | "assistant";

interface ChatMessage {
  role: Role;
  text: string;
}

const API_BASE = "http://localhost:8000";

export default function PortfolioPanel({ ollamaReady }: PortfolioPanelProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<PortfolioAnalysisResult | null>(
    null,
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [newPosition, setNewPosition] = useState<Partial<Position>>({
    ticker: "",
    quantity: undefined,
    buy_price: undefined,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Recalculate portfolio when positions change
  useEffect(() => {
    if (positions.length > 0) {
      setError(null);
      setAnalysis(null);
      setChatMessages([]);

      fetchPortfolioPrices(positions)
        .then((updatedPositions) => {
          const calc = calculatePortfolio(updatedPositions);
          setPortfolio(calc);
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : "Failed to fetch prices");
        })
    } else {
      setPortfolio(null);
      setAnalysis(null);
    }
  }, [positions]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const parsed = parsePortfolioCSV(csv);
        setPositions(parsed);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to parse CSV file",
        );
      }
    };
    reader.readAsText(file);
  };

  const addPosition = () => {
    if (
      !newPosition.ticker ||
      !newPosition.quantity ||
      !newPosition.buy_price
    ) {
      setError("All fields are required");
      return;
    }

    const pos: Position = {
      id: `pos-${Date.now()}`,
      ticker: newPosition.ticker.toUpperCase(),
      quantity: newPosition.quantity,
      buy_price: newPosition.buy_price,
    };

    setPositions([...positions, pos]);
    setNewPosition({ ticker: "", quantity: undefined, buy_price: undefined });
    setError(null);
  };

  const deletePosition = (id: string) => {
    setPositions(positions.filter((p) => p.id !== id));
  };

  const runAnalysis = async () => {
    if (!portfolio || !ollamaReady) return;

    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysis(null);
    setChatMessages([]);

    try {
      console.log("Sending portfolio:", portfolio);
      const result = await analyzePortfolio(portfolio);
      setAnalysis(result);
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !portfolio || !analysis) return;

    const userMessage: ChatMessage = { role: "user", text: chatInput.trim() };
    const nextMessages = [...chatMessages, userMessage];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    setChatError(null);

    try {
      const response = await axios.post(`${API_BASE}/portfolio/chat`, {
        question: userMessage.text,
        history: nextMessages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role, content: m.text })),
        portfolio,
        analysis,
      });

      const assistantText = response.data.answer as string;
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: assistantText },
      ]);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Chat request failed";
      setChatError(message);
    } finally {
      setChatLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!portfolio) return;
    const csv = exportPortfolioCSV(portfolio);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolio-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 shrink-0"
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h2
          className="text-lg font-semibold mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          Portfolio Analyst
        </h2>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Upload holdings or manually add positions to analyze your portfolio
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-6 p-6">
        {/* Upload section */}
        <div
          className="rounded-2xl border p-6"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <div className="mb-4">
            <label
              className="text-sm font-semibold block mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Import Portfolio (CSV)
            </label>
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              Format: ticker, quantity, buy_price (e.g., RELIANCE.NS, 10,
              1450.50)
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 rounded-lg text-sm font-medium border-2 border-dashed"
              style={{
                borderColor: "var(--gold-border)",
                color: "var(--gold)",
                background: "var(--gold-dim)",
                cursor: "pointer",
              }}
            >
              Choose CSV File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              style={{ display: "none" }}
            />
          </div>

          {/* Manual entry */}
          <div
            className="border-t pt-4"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <label
              className="text-sm font-semibold block mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              Add Position Manually
            </label>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Ticker (e.g. TCS.NS)"
                value={newPosition.ticker || ""}
                onChange={(e) =>
                  setNewPosition({ ...newPosition, ticker: e.target.value })
                }
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              <input
                type="number"
                placeholder="Quantity"
                value={newPosition.quantity || ""}
                onChange={(e) =>
                  setNewPosition({
                    ...newPosition,
                    quantity: parseFloat(e.target.value),
                  })
                }
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              <input
                type="number"
                placeholder="Buy Price"
                step="0.01"
                value={newPosition.buy_price || ""}
                onChange={(e) =>
                  setNewPosition({
                    ...newPosition,
                    buy_price: parseFloat(e.target.value),
                  })
                }
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <button
              onClick={addPosition}
              className="w-full mt-3 py-2 rounded-lg text-sm font-medium"
              style={{
                background: "var(--gold)",
                color: "#241623",
                cursor: "pointer",
              }}
            >
              Add Position
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg p-4 text-sm"
            style={{
              background: "var(--red-dim)",
              border: "1px solid var(--red-border)",
              color: "var(--red)",
            }}
          >
            {error}
          </motion.div>
        )}

        {/* Portfolio summary */}
        {portfolio && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border overflow-hidden"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
            }}
          >
            {/* Summary cards */}
            <div
              className="grid grid-cols-4 gap-0.5 p-4"
              style={{ background: "var(--bg-elevated)" }}
            >
              <div className="text-center p-3">
                <div
                  className="text-xs mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  INVESTED
                </div>
                <div
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatCurrency(portfolio.total_invested)}
                </div>
              </div>
              <div
                className="text-center p-3 border-l"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div
                  className="text-xs mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  CURRENT
                </div>
                <div
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatCurrency(portfolio.total_current_value)}
                </div>
              </div>
              <div
                className="text-center p-3 border-l"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div
                  className="text-xs mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  GAIN/LOSS
                </div>
                <div
                  className="text-sm font-semibold"
                  style={{
                    color:
                      portfolio.total_gain_loss >= 0
                        ? "var(--green)"
                        : "var(--red)",
                  }}
                >
                  {formatCurrency(portfolio.total_gain_loss)}
                </div>
              </div>
              <div
                className="text-center p-3 border-l"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div
                  className="text-xs mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  RETURN
                </div>
                <div
                  className="text-sm font-semibold"
                  style={{
                    color:
                      portfolio.total_gain_loss_pct >= 0
                        ? "var(--green)"
                        : "var(--red)",
                  }}
                >
                  {portfolio.total_gain_loss_pct > 0 ? "+" : ""}
                  {portfolio.total_gain_loss_pct.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Positions table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background: "var(--bg-elevated)",
                    }}
                  >
                    <th
                      className="text-left px-4 py-3 font-semibold"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Ticker
                    </th>
                    <th
                      className="text-right px-4 py-3 font-semibold"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Qty
                    </th>
                    <th
                      className="text-right px-4 py-3 font-semibold"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Buy Price
                    </th>
                    <th
                      className="text-right px-4 py-3 font-semibold"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Current
                    </th>
                    <th
                      className="text-right px-4 py-3 font-semibold"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Value
                    </th>
                    <th
                      className="text-right px-4 py-3 font-semibold"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Gain/Loss
                    </th>
                    <th
                      className="text-center px-4 py-3 font-semibold"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.positions.map((pos, idx) => {
                    const current = pos.current_price || pos.buy_price;
                    const value = pos.quantity * current;
                    const gainLoss = value - pos.quantity * pos.buy_price;
                    const gainLossPct =
                      pos.buy_price > 0
                        ? (
                            (gainLoss / (pos.quantity * pos.buy_price)) *
                            100
                          ).toFixed(2)
                        : "0.00";

                    return (
                      <tr
                        key={pos.id}
                        style={{
                          borderBottom: "1px solid var(--border-subtle)",
                          background:
                            idx % 2 === 0
                              ? "transparent"
                              : "var(--bg-elevated)",
                        }}
                      >
                        <td
                          className="px-4 py-3"
                          style={{ color: "var(--gold)", fontWeight: 500 }}
                        >
                          {pos.ticker}
                        </td>
                        <td
                          className="text-right px-4 py-3"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {pos.quantity}
                        </td>
                        <td
                          className="text-right px-4 py-3"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {formatCurrency(pos.buy_price)}
                        </td>
                        <td
                          className="text-right px-4 py-3"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {formatCurrency(current)}
                        </td>
                        <td
                          className="text-right px-4 py-3"
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: 500,
                          }}
                        >
                          {formatCurrency(value)}
                        </td>
                        <td
                          className="text-right px-4 py-3 font-semibold"
                          style={{
                            color:
                              gainLoss >= 0 ? "var(--green)" : "var(--red)",
                          }}
                        >
                          {gainLoss >= 0 ? "+" : ""}
                          {formatCurrency(gainLoss)} ({gainLossPct}%)
                        </td>
                        <td className="text-center px-4 py-3">
                          <button
                            onClick={() => deletePosition(pos.id)}
                            className="text-xs font-medium px-2 py-1 rounded"
                            style={{
                              color: "var(--red)",
                              background: "var(--red-dim)",
                              border: "1px solid var(--red-border)",
                              cursor: "pointer",
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Action buttons */}
            <div
              className="flex gap-3 p-4 border-t"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <button
                onClick={runAnalysis}
                disabled={!ollamaReady || analyzing}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: "var(--gold)",
                  color: "#241623",
                  opacity: !ollamaReady || analyzing ? 0.5 : 1,
                  cursor: !ollamaReady || analyzing ? "not-allowed" : "pointer",
                }}
              >
                {analyzing ? "Analyzing..." : "AI Analysis"}
              </button>
              <button
                onClick={downloadCSV}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                Export CSV
              </button>
            </div>
          </motion.div>
        )}

        {/* Analysis section */}
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border p-6"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
            }}
          >
            <div className="mb-4">
              <h3
                className="text-sm font-semibold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                AI Portfolio Analysis
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {analysis.summary}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div
                className="rounded-lg p-3"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  className="text-xs mb-2 font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Sector Balance
                </div>
                <div
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {analysis.sector_balance}
                </div>
              </div>
              <div
                className="rounded-lg p-3"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  className="text-xs mb-2 font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Concentration Risk
                </div>
                <div
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {analysis.concentration}
                </div>
              </div>
            </div>

            {/* Risks */}
            {analysis.risks.length > 0 && (
              <div className="mb-4">
                <div
                  className="text-xs font-semibold mb-2"
                  style={{ color: "var(--red)" }}
                >
                  Risks
                </div>
                <div className="space-y-2">
                  {analysis.risks.map((risk, i) => (
                    <div
                      key={i}
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      • {risk}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <div>
                <div
                  className="text-xs font-semibold mb-2"
                  style={{ color: "var(--green)" }}
                >
                  Recommendations
                </div>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      • {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat section */}
            <div
              className="mt-6 border-t pt-4"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="mb-3">
                <div
                  className="text-xs font-semibold mb-3"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Portfolio Questions
                </div>
                <div className="max-h-32 overflow-y-auto space-y-2 mb-3">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`text-xs p-2 rounded ${
                        msg.role === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      <div
                        className="inline-block px-3 py-1 rounded max-w-xs"
                        style={{
                          background:
                            msg.role === "user"
                              ? "var(--gold-dim)"
                              : "var(--bg-elevated)",
                          color: "var(--text-secondary)",
                          border: `1px solid ${
                            msg.role === "user"
                              ? "var(--gold-border)"
                              : "var(--border)"
                          }`,
                        }}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </div>

              <div className="flex gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendChat();
                    }
                  }}
                  rows={2}
                  disabled={chatLoading}
                  placeholder="Ask about rebalancing, diversification, etc."
                  className="flex-1 px-3 py-2 rounded-lg text-xs resize-none"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
                <button
                  onClick={sendChat}
                  disabled={!chatInput.trim() || chatLoading}
                  className="px-4 py-2 rounded-lg text-xs font-medium"
                  style={{
                    background: "var(--gold)",
                    color: "#241623",
                    opacity: !chatInput.trim() || chatLoading ? 0.5 : 1,
                    cursor:
                      !chatInput.trim() || chatLoading
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  Send
                </button>
              </div>
              {chatError && (
                <div className="text-xs mt-2" style={{ color: "var(--red)" }}>
                  {chatError}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {analysisError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg p-4 text-sm"
            style={{
              background: "var(--red-dim)",
              border: "1px solid var(--red-border)",
              color: "var(--red)",
            }}
          >
            {analysisError}
          </motion.div>
        )}
      </div>
    </div>
  );
}
