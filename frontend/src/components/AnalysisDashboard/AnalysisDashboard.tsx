"use client";

import { useState, useEffect } from "react";
import { analysisApi, CentralityRow, CommonLocationRow, TimelineRow, PathResult } from "@/lib/api";
import { BarChart3, Users, MapPin, Clock, GitBranch, Search } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

type Tab = "centrality" | "common-locations" | "timeline" | "path";

export default function AnalysisDashboard() {
  const [tab, setTab] = useState<Tab>("centrality");
  const [centrality, setCentrality] = useState<CentralityRow[]>([]);
  const [commonLocations, setCommonLocations] = useState<CommonLocationRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [pathResult, setPathResult] = useState<PathResult[]>([]);
  const [personName, setPersonName] = useState("");
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tab === "centrality") loadCentrality();
    if (tab === "common-locations") loadCommonLocations();
  }, [tab]);

  const loadCentrality = async () => {
    setLoading(true);
    try { setCentrality(await analysisApi.getCentrality()); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  };

  const loadCommonLocations = async () => {
    setLoading(true);
    try { setCommonLocations(await analysisApi.getCommonLocations()); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  };

  const loadTimeline = async () => {
    if (!personName.trim()) return;
    setLoading(true);
    setError("");
    try { setTimeline(await analysisApi.getTimeline(personName)); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  };

  const loadPath = async () => {
    if (!fromName.trim() || !toName.trim()) return;
    setLoading(true);
    setError("");
    try { setPathResult(await analysisApi.findPath(fromName, toName)); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  };

  const TABS = [
    { id: "centrality" as Tab, label: "중심성 분석", icon: BarChart3 },
    { id: "common-locations" as Tab, label: "공모 탐지", icon: MapPin },
    { id: "timeline" as Tab, label: "행동 궤적", icon: Clock },
    { id: "path" as Tab, label: "경로 탐색", icon: GitBranch },
  ];

  const COLORS = ["#0f172a", "#334155", "#64748b", "#94a3b8", "#e11d48", "#2563eb", "#059669", "#d97706"];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-slate-900 tracking-tight">분석 대시보드</h1>
            <p className="text-[11px] text-slate-400">그래프 알고리즘 기반 수사 분석</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 gap-4 min-h-0">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setError(""); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all duration-150 ${
                tab === id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {error && <p className="text-rose-500 text-xs bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex-1 overflow-y-auto">
          {/* Centrality */}
          {tab === "centrality" && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
                <h2 className="text-[13px] font-semibold text-slate-700 mb-5 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" /> 연결 중심성 — 네트워크 허브 인물
                </h2>
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="w-40 h-3 rounded-full animate-shimmer" />
                  </div>
                ) : centrality.length === 0 ? (
                  <p className="text-slate-400 text-sm py-8 text-center">데이터가 없습니다. 먼저 수사 문서를 분석하세요.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={centrality} layout="vertical" margin={{ left: 60, right: 16 }}>
                      <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                      <YAxis dataKey="name" type="category" tick={{ fill: "#334155", fontSize: 12, fontWeight: 500 }} width={60} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                        labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                        cursor={{ fill: "rgba(241,245,249,0.6)" }}
                      />
                      <Bar dataKey="degree" name="관계 수" radius={[0, 6, 6, 0]}>
                        {centrality.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {centrality.length > 0 && (
                <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left p-3.5 text-[10px] text-slate-400 font-semibold uppercase tracking-widest">순위</th>
                        <th className="text-left p-3.5 text-[10px] text-slate-400 font-semibold uppercase tracking-widest">이름</th>
                        <th className="text-left p-3.5 text-[10px] text-slate-400 font-semibold uppercase tracking-widest">역할</th>
                        <th className="text-right p-3.5 text-[10px] text-slate-400 font-semibold uppercase tracking-widest">관계 수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {centrality.map((row, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 text-slate-400 text-[12px]">#{i + 1}</td>
                          <td className="p-3.5 text-slate-900 font-semibold text-[13px]">{row.name}</td>
                          <td className="p-3.5 text-slate-500 text-[12px]">{row.role || "—"}</td>
                          <td className="p-3.5 text-right">
                            <span className="bg-slate-100 text-slate-700 rounded-md px-2 py-0.5 text-[12px] font-semibold">{row.degree}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Common locations */}
          {tab === "common-locations" && (
            <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm animate-fade-in-up">
              <div className="p-4 border-b border-slate-100">
                <h2 className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" /> 같은 날 같은 장소에 있었던 인물 쌍
                </h2>
              </div>
              {loading ? (
                <div className="p-8 flex justify-center"><div className="w-40 h-3 rounded-full animate-shimmer" /></div>
              ) : commonLocations.length === 0 ? (
                <p className="p-8 text-slate-400 text-sm text-center">공모 가능성 있는 인물 쌍이 없습니다.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left p-3.5 text-[10px] text-slate-400 font-semibold uppercase tracking-widest">인물 1</th>
                      <th className="text-left p-3.5 text-[10px] text-slate-400 font-semibold uppercase tracking-widest">인물 2</th>
                      <th className="text-left p-3.5 text-[10px] text-slate-400 font-semibold uppercase tracking-widest">장소</th>
                      <th className="text-left p-3.5 text-[10px] text-slate-400 font-semibold uppercase tracking-widest">날짜</th>
                      <th className="text-left p-3.5 text-[10px] text-slate-400 font-semibold uppercase tracking-widest">시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commonLocations.map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 text-slate-900 font-medium text-[13px]">{row.person1}</td>
                        <td className="p-3.5 text-slate-900 font-medium text-[13px]">{row.person2}</td>
                        <td className="p-3.5 text-blue-600 text-[12px] font-medium">{row.location}</td>
                        <td className="p-3.5 text-slate-500 text-[12px]">{row.date}</td>
                        <td className="p-3.5 text-slate-500 text-[12px]">{row.time1} / {row.time2}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Timeline */}
          {tab === "timeline" && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadTimeline()}
                    placeholder="인물 이름 (예: 김철수)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-900/5 transition-all"
                  />
                </div>
                <button
                  onClick={loadTimeline}
                  disabled={loading}
                  className="bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-25 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-150 shadow-sm"
                >
                  조회
                </button>
              </div>

              {timeline.length > 0 && (
                <div className="relative pl-8">
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-slate-300 via-slate-200 to-transparent" />
                  {timeline.map((row, i) => (
                    <div key={i} className="relative mb-3">
                      <div className="absolute -left-5 top-3 w-2.5 h-2.5 rounded-full bg-slate-900 ring-4 ring-white" />
                      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm hover:shadow transition-shadow">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] text-slate-400 font-mono">{row.date} {row.time}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 rounded-md px-1.5 py-0.5 font-semibold">{row.action}</span>
                        </div>
                        <p className="text-[13px] text-slate-700">
                          → <span className="text-blue-600 font-medium">{row.target}</span>
                          <span className="text-slate-400 ml-1.5 text-[11px]">({row.target_type})</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Path */}
          {tab === "path" && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex gap-2.5 items-center">
                <input
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="시작 인물"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-900/5 transition-all"
                />
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                  <span className="text-slate-400 text-xs font-medium">→</span>
                </div>
                <input
                  value={toName}
                  onChange={(e) => setToName(e.target.value)}
                  placeholder="도착 인물"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-900/5 transition-all"
                />
                <button
                  onClick={loadPath}
                  disabled={loading}
                  className="bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-25 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-150 shadow-sm"
                >
                  탐색
                </button>
              </div>

              {pathResult.length > 0 && pathResult.map((r, i) => (
                <div key={i} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
                  <p className="text-[11px] text-slate-400 mb-4 font-semibold">{r.hops}단계 연결</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.path_nodes.map((node, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <span className="bg-slate-900 text-white rounded-lg px-3.5 py-2 text-[13px] font-medium shadow-sm">
                          {node}
                        </span>
                        {j < r.path_rels.length && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <span className="text-slate-300">—</span>
                            <span className="bg-rose-50 text-rose-600 border border-rose-200 rounded-md px-2 py-0.5 font-semibold">{r.path_rels[j]}</span>
                            <span className="text-slate-300">—</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
