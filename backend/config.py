from pathlib import Path
from dotenv import load_dotenv # 환경변수 로드
import os

# .env 파일 경로 지정하여 로드
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_API_URL = "https://api.github.com/graphql"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GITHUB_TOKEN:
    print("Warning: GITHUB_TOKEN not set in .env file")

if not GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY not set in .env file (required for Q&A feature)")
