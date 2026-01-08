"""GitHub GraphQL API 호출 담당"""
import httpx
from config import GITHUB_TOKEN, GITHUB_API_URL

QUERY = """
query($owner: String!, $repo: String!, $first: Int!) {
  repository(owner: $owner, name: $repo) {
    issues(first: $first, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        number
        title
        author { login avatarUrl } # 아바타 추가 가능
        timelineItems(first: 10, itemTypes: [CROSS_REFERENCED_EVENT]) {
          nodes {
            ... on CrossReferencedEvent {
              source {
                ... on PullRequest {
                  number
                  title
                  author { login }
                  # 변경된 파일 목록 추가
                  files(first: 5) {
                    nodes { path }
                  }
                  commits(first: 5) {
                    nodes {
                      commit { oid message author { name } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
"""

async def fetch_repo_data(owner: str, repo: str, first: int = 10) -> dict:
    """비동기로 GitHub 데이터 조회"""
    headers = {"Authorization": f"Bearer {GITHUB_TOKEN}"}
    payload = {
        "query": QUERY,
        "variables": {"owner": owner, "repo": repo, "first": first}
    }
    
    async with httpx.AsyncClient() as client:
        res = await client.post(GITHUB_API_URL, json=payload, headers=headers)
        res.raise_for_status()
        return res.json()
