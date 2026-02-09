"""
통합 파이프라인.
수집(ingest) -> 상세추출(extract) -> 정규화(normalize) -> 인사이트(insight)
각 단계를 jobs 테이블로 추적한다.
"""

import asyncio
import sys
import os
import logging
from datetime import datetime
from typing import Optional

# 프로젝트 루트를 path에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database as db
from modules.connectors import CONNECTORS
from modules.extraction import extract_detail
from modules.normalization import normalize_extracted
from modules.insights import generate_hybrid_insight

logger = logging.getLogger(__name__)

# 전체 파이프라인 진행 상태 (GET /api/pipeline/progress에서 조회)
_PIPELINE_PROGRESS = {
    "running": False,
    "phase": "",
    "total": 0,
    "processed": 0,
    "succeeded": 0,
    "failed": 0,
    "ingest_done": 0,   # 수집 완료한 카드사 수
    "ingest_total": 0,  # 수집 대상 카드사 수 (4)
    "ingest_result": None,
    "extract_result": None,
    "error": None,
}


# 마지막 완료 결과 (동작 확인용)
_PIPELINE_LAST_FINISHED = {"at": None, "ingest_result": None, "extract_result": None, "error": None}

# 마지막 수집 실행 시각 (수집만 버튼 또는 run_ingest 완료 시 갱신)
_LAST_INGEST_AT = None
_LAST_INGEST_RESULT = None  # {"ingested": N, "skipped": M, "failed_companies": []}


def get_pipeline_progress():
    """현재 파이프라인 진행 상태 + 마지막 실행 결과 복사본 반환."""
    out = dict(_PIPELINE_PROGRESS)
    out["last_finished"] = dict(_PIPELINE_LAST_FINISHED)
    out["last_ingest_at"] = _LAST_INGEST_AT
    out["last_ingest_result"] = _LAST_INGEST_RESULT
    return out


def set_full_extract_started():
    """전체 추출 요청 직후, 태스크가 돌기 전에 progress를 추출 중으로 세팅. 첫 폴링부터 '추출 중'으로 보이게 함."""
    global _PIPELINE_PROGRESS
    _PIPELINE_PROGRESS.update({
        "running": True,
        "phase": "extract",
        "total": 0,
        "processed": 0,
        "succeeded": 0,
        "failed": 0,
        "ingest_done": 0,
        "ingest_total": 0,
        "ingest_result": None,
        "extract_result": None,
        "error": None,
    })


async def _get_stealth_page():
    """stealth가 적용된 Playwright page 반환. 호출자가 browser.close() 책임. 2.x만 사용(stealth_async 미사용)."""
    from playwright.async_api import async_playwright
    try:
        from playwright_stealth import Stealth
    except ImportError:
        Stealth = None

    pw = await async_playwright().start()
    browser = await pw.chromium.launch(headless=True)
    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        viewport={"width": 1920, "height": 1080},
    )
    if Stealth is not None:
        await Stealth().apply_stealth_async(context)
    page = await context.new_page()
    return pw, browser, page


# ===========================================================================
# 1단계: 수집 (ingest)
# ===========================================================================

async def run_ingest(company: str = None, limit_per_company: int = 200) -> dict:
    """
    카드사별 이벤트 목록 수집 -> DB 저장.
    company가 None이면 전사 수집.
    """
    targets = {company: CONNECTORS[company]} if company and company in CONNECTORS else CONNECTORS
    result = {"ingested": 0, "skipped": 0, "failed_companies": []}
    _PIPELINE_PROGRESS["ingest_total"] = len(targets)
    _PIPELINE_PROGRESS["ingest_done"] = 0

    session = db.SessionLocal()
    pw = browser = page = None
    try:
        pw, browser, page = await _get_stealth_page()

        for idx, (comp_name, ConnectorClass) in enumerate(targets.items(), 1):
            job_id = db.create_job(session, "ingest", company=comp_name)
            db.update_job(session, job_id, "running")
            try:
                connector = ConnectorClass()
                raw_events = await connector.crawl(page)
                print(f"[수집] {comp_name}: {len(raw_events)}건 크롤링됨")

                count = 0
                for raw in raw_events[:limit_per_company]:
                    eid = db.insert_event(session, raw.to_dict())
                    if eid:
                        count += 1
                result["ingested"] += count
                result["skipped"] += len(raw_events) - count
                db.update_job(session, job_id, "success")
                _PIPELINE_PROGRESS["ingest_done"] = idx
                print(f"[수집] {comp_name}: {count}건 신규 저장")
            except Exception as e:
                db.update_job(session, job_id, "failed", error=str(e)[:500])
                result["failed_companies"].append(comp_name)
                _PIPELINE_PROGRESS["ingest_done"] = idx
                print(f"[수집] {comp_name} 실패: {str(e)[:150]}")
    finally:
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
        session.close()

    global _LAST_INGEST_AT, _LAST_INGEST_RESULT
    _LAST_INGEST_AT = datetime.now().isoformat()
    _LAST_INGEST_RESULT = dict(result)
    return result


# ===========================================================================
# 2단계: 상세 추출 + 정규화 + 인사이트 (extract -> normalize -> insight)
# ===========================================================================

async def run_extract_and_enrich(limit: int = 20, on_progress=None) -> dict:
    """
    미추출 이벤트에 대해 상세추출 -> 정규화 -> 인사이트 생성.
    on_progress(processed, total, succeeded, failed) 호출로 진행률 알림.
    """
    session = db.SessionLocal()
    result = {"processed": 0, "succeeded": 0, "failed": 0, "gemini_enriched": 0}

    try:
        pending = db.get_events_pending_extraction(session, limit=limit)
        result["processed"] = total = len(pending)
        if on_progress:
            on_progress(0, total, 0, 0)
        if not pending:
            print("[파이프라인] 미추출 이벤트 없음")
            return result

        print(f"[파이프라인] 미추출 {len(pending)}건 추출+인사이트 시작")

        for event in pending:
            if not event.url or not event.url.startswith("http"):
                result["failed"] += 1
                if on_progress:
                    on_progress(result["succeeded"] + result["failed"], total, result["succeeded"], result["failed"])
                continue

            # 잠금된 이벤트는 재추출 스킵
            if db.is_event_locked(session, event.id):
                result["succeeded"] += 1  # 잠금 건은 성공으로 카운트 (이미 확정됨)
                if on_progress:
                    on_progress(result["succeeded"] + result["failed"], total, result["succeeded"], result["failed"])
                # job에 스킵 사유 기록
                skip_job_id = db.create_job(session, "extract", event_id=event.id, company=event.company)
                db.update_job(session, skip_job_id, "success", error="skipped (locked)")
                print(f"[파이프라인] SKIP (locked) id={event.id}")
                continue

            job_id = db.create_job(session, "extract", event_id=event.id, company=event.company)
            db.update_job(session, job_id, "running")

            try:
                # 상세 추출
                extracted = await extract_detail(event.url, wait_sec=3)

                # 정규화
                update_data = normalize_extracted(extracted, existing_event=event)

                # 인사이트 (하이브리드)
                insight_data, source = generate_hybrid_insight(extracted, company=event.company or "")
                if source == "gemini":
                    result["gemini_enriched"] += 1
                    # Gemini 부가 필드 반영
                    if insight_data.get("one_line_summary"):
                        update_data["one_line_summary"] = insight_data["one_line_summary"]
                    if insight_data.get("category"):
                        update_data["category"] = insight_data["category"]
                    if insight_data.get("threat_level"):
                        update_data["threat_level"] = insight_data["threat_level"]

                # 이벤트 업데이트
                # marketing_insights에 통합 저장 (하위호환)
                update_data["marketing_insights"] = insight_data
                db.update_event(session, event.id, update_data)

                # 정규화 테이블 저장
                mc = extracted.get("marketing_content") or {}
                if mc:
                    db.save_sections(session, event.id, mc)
                db.save_insight(session, event.id, insight_data, source=source)

                # 스냅샷 저장
                db.save_snapshot(
                    session, event.id,
                    raw_text=extracted.get("raw_text"),
                    extracted_json=extracted,
                    latency_ms=extracted.get("extraction_latency_ms"),
                )

                db.update_job(session, job_id, "success")
                result["succeeded"] += 1
                if on_progress:
                    on_progress(result["succeeded"] + result["failed"], total, result["succeeded"], result["failed"])
                print(f"[파이프라인] OK id={event.id} src={source} {(event.title or '')[:40]}")

            except Exception as e:
                db.update_job(session, job_id, "failed", error=str(e)[:500])
                result["failed"] += 1
                if on_progress:
                    on_progress(result["succeeded"] + result["failed"], total, result["succeeded"], result["failed"])
                print(f"[파이프라인] FAIL id={event.id}: {str(e)[:120]}")

    finally:
        session.close()

    print(f"[파이프라인] 완료: 처리={result['processed']} 성공={result['succeeded']} "
          f"실패={result['failed']} gemini={result['gemini_enriched']}")
    return result


# ===========================================================================
# 전체 파이프라인
# ===========================================================================

async def run_full_pipeline(company: str = None, extract_limit: int = 500):
    """이미 수집된 이벤트 중 미추출 건만 상세 추출+인사이트 실행. 수집(ingest)은 하지 않음."""
    global _PIPELINE_PROGRESS
    _PIPELINE_PROGRESS.update({
        "running": True,
        "phase": "extract",
        "total": 0,
        "processed": 0,
        "succeeded": 0,
        "failed": 0,
        "ingest_done": 0,
        "ingest_total": 0,
        "ingest_result": None,
        "extract_result": None,
        "error": None,
    })
    try:
        print("=" * 60)
        print(f"[전체 추출] 시작 (수집 생략, 미추출만 상세 추출) {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        print("=" * 60)

        def on_progress(processed, total, succeeded, failed):
            _PIPELINE_PROGRESS["total"] = total
            _PIPELINE_PROGRESS["processed"] = processed
            _PIPELINE_PROGRESS["succeeded"] = succeeded
            _PIPELINE_PROGRESS["failed"] = failed

        extract_result = await run_extract_and_enrich(limit=extract_limit, on_progress=on_progress)
        _PIPELINE_PROGRESS["extract_result"] = extract_result

        print("=" * 60)
        print(f"[전체 추출] 완료 - 추출 {extract_result['succeeded']}건, Gemini {extract_result['gemini_enriched']}건")
        print("=" * 60)
        return {"ingest": None, "extract": extract_result}
    except Exception as e:
        _PIPELINE_PROGRESS["error"] = str(e)[:500]
        _PIPELINE_LAST_FINISHED["at"] = datetime.now().isoformat()
        _PIPELINE_LAST_FINISHED["error"] = str(e)[:500]
        _PIPELINE_LAST_FINISHED["ingest_result"] = _PIPELINE_PROGRESS.get("ingest_result")
        _PIPELINE_LAST_FINISHED["extract_result"] = _PIPELINE_PROGRESS.get("extract_result")
        raise
    finally:
        _PIPELINE_PROGRESS["running"] = False
        if _PIPELINE_PROGRESS.get("error") is None:
            _PIPELINE_LAST_FINISHED["at"] = datetime.now().isoformat()
            _PIPELINE_LAST_FINISHED["ingest_result"] = _PIPELINE_PROGRESS.get("ingest_result")
            _PIPELINE_LAST_FINISHED["extract_result"] = _PIPELINE_PROGRESS.get("extract_result")
            _PIPELINE_LAST_FINISHED["error"] = None
