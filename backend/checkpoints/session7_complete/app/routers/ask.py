import json
from fastapi import APIRouter, HTTPException
from app.config import openai_client
from app.database import Neo4jDB
from app.models import QuestionInput
from app.prompts.cypher_gen import CYPHER_GENERATION_PROMPT, ANSWER_GENERATION_PROMPT

router = APIRouter(prefix="/ask", tags=["qa"])


async def get_graph_schema() -> str:
    labels_result = await Neo4jDB.execute_query(
        "CALL db.labels() YIELD label RETURN collect(label) AS labels"
    )
    rel_types_result = await Neo4jDB.execute_query(
        "CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) AS types"
    )
    props_result = await Neo4jDB.execute_query("""
        MATCH (n)
        WITH labels(n) AS lbls, keys(n) AS ks
        UNWIND lbls AS label
        UNWIND ks AS key
        RETURN label, collect(DISTINCT key) AS properties
        LIMIT 50
    """)

    labels = labels_result[0]["labels"] if labels_result else []
    rel_types = rel_types_result[0]["types"] if rel_types_result else []

    props_by_label = {}
    for row in props_result:
        props_by_label[row["label"]] = row["properties"]

    lines = ["### 노드 타입"]
    for label in labels:
        props = props_by_label.get(label, [])
        lines.append(f"- {label}: {', '.join(props)}")

    lines.append("\n### 관계 타입")
    for rt in rel_types:
        lines.append(f"- {rt}")

    return "\n".join(lines)


async def generate_cypher(question: str, schema: str, retry_error: str = None) -> str:
    prompt = CYPHER_GENERATION_PROMPT.format(schema=schema, question=question)
    if retry_error:
        prompt += f"\n\n이전 시도에서 오류 발생: {retry_error}\n수정된 Cypher:"

    response = await openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
    )
    cypher = response.choices[0].message.content.strip()
    # 마크다운 코드블록 제거
    if cypher.startswith("```"):
        lines = cypher.split("\n")
        cypher = "\n".join(lines[1:-1]) if len(lines) > 2 else cypher
    return cypher


async def extract_relevant_subgraph(results: list) -> dict:
    """답변에 등장한 이름으로 관련 서브그래프 추출"""
    names = set()
    for row in results:
        for val in row.values():
            if isinstance(val, str):
                names.add(val)
            elif isinstance(val, list):
                for v in val:
                    if isinstance(v, str):
                        names.add(v)

    if not names:
        return {"nodes": [], "relationships": []}

    name_list = list(names)[:10]
    nodes_query = """
    MATCH (n)
    WHERE any(name IN $names WHERE n.name = name OR n.number = name OR n.plate = name)
    RETURN id(n) AS id, labels(n) AS labels, properties(n) AS props
    """
    rels_query = """
    MATCH (a)-[r]->(b)
    WHERE any(name IN $names WHERE a.name = name OR b.name = name)
    RETURN id(a) AS source, id(b) AS target,
           type(r) AS type, properties(r) AS props
    """
    nodes = await Neo4jDB.execute_query(nodes_query, {"names": name_list})
    rels = await Neo4jDB.execute_query(rels_query, {"names": name_list})
    return {"nodes": nodes, "relationships": rels}


@router.post("/question", summary="자연어 질문 → Cypher → 답변")
async def ask_question(request: QuestionInput):
    schema = await get_graph_schema()
    cypher = await generate_cypher(request.question, schema)

    results = []
    last_error = None
    for attempt in range(3):
        try:
            results = await Neo4jDB.execute_query(cypher)
            last_error = None
            break
        except Exception as e:
            last_error = str(e)
            if attempt < 2:
                cypher = await generate_cypher(request.question, schema, retry_error=last_error)

    if last_error:
        raise HTTPException(
            status_code=422,
            detail={"message": "Cypher 생성 실패", "error": last_error, "cypher_attempted": cypher},
        )

    answer_prompt = ANSWER_GENERATION_PROMPT.format(
        question=request.question,
        cypher=cypher,
        query_result=json.dumps(results, ensure_ascii=False),
    )
    answer_response = await openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": answer_prompt}],
        temperature=0.3,
    )
    answer = answer_response.choices[0].message.content

    subgraph = await extract_relevant_subgraph(results)

    return {
        "answer": answer,
        "cypher_used": cypher,
        "raw_results": results,
        "evidence_subgraph": subgraph,
    }


@router.get("/schema", summary="현재 그래프 스키마 조회")
async def get_schema():
    schema = await get_graph_schema()
    return {"schema": schema}
