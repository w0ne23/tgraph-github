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

def generate_insights(files_data: List[Dict], nodes: List[Dict], edges: List[Dict]) -> Dict[str, Any]:
    """전체 인사이트 생성"""
    
    # 1. 도메인 분포 계산
    domain_distribution = Counter()
    for file_data in files_data:
        domain = file_data.get("domain", "uncategorized")
        domain_distribution[domain] += 1
    
    # 2. 도메인 전문가 식별
    domain_experts = find_domain_experts(files_data)
    
    # 3. 가장 활발한 파일 TOP 5
    files_with_activity = []
    for file_data in files_data:
        total_commits = sum(file_data.get("commits_by_author", {}).values())
        files_with_activity.append({
            "path": file_data.get("path", "unknown"),
            "commits": total_commits,
            "lines": file_data.get("lines", 0)
        })
    
    most_active_files = sorted(
        files_with_activity, 
        key=lambda x: x["commits"], 
        reverse=True
    )[:5]
    
    # 4. 복잡도 순위
    files_with_complexity = []
    for file_data in files_data:
        complexity = calculate_file_complexity(file_data)
        files_with_complexity.append({
            "path": file_data.get("path", "unknown"),
            "score": complexity
        })
    
    complexity_ranking = sorted(
        files_with_complexity,
        key=lambda x: x["score"],
        reverse=True
    )[:5]
    
    # 5. 전체 통계
    total_files = len(files_data)
    contributors = set()
    total_commits = 0
    
    for file_data in files_data:
        commits_by_author = file_data.get("commits_by_author", {})
        contributors.update(commits_by_author.keys())
        total_commits += sum(commits_by_author.values())
    
    return {
        "domain_distribution": dict(domain_distribution),
        "domain_experts": domain_experts,
        "most_active_files": most_active_files,
        "complexity_ranking": complexity_ranking,
        "total_files": total_files,
        "total_contributors": len(contributors),
        "total_commits": total_commits
    }

def merge_insights_with_graph(graph_data: Dict, insights: Dict) -> Dict:
    """그래프 데이터와 인사이트 병합"""
    return {
        "nodes": graph_data.get("nodes", []),
        "edges": graph_data.get("edges", []),
        "insights": insights
    }