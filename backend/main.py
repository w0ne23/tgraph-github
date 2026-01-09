"""FastAPI 서버 - T-Graph 데이터 제공"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from github_client import fetch_repo_data
from transformer import transform_to_tgraph
from config import GITHUB_TOKEN

from typing import Dict, List
import json

from analyzers.domain_classifier import classify_multiple_files, extract_imports, classify_file
from analyzers.insight_generator import generate_insights, merge_insights_with_graph

app = FastAPI(title="T-Graph GitHub API")

# React 개발 서버 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
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
    """4명의 기여자가 협업하는 웹 애플리케이션 개발 시나리오"""
    
    # 시간대 설정 (2024년 1월 ~ 3월)
    t1 = 1704100000  # 2024-01-01 (프로젝트 시작)
    t2 = 1704700000  # 2024-01-08 (1주 후)
    t3 = 1705300000  # 2024-01-15 (2주 후)
    t4 = 1705900000  # 2024-01-22 (3주 후)
    t5 = 1706500000  # 2024-01-29 (4주 후)
    t6 = 1707100000  # 2024-02-05 (5주 후)

    nodes = [
            # === Week 1: 다원의 프로젝트 초기 세팅 ===
            {"id": "user-dawon", "type": "contributor", "label": "다원", "title": "Project Lead", "z": t1, "author": "dawon"},
            {
                "id": "file-README.md", "type": "file", "label": "README.md", "title": "Project documentation", 
                "z": t1 + 1000, "author": "dawon",
                "path": "README.md", 
                "content": "# Web Application Project\nDocumentation for our team project", 
                "extension": ".md",
                "commits_by_author": {"dawon": 3, "dongseok": 1},
                "lines": 50
            },
            {
                "id": "file-index.html", "type": "file", "label": "index.html", "title": "Main HTML", 
                "z": t1 + 2000, "author": "dawon",
                "path": "frontend/index.html",
                "content": "<!DOCTYPE html>\n<html><head><title>App</title></head></html>",
                "extension": ".html",
                "commits_by_author": {"dawon": 2, "dongseok": 3},
                "lines": 100
            },
            {"id": "commit-init", "type": "commit", "label": "initial", "title": "feat: 프로젝트 초기 세팅", "z": t1 + 3000, "author": "dawon"},
            
            # === Week 2: 규민의 백엔드 API 개발 ===
            {"id": "user-gyumin", "type": "contributor", "label": "규민", "title": "Backend Developer", "z": t2, "author": "gyumin"},
            {"id": "issue-1", "type": "issue", "label": "#1", "title": "백엔드 API 서버 구축 필요", "z": t2 + 1000, "author": "gyumin"},
            {
                "id": "file-api.py", "type": "file", "label": "api.py", "title": "Backend API", 
                "z": t2 + 2000, "author": "gyumin",
                "path": "backend/api.py",
                "content": "from fastapi import FastAPI\nimport uvicorn\n\napp = FastAPI()",
                "extension": ".py",
                "commits_by_author": {"gyumin": 15, "dawon": 2},
                "lines": 200
            },
            {
                "id": "file-database.py", "type": "file", "label": "database.py", "title": "Database module", 
                "z": t2 + 3000, "author": "gyumin",
                "path": "backend/database.py",
                "content": "from sqlalchemy import create_engine\nimport psycopg2",
                "extension": ".py",
                "commits_by_author": {"gyumin": 10},
                "lines": 150
            },
            {"id": "pr-1", "type": "pull_request", "label": "PR#1", "title": "feat: FastAPI 서버 구현", "z": t2 + 4000, "author": "gyumin"},
            {"id": "commit-api1", "type": "commit", "label": "feat-api", "title": "feat: 사용자 인증 API 추가", "z": t2 + 5000, "author": "gyumin"},
            {"id": "commit-db1", "type": "commit", "label": "feat-db", "title": "feat: 데이터베이스 연결 설정", "z": t2 + 6000, "author": "gyumin"},
            
            # === Week 3: 동석의 프론트엔드 개발 ===
            {"id": "user-dongseok", "type": "contributor", "label": "동석", "title": "Frontend Developer", "z": t3, "author": "dongseok"},
            {"id": "issue-2", "type": "issue", "label": "#2", "title": "사용자 인터페이스 개선", "z": t3 + 1000, "author": "dongseok"},
            {
                "id": "file-app.js", "type": "file", "label": "app.js", "title": "Main JS logic", 
                "z": t3 + 2000, "author": "dongseok",
                "path": "frontend/app.js",
                "content": "import React from 'react';\nimport ReactDOM from 'react-dom';",
                "extension": ".js",
                "commits_by_author": {"dongseok": 20, "jimin": 3},
                "lines": 300
            },
            {
                "id": "file-styles.css", "type": "file", "label": "styles.css", "title": "Stylesheets", 
                "z": t3 + 3000, "author": "dongseok",
                "path": "frontend/styles.css",
                "content": ".container { display: grid; }",
                "extension": ".css",
                "commits_by_author": {"dongseok": 12, "jimin": 2},
                "lines": 180
            },
            {"id": "pr-2", "type": "pull_request", "label": "PR#2", "title": "feat: 반응형 UI 구현", "z": t3 + 4000, "author": "dongseok"},
            {"id": "commit-ui1", "type": "commit", "label": "feat-ui", "title": "feat: 로그인 화면 디자인", "z": t3 + 5000, "author": "dongseok"},
            {"id": "commit-ui2", "type": "commit", "label": "style", "title": "style: CSS 그리드 레이아웃 적용", "z": t3 + 6000, "author": "dongseok"},
            
            # === Week 4: 지민의 테스트 및 버그 수정 ===
            {"id": "user-jimin", "type": "contributor", "label": "지민", "title": "QA Engineer", "z": t4, "author": "jimin"},
            {"id": "issue-3", "type": "issue", "label": "#3", "title": "로그인 실패 시 에러 처리", "z": t4 + 1000, "author": "jimin"},
            {"id": "issue-4", "type": "issue", "label": "#4", "title": "모바일 레이아웃 깨짐", "z": t4 + 2000, "author": "jimin"},
            {"id": "pr-3", "type": "pull_request", "label": "PR#3", "title": "fix: 로그인 에러 핸들링", "z": t4 + 3000, "author": "gyumin"},
            {"id": "commit-fix1", "type": "commit", "label": "fix-auth", "title": "fix: 인증 실패 시 적절한 에러 반환", "z": t4 + 4000, "author": "gyumin"},
            
            # === Week 5: 동석과 다원의 협업 - 문서화 ===
            {"id": "issue-5", "type": "issue", "label": "#5", "title": "API 문서화 필요", "z": t5, "author": "dawon"},
            {
                "id": "file-API_DOCS.md", "type": "file", "label": "API_DOCS.md", "title": "API documentation", 
                "z": t5 + 1000, "author": "dongseok",
                "path": "docs/API_DOCS.md",
                "content": "# API Documentation\n## Authentication\n## Endpoints",
                "extension": ".md",
                "commits_by_author": {"dongseok": 5, "dawon": 2},
                "lines": 120
            },
            {"id": "pr-4", "type": "pull_request", "label": "PR#4", "title": "docs: API 사용 가이드 작성", "z": t5 + 2000, "author": "dongseok"},
            {"id": "commit-docs1", "type": "commit", "label": "docs", "title": "docs: README 업데이트 및 예제 추가", "z": t5 + 3000, "author": "dongseok"},
            
            # === Week 6: 지민의 모바일 버그 수정 ===
            {"id": "pr-5", "type": "pull_request", "label": "PR#5", "title": "fix: 모바일 반응형 레이아웃", "z": t6, "author": "dongseok"},
            {"id": "commit-mobile", "type": "commit", "label": "fix-css", "title": "fix: 모바일 화면 CSS 수정", "z": t6 + 1000, "author": "dongseok"},
            
            # === 추가 파일들 ===
            {
                "id": "file-config.json", "type": "file", "label": "config.json", "title": "Configuration", 
                "z": t2 + 500, "author": "gyumin",
                "path": "backend/config.json",
                "content": '{"database": "postgresql", "port": 5432}',
                "extension": ".json",
                "commits_by_author": {"gyumin": 5},
                "lines": 20
            },
            {
                "id": "file-utils.js", "type": "file", "label": "utils.js", "title": "Utility functions", 
                "z": t3 + 500, "author": "dongseok",
                "path": "frontend/utils.js",
                "content": "export function formatDate(date) { return date.toString(); }",
                "extension": ".js",
                "commits_by_author": {"dongseok": 8, "jimin": 1},
                "lines": 80
            },
        ]
    
    edges = [
            # === Week 1: 다원의 초기 작업 ===
            {"source": "user-dawon", "target": "file-README.md", "type": "created"},
            {"source": "user-dawon", "target": "file-index.html", "type": "created"},
            {"source": "user-dawon", "target": "commit-init", "type": "authored"},
            {"source": "commit-init", "target": "file-README.md", "type": "modifies"},
            {"source": "commit-init", "target": "file-index.html", "type": "modifies"},
            
            # === Week 2: 규민의 백엔드 개발 ===
            {"source": "user-gyumin", "target": "issue-1", "type": "created"},
            {"source": "issue-1", "target": "pr-1", "type": "references"},
            {"source": "user-gyumin", "target": "pr-1", "type": "authored"},
            {"source": "pr-1", "target": "commit-api1", "type": "contains"},
            {"source": "pr-1", "target": "commit-db1", "type": "contains"},
            {"source": "commit-api1", "target": "file-api.py", "type": "modifies"},
            {"source": "commit-api1", "target": "file-config.json", "type": "modifies"},
            {"source": "commit-db1", "target": "file-database.py", "type": "modifies"},
            {"source": "user-gyumin", "target": "file-api.py", "type": "created"},
            {"source": "user-gyumin", "target": "file-database.py", "type": "created"},
            
            # === Week 3: 동석의 프론트엔드 개발 ===
            {"source": "user-dongseok", "target": "issue-2", "type": "created"},
            {"source": "issue-2", "target": "pr-2", "type": "references"},
            {"source": "user-dongseok", "target": "pr-2", "type": "authored"},
            {"source": "pr-2", "target": "commit-ui1", "type": "contains"},
            {"source": "pr-2", "target": "commit-ui2", "type": "contains"},
            {"source": "commit-ui1", "target": "file-app.js", "type": "modifies"},
            {"source": "commit-ui1", "target": "file-index.html", "type": "modifies"},
            {"source": "commit-ui2", "target": "file-styles.css", "type": "modifies"},
            {"source": "user-dongseok", "target": "file-app.js", "type": "created"},
            {"source": "user-dongseok", "target": "file-styles.css", "type": "created"},
            {"source": "user-dongseok", "target": "file-utils.js", "type": "created"},
            
            # === Week 4: 지민의 이슈 제기 & 규민의 수정 ===
            {"source": "user-jimin", "target": "issue-3", "type": "created"},
            {"source": "user-jimin", "target": "issue-4", "type": "created"},
            {"source": "issue-3", "target": "pr-3", "type": "references"},
            {"source": "user-gyumin", "target": "pr-3", "type": "authored"},
            {"source": "pr-3", "target": "commit-fix1", "type": "contains"},
            {"source": "commit-fix1", "target": "file-api.py", "type": "modifies"},
            
            # === Week 5: 문서화 협업 (다원이 이슈, 동석이 작업) ===
            {"source": "user-dawon", "target": "issue-5", "type": "created"},
            {"source": "issue-5", "target": "pr-4", "type": "references"},
            {"source": "user-dongseok", "target": "pr-4", "type": "authored"},
            {"source": "pr-4", "target": "commit-docs1", "type": "contains"},
            {"source": "commit-docs1", "target": "file-README.md", "type": "modifies"},
            {"source": "commit-docs1", "target": "file-API_DOCS.md", "type": "modifies"},
            {"source": "user-dongseok", "target": "file-API_DOCS.md", "type": "created"},
            
            # === Week 6: 모바일 버그 수정 (동석이 지민의 이슈 해결) ===
            {"source": "issue-4", "target": "pr-5", "type": "references"},
            {"source": "user-dongseok", "target": "pr-5", "type": "authored"},
            {"source": "pr-5", "target": "commit-mobile", "type": "contains"},
            {"source": "commit-mobile", "target": "file-styles.css", "type": "modifies"},
        ]
    
    # 파일 노드만 추출하여 분석
    file_nodes = [node for node in nodes if node.get("type") == "file"]
    
    # 도메인 분류
    classified_files = classify_multiple_files(file_nodes)
    
    # 노드 데이터에 도메인 정보 추가
    for node in nodes:
        if node.get("type") == "file":
            matching_file = next(
                (f for f in classified_files if f["id"] == node["id"]), 
                None
            )
            if matching_file:
                node["domain"] = matching_file["domain"]
    
    # 인사이트 생성
    insights = generate_insights(classified_files, nodes, edges)
    
    # 최종 응답 구성
    return {
        "nodes": nodes,
        "edges": edges,
        "insights": insights
    }

@app.post("/api/analyze")
async def analyze_repository(repo_url: str):
    """GitHub URL을 받아 실제 분석 수행"""
    
    # 1. GitHub API로 데이터 수집
    # raw_data = await fetch_github_data(repo_url)
    
    # 2. 파일별 도메인 분류
    # classified_files = classify_multiple_files(raw_data["files"])
    
    # 3. 그래프 데이터 변환
    # graph_data = transform_to_graph(classified_files)
    
    # 4. 인사이트 생성
    # insights = generate_insights(classified_files, graph_data["nodes"], graph_data["edges"])
    
    # 5. 병합하여 반환
    # return merge_insights_with_graph(graph_data, insights)
    
    return {"message": "실제 GitHub API 연동은 구현 필요"}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)