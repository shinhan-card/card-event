"""
DB 마이그레이션: marketing_content, marketing_insights 컬럼 추가
"""

from sqlalchemy import text
from database import engine

def migrate():
    """기존 DB에 marketing_content, marketing_insights 컬럼 추가"""
    with engine.connect() as conn:
        try:
            # SQLite는 컬럼 존재 여부 확인이 복잡하므로, 없으면 추가 시도
            conn.execute(text("ALTER TABLE events ADD COLUMN marketing_content TEXT"))
            print("[OK] marketing_content 컬럼 추가됨")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("[SKIP] marketing_content 컬럼이 이미 존재함")
            else:
                print(f"[WARN] marketing_content 추가 실패: {e}")
        
        try:
            conn.execute(text("ALTER TABLE events ADD COLUMN marketing_insights TEXT"))
            print("[OK] marketing_insights 컬럼 추가됨")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("[SKIP] marketing_insights 컬럼이 이미 존재함")
            else:
                print(f"[WARN] marketing_insights 추가 실패: {e}")
        
        conn.commit()
    print("\n[완료] 마이그레이션 완료\n")

if __name__ == "__main__":
    migrate()
