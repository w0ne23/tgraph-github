"""TGraphRAG Q&A 엔진 - 그래프 데이터 기반 AI 질의응답 (Gemini API)"""

import google.generativeai as genai
from typing import Dict, List, Any, Optional
from config import GEMINI_API_KEY


class TGraphQAEngine:
    """T-Graph 데이터를 활용한 RAG 기반 Q&A 엔진"""

    def __init__(self):
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY가 설정되지 않았습니다")
        genai.configure(api_key=GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')

    def extract_graph_context(self, graph_data: Dict, question: str) -> str:
        """그래프 데이터에서 질문에 관련된 컨텍스트 추출"""

        nodes = graph_data.get("nodes", [])
        edges = graph_data.get("edges", [])
        insights = graph_data.get("insights", {})

        # 노드 타입별 분류
        contributors = [n for n in nodes if n.get("type") == "contributor"]
        files = [n for n in nodes if n.get("type") == "file"]
        commits = [n for n in nodes if n.get("type") == "commit"]
        issues = [n for n in nodes if n.get("type") == "issue"]
        pull_requests = [n for n in nodes if n.get("type") == "pull_request"]

        # 컨텍스트 구성
        context_parts = []

        # 1. 프로젝트 개요
        context_parts.append("## 프로젝트 개요")
        context_parts.append(f"- 총 기여자: {len(contributors)}명")
        context_parts.append(f"- 총 파일: {len(files)}개")
        context_parts.append(f"- 총 커밋: {len(commits)}개")
        context_parts.append(f"- 총 이슈: {len(issues)}개")
        context_parts.append(f"- 총 PR: {len(pull_requests)}개")

        # 2. 기여자 정보
        context_parts.append("\n## 기여자 목록")
        for c in contributors:
            context_parts.append(f"- {c.get('label', 'Unknown')}: {c.get('title', '')}")

        # 3. 파일 구조 및 도메인
        context_parts.append("\n## 파일 구조")
        for f in files:
            domain = f.get("domain", "uncategorized")
            path = f.get("path", f.get("label", ""))
            lines = f.get("lines", 0)
            last_modified = f.get("last_modified", "Unknown")
            commits_by_author = f.get("commits_by_author", {})
            context_parts.append(f"- {path} (도메인: {domain}, {lines}줄, 최종수정: {last_modified})")
            if commits_by_author:
                authors = ", ".join([f"{k}: {v}커밋" for k, v in commits_by_author.items()])
                context_parts.append(f"  작업자: {authors}")

        # 4. 파일 내용 (코드)
        context_parts.append("\n## 파일 내용")
        for f in files:
            content = f.get("content", "")
            if content:
                path = f.get("path", f.get("label", ""))
                context_parts.append(f"\n### {path}")
                context_parts.append(f"```\n{content}\n```")

        # 5. 커밋 히스토리 (diff 포함)
        context_parts.append("\n## 커밋 히스토리")
        for c in commits:
            additions = c.get('additions', 0)
            deletions = c.get('deletions', 0)
            context_parts.append(f"\n### [{c.get('label')}] {c.get('title')}")
            context_parts.append(f"- 작성자: {c.get('author')}")
            context_parts.append(f"- 변경량: +{additions} / -{deletions}")

            # diff 정보 추가
            diff_files = c.get('diff', [])
            if diff_files:
                context_parts.append(f"- 변경 파일 ({len(diff_files)}개):")
                for df in diff_files[:10]:  # 최대 10개 파일만
                    status = df.get('status', 'modified')
                    filename = df.get('filename', '')
                    file_adds = df.get('additions', 0)
                    file_dels = df.get('deletions', 0)
                    context_parts.append(f"  - {filename} ({status}, +{file_adds}/-{file_dels})")

                    # patch 내용 (변경 코드)
                    patch = df.get('patch', '')
                    if patch:
                        # patch가 너무 길면 자르기
                        if len(patch) > 1000:
                            patch = patch[:1000] + "\n... (truncated)"
                        context_parts.append(f"```diff\n{patch}\n```")

        # 6. 이슈 목록
        context_parts.append("\n## 이슈 목록")
        for i in issues:
            context_parts.append(f"- {i.get('label')}: {i.get('title')} (by {i.get('author')})")

        # 7. PR 목록
        context_parts.append("\n## Pull Request 목록")
        for pr in pull_requests:
            context_parts.append(f"- {pr.get('label')}: {pr.get('title')} (by {pr.get('author')})")

        # 8. 관계 정보 (edges)
        context_parts.append("\n## 관계 정보")
        edge_summary = {}
        for e in edges:
            edge_type = e.get("type", "unknown")
            edge_summary[edge_type] = edge_summary.get(edge_type, 0) + 1
        for edge_type, count in edge_summary.items():
            context_parts.append(f"- {edge_type}: {count}개")

        # 9. 인사이트 정보
        if insights:
            context_parts.append("\n## 분석 인사이트")

            if "domain_distribution" in insights:
                context_parts.append("\n### 도메인 분포")
                for domain, count in insights["domain_distribution"].items():
                    context_parts.append(f"- {domain}: {count}개")

            if "domain_experts" in insights:
                context_parts.append("\n### 도메인별 전문가")
                for domain, expert in insights["domain_experts"].items():
                    if expert:
                        context_parts.append(f"- {domain}: {expert}")

            if "most_active_files" in insights:
                context_parts.append("\n### 가장 활발한 파일")
                for f in insights["most_active_files"][:5]:
                    context_parts.append(f"- {f.get('path', f.get('label'))}: {f.get('commits', 0)}커밋")

            # 기여자별 상세 통계
            if "contributor_stats" in insights:
                context_parts.append("\n### 기여자별 상세 통계")
                for contributor, stats in insights["contributor_stats"].items():
                    context_parts.append(f"\n#### {contributor}")
                    context_parts.append(f"- 커밋 수: {stats.get('commits', 0)}")
                    context_parts.append(f"- 코드 추가: +{stats.get('additions', 0)} 줄")
                    context_parts.append(f"- 코드 삭제: -{stats.get('deletions', 0)} 줄")
                    context_parts.append(f"- PR 생성: {stats.get('prs_created', 0)}개 (병합됨: {stats.get('prs_merged', 0)}개)")
                    context_parts.append(f"- 이슈 생성: {stats.get('issues_created', 0)}개")
                    context_parts.append(f"- 코드 리뷰: {stats.get('reviews_given', 0)}회")
                    context_parts.append(f"- 코멘트: {stats.get('comments_given', 0)}개")

            # 전체 통계
            context_parts.append("\n### 프로젝트 전체 통계")
            context_parts.append(f"- 총 PR: {insights.get('total_prs', 0)}개 (병합됨: {insights.get('merged_prs', 0)}개)")
            context_parts.append(f"- 총 이슈: {insights.get('total_issues', 0)}개 (해결됨: {insights.get('closed_issues', 0)}개)")
            context_parts.append(f"- 총 코드 리뷰: {insights.get('total_reviews', 0)}회")
            context_parts.append(f"- 총 코멘트: {insights.get('total_comments', 0)}개")

        return "\n".join(context_parts)

    def build_system_prompt(self) -> str:
        """시스템 프롬프트 생성"""
        return """당신은 T-Graph 기반 GitHub 리포지토리 분석 전문가입니다.

T-Graph는 GitHub 리포지토리의 시간적 데이터를 3D 그래프로 표현합니다:
- X, Y축: 그래프 구조 (관계 기반 레이아웃)
- Z축: 시간 차원 (타임스탬프)

노드 타입:
- contributor: GitHub 사용자
- file: 소스 코드 파일. '최종수정'은 해당 파일이 포함된 마지막 Pull Request가 업데이트된 시간입니다.
- commit: Git 커밋
- issue: GitHub 이슈
- pull_request: Pull Request

관계 타입:
- created: 기여자가 이슈/PR 생성
- authored: 커밋 작성
- contains: PR이 커밋 포함
- modifies: 커밋이 파일 수정
- references: 이슈가 PR에서 참조됨

제공된 그래프 컨텍스트를 분석하여 사용자의 질문에 정확하고 유용하게 답변하세요.
답변할 때:
1. 구체적인 데이터(파일명, 기여자명, 커밋 등)를 인용하세요
2. 관계와 패턴을 설명하세요
3. 가능하면 수치와 통계를 포함하세요
4. 한국어로 답변하세요"""

    def ask(self, question: str, graph_data: Dict) -> Dict[str, Any]:
        """질문에 대한 답변 생성"""

        # 그래프 컨텍스트 추출
        context = self.extract_graph_context(graph_data, question)

        # 프롬프트 구성
        prompt = f"""{self.build_system_prompt()}

다음은 GitHub 리포지토리의 T-Graph 데이터입니다:

{context}

---

질문: {question}

위 그래프 데이터를 기반으로 질문에 답변해주세요."""

        # Gemini API 호출
        response = self.model.generate_content(prompt)
        answer = response.text

        # 관련 노드 추출 (간단한 키워드 매칭)
        citations = self._extract_citations(answer, graph_data)

        return {
            "answer": answer,
            "citations": citations,
            "model": "gemini-2.0-flash-exp",
            "context_length": len(context)
        }

    def _extract_citations(self, answer: str, graph_data: Dict) -> List[Dict]:
        """답변에서 언급된 노드들을 추출"""
        citations = []
        nodes = graph_data.get("nodes", [])

        for node in nodes:
            label = node.get("label", "")
            title = node.get("title", "")
            path = node.get("path", "")

            # 답변에서 노드가 언급되었는지 확인
            if label and label in answer:
                citations.append({
                    "id": node.get("id"),
                    "type": node.get("type"),
                    "label": label,
                    "path": path
                })
            elif path and path in answer:
                citations.append({
                    "id": node.get("id"),
                    "type": node.get("type"),
                    "label": label,
                    "path": path
                })

        # 중복 제거
        seen = set()
        unique_citations = []
        for c in citations:
            if c["id"] not in seen:
                seen.add(c["id"])
                unique_citations.append(c)

        return unique_citations


# 싱글톤 인스턴스 (lazy initialization)
_qa_engine: Optional[TGraphQAEngine] = None


def get_qa_engine() -> TGraphQAEngine:
    """QA 엔진 싱글톤 인스턴스 반환"""
    global _qa_engine
    if _qa_engine is None:
        _qa_engine = TGraphQAEngine()
    return _qa_engine
