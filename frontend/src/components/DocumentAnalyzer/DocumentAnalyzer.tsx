"use client";

import { useState, useEffect } from "react";
import { extractApi, samplesApi, ExtractedResult, SampleMeta } from "@/lib/api";
import { NODE_ICONS } from "@/lib/graphColors";
import { FileText, Zap, CheckCircle, ChevronDown, ChevronUp, BookOpen } from "lucide-react";

export default function DocumentAnalyzer() {
  const [text, setText] = useState("");
  const [extracted, setExtracted] = useState<ExtractedResult | null>(null);
  const [samples, setSamples] = useState<SampleMeta[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [expandedEntities, setExpandedEntities] = useState(true);

  useEffect(() => {
    samplesApi.list().then(setSamples).catch(() => {});
  }, []);

  const loadSample = async (id: string) => {
    const doc = await samplesApi.get(id);
    setText(doc.content);
    setExtracted(null);
    setSaved(false);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setAnalyzing(true);
    setError("");
    setExtracted(null);
    setSaved(false);
    try {
      const result = await extractApi.analyze(text);
      setExtracted(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!extracted) return;
    setSaving(true);
    try {
      await extractApi.save(extracted);
      setSaved(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-slate-900 tracking-tight">문서 분석기</h1>
            <p className="text-[11px] text-slate-400">수사 보고서 텍스트 → LLM 자동 추출 → 그래프 저장</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 gap-4 min-h-0">
        {/* Samples */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] text-slate-400 mb-2.5 flex items-center gap-1.5 font-semibold uppercase tracking-widest">
            <BookOpen className="w-3 h-3" /> 샘플 수사 문서
          </p>
          <div className="flex flex-wrap gap-2">
            {samples.map((s) => (
              <button
                key={s.id}
                onClick={() => loadSample(s.id)}
                className="text-[11px] bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5 text-slate-500 hover:text-slate-700 transition-all duration-150"
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Input */}
          <div className="flex-1 flex flex-col gap-3">
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setExtracted(null); setSaved(false); }}
              placeholder="수사 보고서, 진술서, 통화 기록 등 텍스트를 입력하세요..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 placeholder-slate-400 resize-none focus:outline-none focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-900/5 transition-all leading-relaxed"
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !text.trim()}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-25 rounded-xl py-3 text-sm font-medium text-white flex items-center justify-center gap-2 transition-all duration-150 shadow-sm hover:shadow"
            >
              <Zap className="w-4 h-4" />
              {analyzing ? "LLM 분석 중..." : "엔티티/관계 추출"}
            </button>
            {error && <p className="text-rose-500 text-xs">{error}</p>}
          </div>

          {/* Results */}
          {extracted && (
            <div className="w-[400px] flex flex-col gap-3 overflow-y-auto animate-fade-in-up">
              {/* Entities */}
              <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setExpandedEntities(!expandedEntities)}
                  className="w-full flex items-center justify-between p-3.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span>엔티티 ({extracted.entities.length})</span>
                  {expandedEntities ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {expandedEntities && (
                  <div className="divide-y divide-slate-100">
                    {extracted.entities.map((e, i) => (
                      <div key={i} className="p-3.5 flex items-start gap-2.5 hover:bg-slate-50/70 transition-colors">
                        <span className="text-lg mt-0.5">{NODE_ICONS[e.label] || "🔵"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{e.label}</span>
                            <span className="text-[10px] text-emerald-600 font-semibold">{Math.round(e.confidence * 100)}%</span>
                          </div>
                          <div className="text-[12px] text-slate-600 mt-0.5">
                            {Object.entries(e.properties).map(([k, v]) => (
                              <span key={k} className="mr-2.5">
                                <span className="text-slate-400">{k}:</span> {String(v)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Relations */}
              <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
                <div className="p-3.5 text-[13px] font-semibold text-slate-700 border-b border-slate-100">
                  관계 ({extracted.relationships.length})
                </div>
                <div className="divide-y divide-slate-100">
                  {extracted.relationships.map((r, i) => (
                    <div key={i} className="p-3.5 text-xs hover:bg-slate-50/70 transition-colors">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 text-slate-600 text-[11px] font-medium">{r.from_node.value}</span>
                        <span className="text-rose-500 font-mono text-[11px] font-medium">→[{r.type}]→</span>
                        <span className="bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 text-slate-600 text-[11px] font-medium">{r.to_node.value}</span>
                      </div>
                      {r.properties && Object.keys(r.properties).length > 0 && (
                        <div className="mt-1.5 text-slate-400 text-[11px]">
                          {Object.entries(r.properties).map(([k, v]) => `${k}: ${v}`).join(", ")}
                        </div>
                      )}
                      <span className="text-emerald-600 text-[10px] font-semibold">{Math.round(r.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className={`rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all duration-150 ${
                  saved
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-600"
                    : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-25 shadow-sm hover:shadow"
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                {saved ? "그래프에 저장됨!" : saving ? "저장 중..." : "그래프에 저장"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
