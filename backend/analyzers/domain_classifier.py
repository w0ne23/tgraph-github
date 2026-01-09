"""
backend/analyzers/domain_classifier.py
파일 경로와 import 분석을 통한 도메인 자동 분류
"""
import re
from collections import Counter
from typing import List, Dict

DOMAIN_PATTERNS = {
    "backend_api": [
        r"/api/", r"/routes/", r"/endpoints/",
        r"server\.py$", r"main\.py$", r"app\.py$",
        "fastapi", "flask", "django", "express"
    ],
    "frontend_ui": [
        r"/components/", r"/views/", r"/pages/",
        r"\.tsx$", r"\.jsx$", r"\.vue$",
        "react", "vue", "angular", "svelte"
    ],
    "database": [
        r"/models/", r"/schemas/", r"/migrations/",
        r"schema\.py$", r"models\.py$",
        "sqlalchemy", "prisma", "mongoose", "sequelize"
    ],
    "visualization": [
        r"/viz/", r"/charts/", r"/graph/",
        "d3", "threejs", "plotly", "recharts", "chartjs"
    ],
    "authentication": [
        r"/auth/", r"/security/",
        "jwt", "oauth", "passport", "auth0"
    ],
}

def extract_imports(content: str, file_ext: str) -> List[str]:
    """파일 내용에서 import 문 추출"""
    imports = []
    
    if file_ext in [".py"]:
        # Python imports
        imports = re.findall(r'(?:from|import)\s+([\w\.]+)', content[:1000])  # 첫 1000자만 분석
    elif file_ext in [".js", ".jsx", ".ts", ".tsx"]:
        # JavaScript/TypeScript imports
        imports = re.findall(r'import.*from\s+[\'"](.+?)[\'"]', content[:1000])
    
    return [imp.lower() for imp in imports]

def classify_file(file_path: str, imports: List[str]) -> str:
    """파일 경로와 import를 분석하여 도메인 분류"""
    scores = Counter()
    file_path_lower = file_path.lower()
    
    for domain, patterns in DOMAIN_PATTERNS.items():
        for pattern in patterns:
            # 경로 패턴 매칭
            if re.search(pattern, file_path_lower, re.IGNORECASE):
                scores[domain] += 2
            
            # Import 패턴 매칭
            if any(re.search(pattern, imp, re.IGNORECASE) for imp in imports):
                scores[domain] += 1
    
    # 가장 높은 점수의 도메인 반환
    if scores:
        return scores.most_common(1)[0][0]
    return "uncategorized"

def classify_multiple_files(files_data: List[Dict]) -> List[Dict]:
    """여러 파일의 도메인을 일괄 분류"""
    for file_data in files_data:
        imports = extract_imports(
            file_data.get("content", ""),
            file_data.get("extension", "")
        )
        file_data["domain"] = classify_file(file_data["path"], imports)
        file_data["imports"] = imports[:10]  # 상위 10개만 저장
    
    return files_data