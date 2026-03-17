from fastapi import APIRouter, HTTPException
from app.database import Neo4jDB
from app.models import NodeCreate, RelationshipCreate

router = APIRouter(prefix="/graph", tags=["graph"])

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


@router.post("/nodes", summary="노드 생성 (MERGE)")
async def create_node(node: NodeCreate):
    if not node.properties:
        raise HTTPException(status_code=400, detail="properties는 비어있을 수 없습니다")

    key_prop = LABEL_KEY_MAP.get(node.label)
    if key_prop and key_prop in node.properties:
        extra = {k: v for k, v in node.properties.items() if k != key_prop}
        query = f"MERGE (n:{node.label} {{{key_prop}: ${key_prop}}})"
        if extra:
            set_str = ", ".join(f"n.{k} = ${k}" for k in extra)
            query += f" ON CREATE SET {set_str} ON MATCH SET {set_str}"
        query += " RETURN n"
        result = await Neo4jDB.execute_query(query, node.properties)
    else:
        props_str = ", ".join(f"{k}: ${k}" for k in node.properties)
        query = f"MERGE (n:{node.label} {{{props_str}}}) RETURN n"
        result = await Neo4jDB.execute_query(query, node.properties)
    return {"created": result}


@router.get("/nodes", summary="전체 노드 조회")
async def get_all_nodes():
    query = """
    MATCH (n)
    RETURN elementId(n) AS id, labels(n) AS labels, properties(n) AS props
    ORDER BY elementId(n)
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
    RETURN elementId(n) AS id, labels(n) AS labels, properties(n) AS props
    """
    rels_query = """
    MATCH (a)-[r]->(b)
    RETURN elementId(a) AS source, elementId(b) AS target,
           type(r) AS type, properties(r) AS props
    """
    nodes = await Neo4jDB.execute_query(nodes_query)
    rels = await Neo4jDB.execute_query(rels_query)
    return {"nodes": nodes, "relationships": rels}


@router.delete("/nodes/{node_id}", summary="노드 삭제 (연결 관계 포함)")
async def delete_node(node_id: str):
    query = "MATCH (n) WHERE elementId(n) = $id DETACH DELETE n"
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


@router.get("/duplicates", summary="중복 노드 탐지")
async def find_duplicates():
    results = {}
    for label, key in LABEL_KEY_MAP.items():
        query = f"""
        MATCH (n:{label})
        WHERE n.{key} IS NOT NULL
        WITH n.{key} AS key_val, collect(elementId(n)) AS ids, count(*) AS cnt
        WHERE cnt > 1
        RETURN key_val, ids, cnt
        """
        dups = await Neo4jDB.execute_query(query)
        if dups:
            results[label] = dups
    return results


@router.post("/merge-duplicates", summary="중복 노드 병합 (관계 이전 후 삭제)")
async def merge_duplicates():
    merged = []
    for label, key in LABEL_KEY_MAP.items():
        dup_query = f"""
        MATCH (n:{label})
        WHERE n.{key} IS NOT NULL
        WITH n.{key} AS key_val, collect(elementId(n)) AS ids
        WHERE size(ids) > 1
        RETURN key_val, ids
        """
        dups = await Neo4jDB.execute_query(dup_query)
        for dup in dups:
            key_val = dup["key_val"]
            ids = dup["ids"]
            keeper_id = ids[0]
            other_ids = ids[1:]

            for other_id in other_ids:
                out_rels = await Neo4jDB.execute_query("""
                    MATCH (other)-[r]->(target)
                    WHERE elementId(other) = $other_id
                    RETURN type(r) AS rtype, properties(r) AS rprops, elementId(target) AS target_id
                """, {"other_id": other_id})

                in_rels = await Neo4jDB.execute_query("""
                    MATCH (source)-[r]->(other)
                    WHERE elementId(other) = $other_id
                    RETURN type(r) AS rtype, properties(r) AS rprops, elementId(source) AS source_id
                """, {"other_id": other_id})

                for rel in out_rels:
                    if rel["target_id"] in other_ids:
                        target_ref = f"elementId(t) = $keeper_id"
                        params = {"keeper_id": keeper_id, "props": rel["rprops"]}
                    else:
                        target_ref = f"elementId(t) = $target_id"
                        params = {"keeper_id": keeper_id, "target_id": rel["target_id"], "props": rel["rprops"]}
                    q = f"""
                    MATCH (k) WHERE elementId(k) = $keeper_id
                    MATCH (t) WHERE {target_ref}
                    MERGE (k)-[r:{rel['rtype']}]->(t)
                    SET r += $props
                    """
                    await Neo4jDB.execute_query(q, params)

                for rel in in_rels:
                    if rel["source_id"] in other_ids:
                        continue
                    q = f"""
                    MATCH (s) WHERE elementId(s) = $source_id
                    MATCH (k) WHERE elementId(k) = $keeper_id
                    MERGE (s)-[r:{rel['rtype']}]->(k)
                    SET r += $props
                    """
                    await Neo4jDB.execute_query(q, {
                        "source_id": rel["source_id"],
                        "keeper_id": keeper_id,
                        "props": rel["rprops"],
                    })

                await Neo4jDB.execute_query("""
                    MATCH (keeper) WHERE elementId(keeper) = $keeper_id
                    MATCH (other) WHERE elementId(other) = $other_id
                    SET keeper += properties(other)
                    DETACH DELETE other
                """, {"keeper_id": keeper_id, "other_id": other_id})

            merged.append({"label": label, "key": key_val, "removed": len(other_ids)})
    return {"merged": merged}
