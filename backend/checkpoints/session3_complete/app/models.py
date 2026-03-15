from pydantic import BaseModel
from typing import Optional


# ── 그래프 CRUD (세션 3) ──────────────────────────────────────────────────────

class NodeCreate(BaseModel):
    label: str          # Person | Location | Event | Evidence | Organization | Vehicle | Phone | Account
    properties: dict    # {"name": "김철수", "age": 35, ...}


class RelationshipCreate(BaseModel):
    from_label: str
    from_key: str       # 매칭 속성명 (보통 "name")
    from_value: str
    to_label: str
    to_key: str
    to_value: str
    rel_type: str       # KNOWS | WAS_AT | OWNS | ...
    properties: Optional[dict] = {}


class GraphResponse(BaseModel):
    nodes: list
    relationships: list


# ── LLM 추출 (세션 5) ─────────────────────────────────────────────────────────

class TextInput(BaseModel):
    text: str


class BatchDocument(BaseModel):
    id: str
    text: str


class BatchInput(BaseModel):
    documents: list[BatchDocument]
    auto_save: bool = False


class ExtractedNode(BaseModel):
    label: str
    properties: dict
    confidence: float = 1.0


class ExtractedRelationshipEndpoint(BaseModel):
    label: str
    key: str
    value: str


class ExtractedRelationship(BaseModel):
    from_node: ExtractedRelationshipEndpoint
    to_node: ExtractedRelationshipEndpoint
    type: str
    properties: Optional[dict] = {}
    confidence: float = 1.0


class ExtractedData(BaseModel):
    entities: list[ExtractedNode] = []
    relationships: list[ExtractedRelationship] = []


# ── 질의응답 (세션 6) ─────────────────────────────────────────────────────────

class QuestionInput(BaseModel):
    question: str
