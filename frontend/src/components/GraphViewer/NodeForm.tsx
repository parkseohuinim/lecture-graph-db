"use client";

import { useState } from "react";
import { graphApi } from "@/lib/api";
import { X, Plus, Minus } from "lucide-react";

const LABELS = ["Person", "Location", "Event", "Evidence", "Organization", "Vehicle", "Phone", "Account"];

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function NodeForm({ onClose, onSaved }: Props) {
  const [label, setLabel] = useState("Person");
  const [fields, setFields] = useState([{ key: "name", value: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addField = () => setFields([...fields, { key: "", value: "" }]);
  const removeField = (i: number) => setFields(fields.filter((_, idx) => idx !== i));
  const updateField = (i: number, k: "key" | "value", v: string) => {
    const next = [...fields];
    next[i][k] = v;
    setFields(next);
  };

  const handleSave = async () => {
    const props: Record<string, string> = {};
    for (const f of fields) {
      if (f.key && f.value) props[f.key] = f.value;
    }
    if (Object.keys(props).length === 0) {
      setError("최소 하나의 속성을 입력하세요");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await graphApi.createNode(label, props);
      onSaved();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl animate-fade-in-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-slate-900 text-[15px]">노드 추가</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4">
          <label className="text-[10px] text-slate-400 mb-1.5 block font-semibold uppercase tracking-widest">노드 타입</label>
          <select
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-900/5 transition-all"
          >
            {LABELS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>

        <div className="mb-4 space-y-2">
          <label className="text-[10px] text-slate-400 block font-semibold uppercase tracking-widest">속성</label>
          {fields.map((f, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={f.key}
                onChange={(e) => updateField(i, "key", e.target.value)}
                placeholder="속성명"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-900/5 transition-all"
              />
              <input
                value={f.value}
                onChange={(e) => updateField(i, "value", e.target.value)}
                placeholder="값"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-900/5 transition-all"
              />
              <button onClick={() => removeField(i)} className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                <Minus className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addField}
            className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors py-1"
          >
            <Plus className="w-3 h-3" /> 속성 추가
          </button>
        </div>

        {error && <p className="text-rose-500 text-xs mb-3">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-25 rounded-xl py-2.5 text-sm font-medium transition-all duration-150 shadow-sm"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
