"use client";

import { X, Trash2 } from "lucide-react";
import { NODE_ICONS } from "@/lib/graphColors";

interface FGNode {
  id: string;
  name: string;
  label: string;
  color: string;
  props: Record<string, unknown>;
}

interface Props {
  node: FGNode;
  onClose: () => void;
  onDelete: () => void;
}

export default function NodePanel({ node, onClose, onDelete }: Props) {
  return (
    <div className="w-[340px] bg-white border-l border-slate-200/80 p-5 overflow-y-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="text-xl">{NODE_ICONS[node.label] || "🔵"}</span>
          <div>
            <p className="font-bold text-slate-900 text-[15px]">{node.name}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{node.label}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 mb-6">
        {Object.entries(node.props).map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm bg-slate-50 rounded-lg px-3 py-2.5">
            <span className="text-slate-400 text-[12px]">{k}</span>
            <span className="text-slate-700 text-right max-w-[180px] break-words text-[12px] font-medium">{String(v)}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onDelete}
        className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded-xl py-2.5 text-[13px] text-rose-600 font-medium transition-all duration-150"
      >
        <Trash2 className="w-3.5 h-3.5" /> 노드 삭제
      </button>
    </div>
  );
}
