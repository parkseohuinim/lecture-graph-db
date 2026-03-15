from fastapi import APIRouter, HTTPException
from app.database import Neo4jDB
from app.models import NodeCreate, RelationshipCreate

router = APIRouter(prefix="/graph", tags=["graph"])


@router.post("/nodes", summary="노드 생성 (MERGE)")
async def create_node(node: NodeCreate):
    if not node.properties:
        raise HTTPException(status_code=400, detail="properties는 비어있을 수 없습니다")

    props_str = ", ".join(f"{k}: ${k}" for k in node.properties)
    query = f"MERGE (n:{node.label} {{{props_str}}}) RETURN n"
    result = await Neo4jDB.execute_query(query, node.properties)
    return {"created": result}


@router.get("/nodes", summary="전체 노드 조회")
async def get_all_nodes():
    query = """
    MATCH (n)
    RETURN id(n) AS id, labels(n) AS labels, properties(n) AS props
    ORDER BY id(n)
    """
    return await Neo4jDB.execute_query(query)


@router.post("/relationships", summary="관계 생성 (MERGE)")
async def create_relationship(rel: RelationshipCreate):
    query = f"""
    MATCH (a:{rel.from_label} {{{rel.from_key}: $from_val}})
    MATCH (b:{rel.to_label} {{{rel.to_key}: $to_val}})
    MERGE (a)-[r:{rel.rel_type}]->(b)
    SET r += $props
    RETURN type(r) AS type, properties(r) AS props
    """
    params = {
        "from_val": rel.from_value,
        "to_val": rel.to_value,
        "props": rel.properties or {},
    }
    result = await Neo4jDB.execute_query(query, params)
    if not result:
        raise HTTPException(status_code=404, detail="노드를 찾을 수 없습니다")
    return {"created": result}


@router.get("/full", summary="전체 그래프 (프론트 시각화용)")
async def get_full_graph():
    nodes_query = """
    MATCH (n)
    RETURN id(n) AS id, labels(n) AS labels, properties(n) AS props
    """
    rels_query = """
    MATCH (a)-[r]->(b)
    RETURN id(a) AS source, id(b) AS target,
           type(r) AS type, properties(r) AS props
    """
    nodes = await Neo4jDB.execute_query(nodes_query)
    rels = await Neo4jDB.execute_query(rels_query)
    return {"nodes": nodes, "relationships": rels}


@router.delete("/nodes/{node_id}", summary="노드 삭제 (연결 관계 포함)")
async def delete_node(node_id: int):
    query = "MATCH (n) WHERE id(n) = $id DETACH DELETE n"
    await Neo4jDB.execute_query(query, {"id": node_id})
    return {"deleted": node_id}


@router.delete("/all", summary="전체 그래프 초기화")
async def clear_graph():
    await Neo4jDB.execute_query("MATCH (n) DETACH DELETE n")
    return {"message": "전체 그래프 초기화 완료"}


@router.get("/stats", summary="그래프 통계")
async def get_stats():
    query = """
    MATCH (n)
    WITH count(n) AS node_count
    MATCH ()-[r]->()
    RETURN node_count, count(r) AS rel_count
    """
    result = await Neo4jDB.execute_query(query)
    return result[0] if result else {"node_count": 0, "rel_count": 0}
