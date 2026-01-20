# T-Graph GitHub Visualizer

GitHub 협업 데이터를 3D 시간 그래프로 시각화합니다.

## 프로젝트 구조

```
tgraph-github/
├── backend/
│   ├── .env              # 토큰 설정 (직접 생성)
│   ├── config.py         # 환경변수 로드
│   ├── github_client.py  # GraphQL API 호출
│   ├── transformer.py    # T-Graph 변환
│   └── main.py           # FastAPI 엔드포인트
└── frontend/
    └── src/App.jsx       # 3D 시각화
```

## 실행 방법

### 1. github 데이터 크롤링

```bash
cd backend

# 데이터 크롤링
python python github_graphql_crawler_tgraph.py --repo {owner}/{repo}

#backend/github_data/data.json 생성 확인
```

### 2. 백엔드 설정

```bash
cd backend

# 의존성 설치
pip install -r requirements.txt

# .env 파일 생성
cp .env .env

# .env 편집하여 토큰 입력
# GITHUB_TOKEN=ghp_your_actual_token

# 서버 실행
python main.py
```

### 3. GitHub 토큰 발급

1. GitHub → Settings → Developer settings
2. Personal access tokens → Fine-grained tokens
3. Generate new token
4. Repository access: Public repositories (read-only)
5. 토큰 복사 → `.env` 파일에 붙여넣기

### 4. 프론트엔드 실행

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

## API 엔드포인트

| 경로 | 설명 |
|------|------|
| `GET /api/demo` | 더미 데이터 (토큰 없이 테스트) |
| `GET /api/tgraph/{owner}/{repo}` | 실제 레포지토리 데이터 |

예시: `http://localhost:8000/api/tgraph/facebook/react?limit=5`

## 시각화 조작

- **마우스 드래그**: 회전
- **휠**: 줌
- **노드 호버**: 상세 정보
- **Z축**: 시간 (아래=과거, 위=현재)
