import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";

interface AiPanelProps {
  ticker: string | null;
  ollamaReady: boolean;
}

type Role = "system" | "user" | "assistant";

interface ChatMessage {
  role: Role;
  text: string;
}

interface AnalysisResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  insights: string[];
  recommendation: string;
  valuation: string;
  analysis_text?: string;
}

const API_BASE = "http://localhost:8000";

export default function AiPanel({ ticker, ollamaReady }: AiPanelProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ticker || !ollamaReady) {
      setAnalysis(null);
      setAnalysisError(null);
      setChatMessages([]);
      setChatInput("");
      return;
    }

    const loadAnalysis = async () => {
      setAnalyzing(true);
      setAnalysisError(null);
      setAnalysis(null);
      setChatMessages([]);
      setChatInput("");

      try {
        const response = await axios.get(`${API_BASE}/ai/analyze`, { params: { ticker } });
        const payload = response.data as AnalysisResult;
        setAnalysis(payload);
        setChatMessages([
          {
            role: "system",
            text: "You are an equity analyst assistant. Answer follow-up questions based on the provided analysis.",
          },
          {
            role: "assistant",
            text: "I have completed the analysis. Ask a follow-up question about this stock.",
          },
        ]);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unable to fetch AI analysis.";
        setAnalysisError(message);
      } finally {
        setAnalyzing(false);
      }
    };

    loadAnalysis();
  }, [ticker, ollamaReady, reloadKey]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [chatMessages]);

  const canChat = !!analysis && !!ticker && !analyzing && ollamaReady;

  const sendChat = async () => {
    if (!chatInput.trim() || !ticker || !analysis) return;
    const userMessage: ChatMessage = { role: "user", text: chatInput.trim() };
    const nextMessages = [...chatMessages, userMessage];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    setChatError(null);

    try {
      const response = await axios.post(`${API_BASE}/ai/chat`, {
        ticker,
        question: userMessage.text,
        history: nextMessages.filter((message) => message.role !== "system"),
        analysis,
      });

      const assistantText = response.data.answer as string;
      setChatMessages((previous) => [...previous, { role: "assistant", text: assistantText }]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Chat request failed.";
      setChatError(message);
    } finally {
      setChatLoading(false);
    }
  };

  const chatPlaceholder = !ollamaReady
    ? "Ollama is offline. Start the server to chat."
    : !ticker
    ? "Search a ticker to begin AI analysis."
    : analyzing
    ? "Analyzing stock..."
    : "Ask a follow-up question about the current stock.";

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-surface)" }}>
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: "var(--cyan)" }}>
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
            style={{ color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            llama3.2:3b
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: ollamaReady ? "var(--green)" : "var(--red)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {ollamaReady ? "Ready" : "Offline"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        {!ticker ? (
          <EmptyState />
        ) : !ollamaReady ? (
          <OllamaOffline />
        ) : analyzing ? (
          <AnalyzingState ticker={ticker} />
        ) : analysisError ? (
          <ErrorState message={analysisError} onRetry={() => setReloadKey((value) => value + 1)} />
        ) : analysis ? (
          <div className="flex flex-col h-full gap-4 overflow-hidden">
            <div className="rounded-3xl bg-[rgba(255,255,255,0.05)] p-4 border border-[rgba(255,255,255,0.08)] overflow-auto">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                    AI summary
                  </div>
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {ticker} investment snapshot
                  </h3>
                </div>
              </div>
              <p className="text-xs leading-6" style={{ color: "var(--text-secondary)" }}>
                {analysis.summary}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <StatCard label="Recommendation" value={analysis.recommendation} />
                <StatCard label="Valuation" value={analysis.valuation} />
              </div>
            </div>

            <div className="grid gap-3">
              <SwotCard title="Strengths" items={analysis.strengths} color="var(--green)" />
              <SwotCard title="Weaknesses" items={analysis.weaknesses} color="var(--red)" />
              <SwotCard title="Opportunities" items={analysis.opportunities} color="var(--cyan)" />
              <SwotCard title="Threats" items={analysis.threats} color="var(--amber)" />
            </div>

            <div className="flex flex-col flex-1 overflow-hidden rounded-3xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] p-3">
              <div className="text-[11px] uppercase tracking-[0.18em] mb-3" style={{ color: "var(--text-muted)" }}>
                Follow-up chat
              </div>
              <div className="flex-1 overflow-y-auto pr-1">
                {chatMessages.map((message, index) => (
                  <ChatBubble key={`${message.role}-${index}`} message={message} />
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <textarea
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  rows={2}
                  disabled={!canChat || chatLoading}
                  className="flex-1 rounded-2xl bg-[rgba(0,0,0,0.15)] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-xs text-white resize-none outline-none"
                  placeholder={chatPlaceholder}
                  style={{ color: "var(--text-primary)" }}
                />
                <button
                  onClick={sendChat}
                  disabled={!canChat || chatLoading || !chatInput.trim()}
                  className="rounded-2xl px-4 py-2 text-xs font-semibold"
                  style={{
                    background: canChat ? "var(--cyan)" : "var(--bg-elevated)",
                    color: canChat ? "#050A0F" : "var(--text-muted)",
                    border: "1px solid var(--border)",
                    cursor: canChat ? "pointer" : "not-allowed",
                  }}
                >
                  {chatLoading ? "Sending..." : "Send"}
                </button>
              </div>
              {chatError && (
                <div className="mt-2 text-xs text-red-300">{chatError}</div>
              )}
            </div>
          </div>
        ) : (
          <AwaitingAnalysis ticker={ticker} />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] p-3">
      <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {value || "N/A"}
      </div>
    </div>
  );
}

function SwotCard({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div className="rounded-3xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </div>
        <span
          className="text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full"
          style={{ background: `${color}22`, color, border: `1px solid ${color}` }}
        >
          {title}
        </span>
      </div>
      <div className="space-y-2">
        {(items.length ? items : ["No items generated."]).map((item, index) => (
          <div key={index} className="text-[12px] leading-5" style={{ color: "var(--text-secondary)" }}>
            • {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`mb-3 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-full rounded-3xl p-3"
        style={{
          background: isUser ? "rgba(0,194,255,0.16)" : "rgba(255,255,255,0.08)",
          color: "var(--text-secondary)",
          border: `1px solid ${isUser ? "rgba(0,194,255,0.24)" : "rgba(255,255,255,0.08)"}`,
        }}
      >
        <div className="text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: "var(--text-muted)" }}>
          {isUser ? "You" : message.role === "assistant" ? "AI" : "System"}
        </div>
        <div className="text-[12px] leading-6" style={{ color: "var(--text-primary)" }}>
          {message.text}
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
          <circle cx="4" cy="4" r="2" stroke="var(--cyan)" strokeWidth="1.2" opacity="0.5" />
          <circle cx="18" cy="4" r="2" stroke="var(--cyan)" strokeWidth="1.2" opacity="0.5" />
          <circle cx="4" cy="18" r="2" stroke="var(--cyan)" strokeWidth="1.2" opacity="0.5" />
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

function AnalyzingState({ ticker }: { ticker: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full text-center gap-3 px-6"
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2" style={{ background: "var(--cyan-dim)", border: "1px solid var(--cyan-border)" }}>
        <motion.svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
        >
          <circle cx="10" cy="10" r="7" stroke="var(--cyan-border)" strokeWidth="1.5" />
          <path d="M10 3a7 7 0 0 1 7 7" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" />
        </motion.svg>
      </div>
      <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        Analyzing {ticker}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
        Gathering SWOT insight and valuation commentary from Ollama.
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
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2" style={{ background: "var(--cyan-dim)", border: "1px solid var(--cyan-border)" }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7" stroke="var(--cyan-border)" strokeWidth="1.5" />
          <path d="M10 3a7 7 0 0 1 7 7" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        Ready to analyze {ticker}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
        AI analysis will appear here once the stock data is ready.
      </p>
    </motion.div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col justify-center h-full gap-4 px-6 text-center">
      <div className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        AI analysis failed
      </div>
      <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {message}
      </div>
      <button
        onClick={onRetry}
        className="mx-auto rounded-full px-4 py-2 text-xs font-semibold"
        style={{ background: "var(--cyan)", color: "#050A0F" }}
      >
        Retry analysis
      </button>
    </div>
  );
}
