const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API 오류");
  }
  return res.json();
}

// ── Graph ────────────────────────────────────────────────────────────────────

export const graphApi = {
  getFull: () => request<{ nodes: GraphNode[]; relationships: GraphRel[] }>("/graph/full"),
  getStats: () => request<{ node_count: number; rel_count: number }>("/graph/stats"),
  createNode: (label: string, properties: Record<string, unknown>) =>
    request("/graph/nodes", { method: "POST", body: JSON.stringify({ label, properties }) }),
  createRelationship: (data: RelCreate) =>
    request("/graph/relationships", { method: "POST", body: JSON.stringify(data) }),
  deleteNode: (id: string) => request(`/graph/nodes/${encodeURIComponent(id)}`, { method: "DELETE" }),
  clearAll: () => request("/graph/all", { method: "DELETE" }),
};

// ── Extract ──────────────────────────────────────────────────────────────────

export const extractApi = {
  analyze: (text: string) =>
    request<ExtractedResult>("/extract/analyze", { method: "POST", body: JSON.stringify({ text }) }),
  save: (data: ExtractedResult) =>
    request("/extract/save", { method: "POST", body: JSON.stringify(data) }),
  analyzeAndSave: (text: string) =>
    request("/extract/analyze-and-save", { method: "POST", body: JSON.stringify({ text }) }),
};

// ── Ask ──────────────────────────────────────────────────────────────────────

export const askApi = {
  question: (question: string) =>
    request<QAResponse>("/ask/question", { method: "POST", body: JSON.stringify({ question }) }),
  getSchema: () => request<{ schema: string }>("/ask/schema"),
};

// ── Analysis ─────────────────────────────────────────────────────────────────

export const analysisApi = {
  getCentrality: () => request<CentralityRow[]>("/analysis/centrality"),
  getBetweenness: () => request<BetweennessRow[]>("/analysis/betweenness"),
  getPagerank: () => request<PageRankRow[]>("/analysis/pagerank"),
  getCommunities: () => request<CommunityRow[]>("/analysis/communities"),
  findPath: (from: string, to: string) =>
    request<PathResult[]>(`/analysis/path/${encodeURIComponent(from)}/${encodeURIComponent(to)}`),
  getCommonLocations: () => request<CommonLocationRow[]>("/analysis/common-locations"),
  getTimeline: (name: string) =>
    request<TimelineRow[]>(`/analysis/timeline/${encodeURIComponent(name)}`),
};

// ── Samples ───────────────────────────────────────────────────────────────────

export const samplesApi = {
  list: () => request<SampleMeta[]>("/samples/"),
  get: (id: string) => request<SampleDoc>(`/samples/${id}`),
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  labels: string[];
  props: Record<string, unknown>;
}

export interface GraphRel {
  source: string;
  target: string;
  type: string;
  props: Record<string, unknown>;
}

export interface RelCreate {
  from_label: string;
  from_key: string;
  from_value: string;
  to_label: string;
  to_key: string;
  to_value: string;
  rel_type: string;
  properties?: Record<string, unknown>;
}

export interface ExtractedNode {
  label: string;
  properties: Record<string, unknown>;
  confidence: number;
}

export interface ExtractedRel {
  from_node: { label: string; key: string; value: string };
  to_node: { label: string; key: string; value: string };
  type: string;
  properties: Record<string, unknown>;
  confidence: number;
}

export interface ExtractedResult {
  entities: ExtractedNode[];
  relationships: ExtractedRel[];
}

export interface QAResponse {
  answer: string;
  cypher_used: string;
  raw_results: Record<string, unknown>[];
  evidence_subgraph: { nodes: GraphNode[]; relationships: GraphRel[] };
}

export interface CentralityRow { name: string; role: string; degree: number }
export interface BetweennessRow { name: string; score: number }
export interface PageRankRow { name: string; rank: number }
export interface CommunityRow { name: string; communityId: number }
export interface PathResult { path_nodes: string[]; path_rels: string[]; hops: number }
export interface CommonLocationRow {
  person1: string; person2: string; location: string;
  date: string; time1: string; time2: string;
}
export interface TimelineRow {
  action: string; target: string; date: string; time: string; target_type: string;
}
export interface SampleMeta { id: string; title: string; filename: string; session: number }
export interface SampleDoc extends SampleMeta { content: string }
