from fastapi import APIRouter, HTTPException
from app.database import Neo4jDB

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/centrality", summary="연결 중심성 — 네트워크 허브 인물")
async def get_centrality():
    query = """
    MATCH (p:Person)-[r]-()
    WITH p, COUNT(r) AS degree
    RETURN p.name AS name, p.role AS role, degree
    ORDER BY degree DESC
    """
    return await Neo4jDB.execute_query(query)


@router.get("/betweenness", summary="매개 중심성 — 정보 브로커/연락책 (GDS)")
async def get_betweenness():
    query = """
    CALL gds.betweenness.stream({
        nodeProjection: 'Person',
        relationshipProjection: {
            ALL: { type: '*', orientation: 'UNDIRECTED' }
        }
    })
    YIELD nodeId, score
    RETURN gds.util.asNode(nodeId).name AS name, round(score, 4) AS score
    ORDER BY score DESC
    """
    try:
        return await Neo4jDB.execute_query(query)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"GDS 플러그인이 필요합니다. Neo4j에 graph-data-science 플러그인을 설치하세요. 오류: {e}",
        )


@router.get("/pagerank", summary="PageRank — 영향력 순위 (GDS)")
async def get_pagerank():
    query = """
    CALL gds.pageRank.stream({
        nodeProjection: 'Person',
        relationshipProjection: {
            ALL: { type: '*', orientation: 'UNDIRECTED' }
        }
    })
    YIELD nodeId, score
    RETURN gds.util.asNode(nodeId).name AS name, round(score, 4) AS rank
    ORDER BY rank DESC
    """
    try:
        return await Neo4jDB.execute_query(query)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"GDS 플러그인 오류: {e}",
        )


@router.get("/communities", summary="커뮤니티 탐지 — 조직 구조 파악 (GDS)")
async def detect_communities():
    query = """
    CALL gds.louvain.stream({
        nodeProjection: 'Person',
        relationshipProjection: {
            ALL: { type: '*', orientation: 'UNDIRECTED' }
        }
    })
    YIELD nodeId, communityId
    RETURN gds.util.asNode(nodeId).name AS name, communityId
    ORDER BY communityId
    """
    try:
        return await Neo4jDB.execute_query(query)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"GDS 플러그인 오류: {e}",
        )


@router.get("/path/{from_name}/{to_name}", summary="두 인물 간 최단 경로")
async def find_path(from_name: str, to_name: str):
    query = """
    MATCH path = shortestPath(
        (a:Person {name: $from})-[*]-(b:Person {name: $to})
    )
    RETURN [n IN nodes(path) | n.name] AS path_nodes,
           [r IN relationships(path) | type(r)] AS path_rels,
           length(path) AS hops
    """
    result = await Neo4jDB.execute_query(query, {"from": from_name, "to": to_name})
    if not result:
        raise HTTPException(status_code=404, detail=f"{from_name}과 {to_name} 사이의 경로를 찾을 수 없습니다")
    return result


@router.get("/common-locations", summary="같은 날 같은 장소에 있었던 인물 쌍 — 공모 탐지")
async def find_common_locations():
    query = """
    MATCH (p1:Person)-[r1:WAS_AT]->(l:Location)<-[r2:WAS_AT]-(p2:Person)
    WHERE id(p1) < id(p2)
      AND r1.date = r2.date
    RETURN p1.name AS person1, p2.name AS person2,
           l.name AS location, r1.date AS date,
           r1.time AS time1, r2.time AS time2
    ORDER BY date
    """
    return await Neo4jDB.execute_query(query)


@router.get("/timeline/{person_name}", summary="특정 인물의 시간순 행동 궤적")
async def person_timeline(person_name: str):
    query = """
    MATCH (p:Person {name: $name})-[r]->(target)
    WHERE r.date IS NOT NULL
    RETURN type(r) AS action, target.name AS target,
           r.date AS date, r.time AS time,
           labels(target)[0] AS target_type
    ORDER BY r.date, r.time
    """
    return await Neo4jDB.execute_query(query, {"name": person_name})


@router.get("/suspicious-connections", summary="피해자와 연결된 모든 인물 (2단계)")
async def find_suspicious_connections():
    query = """
    MATCH (victim:Person {role: '피해자'})-[*1..2]-(suspect:Person)
    WHERE victim <> suspect
    WITH victim, suspect,
         shortestPath((victim)-[*]-(suspect)) AS sp
    RETURN victim.name AS victim, suspect.name AS suspect,
           length(sp) AS distance,
           [r IN relationships(sp) | type(r)] AS connection_types
    ORDER BY distance
    """
    return await Neo4jDB.execute_query(query)
