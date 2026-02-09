"""
FastAPI 백엔드 — 경쟁사 카드 이벤트 인텔리전스 시스템
"""

import json
import logging
import sys
import os

# Windows cp949 콘솔에서 유니코드(— 등) 출력 시 인코딩 오류 방지
if getattr(sys.stdout, "reconfigure", None) and (sys.stdout.encoding or "").upper().startswith("CP949"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from collections import Counter, defaultdict
from contextlib import asynccontextmanager
from datetime import datetime, date, timedelta
from threading import Lock

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
import uvicorn

import database as db

logger = logging.getLogger(__name__)
COMPANY_BRIEF_TTL_SEC = 600
QUAL_COMPARISON_TTL_SEC = 900
_COMPANY_BRIEF_CACHE = {}
_QUAL_COMPARISON_CACHE = None
_COMPANY_BRIEF_LOCK = Lock()

# 간단한 메모리 캐시 (벤치마크/매트릭스 등)
_SIMPLE_CACHE = {}
_SIMPLE_CACHE_TTL = 300  # 5분


def _cached(key, builder, ttl=None):
    """간단한 메모리 캐시. builder()의 결과를 TTL만큼 캐시."""
    now = datetime.now()
    entry = _SIMPLE_CACHE.get(key)
    if entry and (now - entry["at"]).total_seconds() <= (ttl or _SIMPLE_CACHE_TTL):
        return entry["data"]
    data = builder()
    _SIMPLE_CACHE[key] = {"data": data, "at": now}
    return data


# ===========================================================================
# 유틸
# ===========================================================================

def _pjson(value):
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value.strip()) if value.strip() else None
        except Exception:
            return None
    return None


def _ratio(n, d):
    return round(n / d * 100) if d > 0 else 0


# ===========================================================================
# 분석 함수
# ===========================================================================

def build_company_overview(session: Session) -> dict:
    events = session.query(db.CardEvent).all()
    by = defaultdict(lambda: {
        "company": "", "collected_count": 0, "visible_count": 0,
        "active_count": 0, "ended_count": 0, "extracted_count": 0,
        "insight_count": 0,
        "benefit_level_dist": {"높음": 0, "중상": 0, "보통": 0, "낮음": 0},
        "_pts": Counter(), "_str": Counter(), "_bsum": 0.0, "_bcnt": 0,
    })
    score_map = {"높음": 4.0, "중상": 3.0, "보통": 2.0, "낮음": 1.0}
    today = date.today()
    for ev in events:
        c = (ev.company or "기타").strip()
        it = by[c]; it["company"] = c; it["collected_count"] += 1
        if db.has_meaningful_info(ev):
            it["visible_count"] += 1
            if ev.period_end and ev.period_end >= today:
                it["active_count"] += 1
            elif ev.period_end:
                it["ended_count"] += 1
        if _pjson(ev.marketing_content):
            it["extracted_count"] += 1
        ins = _pjson(ev.marketing_insights)
        if ins:
            it["insight_count"] += 1
            lv = ins.get("benefit_level") or ins.get("혜택_수준")
            if lv in it["benefit_level_dist"]:
                it["benefit_level_dist"][lv] += 1
                it["_bsum"] += score_map.get(lv, 0); it["_bcnt"] += 1
            for p in (ins.get("competitive_points") or ins.get("경쟁력_포인트") or []):
                if p: it["_pts"][str(p).strip()] += 1
            for s in (ins.get("promo_strategies") or ins.get("프로모션_전략") or []):
                if s: it["_str"][str(s).strip()] += 1

    rows = []
    for c, it in by.items():
        col = it["collected_count"]
        rows.append({
            "company": c, **{k: it[k] for k in ("collected_count", "visible_count", "active_count", "ended_count", "extracted_count", "insight_count", "benefit_level_dist")},
            "extraction_rate": _ratio(it["extracted_count"], col),
            "insight_rate": _ratio(it["insight_count"], col),
            "avg_benefit_score": round(it["_bsum"] / it["_bcnt"], 2) if it["_bcnt"] else 0,
            "top_competitive_points": [k for k, _ in it["_pts"].most_common(3)],
            "top_promo_strategies": [k for k, _ in it["_str"].most_common(3)],
        })
    rows.sort(key=lambda x: (-x["collected_count"], x["company"]))

    totals = {}
    for k in ("collected_count", "visible_count", "active_count", "ended_count", "extracted_count", "insight_count"):
        totals[k.replace("_count", "_total")] = sum(r[k] for r in rows)
    totals["extraction_rate"] = _ratio(totals.get("extracted_total", 0), totals.get("collected_total", 0))
    totals["insight_rate"] = _ratio(totals.get("insight_total", 0), totals.get("collected_total", 0))

    return {"generated_at": datetime.now().isoformat(), "totals": totals, "companies": rows}


def build_trends(session: Session, from_date: date, to_date: date) -> dict:
    events = session.query(db.CardEvent).filter(
        db.CardEvent.period_start.isnot(None)
    ).all()
    by_week = defaultdict(lambda: {"started": 0, "ended": 0})
    for ev in events:
        if ev.period_start and from_date <= ev.period_start <= to_date:
            wk = ev.period_start.strftime("%Y-W%W")
            by_week[wk]["started"] += 1
        if ev.period_end and from_date <= ev.period_end <= to_date:
            wk = ev.period_end.strftime("%Y-W%W")
            by_week[wk]["ended"] += 1
    return {"from": from_date.isoformat(), "to": to_date.isoformat(),
            "weeks": dict(sorted(by_week.items()))}


def build_strategy_map(session: Session) -> dict:
    """카드사 x objective_tags 히트맵 데이터"""
    rows = session.query(db.EventInsight).all()
    heatmap = defaultdict(lambda: defaultdict(int))
    for row in rows:
        ev = row.event
        if not ev:
            continue
        company = (ev.company or "기타").strip()
        tags = []
        try:
            tags = json.loads(row.objective_tags) if row.objective_tags else []
        except Exception:
            pass
        for tag in tags:
            heatmap[company][tag] += 1
    return {"heatmap": {k: dict(v) for k, v in heatmap.items()}}


def build_benefit_benchmark(session: Session) -> dict:
    """카드사별 혜택 금액/비율 분포"""
    events = session.query(db.CardEvent).filter(
        db.CardEvent.benefit_amount_won.isnot(None)
    ).all()
    by_company = defaultdict(list)
    for ev in events:
        c = (ev.company or "기타").strip()
        by_company[c].append({
            "amount_won": ev.benefit_amount_won,
            "pct": ev.benefit_pct,
            "title": ev.title,
            "category": ev.category,
        })
    summary = {}
    for c, items in by_company.items():
        amounts = [i["amount_won"] for i in items if i["amount_won"]]
        pcts = [i["pct"] for i in items if i["pct"]]
        summary[c] = {
            "count": len(items),
            "avg_amount": round(sum(amounts) / len(amounts)) if amounts else 0,
            "max_amount": max(amounts) if amounts else 0,
            "avg_pct": round(sum(pcts) / len(pcts), 1) if pcts else 0,
            "max_pct": max(pcts) if pcts else 0,
            "items": items[:20],
        }
    return {"companies": summary}


def build_compare_matrix(session: Session, axis: str = "category") -> dict:
    """카드사 x 축 교차 건수 매트릭스. axis: category/benefit_type/target/strategy"""
    events = session.query(db.CardEvent).all()
    heatmap = defaultdict(lambda: defaultdict(int))

    if axis in ("category", "benefit_type"):
        for ev in events:
            if not db.has_meaningful_info(ev):
                continue
            company = (ev.company or "기타").strip()
            val = (getattr(ev, axis, None) or "").strip()
            if val:
                heatmap[company][val] += 1
    elif axis in ("target", "strategy"):
        rows = session.query(db.EventInsight).all()
        field = "target_tags" if axis == "target" else "objective_tags"
        for row in rows:
            ev = row.event
            if not ev:
                continue
            company = (ev.company or "기타").strip()
            raw = getattr(row, field, None)
            tags = []
            try:
                tags = json.loads(raw) if raw else []
            except Exception:
                pass
            for tag in tags:
                if tag:
                    heatmap[company][tag] += 1

    return {
        "axis": axis,
        "heatmap": {k: dict(v) for k, v in heatmap.items()},
    }


def build_shinhan_gap(session: Session) -> dict:
    """신한이 미대응이지만 경쟁사에 있는 카테고리 갭 분석."""
    events = [e for e in session.query(db.CardEvent).all() if db.has_meaningful_info(e)]
    today = date.today()
    active = [e for e in events if e.period_end and e.period_end >= today]

    cat_company = defaultdict(lambda: defaultdict(list))
    for ev in active:
        cat = (ev.category or "").strip()
        co = (ev.company or "").strip()
        if cat and co:
            cat_company[cat][co].append({
                "id": ev.id, "title": ev.title, "benefit_value": ev.benefit_value,
                "period": ev.period, "company": co,
            })

    shinhan_key = "신한카드"
    competitors = [c for c in set(ev.company for ev in active if ev.company) if c != shinhan_key]

    gaps = []
    for cat, by_co in cat_company.items():
        sh_count = len(by_co.get(shinhan_key, []))
        comp_events = []
        for co in competitors:
            comp_events.extend(by_co.get(co, []))
        if sh_count == 0 and comp_events:
            gaps.append({
                "category": cat,
                "competitor_count": len(comp_events),
                "competitor_events": comp_events[:10],
            })

    gaps.sort(key=lambda g: -g["competitor_count"])
    return {"gaps": gaps, "total_active": len(active), "shinhan_active": sum(1 for e in active if e.company == shinhan_key)}


def _build_shinhan_gap_trend(session: Session, num_weeks: int = 8) -> dict:
    """주차별 신한 공백 카테고리 수 추세."""
    from datetime import timedelta as td
    events = [e for e in session.query(db.CardEvent).all() if db.has_meaningful_info(e)]
    today = date.today()
    shinhan_key = "신한카드"
    result_weeks = []
    gap_counts = []
    new_gap_counts = []
    resolved_gap_counts = []
    prev_gaps = set()

    for w in range(num_weeks - 1, -1, -1):
        ref = today - td(days=w * 7)
        week_label = ref.strftime("%Y-W%W")
        # 해당 시점 기준 활성 이벤트
        active = [e for e in events if e.period_start and e.period_end and e.period_start <= ref <= e.period_end]
        cat_co = defaultdict(set)
        for ev in active:
            cat = (ev.category or "").strip()
            co = (ev.company or "").strip()
            if cat and co:
                cat_co[cat].add(co)
        # 신한 공백 = 경쟁사 있지만 신한 없는 카테고리
        current_gaps = set()
        for cat, cos in cat_co.items():
            has_competitor = any(c != shinhan_key for c in cos)
            has_shinhan = shinhan_key in cos
            if has_competitor and not has_shinhan:
                current_gaps.add(cat)
        new_gaps = current_gaps - prev_gaps
        resolved = prev_gaps - current_gaps
        result_weeks.append(week_label)
        gap_counts.append(len(current_gaps))
        new_gap_counts.append(len(new_gaps))
        resolved_gap_counts.append(len(resolved))
        prev_gaps = current_gaps

    return {
        "weeks": result_weeks,
        "gap_counts": gap_counts,
        "new_gap_counts": new_gap_counts,
        "resolved_gap_counts": resolved_gap_counts,
        "current_gaps": sorted(prev_gaps),
        "generated_at": datetime.now().isoformat(),
    }


def _build_company_snapshot(company: str, overview_row: dict, events: List[db.CardEvent]) -> dict:
    status_counter = Counter((ev.status or "unknown") for ev in events)
    category_counter = Counter((ev.category or "미분류").strip() for ev in events if (ev.category or "").strip())
    amounts = [ev.benefit_amount_won for ev in events if ev.benefit_amount_won]
    pcts = [ev.benefit_pct for ev in events if ev.benefit_pct]
    high_threat_count = sum(1 for ev in events if (ev.threat_level or "").strip().lower() == "high")
    recent_events = sorted(events, key=lambda e: e.created_at or datetime.min, reverse=True)[:5]
    return {
        "company": company,
        "collected_count": overview_row.get("collected_count", 0),
        "visible_count": overview_row.get("visible_count", 0),
        "active_count": overview_row.get("active_count", 0),
        "ended_count": overview_row.get("ended_count", 0),
        "extracted_count": overview_row.get("extracted_count", 0),
        "insight_count": overview_row.get("insight_count", 0),
        "extraction_rate": overview_row.get("extraction_rate", 0),
        "insight_rate": overview_row.get("insight_rate", 0),
        "avg_benefit_score": overview_row.get("avg_benefit_score", 0),
        "top_competitive_points": overview_row.get("top_competitive_points", []),
        "top_promo_strategies": overview_row.get("top_promo_strategies", []),
        "high_threat_count": high_threat_count,
        "status_mix": dict(status_counter),
        "top_categories": [k for k, _ in category_counter.most_common(3)],
        "avg_benefit_amount_won": round(sum(amounts) / len(amounts)) if amounts else 0,
        "avg_benefit_pct": round(sum(pcts) / len(pcts), 1) if pcts else 0,
        "recent_events": [
            {
                "id": ev.id,
                "title": ev.title,
                "category": ev.category,
                "benefit_value": ev.benefit_value,
                "period": ev.period,
                "status": ev.status,
                "threat_level": ev.threat_level,
            }
            for ev in recent_events
        ],
    }


def _make_snapshot_key(snapshot: dict) -> str:
    try:
        return json.dumps(snapshot, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    except Exception:
        return str(snapshot)


def _rule_company_brief(company: str, snapshot: dict) -> dict:
    active = int(snapshot.get("active_count") or 0)
    top_categories = snapshot.get("top_categories") or []
    top_points = snapshot.get("top_competitive_points") or []
    top_strategies = snapshot.get("top_promo_strategies") or []
    avg_pct = snapshot.get("avg_benefit_pct") or 0
    avg_amount = snapshot.get("avg_benefit_amount_won") or 0

    category_text = ", ".join(top_categories[:2]) if top_categories else "다양한 카테고리"
    strategy_text = ", ".join(top_strategies[:2]) if top_strategies else "일반 프로모션"

    overview = (
        f"{company}은 현재 {active}건의 이벤트를 진행 중이며, "
        f"{category_text} 카테고리에 집중하고 있습니다. "
        f"주요 전략은 {strategy_text} 중심입니다."
    )

    benefit_text = []
    if avg_amount:
        benefit_text.append(f"평균 {int(avg_amount):,}원")
    if avg_pct:
        benefit_text.append(f"평균 {avg_pct}%")
    avg_benefit_assessment = " / ".join(benefit_text) + " 수준" if benefit_text else "혜택 데이터 부족"

    points_text = ", ".join(str(x) for x in top_points[:2]) if top_points else ""
    shinhan_threat = points_text if points_text else f"{category_text} 영역에서 경쟁 심화"

    return {
        "overview": overview[:150],
        "key_strategy": strategy_text,
        "strongest_categories": top_categories[:3],
        "avg_benefit_assessment": avg_benefit_assessment,
        "target_focus": "전반적 고객층 대상",
        "shinhan_threat": shinhan_threat[:50],
        "recommended_counter": f"{category_text} 카테고리에서 차별화된 혜택 구조 설계가 필요합니다.",
        # 하위호환
        "focus_points": top_categories[:3],
        "watchouts": [shinhan_threat[:50]],
        "action_hint": f"{category_text} 카테고리에서 차별화된 혜택 구조 설계가 필요합니다.",
    }


def _score_to_level(score: float) -> str:
    if score >= 85:
        return "매우 높음"
    if score >= 65:
        return "높음"
    if score >= 45:
        return "중간"
    if score >= 25:
        return "낮음"
    return "매우 낮음"


def _days_between(ev: db.CardEvent) -> int:
    if ev.period_start and ev.period_end:
        try:
            return max(0, (ev.period_end - ev.period_start).days + 1)
        except Exception:
            return 0
    return 0


def _event_blob(ev: db.CardEvent) -> str:
    return " ".join(
        [
            ev.title or "",
            ev.category or "",
            ev.benefit_value or "",
            ev.conditions or "",
            ev.target_segment or "",
            ev.one_line_summary or "",
            ev.raw_text[:600] if ev.raw_text else "",
        ]
    )


def _rule_company_dimension_levels(snapshot: dict, events: List[db.CardEvent]) -> dict:
    total = max(len(events), 1)
    text_blobs = [_event_blob(ev) for ev in events]

    high_value_kw = ["자동차", "오토", "여행", "항공", "호텔", "렌터카", "해외", "프리미엄", "골프", "할부", "무이자"]
    recurring_kw = ["정기", "자동이체", "생활요금", "보험", "통신", "구독", "멤버십", "리텐션", "재이용", "재구매", "매월"]
    repeat_kw = ["상시", "매월", "매주", "정기", "시즌", "연장", "재오픈", "상설"]

    high_value_hit = sum(1 for t in text_blobs if any(k in t for k in high_value_kw))
    recurring_hit = sum(1 for t in text_blobs if any(k in t for k in recurring_kw))
    repeat_hit = sum(1 for t in text_blobs if any(k in t for k in repeat_kw))
    long_period_hit = sum(1 for ev in events if _days_between(ev) >= 60)

    avg_amount = float(snapshot.get("avg_benefit_amount_won") or 0)
    avg_pct = float(snapshot.get("avg_benefit_pct") or 0)
    avg_benefit_score = float(snapshot.get("avg_benefit_score") or 0)
    snapshot_text = " ".join(
        [
            " ".join(snapshot.get("top_categories") or []),
            " ".join(snapshot.get("top_competitive_points") or []),
            " ".join(snapshot.get("top_promo_strategies") or []),
        ]
    )
    recurring_hint = 1 if any(k in snapshot_text for k in ["리텐", "정기", "구독", "생활요금", "보험", "통신"]) else 0
    repeat_hint = 1 if any(k in snapshot_text for k in ["상시", "매월", "반복", "정기", "연장"]) else 0
    visible_count = float(snapshot.get("visible_count") or 0)
    active_count = float(snapshot.get("active_count") or 0)
    active_ratio = (active_count / visible_count) if visible_count > 0 else 0.0

    category_counter = Counter((ev.category or "미분류").strip() for ev in events if (ev.category or "").strip())
    unique_categories = len(category_counter)
    entropy = 0.0
    if unique_categories > 1:
        import math
        probs = [cnt / len(events) for cnt in category_counter.values() if cnt > 0]
        raw_entropy = -sum(p * math.log(p) for p in probs if p > 0)
        entropy = raw_entropy / math.log(unique_categories)

    high_value_score = min(
        100.0,
        (high_value_hit / total) * 65
        + min(22.0, avg_amount / 18000.0)
        + min(13.0, avg_pct * 0.9)
        + min(8.0, avg_benefit_score * 2.0),
    )
    recurring_score = min(
        100.0,
        (recurring_hit / total) * 80
        + (long_period_hit / total) * 20
        + recurring_hint * 18,
    )
    diversity_score = min(
        100.0,
        unique_categories * 10
        + entropy * 45
        + min(15.0, len(events) * 0.8),
    )
    repeatability_score = min(
        100.0,
        (repeat_hit / total) * 70
        + (long_period_hit / total) * 30
        + repeat_hint * 15
        + min(10.0, active_ratio * 12.0),
    )

    return {
        "고가 소비 비중(자동차·여행·할부)": _score_to_level(high_value_score),
        "반복·계약 소비 비중(생활요금·보험·리텐션)": _score_to_level(recurring_score),
        "카테고리 분산도(소비+관계 전체)": _score_to_level(diversity_score),
        "이벤트 반복성(월/상시 구조)": _score_to_level(repeatability_score),
    }


def _build_rule_qualitative_comparison(companies_payload: List[dict], companies: List[str]) -> dict:
    rows = []
    fixed_metrics = [
        "고가 소비 비중(자동차·여행·할부)",
        "반복·계약 소비 비중(생활요금·보험·리텐션)",
        "카테고리 분산도(소비+관계 전체)",
        "이벤트 반복성(월/상시 구조)",
    ]
    level_map_by_company = {}
    for item in companies_payload:
        company = item["company"]
        level_map_by_company[company] = _rule_company_dimension_levels(item["snapshot"], item["events"])

    for metric in fixed_metrics:
        values = {c: (level_map_by_company.get(c, {}) or {}).get(metric, "중간") for c in companies}
        rows.append({
            "metric": metric,
            "values": values,
            "reason": "이벤트 카테고리/기간/혜택 지표 기반 규칙 추정",
        })

    summary = [
        "상위 수준 카드사는 고가·반복 소비 축에서 동시에 우위일 가능성이 큽니다.",
        "카테고리 분산도가 높을수록 월간 경쟁 대응 포트폴리오가 넓어집니다.",
        "반복성이 높은 카드사는 상시/정기형 리텐션 목적 이벤트 비중이 높은 편입니다.",
    ]
    return {
        "title": "카드 4사 비교 요약",
        "rows": rows,
        "summary": summary,
    }


def _company_order_key(company: str) -> tuple:
    preferred = ["신한카드", "KB국민카드", "삼성카드", "현대카드"]
    if company in preferred:
        return (0, preferred.index(company))
    return (1, company)


# ===========================================================================
# Lifespan
# ===========================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from modules.pipeline import run_extract_and_enrich

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        run_extract_and_enrich,
        "interval", hours=6,
        id="extract_enrich",
        kwargs={"limit": 20},
        next_run_time=datetime.now() + timedelta(seconds=30),
    )
    scheduler.start()
    print("[스케줄러] 파이프라인: 30초 후 첫 실행, 이후 6시간마다")
    sys.stdout.flush()
    yield
    scheduler.shutdown(wait=False)


# ===========================================================================
# FastAPI 앱
# ===========================================================================

app = FastAPI(
    title="경쟁사 카드 이벤트 인텔리전스",
    description="신한카드 마케팅 담당자용 경쟁사 이벤트 모니터링·분석 플랫폼",
    version="2.0.0",
    lifespan=lifespan,
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """미처리 예외를 500 JSON으로 반환."""
    import traceback
    err_msg = str(exc)
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "message": "서버 오류",
            "success": False,
            "error": err_msg,
        },
    )


async def pipeline_error_middleware(request, call_next):
    """/api/pipeline/full 호출 시 예외가 나도 JSON 반환."""
    if request.url.path != "/api/pipeline/full" or request.method != "POST":
        return await call_next(request)
    try:
        return await call_next(request)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "message": "전체 파이프라인 실패",
                "success": False,
                "error": str(e),
            },
        )


app.middleware("http")(pipeline_error_middleware)


# Static Files Mount (Robust)
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    print(f"[INFO] Static files mounted from: {static_dir}")
else:
    print(f"[WARNING] Static directory NOT found at: {static_dir}")

templates = Jinja2Templates(directory="templates")
db.init_db()


# ---------------------------------------------------------------------------
# Pydantic 모델
# ---------------------------------------------------------------------------

class EventResponse(BaseModel):
    id: int
    url: str
    company: str
    category: Optional[str] = None
    title: str
    period: Optional[str] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    benefit_type: Optional[str] = None
    benefit_value: Optional[str] = None
    benefit_amount_won: Optional[int] = None
    benefit_pct: Optional[float] = None
    conditions: Optional[str] = None
    target_segment: Optional[str] = None
    threat_level: Optional[str] = None
    one_line_summary: Optional[str] = None
    marketing_content: Optional[str] = None
    marketing_insights: Optional[str] = None
    status: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EventCreate(BaseModel):
    url: str
    company: str
    category: Optional[str] = None
    title: str
    period: Optional[str] = None
    benefit_type: Optional[str] = None
    benefit_value: Optional[str] = None
    conditions: Optional[str] = None
    target_segment: Optional[str] = None
    threat_level: Optional[str] = None
    one_line_summary: Optional[str] = None
    raw_text: Optional[str] = None


# ---------------------------------------------------------------------------
# 기존 API (하위호환 유지)
# ---------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("simple_dashboard.html", {"request": request})


# Legacy 경로 -> / 로 리다이렉트
from fastapi.responses import RedirectResponse

@app.get("/luxury")
async def redirect_luxury():
    return RedirectResponse(url="/", status_code=302)

@app.get("/pro")
async def redirect_pro():
    return RedirectResponse(url="/", status_code=302)

@app.get("/index")
async def redirect_index():
    return RedirectResponse(url="/", status_code=302)


@app.get("/api/events", response_model=List[EventResponse])
async def get_events(
    company: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    threat_level: Optional[str] = Query(None),
    page: Optional[int] = Query(None, ge=1),
    size: int = Query(1000, ge=1, le=5000),
    db_session: Session = Depends(db.get_db),
):
    filters = {}
    if company: filters["company"] = company
    if category: filters["category"] = category
    if threat_level: filters["threat_level"] = threat_level
    all_events = db.get_all_events(db_session, filters)
    if page is not None:
        offset = (page - 1) * size
        return all_events[offset:offset + size]
    return all_events[:size]


@app.post("/api/events/extract-pending")
async def extract_pending_events(
    limit: int = Query(10, ge=1, le=50),
):
    from modules.pipeline import run_extract_and_enrich
    result = await run_extract_and_enrich(limit=limit)
    return {"message": f"처리 {result['processed']}건, 성공 {result['succeeded']}건, 실패 {result['failed']}건", **result}


@app.get("/api/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: int, db_session: Session = Depends(db.get_db)):
    event = db.get_event_by_id(db_session, event_id)
    if not event:
        raise HTTPException(404, "이벤트를 찾을 수 없습니다.")
    return event


@app.post("/api/events/{event_id}/extract-detail")
async def extract_event_detail(event_id: int, db_session: Session = Depends(db.get_db)):
    event = db.get_event_by_id(db_session, event_id)
    if not event:
        raise HTTPException(404, "이벤트를 찾을 수 없습니다.")
    if not event.url or not event.url.startswith("http"):
        raise HTTPException(400, "유효한 URL이 없습니다.")
    try:
        from modules.extraction import extract_detail
        from modules.normalization import normalize_extracted
        from modules.insights import generate_hybrid_insight

        extracted = await extract_detail(event.url)
        update_data = normalize_extracted(extracted, event)
        insight_data, source = generate_hybrid_insight(extracted, event.company or "")
        update_data["marketing_insights"] = insight_data
        if source == "gemini":
            if insight_data.get("one_line_summary"):
                update_data["one_line_summary"] = insight_data["one_line_summary"]
            if insight_data.get("category"):
                update_data["category"] = insight_data["category"]
            if insight_data.get("threat_level"):
                update_data["threat_level"] = insight_data["threat_level"]
        db.update_event(db_session, event_id, update_data)
        mc = extracted.get("marketing_content") or {}
        if mc:
            db.save_sections(db_session, event_id, mc)
        db.save_insight(db_session, event_id, insight_data, source=source)
        db.save_snapshot(db_session, event_id, raw_text=extracted.get("raw_text"),
                         extracted_json=extracted, latency_ms=extracted.get("extraction_latency_ms"))
    except Exception as e:
        err = str(e).strip()
        if any(k in err.lower() for k in ("playwright", "chromium", "executable", "browser")):
            raise HTTPException(500, "Playwright 미설치. `playwright install chromium` 실행 필요.")
        raise HTTPException(500, f"추출 오류: {err[:250]}")

    updated = db.get_event_by_id(db_session, event_id)
    return {"message": "추출 완료", "event_id": event_id, "extracted": extracted,
            "event": EventResponse.model_validate(updated) if updated else None}


@app.post("/api/events", response_model=EventResponse, status_code=201)
async def create_event(event: EventCreate, db_session: Session = Depends(db.get_db)):
    eid = db.insert_event(db_session, event.dict())
    if not eid:
        raise HTTPException(409, "중복된 URL입니다.")
    return db.get_event_by_id(db_session, eid)


@app.delete("/api/events/{event_id}")
async def delete_event(event_id: int, db_session: Session = Depends(db.get_db)):
    if not db.delete_event(db_session, event_id):
        raise HTTPException(404, "이벤트를 찾을 수 없습니다.")
    return {"message": "삭제 완료", "event_id": event_id}


@app.get("/api/companies")
async def get_companies(db_session: Session = Depends(db.get_db)):
    return {"companies": db.get_companies(db_session)}


@app.get("/api/categories")
async def get_categories(db_session: Session = Depends(db.get_db)):
    return {"categories": db.get_categories(db_session)}


@app.get("/api/stats")
async def get_statistics(db_session: Session = Depends(db.get_db)):
    all_events = db.get_all_events(db_session)
    company_stats = {}
    threat_stats = {"High": 0, "Mid": 0, "Low": 0}
    category_stats = {}
    for ev in all_events:
        company_stats[ev.company] = company_stats.get(ev.company, 0) + 1
        if ev.threat_level in threat_stats:
            threat_stats[ev.threat_level] += 1
        if ev.category:
            category_stats[ev.category] = category_stats.get(ev.category, 0) + 1
    return {
        "total_events": len(all_events),
        "company_stats": company_stats,
        "threat_stats": threat_stats,
        "category_stats": category_stats,
        "last_updated": max((e.created_at for e in all_events), default=None),
    }


# ---------------------------------------------------------------------------
# 신규 Analytics API
# ---------------------------------------------------------------------------

@app.get("/api/analytics/company-overview")
async def get_company_overview(db_session: Session = Depends(db.get_db)):
    return build_company_overview(db_session)


@app.get("/api/analytics/trends")
async def get_trends(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    db_session: Session = Depends(db.get_db),
):
    try:
        fd = date.fromisoformat(from_date) if from_date else date.today() - timedelta(days=90)
        td = date.fromisoformat(to_date) if to_date else date.today()
    except Exception:
        fd = date.today() - timedelta(days=90)
        td = date.today()
    return build_trends(db_session, fd, td)


@app.get("/api/analytics/strategy-map")
async def get_strategy_map(db_session: Session = Depends(db.get_db)):
    return _cached("strategy_map", lambda: build_strategy_map(db_session))


@app.get("/api/analytics/compare-matrix")
async def get_compare_matrix(
    axis: str = Query("category"),
    db_session: Session = Depends(db.get_db),
):
    if axis not in ("category", "benefit_type", "target", "strategy"):
        raise HTTPException(400, "axis must be one of: category, benefit_type, target, strategy")
    return build_compare_matrix(db_session, axis)


@app.get("/api/analytics/shinhan-gap")
async def get_shinhan_gap(db_session: Session = Depends(db.get_db)):
    return build_shinhan_gap(db_session)


@app.get("/api/analytics/shinhan-gap-trend")
async def get_shinhan_gap_trend(
    weeks: int = Query(8, ge=2, le=52),
    db_session: Session = Depends(db.get_db),
):
    return _cached(f"shinhan_gap_trend_{weeks}", lambda: _build_shinhan_gap_trend(db_session, weeks), ttl=600)


_TEXT_COMPARISON_CACHE = None


@app.get("/api/analytics/text-comparison")
async def get_text_comparison(
    force: bool = Query(False),
    db_session: Session = Depends(db.get_db),
):
    global _TEXT_COMPARISON_CACHE
    now = datetime.now()

    if not force and _TEXT_COMPARISON_CACHE:
        age = (now - _TEXT_COMPARISON_CACHE["updated_at"]).total_seconds()
        if age <= 900:
            result = dict(_TEXT_COMPARISON_CACHE["result"])
            result["cached"] = True
            return result

    try:
        from gemini_insight import compare_event_texts
    except Exception:
        compare_event_texts = None

    # 카드사별 추출 텍스트 수집
    events = db.get_all_events(db_session)
    grouped = defaultdict(list)
    for ev in events:
        co = (ev.company or "").strip()
        if co and ev.raw_text and len(ev.raw_text.strip()) > 30:
            grouped[co].append(ev.raw_text[:500])

    company_texts = {}
    for co, texts in grouped.items():
        company_texts[co] = "\n".join(texts[:20])  # 카드사당 최대 20건

    result = None
    source = "rule"
    if compare_event_texts and company_texts:
        result = compare_event_texts(company_texts)
        if result:
            source = "gemini"

    if not result:
        # rule fallback: 키워드 빈도 기반
        all_text = " ".join(t for ts in company_texts.values() for t in [ts])
        import re
        patterns = ["최소 결제", "선착순", "캐시백", "할인", "무이자", "포인트", "리워드", "적립", "월 한도", "자동이체", "전월 실적"]
        found = [p for p in patterns if p in all_text]
        result = {"common_patterns": found, "differentiators": {}, "condition_patterns": []}

    response = {
        "source": source,
        "cached": False,
        **result,
    }
    _TEXT_COMPARISON_CACHE = {"result": response, "updated_at": now}
    return response


@app.get("/api/analytics/benefit-benchmark")
async def get_benefit_benchmark(db_session: Session = Depends(db.get_db)):
    return _cached("benefit_benchmark", lambda: build_benefit_benchmark(db_session))


@app.get("/api/analytics/company-briefings")
async def get_company_briefings(
    force: bool = Query(False),
    db_session: Session = Depends(db.get_db),
):
    try:
        from gemini_insight import summarize_company_status
    except Exception:
        summarize_company_status = None

    overview = build_company_overview(db_session)
    rows = overview.get("companies", [])
    events = db.get_all_events(db_session)
    grouped = defaultdict(list)
    for ev in events:
        grouped[(ev.company or "기타").strip()].append(ev)

    now = datetime.now()
    items = []
    for row in rows:
        company = row.get("company") or "기타"
        snapshot = _build_company_snapshot(company, row, grouped.get(company, []))
        snapshot_key = _make_snapshot_key(snapshot)
        cached = None
        with _COMPANY_BRIEF_LOCK:
            entry = _COMPANY_BRIEF_CACHE.get(company)
            if entry:
                age_sec = (now - entry["updated_at"]).total_seconds()
                if (not force) and age_sec <= COMPANY_BRIEF_TTL_SEC and entry.get("snapshot_key") == snapshot_key:
                    cached = entry

        if cached:
            brief = dict(cached["brief"])
            source = cached.get("source", "rule")
            cached_hit = True
            updated_at = cached["updated_at"]
        else:
            ai_result = None
            if summarize_company_status:
                try:
                    ai_result = summarize_company_status(company, snapshot)
                except Exception as e:
                    logger.warning("회사 개요 Gemini 생성 실패 (%s): %s", company, str(e)[:200])
            brief = ai_result if ai_result else _rule_company_brief(company, snapshot)
            source = "gemini" if ai_result else "rule"
            cached_hit = False
            updated_at = datetime.now()
            with _COMPANY_BRIEF_LOCK:
                _COMPANY_BRIEF_CACHE[company] = {
                    "snapshot_key": snapshot_key,
                    "brief": brief,
                    "source": source,
                    "updated_at": updated_at,
                }

        items.append({
            "company": company,
            "source": source,
            "cached": cached_hit,
            "updated_at": updated_at.isoformat(),
            "overview": brief.get("overview"),
            "key_strategy": brief.get("key_strategy"),
            "strongest_categories": brief.get("strongest_categories", []),
            "avg_benefit_assessment": brief.get("avg_benefit_assessment"),
            "target_focus": brief.get("target_focus"),
            "shinhan_threat": brief.get("shinhan_threat"),
            "recommended_counter": brief.get("recommended_counter"),
            # 하위호환
            "focus_points": brief.get("focus_points", []),
            "watchouts": brief.get("watchouts", []),
            "action_hint": brief.get("action_hint"),
        })

    return {
        "generated_at": datetime.now().isoformat(),
        "ttl_sec": COMPANY_BRIEF_TTL_SEC,
        "items": items,
    }


@app.get("/api/analytics/qualitative-comparison")
async def get_qualitative_comparison(
    force: bool = Query(False),
    db_session: Session = Depends(db.get_db),
):
    global _QUAL_COMPARISON_CACHE
    try:
        from gemini_insight import infer_qualitative_comparison
    except Exception:
        infer_qualitative_comparison = None

    overview = build_company_overview(db_session)
    rows = overview.get("companies", [])
    events = db.get_all_events(db_session)
    grouped = defaultdict(list)
    for ev in events:
        grouped[(ev.company or "기타").strip()].append(ev)

    companies_payload = []
    for row in rows:
        company = row.get("company") or "기타"
        per_events = grouped.get(company, [])
        snapshot = _build_company_snapshot(company, row, per_events)
        companies_payload.append({
            "company": company,
            "snapshot": snapshot,
            "events": per_events,
        })

    companies_payload.sort(key=lambda x: _company_order_key(x["company"]))
    companies = [x["company"] for x in companies_payload]
    snapshot_for_ai = [
        {"company": x["company"], **x["snapshot"]}
        for x in companies_payload
    ]
    snapshot_key = _make_snapshot_key(snapshot_for_ai)

    now = datetime.now()
    with _COMPANY_BRIEF_LOCK:
        cached = _QUAL_COMPARISON_CACHE
        if (
            not force
            and cached
            and cached.get("snapshot_key") == snapshot_key
            and (now - cached["updated_at"]).total_seconds() <= QUAL_COMPARISON_TTL_SEC
        ):
            response = dict(cached["response"])
            response["cached"] = True
            return response

    ai_obj = None
    if infer_qualitative_comparison:
        try:
            ai_obj = infer_qualitative_comparison(snapshot_for_ai)
        except Exception as e:
            logger.warning("정성 비교 Gemini 생성 실패: %s", str(e)[:200])

    obj = ai_obj if ai_obj else _build_rule_qualitative_comparison(companies_payload, companies)
    source = "gemini" if ai_obj else "rule"
    fixed_metrics = [
        "고가 소비 비중(자동차·여행·할부)",
        "반복·계약 소비 비중(생활요금·보험·리텐션)",
        "카테고리 분산도(소비+관계 전체)",
        "이벤트 반복성(월/상시 구조)",
    ]
    rows_map = {}
    for row in (obj.get("rows") or []):
        if not isinstance(row, dict):
            continue
        metric = str(row.get("metric") or "").strip()
        if not metric:
            continue
        raw_values = row.get("values") if isinstance(row.get("values"), dict) else {}
        values = {c: str(raw_values.get(c) or "중간") for c in companies}
        rows_map[metric] = {
            "metric": metric,
            "values": values,
            "reason": str(row.get("reason") or "").strip(),
        }
    normalized_rows = [rows_map[m] for m in fixed_metrics if m in rows_map]
    if len(normalized_rows) < len(fixed_metrics):
        for m in fixed_metrics:
            if m not in rows_map:
                normalized_rows.append({
                    "metric": m,
                    "values": {c: "중간" for c in companies},
                    "reason": "데이터 보정",
                })

    response = {
        "generated_at": datetime.now().isoformat(),
        "ttl_sec": QUAL_COMPARISON_TTL_SEC,
        "source": source,
        "cached": False,
        "title": obj.get("title") or "카드 4사 비교 요약",
        "companies": companies,
        "rows": normalized_rows,
        "summary": obj.get("summary", []),
    }
    with _COMPANY_BRIEF_LOCK:
        _QUAL_COMPARISON_CACHE = {
            "snapshot_key": snapshot_key,
            "response": response,
            "updated_at": datetime.now(),
        }
    return response


# ---------------------------------------------------------------------------
# Jobs API
# ---------------------------------------------------------------------------

@app.get("/api/jobs")
async def list_jobs(
    job_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db_session: Session = Depends(db.get_db),
):
    jobs = db.get_jobs(db_session, job_type=job_type, status=status, limit=limit)
    return [
        {
            "id": j.id, "job_type": j.job_type, "event_id": j.event_id,
            "company": j.company, "status": j.status,
            "retry_count": j.retry_count, "last_error": j.last_error,
            "started_at": j.started_at, "finished_at": j.finished_at,
        }
        for j in jobs
    ]


@app.get("/api/jobs/stats")
async def job_stats(db_session: Session = Depends(db.get_db)):
    return db.get_job_stats(db_session)


@app.post("/api/jobs/{job_id}/retry")
async def retry_job(job_id: int, db_session: Session = Depends(db.get_db)):
    job = db_session.query(db.Job).filter(db.Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "잡을 찾을 수 없습니다.")
    if job.status != "failed":
        raise HTTPException(400, "실패한 잡만 재시도할 수 있습니다.")
    db.update_job(db_session, job_id, "pending")
    return {"message": "재시도 예약됨", "job_id": job_id}


# ---------------------------------------------------------------------------
# Events 추가 API
# ---------------------------------------------------------------------------

@app.get("/api/events/{event_id}/snapshots")
async def get_event_snapshots(event_id: int, db_session: Session = Depends(db.get_db)):
    snaps = db.get_snapshots(db_session, event_id)
    return [
        {
            "id": s.id, "captured_at": s.captured_at,
            "extraction_latency_ms": s.extraction_latency_ms,
            "raw_text_len": len(s.raw_text) if s.raw_text else 0,
        }
        for s in snaps
    ]


@app.get("/api/events/{event_id}/intelligence")
async def get_event_intelligence(event_id: int, db_session: Session = Depends(db.get_db)):
    event = db.get_event_by_id(db_session, event_id)
    if not event:
        raise HTTPException(404, "이벤트를 찾을 수 없습니다.")
    insight = db.get_latest_insight(db_session, event_id)
    sections = db.get_sections(db_session, event_id)
    snapshots = db.get_snapshots(db_session, event_id)

    def _jl(val):
        if not val: return []
        try: return json.loads(val) if isinstance(val, str) else val
        except: return []

    curation = db.get_curation_state(db_session, event_id)
    return {
        "event": EventResponse.model_validate(event),
        "locked": bool(curation and curation.is_locked) if curation else False,
        "insight": {
            "benefit_level": insight.benefit_level if insight else None,
            "benefit_score": insight.benefit_score if insight else None,
            "target_clarity": insight.target_clarity if insight else None,
            "threat_level": insight.threat_level if insight else None,
            "threat_reason": insight.threat_reason if insight else None,
            "marketing_takeaway": insight.marketing_takeaway if insight else None,
            "objective_tags": _jl(insight.objective_tags) if insight else [],
            "target_tags": _jl(insight.target_tags) if insight else [],
            "channel_tags": _jl(insight.channel_tags) if insight else [],
            "competitive_points": _jl(insight.competitive_points) if insight else [],
            "promo_strategies": _jl(insight.promo_strategies) if insight else [],
            "evidence": _jl(insight.evidence) if insight else [],
            "insight_confidence": insight.insight_confidence if insight else None,
            "section_coverage": insight.section_coverage if insight else None,
            "source": insight.source if insight else None,
            # 고도화 필드 (marketing_insights JSON에 저장됨)
            **({k: mi.get(k) for k in ("benefit_detail", "target_profile", "conditions_summary",
                "event_duration_type", "weaknesses", "shinhan_response") if mi.get(k)}
               if (mi := _pjson(event.marketing_insights)) else {}),
        } if insight else None,
        "sections": [{"type": s.section_type, "content": s.content} for s in sections],
        "snapshot_count": len(snapshots),
    }


# ---------------------------------------------------------------------------
# Manual Edit / Curation API
# ---------------------------------------------------------------------------

class ManualUpdateRequest(BaseModel):
    fields: dict  # {"title": "새 제목", "benefit_value": "5만원", ...}
    editor: Optional[str] = "admin"
    reason: Optional[str] = None


@app.patch("/api/events/{event_id}/manual-update")
async def manual_update_event(event_id: int, body: ManualUpdateRequest, db_session: Session = Depends(db.get_db)):
    event = db.get_event_by_id(db_session, event_id)
    if not event:
        raise HTTPException(404, "이벤트를 찾을 수 없습니다.")
    allowed = {"title", "period", "benefit_value", "benefit_type", "conditions", "target_segment", "category"}
    update_data = {}
    edits = []
    for field, new_val in body.fields.items():
        if field not in allowed:
            continue
        old_val = getattr(event, field, None)
        if str(old_val or '') == str(new_val or ''):
            continue
        update_data[field] = new_val
        edits.append({"field": field, "old": old_val, "new": new_val})
        db.save_manual_edit(db_session, event_id, field, old_val, new_val, editor=body.editor or "admin", reason=body.reason)
    if update_data:
        db.update_event(db_session, event_id, update_data)
    return {"message": f"{len(edits)}건 수정 완료", "edits": edits}


@app.get("/api/events/{event_id}/edit-history")
async def get_edit_history(event_id: int, db_session: Session = Depends(db.get_db)):
    history = db.get_edit_history(db_session, event_id)
    return [
        {
            "id": h.id, "field_name": h.field_name,
            "old_value": h.old_value, "new_value": h.new_value,
            "editor": h.editor, "edited_at": h.edited_at.isoformat() if h.edited_at else None,
            "reason": h.reason,
        }
        for h in history
    ]


@app.post("/api/events/{event_id}/lock")
async def toggle_lock_event(event_id: int, db_session: Session = Depends(db.get_db)):
    event = db.get_event_by_id(db_session, event_id)
    if not event:
        raise HTTPException(404, "이벤트를 찾을 수 없습니다.")
    locked = db.is_event_locked(db_session, event_id)
    if locked:
        db.unlock_event(db_session, event_id)
        return {"message": "잠금 해제", "locked": False}
    else:
        db.lock_event(db_session, event_id)
        return {"message": "잠금 설정 (재추출 방지)", "locked": True}


@app.get("/api/audit/edits")
async def audit_edits(
    event_id: Optional[int] = Query(None),
    editor: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db_session: Session = Depends(db.get_db),
):
    fd = datetime.fromisoformat(from_date) if from_date else None
    td = datetime.fromisoformat(to_date) if to_date else None
    offset = (page - 1) * size
    rows, total = db.get_all_edit_history(db_session, event_id=event_id, editor=editor,
                                           from_date=fd, to_date=td, limit=size, offset=offset)
    return {
        "total": total, "page": page, "size": size,
        "items": [
            {
                "id": h.id, "event_id": h.event_id, "field_name": h.field_name,
                "old_value": h.old_value, "new_value": h.new_value,
                "editor": h.editor, "edited_at": h.edited_at.isoformat() if h.edited_at else None,
                "reason": h.reason,
            }
            for h in rows
        ],
    }


# ---------------------------------------------------------------------------
# Pipeline trigger API
# ---------------------------------------------------------------------------

@app.get("/api/pipeline/progress")
async def get_pipeline_progress():
    """전체 추출 진행 상태 (실제 처리 건수·성공·실패)."""
    from modules.pipeline import get_pipeline_progress as _get
    return _get()


@app.post("/api/pipeline/ingest")
async def trigger_ingest(company: Optional[str] = Query(None)):
    from modules.pipeline import run_ingest
    result = await run_ingest(company=company)
    return {"message": f"수집 완료: {result['ingested']}건 신규", **result}


@app.post("/api/pipeline/full")
async def trigger_full_pipeline(company: Optional[str] = Query(None)):
    import asyncio
    from modules.pipeline import run_full_pipeline, set_full_extract_started
    try:
        set_full_extract_started()  # 첫 폴링부터 '추출 중'으로 보이게
        asyncio.create_task(run_full_pipeline(company=company))
        return {"started": True, "message": "전체 파이프라인을 백그라운드에서 시작했습니다."}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "started": False,
                "message": "전체 파이프라인 실패",
                "success": False,
                "error": str(e),
            },
        )


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat(), "version": "2.0.0"}


if __name__ == "__main__":
    print("[START] 경쟁사 카드 이벤트 인텔리전스 v2.0")
    print("[INFO] 대시보드: http://localhost:8000")
    print("[INFO] API 문서: http://localhost:8000/docs")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False, log_level="info")
