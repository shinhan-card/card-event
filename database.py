"""
카드 이벤트 데이터베이스 모듈
SQLAlchemy를 사용한 SQLite 데이터베이스 관리

테이블:
  events           - 정규화된 이벤트 현재 상태
  event_snapshots  - 수집 시점별 원본/구조화 스냅샷
  event_sections   - 혜택/참여방법/유의사항 등 섹션별 정규화
  event_insights   - 인사이트 (rule-based + AI)
  jobs             - 수집/추출/인사이트 잡 상태 추적
"""

import json
import os
import re
from datetime import datetime, date
from typing import List, Optional

from sqlalchemy import (
    create_engine, Column, String, Integer, Float, DateTime, Date,
    Text, ForeignKey, or_, Index,
)
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

# ---------------------------------------------------------------------------
# 엔진 / 세션 / 베이스
# ---------------------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./events.db")

_engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ===========================================================================
# 모델 정의
# ===========================================================================

class CardEvent(Base):
    """이벤트 마스터 테이블 (정규화된 현재 상태)"""
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    url = Column(String, unique=True, index=True, nullable=False)
    company = Column(String, index=True, nullable=False)
    category = Column(String, index=True)
    title = Column(String, nullable=False)
    period = Column(String)                # 원본 기간 문자열 (하위호환)
    period_start = Column(Date)            # 파싱된 시작일
    period_end = Column(Date)              # 파싱된 종료일
    benefit_type = Column(String)
    benefit_value = Column(String)         # 원본 혜택 문자열 (하위호환)
    benefit_amount_won = Column(Integer)   # 파싱된 원화 금액
    benefit_pct = Column(Float)            # 파싱된 할인율
    conditions = Column(Text)
    target_segment = Column(String)
    threat_level = Column(String, index=True)
    one_line_summary = Column(Text)
    raw_text = Column(Text)
    detail_quality_score = Column(Float)
    needs_review = Column(Integer, index=True, default=0)
    review_reason = Column(Text)
    classification_confidence = Column(Float)
    classification_source = Column(String, default="rule")
    classification_reason_json = Column(Text)
    condition_flags_json = Column(Text)
    is_curated = Column(Integer, index=True, default=0)
    linked_cards = Column(Text)
    marketing_content = Column(Text)       # JSON (하위호환, deprecated)
    marketing_insights = Column(Text)      # JSON (하위호환, deprecated)
    status = Column(String, index=True, default="active")  # active / ended / unknown
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # relationships
    snapshots = relationship("EventSnapshot", back_populates="event", cascade="all, delete-orphan")
    sections = relationship("EventSection", back_populates="event", cascade="all, delete-orphan")
    insights = relationship("EventInsight", back_populates="event", cascade="all, delete-orphan")
    jobs_rel = relationship("Job", back_populates="event", cascade="all, delete-orphan")


class EventSnapshot(Base):
    """수집 시점별 원본/구조화 스냅샷 — 변화 추적용"""
    __tablename__ = "event_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=False)
    raw_html = Column(Text)
    raw_text = Column(Text)
    extracted_json = Column(Text)          # 추출 결과 JSON
    extraction_latency_ms = Column(Integer)
    noise_ratio = Column(Float)
    captured_at = Column(DateTime, default=datetime.now)

    event = relationship("CardEvent", back_populates="snapshots")


class EventSection(Base):
    """이벤트 마케팅 콘텐츠 섹션별 정규화"""
    __tablename__ = "event_sections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=False)
    section_type = Column(String, index=True, nullable=False)  # 혜택_상세, 참여방법, 유의사항, ...
    content = Column(Text, nullable=False)
    sort_order = Column(Integer, default=0)

    event = relationship("CardEvent", back_populates="sections")

    __table_args__ = (
        Index("ix_sections_event_type", "event_id", "section_type"),
    )


class EventInsight(Base):
    """이벤트 인사이트 (rule-based / AI)"""
    __tablename__ = "event_insights"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=False)
    benefit_level = Column(String)           # 높음/중상/보통/낮음
    benefit_score = Column(Float)            # 0~4 수치
    target_clarity = Column(String)          # 높음/보통/낮음
    objective_tags = Column(Text)            # JSON array
    target_tags = Column(Text)               # JSON array
    channel_tags = Column(Text)              # JSON array
    competitive_points = Column(Text)        # JSON array
    promo_strategies = Column(Text)          # JSON array
    threat_level = Column(String)
    threat_reason = Column(Text)
    marketing_takeaway = Column(Text)
    evidence = Column(Text)                  # JSON array of source sentences
    insight_confidence = Column(Float)       # 0~1
    section_coverage = Column(Float)         # 0~1
    source = Column(String, default="rule")  # rule / gemini / hybrid
    generated_at = Column(DateTime, default=datetime.now)

    event = relationship("CardEvent", back_populates="insights")


class EventProductLink(Base):
    """Normalized links between events and canonical card products."""
    __tablename__ = "event_product_links"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=False)
    product_key = Column(String, nullable=False)
    company = Column(String, index=True, nullable=False)
    card_name = Column(String, nullable=False)
    matched_text = Column(String)
    match_method = Column(String, default="exact")
    confidence = Column(Float)
    created_at = Column(DateTime, default=datetime.now)

    event = relationship("CardEvent", backref="product_links_rel")

    __table_args__ = (
        Index("ix_event_product_links_event_key", "event_id", "product_key", unique=True),
    )


class EventConditionFact(Base):
    """Structured condition facts extracted from event text."""
    __tablename__ = "event_condition_facts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=False)
    fact_type = Column(String, index=True, nullable=False)
    comparator = Column(String)
    value_bool = Column(Integer)
    value_number = Column(Float)
    value_text = Column(String)
    value_date = Column(Date)
    unit = Column(String)
    source_text = Column(Text)
    confidence = Column(Float)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)

    event = relationship("CardEvent", backref="condition_facts_rel")

    __table_args__ = (
        Index("ix_event_condition_facts_event_type", "event_id", "fact_type"),
    )


class EventManualEdit(Base):
    """수동 정정 이력"""
    __tablename__ = "event_manual_edits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=False)
    field_name = Column(String, nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    editor = Column(String, default="admin")
    edited_at = Column(DateTime, default=datetime.now)
    reason = Column(Text)

    event = relationship("CardEvent", backref="manual_edits")

    __table_args__ = (
        Index("ix_manual_edits_event_date", "event_id", "edited_at"),
    )


class EventCurationState(Base):
    """이벤트 잠금 상태 (재추출 방지)"""
    __tablename__ = "event_curation_state"

    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), primary_key=True)
    is_locked = Column(Integer, default=0)  # 0=unlocked, 1=locked
    locked_by = Column(String)
    locked_at = Column(DateTime)
    lock_reason = Column(Text)

    event = relationship("CardEvent", backref="curation_state")


class Job(Base):
    """파이프라인 잡 상태 추적"""
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_type = Column(String, index=True, nullable=False)  # ingest / extract / insight
    event_id = Column(Integer, ForeignKey("events.id", ondelete="SET NULL"), index=True)
    company = Column(String, index=True)
    status = Column(String, index=True, default="pending")  # pending / running / success / failed
    retry_count = Column(Integer, default=0)
    last_error = Column(Text)
    started_at = Column(DateTime)
    finished_at = Column(DateTime)

    event = relationship("CardEvent", back_populates="jobs_rel")


class BriefingLog(Base):
    """Briefing and alert delivery history."""
    __tablename__ = "briefing_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    briefing_type = Column(String, index=True, nullable=False)
    period_label = Column(String, default="")
    recipient_count = Column(Integer, default=0)
    new_events_count = Column(Integer, default=0)
    source_event_count = Column(Integer, default=0)
    source_product_count = Column(Integer, default=0)
    high_threat_count = Column(Integer, default=0)
    ending_soon_count = Column(Integer, default=0)
    warning_count = Column(Integer, default=0)
    warning_json = Column(Text)
    ai_summary_status = Column(String, default="rule")
    delivery_mode = Column(String, default="production")
    template_version = Column(String, default="v2")
    status = Column(String, index=True, default="sent")
    error_msg = Column(Text)
    sent_at = Column(DateTime, default=datetime.now, index=True)


def _ensure_briefing_log_columns():
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    if "briefing_logs" not in inspector.get_table_names():
        return

    existing_cols = {column["name"] for column in inspector.get_columns("briefing_logs")}
    new_cols = {
        "period_label": "VARCHAR DEFAULT ''",
        "source_event_count": "INTEGER DEFAULT 0",
        "source_product_count": "INTEGER DEFAULT 0",
        "warning_count": "INTEGER DEFAULT 0",
        "warning_json": "TEXT",
        "ai_summary_status": "VARCHAR DEFAULT 'rule'",
        "delivery_mode": "VARCHAR DEFAULT 'production'",
        "template_version": "VARCHAR DEFAULT 'v2'",
    }

    with engine.connect() as conn:
        for col_name, col_type in new_cols.items():
            if col_name in existing_cols:
                continue
            conn.execute(text(f"ALTER TABLE briefing_logs ADD COLUMN {col_name} {col_type}"))
        conn.commit()


# ===========================================================================
# 초기화
# ===========================================================================

def _ensure_event_columns():
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    if "events" not in inspector.get_table_names():
        return

    existing_cols = {column["name"] for column in inspector.get_columns("events")}
    new_cols = {
        "detail_quality_score": "FLOAT",
        "needs_review": "INTEGER DEFAULT 0",
        "review_reason": "TEXT",
        "classification_confidence": "FLOAT",
        "classification_source": "VARCHAR DEFAULT 'rule'",
        "classification_reason_json": "TEXT",
        "condition_flags_json": "TEXT",
        "is_curated": "INTEGER DEFAULT 0",
        "linked_cards": "TEXT",
    }

    with engine.connect() as conn:
        for col_name, col_type in new_cols.items():
            if col_name in existing_cols:
                continue
            conn.execute(text(f"ALTER TABLE events ADD COLUMN {col_name} {col_type}"))
        conn.commit()


def init_db():
    """데이터베이스 초기화 (테이블 생성)"""
    Base.metadata.create_all(bind=engine)
    _ensure_event_columns()
    _ensure_briefing_log_columns()
    print("[OK] 데이터베이스가 초기화되었습니다.")


def get_db():
    """FastAPI Depends용 세션 생성기"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===========================================================================
# 유틸: 파싱 헬퍼
# ===========================================================================

EMPTY_MARKERS = ('', '정보 없음', '정보없음', '제목 없음', '상세 페이지 참조', '-', ' / ', '/')


def _is_empty_value(s: str) -> bool:
    if not s or not (s := s.strip()):
        return True
    if s in EMPTY_MARKERS:
        return True
    if '정보 없음' in s or '정보없음' in s:
        return True
    return False


def parse_period_dates(period_str: str):
    """period 문자열 -> (start_date, end_date) 또는 (None, None)"""
    if not period_str:
        return None, None
    text = str(period_str).strip()
    # YYYY.MM.DD~YYYY.MM.DD
    m = re.search(
        r'(\d{2,4})[./-](\d{1,2})[./-](\d{1,2})\s*(?:~|～|-|–)\s*(\d{2,4})[./-](\d{1,2})[./-](\d{1,2})',
        text,
    )
    if m:
        try:
            sy = int(m.group(1)); sy = sy + 2000 if sy < 100 else sy
            ey = int(m.group(4)); ey = ey + 2000 if ey < 100 else ey
            return date(sy, int(m.group(2)), int(m.group(3))), date(ey, int(m.group(5)), int(m.group(6)))
        except Exception:
            pass
    return None, None


def parse_benefit_amount(value_str: str):
    """benefit_value 문자열 -> (amount_won: int, pct: float)"""
    if not value_str:
        return None, None
    text = str(value_str).replace(",", "").replace(" ", "")
    amount_won = None
    pct = None
    # 금액: 5000원, 5만원, 30만원
    am = re.search(r'(\d+)(만|천)?원', text)
    if am:
        v = int(am.group(1))
        if am.group(2) == '만':
            v *= 10000
        elif am.group(2) == '천':
            v *= 1000
        amount_won = v
    # 비율: 10%, 30%
    pm = re.search(r'(\d+(?:\.\d+)?)%', text)
    if pm:
        pct = float(pm.group(1))
    return amount_won, pct


def compute_status(period_end: Optional[date]) -> str:
    if period_end is None:
        return "unknown"
    return "active" if period_end >= date.today() else "ended"


def _parse_json_field(value) -> Optional[dict]:
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            return json.loads(text)
        except Exception:
            return None
    return None


# ===========================================================================
# CRUD: events
# ===========================================================================

def has_meaningful_info(event) -> bool:
    """이벤트에 실질적인 정보가 있는지 판단 (목록 노출용).
    수집 직후(추출 전)에도 제목과 URL만 있으면 목록에 표시한다.
    """
    title = (event.title or '').strip()
    if not title or title in EMPTY_MARKERS:
        return False
    if title.startswith('이벤트에 응모되었습니다') or title.startswith('이벤트에 응모 되었습니다'):
        return False
    if '마이홈 앱의' in title and '자산 연결' in title:
        return False
    # 제목과 URL이 있으면 수집 직후라도 목록에 표시
    url = (event.url or '').strip()
    if title and url and url.startswith('http'):
        return True
    return False


_GENERIC_COMPANY_NAMES = {
    "삼성카드", "삼성 카드", "samsung card", "samsungcard", "samsung",
    "신한카드", "신한 카드", "shinhan card", "shinhancard",
    "kb국민카드", "국민카드", "kb card", "kbcard",
    "현대카드", "현대 카드", "hyundai card", "hyundaicard",
    "event", "이벤트", "이벤트 목록", "카드",
}


def insert_event(db, event_data: dict) -> Optional[int]:
    """이벤트 삽입 (중복 URL 체크 + 정크 제목 거부). 성공 시 event.id 반환, 거부/중복이면 None."""
    # 제목이 없거나 회사명만 있는 정크 데이터 거부
    title = (event_data.get("title") or "").strip()
    if not title or len(title) < 3 or title.lower() in _GENERIC_COMPANY_NAMES:
        return None
    existing = db.query(CardEvent).filter(CardEvent.url == event_data.get("url")).first()
    if existing:
        return None
    # period -> dates 파싱
    ps, pe = parse_period_dates(event_data.get("period"))
    aw, bp = parse_benefit_amount(event_data.get("benefit_value"))
    safe = {k: v for k, v in event_data.items() if hasattr(CardEvent, k)}
    safe.setdefault("period_start", ps)
    safe.setdefault("period_end", pe)
    safe.setdefault("benefit_amount_won", aw)
    safe.setdefault("benefit_pct", bp)
    safe.setdefault("status", compute_status(pe))
    new_event = CardEvent(**safe)
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event.id


def get_all_events(db, filters: dict = None):
    query = db.query(CardEvent)
    if filters:
        if filters.get("company"):
            query = query.filter(CardEvent.company == filters["company"])
        if filters.get("category"):
            query = query.filter(CardEvent.category == filters["category"])
        if filters.get("benefit_type"):
            query = query.filter(CardEvent.benefit_type == filters["benefit_type"])
        if filters.get("threat_level"):
            query = query.filter(CardEvent.threat_level == filters["threat_level"])
        if filters.get("needs_review") is not None:
            query = query.filter(CardEvent.needs_review == int(bool(filters["needs_review"])))
    all_rows = query.order_by(CardEvent.created_at.desc()).all()
    return [e for e in all_rows if has_meaningful_info(e)]


def get_event_by_id(db, event_id: int):
    return db.query(CardEvent).filter(CardEvent.id == event_id).first()


def get_events_needing_review(db, limit: int = 100):
    rows = db.query(CardEvent).filter(CardEvent.needs_review == 1).order_by(CardEvent.updated_at.desc()).limit(limit).all()
    return [event for event in rows if has_meaningful_info(event)]


def get_events_pending_extraction(db, limit: int = None):
    """상세 추출 미완료 이벤트. 데모 더미 URL 제외."""
    q = db.query(CardEvent).filter(
        CardEvent.url.isnot(None),
        CardEvent.url != "",
        CardEvent.url.notlike("%/event/detail/%"),
        or_(
            CardEvent.marketing_content.is_(None),
            CardEvent.marketing_content == "",
            CardEvent.marketing_content == "{}",
        ),
    ).order_by(CardEvent.created_at.desc())
    if limit is not None:
        q = q.limit(limit)
    return q.all()


def update_event(db, event_id: int, update_data: dict) -> bool:
    """이벤트 필드 업데이트. JSON 필드 자동 직렬화."""
    event = db.query(CardEvent).filter(CardEvent.id == event_id).first()
    if not event:
        return False
    allowed = {
        "title", "period", "period_start", "period_end",
        "benefit_type", "benefit_value", "benefit_amount_won", "benefit_pct",
        "conditions", "target_segment", "one_line_summary", "raw_text",
        "marketing_content", "marketing_insights", "linked_cards",
        "category", "threat_level", "status",
        "detail_quality_score", "needs_review", "review_reason",
        "classification_confidence", "classification_source",
        "classification_reason_json", "condition_flags_json", "is_curated",
    }
    json_fields = {
        "marketing_content",
        "marketing_insights",
        "classification_reason_json",
        "condition_flags_json",
        "linked_cards",
    }
    for key in allowed:
        if key in update_data and update_data[key] is not None:
            value = update_data[key]
            if key in json_fields and isinstance(value, (dict, list)):
                value = json.dumps(value, ensure_ascii=False)
            setattr(event, key, value)
    # period 변경 시 자동 파싱
    if "period" in update_data:
        ps, pe = parse_period_dates(update_data["period"])
        if ps:
            event.period_start = ps
        if pe:
            event.period_end = pe
            event.status = compute_status(pe)
    db.commit()
    db.refresh(event)
    return True


def delete_event(db, event_id: int) -> bool:
    event = db.query(CardEvent).filter(CardEvent.id == event_id).first()
    if event:
        db.delete(event)
        db.commit()
        return True
    return False


def get_companies(db):
    return [c[0] for c in db.query(CardEvent.company).distinct().all()]


def get_categories(db):
    return [c[0] for c in db.query(CardEvent.category).distinct().all() if c[0]]


def create_briefing_log(db, briefing_type: str, recipient_count: int = 0,
                        new_events_count: int = 0, high_threat_count: int = 0,
                        ending_soon_count: int = 0, status: str = "sent",
                        error_msg: str = None, period_label: str = "",
                        source_event_count: int = 0, source_product_count: int = 0,
                        warning_count: int = 0, warning_json=None,
                        ai_summary_status: str = "rule", delivery_mode: str = "production",
                        template_version: str = "v2"):
    if isinstance(warning_json, (dict, list)):
        warning_json = json.dumps(warning_json, ensure_ascii=False)
    row = BriefingLog(
        briefing_type=briefing_type,
        period_label=period_label,
        recipient_count=recipient_count,
        new_events_count=new_events_count,
        source_event_count=source_event_count,
        source_product_count=source_product_count,
        high_threat_count=high_threat_count,
        ending_soon_count=ending_soon_count,
        warning_count=warning_count,
        warning_json=warning_json,
        ai_summary_status=ai_summary_status,
        delivery_mode=delivery_mode,
        template_version=template_version,
        status=status,
        error_msg=error_msg,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_briefing_logs(db, limit: int = 20):
    return db.query(BriefingLog).order_by(BriefingLog.sent_at.desc()).limit(limit).all()


# ===========================================================================
# CRUD: snapshots
# ===========================================================================

def save_snapshot(db, event_id: int, raw_html: str = None, raw_text: str = None,
                  extracted_json: dict = None, latency_ms: int = None, noise_ratio: float = None):
    snap = EventSnapshot(
        event_id=event_id,
        raw_html=raw_html,
        raw_text=raw_text,
        extracted_json=json.dumps(extracted_json, ensure_ascii=False) if extracted_json else None,
        extraction_latency_ms=latency_ms,
        noise_ratio=noise_ratio,
    )
    db.add(snap)
    db.commit()
    return snap.id


def get_snapshots(db, event_id: int):
    return db.query(EventSnapshot).filter(EventSnapshot.event_id == event_id)\
        .order_by(EventSnapshot.captured_at.desc()).all()


# ===========================================================================
# CRUD: sections
# ===========================================================================

def save_sections(db, event_id: int, sections_dict: dict):
    """marketing_content dict를 event_sections 행으로 저장 (기존 삭제 후 재생성)."""
    db.query(EventSection).filter(EventSection.event_id == event_id).delete()
    order = 0
    for section_type, items in sections_dict.items():
        if isinstance(items, list):
            for item in items:
                if item:
                    db.add(EventSection(event_id=event_id, section_type=section_type,
                                        content=str(item)[:2000], sort_order=order))
                    order += 1
        elif items:
            db.add(EventSection(event_id=event_id, section_type=section_type,
                                content=str(items)[:2000], sort_order=order))
            order += 1
    db.commit()


def get_sections(db, event_id: int):
    return db.query(EventSection).filter(EventSection.event_id == event_id)\
        .order_by(EventSection.sort_order).all()


# ===========================================================================
# CRUD: insights
# ===========================================================================

def save_insight(db, event_id: int, insight_data: dict, source: str = "rule"):
    """인사이트 저장 (기존 동일 source 삭제 후 재생성)."""
    db.query(EventInsight).filter(
        EventInsight.event_id == event_id,
        EventInsight.source == source,
    ).delete()
    json_fields = ("objective_tags", "target_tags", "channel_tags",
                    "competitive_points", "promo_strategies", "evidence")
    row = EventInsight(event_id=event_id, source=source)
    for k, v in insight_data.items():
        if hasattr(row, k):
            if k in json_fields and isinstance(v, (list, dict)):
                setattr(row, k, json.dumps(v, ensure_ascii=False))
            else:
                setattr(row, k, v)
    db.add(row)
    db.commit()
    return row.id


def get_latest_insight(db, event_id: int):
    """가장 최근 인사이트 반환 (gemini > hybrid > rule 우선)"""
    for src in ("gemini", "hybrid", "rule"):
        ins = db.query(EventInsight).filter(
            EventInsight.event_id == event_id,
            EventInsight.source == src,
        ).order_by(EventInsight.generated_at.desc()).first()
        if ins:
            return ins
    return db.query(EventInsight).filter(EventInsight.event_id == event_id)\
        .order_by(EventInsight.generated_at.desc()).first()


# ===========================================================================
# CRUD: event product links
# ===========================================================================

def replace_event_product_links(db, event_id: int, links: list[dict]):
    db.query(EventProductLink).filter(EventProductLink.event_id == event_id).delete()
    for link in links:
        if not link.get("product_key") or not link.get("card_name") or not link.get("company"):
            continue
        db.add(EventProductLink(
            event_id=event_id,
            product_key=str(link["product_key"])[:255],
            company=str(link["company"])[:120],
            card_name=str(link["card_name"])[:255],
            matched_text=str(link.get("matched_text") or "")[:255] or None,
            match_method=str(link.get("match_method") or "exact")[:40],
            confidence=link.get("confidence"),
        ))
    db.commit()


def sync_event_product_links(db, event_id: int, linked_cards, company: str = ""):
    from modules.product_links import match_linked_cards

    links = match_linked_cards(linked_cards or [], company=company or "")
    replace_event_product_links(db, event_id, links)
    return links


def get_event_product_links(db, event_id: int, auto_sync: bool = True):
    rows = db.query(EventProductLink).filter(
        EventProductLink.event_id == event_id
    ).order_by(EventProductLink.confidence.desc(), EventProductLink.id.asc()).all()

    if rows or not auto_sync:
        return rows

    event = get_event_by_id(db, event_id)
    if not event:
        return rows

    linked_cards = _parse_json_field(getattr(event, "linked_cards", None))
    if isinstance(linked_cards, list) and linked_cards:
        sync_event_product_links(db, event_id, linked_cards, company=event.company or "")
        rows = db.query(EventProductLink).filter(
            EventProductLink.event_id == event_id
        ).order_by(EventProductLink.confidence.desc(), EventProductLink.id.asc()).all()

    return rows


# ===========================================================================
# CRUD: event condition facts
# ===========================================================================

def replace_event_condition_facts(db, event_id: int, facts: list[dict]):
    db.query(EventConditionFact).filter(EventConditionFact.event_id == event_id).delete()
    for order, fact in enumerate(facts or []):
        db.add(EventConditionFact(
            event_id=event_id,
            fact_type=str(fact.get("fact_type") or "")[:80],
            comparator=str(fact.get("comparator") or "")[:20] or None,
            value_bool=fact.get("value_bool"),
            value_number=fact.get("value_number"),
            value_text=str(fact.get("value_text") or "")[:255] or None,
            value_date=fact.get("value_date"),
            unit=str(fact.get("unit") or "")[:32] or None,
            source_text=str(fact.get("source_text") or "")[:2000] or None,
            confidence=fact.get("confidence"),
            sort_order=order,
        ))
    db.commit()


def sync_event_condition_facts(db, event_id: int, existing_event=None, extracted: dict = None, normalized: dict = None):
    from modules.condition_facts import build_condition_facts

    facts = build_condition_facts(existing_event=existing_event, extracted=extracted, normalized=normalized)
    replace_event_condition_facts(db, event_id, facts)
    return facts


def get_event_condition_facts(db, event_id: int, auto_sync: bool = True):
    rows = db.query(EventConditionFact).filter(
        EventConditionFact.event_id == event_id
    ).order_by(EventConditionFact.sort_order.asc(), EventConditionFact.id.asc()).all()

    if rows or not auto_sync:
        return rows

    event = get_event_by_id(db, event_id)
    if not event:
        return rows

    sync_event_condition_facts(db, event_id, existing_event=event)
    rows = db.query(EventConditionFact).filter(
        EventConditionFact.event_id == event_id
    ).order_by(EventConditionFact.sort_order.asc(), EventConditionFact.id.asc()).all()
    return rows


# ===========================================================================
# CRUD: jobs
# ===========================================================================

def create_job(db, job_type: str, event_id: int = None, company: str = None) -> int:
    job = Job(job_type=job_type, event_id=event_id, company=company,
              status="pending", started_at=datetime.now())
    db.add(job)
    db.commit()
    return job.id


def update_job(db, job_id: int, status: str, error: str = None):
    job = db.query(Job).filter(Job.id == job_id).first()
    if job:
        job.status = status
        if error:
            job.last_error = error[:2000]
        if status in ("success", "failed"):
            job.finished_at = datetime.now()
        if status == "failed":
            job.retry_count = (job.retry_count or 0) + 1
        db.commit()


def get_jobs(db, job_type: str = None, status: str = None, limit: int = 50):
    q = db.query(Job)
    if job_type:
        q = q.filter(Job.job_type == job_type)
    if status:
        q = q.filter(Job.status == status)
    return q.order_by(Job.id.desc()).limit(limit).all()


def get_job_stats(db):
    """잡 통계: 타입별 성공/실패/대기 수"""
    from sqlalchemy import func
    rows = db.query(Job.job_type, Job.status, func.count(Job.id))\
        .group_by(Job.job_type, Job.status).all()
    stats = {}
    for jt, st, cnt in rows:
        stats.setdefault(jt, {})[st] = cnt
    return stats


# ===========================================================================
# CRUD: manual edits / curation state
# ===========================================================================

def save_manual_edit(db, event_id: int, field_name: str, old_value, new_value, editor: str = "admin", reason: str = None):
    edit = EventManualEdit(
        event_id=event_id, field_name=field_name,
        old_value=str(old_value)[:2000] if old_value is not None else None,
        new_value=str(new_value)[:2000] if new_value is not None else None,
        editor=editor, reason=reason,
    )
    db.add(edit)
    db.commit()
    return edit.id


def get_edit_history(db, event_id: int):
    return db.query(EventManualEdit).filter(
        EventManualEdit.event_id == event_id
    ).order_by(EventManualEdit.edited_at.desc()).all()


def get_all_edit_history(db, event_id: int = None, editor: str = None,
                         from_date: datetime = None, to_date: datetime = None,
                         limit: int = 100, offset: int = 0):
    """전체 수동 정정 로그 조회 (페이지네이션 + 필터)."""
    q = db.query(EventManualEdit)
    if event_id:
        q = q.filter(EventManualEdit.event_id == event_id)
    if editor:
        q = q.filter(EventManualEdit.editor == editor)
    if from_date:
        q = q.filter(EventManualEdit.edited_at >= from_date)
    if to_date:
        q = q.filter(EventManualEdit.edited_at <= to_date)
    total = q.count()
    rows = q.order_by(EventManualEdit.edited_at.desc()).offset(offset).limit(limit).all()
    return rows, total


def lock_event(db, event_id: int, locked_by: str = "admin", reason: str = None):
    state = db.query(EventCurationState).filter(EventCurationState.event_id == event_id).first()
    if state:
        state.is_locked = 1
        state.locked_by = locked_by
        state.locked_at = datetime.now()
        state.lock_reason = reason
    else:
        state = EventCurationState(
            event_id=event_id, is_locked=1,
            locked_by=locked_by, locked_at=datetime.now(), lock_reason=reason,
        )
        db.add(state)
    db.commit()


def unlock_event(db, event_id: int):
    state = db.query(EventCurationState).filter(EventCurationState.event_id == event_id).first()
    if state:
        state.is_locked = 0
        state.locked_by = None
        state.locked_at = None
        state.lock_reason = None
        db.commit()


def is_event_locked(db, event_id: int) -> bool:
    state = db.query(EventCurationState).filter(EventCurationState.event_id == event_id).first()
    return bool(state and state.is_locked)


def get_curation_state(db, event_id: int):
    return db.query(EventCurationState).filter(EventCurationState.event_id == event_id).first()


# ===========================================================================
# 마이그레이션 (기존 DB -> 확장 스키마)
# ===========================================================================

def run_migration():
    """기존 events.db를 확장 스키마로 마이그레이션."""
    from sqlalchemy import inspect, text

    # 1) 새 테이블 생성
    init_db()

    inspector = inspect(engine)
    existing_cols = {c["name"] for c in inspector.get_columns("events")}
    new_cols = {
        "period_start": "DATE",
        "period_end": "DATE",
        "benefit_amount_won": "INTEGER",
        "benefit_pct": "FLOAT",
        "status": "VARCHAR DEFAULT 'unknown'",
        "detail_quality_score": "FLOAT",
        "needs_review": "INTEGER DEFAULT 0",
        "review_reason": "TEXT",
        "classification_confidence": "FLOAT",
        "classification_source": "VARCHAR DEFAULT 'rule'",
        "classification_reason_json": "TEXT",
        "condition_flags_json": "TEXT",
        "is_curated": "INTEGER DEFAULT 0",
        "linked_cards": "TEXT",
    }

    with engine.connect() as conn:
        # 2) events에 새 컬럼 추가
        for col_name, col_type in new_cols.items():
            if col_name not in existing_cols:
                try:
                    conn.execute(text(f"ALTER TABLE events ADD COLUMN {col_name} {col_type}"))
                    print(f"[MIGRATE] events.{col_name} 추가됨")
                except Exception as e:
                    if "duplicate" not in str(e).lower():
                        print(f"[MIGRATE] events.{col_name} 추가 실패: {e}")
        conn.commit()

    # 3) 기존 데이터 파싱: period -> dates, benefit_value -> amounts, status
    session = SessionLocal()
    try:
        events = session.query(CardEvent).all()
        migrated = 0
        for ev in events:
            changed = False
            if ev.period and not ev.period_start:
                ps, pe = parse_period_dates(ev.period)
                if ps:
                    ev.period_start = ps
                    changed = True
                if pe:
                    ev.period_end = pe
                    ev.status = compute_status(pe)
                    changed = True
            if ev.benefit_value and not ev.benefit_amount_won:
                aw, bp = parse_benefit_amount(ev.benefit_value)
                if aw:
                    ev.benefit_amount_won = aw
                    changed = True
                if bp:
                    ev.benefit_pct = bp
                    changed = True
            if not ev.status or ev.status == "unknown":
                ev.status = compute_status(ev.period_end)
                changed = True
            if ev.needs_review is None:
                ev.needs_review = 0
            if ev.is_curated is None:
                ev.is_curated = 0

            # 4) marketing_content -> event_sections
            mc = _parse_json_field(ev.marketing_content)
            if mc and not session.query(EventSection).filter(EventSection.event_id == ev.id).first():
                save_sections(session, ev.id, mc)

            # 5) marketing_insights -> event_insights
            mi = _parse_json_field(ev.marketing_insights)
            if mi and not session.query(EventInsight).filter(EventInsight.event_id == ev.id).first():
                save_insight(session, ev.id, mi, source="rule")

            if changed:
                migrated += 1

        session.commit()
        print(f"[MIGRATE] 완료: {migrated}건 파싱 업데이트, {len(events)}건 총 처리")
    finally:
        session.close()


if __name__ == "__main__":
    run_migration()
