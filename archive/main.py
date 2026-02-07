"""
메인 실행 파일 및 스케줄러
카드 이벤트 자동 수집 시스템
"""

import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import sys
import os
from dotenv import load_dotenv

# Windows 콘솔 UTF-8 인코딩 설정
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 모듈 임포트
from scraper_v2 import SmartCardEventScraper
from analyzer import CardEventAnalyzer
from database import SessionLocal, init_db, insert_event

# 환경 변수 로드
load_dotenv()


class CardEventCollector:
    """카드 이벤트 수집 오케스트레이터"""
    
    def __init__(self):
        """초기화"""
        self.scraper = SmartCardEventScraper()
        self.analyzer = CardEventAnalyzer()
        self.db = SessionLocal()
        
        # 데이터베이스 초기화
        init_db()
    
    async def collect_and_analyze(self):
        """이벤트 수집 및 분석 전체 프로세스"""
        print("\n" + "="*70)
        print(f"🚀 카드 이벤트 수집 시작 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*70 + "\n")
        
        try:
            # 1단계: 웹 크롤링
            print("📡 1단계: 웹 크롤링 시작...")
            raw_events = await self.scraper.scrape_all_companies()
            print(f"✅ 크롤링 완료: 총 {len(raw_events)}개 이벤트 수집\n")
            
            if not raw_events:
                print("⚠️  수집된 이벤트가 없습니다. 크롤링을 종료합니다.")
                return
            
            # 2단계: AI 분석
            print("🤖 2단계: AI 분석 시작...")
            analyzed_events = self.analyzer.batch_analyze(raw_events, delay=2.0)
            print(f"✅ AI 분석 완료: {len(analyzed_events)}개 이벤트 분석 완료\n")
            
            # 3단계: 데이터베이스 저장
            print("💾 3단계: 데이터베이스 저장 시작...")
            saved_count = 0
            duplicate_count = 0
            
            for event_data in analyzed_events:
                success = insert_event(self.db, event_data)
                if success:
                    saved_count += 1
                else:
                    duplicate_count += 1
            
            print(f"✅ 저장 완료: {saved_count}개 신규 저장, {duplicate_count}개 중복 스킵\n")
            
            # 결과 요약
            print("="*70)
            print("📊 수집 결과 요약")
            print("="*70)
            print(f"  • 크롤링:    {len(raw_events)}개")
            print(f"  • AI 분석:   {len(analyzed_events)}개")
            print(f"  • 신규 저장: {saved_count}개")
            print(f"  • 중복 제외: {duplicate_count}개")
            print("="*70 + "\n")
            
            print(f"✅ 모든 작업이 완료되었습니다! ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})\n")
            
        except Exception as e:
            print(f"\n❌ 오류 발생: {e}")
            import traceback
            traceback.print_exc()
        
        finally:
            self.db.close()
    
    def close(self):
        """리소스 정리"""
        if self.db:
            self.db.close()


async def run_collection_job():
    """수집 작업 실행 (스케줄러용)"""
    collector = CardEventCollector()
    try:
        await collector.collect_and_analyze()
    finally:
        collector.close()


def start_scheduler():
    """스케줄러 시작 (매일 오전 8시 실행)"""
    scheduler = AsyncIOScheduler()
    
    # 매일 오전 8시에 실행
    scheduler.add_job(
        run_collection_job,
        CronTrigger(hour=8, minute=0),
        id='daily_collection',
        name='카드 이벤트 일일 수집',
        replace_existing=True
    )
    
    print("\n" + "="*70)
    print("⏰ 스케줄러 시작")
    print("="*70)
    print("  • 실행 시간: 매일 오전 8:00")
    print("  • 작업: 카드사 이벤트 수집 → AI 분석 → DB 저장")
    print("="*70 + "\n")
    
    scheduler.start()
    
    # 다음 실행 시간 표시
    next_run = scheduler.get_job('daily_collection').next_run_time
    print(f"📅 다음 실행 예정: {next_run.strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    try:
        # 이벤트 루프 유지
        asyncio.get_event_loop().run_forever()
    except (KeyboardInterrupt, SystemExit):
        print("\n⚠️  스케줄러가 종료되었습니다.")
        scheduler.shutdown()


async def run_once():
    """즉시 1회 실행 (테스트용)"""
    print("\n[TEST] 테스트 모드: 즉시 실행\n")
    collector = CardEventCollector()
    try:
        await collector.collect_and_analyze()
    finally:
        collector.close()


def print_menu():
    """메뉴 출력"""
    print("\n" + "="*70)
    print("🎯 카드 이벤트 인텔리전스 시스템")
    print("="*70)
    print("  1. 즉시 실행 (1회 수집)")
    print("  2. 스케줄러 시작 (매일 오전 8시 자동 실행)")
    print("  3. 종료")
    print("="*70)


async def main():
    """메인 함수"""
    
    # 환경 변수 체크
    if not os.getenv("GEMINI_API_KEY"):
        print("\n❌ 오류: GEMINI_API_KEY가 .env 파일에 설정되지 않았습니다.")
        print("   .env 파일을 생성하고 API 키를 입력해주세요.\n")
        return
    
    if len(sys.argv) > 1:
        # 명령줄 인수가 있는 경우
        if sys.argv[1] == '--once':
            await run_once()
        elif sys.argv[1] == '--schedule':
            start_scheduler()
        else:
            print("\n사용법:")
            print("  python main.py --once      # 즉시 1회 실행")
            print("  python main.py --schedule  # 스케줄러 시작")
            print("  python main.py             # 대화형 메뉴\n")
    else:
        # 대화형 모드
        while True:
            print_menu()
            choice = input("\n선택하세요 (1-3): ").strip()
            
            if choice == '1':
                await run_once()
                input("\n\n계속하려면 Enter를 누르세요...")
            elif choice == '2':
                start_scheduler()
                break
            elif choice == '3':
                print("\n👋 프로그램을 종료합니다.\n")
                break
            else:
                print("\n⚠️  잘못된 선택입니다. 다시 시도해주세요.")


if __name__ == "__main__":
    # Windows에서 Playwright는 ProactorEventLoop가 필요함
    # 기본값 그대로 사용 (Python 3.8+ 기본값: ProactorEventLoop)
    asyncio.run(main())
