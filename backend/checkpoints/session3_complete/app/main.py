from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Neo4jDB
from app.routers import graph


@asynccontextmanager
async def lifespan(app: FastAPI):
    await Neo4jDB.verify_connection()
    print("✅ Neo4j 연결 성공")
    yield
    await Neo4jDB.close()
    print("Neo4j 연결 종료")


app = FastAPI(
    title="수사 지식 그래프 API",
    description="LLM + Neo4j 기반 수사 프로파일링 시스템",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(graph.router)


@app.get("/health")
async def health():
    return {"status": "ok", "message": "수사 지식 그래프 API 정상 동작 중"}
