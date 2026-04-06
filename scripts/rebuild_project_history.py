from __future__ import annotations

import argparse
import json
import re
import subprocess
from collections import defaultdict
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = ROOT / "showcase-site" / "data" / "project-history.json"

WORKSTREAMS = [
    {"id": "core-platform", "label": "코어 플랫폼"},
    {"id": "data-connectors", "label": "데이터/커넥터"},
    {"id": "briefing-reporting", "label": "브리핑/리포트"},
    {"id": "product-rag", "label": "상품/RAG"},
    {"id": "architecture-docs", "label": "아키텍처/문서"},
    {"id": "entry-showcase", "label": "엔트리/쇼케이스"},
    {"id": "deployment-sharing", "label": "배포/공유"},
    {"id": "dashboard-ops", "label": "대시보드/운영"},
]

VERSIONS = {
    "core-foundation-2026-02": {
        "label": "2026-02 기본 골격 구축",
        "workstream": "core-platform",
        "summary": "초기 카드 이벤트 수집기, FastAPI, SQLite, 기본 대시보드 코어가 형성된 시기입니다.",
        "tags": ["foundation", "fastapi", "sqlite"],
        "docs": [],
        "git": ["Initial commit", "v3.0", "PRD 고도화"],
        "omx": [],
    },
    "briefing-ops-2026-03": {
        "label": "2026-03 브리핑과 운영 콘솔",
        "workstream": "briefing-reporting",
        "summary": "브리핑 payload, ops console, report studio 흐름이 정리된 시기입니다.",
        "tags": ["briefing", "ops", "report"],
        "docs": ["briefing-intelligence", "ops-briefing-console", "ops-report-studio", "weekly-related-news"],
        "git": ["briefing", "report studio", "weekly briefing", "ops briefing"],
        "omx": [],
    },
    "presentation-site-2026-03": {
        "label": "2026-03 프레젠테이션 사이트",
        "workstream": "architecture-docs",
        "summary": "presentation-site 실험용 프런트와 deep-dive 문서 셸이 구성된 시기입니다.",
        "tags": ["presentation-site", "deep-dive"],
        "docs": ["presentation-site"],
        "git": ["presentation site", "deep-dive", "landing showroom"],
        "omx": ["presentation-site"],
    },
    "architecture-docs-console-2026-03": {
        "label": "2026-03 아키텍처 문서 콘솔",
        "workstream": "architecture-docs",
        "summary": "단일 문서형 아키텍처 콘솔 설계와 구현 계획이 잡힌 시기입니다.",
        "tags": ["architecture", "docs-console"],
        "docs": ["architecture-docs-console"],
        "git": ["architecture docs console"],
        "omx": ["실제 개발 기준 아키텍처", "실제 개발 기준 아키텍쳐"],
    },
    "architecture-as-is-to-be-2026-03": {
        "label": "2026-03 As-Is / To-Be 아키텍처 문서",
        "workstream": "architecture-docs",
        "summary": "현재 구조와 향후 개선 구조를 설명하는 As-Is / To-Be 아키텍처 HTML이 만들어진 시기입니다.",
        "tags": ["as-is", "to-be", "architecture-html"],
        "docs": [],
        "git": [],
        "omx": ["웹페이지 형태로 그려뒀습니다", "as-is-to-be-architecture.html"],
    },
    "product-rag-2026-03": {
        "label": "2026-03 상품 탐색과 문서 검색",
        "workstream": "product-rag",
        "summary": "상품 탐색, 문서 검색, 출시 판단, 공시 동기화 설계가 집중적으로 쌓인 시기입니다.",
        "tags": ["products", "rag", "search"],
        "docs": ["product-explorer", "product-document-search", "product-launch-authority", "shinhan-check-disclosure-sync"],
        "git": ["product", "launch authority", "disclosure"],
        "omx": [],
    },
    "dashboard-snapshot-2026-03": {
        "label": "2026-03 대시보드 스냅샷과 수동 갱신",
        "workstream": "dashboard-ops",
        "summary": "대시보드 스냅샷, 수동 갱신, 디테일 패널 개선 관련 설계가 정리된 시기입니다.",
        "tags": ["dashboard", "snapshot", "manual-refresh"],
        "docs": ["dashboard-snapshot-manual-refresh", "centered-event-detail-panel", "ops-link-insights-refresh"],
        "git": ["dashboard", "snapshot", "tab switching"],
        "omx": [],
    },
    "entry-command-center-2026-03": {
        "label": "2026-03 엔트리 커맨드센터 구상",
        "workstream": "entry-showcase",
        "summary": "엔트리 페이지를 command center 방향으로 재구성하려던 초기 설계 흐름입니다.",
        "tags": ["entry", "command-center"],
        "docs": ["entry-page-command-center"],
        "git": [],
        "omx": [],
    },
    "entry-cinematic-2026-03": {
        "label": "2026-03 엔트리 시네마틱 리디자인",
        "workstream": "entry-showcase",
        "summary": "GSAP 기반 cinematic entry page와 hero/Spline/metrics/process 구간이 고도화된 시기입니다.",
        "tags": ["entry", "cinematic", "gsap", "spline"],
        "docs": ["entry-page-cinematic"],
        "git": ["feat(entry)", "fix(entry)", "copy(entry)", "perf(entry)", "entry page"],
        "omx": ["`/entry`는 정상 응답", "3D가 hero에서만 다시 살아나도록 붙였습니다"],
    },
    "showcase-split-2026-04": {
        "label": "2026-04 외부 공유용 쇼케이스 분리",
        "workstream": "deployment-sharing",
        "summary": "외부 공유용 정적 microsite가 showcase-site로 분리되고 architecture/entry가 재배치된 시기입니다.",
        "tags": ["showcase", "share", "vercel"],
        "docs": [],
        "git": [],
        "omx": ["외부 공유용 사이트는 이미 분리해뒀습니다", "배포 완료됐습니다", "플랫폼 소개"],
    },
    "dashboard-stabilization-2026-04": {
        "label": "2026-04 대시보드 안정화",
        "workstream": "dashboard-ops",
        "summary": "주간 변화, 최근 출시 카드, AI 분석 탭, snapshot recovery 등 운영 화면 보정이 누적된 시기입니다.",
        "tags": ["dashboard", "stabilization", "weekly-changes"],
        "docs": [],
        "git": [],
        "omx": ["recent_product_news_groups", "월별 보기", "업데이트 1/4", "주간 변화", "ai분석"],
    },
}

OMX_ITEMS = [
    ("웹페이지 형태로 그려뒀습니다", "As-Is / To-Be 아키텍처 HTML 생성", "architecture-as-is-to-be-2026-03", "implementation", "major"),
    ("외부 공유용 사이트는 이미 분리해뒀습니다", "외부 공유용 showcase-site 분리", "showcase-split-2026-04", "implementation", "major"),
    ("배포 완료됐습니다", "showcase-site 외부 공유 배포 완료", "showcase-split-2026-04", "deploy", "minor"),
    ("플랫폼 소개` 버튼 제거", "showcase 엔트리에서 플랫폼 소개 버튼 제거", "showcase-split-2026-04", "ui-polish", "micro"),
    ("dashboard snapshot`을 동기 prewarm", "entry 진입을 막던 startup prewarm 병목 정리", "entry-cinematic-2026-03", "bugfix", "micro"),
    ("pointer-events: none", "hero 3D 인터랙션 비활성 원인 식별", "entry-cinematic-2026-03", "bugfix", "micro"),
    ("직접 반응 + 얕은 parallax", "hero 3D 직접 반응과 얕은 parallax 적용", "entry-cinematic-2026-03", "ui-polish", "micro"),
    ("toLocaleString('ko-KR')", "전체 이벤트 KPI 천 단위 콤마 포맷 적용", "dashboard-stabilization-2026-04", "ui-polish", "micro"),
    ("기본 5개만 노출한 뒤 `더보기`로 확장", "주간 변화 카드사별 5개 + 더보기 구조 적용", "dashboard-stabilization-2026-04", "ui-polish", "micro"),
    ("종료됨` 배지로 아래에 오도록 정렬", "종료 이벤트를 종료됨 배지 기준으로 재정렬", "dashboard-stabilization-2026-04", "bugfix", "micro"),
    ("`2026-04-01` 출시인 `네스프레소 신한카드`를 미리", "주간 AI 인사이트의 미래 출시 오인식 수정", "dashboard-stabilization-2026-04", "bugfix", "micro"),
    ("recent_product_news_groups", "최근 출시 카드 기사 영역 snapshot 복구", "dashboard-stabilization-2026-04", "bugfix", "micro"),
    ("`검수 및 분류 상태` 섹션은 제거", "AI 분석 패널에서 검수/분류 상태 제거", "dashboard-stabilization-2026-04", "ui-polish", "micro"),
    ("월별 보기`가 기본", "인사이트 탭 월별 보기 기본값 복구", "dashboard-stabilization-2026-04", "bugfix", "micro"),
]

FILE_ITEMS = [
    ("docs/architecture/as-is-to-be-architecture.html", "As-Is / To-Be 아키텍처 원문 산출물", "architecture-as-is-to-be-2026-03", "recovery-note", "minor"),
    ("showcase-site/architecture/index.html", "showcase 아키텍처 정적 파생본 생성", "showcase-split-2026-04", "implementation", "minor"),
    ("showcase-site/index.html", "showcase 엔트리 정적 파생본 생성", "showcase-split-2026-04", "implementation", "minor"),
    ("showcase-site/vercel.json", "showcase 정적 라우팅 manifest 추가", "showcase-split-2026-04", "deploy", "micro"),
]

BRANCH_MAP = {
    "codex/briefing-intelligence-redesign": "briefing-ops-2026-03",
    "codex/presentation-site": "presentation-site-2026-03",
    "codex/architecture-docs-console": "architecture-docs-console-2026-03",
    "codex/report-studio-screen-based": "briefing-ops-2026-03",
    "codex/product-explorer-redesign": "product-rag-2026-03",
}

RELATIONSHIPS = [
    {
        "type": "derived-copy",
        "source": "docs/architecture/as-is-to-be-architecture.html",
        "target": "showcase-site/architecture/index.html",
        "label": "아키텍처 원문 HTML → showcase 정적 아키텍처 파생본",
    },
    {
        "type": "derived-copy",
        "source": "entry-page/index.html",
        "target": "showcase-site/index.html",
        "label": "entry 원본 페이지 → showcase 정적 엔트리 파생본",
    },
    {
        "type": "shared-assets",
        "source": "entry-page/script.js",
        "target": "showcase-site/assets/entry-page/script.js",
        "label": "엔트리 인터랙션 스크립트 → showcase 자산 공유",
    },
]


def clean(text: str | None) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "item"


def parse_dt(value: str) -> datetime:
    for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            pass
    return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)


def run_git(*args: str) -> list[str]:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=True,
    )
    return [line for line in result.stdout.splitlines() if line.strip()]


def match_version(text: str, key: str) -> str | None:
    lowered = text.lower()
    for version_id, version in VERSIONS.items():
        if any(token.lower() in lowered for token in version.get(key, [])):
            return version_id
    return None


def item(kind: str, version_id: str, title: str, date: str, summary: str, details: str, evidence: list[dict], granularity: str, source_origin: str, files=None, commits=None, reconstructed=False):
    return {
        "id": f"{source_origin}-{slug(title)}-{slug(date)}",
        "version_id": version_id,
        "title": title,
        "date": date,
        "granularity": granularity,
        "kind": kind,
        "summary": summary,
        "details": details,
        "files": files or [],
        "branches": [],
        "commits": commits or [],
        "evidence": evidence,
        "confidence": "medium" if reconstructed or granularity == "micro" else "high",
        "source_origin": source_origin,
        "is_manual": False,
        "is_reconstructed": reconstructed,
    }


def title_from_md(path: Path) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return path.stem


def doc_items() -> list[dict]:
    out = []
    for folder, kind in (("specs", "spec"), ("plans", "plan")):
        base = ROOT / "docs" / "superpowers" / folder
        if not base.exists():
            continue
        for path in sorted(base.glob("*.md")):
            version_id = match_version(path.name, "docs")
            if not version_id:
                continue
            created = datetime.fromtimestamp(path.stat().st_ctime).strftime("%Y-%m-%d %H:%M")
            title = title_from_md(path)
            out.append(item(
                kind,
                version_id,
                title,
                created,
                f"{folder[:-1]} 문서가 만들어지며 이 작업 흐름의 출발점이 잡힌 기록입니다.",
                f"{path.relative_to(ROOT).as_posix()} 문서가 만들어진 시점을 기준으로 정리한 기록입니다.",
                [{"type": f"{kind}-doc", "label": path.name, "path": path.relative_to(ROOT).as_posix(), "ref": title, "timestamp": created, "excerpt": title}],
                "major",
                "docs",
                files=[path.relative_to(ROOT).as_posix()],
            ))
    return out


def commit_kind(subject: str) -> tuple[str, str]:
    lowered = subject.lower()
    if lowered.startswith("copy(") or lowered.startswith("copy:"):
        return "copy", "micro"
    if lowered.startswith("perf(") or lowered.startswith("perf:"):
        return "ui-polish", "micro"
    if lowered.startswith("fix(") or lowered.startswith("fix:"):
        if any(token in lowered for token in ["spacing", "visible", "readability", "placeholder", "title", "copy"]):
            return "ui-polish", "micro"
        return "bugfix", "micro"
    if lowered.startswith("feat(") or lowered.startswith("feat:"):
        return "implementation", "major" if any(token in lowered for token in ["complete", "launch", "scaffold", "split", "build"]) else "minor"
    return "implementation", "minor"


def git_items() -> list[dict]:
    out, seen = [], set()
    for line in run_git("log", "--all", "--date=short", "--pretty=format:%ad|%h|%s"):
        date_text, short_hash, subject = line.split("|", 2)
        key = (date_text, subject)
        if key in seen:
            continue
        seen.add(key)
        version_id = match_version(subject, "git")
        if not version_id:
            continue
        kind, granularity = commit_kind(subject)
        out.append(item(
            kind,
            version_id,
            subject,
            date_text,
            "Git 커밋 제목을 바탕으로 정리한 작업 기록입니다.",
            f"{short_hash} 커밋을 기준으로 이 작업 흐름에 연결했습니다.",
            [{"type": "git-commit", "label": short_hash, "path": "", "ref": short_hash, "timestamp": date_text, "excerpt": subject}],
            granularity,
            "git",
            commits=[short_hash],
        ))
    return out


def omx_items() -> list[dict]:
    log_dir = ROOT / ".omx" / "logs"
    if not log_dir.exists():
        return []
    out, seen = [], set()
    for path in sorted(log_dir.glob("turns-*.jsonl")):
        for raw in path.read_text(encoding="utf-8").splitlines():
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                continue
            preview = clean(payload.get("output_preview"))
            timestamp = payload.get("timestamp")
            if not preview or not timestamp:
                continue
            date_text = parse_dt(timestamp).strftime("%Y-%m-%d %H:%M")
            for needle, title, version_id, kind, granularity in OMX_ITEMS:
                if needle not in preview:
                    continue
                key = (date_text[:10], title)
                if key in seen:
                    continue
                seen.add(key)
                out.append(item(
                    kind,
                    version_id,
                    title,
                    date_text,
                    "OMX 작업 로그를 바탕으로 정리한 작업 기록입니다.",
                    preview,
                    [{"type": "omx-turn-log", "label": path.name, "path": path.relative_to(ROOT).as_posix(), "ref": payload.get("turn_id", ""), "timestamp": date_text, "excerpt": preview[:220]}],
                    granularity,
                    "omx",
                    reconstructed=True,
                ))
    return out


def file_items() -> list[dict]:
    out = []
    for rel, title, version_id, kind, granularity in FILE_ITEMS:
        path = ROOT / rel
        if not path.exists():
            continue
        created = datetime.fromtimestamp(path.stat().st_ctime).strftime("%Y-%m-%d %H:%M")
        out.append(item(
            kind,
            version_id,
            title,
            created,
            "파일이 만들어진 시점을 바탕으로 파생 산출물 관계를 남긴 기록입니다.",
            f"{rel} 파일이 만들어진 시점을 기준으로 정리한 기록입니다.",
            [{"type": "file-timestamp", "label": path.name, "path": rel, "ref": "", "timestamp": created, "excerpt": title}],
            granularity,
            "filesystem",
            files=[rel],
            reconstructed=True,
        ))
        out[-1]["confidence"] = "low"
    return out


def dedupe(items: list[dict]) -> list[dict]:
    merged = {}
    for entry in items:
        key = (entry["version_id"], entry["date"], entry["title"])
        if key not in merged:
            merged[key] = entry
            continue
        merged[key]["evidence"].extend(entry["evidence"])
        merged[key]["files"] = sorted(set(merged[key]["files"] + entry["files"]))
        merged[key]["commits"] = sorted(set(merged[key]["commits"] + entry["commits"]))
        if merged[key]["confidence"] == "low" and entry["confidence"] in {"medium", "high"}:
            merged[key]["confidence"] = entry["confidence"]
    return list(merged.values())


def build_versions(items: list[dict]) -> list[dict]:
    grouped = defaultdict(list)
    for entry in items:
        grouped[entry["version_id"]].append(entry)
    versions = []
    for version_id, entries in grouped.items():
        meta = VERSIONS[version_id]
        evidence_types = {e["type"] for entry in entries for e in entry["evidence"]}
        confidence = "high" if len(evidence_types) >= 3 else "medium" if len(evidence_types) == 2 else "low"
        status = "confirmed" if confidence == "high" else "reconstructed"
        dates = [parse_dt(entry["date"]) for entry in entries]
        primary = sorted(entries, key=lambda entry: parse_dt(entry["date"]))[-1]["title"]
        versions.append({
            "id": version_id,
            "label": meta["label"],
            "workstream": meta["workstream"],
            "start_date": min(dates).strftime("%Y-%m-%d"),
            "end_date": max(dates).strftime("%Y-%m-%d"),
            "summary": meta["summary"],
            "status": status,
            "confidence": confidence,
            "primary_evidence": primary,
            "tags": meta["tags"],
            "branches": [],
            "is_manual": False,
        })
    return sorted(versions, key=lambda entry: entry["end_date"], reverse=True)


def attach_branches(payload: dict) -> dict:
    versions_by_id = {version["id"]: version for version in payload["versions"]}
    for branch_name, version_id in BRANCH_MAP.items():
        version = versions_by_id.get(version_id)
        if version is None:
            continue
        version.setdefault("branches", []).append(branch_name)
    for version in payload["versions"]:
        version["branches"] = sorted(set(version.get("branches", [])))
    for item in payload["items"]:
        branches = versions_by_id.get(item["version_id"], {}).get("branches", [])
        item["branches"] = sorted(set(item.get("branches", []) + branches))
    return payload


def merge_manual(existing: dict, payload: dict) -> dict:
    for key in ("versions", "items"):
        known = {entry["id"] for entry in payload.get(key, [])}
        for entry in existing.get(key, []):
            if entry.get("is_manual") and entry["id"] not in known:
                payload[key].append(entry)
    payload["versions"] = sorted(payload["versions"], key=lambda entry: entry["end_date"], reverse=True)
    payload["items"] = sorted(payload["items"], key=lambda entry: parse_dt(entry["date"]), reverse=True)
    return payload


def build_payload() -> dict:
    items = dedupe(doc_items() + git_items() + omx_items() + file_items())
    items = sorted(items, key=lambda entry: parse_dt(entry["date"]), reverse=True)
    payload = {
        "meta": {
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "source_priority": ["git-commit", "spec-doc", "plan-doc", "omx-turn-log", "file-timestamp"],
            "local_source_of_truth": "showcase-site/architecture/index.html",
            "notes": [
                "GitHub보다 로컬 아키텍처 페이지를 우선 기준으로 삼습니다.",
                "과거 이력은 자동 수집 결과와 사람이 덧붙인 정리를 함께 사용합니다.",
            ],
        },
        "workstreams": WORKSTREAMS,
        "versions": build_versions(items),
        "items": items,
        "relationships": RELATIONSHIPS,
    }
    return attach_branches(payload)


def main() -> None:
    parser = argparse.ArgumentParser(description="Rebuild the local project history archive.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    payload = build_payload()
    if args.output.exists():
        try:
            payload = merge_manual(json.loads(args.output.read_text(encoding="utf-8")), payload)
        except json.JSONDecodeError:
            pass

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote project history to {args.output}")


if __name__ == "__main__":
    main()
