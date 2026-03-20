import json

from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session

import database as db


router = APIRouter()


def _parse_warning_json(raw_value):
    if raw_value in (None, ""):
        return []
    if isinstance(raw_value, (dict, list)):
        return raw_value
    try:
        return json.loads(raw_value)
    except (TypeError, ValueError):
        return raw_value


@router.get("/api/briefing/preview", response_class=HTMLResponse)
async def briefing_preview(
    type: str = Query("daily", pattern="^(daily|weekly)$"),
    db_session: Session = Depends(db.get_db),
):
    from modules.briefing import (
        build_daily_briefing_data,
        build_weekly_briefing_data,
        get_dashboard_url,
        render_briefing_html,
    )

    dashboard_url = get_dashboard_url()
    data = build_daily_briefing_data(db_session) if type == "daily" else build_weekly_briefing_data(db_session)
    return render_briefing_html(data, type, dashboard_url)


@router.get("/api/briefing/status")
async def briefing_status(db_session: Session = Depends(db.get_db)):
    from modules.briefing import (
        build_briefing_status_snapshot,
        build_daily_briefing_data,
        build_weekly_briefing_data,
    )

    daily_data = build_daily_briefing_data(db_session)
    weekly_data = build_weekly_briefing_data(db_session)
    return {
        "daily": build_briefing_status_snapshot(daily_data),
        "weekly": build_briefing_status_snapshot(weekly_data),
    }


@router.post("/api/briefing/send-now")
async def briefing_send_now(
    type: str = Query("daily", pattern="^(daily|weekly)$"),
    mode: str = Query("production", pattern="^(test|production)$"),
    db_session: Session = Depends(db.get_db),
):
    from modules.briefing import (
        build_briefing_log_metadata,
        build_daily_briefing_data,
        build_weekly_briefing_data,
        get_dashboard_url,
        get_recipients,
        production_send_blocked,
        render_briefing_html,
        send_briefing_email,
    )

    dashboard_url = get_dashboard_url()
    if type == "daily":
        data = build_daily_briefing_data(db_session)
        subject = f"[Card Event Intelligence] Daily briefing {data['date_label']}"
    else:
        data = build_weekly_briefing_data(db_session)
        subject = f"[Card Event Intelligence] Weekly briefing {data['week_label']}"

    if mode == "production" and production_send_blocked(data):
        return JSONResponse(
            status_code=409,
            content={
                "detail": "briefing readiness is blocked",
                "readiness_status": "blocked",
                "delivery_mode": mode,
                "period_label": data.get("period_label", ""),
            },
        )

    html = render_briefing_html(data, type, dashboard_url)
    recipients = get_recipients(mode=mode)
    success, error = send_briefing_email(html, subject, recipients)

    log_metadata = build_briefing_log_metadata(
        data,
        delivery_mode=mode,
        recipient_count=len(recipients),
        status="sent" if success else "failed",
        error_msg=error or None,
    )
    db.create_briefing_log(db_session, **log_metadata)

    return {
        "sent": success,
        "delivery_mode": mode,
        "warning_count": data.get("warning_count", 0),
        "ai_summary_status": data.get("ai_summary_status", "rule"),
        "period_label": data.get("period_label", ""),
        "source_event_count": data.get("source_event_count", 0),
        "source_product_count": data.get("source_product_count", 0),
        "warning_json": data.get("quality_warnings", []),
        "template_version": data.get("template_version"),
        "recipients": recipients,
        "subject": subject,
        "error": error or None,
    }


@router.get("/report/weekly", response_class=HTMLResponse)
async def weekly_report_page(db_session: Session = Depends(db.get_db)):
    from modules.briefing import build_weekly_briefing_data, get_dashboard_url, render_briefing_html

    data = build_weekly_briefing_data(db_session)
    return render_briefing_html(data, "weekly", get_dashboard_url())


@router.get("/api/briefing/logs")
async def briefing_logs(
    limit: int = Query(20, ge=1, le=100),
    db_session: Session = Depends(db.get_db),
):
    rows = db.get_briefing_logs(db_session, limit=limit)
    return [
        {
            "id": row.id,
            "briefing_type": row.briefing_type,
            "sent_at": row.sent_at.isoformat() if row.sent_at else None,
            "recipient_count": row.recipient_count,
            "new_events_count": row.new_events_count,
            "high_threat_count": row.high_threat_count,
            "ending_soon_count": row.ending_soon_count,
            "period_label": row.period_label,
            "source_event_count": row.source_event_count,
            "source_product_count": row.source_product_count,
            "warning_count": row.warning_count,
            "warning_json": _parse_warning_json(row.warning_json),
            "ai_summary_status": row.ai_summary_status,
            "delivery_mode": row.delivery_mode,
            "template_version": row.template_version,
            "status": row.status,
            "error_msg": row.error_msg,
        }
        for row in rows
    ]
