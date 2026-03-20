"""
자동 브리핑 모듈 — 일간/주간 이메일 발송 및 HTML 렌더링
"""

import json
import logging
import os
import smtplib
from collections import Counter, defaultdict
from datetime import datetime, date, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.orm import Session

import database as db

logger = logging.getLogger(__name__)

EXPECTED_COMPANIES = (
    "신한카드",
    "삼성카드",
    "KB국민카드",
    "현대카드",
    "롯데카드",
    "하나카드",
    "우리카드",
    "NH농협카드",
)

# ---------------------------------------------------------------------------
# Jinja2 템플릿 환경 (templates/ 폴더 기준)
# ---------------------------------------------------------------------------
_TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
_jinja_env = Environment(
    loader=FileSystemLoader(_TEMPLATE_DIR),
    autoescape=select_autoescape(["html"]),
)


# ---------------------------------------------------------------------------
# 데이터 수집
# ---------------------------------------------------------------------------

def _find_notable_events(all_events, active_events) -> list:
    """주목 이벤트 선정 — 객관적 기준 2가지:
    1. 신한 공백 카테고리: 경쟁사는 있지만 신한이 없는 카테고리의 이벤트
    2. 고혜택 이벤트: 같은 카테고리 평균 혜택의 150% 이상
    """
    today = date.today()
    shinhan_key = "신한카드"

    # 활성 이벤트의 카테고리별 카드사 집합
    cat_companies = defaultdict(set)
    for ev in active_events:
        cat = (ev.category or "").strip()
        co = (ev.company or "").strip()
        if cat and co:
            cat_companies[cat].add(co)

    # 신한 공백 카테고리
    gap_categories = set()
    for cat, cos in cat_companies.items():
        has_competitor = any(c != shinhan_key for c in cos)
        has_shinhan = shinhan_key in cos
        if has_competitor and not has_shinhan:
            gap_categories.add(cat)

    # 카테고리별 평균 혜택금액
    cat_amounts = defaultdict(list)
    for ev in active_events:
        cat = (ev.category or "").strip()
        if cat and ev.benefit_amount_won:
            cat_amounts[cat].append(ev.benefit_amount_won)
    cat_avg = {cat: sum(vals) / len(vals) for cat, vals in cat_amounts.items() if vals}

    notable = []
    seen_ids = set()
    for ev in active_events:
        if ev.id in seen_ids or (ev.company or "").strip() == shinhan_key:
            continue
        cat = (ev.category or "").strip()
        reasons = []
        # 기준 1: 신한 공백 카테고리
        if cat in gap_categories:
            reasons.append("신한 미대응 카테고리")
        # 기준 2: 카테고리 평균 대비 150% 이상 혜택
        avg = cat_avg.get(cat, 0)
        if avg > 0 and ev.benefit_amount_won and ev.benefit_amount_won >= avg * 1.5:
            reasons.append(f"카테고리 평균 대비 {round(ev.benefit_amount_won / avg * 100)}% 혜택")
        if reasons:
            notable.append((ev, reasons))
            seen_ids.add(ev.id)

    # 공백 카테고리 우선, 그다음 혜택 순
    notable.sort(key=lambda x: (-len(x[1]), -(x[0].benefit_amount_won or 0)))
    return notable


def build_daily_briefing_data(session: Session) -> dict:
    """지난 24시간 기준 일간 브리핑 데이터 수집."""
    now = datetime.now()
    yesterday = now - timedelta(hours=24)
    today = date.today()
    week_later = today + timedelta(days=7)

    all_events = session.query(db.CardEvent).all()

    # 신규 이벤트 (24시간 이내 수집)
    new_events = [
        e for e in all_events
        if e.created_at and e.created_at >= yesterday
    ]

    # 활성 이벤트 전체 통계
    active_events = [
        e for e in all_events
        if (e.status or "") == "active" or (e.period_end and e.period_end >= today)
    ]

    # 주목 이벤트 (공백 카테고리 + 고혜택)
    notable_pairs = _find_notable_events(all_events, active_events)
    notable_events = [ev for ev, _ in notable_pairs[:10]]
    notable_reasons = {ev.id: reasons for ev, reasons in notable_pairs[:10]}

    # 곧 종료되는 이벤트 (7일 이내)
    ending_soon = [
        e for e in all_events
        if e.period_end and today <= e.period_end <= week_later
    ]

    # 카드사별 신규 이벤트 수
    new_by_company = defaultdict(int)
    for e in new_events:
        new_by_company[(e.company or "기타").strip()] += 1

    return {
        "generated_at": now.isoformat(),
        "date_label": now.strftime("%Y년 %m월 %d일"),
        "total_active": len(active_events),
        "new_events": _serialize_events(new_events[:20]),
        "new_events_count": len(new_events),
        "new_by_company": dict(new_by_company),
        "notable_events": _serialize_events(notable_events, notable_reasons),
        "notable_count": len(notable_pairs),
        "ending_soon_events": _serialize_events(ending_soon[:10]),
        "ending_soon_count": len(ending_soon),
    }


def build_weekly_briefing_data(session: Session) -> dict:
    """이번 주 기준 주간 브리핑 데이터 수집."""
    now = datetime.now()
    week_ago = now - timedelta(days=7)
    today = date.today()

    all_events = session.query(db.CardEvent).all()

    # 이번 주 신규 이벤트
    new_this_week = [
        e for e in all_events
        if e.created_at and e.created_at >= week_ago
    ]

    # 이번 주 종료된 이벤트
    ended_this_week = [
        e for e in all_events
        if e.period_end and (today - timedelta(days=7)) <= e.period_end < today
    ]

    # 활성 이벤트
    active_events = [
        e for e in all_events
        if (e.status or "") == "active" or (e.period_end and e.period_end >= today)
    ]

    # 주목 이벤트 (공백 + 고혜택)
    notable_pairs = _find_notable_events(all_events, active_events)
    notable_events = [ev for ev, _ in notable_pairs[:10]]
    notable_reasons = {ev.id: reasons for ev, reasons in notable_pairs[:10]}

    # 카드사별 통계
    company_stats = defaultdict(lambda: {"new": 0, "ended": 0, "notable": 0})
    for e in new_this_week:
        company_stats[(e.company or "기타").strip()]["new"] += 1
    for e in ended_this_week:
        company_stats[(e.company or "기타").strip()]["ended"] += 1
    for ev in notable_events:
        company_stats[(ev.company or "기타").strip()]["notable"] += 1

    # 카테고리별 분포
    cat_counter = defaultdict(int)
    for e in new_this_week:
        cat_counter[(e.category or "기타").strip()] += 1

    week_label = f"{week_ago.strftime('%m/%d')} ~ {now.strftime('%m/%d')}"

    return {
        "generated_at": now.isoformat(),
        "week_label": week_label,
        "new_events_count": len(new_this_week),
        "ended_events_count": len(ended_this_week),
        "notable_count": len(notable_pairs),
        "company_stats": {k: dict(v) for k, v in company_stats.items()},
        "category_distribution": dict(sorted(cat_counter.items(), key=lambda x: -x[1])[:8]),
        "notable_events": _serialize_events(notable_events, notable_reasons),
        "new_events": _serialize_events(new_this_week[:15]),
        "ended_events": _serialize_events(ended_this_week[:10]),
    }


def _serialize_events(events, notable_reasons: dict = None) -> list:
    """이벤트 리스트를 브리핑용 dict 리스트로 변환."""
    result = []
    for e in events:
        # AI 인사이트에서 shinhan_response 추출
        shinhan_response = None
        if e.insights:
            ins = e.insights[-1]
            if ins and ins.marketing_takeaway:
                shinhan_response = ins.marketing_takeaway[:120]

        item = {
            "id": e.id,
            "company": e.company or "",
            "title": (e.title or "")[:60],
            "category": e.category or "기타",
            "benefit_value": e.benefit_value or "",
            "benefit_amount_won": e.benefit_amount_won,
            "benefit_pct": e.benefit_pct,
            "period_start": e.period_start.strftime("%m/%d") if e.period_start else "",
            "period_end": e.period_end.strftime("%m/%d") if e.period_end else "",
            "one_line_summary": (e.one_line_summary or "")[:100],
            "shinhan_response": shinhan_response or "",
            "url": e.url or "",
        }
        # 주목 이벤트 사유 (있으면)
        if notable_reasons and e.id in notable_reasons:
            item["notable_reasons"] = notable_reasons[e.id]
        result.append(item)
    return result


def _normalize_company_name(company: str) -> str:
    return (company or "Other").strip() or "Other"


def _sort_events(events) -> list:
    return sorted(
        events,
        key=lambda event: (
            getattr(event, "created_at", datetime.min) or datetime.min,
            getattr(event, "benefit_amount_won", 0) or 0,
            getattr(event, "id", 0) or 0,
        ),
        reverse=True,
    )


def _dedupe_events(events) -> list:
    deduped = []
    seen_ids = set()
    for event in events:
        event_id = getattr(event, "id", id(event))
        if event_id in seen_ids:
            continue
        seen_ids.add(event_id)
        deduped.append(event)
    return deduped


def _parse_json_list(value) -> list:
    if not value:
        return []
    if isinstance(value, list):
        return [item for item in value if item]
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        try:
            parsed = json.loads(text)
        except Exception:
            return [text]
        if isinstance(parsed, list):
            return [item for item in parsed if item]
    return []


def _get_latest_insight(event):
    insights = getattr(event, "insights", None) or []
    return insights[-1] if insights else None


def _extract_event_evidence(event) -> list:
    evidence_points = []
    one_line_summary = (getattr(event, "one_line_summary", "") or "").strip()
    if one_line_summary:
        evidence_points.append(one_line_summary)

    insight = _get_latest_insight(event)
    if insight:
        takeaway = (getattr(insight, "marketing_takeaway", "") or "").strip()
        if takeaway:
            evidence_points.append(takeaway)

        for item in _parse_json_list(getattr(insight, "evidence", None)):
            if isinstance(item, str):
                text = item.strip()
                if text:
                    evidence_points.append(text)

    seen = set()
    unique_points = []
    for item in evidence_points:
        if item in seen:
            continue
        seen.add(item)
        unique_points.append(item)
    return unique_points


def _extract_event_products(event) -> list:
    products = []
    seen = set()

    for link in getattr(event, "product_links_rel", None) or []:
        company = _normalize_company_name(getattr(link, "company", None) or getattr(event, "company", None))
        product_name = (getattr(link, "card_name", "") or "").strip()
        key = (company, product_name)
        if not product_name or key in seen:
            continue
        seen.add(key)
        products.append(
            {
                "company": company,
                "product_name": product_name,
                "match_method": getattr(link, "match_method", "") or "",
                "confidence": getattr(link, "confidence", None),
            }
        )

    for item in _parse_json_list(getattr(event, "linked_cards", None)):
        if isinstance(item, dict):
            product_name = (item.get("card_name") or item.get("name") or "").strip()
            company = _normalize_company_name(item.get("company") or getattr(event, "company", None))
        else:
            product_name = str(item).strip()
            company = _normalize_company_name(getattr(event, "company", None))
        key = (company, product_name)
        if not product_name or key in seen:
            continue
        seen.add(key)
        products.append({"company": company, "product_name": product_name})

    return products


def _collect_briefing_source_data(session: Session, report_type: str) -> dict:
    now = datetime.now()
    today = date.today()
    lookback = timedelta(hours=24) if report_type == "daily" else timedelta(days=7)
    period_start = now - lookback
    week_later = today + timedelta(days=7)

    all_events = session.query(db.CardEvent).all()
    new_events = _sort_events(
        [event for event in all_events if getattr(event, "created_at", None) and event.created_at >= period_start]
    )
    active_events = _sort_events(
        [
            event for event in all_events
            if (getattr(event, "status", "") or "") == "active"
            or (getattr(event, "period_end", None) and event.period_end >= today)
        ]
    )
    notable_pairs = _find_notable_events(all_events, active_events)
    ending_soon = sorted(
        [
            event for event in all_events
            if getattr(event, "period_end", None) and today <= event.period_end <= week_later
        ],
        key=lambda event: (getattr(event, "period_end", today), _normalize_company_name(getattr(event, "company", None))),
    )

    ended_events = []
    if report_type == "weekly":
        ended_events = sorted(
            [
                event for event in all_events
                if getattr(event, "period_end", None) and (today - timedelta(days=7)) <= event.period_end < today
            ],
            key=lambda event: (getattr(event, "period_end", today), _normalize_company_name(getattr(event, "company", None))),
            reverse=True,
        )

    relevant_events = _dedupe_events(new_events + ended_events) if report_type == "weekly" else list(new_events)
    if not relevant_events:
        relevant_events = list(active_events)

    present_companies = sorted({_normalize_company_name(getattr(event, "company", None)) for event in all_events})
    missing_companies = [company for company in EXPECTED_COMPANIES if company not in present_companies]

    source_products = []
    for event in (new_events or relevant_events):
        source_products.extend(_extract_event_products(event))

    unique_products = []
    seen_products = set()
    for product in source_products:
        key = (product["company"], product["product_name"])
        if key in seen_products:
            continue
        seen_products.add(key)
        unique_products.append(product)

    return {
        "all_events": list(all_events),
        "new_events": new_events,
        "active_events": active_events,
        "ending_soon": ending_soon,
        "ended_events": ended_events,
        "notable_pairs": notable_pairs,
        "relevant_events": relevant_events,
        "source_products": unique_products,
        "coverage": {
            "expected_companies": list(EXPECTED_COMPANIES),
            "present_companies": present_companies,
            "missing_companies": missing_companies,
        },
        "now": now,
        "period_start": period_start,
    }


def _build_period_label(source: dict, report_type: str) -> str:
    if report_type == "daily":
        return source["now"].strftime("%Y-%m-%d")
    return f"{source['period_start'].strftime('%m/%d')} ~ {source['now'].strftime('%m/%d')}"


def _build_company_sections(source: dict, report_type: str) -> list:
    company_map = {}

    def get_section(company_name: str) -> dict:
        if company_name not in company_map:
            company_map[company_name] = {
                "company": company_name,
                "new_events": [],
                "active_events": [],
                "ended_events": [],
                "ending_soon_events": [],
                "categories": Counter(),
            }
        return company_map[company_name]

    for event in source["active_events"]:
        company = _normalize_company_name(getattr(event, "company", None))
        section = get_section(company)
        section["active_events"].append(event)
        section["categories"][(getattr(event, "category", "") or "Other").strip() or "Other"] += 1

    for event in source["new_events"]:
        company = _normalize_company_name(getattr(event, "company", None))
        section = get_section(company)
        section["new_events"].append(event)
        section["categories"][(getattr(event, "category", "") or "Other").strip() or "Other"] += 1

    for event in source["ended_events"]:
        company = _normalize_company_name(getattr(event, "company", None))
        section = get_section(company)
        section["ended_events"].append(event)
        section["categories"][(getattr(event, "category", "") or "Other").strip() or "Other"] += 1

    for event in source["ending_soon"]:
        company = _normalize_company_name(getattr(event, "company", None))
        section = get_section(company)
        section["ending_soon_events"].append(event)

    sections = []
    for section in company_map.values():
        evidence_pool = section["new_events"] or section["active_events"] or section["ended_events"]
        evidence_events = [event for event in evidence_pool if _extract_event_evidence(event)]

        product_rows = []
        for event in section["new_events"] or evidence_pool:
            product_rows.extend(_extract_event_products(event))

        deduped_products = []
        seen_products = set()
        for product in product_rows:
            key = (product["company"], product["product_name"])
            if key in seen_products:
                continue
            seen_products.add(key)
            deduped_products.append(product)

        sections.append(
            {
                "company": section["company"],
                "new_events_count": len(section["new_events"]),
                "active_events_count": len(section["active_events"]),
                "ended_events_count": len(section["ended_events"]) if report_type == "weekly" else 0,
                "ending_soon_count": len(section["ending_soon_events"]),
                "top_categories": [category for category, _count in section["categories"].most_common(3)],
                "evidence_events": _serialize_events(evidence_events[:3]),
                "evidence_products": deduped_products[:3],
            }
        )

    sections.sort(
        key=lambda section: (
            section["new_events_count"],
            section["active_events_count"],
            -section["ending_soon_count"],
            section["company"],
        ),
        reverse=True,
    )
    return sections[:8]


def _build_theme_summary(source: dict, report_type: str) -> list:
    theme_counter = Counter()
    companies_by_theme = defaultdict(set)

    for event in source["relevant_events"]:
        theme = (getattr(event, "category", "") or "Other").strip() or "Other"
        company = _normalize_company_name(getattr(event, "company", None))
        theme_counter[theme] += 1
        companies_by_theme[theme].add(company)

    return [
        {
            "theme": theme,
            "event_count": count,
            "companies": sorted(companies_by_theme[theme]),
        }
        for theme, count in theme_counter.most_common(6)
    ]


def _build_product_summary(source: dict, report_type: str) -> list:
    product_counter = Counter()
    product_examples = {}

    for product in source["source_products"]:
        key = (product["company"], product["product_name"])
        product_counter[key] += 1
        product_examples.setdefault(key, product)

    return [
        {
            **product_examples[key],
            "event_count": count,
        }
        for key, count in product_counter.most_common(8)
    ]


def _pick_evidence_events(source: dict, report_type: str) -> list:
    candidate_events = _dedupe_events(
        source["new_events"] + [event for event, _reasons in source["notable_pairs"]] + source["active_events"]
    )
    evidence_events = [event for event in candidate_events if _extract_event_evidence(event)]
    serialized = _serialize_events(evidence_events[:5])
    for item, event in zip(serialized, evidence_events[:5]):
        item["evidence"] = _extract_event_evidence(event)[:3]
    return serialized


def _pick_evidence_products(source: dict, report_type: str) -> list:
    evidence_products = []
    seen = set()
    for product in source["source_products"]:
        key = (product["company"], product["product_name"])
        if key in seen:
            continue
        seen.add(key)
        evidence_products.append(product)
        if len(evidence_products) >= 5:
            break
    return evidence_products


def _build_quality_warnings(payload: dict, source: dict, report_type: str) -> list:
    warnings = []

    if report_type == "daily" and not source["new_events"]:
        warnings.append(
            {
                "code": "no_new_events",
                "severity": "medium",
                "message": "No new events were collected in the last 24 hours.",
            }
        )

    missing_companies = list(source["coverage"]["missing_companies"])
    if missing_companies:
        warnings.append(
            {
                "code": "company_coverage_low",
                "severity": "high",
                "message": "Some expected card issuers are missing from the briefing source data.",
                "missing_companies": missing_companies,
            }
        )

    if not payload["evidence_events"]:
        warnings.append(
            {
                "code": "insufficient_evidence_events",
                "severity": "high",
                "message": "No evidence-backed events were available for the briefing.",
            }
        )

    return warnings


def _generate_ai_summary(_payload: dict, _report_type: str) -> str | None:
    return None


def _build_executive_summary(payload: dict, report_type: str) -> tuple[str, str]:
    try:
        ai_summary = _generate_ai_summary(payload, report_type)
    except Exception as exc:
        logger.warning("Briefing AI summary generation failed: %s", exc)
        ai_summary = None

    if ai_summary:
        return ai_summary, "ai"

    lead_company = payload["company_sections"][0]["company"] if payload["company_sections"] else "tracked issuers"
    lead_theme = payload["theme_summary"][0]["theme"] if payload["theme_summary"] else "broad activity"
    warning_codes = [warning["code"] for warning in payload["quality_warnings"]]

    if report_type == "daily":
        summary = (
            f"Daily briefing for {payload['period_label']}: "
            f"{payload['new_events_count']} new events across {len(payload['company_sections'])} companies, "
            f"led by {lead_company} in {lead_theme}."
        )
    else:
        summary = (
            f"Weekly briefing for {payload['period_label']}: "
            f"{payload['new_events_count']} new events and {payload['ended_events_count']} ended events, "
            f"with {lead_company} most active in {lead_theme}."
        )

    if warning_codes:
        summary += f" Warnings: {', '.join(warning_codes)}."

    return summary, "rule"


def build_briefing_payload(session: Session, report_type: str) -> dict:
    source = _collect_briefing_source_data(session, report_type)
    period_label = _build_period_label(source, report_type)
    notable_events = [event for event, _reasons in source["notable_pairs"][:10]]
    notable_reasons = {event.id: reasons for event, reasons in source["notable_pairs"][:10]}

    payload = {
        "report_type": report_type,
        "generated_at": source["now"].isoformat(),
        "period_label": period_label,
        "date_label": period_label if report_type == "daily" else "",
        "week_label": period_label if report_type == "weekly" else "",
        "delivery_mode": "digest",
        "company_sections": _build_company_sections(source, report_type),
        "theme_summary": _build_theme_summary(source, report_type),
        "product_summary": _build_product_summary(source, report_type),
        "evidence_events": _pick_evidence_events(source, report_type),
        "evidence_products": _pick_evidence_products(source, report_type),
        "data_coverage": source["coverage"],
        "source_event_count": len(source["all_events"]),
        "source_product_count": len(source["source_products"]),
        "total_active": len(source["active_events"]),
        "new_events": _serialize_events(source["new_events"][:20]),
        "new_events_count": len(source["new_events"]),
        "notable_events": _serialize_events(notable_events, notable_reasons),
        "notable_count": len(source["notable_pairs"]),
        "ending_soon_events": _serialize_events(source["ending_soon"][:10]),
        "ending_soon_count": len(source["ending_soon"]),
        "ended_events": _serialize_events(source["ended_events"][:10]),
        "ended_events_count": len(source["ended_events"]),
    }

    payload["new_by_company"] = dict(
        Counter(_normalize_company_name(getattr(event, "company", None)) for event in source["new_events"])
    )
    payload["company_stats"] = {
        section["company"]: {
            "new": section["new_events_count"],
            "ended": section["ended_events_count"],
            "notable": sum(
                1
                for event in notable_events
                if _normalize_company_name(getattr(event, "company", None)) == section["company"]
            ),
        }
        for section in payload["company_sections"]
    }
    payload["category_distribution"] = {
        item["theme"]: item["event_count"] for item in payload["theme_summary"]
    }
    payload["quality_warnings"] = _build_quality_warnings(payload, source, report_type)
    payload["warning_count"] = len(payload["quality_warnings"])
    payload["executive_summary"], payload["ai_summary_status"] = _build_executive_summary(payload, report_type)
    return payload


def build_daily_briefing_data(session: Session) -> dict:
    return build_briefing_payload(session, "daily")


def build_weekly_briefing_data(session: Session) -> dict:
    return build_briefing_payload(session, "weekly")


# ---------------------------------------------------------------------------
# HTML 렌더링
# ---------------------------------------------------------------------------

def render_briefing_html(data: dict, report_type: str = "daily",
                         dashboard_url: str = "") -> str:
    """Jinja2로 브리핑 HTML 렌더링."""
    template_name = (
        "email_daily_briefing.html" if report_type == "daily"
        else "weekly_report.html"
    )
    try:
        tmpl = _jinja_env.get_template(template_name)
        return tmpl.render(**data, dashboard_url=dashboard_url, report_type=report_type)
    except Exception as e:
        logger.error(f"브리핑 HTML 렌더링 실패: {e}")
        return f"<p>렌더링 오류: {e}</p>"


# ---------------------------------------------------------------------------
# 이메일 발송
# ---------------------------------------------------------------------------

def send_briefing_email(html_content: str, subject: str, recipients: list) -> tuple[bool, str]:
    """SMTP로 HTML 이메일 발송. (success: bool, error_msg: str)"""
    smtp_host = os.getenv("EMAIL_SMTP_HOST", "")
    smtp_port = int(os.getenv("EMAIL_SMTP_PORT", "587"))
    smtp_user = os.getenv("EMAIL_SMTP_USER", "")
    smtp_pass = os.getenv("EMAIL_SMTP_PASSWORD", "")
    enabled = os.getenv("EMAIL_ENABLED", "false").lower() == "true"

    if not enabled:
        logger.info("[브리핑] EMAIL_ENABLED=false → 발송 스킵 (미리보기 전용)")
        return True, ""

    if not (smtp_host and smtp_user and smtp_pass and recipients):
        msg = "SMTP 설정 누락 (EMAIL_SMTP_HOST / USER / PASSWORD / RECIPIENTS 확인)"
        logger.warning(f"[브리핑] {msg}")
        return False, msg

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_user
        msg["To"] = ", ".join(recipients)
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, recipients, msg.as_string())

        logger.info(f"[브리핑] 이메일 발송 완료 → {recipients}")
        return True, ""
    except Exception as e:
        logger.error(f"[브리핑] 이메일 발송 실패: {e}")
        return False, str(e)


def get_recipients() -> list:
    """환경변수에서 수신자 목록 파싱."""
    raw = os.getenv("EMAIL_RECIPIENTS", "")
    return [r.strip() for r in raw.split(",") if r.strip()]


def get_dashboard_url() -> str:
    return os.getenv("DASHBOARD_BASE_URL", "http://localhost:8000")


# ---------------------------------------------------------------------------
# 스케줄러 잡 함수
# ---------------------------------------------------------------------------

async def send_daily_briefing_job():
    """APScheduler 일간 브리핑 잡."""
    logger.info("[브리핑] 일간 브리핑 시작")
    session = db.SessionLocal()
    try:
        data = build_daily_briefing_data(session)
        dashboard_url = get_dashboard_url()
        html = render_briefing_html(data, "daily", dashboard_url)
        recipients = get_recipients()
        subject = f"[카드 이벤트 인텔리전스] {data['date_label']} 일간 브리핑"

        success, error = send_briefing_email(html, subject, recipients)

        db.create_briefing_log(
            session,
            briefing_type="daily",
            recipient_count=len(recipients),
            new_events_count=data["new_events_count"],
            high_threat_count=data.get("notable_count", 0),
            ending_soon_count=data["ending_soon_count"],
            status="sent" if success else "failed",
            error_msg=error or None,
        )
        logger.info(f"[브리핑] 일간 완료. 신규={data['new_events_count']}, 주목={data.get('notable_count', 0)}")
    except Exception as e:
        logger.error(f"[브리핑] 일간 잡 오류: {e}")
    finally:
        session.close()


async def send_weekly_briefing_job():
    """APScheduler 주간 브리핑 잡 (금요일)."""
    logger.info("[브리핑] 주간 브리핑 시작")
    session = db.SessionLocal()
    try:
        data = build_weekly_briefing_data(session)
        dashboard_url = get_dashboard_url()
        html = render_briefing_html(data, "weekly", dashboard_url)
        recipients = get_recipients()
        subject = f"[카드 이벤트 인텔리전스] {data['week_label']} 주간 경쟁 리포트"

        success, error = send_briefing_email(html, subject, recipients)

        db.create_briefing_log(
            session,
            briefing_type="weekly",
            recipient_count=len(recipients),
            new_events_count=data["new_events_count"],
            high_threat_count=data.get("notable_count", 0),
            ending_soon_count=0,
            status="sent" if success else "failed",
            error_msg=error or None,
        )
        logger.info(f"[브리핑] 주간 완료. 신규={data['new_events_count']}, 주목={data.get('notable_count', 0)}")
    except Exception as e:
        logger.error(f"[브리핑] 주간 잡 오류: {e}")
    finally:
        session.close()


# ---------------------------------------------------------------------------
# 신규 상품 알림 잡
# ---------------------------------------------------------------------------

def _render_new_product_alert_html(result: dict, dashboard_url: str) -> str:
    """신규 카드 상품 감지 알림 이메일 HTML 렌더링 (인라인 스타일)."""
    new_count = result.get("new_count", 0)
    total = result.get("total", 0)
    chunks = result.get("chunks", 0)
    new_products = result.get("new_products", [])
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    # 신규 상품 목록 HTML
    product_rows = ""
    for p in new_products[:20]:  # 최대 20개까지만 표시
        company = p.get("company", "")
        name = p.get("card_name", p.get("name", ""))
        card_type = p.get("card_type", "")
        product_rows += f"""
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;">{company}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;font-weight:600;">{name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#666;">{card_type}</td>
        </tr>"""

    if not product_rows:
        product_rows = """
        <tr>
            <td colspan="3" style="padding:12px;text-align:center;color:#999;">상세 목록 없음 (대시보드에서 확인하세요)</td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;background:#f5f5f5;">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

    <!-- 헤더 -->
    <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:24px 30px;color:#fff;">
        <h1 style="margin:0;font-size:20px;">신규 카드 상품 감지</h1>
        <p style="margin:8px 0 0;font-size:13px;opacity:0.85;">{now_str} 기준 | 카드 이벤트 인텔리전스</p>
    </div>

    <!-- 요약 -->
    <div style="padding:24px 30px;">
        <div style="display:flex;gap:16px;margin-bottom:20px;">
            <div style="flex:1;background:#f0f4ff;border-radius:8px;padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:700;color:#4f46e5;">{new_count}</div>
                <div style="font-size:12px;color:#666;margin-top:4px;">신규 상품</div>
            </div>
            <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:700;color:#16a34a;">{total}</div>
                <div style="font-size:12px;color:#666;margin-top:4px;">전체 상품</div>
            </div>
            <div style="flex:1;background:#fefce8;border-radius:8px;padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:700;color:#ca8a04;">{chunks}</div>
                <div style="font-size:12px;color:#666;margin-top:4px;">RAG 청크</div>
            </div>
        </div>

        <p style="font-size:14px;color:#333;line-height:1.6;">
            경쟁사 상품공시 페이지에서 <strong>{new_count}개의 신규 카드 상품</strong>이 감지되었습니다.
            RAG 인덱스가 자동으로 업데이트되었으며, 대시보드에서 관련 이벤트 분석에 활용됩니다.
        </p>

        <!-- 상품 목록 -->
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
            <thead>
                <tr style="background:#f8fafc;">
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;border-bottom:2px solid #e2e8f0;">카드사</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;border-bottom:2px solid #e2e8f0;">카드명</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;border-bottom:2px solid #e2e8f0;">유형</th>
                </tr>
            </thead>
            <tbody>
                {product_rows}
            </tbody>
        </table>

        <!-- CTA 버튼 -->
        <div style="text-align:center;margin-top:24px;">
            <a href="{dashboard_url}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
                대시보드에서 확인하기
            </a>
        </div>
    </div>

    <!-- 푸터 -->
    <div style="background:#f8fafc;padding:16px 30px;text-align:center;font-size:11px;color:#999;">
        카드 이벤트 인텔리전스 | 자동 상품 모니터링 알림
    </div>
</div>
</body>
</html>"""
    return html


async def check_new_products_job():
    """APScheduler 신규 상품 감지 잡 — 매일 07:00 실행."""
    logger.info("[RAG] 신규 상품 감지 잡 시작")
    try:
        from modules.rag import RAGEngine
        result = await RAGEngine.check_updates()
        new_count = result.get("new_count", 0)

        if new_count > 0:
            logger.info(f"[RAG] 신규 {new_count}개 감지! 알림 이메일 발송 시도")

            # 이메일 발송
            email_enabled = os.getenv("EMAIL_ENABLED", "false").lower() == "true"
            recipients = get_recipients()

            if email_enabled and recipients:
                dashboard_url = get_dashboard_url()
                html = _render_new_product_alert_html(result, dashboard_url)
                subject = f"[카드 인텔리전스] 신규 카드 상품 {new_count}건 감지"
                success, error = send_briefing_email(html, subject, recipients)

                # 발송 이력 저장
                session = db.SessionLocal()
                try:
                    db.create_briefing_log(
                        session,
                        briefing_type="new_product_alert",
                        recipient_count=len(recipients),
                        new_events_count=new_count,
                        high_threat_count=0,
                        ending_soon_count=0,
                        status="sent" if success else "failed",
                        error_msg=error or None,
                    )
                except Exception:
                    session.rollback()
                finally:
                    session.close()

                if success:
                    logger.info(f"[RAG] 신규 상품 알림 발송 완료 → {recipients}")
                else:
                    logger.error(f"[RAG] 신규 상품 알림 발송 실패: {error}")
            else:
                logger.info(f"[RAG] 신규 {new_count}개 감지 (이메일 미설정, 콘솔 알림만)")
        else:
            logger.info("[RAG] 신규 상품 없음")
    except Exception as e:
        logger.error(f"[RAG] 신규 상품 감지 잡 오류: {e}")
