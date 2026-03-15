# LLM + Graph DB 수사 지식 그래프

팔란티어 Gotham 스타일 수사 프로파일링 시스템 — Neo4j + FastAPI + Next.js

## 실행 방법

### 사전 준비

- Python 3.13+, uv 설치
- Node.js 18+
- Docker Desktop 실행 중
- OpenAI API Key

### 1단계 — Neo4j 실행 (터미널 1)

```bash
docker compose up
```

- Neo4j Browser: http://localhost:7474 (neo4j / password123)

### 2단계 — 백엔드 실행 (터미널 2)

```bash
cd backend

# 최초 1회: 의존성 설치
uv sync

# .env 파일에 OpenAI API Key 입력
# NEO4J_URI=bolt://localhost:7687
# NEO4J_USER=neo4j
# NEO4J_PASSWORD=password123
# OPENAI_API_KEY=sk-...

uv run run.py
```

- Swagger UI: http://localhost:8000/docs

### 3단계 — 프론트엔드 실행 (터미널 3)

```bash
cd frontend
npm install  # 최초 1회
npm run dev
```

- 앱: http://localhost:3000

---

## 프로젝트 구조

```
investigation-kg/
├── docker-compose.yml          # Neo4j 전용
├── .env.example
├── backend/
│   ├── pyproject.toml
│   ├── .env                    # OPENAI_API_KEY 입력 필요
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── models.py
│       ├── routers/
│       │   ├── graph.py        # 세션 3: CRUD API
│       │   ├── extract.py      # 세션 5: LLM 추출
│       │   ├── ask.py          # 세션 6: Text2Cypher
│       │   ├── analysis.py     # 세션 7: GDS 알고리즘
│       │   └── samples.py      # 샘플 데이터 제공
│       └── prompts/
│           ├── extraction.py
│           └── cypher_gen.py
│   └── data/documents/         # 수사 샘플 문서 9건
└── frontend/
    └── src/
        ├── app/                # Next.js App Router
        ├── components/
        │   ├── GraphViewer/    # 수사 관계도 (세션 3~)
        │   ├── DocumentAnalyzer/ # 문서 분석기 (세션 5)
        │   ├── InvestigationChat/ # 수사 챗 (세션 6)
        │   └── AnalysisDashboard/ # 분석 대시보드 (세션 7~8)
        └── lib/
            ├── api.ts          # API 클라이언트
            └── graphColors.ts  # 노드 색상/아이콘
```

## API 엔드포인트

| 세션 | 메서드 | 경로 | 설명 |
|------|--------|------|------|
| 3 | POST | /graph/nodes | 노드 생성 |
| 3 | GET | /graph/full | 전체 그래프 |
| 3 | DELETE | /graph/all | 초기화 |
| 5 | POST | /extract/analyze | LLM 추출 (미리보기) |
| 5 | POST | /extract/save | 그래프 저장 |
| 6 | POST | /ask/question | 자연어 질의응답 |
| 7 | GET | /analysis/centrality | 연결 중심성 |
| 7 | GET | /analysis/path/{from}/{to} | 최단 경로 |
| 7 | GET | /analysis/common-locations | 공모 탐지 |

## Neo4j 데이터 초기화

강의 중 그래프를 처음 상태로 되돌려야 할 때 사용합니다.

### 방법 1 — API로 초기화 (가장 간단)

```bash
curl -X DELETE http://localhost:8000/graph/all
```

또는 Swagger UI(http://localhost:8000/docs)에서 `DELETE /graph/all` 실행

### 방법 2 — Neo4j Browser에서 초기화

http://localhost:7474 접속 후 아래 Cypher 실행:

```cypher
MATCH (n) DETACH DELETE n
```

### 방법 3 — Docker 볼륨 완전 초기화 (데이터 + 스키마 전부 삭제)

```bash
docker compose down -v   # 컨테이너 + 볼륨 삭제
docker compose up        # 재시작 (완전 초기화 상태)
```

---

## 체크포인트

| # | 세션 | 확인 방법 |
|---|------|-----------|
| ① | 세션 3 | Swagger에서 노드 추가 → 프론트 관계도에 표시 |
| ② | 세션 5 | 샘플 문서 투입 → LLM 추출 → 그래프 성장 |
| ③ | 세션 6 | 자연어 질문 → Cypher → 답변 + 근거 |
