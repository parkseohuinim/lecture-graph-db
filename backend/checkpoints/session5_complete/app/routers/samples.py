import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/samples", tags=["samples"])

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "documents"


@router.get("/", summary="샘플 문서 목록")
async def list_samples():
    index_path = DATA_DIR / "index.json"
    with open(index_path, encoding="utf-8") as f:
        return json.load(f)


@router.get("/{doc_id}", summary="샘플 문서 내용 조회")
async def get_sample(doc_id: str):
    index_path = DATA_DIR / "index.json"
    with open(index_path, encoding="utf-8") as f:
        index = json.load(f)

    doc_meta = next((d for d in index if d["id"] == doc_id), None)
    if not doc_meta:
        raise HTTPException(status_code=404, detail=f"문서 {doc_id}를 찾을 수 없습니다")

    file_path = DATA_DIR / doc_meta["filename"]
    with open(file_path, encoding="utf-8") as f:
        content = f.read()

    return {**doc_meta, "content": content}
