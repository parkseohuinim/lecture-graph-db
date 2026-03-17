"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { askApi, QAResponse } from "@/lib/api";
import { MessageSquare, Send, Code, ChevronDown, ChevronUp, Sparkles, Database } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  cypher?: string;
  rawResults?: Record<string, unknown>[];
}

const SAMPLE_QUESTIONS = [
  "3월 5일 서울역에 있었던 사람은 누구인가?",
  "김철수와 박영수는 어떤 관계인가?",
  "검은색 SUV의 소유자는 누구인가?",
  "피해자 최민호와 연결된 모든 인물을 보여줘",
  "㈜한성물류를 중심으로 한 관계도를 보여줘",
  "네트워크에서 가장 많은 관계를 가진 인물은?",
];

export default function InvestigationChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedCypher, setExpandedCypher] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (question: string) => {
    if (!question.trim() || loading) return;
    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res: QAResponse = await askApi.question(question);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer,
          cypher: res.cypher_used,
          rawResults: res.raw_results,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `오류가 발생했습니다: ${String(e)}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-slate-900 tracking-tight">수사 챗</h1>
            <p className="text-[11px] text-slate-400">자연어 질문 → Cypher 자동 생성 → 그래프 탐색 → AI 답변</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 min-h-0 bg-slate-50/60">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto mt-12 animate-fade-in-up">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/80 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Sparkles className="w-6 h-6 text-slate-400" />
              </div>
              <h2 className="text-[15px] font-semibold text-slate-700 mb-1">수사 질문을 입력하세요</h2>
              <p className="text-[12px] text-slate-400">그래프 데이터를 기반으로 AI가 답변합니다</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {SAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-left text-[12px] bg-white hover:bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-3 text-slate-500 hover:text-slate-700 transition-all duration-150 shadow-sm hover:shadow"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center mr-2.5 mt-0.5 shrink-0 shadow-sm">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            )}
            <div
              className={`max-w-[680px] rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-slate-900 text-white px-4 py-2.5 shadow-sm"
                  : "bg-white border border-slate-200/80 text-slate-700 px-5 py-4 shadow-sm"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose-chat">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="leading-relaxed">{msg.content}</p>
              )}

              {msg.cypher && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setExpandedCypher(expandedCypher === i ? null : i)}
                    className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Code className="w-3 h-3" />
                    실행된 Cypher 쿼리
                    {expandedCypher === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {expandedCypher === i && (
                    <pre className="mt-2.5 text-[11px] bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-600 overflow-x-auto font-mono leading-relaxed">
                      {msg.cypher}
                    </pre>
                  )}
                </div>
              )}

              {msg.rawResults && msg.rawResults.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Database className="w-3 h-3" />
                  조회 결과 {msg.rawResults.length}건
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fade-in-up">
            <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center mr-2.5 mt-0.5 shrink-0 shadow-sm">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((j) => (
                    <div
                      key={j}
                      className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"
                      style={{ animationDelay: `${j * 0.15}s` }}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-slate-400 ml-1">분석 중...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-100 bg-white">
        <div className="flex gap-2.5 max-w-3xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
            placeholder="수사 질문을 입력하세요..."
            disabled={loading}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-900/5 disabled:opacity-50 transition-all"
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-25 rounded-xl px-4 transition-all duration-150 shadow-sm hover:shadow"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
