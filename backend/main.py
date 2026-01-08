"""FastAPI 서버 - T-Graph 데이터 제공"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from github_client import fetch_repo_data
from transformer import transform_to_tgraph
from config import GITHUB_TOKEN

app = FastAPI(title="T-Graph GitHub API")

# React 개발 서버 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite 기본 포트
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health():
    return {"status": "ok", "token_configured": bool(GITHUB_TOKEN)}

@app.get("/api/tgraph/{owner}/{repo}")
async def get_tgraph(owner: str, repo: str, limit: int = 10):
    """GitHub 레포지토리의 T-Graph 데이터 반환"""
    if not GITHUB_TOKEN:
        raise HTTPException(status_code=500, detail="GITHUB_TOKEN not configured")
    
    try:
        raw = await fetch_repo_data(owner, repo, first=limit)
        
        if "errors" in raw:
            raise HTTPException(status_code=400, detail=raw["errors"])
        
        return transform_to_tgraph(raw)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 토큰 없이 테스트용 더미 데이터
@app.get("/api/demo")
def demo_data():
    """다원과 규민의 협업 시나리오 데모 데이터"""
    return {
        "nodes": [
            # t1: 다원의 초기 세팅 (과거: 1704100000)
            {"id": "user-dawon", "type": "contributor", "label": "다원", "title": "Initial Creator", "z": 1704100000, "author": "dawon"},
            {"id": "file-main.py", "type": "file", "label": "main.py", "title": "Base logic file", "z": 1704105000, "author": "dawon"},
            
            # t2: 규민의 이슈 제기 및 작업 (중간: 1704200000)
            {"id": "user-jimin", "type": "contributor", "label": "규민", "title": "Developer", "z": 1704200000, "author": "gyumin"},
            {"id": "issue-1", "type": "issue", "label": "#1", "title": "main 로직 구현", "z": 1704210000, "author": "gyumin"},
            
            # t3: PR 및 커밋 (최근: 1704300000)
            {"id": "pr-1", "type": "pull_request", "label": "PR#1", "title": "Implement main logic", "z": 1704300000, "author": "gyumin"},
            {"id": "commit-c1", "type": "commit", "label": "feat: logic", "title": "Add core loop", "z": 1704305000, "author": "gyumin"},
        ],
        "edges": [
            # t1 관계: 다원이 파일을 만듦
            {"source": "user-dawon", "target": "file-main.py", "type": "created"},
            
            # t2 관계: 규민이 이슈를 올림
            {"source": "user-jimin", "target": "issue-1", "type": "authored"},
            
            # t3 관계: 규민이 작업한 흐름
            {"source": "issue-1", "target": "pr-1", "type": "references"},   # 이슈 해결을 위해 PR 생성
            {"source": "pr-1", "target": "commit-c1", "type": "contains"},   # PR에 포함된 실제 코드 작업
            {"source": "pr-1", "target": "file-main.py", "type": "modifies"}, # PR이 기존 main.py를 수정함
            {"source": "commit-c1", "target": "user-jimin", "type": "authored_by"} # 커밋의 주인은 규민
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
