from pathlib import Path
from dotenv import load_dotenv # 환경변수 로드
import os

# .env 파일 경로 지정하여 로드
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_API_URL = "https://api.github.com/graphql"

if not GITHUB_TOKEN:
    print("⚠️  .env 파일에 GITHUB_TOKEN을 설정하세요")
