"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { graphApi, GraphNode, GraphRel } from "@/lib/api";
import { getNodeColor, getNodeName, NODE_ICONS } from "@/lib/graphColors";
import NodePanel from "./NodePanel";
import NodeForm from "./NodeForm";
import { RefreshCw, Plus, Trash2 } from "lucide-react";
import type { ForceGraphMethods } from "react-force-graph-2d";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface FGNode {
  id: string;
  name: string;
  label: string;
  color: string;
  props: Record<string, unknown>;
}

interface FGLink {
  source: string;
  target: string;
  type: string;
  props: Record<string, unknown>;
}

export default function GraphViewer() {
  const [nodes, setNodes] = useState<FGNode[]>([]);
  const [links, setLinks] = useState<FGLink[]>([]);
  const [stats, setStats] = useState({ node_count: 0, rel_count: 0 });
  const [selected, setSelected] = useState<FGNode | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [graph, s] = await Promise.all([graphApi.getFull(), graphApi.getStats()]);
      setNodes(
        graph.nodes.map((n: GraphNode) => ({
          id: n.id,
          name: getNodeName(n.props),
          label: n.labels[0] || "Unknown",
          color: getNodeColor(n.labels),
          props: n.props,
        }))
      );
      setLinks(
        graph.relationships.map((r: GraphRel) => ({
          source: r.source,
          target: r.target,
          type: r.type,
          props: r.props,
        }))
      );
      setStats(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleClear = async () => {
    if (!confirm("전체 그래프를 초기화하시겠습니까?")) return;
    await graphApi.clearAll();
    load();
  };

  return (
    <div className="flex h-full bg-white">
      <div className="flex-1 relative">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] shadow-sm">
            <span className="text-slate-400">노드 </span>
            <span className="text-slate-900 font-bold">{stats.node_count}</span>
            <span className="text-slate-200 mx-2">|</span>
            <span className="text-slate-400">관계 </span>
            <span className="text-slate-900 font-bold">{stats.rel_count}</span>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-2.5 hover:bg-slate-50 transition-all duration-150 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-3.5 py-2.5 text-[12px] font-medium flex items-center gap-1.5 transition-all duration-150 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> 노드 추가
          </button>
          <button
            onClick={handleClear}
            className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-2.5 hover:bg-rose-50 hover:border-rose-200 transition-all duration-150 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <p className="text-[10px] text-slate-400 mb-2 font-semibold uppercase tracking-widest">노드 타입</p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-1.5">
            {Object.entries(NODE_ICONS).map(([label, icon]) => (
              <div key={label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {nodes.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[15px] mb-2 text-slate-400 font-medium">그래프가 비어있습니다</p>
              <p className="text-[12px] text-slate-400">노드를 추가하거나 문서를 분석해보세요</p>
            </div>
          </div>
        )}

        <ForceGraph2D
          ref={fgRef}
          graphData={{ nodes, links }}
          nodeId="id"
          nodeLabel={(n) => {
            const node = n as FGNode;
            return `${node.label}: ${node.name}`;
          }}
          nodeColor={(n) => (n as FGNode).color}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const n = node as FGNode & { x: number; y: number };
            const r = 6;

            ctx.shadowColor = n.color;
            ctx.shadowBlur = selected?.id === n.id ? 12 : 4;
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
            ctx.fillStyle = n.color;
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.strokeStyle = selected?.id === n.id ? "#0f172a" : "rgba(255,255,255,0.8)";
            ctx.lineWidth = selected?.id === n.id ? 2.5 : 1;
            ctx.stroke();

            const label = n.name;
            const fontSize = Math.max(10 / globalScale, 3);
            ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
            ctx.fillStyle = "#334155";
            ctx.textAlign = "center";
            ctx.fillText(label, n.x, n.y + r + fontSize);
          }}
          linkLabel={(l) => (l as FGLink).type}
          linkColor={() => "rgba(148,163,184,0.4)"}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          linkCanvasObjectMode={() => "after"}
          linkCanvasObject={(link, ctx) => {
            const l = link as FGLink & { source: { x: number; y: number }; target: { x: number; y: number } };
            if (!l.source?.x) return;
            const mx = (l.source.x + l.target.x) / 2;
            const my = (l.source.y + l.target.y) / 2;
            ctx.font = "3px system-ui, sans-serif";
            ctx.fillStyle = "rgba(100,116,139,0.7)";
            ctx.textAlign = "center";
            ctx.fillText(l.type, mx, my);
          }}
          onNodeClick={(n) => setSelected(n as FGNode)}
          backgroundColor="#ffffff"
          width={typeof window !== "undefined" ? window.innerWidth - 232 - (selected ? 340 : 0) : 800}
        />
      </div>

      {selected && (
        <NodePanel
          node={selected}
          onClose={() => setSelected(null)}
          onDelete={async () => {
            await graphApi.deleteNode(selected.id);
            setSelected(null);
            load();
          }}
        />
      )}

      {showForm && (
        <NodeForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}
