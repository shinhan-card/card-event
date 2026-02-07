"""
Universal Crawler 통합 메인 실행 파일
완전 자동화된 카드 이벤트 수집 시스템
"""

import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import sys
import os
from dotenv import load_dotenv

# Windows 콘솔 UTF-8 인코딩
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from universal_crawler import UniversalCardEventCrawler
from database import init_db

load_dotenv()


async def run_universal_collection():
    """Universal Crawler로 전체 수집 실행"""
    print("\n" + "="*70)
    print(f"🚀 자동 수집 시작 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70 + "\n")
    
    # API 키 확인
    if not os.getenv("GEMINI_API_KEY"):
        print("[ERROR] GEMINI_API_KEY가 .env 파일에 설정되지 않았습니다.")
        return
    
    # 데이터베이스 초기화
    init_db()
    
    # Universal Crawler 실행
    crawler = UniversalCardEventCrawler()
    await crawler.run_and_save_to_db()
    
    print(f"\n✅ 모든 작업 완료! ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})\n")


def start_scheduler():
    """스케줄러 시작 (매일 오전 8시)"""
    scheduler = AsyncIOScheduler()
    
    scheduler.add_job(
        run_universal_collection,
        CronTrigger(hour=8, minute=0),
        id='universal_collection',
        name='Universal Card Event 자동 수집',
        replace_existing=True
    )
    
    print("\n" + "="*70)
    print("⏰ 스케줄러 시작")
    print("="*70)
    print("  실행 시간: 매일 오전 8:00")
    print("  작업: Universal Crawler (완전 자동화)")
    print("="*70 + "\n")
    
    scheduler.start()
    
    next_run = scheduler.get_job('universal_collection').next_run_time
    print(f"다음 실행: {next_run.strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    try:
        asyncio.get_event_loop().run_forever()
    except (KeyboardInterrupt, SystemExit):
        print("\n스케줄러 종료")
        scheduler.shutdown()


def print_menu():
    """메뉴"""
    print("\n" + "="*70)
    print("🎯 Universal Card Event Intelligence System")
    print("="*70)
    print("  1. 즉시 실행 (완전 자동화)")
    print("  2. 스케줄러 시작 (매일 오전 8시)")
    print("  3. 대시보드만 실행")
    print("  4. 종료")
    print("="*70)


async def main():
    """메인 함수"""
    
    if len(sys.argv) > 1:
        if sys.argv[1] == '--auto':
            await run_universal_collection()
        elif sys.argv[1] == '--schedule':
            start_scheduler()
        elif sys.argv[1] == '--dashboard':
            print("\n[INFO] 대시보드 실행: python app.py")
            print("       http://localhost:8000\n")
        else:
            print("\n사용법:")
            print("  python main_universal.py --auto       # 즉시 실행")
            print("  python main_universal.py --schedule   # 스케줄러")
            print("  python main_universal.py              # 대화형\n")
    else:
        # 대화형 모드
        while True:
            print_menu()
            choice = input("\n선택 (1-4): ").strip()
            
            if choice == '1':
                await run_universal_collection()
                input("\n\n계속하려면 Enter를 누르세요...")
            elif choice == '2':
                start_scheduler()
                break
            elif choice == '3':
                os.system("start cmd /k venv\\Scripts\\python.exe app.py")
                print("\n[INFO] 대시보드가 새 창에서 실행됩니다.")
                print("       http://localhost:8000\n")
                input("계속하려면 Enter를 누르세요...")
            elif choice == '4':
                print("\n프로그램 종료\n")
                break
            else:
                print("\n잘못된 선택입니다.")


if __name__ == "__main__":
    asyncio.run(main())
