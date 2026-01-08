"""GitHub 응답 → T-Graph 노드/엣지 변환"""
from datetime import datetime

def parse_timestamp(iso_str: str) -> float:
    """ISO 문자열 → Unix timestamp (Z축 좌표용)"""
    dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    return dt.timestamp()

def transform_to_tgraph(raw: dict) -> dict:
    """GitHub GraphQL 응답 → T-Graph 형식 변환"""
    nodes, edges = [], []
    seen_ids = set()
    
    issues = raw.get("data", {}).get("repository", {}).get("issues", {}).get("nodes", [])
    
    for issue in issues:
        issue_id = f"issue-{issue['number']}"
        
        if issue_id not in seen_ids:
            seen_ids.add(issue_id)
            nodes.append({
                "id": issue_id,
                "type": "issue",
                "label": f"#{issue['number']}",
                "title": issue["title"],
                "timestamp": issue["createdAt"],
                "z": parse_timestamp(issue["createdAt"]),
                "author": issue["author"]["login"] if issue["author"] else "unknown"
            })
        
        # 연결된 PR 처리
        for item in issue.get("timelineItems", {}).get("nodes", []):
            source = item.get("source")
            if not source or "number" not in source:
                continue
            
            pr = source
            pr_id = f"pr-{pr['number']}"
            
            if pr_id not in seen_ids:
                seen_ids.add(pr_id)
                nodes.append({
                    "id": pr_id,
                    "type": "pull_request",
                    "label": f"PR#{pr['number']}",
                    "title": pr["title"],
                    "timestamp": pr["createdAt"],
                    "z": parse_timestamp(pr["createdAt"]),
                    "author": pr["author"]["login"] if pr.get("author") else "unknown"
                })
            
            edges.append({
                "source": issue_id,
                "target": pr_id,
                "type": "references"
            })
            
            # PR의 커밋들
            for commit_node in pr.get("commits", {}).get("nodes", []):
                c = commit_node["commit"]
                commit_id = f"commit-{c['oid'][:7]}"
                
                if commit_id not in seen_ids:
                    seen_ids.add(commit_id)
                    nodes.append({
                        "id": commit_id,
                        "type": "commit",
                        "label": c["oid"][:7],
                        "title": c["message"].split("\n")[0][:50],
                        "timestamp": c["committedDate"],
                        "z": parse_timestamp(c["committedDate"]),
                        "author": c["author"]["name"] if c.get("author") else "unknown"
                    })
                
                edges.append({
                    "source": pr_id,
                    "target": commit_id,
                    "type": "contains"
                })

    # 기여자(Contributor) 연결 예시
    if author_login:
        user_id = f"user-{author_login}"
        if user_id not in seen_ids:
            nodes.append({"id": user_id, "type": "contributor", "label": author_login})
            seen_ids.add(user_id)
        edges.append({"source": pr_id, "target": user_id, "type": "authored_by"})

    # 파일(File) 연결 예시
    for file in pr.get("files", {}).get("nodes", []):
        file_id = f"file-{file['path']}"
        if file_id not in seen_ids:
            nodes.append({"id": file_id, "type": "file", "label": file['path']})
            seen_ids.add(file_id)
        edges.append({"source": pr_id, "target": file_id, "type": "modified"})
    
    return {"nodes": nodes, "edges": edges}
