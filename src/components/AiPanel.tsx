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
const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds

function isValidAnalysis(a: AnalysisResult): boolean {
  return (
    typeof a.summary === "string" &&
    typeof a.recommendation === "string" &&
    typeof a.valuation === "string"
  );
}

export default function AiPanel({ ticker, ollamaReady }: AiPanelProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ticker || !ollamaReady) {
      setAnalysis(null);
      setAnalysisError(null);
      setChatMessages([]);
      setChatInput("");
      setRetryCount(0);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
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
        
        // Validate the analysis
        if (!isValidAnalysis(payload)) {
          throw new Error("Analysis parsing incomplete. Retrying...");
        }
        
        setAnalysis(payload);
        setAnalysisError(null);
        setRetryCount(0); // Reset on success
        setAnalyzing(false);
      } catch (error: unknown) {
        const isParsingError = error instanceof Error && error.message.includes("parsing");
        
        if (isParsingError && retryCount < MAX_RETRY_ATTEMPTS) {
          // Auto-retry with exponential backoff
          const delay = INITIAL_RETRY_DELAY * Math.pow(1.5, retryCount);
          setRetryCount(prev => prev + 1);
          retryTimeoutRef.current = setTimeout(() => {
            // Trigger retry by updating reloadKey
            setReloadKey((value) => value + 1);
          }, delay);
          setAnalyzing(false); // Stop showing analyzing during retry wait
        } else {
          // If max retries exceeded or non-parsing error, show error
          const message = error instanceof Error ? error.message : "Unable to fetch AI analysis.";
          setAnalysisError(message);
          setAnalyzing(false);
        }
      }
    };

    loadAnalysis();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [ticker, ollamaReady, reloadKey]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [chatMessages]);

  const canChat = !!analysis && isValidAnalysis(analysis) && !!ticker && !analyzing && ollamaReady;

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
        history: nextMessages.filter((message) => message.role !== "system").map((m) => ({ role: m.role, content: m.text })),
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

      <div className="flex-1 flex flex-col min-h-0 gap-0">
        {/* Scrollable Analysis Area */}
        <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
          {!ticker ? (
            <EmptyState />
          ) : !ollamaReady ? (
            <OllamaOffline />
          ) : analyzing || (!analysis && !analysisError) ? (
            <AnalyzingState ticker={ticker} retryCount={retryCount} />
          ) : analysisError ? (
            <ErrorState message={analysisError} onRetry={() => {
              setRetryCount(0);
              setReloadKey((value) => value + 1);
            }} />
          ) : analysis && isValidAnalysis(analysis) ? (
            <div className="flex flex-col gap-4 pb-4">
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

              {analysis.insights && analysis.insights.length > 0 && (
                <div className="rounded-3xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] mb-3" style={{ color: "var(--text-muted)" }}>
                    Key insights
                  </div>
                  <div className="space-y-2">
                    {analysis.insights.map((insight, index) => (
                      <div key={index} className="text-[12px] leading-5" style={{ color: "var(--text-secondary)" }}>
                        • {insight}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <AwaitingAnalysis ticker={ticker} />
          )}
        </div>

        {/* Fixed Chat Area at Bottom */}
        {analysis && isValidAnalysis(analysis) && (
          <div className="shrink-0 border-t border-[rgba(255,255,255,0.08)] p-3" style={{ background: "var(--bg-elevated)" }}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <textarea
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendChat();
                    }
                  }}
                  rows={2}
                  disabled={!canChat || chatLoading}
                  className="flex-1 rounded-2xl px-3 py-2 text-xs resize-none outline-none font-normal"
                  placeholder={chatPlaceholder}
                  style={{
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    border: "1.5px solid var(--cyan)",
                  }}
                />
                <button
                  onClick={sendChat}
                  disabled={!canChat || chatLoading || !chatInput.trim()}
                  className="rounded-2xl px-4 py-2 text-xs font-semibold shrink-0 h-fit"
                  style={{
                    background: canChat && chatInput.trim() ? "var(--cyan)" : "var(--bg-card)",
                    color: canChat && chatInput.trim() ? "#050A0F" : "var(--text-muted)",
                    border: "1.5px solid var(--cyan)",
                    cursor: canChat && chatInput.trim() ? "pointer" : "not-allowed",
                    opacity: canChat && chatInput.trim() ? 1 : 0.5,
                  }}
                >
                  {chatLoading ? "..." : "Send"}
                </button>
              </div>
              {chatMessages.length > 0 && (
                <div className="flex-1 overflow-y-auto max-h-32 pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {chatMessages.map((message, index) => (
                    <ChatBubble key={`${message.role}-${index}`} message={message} />
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}
              {chatError && (
                <div className="text-xs" style={{ color: "var(--red)" }}>{chatError}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] p-3 min-w-0">
      <div className="text-[10px] uppercase tracking-[0.12em] truncate" style={{ color: "var(--text-muted)" }}>
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

function AnalyzingState({ ticker, retryCount }: { ticker: string; retryCount: number }) {
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
        {retryCount > 0 ? `Validating ${ticker}` : `Analyzing ${ticker}`}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {retryCount > 0 
          ? `Ensuring analysis quality... (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS + 1})`
          : "Gathering SWOT insight and valuation commentary from Ollama."
        }
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
