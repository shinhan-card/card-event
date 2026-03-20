# Briefing Intelligence Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the ops-tab briefing feature from an ops-oriented send tool into a marketing-intelligence briefing system with structured AI summaries, quality readiness checks, and richer delivery logs.

**Architecture:** Keep the existing briefing endpoints and scheduler entry points, but insert a structured briefing payload layer plus a quality-evaluation layer inside `modules/briefing.py`. Recipient-facing Jinja templates will consume the new payload, while the ops tab will switch to a quality-console UI backed by a new `/api/briefing/status` endpoint and expanded `briefing_logs` metadata.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy/SQLite, Jinja2, Vanilla JS, pytest, httpx

---

## File Map

### Existing files to modify

- `database.py`
  - Extend `BriefingLog` with delivery metadata and add a migration helper for existing SQLite databases.
- `modules/briefing.py`
  - Build the new structured daily/weekly briefing payload, generate AI/rule summaries, evaluate quality warnings, and persist enriched log data.
- `routers/briefing.py`
  - Add briefing status/readiness API, extend `send-now` with delivery mode, and return richer log/status payloads.
- `templates/email_daily_briefing.html`
  - Replace ops-style daily mail sections with marketing-intelligence sections.
- `templates/weekly_report.html`
  - Replace the current weekly report layout with weekly narrative, company summaries, theme shifts, and evidence blocks.
- `templates/simple_dashboard.html`
  - Replace the current briefing box in the ops tab with a briefing quality console shell.
- `static/js/dashboard.js`
  - Remove duplicated briefing UI logic, fetch briefing status/logs, render readiness cards and warnings, and support test/production send actions.
- `tests/test_app_routes.py`
  - Assert the new briefing route and root page contract respond correctly.
- `tests/test_database_schema.py`
  - Assert the expanded `briefing_logs` columns are created on fresh databases.

### New files to create

- `tests/test_briefing.py`
  - Focused tests for briefing payload shape, quality warnings, logging metadata, and send/status route behavior.

## Implementation Notes

- Keep recipient-facing templates free of internal quality warnings. Those belong in the ops tab, not in outbound email/report content.
- Preserve `GET /api/briefing/preview` and `GET /report/weekly` so existing links continue to work during the refactor.
- Consolidate briefing-related browser logic into `static/js/dashboard.js`. The current duplicate `loadOpsData()` / `sendBriefingNow()` implementations inside `templates/simple_dashboard.html` should be removed instead of patched again.
- Prefer adding internal helper functions in `modules/briefing.py` for this iteration rather than splitting to multiple new modules mid-refactor. The file is already briefing-specific, and this keeps the change set easier to land.

## Task 1: Expand Briefing Log Schema And CRUD

**Files:**
- Modify: `database.py`
- Modify: `tests/test_database_schema.py`
- Create: `tests/test_briefing.py`

- [ ] **Step 1: Write the failing schema test**

Add a new schema assertion to `tests/test_database_schema.py` that checks `briefing_logs` contains the new columns:

```python
def test_init_db_adds_briefing_log_columns():
    ...
    briefing_columns = {column["name"] for column in inspector.get_columns("briefing_logs")}
    for expected in (
        "period_label",
        "source_event_count",
        "source_product_count",
        "warning_count",
        "warning_json",
        "ai_summary_status",
        "delivery_mode",
        "template_version",
    ):
        assert expected in briefing_columns
```

- [ ] **Step 2: Run the schema test to verify it fails**

Run: `pytest tests/test_database_schema.py::test_init_db_adds_briefing_log_columns -v`

Expected: FAIL because the new `briefing_logs` columns do not exist yet.

- [ ] **Step 3: Extend `BriefingLog` and add a migration helper**

Update `database.py` so `BriefingLog` and database init support the new metadata fields:

```python
class BriefingLog(Base):
    __tablename__ = "briefing_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    briefing_type = Column(String, index=True, nullable=False)
    period_label = Column(String, default="")
    recipient_count = Column(Integer, default=0)
    source_event_count = Column(Integer, default=0)
    source_product_count = Column(Integer, default=0)
    warning_count = Column(Integer, default=0)
    warning_json = Column(Text)
    ai_summary_status = Column(String, default="rule")
    delivery_mode = Column(String, default="production")
    template_version = Column(String, default="v2")
    status = Column(String, index=True, default="sent")
    error_msg = Column(Text)
    sent_at = Column(DateTime, default=datetime.now, index=True)
```

Also add `_ensure_briefing_log_columns()` and call it from `init_db()` after `Base.metadata.create_all(...)`, mirroring `_ensure_event_columns()`.

- [ ] **Step 4: Extend briefing log CRUD and add a round-trip test**

Update `create_briefing_log(...)` so callers can pass the new metadata fields, then create `tests/test_briefing.py` with a focused persistence test:

```python
def test_create_briefing_log_persists_metadata(session):
    row = db.create_briefing_log(
        session,
        briefing_type="daily",
        period_label="2026-03-20",
        source_event_count=7,
        source_product_count=3,
        warning_count=2,
        warning_json='["low_coverage"]',
        ai_summary_status="ai",
        delivery_mode="test",
        template_version="v2",
        status="sent",
    )
    assert row.delivery_mode == "test"
    assert row.warning_count == 2
```

- [ ] **Step 5: Run the schema/log tests and commit**

Run: `pytest tests/test_database_schema.py tests/test_briefing.py -k briefing -v`

Expected: PASS for the schema and log-persistence assertions.

Commit:

```bash
git add database.py tests/test_database_schema.py tests/test_briefing.py
git commit -m "feat: expand briefing log metadata"
```

## Task 2: Build Structured Daily/Weekly Briefing Payloads

**Files:**
- Modify: `modules/briefing.py`
- Modify: `tests/test_briefing.py`

- [ ] **Step 1: Write failing payload-shape and warning tests**

Add focused tests in `tests/test_briefing.py` for the new payload contract:

```python
def test_build_daily_briefing_payload_contains_company_sections(session):
    payload = briefing.build_daily_briefing_data(session)
    assert "executive_summary" in payload
    assert "company_sections" in payload
    assert "quality_warnings" in payload

def test_daily_payload_warns_when_no_new_events(session, monkeypatch):
    payload = briefing.build_daily_briefing_data(session)
    assert any(w["code"] == "no_new_events" for w in payload["quality_warnings"])
```

- [ ] **Step 2: Run the payload tests to verify they fail**

Run: `pytest tests/test_briefing.py::test_build_daily_briefing_payload_contains_company_sections tests/test_briefing.py::test_daily_payload_warns_when_no_new_events -v`

Expected: FAIL because the current payload only exposes counts plus simple event lists.

- [ ] **Step 3: Implement a structured payload builder inside `modules/briefing.py`**

Add helper functions with clear boundaries:

```python
def build_briefing_payload(session: Session, report_type: str) -> dict:
    source = _collect_briefing_source_data(session, report_type)
    payload = {
        "report_type": report_type,
        "generated_at": datetime.now().isoformat(),
        "period_label": _build_period_label(source, report_type),
        "company_sections": _build_company_sections(source, report_type),
        "theme_summary": _build_theme_summary(source, report_type),
        "product_summary": _build_product_summary(source, report_type),
        "evidence_events": _pick_evidence_events(source, report_type),
        "evidence_products": _pick_evidence_products(source, report_type),
    }
    payload["quality_warnings"] = _build_quality_warnings(payload, source, report_type)
    payload["executive_summary"], payload["ai_summary_status"] = _build_executive_summary(payload, report_type)
    return payload
```

Keep `build_daily_briefing_data()` and `build_weekly_briefing_data()` as thin wrappers around this new builder so existing routes/scheduler calls remain readable.

- [ ] **Step 4: Implement rule-based fallback summary and quality-warning rules**

Inside `modules/briefing.py`, add deterministic warning codes and minimal fallback text:

```python
def _build_quality_warnings(payload: dict, source: dict, report_type: str) -> list[dict]:
    warnings = []
    if report_type == "daily" and not source["new_events"]:
        warnings.append({"code": "no_new_events", "severity": "medium", "message": "지난 24시간 신규 이벤트가 없습니다."})
    if source["coverage"]["missing_companies"]:
        warnings.append({"code": "company_coverage_low", "severity": "high", "message": "일부 카드사 데이터가 부족합니다."})
    if not payload["evidence_events"]:
        warnings.append({"code": "insufficient_evidence_events", "severity": "high", "message": "근거 이벤트가 부족합니다."})
    return warnings
```

If AI summary generation fails or is skipped, return a short rule summary plus `"rule"` as `ai_summary_status`.

- [ ] **Step 5: Run the payload tests and commit**

Run: `pytest tests/test_briefing.py -k "payload or warnings or summary" -v`

Expected: PASS for payload shape, warning generation, and fallback-status behavior.

Commit:

```bash
git add modules/briefing.py tests/test_briefing.py
git commit -m "feat: build structured briefing payloads"
```

## Task 3: Add Briefing Status API And Delivery-Mode Logging

**Files:**
- Modify: `routers/briefing.py`
- Modify: `modules/briefing.py`
- Modify: `tests/test_app_routes.py`
- Modify: `tests/test_briefing.py`

- [ ] **Step 1: Write failing route tests for status and delivery mode**

Add tests covering the new API surface:

```python
async def test_briefing_status_route_responds(client):
    response = await client.get("/api/briefing/status")
    assert response.status_code == 200
    data = response.json()
    assert "daily" in data and "weekly" in data

async def test_send_now_accepts_test_mode(client):
    response = await client.post("/api/briefing/send-now?type=daily&mode=test")
    assert response.status_code == 200
    assert response.json()["delivery_mode"] == "test"
```

- [ ] **Step 2: Run the route tests to verify they fail**

Run: `pytest tests/test_app_routes.py tests/test_briefing.py -k "briefing_status_route_responds or send_now_accepts_test_mode" -v`

Expected: FAIL because `/api/briefing/status` does not exist and `send-now` does not accept `mode`.

- [ ] **Step 3: Implement `GET /api/briefing/status` and enrich `send-now`**

Update `routers/briefing.py` to:

- add `mode: str = Query("production", pattern="^(test|production)$")` to `briefing_send_now`
- return `delivery_mode`, `warning_count`, `ai_summary_status`, `period_label`
- add a new status route:

```python
@router.get("/api/briefing/status")
async def briefing_status(db_session: Session = Depends(db.get_db)):
    from modules.briefing import build_daily_briefing_data, build_weekly_briefing_data, build_briefing_status_snapshot

    daily = build_daily_briefing_data(db_session)
    weekly = build_weekly_briefing_data(db_session)
    return {
        "daily": build_briefing_status_snapshot(daily),
        "weekly": build_briefing_status_snapshot(weekly),
    }
```

- [ ] **Step 4: Persist the richer metadata during send and expose it via `/api/briefing/logs`**

Update both the send-now route and scheduler send functions to call `create_briefing_log(...)` with:

- `period_label`
- `source_event_count`
- `source_product_count`
- `warning_count`
- `warning_json`
- `ai_summary_status`
- `delivery_mode`
- `template_version`

Also extend `/api/briefing/logs` to serialize those new fields.

- [ ] **Step 5: Run the briefing route tests and commit**

Run: `pytest tests/test_app_routes.py tests/test_briefing.py -k briefing -v`

Expected: PASS for the new status route, enriched send-now response, and log serialization.

Commit:

```bash
git add routers/briefing.py modules/briefing.py tests/test_app_routes.py tests/test_briefing.py
git commit -m "feat: add briefing status api"
```

## Task 4: Redesign Recipient-Facing Daily And Weekly Templates

**Files:**
- Modify: `templates/email_daily_briefing.html`
- Modify: `templates/weekly_report.html`
- Modify: `tests/test_briefing.py`

- [ ] **Step 1: Write failing render tests for the new content sections**

Add template render assertions in `tests/test_briefing.py`:

```python
def test_daily_briefing_html_contains_market_sections(session):
    html = briefing.render_briefing_html(briefing.build_daily_briefing_data(session), "daily", "http://localhost:8000")
    assert "오늘의 동향" in html
    assert "카드사별 동향" in html
    assert "근거 이벤트" in html

def test_weekly_briefing_html_contains_weekly_theme_sections(session):
    html = briefing.render_briefing_html(briefing.build_weekly_briefing_data(session), "weekly", "http://localhost:8000")
    assert "이번 주 시장 요약" in html
    assert "카드사별 동향 요약" in html
    assert "주간 테마 변화" in html
```

- [ ] **Step 2: Run the render tests to verify they fail**

Run: `pytest tests/test_briefing.py::test_daily_briefing_html_contains_market_sections tests/test_briefing.py::test_weekly_briefing_html_contains_weekly_theme_sections -v`

Expected: FAIL because the current templates do not render those sections.

- [ ] **Step 3: Rebuild `email_daily_briefing.html` around the new daily payload**

Render these recipient-facing sections only:

- header + period label
- executive summary
- company sections
- notable patterns
- transition/ending-soon summary
- evidence event cards

Template contract example:

```jinja2
{% for company in company_sections %}
  <section>
    <h3>{{ company.company }}</h3>
    <p>{{ company.summary }}</p>
    {% for event in company.evidence_events %}
      <div>{{ event.title }}</div>
    {% endfor %}
  </section>
{% endfor %}
```

- [ ] **Step 4: Rebuild `weekly_report.html` around the weekly narrative payload**

Render:

- weekly executive summary
- company-by-company weekly narrative cards
- theme-shift section
- product/disclosure summary
- evidence blocks

Do **not** show internal quality warnings or delivery metadata in the recipient-facing output.

- [ ] **Step 5: Run render/preview checks and commit**

Run:

```bash
pytest tests/test_briefing.py -k "html_contains or render" -v
pytest tests/test_app_routes.py::test_core_routes_respond -v
```

Expected: PASS for render assertions and preview routes still respond with `200`.

Commit:

```bash
git add templates/email_daily_briefing.html templates/weekly_report.html tests/test_briefing.py
git commit -m "feat: redesign briefing templates"
```

## Task 5: Rebuild The Ops Tab Briefing Console

**Files:**
- Modify: `templates/simple_dashboard.html`
- Modify: `static/js/dashboard.js`
- Modify: `tests/test_app_routes.py`

- [ ] **Step 1: Add a failing page-contract assertion for the new briefing console shell**

Extend `tests/test_app_routes.py` to check the root page HTML contains the new briefing console anchors:

```python
async def test_root_page_contains_briefing_console_shell():
    ...
    response = await client.get("/")
    html = response.text
    assert "opsBriefingStatusGrid" in html
    assert "opsBriefingWarnings" in html
    assert "opsBriefingLogTable" in html
```

- [ ] **Step 2: Run the root-page assertion to verify it fails**

Run: `pytest tests/test_app_routes.py::test_root_page_contains_briefing_console_shell -v`

Expected: FAIL because the current ops tab only has the old preview/send/log box.

- [ ] **Step 3: Replace the old briefing box in `templates/simple_dashboard.html`**

Swap the current briefing section for a console shell with these IDs:

```html
<div id="opsBriefingStatusGrid"></div>
<div id="opsBriefingWarnings"></div>
<div id="opsBriefingActions"></div>
<div id="opsBriefingLogTable"></div>
```

Also remove the local duplicated briefing helper functions in the template so `static/js/dashboard.js` becomes the single source of truth for briefing UI behavior.

- [ ] **Step 4: Implement the new briefing-console renderer in `static/js/dashboard.js`**

Add briefing-specific functions such as:

```javascript
async function loadBriefingStatus() {
  const [statusR, logsR] = await Promise.all([
    fetch('/api/briefing/status'),
    fetch('/api/briefing/logs'),
  ]);
  BRIEFING_STATUS = statusR.ok ? await statusR.json() : null;
  BRIEFING_LOGS = logsR.ok ? await logsR.json() : [];
  renderBriefingConsole();
}
```

Render:

- daily/weekly readiness cards
- warning badges and warning list
- preview links/buttons
- `test` vs `production` send buttons
- richer log table

Hook `loadOpsData()` so it calls `loadBriefingStatus()` instead of manually rendering the old logs-only view.

- [ ] **Step 5: Run page smoke tests, perform manual browser verification, and commit**

Run:

```bash
pytest tests/test_app_routes.py -k "core_routes_respond or root_page_contains_briefing_console_shell" -v
```

Then manually verify in the browser:

1. Open `http://localhost:8000`
2. Navigate to the ops tab
3. Confirm daily/weekly cards, warnings, preview actions, and log table render
4. Trigger a preview and a test send from the new controls

Commit:

```bash
git add templates/simple_dashboard.html static/js/dashboard.js tests/test_app_routes.py
git commit -m "feat: revamp ops briefing console"
```

## Task 6: Final Integration And Regression Pass

**Files:**
- Modify as needed: `modules/briefing.py`
- Modify as needed: `routers/briefing.py`
- Modify as needed: `templates/simple_dashboard.html`
- Modify as needed: `static/js/dashboard.js`
- Modify as needed: `tests/test_briefing.py`
- Modify as needed: `tests/test_app_routes.py`

- [ ] **Step 1: Run the focused briefing test suite**

Run:

```bash
pytest tests/test_briefing.py tests/test_app_routes.py tests/test_database_schema.py -v
```

Expected: PASS for schema, payload, route, and page-contract coverage.

- [ ] **Step 2: Run a fast route-level smoke against the preview endpoints**

Run:

```bash
@'
import asyncio, httpx, app

async def main():
    transport = httpx.ASGITransport(app=app.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        for path in ("/api/briefing/preview", "/api/briefing/preview?type=weekly", "/api/briefing/status", "/api/briefing/logs"):
            response = await client.get(path)
            print(path, response.status_code, response.headers.get("content-type"))

asyncio.run(main())
'@ | python -
```

Expected: `200` for every route and HTML/JSON content types that match the endpoint purpose.

- [ ] **Step 3: Run a manual send-now dry check with test mode**

Run:

```bash
@'
import asyncio, httpx, app

async def main():
    transport = httpx.ASGITransport(app=app.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post("/api/briefing/send-now?type=daily&mode=test")
        print(response.status_code)
        print(response.json())

asyncio.run(main())
'@ | python -
```

Expected: `200` plus a response payload that includes `delivery_mode`, `warning_count`, and `ai_summary_status`.

- [ ] **Step 4: Inspect the resulting briefing log entry**

Run:

```bash
@'
import database as db

session = db.SessionLocal()
try:
    rows = db.get_briefing_logs(session, limit=1)
    row = rows[0]
    print(row.briefing_type, row.delivery_mode, row.warning_count, row.ai_summary_status)
finally:
    session.close()
'@ | python -
```

Expected: the latest log row reflects the dry-run send metadata.

- [ ] **Step 5: Commit the integration pass**

```bash
git add modules/briefing.py routers/briefing.py templates/simple_dashboard.html static/js/dashboard.js tests/test_briefing.py tests/test_app_routes.py tests/test_database_schema.py
git commit -m "test: verify briefing intelligence flow"
```

## Full Verification Checklist

- `pytest tests/test_database_schema.py -v`
- `pytest tests/test_briefing.py -v`
- `pytest tests/test_app_routes.py -v`
- Browser check: `/`, ops tab, preview links, test send
- API check: `/api/briefing/status`, `/api/briefing/logs`, `/api/briefing/preview`, `/report/weekly`

## Execution Notes

- Do **not** delete or overwrite unrelated dirty-worktree changes; this repository already contains user changes outside the briefing scope.
- Keep route compatibility stable until the new ops-tab UI has switched to the enriched endpoints.
- If the templates or JS refactor starts to sprawl, prioritize behavior over visual polish for the first landing: payload quality, warnings, logs, and usable preview/send controls come first.
