"""
backend/analyzers/insight_generator.py
파일 분석 데이터로부터 인사이트 생성
"""
from collections import Counter, defaultdict
from typing import List, Dict, Any

def calculate_expertise(commits_by_author: Dict[str, int]) -> Dict[str, Dict]:
    """기여자별 전문가 점수 계산"""
    total_commits = sum(commits_by_author.values())
    if total_commits == 0:
        return {}
    
    expertise = {}
    for author, count in commits_by_author.items():
        percentage = (count / total_commits) * 100
        expertise[author] = {
            "commits": count,
            "percentage": round(percentage, 1),
            "expertise_level": "expert" if percentage > 50 else "contributor"
        }
    
    return expertise

def find_domain_experts(files_data: List[Dict]) -> Dict[str, str]:
    """도메인별 최고 전문가 식별"""
    domain_contributors = defaultdict(Counter)
    
    for file_data in files_data:
        domain = file_data.get("domain", "uncategorized")
        commits_by_author = file_data.get("commits_by_author", {})
        
        for author, commit_count in commits_by_author.items():
            domain_contributors[domain][author] += commit_count
    
    # 각 도메인의 최고 기여자 추출
    domain_experts = {}
    for domain, contributors in domain_contributors.items():
        if contributors:
            top_contributor = contributors.most_common(1)[0][0]
            domain_experts[domain] = top_contributor
    
    return domain_experts

def calculate_file_complexity(file_data: Dict) -> float:
    """파일 복잡도 계산 (간단한 휴리스틱)"""
    # 요소: 라인수, 커밋 빈도, import 수
    lines = file_data.get("lines", 0)
    commits = len(file_data.get("commits_by_author", {}))
    imports = len(file_data.get("imports", []))
    
    # 가중치 적용
    complexity = (lines * 0.3) + (commits * 2.0) + (imports * 1.5)
    return round(complexity, 2)


def calculate_contributor_stats(nodes: List[Dict], edges: List[Dict]) -> Dict[str, Dict]:
    """기여자별 상세 통계 계산"""
    contributor_stats = {}

    # 기여자 노드 추출
    contributors = [n for n in nodes if n.get("type") == "contributor"]
    for c in contributors:
        login = c.get("label", c.get("author", "unknown"))
        contributor_stats[login] = {
            "commits": 0,
            "additions": 0,
            "deletions": 0,
            "prs_created": 0,
            "prs_merged": 0,
            "issues_created": 0,
            "issues_closed": 0,
            "reviews_given": 0,
            "comments_given": 0,
            "files_modified": set()
        }

    # PR 데이터 분석
    prs = [n for n in nodes if n.get("type") == "pull_request"]
    for pr in prs:
        author = pr.get("author", "unknown")
        if author in contributor_stats:
            contributor_stats[author]["prs_created"] += 1
            contributor_stats[author]["additions"] += pr.get("additions", 0)
            contributor_stats[author]["deletions"] += pr.get("deletions", 0)
            if pr.get("merged"):
                contributor_stats[author]["prs_merged"] += 1

        # 리뷰어 통계
        for reviewer in pr.get("reviewers", []):
            if reviewer in contributor_stats:
                contributor_stats[reviewer]["reviews_given"] += 1

        # 코멘터 통계
        for commenter in pr.get("commenters", []):
            if commenter in contributor_stats:
                contributor_stats[commenter]["comments_given"] += 1

    # 이슈 데이터 분석
    issues = [n for n in nodes if n.get("type") == "issue"]
    for issue in issues:
        author = issue.get("author", "unknown")
        if author in contributor_stats:
            contributor_stats[author]["issues_created"] += 1
            if issue.get("state") == "CLOSED":
                contributor_stats[author]["issues_closed"] += 1

        # 코멘터 통계
        for commenter in issue.get("commenters", []):
            if commenter in contributor_stats:
                contributor_stats[commenter]["comments_given"] += 1

    # 커밋 데이터 분석
    commits = [n for n in nodes if n.get("type") == "commit"]
    for commit in commits:
        author = commit.get("author", "unknown")
        # 커밋 작성자와 contributor 매칭 시도
        for login in contributor_stats.keys():
            if login.lower() in author.lower() or author.lower() in login.lower():
                contributor_stats[login]["commits"] += 1
                contributor_stats[login]["additions"] += commit.get("additions", 0)
                contributor_stats[login]["deletions"] += commit.get("deletions", 0)
                break

    # set을 list로 변환
    for login in contributor_stats:
        contributor_stats[login]["files_modified"] = list(contributor_stats[login]["files_modified"])

    return contributor_stats


def generate_insights(data):
    """데이터에서 insights 생성"""
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])
    
    # 파일 노드 필터링
    file_nodes = [n for n in nodes if n.get("type") == "file"]
    contributor_nodes = [n for n in nodes if n.get("type") == "contributor"]
    commit_nodes = [n for n in nodes if n.get("type") == "commit"]
    
    # 도메인 분포
    domain_distribution = {}
    for node in file_nodes:
        domain = node.get("domain", "uncategorized")
        domain_distribution[domain] = domain_distribution.get(domain, 0) + 1
    
    # 파일별 커밋 수 계산
    file_commits = {}
    for edge in edges:
        if edge.get("type") == "modifies":
            target = edge.get("target")
            if target and target.startswith("file-"):
                file_commits[target] = file_commits.get(target, 0) + 1
    
    # 가장 활발한 파일 TOP 5
    most_active_files = []
    for node in file_nodes:
        file_id = node.get("id")
        commit_count = file_commits.get(file_id, 0)
        if commit_count > 0:
            most_active_files.append({
                "path": node.get("path", node.get("label", "unknown")),
                "commits": commit_count,
                "lines": node.get("lines", 0)
            })
    # 복잡도 계산 (파일 크기 + 수정 횟수)
    complexity_ranking = []
    for node in file_nodes:
        file_id = node.get("id")
        commit_count = file_commits.get(file_id, 0)
        lines = node.get("lines", 0)
        additions = node.get("additions", 0)
        deletions = node.get("deletions", 0)
        
        # 복잡도 점수 계산
        # - 라인 수가 많을수록 복잡
        # - 수정 횟수가 많을수록 복잡
        # - 변경량이 많을수록 복잡
        complexity_score = (
            (lines / 100) * 0.3 +           # 라인 수 기여도
            commit_count * 0.5 +             # 수정 횟수 기여도
            ((additions + deletions) / 100) * 0.2  # 변경량 기여도
        )
        
        if complexity_score > 0:
            complexity_ranking.append({
                "path": node.get("path", node.get("label", "unknown")),
                "score": complexity_score,
                "lines": lines,
                "commits": commit_count,
                "changes": additions + deletions
            })
    
    # 점수 순으로 정렬
    complexity_ranking.sort(key=lambda x: x["score"], reverse=True)
    
    most_active_files.sort(key=lambda x: x["commits"], reverse=True)
    most_active_files = most_active_files[:5]
    
    # 도메인별 전문가 (각 도메인에서 가장 많이 기여한 사람)
    domain_experts = {}
    for domain in domain_distribution.keys():
        domain_files = [n for n in file_nodes if n.get("domain") == domain]
        domain_file_ids = [n.get("id") for n in domain_files]
        
        contributor_commits = {}
        for edge in edges:
            if edge.get("type") == "modifies" and edge.get("target") in domain_file_ids:
                # 이 엣지의 source(PR)를 찾아서 작성자 추적
                pr_id = edge.get("source")
                # PR의 작성자 찾기
                for e in edges:
                    if e.get("target") == pr_id and e.get("type") == "created":
                        contributor_id = e.get("source")
                        contributor_node = next((n for n in nodes if n.get("id") == contributor_id), None)
                        if contributor_node:
                            author = contributor_node.get("label", "unknown")
                            contributor_commits[author] = contributor_commits.get(author, 0) + 1
        
        if contributor_commits:
            expert = max(contributor_commits, key=contributor_commits.get)
            domain_experts[domain] = expert

    # 기여자별 상세 통계
    contributor_stats = calculate_contributor_stats(nodes, edges)

    # PR/이슈 통계
    pr_nodes = [n for n in nodes if n.get("type") == "pull_request"]
    issue_nodes = [n for n in nodes if n.get("type") == "issue"]

    total_prs = len(pr_nodes)
    merged_prs = len([p for p in pr_nodes if p.get("merged")])
    total_issues = len(issue_nodes)
    closed_issues = len([i for i in issue_nodes if i.get("state") == "CLOSED"])

    # 리뷰 통계
    total_reviews = sum(p.get("review_count", 0) for p in pr_nodes)
    total_pr_comments = sum(p.get("comment_count", 0) for p in pr_nodes)
    total_issue_comments = sum(i.get("comment_count", 0) for i in issue_nodes)

    return {
        "total_files": len(file_nodes),
        "total_contributors": len(contributor_nodes),
        "total_commits": len(commit_nodes),
        "total_prs": total_prs,
        "merged_prs": merged_prs,
        "total_issues": total_issues,
        "closed_issues": closed_issues,
        "total_reviews": total_reviews,
        "total_comments": total_pr_comments + total_issue_comments,
        "domain_distribution": domain_distribution,
        "domain_experts": domain_experts,
        "most_active_files": most_active_files,
        "complexity_ranking": complexity_ranking,
        "contributor_stats": contributor_stats
    }

def merge_insights_with_graph(graph_data: Dict, insights: Dict) -> Dict:
    """그래프 데이터와 인사이트 병합"""
    return {
        "nodes": graph_data.get("nodes", []),
        "edges": graph_data.get("edges", []),
        "insights": insights
    }