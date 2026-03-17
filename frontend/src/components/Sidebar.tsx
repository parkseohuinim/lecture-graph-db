"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Network, FileSearch, MessageSquare, BarChart3, Shield } from "lucide-react";

const NAV = [
  { href: "/", label: "수사 관계도", icon: Network, desc: "그래프 시각화" },
  { href: "/documents", label: "문서 분석기", icon: FileSearch, desc: "LLM 자동 추출" },
  { href: "/chat", label: "수사 챗", icon: MessageSquare, desc: "자연어 질의" },
  { href: "/analysis", label: "분석 대시보드", icon: BarChart3, desc: "알고리즘 분석" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[232px] bg-white border-r border-slate-200/80 flex flex-col">
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-sm shadow-rose-200">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-slate-900 tracking-tight">Graph DB</p>
            <p className="text-[10px] text-slate-400 font-medium">수사 지식 그래프</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, desc }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-150 ${
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 ${
                active
                  ? "bg-white/15"
                  : "bg-slate-100 group-hover:bg-slate-200/70"
              }`}>
                <Icon className={`w-3.5 h-3.5 ${active ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`} />
              </div>
              <div className="min-w-0">
                <p className="font-medium leading-tight">{label}</p>
                <p className={`text-[10px] mt-0.5 ${active ? "text-slate-400" : "text-slate-400"}`}>{desc}</p>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-3.5 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 tracking-widest uppercase font-medium">Neo4j · GPT-4o</p>
      </div>
    </aside>
  );
}
