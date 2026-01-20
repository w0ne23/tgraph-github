"""
GitHub GraphQL API Crawler → T-Graph Format (Full Pagination)
=============================================================

페이지네이션으로 전체 데이터 수집 + config.py에서 토큰 자동 로드

사용법:
    python github_graphql_crawler_tgraph.py --repo owner/repo
"""

import requests
from datetime import datetime
from typing import List, Dict, Set, Optional
import json
from pathlib import Path
import time

# config.py에서 토큰 가져오기
from config import GITHUB_TOKEN


class GitHubGraphQLCrawlerTGraph:
    """GitHub 데이터를 전체 수집하여 T-Graph 형식으로 변환하는 Crawler (페이지네이션 적용)"""
    
    def __init__(self, token: str):
        self.endpoint = "https://api.github.com/graphql"
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        self.rate_limit_remaining = None
        print("✅ GitHub GraphQL API 인증 완료")
    
    def _execute_query(self, query: str, variables: Dict = None) -> Dict:
        """GraphQL 쿼리 실행"""
        payload = {"query": query}
        if variables:
            payload["variables"] = variables
        
        try:
            response = requests.post(self.endpoint, headers=self.headers, json=payload)
            response.raise_for_status()
            result = response.json()
            
            if "errors" in result:
                print(f"❌ GraphQL 에러: {result['errors']}")
                raise Exception(result['errors'])
            
            # Rate limit 체크
            if "data" in result and "rateLimit" in result.get("data", {}):
                rate_limit = result["data"]["rateLimit"]
                self.rate_limit_remaining = rate_limit.get('remaining', 0)
                limit = rate_limit.get('limit', 0)
                print(f"📊 남은 API 포인트: {self.rate_limit_remaining}/{limit}")
                
                # Rate limit이 낮으면 경고
                if self.rate_limit_remaining < 100:
                    print(f"⚠️  API 포인트가 부족합니다! 잠시 대기...")
                    time.sleep(2)
            
            return result.get("data", {})
            
        except requests.exceptions.RequestException as e:
            print(f"❌ 요청 실패: {e}")
            raise
    
    def _parse_timestamp(self, iso_str: str) -> float:
        """ISO 문자열 → Unix timestamp (Z축 좌표)"""
        if not iso_str:
            return 0.0
        try:
            dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
            return dt.timestamp()
        except:
            return 0.0
    
    def _get_commit_diff(self, owner: str, repo: str, commit_sha: str) -> Dict:
        """커밋의 diff(변경 내용) 가져오기 - REST API 사용"""
        url = f"https://api.github.com/repos/{owner}/{repo}/commits/{commit_sha}"

        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            data = response.json()

            files_diff = []
            for file in data.get('files', [])[:20]:  # 파일당 최대 20개
                patch = file.get('patch', '')
                # patch가 너무 길면 자르기 (5000자 제한)
                if len(patch) > 5000:
                    patch = patch[:5000] + "\n... (truncated)"

                files_diff.append({
                    "filename": file.get('filename', ''),
                    "status": file.get('status', ''),  # added, removed, modified, renamed
                    "additions": file.get('additions', 0),
                    "deletions": file.get('deletions', 0),
                    "patch": patch
                })

            return {
                "total_additions": data.get('stats', {}).get('additions', 0),
                "total_deletions": data.get('stats', {}).get('deletions', 0),
                "total_changes": data.get('stats', {}).get('total', 0),
                "files": files_diff
            }

        except Exception as e:
            print(f"      ⚠️ 커밋 diff 가져오기 실패: {commit_sha[:7]} ({str(e)})")
            return {"total_additions": 0, "total_deletions": 0, "total_changes": 0, "files": []}

    def _get_file_content(self, owner: str, repo: str, file_path: str, branch: str = "main") -> str:
        """파일 내용 가져오기 (크기 제한 없음!)"""
        query = """
        query($owner: String!, $repo: String!, $expression: String!) {
          repository(owner: $owner, name: $repo) {
            object(expression: $expression) {
              ... on Blob {
                text
                byteSize
                isBinary
              }
            }
          }
        }
        """
        
        expression = f"{branch}:{file_path}"
        
        try:
            data = self._execute_query(query, {
                "owner": owner,
                "repo": repo,
                "expression": expression
            })

            repo_data = data.get("repository") if data else None
            obj = repo_data.get("object") if repo_data else None

            if not obj:
                print(f"      ⚠️ {file_path}: 파일 없음 (삭제되었거나 브랜치에 존재하지 않음)")
                return ""
            
            # 바이너리 파일만 스킵 (이미지, 실행파일 등)
            if obj.get("isBinary", False):
                return ""
            
            # ✨ 크기 제한 없음! 모든 텍스트 파일 가져오기
            text = obj.get("text", "")
            size = obj.get("byteSize", 0)
            
            if size > 1000000:  # 1MB 이상이면 로그만 출력
                print(f"      📦 {file_path}: 대용량 파일 ({size} bytes, {size//1000}KB)")
            
            return text
        
        except Exception as e:
            # 파일을 가져올 수 없으면 빈 문자열 반환
            print(f"      ❌ {file_path}: 가져오기 실패 ({str(e)})")
            return ""
    
    def _paginate_issues(self, owner: str, repo: str) -> List[Dict]:
        """이슈 전체 수집 (페이지네이션)"""
        print("\n📋 이슈 전체 수집 중 (페이지네이션)...")
        
        query = """
        query($owner: String!, $repo: String!, $cursor: String) {
          rateLimit { limit remaining }
          repository(owner: $owner, name: $repo) {
            issues(first: 100, after: $cursor, orderBy: {field: CREATED_AT, direction: DESC}) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                number
                title
                body
                state
                createdAt
                updatedAt
                closedAt
                author { login }
                labels(first: 10) { nodes { name } }
                comments(first: 20) {
                  totalCount
                  nodes {
                    author { login }
                    body
                    createdAt
                  }
                }
                participants(first: 10) {
                  totalCount
                  nodes { login }
                }
              }
              totalCount
            }
          }
        }
        """
        
        all_issues = []
        cursor = None
        page = 1
        
        while True:
            print(f"   📄 페이지 {page} 로딩 중...", end=" ")
            
            data = self._execute_query(query, {
                "owner": owner,
                "repo": repo,
                "cursor": cursor
            })
            
            issues_data = data.get("repository", {}).get("issues", {})
            issues = issues_data.get("nodes", [])
            page_info = issues_data.get("pageInfo", {})
            total_count = issues_data.get("totalCount", 0)
            
            all_issues.extend(issues)
            
            print(f"✅ {len(issues)}개 수집 (총 {len(all_issues)}/{total_count})")
            
            if not page_info.get("hasNextPage"):
                break
            
            cursor = page_info.get("endCursor")
            page += 1
            
            # Rate limit 체크
            if self.rate_limit_remaining and self.rate_limit_remaining < 50:
                print(f"   ⏸️  API 포인트 부족, 3초 대기...")
                time.sleep(3)
        
        print(f"   🎉 이슈 수집 완료: 총 {len(all_issues)}개")
        return all_issues
    
    def _paginate_pull_requests(self, owner: str, repo: str) -> List[Dict]:
        """Pull Request 전체 수집 (페이지네이션) - 리뷰 정보 포함"""
        print("\n🔀 Pull Request 전체 수집 중 (페이지네이션)...")

        query = """
        query($owner: String!, $repo: String!, $cursor: String) {
          rateLimit { limit remaining }
          repository(owner: $owner, name: $repo) {
            pullRequests(first: 100, after: $cursor, orderBy: {field: CREATED_AT, direction: DESC}) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                number
                title
                body
                state
                createdAt
                updatedAt
                mergedAt
                merged
                author { login }
                headRefName
                baseRefName
                additions
                deletions
                changedFiles
                commits(first: 50) {
                  nodes {
                    commit {
                      oid
                      message
                      committedDate
                      author {
                        name
                        email
                      }
                    }
                  }
                }
                files(first: 30) {
                  nodes {
                    path
                    additions
                    deletions
                  }
                }
                reviews(first: 20) {
                  totalCount
                  nodes {
                    author { login }
                    state
                    body
                    submittedAt
                  }
                }
                comments(first: 20) {
                  totalCount
                  nodes {
                    author { login }
                    body
                    createdAt
                  }
                }
              }
              totalCount
            }
          }
        }
        """
        
        all_prs = []
        cursor = None
        page = 1
        
        while True:
            print(f"   📄 페이지 {page} 로딩 중...", end=" ")
            
            data = self._execute_query(query, {
                "owner": owner,
                "repo": repo,
                "cursor": cursor
            })
            
            prs_data = data.get("repository", {}).get("pullRequests", {})
            prs = prs_data.get("nodes", [])
            page_info = prs_data.get("pageInfo", {})
            total_count = prs_data.get("totalCount", 0)
            
            all_prs.extend(prs)
            
            print(f"✅ {len(prs)}개 수집 (총 {len(all_prs)}/{total_count})")
            
            if not page_info.get("hasNextPage"):
                break
            
            cursor = page_info.get("endCursor")
            page += 1
            
            # Rate limit 체크
            if self.rate_limit_remaining and self.rate_limit_remaining < 50:
                print(f"   ⏸️  API 포인트 부족, 3초 대기...")
                time.sleep(3)
        
        print(f"   🎉 PR 수집 완료: 총 {len(all_prs)}개")
        return all_prs
    
    def _paginate_commits(self, owner: str, repo: str, max_commits: Optional[int] = 500) -> List[Dict]:
        """커밋 수집 (페이지네이션, 기본 500개)"""
        print(f"\n💾 커밋 수집 중 (최대 {max_commits}개)...")
        
        query = """
        query($owner: String!, $repo: String!, $cursor: String) {
          rateLimit { limit remaining }
          repository(owner: $owner, name: $repo) {
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 100, after: $cursor) {
                    pageInfo {
                      hasNextPage
                      endCursor
                    }
                    nodes {
                      oid
                      message
                      committedDate
                      author {
                        name
                        email
                        user { login }
                      }
                      additions
                      deletions
                    }
                    totalCount
                  }
                }
              }
            }
          }
        }
        """
        
        all_commits = []
        cursor = None
        page = 1
        
        while True:
            print(f"   📄 페이지 {page} 로딩 중...", end=" ")
            
            data = self._execute_query(query, {
                "owner": owner,
                "repo": repo,
                "cursor": cursor
            })
            
            history_data = data.get("repository", {}).get("defaultBranchRef", {}).get("target", {}).get("history", {})
            commits = history_data.get("nodes", [])
            page_info = history_data.get("pageInfo", {})
            total_count = history_data.get("totalCount", 0)
            
            all_commits.extend(commits)
            
            print(f"✅ {len(commits)}개 수집 (총 {len(all_commits)}/{total_count})")
            
            # 최대 개수 제한 체크
            if max_commits and len(all_commits) >= max_commits:
                all_commits = all_commits[:max_commits]
                print(f"   ⚠️  최대 개수 도달: {max_commits}개")
                break
            
            if not page_info.get("hasNextPage"):
                break
            
            cursor = page_info.get("endCursor")
            page += 1
            
            # Rate limit 체크
            if self.rate_limit_remaining and self.rate_limit_remaining < 50:
                print(f"   ⏸️  API 포인트 부족, 3초 대기...")
                time.sleep(3)
        
        print(f"   🎉 커밋 수집 완료: 총 {len(all_commits)}개")
        return all_commits
    
    def collect_repository_data(self, owner: str, repo: str, max_commits: int = 500) -> Dict:
        """
        레포지토리 데이터 전체 수집 및 T-Graph 변환
        
        Returns:
            {
                "nodes": [...],
                "edges": [...],
                "metadata": {...}
            }
        """
        print(f"\n{'='*60}")
        print(f"🚀 GitHub → T-Graph 전체 데이터 크롤링 시작")
        print(f"📦 레포지토리: {owner}/{repo}")
        print(f"{'='*60}")
        
        nodes = []
        edges = []
        seen_ids: Set[str] = set()
        
        # ✨ contributor별 첫 기여 시간 추적
        contributor_first_time: Dict[str, float] = {}
        
        # === 1. 레포지토리 기본 정보 ===
        print("\n📊 레포지토리 기본 정보 수집 중...")
        
        query = """
        query($owner: String!, $repo: String!) {
          rateLimit { limit remaining }
          repository(owner: $owner, name: $repo) {
            name
            nameWithOwner
            description
            createdAt
            stargazerCount
            forkCount
            url
            primaryLanguage { name }
            
            collaborators(first: 100) {
              nodes {
                login
                name
                avatarUrl
              }
            }
          }
        }
        """
        
        data = self._execute_query(query, {"owner": owner, "repo": repo})
        
        if not data or "repository" not in data:
            raise Exception("레포지토리를 찾을 수 없습니다.")
        
        repo_data = data["repository"]
        
        # === 2. 기여자 노드는 Issue/PR/Commit 처리 시 자동 생성됨 ===
        # (첫 기여 시간을 추적하기 위해 여기서는 생성하지 않음)
        print("\n👥 기여자는 이슈/PR/커밋 처리 시 자동 생성됩니다...")
        
        # === 3. 이슈 전체 수집 (페이지네이션) ===
        issues = self._paginate_issues(owner, repo)
        
        for issue in issues:
            issue_id = f"issue-{issue['number']}"
            
            if issue_id not in seen_ids:
                seen_ids.add(issue_id)

                # 코멘트 정보 추출
                comments = issue.get('comments', {}).get('nodes', [])
                comment_count = issue.get('comments', {}).get('totalCount', 0)
                commenters = list(set([c['author']['login'] for c in comments if c.get('author')]))

                # 참여자 정보 추출
                participants = issue.get('participants', {}).get('nodes', [])
                participant_count = issue.get('participants', {}).get('totalCount', 0)
                participant_logins = [p['login'] for p in participants if p.get('login')]

                nodes.append({
                    "id": issue_id,
                    "type": "issue",
                    "label": f"#{issue['number']}",
                    "title": issue['title'],
                    "timestamp": issue['createdAt'],
                    "z": self._parse_timestamp(issue['createdAt']),
                    "author": issue['author']['login'] if issue.get('author') else 'unknown',
                    "state": issue['state'],
                    "closed_at": issue.get('closedAt'),
                    "body": issue.get('body', '')[:200],
                    "labels": [label['name'] for label in issue.get('labels', {}).get('nodes', [])],
                    # 코멘트 정보
                    "comment_count": comment_count,
                    "commenters": commenters,
                    # 참여자 정보
                    "participant_count": participant_count,
                    "participants": participant_logins
                })
            
            # 이슈 작성자 연결
            if issue.get('author'):
                author_id = f"user-{issue['author']['login']}"
                author_login = issue['author']['login']
                issue_time = self._parse_timestamp(issue['createdAt'])
                
                # ✨ 첫 기여 시간 기록
                if author_login not in contributor_first_time:
                    contributor_first_time[author_login] = issue_time
                else:
                    contributor_first_time[author_login] = min(
                        contributor_first_time[author_login], 
                        issue_time
                    )
                
                if author_id not in seen_ids:
                    seen_ids.add(author_id)
                    nodes.append({
                        "id": author_id,
                        "type": "contributor",
                        "label": issue['author']['login'],
                        "title": issue['author']['login'],
                        "timestamp": issue['createdAt'],  # ✨ 첫 기여 시간
                        "z": contributor_first_time[author_login],  # ✨ 첫 기여 시간 사용
                        "author": issue['author']['login']
                    })
                
                edges.append({
                    "source": author_id,
                    "target": issue_id,
                    "type": "created"
                })
        
        # === 4. PR 전체 수집 (페이지네이션) ===
        prs = self._paginate_pull_requests(owner, repo)
        
        for pr in prs:
            pr_id = f"pr-{pr['number']}"
            
            if pr_id not in seen_ids:
                seen_ids.add(pr_id)

                # 리뷰 정보 추출
                reviews = pr.get('reviews', {}).get('nodes', [])
                review_count = pr.get('reviews', {}).get('totalCount', 0)
                reviewers = list(set([r['author']['login'] for r in reviews if r.get('author')]))
                approved_by = [r['author']['login'] for r in reviews if r.get('author') and r.get('state') == 'APPROVED']

                # 코멘트 정보 추출
                comments = pr.get('comments', {}).get('nodes', [])
                comment_count = pr.get('comments', {}).get('totalCount', 0)
                commenters = list(set([c['author']['login'] for c in comments if c.get('author')]))

                nodes.append({
                    "id": pr_id,
                    "type": "pull_request",
                    "label": f"PR#{pr['number']}",
                    "title": pr['title'],
                    "timestamp": pr['createdAt'],
                    "z": self._parse_timestamp(pr['createdAt']),
                    "author": pr['author']['login'] if pr.get('author') else 'unknown',
                    "state": pr['state'],
                    "merged": pr.get('merged', False),
                    "merged_at": pr.get('mergedAt'),
                    "head_branch": pr.get('headRefName'),
                    "base_branch": pr.get('baseRefName'),
                    # 코드 변경량
                    "additions": pr.get('additions', 0),
                    "deletions": pr.get('deletions', 0),
                    "changed_files": pr.get('changedFiles', 0),
                    # 리뷰 정보
                    "review_count": review_count,
                    "reviewers": reviewers,
                    "approved_by": approved_by,
                    # 코멘트 정보
                    "comment_count": comment_count,
                    "commenters": commenters
                })
            
            # PR 작성자 연결
            if pr.get('author'):
                author_id = f"user-{pr['author']['login']}"
                author_login = pr['author']['login']
                pr_time = self._parse_timestamp(pr['createdAt'])
                
                # ✨ 첫 기여 시간 기록
                if author_login not in contributor_first_time:
                    contributor_first_time[author_login] = pr_time
                else:
                    contributor_first_time[author_login] = min(
                        contributor_first_time[author_login], 
                        pr_time
                    )
                
                if author_id not in seen_ids:
                    seen_ids.add(author_id)
                    nodes.append({
                        "id": author_id,
                        "type": "contributor",
                        "label": pr['author']['login'],
                        "title": pr['author']['login'],
                        "timestamp": pr['createdAt'],  # ✨ 첫 기여 시간
                        "z": contributor_first_time[author_login],  # ✨ 첫 기여 시간 사용
                        "author": pr['author']['login']
                    })
                
                edges.append({
                    "source": author_id,
                    "target": pr_id,
                    "type": "created"
                })
            
            # PR의 커밋들 처리
            for commit_node in pr.get('commits', {}).get('nodes', [])[:10]:  # PR당 최대 10개 커밋
                commit = commit_node.get('commit', {})
                commit_sha = commit['oid']
                commit_id = f"commit-{commit_sha[:7]}"

                if commit_id not in seen_ids:
                    seen_ids.add(commit_id)

                    # ✨ 커밋 diff 가져오기
                    print(f"      🔍 커밋 diff 수집: {commit_sha[:7]}")
                    diff_data = self._get_commit_diff(owner, repo, commit_sha)

                    nodes.append({
                        "id": commit_id,
                        "type": "commit",
                        "label": commit_sha[:7],
                        "title": commit['message'].split('\n')[0][:50],
                        "timestamp": commit['committedDate'],
                        "z": self._parse_timestamp(commit['committedDate']),
                        "author": commit['author']['name'] if commit.get('author') else 'unknown',
                        "message": commit['message'],
                        # ✨ diff 정보 추가
                        "additions": diff_data.get('total_additions', 0),
                        "deletions": diff_data.get('total_deletions', 0),
                        "changes": diff_data.get('total_changes', 0),
                        "diff": diff_data.get('files', [])  # 파일별 변경 내용
                    })

                # PR - Commit 연결
                edges.append({
                    "source": pr_id,
                    "target": commit_id,
                    "type": "contains"
                })
            
            # PR의 파일들 처리
            for file_node in pr.get('files', {}).get('nodes', []):  # ✨ 제한 없음! 전체 파일
                file_path = file_node.get('path', '')
                file_id = f"file-{file_path}"
                
                if file_id not in seen_ids:
                    seen_ids.add(file_id)
                    
                    extension = Path(file_path).suffix
                    
                    # ✨ 모든 텍스트 파일의 내용 가져오기 (개수 제한 없음)
                    content = ""
                    if extension in ['.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.cpp', '.c', '.go', '.rs', '.rb', 
                                    '.dart', '.swift', '.kt', '.scala', '.php', '.html', '.css', '.scss', '.vue', 
                                    '.md', '.txt', '.json', '.yaml', '.yml', '.xml', '.sql', '.sh', '.bash']:
                        content = self._get_file_content(owner, repo, file_path)
                        if content:
                            print(f"      📄 {Path(file_path).name}: {len(content)} 자")
                    
                    nodes.append({
                        "id": file_id,
                        "type": "file",
                        "label": Path(file_path).name,
                        "title": file_path,
                        "timestamp": pr['updatedAt'],
                        "z": self._parse_timestamp(pr['updatedAt']),
                        "last_modified": pr['updatedAt'],
                        "path": file_path,
                        "extension": extension,
                        "content": content,
                        "lines": content.count('\n') + 1 if content else 0,
                        "additions": file_node.get('additions', 0),
                        "deletions": file_node.get('deletions', 0)
                    })
                
                # PR - File 연결
                edges.append({
                    "source": pr_id,
                    "target": file_id,
                    "type": "modifies"
                })
        
        # === 5. 커밋 수집 ===
        commits = self._paginate_commits(owner, repo, max_commits=max_commits)
        
        for commit in commits:
            commit_id = f"commit-{commit['oid'][:7]}"
            
            if commit_id not in seen_ids:
                seen_ids.add(commit_id)
                nodes.append({
                    "id": commit_id,
                    "type": "commit",
                    "label": commit['oid'][:7],
                    "title": commit['message'].split('\n')[0][:50],
                    "timestamp": commit['committedDate'],
                    "z": self._parse_timestamp(commit['committedDate']),
                    "author": commit['author']['name'] if commit.get('author') else 'unknown',
                    "author_email": commit.get('author', {}).get('email'),
                    "message": commit['message'],
                    "additions": commit.get('additions', 0),
                    "deletions": commit.get('deletions', 0)
                })
            
            # 커밋 작성자 연결
            if commit.get('author') and commit['author'].get('user'):
                author_id = f"user-{commit['author']['user']['login']}"
                author_login = commit['author']['user']['login']
                commit_time = self._parse_timestamp(commit['committedDate'])
                
                # ✨ 첫 기여 시간 기록
                if author_login not in contributor_first_time:
                    contributor_first_time[author_login] = commit_time
                else:
                    contributor_first_time[author_login] = min(
                        contributor_first_time[author_login], 
                        commit_time
                    )
                
                if author_id not in seen_ids:
                    seen_ids.add(author_id)
                    nodes.append({
                        "id": author_id,
                        "type": "contributor",
                        "label": commit['author']['user']['login'],
                        "title": commit['author']['user']['login'],
                        "timestamp": commit['committedDate'],  # ✨ 첫 기여 시간
                        "z": contributor_first_time[author_login],  # ✨ 첫 기여 시간 사용
                        "author": commit['author']['user']['login']
                    })
                
                edges.append({
                    "source": commit_id,
                    "target": author_id,
                    "type": "authored_by"
                })
        
        # === 6. Issue ↔ PR 연결 ===
        print("\n🔗 Issue-PR 관계 추론 중...")
        self._connect_issues_to_prs(nodes, edges)
        
        # === 7. 메타데이터 생성 ===
        metadata = {
            "repository": {
                "name": repo_data['name'],
                "full_name": repo_data['nameWithOwner'],
                "description": repo_data.get('description'),
                "url": repo_data['url'],
                "stars": repo_data.get('stargazerCount', 0),
                "forks": repo_data.get('forkCount', 0),
                "language": repo_data.get('primaryLanguage', {}).get('name')
            },
            "stats": {
                "total_nodes": len(nodes),
                "total_edges": len(edges),
                "contributors": len([n for n in nodes if n['type'] == 'contributor']),
                "issues": len([n for n in nodes if n['type'] == 'issue']),
                "pull_requests": len([n for n in nodes if n['type'] == 'pull_request']),
                "commits": len([n for n in nodes if n['type'] == 'commit']),
                "files": len([n for n in nodes if n['type'] == 'file'])
            },
            "crawled_at": datetime.now().isoformat(),
            "pagination": "full"
        }
        
        print(f"\n{'='*60}")
        print(f"✅ T-Graph 전체 변환 완료!")
        print(f"   📊 총 {len(nodes)}개 노드, {len(edges)}개 엣지")
        print(f"   👥 기여자: {metadata['stats']['contributors']}명")
        print(f"   📋 이슈: {metadata['stats']['issues']}개")
        print(f"   🔀 PR: {metadata['stats']['pull_requests']}개")
        print(f"   💾 커밋: {metadata['stats']['commits']}개")
        print(f"   📁 파일: {metadata['stats']['files']}개")
        print(f"{'='*60}")
        
        return {
            "nodes": nodes,
            "edges": edges,
            "metadata": metadata
        }
    
    def _connect_issues_to_prs(self, nodes: List[Dict], edges: List[Dict]):
        """Issue와 PR 연결 (제목 기반 간단 매칭)"""
        import re
        
        issues = {n['id']: n for n in nodes if n['type'] == 'issue'}
        prs = [n for n in nodes if n['type'] == 'pull_request']
        
        connected = 0
        
        for pr in prs:
            # PR 제목/본문에서 #숫자 패턴 찾기
            pr_text = pr.get('title', '') + ' '
            
            # #123 패턴 찾기
            issue_refs = re.findall(r'#(\d+)', pr_text)
            
            for issue_num in issue_refs:
                issue_id = f"issue-{issue_num}"
                
                if issue_id in issues:
                    edges.append({
                        "source": issue_id,
                        "target": pr['id'],
                        "type": "references"
                    })
                    connected += 1
        
        print(f"   ✅ {connected}개의 Issue-PR 연결 생성")
    
    def save_tgraph(self, tgraph_data: Dict) -> str:
        """T-Graph 데이터를 github_data/data.json으로 저장"""
        
        # backend/github_data 폴더 생성
        output_path = Path(__file__).parent / "github_data"
        output_path.mkdir(parents=True, exist_ok=True)
        
        # data.json으로 고정
        output_file = output_path / "data.json"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(tgraph_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 저장 완료: {output_file}")
        print(f"📊 파일 크기: {output_file.stat().st_size / 1024:.2f} KB")
        
        return str(output_file)


def main():
    """메인 실행 함수"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='GitHub → T-Graph 전체 데이터 Crawler (페이지네이션 적용)'
    )
    parser.add_argument('--repo', required=True, help='레포지토리 (예: facebook/react)')
    parser.add_argument('--max-commits', type=int, default=500, help='최대 커밋 수 (기본: 500)')
    
    args = parser.parse_args()
    
    # 토큰 확인
    if not GITHUB_TOKEN:
        print("❌ .env 파일에 GITHUB_TOKEN을 설정하세요")
        return
    
    # owner/repo 분리
    try:
        owner, repo = args.repo.split('/')
    except ValueError:
        print("❌ 레포지토리 형식이 잘못되었습니다. 'owner/repo' 형식으로 입력하세요.")
        return
    
    # Crawler 실행
    crawler = GitHubGraphQLCrawlerTGraph(token=GITHUB_TOKEN)
    
    try:
        # T-Graph 데이터 수집
        tgraph_data = crawler.collect_repository_data(
            owner=owner,
            repo=repo,
            max_commits=args.max_commits
        )
        
        # 파일 저장 (github_data/data.json)
        output_file = crawler.save_tgraph(tgraph_data)
        
        print(f"\n🎉 크롤링 완료!")
        print(f"\n💡 다음 단계:")
        print(f"   1. 백엔드 서버 실행: python main.py")
        print(f"   2. 프론트엔드가 /api/load-json으로 자동 로드")
        print(f"   3. T-Graph 시각화 확인!")
        
    except Exception as e:
        print(f"\n❌ 크롤링 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
