import json
from fastapi import APIRouter, HTTPException
from app.config import openai_client
from app.database import Neo4jDB
from app.models import TextInput, BatchInput, ExtractedData, ExtractedNode, ExtractedRelationship
from app.prompts.extraction import EXTRACTION_SYSTEM_PROMPT

router = APIRouter(prefix="/extract", tags=["extraction"])


async def _call_llm(text: str) -> dict:
    response = await openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
    )
    return json.loads(response.choices[0].message.content)


LABEL_KEY_MAP = {
    "Person": "name",
    "Location": "name",
    "Vehicle": "plate",
    "Phone": "number",
    "Account": "number",
    "Organization": "name",
    "Event": "type",
    "Evidence": "type",
}


async def _save_to_graph(data: dict) -> dict:
    saved_entities = []
    saved_rels = []

    for entity in data.get("entities", []):
        props = entity["properties"]
        if not props:
            continue
        label = entity["label"]
        key_prop = LABEL_KEY_MAP.get(label)

        if key_prop and key_prop in props:
            extra = {k: v for k, v in props.items() if k != key_prop}
            query = f"MERGE (n:{label} {{{key_prop}: ${key_prop}}})"
            if extra:
                set_str = ", ".join(f"n.{k} = ${k}" for k in extra)
                query += f" ON CREATE SET {set_str} ON MATCH SET {set_str}"
            query += " RETURN n"
        else:
            prop_str = ", ".join(f"{k}: ${k}" for k in props)
            query = f"MERGE (n:{label} {{{prop_str}}}) RETURN n"

        await Neo4jDB.execute_query(query, props)
        saved_entities.append(f"{label}: {list(props.values())[0]}")

    for rel in data.get("relationships", []):
        fn = rel["from_node"]
        tn = rel["to_node"]
        query = f"""
        MATCH (a:{fn['label']} {{{fn['key']}: $from_val}})
        MATCH (b:{tn['label']} {{{tn['key']}: $to_val}})
        MERGE (a)-[r:{rel['type']}]->(b)
        SET r += $props
        RETURN type(r) AS type
        """
        params = {
            "from_val": fn["value"],
            "to_val": tn["value"],
            "props": rel.get("properties") or {},
        }
        await Neo4jDB.execute_query(query, params)
        saved_rels.append(f"{fn['value']} -[{rel['type']}]-> {tn['value']}")

    return {"saved_entities": saved_entities, "saved_relationships": saved_rels}


@router.post("/analyze", summary="텍스트 → 엔티티/관계 추출 (미리보기)")
async def analyze_text(request: TextInput):
    """LLM으로 추출만 하고 저장하지 않음. 프론트에서 미리보기로 표시."""
    try:
        extracted = await _call_llm(request.text)
        return extracted
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM 추출 실패: {e}")


@router.post("/save", summary="추출 결과를 그래프에 저장")
async def save_extracted(data: ExtractedData):
    """프론트에서 미리보기 확인 후 승인하면 저장."""
    try:
        result = await _save_to_graph(data.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"저장 실패: {e}")


@router.post("/analyze-and-save", summary="텍스트 추출 + 즉시 저장")
async def analyze_and_save(request: TextInput):
    """추출과 저장을 한 번에 처리."""
    try:
        extracted = await _call_llm(request.text)
        saved = await _save_to_graph(extracted)
        return {"extracted": extracted, "saved": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"처리 실패: {e}")


@router.post("/batch", summary="여러 문서 일괄 처리")
async def batch_extract(request: BatchInput):
    """여러 문서를 순차 처리. auto_save=True이면 자동 저장."""
    results = []
    for doc in request.documents:
        try:
            extracted = await _call_llm(doc.text)
            saved = None
            if request.auto_save:
                saved = await _save_to_graph(extracted)
            results.append({
                "doc_id": doc.id,
                "status": "success",
                "extracted": extracted,
                "saved": saved,
            })
        except Exception as e:
            results.append({
                "doc_id": doc.id,
                "status": "error",
                "error": str(e),
            })
    return {"results": results, "total": len(results)}
