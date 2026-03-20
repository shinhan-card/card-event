/* 경쟁사 카드 이벤트 인텔리전스 - 대시보드 JS v3 (merged) */

// ============ 다크모드 ============
function toggleDarkMode() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? '' : 'dark');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}
(function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();

let ALL = [];          // 전체 이벤트 (현재 로드된 분)
let ALL_LOADED = false; // 전체 로드 완료 여부
let COMPARE_SET = new Set(); // 비교 담기 선택된 이벤트 ID
let EVT_PAGE = 1;      // 현재 페이지
let EVT_PAGE_SIZE = 30; // 페이지당 건수
let OVERVIEW = null;   // company-overview
let BENCHMARK = null;  // benefit-benchmark
let STRATEGY = null;   // strategy-map
let TRENDS = null;     // trends
let BRIEFINGS = null;  // company-briefings
let QUAL_COMPARE = null; // qualitative-comparison
let CURRENT_ID = null; // 상세 모달 이벤트 ID
let BRIEFING_STATUS = null;
let BRIEFING_LOGS = [];
let BRIEFING_SEND_BUSY = null;

// ============ 초기화 ============
document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initModalTabs();
  initFilters();
  ensureProductRagButtonPlacement();
  await loadAll();
});

async function loadAll() {
  try {
    const deferredBriefings = fetch('/api/analytics/company-briefings')
      .then(async response => {
        if (!response.ok) return null;
        BRIEFINGS = await response.json();
        try { renderCompanyBriefings(); } catch(_) {}
      })
      .catch(error => console.error('company-briefings load failed', error));

    const deferredQualCompare = fetch('/api/analytics/qualitative-comparison')
      .then(async response => {
        if (!response.ok) return null;
        QUAL_COMPARE = await response.json();
        try { renderQualitativeComparison(); } catch(_) {}
      })
      .catch(error => console.error('qualitative-comparison load failed', error));

    const [evR, stR, ovR, bmR, smR, trR, progR] = await Promise.all([
      fetch('/api/events'), fetch('/api/stats'),
      fetch('/api/analytics/company-overview'),
      fetch('/api/analytics/benefit-benchmark'),
      fetch('/api/analytics/strategy-map'),
      fetch('/api/analytics/trends'),
      fetch('/api/pipeline/progress'),
    ]);
    ALL = await evR.json();
    const prog = progR.ok ? await progR.json().catch(() => ({})) : {};
    updateLastRunSummary(prog);
    updateLastIngestSummary(prog);
    const stats = await stR.json();
    OVERVIEW = ovR.ok ? await ovR.json() : null;
    BENCHMARK = bmR.ok ? await bmR.json() : null;
    STRATEGY = smR.ok ? await smR.json() : null;
    TRENDS = trR.ok ? await trR.json() : null;

    updateHeaderStats(stats);
    try { renderActionCards(); } catch(_){}
    try { renderCompanyBriefings(); } catch(_){}
    try { renderQualitativeComparison(); } catch(_){}
    try { renderCompanyCards(); } catch(_){}
    try { renderBenefitDist(); } catch(_){}
    try { renderBenchmark(); } catch(_){}
    try { renderHeatmap(); } catch(_){}
    try { renderTrends(); } catch(_){}
    try { loadCompareMatrix(); } catch(_){}
    try { loadShinhanGap(); } catch(_){}
    try { loadGapTrend(); } catch(_){}
    renderEvents();
    populateFilters();
    void Promise.allSettled([deferredBriefings, deferredQualCompare]);
  } catch (e) { console.error(e); }
}

// ============ 상단 배너 지표 ============
function briefingTypeLabel(type) {
  return type === 'weekly' ? '주간' : '일간';
}

function safeBriefingNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeBriefingWarnings(value) {
  const items = Array.isArray(value) ? value : (value ? [value] : []);
  return items.map((item) => {
    if (typeof item === 'string') {
      return { title: item, message: item, severity: 'warning' };
    }
    if (!item || typeof item !== 'object') return null;
    return {
      title: item.title || item.label || item.message || item.name || '경고',
      message: item.message || item.detail || item.body || item.title || item.label || '',
      severity: String(item.severity || item.level || 'warning').toLowerCase(),
    };
  }).filter(Boolean);
}

function normalizeBriefingSourceCounts(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => ({
      label: item?.label || item?.name || item?.source || item?.type || 'source',
      value: safeBriefingNumber(item?.value ?? item?.count ?? item?.total ?? item?.items),
    }));
  }
  if (typeof value === 'object') {
    return Object.entries(value).map(([label, count]) => ({
      label,
      value: safeBriefingNumber(count),
    }));
  }
  return [];
}

function extractBriefingPrefixedFields(payload, type) {
  const prefix = `${type}_`;
  const extracted = {};
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (key.startsWith(prefix)) {
      extracted[key.slice(prefix.length)] = value;
    }
  });
  return extracted;
}

function getBriefingPeriodSource(payload, type) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const lowerType = String(type || '').toLowerCase();
  const items = Array.isArray(source.items) ? source.items : [];
  const item = items.find((entry) => String(entry?.type || entry?.briefing_type || entry?.period || '').toLowerCase() === lowerType);
  const keyed = source[lowerType] && typeof source[lowerType] === 'object' ? source[lowerType] : {};
  const periodMap = source.periods && typeof source.periods === 'object' ? source.periods[lowerType] : null;
  const reportMap = source.reports && typeof source.reports === 'object' ? source.reports[lowerType] : null;
  return {
    ...extractBriefingPrefixedFields(source, lowerType),
    ...(keyed || {}),
    ...(periodMap && typeof periodMap === 'object' ? periodMap : {}),
    ...(reportMap && typeof reportMap === 'object' ? reportMap : {}),
    ...(item && typeof item === 'object' ? item : {}),
  };
}

function normalizeBriefingPeriod(payload, type) {
  const source = getBriefingPeriodSource(payload, type);
  const warnings = normalizeBriefingWarnings(source.warnings || source.alerts || source.issues || source.messages);
  const warningCount = safeBriefingNumber(
    source.warning_count ??
    source.warningCount ??
    source.warning_total ??
    source.warnings_count ??
    source.warning_len ??
    warnings.length
  );
  return {
    type,
    periodLabel: source.period_label || source.label || source.title || source.period || source.report_label || briefingTypeLabel(type),
    warningCount,
    aiStatus: source.ai_status || source.gemini_status || source.model_status || source.ai || source.llm_status || 'unknown',
    ruleStatus: source.rule_status || source.rules_status || source.rule || source.heuristic_status || 'unknown',
    sourceCounts: normalizeBriefingSourceCounts(source.source_counts || source.sourceCounts || source.sources || source.counts),
    readiness: source.readiness || source.ready_state || source.status || source.state || (warningCount > 0 ? 'attention' : 'ready'),
    warnings,
    raw: source,
  };
}

function normalizeBriefingStatus(payload, errorMessage = '') {
  const raw = payload && typeof payload === 'object' ? payload : {};
  const warnings = normalizeBriefingWarnings(raw.warnings || raw.alerts || raw.issues || raw.messages || raw.notes);
  return {
    raw,
    error: errorMessage || raw.error || raw.message || '',
    updatedAt: raw.updated_at || raw.generated_at || raw.last_updated || raw.timestamp || raw.fetched_at || '',
    daily: normalizeBriefingPeriod(raw, 'daily'),
    weekly: normalizeBriefingPeriod(raw, 'weekly'),
    warnings,
  };
}

function getBriefingReadinessMeta(period) {
  const status = String(period?.readiness || '').toLowerCase();
  const warningCount = safeBriefingNumber(period?.warningCount);
  if (status.includes('block') || status.includes('fail') || status.includes('error')) {
    return { label: 'blocked', badge: 'border-rose-200 bg-rose-50 text-rose-700', dot: 'bg-rose-500' };
  }
  if (warningCount > 0 || status.includes('warn') || status.includes('attention')) {
    return { label: warningCount > 0 ? `${warningCount} warnings` : 'attention', badge: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
  }
  if (status.includes('ready') || status.includes('ok') || !status) {
    return { label: 'ready', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
  }
  return { label: period?.readiness || 'unknown', badge: 'border-slate-200 bg-slate-50 text-slate-600', dot: 'bg-slate-400' };
}

function renderBriefingStatusCard(period) {
  const readiness = getBriefingReadinessMeta(period);
  const sourcePills = period.sourceCounts.length
    ? period.sourceCounts.slice(0, 4).map((item) => `
        <span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">${esc(item.label)} <span class="ml-1 text-slate-400">${esc(item.value)}</span></span>
      `).join('')
    : '<span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">no source counts</span>';
  return `
    <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-[11px] font-semibold tracking-[0.08em] text-slate-500">${esc(briefingTypeLabel(period.type))} readiness</div>
          <div class="mt-1 text-sm font-bold text-slate-900">${esc(period.periodLabel)}</div>
        </div>
        <span class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${readiness.badge}">
          <span class="mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${readiness.dot}"></span>${esc(readiness.label)}
        </span>
      </div>
      <div class="mt-4 flex items-end justify-between gap-3">
        <div>
          <div class="text-[11px] font-semibold tracking-[0.08em] text-slate-400">warning count</div>
          <div class="mt-1 text-3xl font-black text-slate-900">${period.warningCount}</div>
        </div>
        <div class="text-right text-[11px] text-slate-500">
          <div>AI <strong class="text-slate-700">${esc(period.aiStatus)}</strong></div>
          <div>Rule <strong class="text-slate-700">${esc(period.ruleStatus)}</strong></div>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">${sourcePills}</div>
    </div>
  `;
}

function renderBriefingWarnings() {
  const container = document.getElementById('opsBriefingWarnings');
  if (!container) return;
  const statusWarnings = normalizeBriefingWarnings(BRIEFING_STATUS?.warnings);
  const periodWarnings = [
    ...(BRIEFING_STATUS?.daily?.warnings || []).map((item) => ({ ...item, source: 'daily' })),
    ...(BRIEFING_STATUS?.weekly?.warnings || []).map((item) => ({ ...item, source: 'weekly' })),
  ];
  const warnings = [...statusWarnings, ...periodWarnings];
  const unique = [];
  const seen = new Set();
  warnings.forEach((item) => {
    const key = `${item.source || ''}:${item.title || ''}:${item.message || ''}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(item);
  });
  if (!unique.length) {
    container.innerHTML = `
      <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
        <div class="text-[11px] font-semibold tracking-[0.08em] text-slate-400">warnings</div>
        <p class="mt-2 text-sm text-slate-600">현재 표시할 브리핑 경고가 없습니다.</p>
      </div>
    `;
    return;
  }
  container.innerHTML = `
    <div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-[11px] font-semibold tracking-[0.08em] text-amber-600">warnings</div>
          <p class="mt-1 text-sm font-semibold text-amber-900">${unique.length}개의 경고</p>
        </div>
        <span class="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700">주의 필요</span>
      </div>
      <div class="mt-3 space-y-2">
        ${unique.slice(0, 8).map((item) => `
          <div class="rounded-xl border border-amber-200 bg-white px-3 py-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700">${esc(item.severity || 'warning')}</span>
              <span class="text-sm font-semibold text-slate-800">${esc(item.title)}</span>
            </div>
            ${item.message ? `<p class="mt-1 text-xs leading-5 text-slate-600">${esc(item.message)}</p>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderBriefingActions() {
  const container = document.getElementById('opsBriefingActions');
  if (!container) return;
  const renderButton = (type, mode, label, tone) => {
    const key = `${type}:${mode}`;
    const busy = BRIEFING_SEND_BUSY === key;
    const cls = tone === 'primary' ? 'btn btn-primary' : 'btn btn-secondary';
    return `
      <button type="button" class="${cls} inline-flex items-center gap-1.5" data-briefing-send="${key}" ${busy ? 'disabled' : ''}>
        ${busy ? '<i class="fas fa-spinner fa-spin"></i>' : '<i class="fas fa-paper-plane"></i>'}
        <span>${esc(busy ? '발송 중...' : label)}</span>
      </button>
    `;
  };
  container.innerHTML = `
    <div class="grid gap-3 lg:grid-cols-2">
      <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-[11px] font-semibold tracking-[0.08em] text-slate-500">daily</div>
            <div class="mt-1 text-sm font-bold text-slate-900">일간 브리핑</div>
          </div>
          <a href="/api/briefing/preview?type=daily" target="_blank" class="btn btn-secondary text-xs"><i class="fas fa-eye mr-1"></i>preview</a>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          ${renderButton('daily', 'test', 'Test send', 'secondary')}
          ${renderButton('daily', 'production', 'Production send', 'primary')}
        </div>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-[11px] font-semibold tracking-[0.08em] text-slate-500">weekly</div>
            <div class="mt-1 text-sm font-bold text-slate-900">주간 브리핑</div>
          </div>
          <a href="/api/briefing/preview?type=weekly" target="_blank" class="btn btn-secondary text-xs"><i class="fas fa-eye mr-1"></i>preview</a>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          ${renderButton('weekly', 'test', 'Test send', 'secondary')}
          ${renderButton('weekly', 'production', 'Production send', 'primary')}
        </div>
      </div>
    </div>
  `;
  container.onclick = (event) => {
    const button = event.target.closest('[data-briefing-send]');
    if (!button || button.disabled) return;
    const [type, mode] = String(button.dataset.briefingSend || '').split(':');
    if (type && mode) void sendBriefingAction(type, mode);
  };
}

function renderBriefingLogTable() {
  const container = document.getElementById('opsBriefingLogTable');
  if (!container) return;
  const logs = Array.isArray(BRIEFING_LOGS) ? BRIEFING_LOGS : [];
  if (!logs.length) {
    container.innerHTML = `
      <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
        <div class="text-[11px] font-semibold tracking-[0.08em] text-slate-400">log table</div>
        <p class="mt-2 text-sm text-slate-600">발송 로그가 아직 없습니다.</p>
      </div>
    `;
    return;
  }
  container.innerHTML = `
    <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200 text-xs">
        <thead class="bg-slate-50 text-[11px] uppercase tracking-[0.08em] text-slate-500">
          <tr>
            <th class="px-4 py-3 text-left">sent at</th>
            <th class="px-4 py-3 text-left">type</th>
            <th class="px-4 py-3 text-left">status</th>
            <th class="px-4 py-3 text-right">recipients</th>
            <th class="px-4 py-3 text-right">new</th>
            <th class="px-4 py-3 text-right">high threat</th>
            <th class="px-4 py-3 text-right">ending soon</th>
            <th class="px-4 py-3 text-left">error</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 text-slate-700">
          ${logs.slice(0, 12).map((log) => {
            const statusTone = String(log.status || '').toLowerCase() === 'sent'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200';
            return `
              <tr class="align-top">
                <td class="px-4 py-3 whitespace-nowrap text-slate-500">${esc(formatShortDateTime(log.sent_at))}</td>
                <td class="px-4 py-3 whitespace-nowrap font-semibold text-slate-900">${esc(briefingTypeLabel(log.briefing_type))}</td>
                <td class="px-4 py-3 whitespace-nowrap"><span class="inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${statusTone}">${esc(log.status || 'unknown')}</span></td>
                <td class="px-4 py-3 text-right tabular-nums">${safeBriefingNumber(log.recipient_count)}</td>
                <td class="px-4 py-3 text-right tabular-nums">${safeBriefingNumber(log.new_events_count)}</td>
                <td class="px-4 py-3 text-right tabular-nums">${safeBriefingNumber(log.high_threat_count)}</td>
                <td class="px-4 py-3 text-right tabular-nums">${safeBriefingNumber(log.ending_soon_count)}</td>
                <td class="px-4 py-3 text-slate-500">${esc(log.error_msg || '-')}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderBriefingConsole() {
  const statusGrid = document.getElementById('opsBriefingStatusGrid');
  if (statusGrid) {
    const status = BRIEFING_STATUS || normalizeBriefingStatus({});
    statusGrid.innerHTML = [status.daily, status.weekly].map(renderBriefingStatusCard).join('');
  }
  renderBriefingWarnings();
  renderBriefingActions();
  renderBriefingLogTable();
}

async function loadBriefingConsole() {
  try {
    const [statusR, logsR] = await Promise.all([
      fetch('/api/briefing/status'),
      fetch('/api/briefing/logs'),
    ]);

    let statusPayload = {};
    if (statusR.ok) {
      statusPayload = await statusR.json().catch(() => ({}));
    } else if (statusR.status !== 404) {
      statusPayload = await statusR.json().catch(() => ({}));
      statusPayload.error = statusPayload.error || `status ${statusR.status}`;
    }
    BRIEFING_STATUS = normalizeBriefingStatus(statusPayload, statusR.ok ? '' : `status ${statusR.status}`);
    BRIEFING_LOGS = logsR.ok ? await logsR.json().catch(() => []) : [];
    renderBriefingConsole();
  } catch (error) {
    console.error('briefing console load failed', error);
    BRIEFING_STATUS = normalizeBriefingStatus({}, error.message || String(error));
    BRIEFING_LOGS = [];
    renderBriefingConsole();
  }
}

async function sendBriefingAction(type, mode) {
  const key = `${type}:${mode}`;
  if (BRIEFING_SEND_BUSY) return;
  const label = `${briefingTypeLabel(type)} 브리핑`;
  if (!confirm(`${label}을(를) ${mode === 'test' ? 'test' : 'production'} 모드로 발송할까요?`)) return;

  BRIEFING_SEND_BUSY = key;
  renderBriefingConsole();
  try {
    const response = await fetch(`/api/briefing/send-now?type=${encodeURIComponent(type)}&mode=${encodeURIComponent(mode)}`, {
      method: 'POST',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || payload.detail || payload.message || `send-now ${response.status}`);
    }
    alert(payload.message || payload.subject || `${label} 발송 요청이 완료되었습니다.`);
  } catch (error) {
    alert(`발송 실패: ${error.message}`);
  } finally {
    BRIEFING_SEND_BUSY = null;
    await loadBriefingConsole();
  }
}

function updateHeaderStats(stats) {
  const t = OVERVIEW?.totals || {};
  const el = (id) => document.getElementById(id);
  if (el('hsTotal')) el('hsTotal').textContent = stats?.total_events || ALL.length || 0;
  let ac = 0, ins = 0;
  ALL.forEach(e => { if (isActive(e)) ac++; if (pjson(e.marketing_insights)) ins++; });
  if (el('hsActive')) el('hsActive').textContent = ac;
  if (el('hsExtRate')) el('hsExtRate').textContent = (t.extraction_rate || 0) + '%';
  if (el('hsInsight')) el('hsInsight').textContent = ins;
  if (el('hsCompanies')) el('hsCompanies').textContent = OVERVIEW?.companies?.length || 0;

  // Gemini API 오류 배너 (오류가 있을 때만 표시, dismiss 시 세션스토리지에 기록)
  const geminiErrors = stats?.gemini_errors || [];
  const banner = document.getElementById('geminiErrorsBanner');
  const dismissed = sessionStorage.getItem('gemini_errors_dismissed') === '1';
  if (banner) {
    if (geminiErrors.length > 0 && !dismissed) {
      banner.classList.remove('hidden');
      if (el('geminiErrorCount')) el('geminiErrorCount').textContent = geminiErrors.length;
      const latest = geminiErrors[geminiErrors.length - 1];
      const latestMsg = latest?.message || latest?.kind || '오류';
      if (el('geminiErrorLatest')) el('geminiErrorLatest').textContent = '최근: ' + (latestMsg.length > 120 ? latestMsg.slice(0, 120) + '…' : latestMsg);
      const detailEl = document.getElementById('geminiErrorsDetail');
      if (detailEl) {
        detailEl.innerHTML = geminiErrors.slice().reverse().map((e, i) =>
          '<div class="border-l-2 border-amber-300 pl-2">' +
          '<span class="text-amber-600">' + (e.kind || '') + '</span> ' +
          (e.at ? new Date(e.at).toLocaleString('ko-KR') + ' — ' : '') +
          esc((e.message || '').slice(0, 200)) + (e.message && e.message.length > 200 ? '…' : '') +
          '</div>'
        ).join('');
        detailEl.classList.add('hidden');
      }
      const toggleBtn = document.getElementById('geminiErrorsToggle');
      if (toggleBtn) toggleBtn.textContent = '상세 보기';
    } else {
      banner.classList.add('hidden');
    }
  }

  // 수집 일시 fallback: last_ingest_at가 없으면 stats.last_updated 사용
  const headerEl = document.getElementById('headerLastIngest');
  if (headerEl && headerEl.classList.contains('hidden') && stats?.last_updated) {
    const d = new Date(stats.last_updated);
    if (!isNaN(d.getTime())) {
      headerEl.textContent = '최종 데이터 기준: ' + d.toLocaleString('ko-KR', {hour12:false});
      headerEl.classList.remove('hidden');
    }
  }
}

function dismissGeminiErrorsBanner() {
  sessionStorage.setItem('gemini_errors_dismissed', '1');
  const banner = document.getElementById('geminiErrorsBanner');
  if (banner) banner.classList.add('hidden');
}

function toggleGeminiErrorsDetail() {
  const detail = document.getElementById('geminiErrorsDetail');
  const btn = document.getElementById('geminiErrorsToggle');
  if (!detail || !btn) return;
  const isHidden = detail.classList.contains('hidden');
  detail.classList.toggle('hidden', !isHidden);
  btn.textContent = isHidden ? '상세 접기' : '상세 보기';
}

// ============ 탭 ============
function initTabs() {
  document.querySelectorAll('nav .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('nav .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
      document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
    });
  });
}

function initModalTabs() {
  document.querySelectorAll('[data-mtab]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchDetailTab(btn.dataset.mtab || 'iframe');
    });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && CURRENT_ID) closeModal(); });
  document.getElementById('detailModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
}

function switchDetailTab(tabName = 'iframe') {
  const nextTab = ['iframe', 'intelligence', 'edit'].includes(tabName) ? tabName : 'iframe';
  document.querySelectorAll('[data-mtab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mtab === nextTab);
  });
  ['iframe', 'intelligence', 'edit'].forEach(name => {
    const panel = document.getElementById(`mp-${name}`);
    if (panel) panel.classList.toggle('hidden', name !== nextTab);
  });
  const zoomControls = document.getElementById('zoomControls');
  if (zoomControls) zoomControls.classList.toggle('hidden', nextTab !== 'iframe');
}

function initFilters() {
  ['searchKw','fCompany','fCat','fStatus','fBenefitType','fExtracted','fTag','fReview'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => { EVT_PAGE = 1; renderEvents(); });
  });
}

// ============ KPI ============
function renderKPI(stats) {
  const t = OVERVIEW?.totals || {};
  document.getElementById('kTotal').textContent = stats.total_events || 0;
  let ac = 0, en = 0, ins = 0;
  ALL.forEach(e => { isActive(e) ? ac++ : en++; if (pjson(e.marketing_insights)) ins++; });
  document.getElementById('kActive').textContent = ac;
  document.getElementById('kEnded').textContent = en;
  document.getElementById('kInsight').textContent = ins;
  document.getElementById('kExtRate').textContent = (t.extraction_rate || 0) + '%';
  document.getElementById('kCompanies').textContent = OVERVIEW?.companies?.length || 0;
}

// ============ 커버리지 차트 ============
function renderCoverage() {
  const cs = sortCompanies(OVERVIEW?.companies || [], 'company');
  if (!cs.length) return;
  const labels = cs.map(c => c.company);
  new Chart(document.getElementById('chartCoverage'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {label: '수집', data: cs.map(c => c.collected_count), backgroundColor: '#94a3b8'},
        {label: '추출', data: cs.map(c => c.extracted_count), backgroundColor: '#3b82f6'},
        {label: '인사이트', data: cs.map(c => c.insight_count), backgroundColor: '#8b5cf6'},
      ]
    },
    options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}}, scales:{x:{stacked:false},y:{beginAtZero:true}}}
  });
}

// ============ 3대 액션 카드 (전략 브리핑 메인) ============
function renderActionCards() {
  renderUrgentEvents();
  renderRiskMap();
  renderWeeklyChanges();
}

function isShinhan(company) {
  return (company || '').includes('신한');
}

function parseEventEndDate(ev) {
  const d0 = ev?.period_end ? new Date(ev.period_end) : null;
  if (d0 && !Number.isNaN(d0.getTime())) return d0;
  const period = String(ev?.period || '');
  if (!period) return null;
  let endText = '';
  if (period.includes('~')) endText = period.split('~')[1] || '';
  else {
    const m = period.match(/(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})\s*$/);
    endText = m ? m[1] : '';
  }
  const normalized = endText.trim().replace(/\./g, '-').replace(/\s+/g, '');
  if (!normalized) return null;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysUntilDate(d) {
  if (!d) return null;
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((target - base) / (24 * 60 * 60 * 1000));
}

function getGapCategories() {
  const buckets = {};
  ALL.filter(e => isActive(e)).forEach(e => {
    const cat = (e.category || '').trim();
    if (!cat) return;
    if (!buckets[cat]) buckets[cat] = {shinhan: 0, competitor: 0};
    if (isShinhan(e.company)) buckets[cat].shinhan += 1;
    else buckets[cat].competitor += 1;
  });
  return Object.entries(buckets)
    .filter(([, v]) => v.shinhan === 0 && v.competitor > 0)
    .sort((a, b) => b[1].competitor - a[1].competitor)
    .map(([category, v]) => ({category, count: v.competitor}));
}

function renderShinhanMarketingBoard() {
  const activeCompEl = document.getElementById('mkThreatNow');
  const gapEl = document.getElementById('mkGapCats');
  const endingEl = document.getElementById('mkEndingSoon');
  const pendingEl = document.getElementById('mkUrgencyIndex');
  const topEl = document.getElementById('mkTopPressure');
  const actionEl = document.getElementById('mkActionList');
  const metaEl = document.getElementById('mkBoardMeta');
  if (!topEl || !actionEl) return;

  const activeCompetitors = ALL.filter(e => isActive(e) && !isShinhan(e.company));
  const topByBenefit = activeCompetitors
    .map(e => ({
      event: e,
      amount: Number(e.benefit_amount_won || 0),
      pct: Number(e.benefit_pct || 0),
      createdTs: new Date(e.created_at || 0).getTime(),
    }))
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      if (b.pct !== a.pct) return b.pct - a.pct;
      return b.createdTs - a.createdTs;
    })
    .slice(0, 6);

  const gaps = getGapCategories();
  const endingSoon = activeCompetitors.filter(e => {
    const left = daysUntilDate(parseEventEndDate(e));
    return left !== null && left >= 0 && left <= 14;
  });
  const pendingExtract = activeCompetitors.filter(e => !isExtracted(e));
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newCompetitors = activeCompetitors.filter(e => e.created_at && new Date(e.created_at) >= weekAgo);

  if (activeCompEl) activeCompEl.textContent = activeCompetitors.length;
  if (gapEl) gapEl.textContent = gaps.length;
  if (endingEl) endingEl.textContent = endingSoon.length;
  if (pendingEl) pendingEl.textContent = pendingExtract.length;
  if (metaEl) metaEl.textContent = `기준 시각: ${new Date().toLocaleString('ko-KR', {hour12: false})} · 진행 중 경쟁 이벤트 기준`;

  if (!topByBenefit.length) {
    topEl.innerHTML = '<p class="text-xs text-slate-400">진행 중 경쟁 이벤트 데이터가 없습니다.</p>';
  } else {
    topEl.innerHTML = topByBenefit.map(({event, amount, pct}) => {
      const amountTxt = amount > 0 ? `${Math.round(amount).toLocaleString()}원` : '-';
      const pctTxt = pct > 0 ? `${pct}%` : '-';
      const ext = isExtracted(event);
      return `
        <button type="button" onclick="openDetail(${event.id})" class="w-full text-left flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2.5 py-2 transition">
          <span class="${pillCls(event.company)} badge-sm mt-0.5">${esc((event.company || '').replace('카드', ''))}</span>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-slate-800 truncate">${esc(event.title || '')}</p>
            <p class="text-[11px] text-slate-500 mt-0.5 truncate">${esc(event.period || '-')}</p>
          </div>
          <div class="flex flex-col items-end gap-1">
            <span class="badge-sm bg-slate-100 text-slate-700">금액 ${amountTxt}</span>
            <span class="badge-sm bg-slate-100 text-slate-700">비율 ${pctTxt}</span>
            <span class="badge-sm ${ext ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}">${ext ? '추출완료' : '미추출'}</span>
          </div>
        </button>
      `;
    }).join('');
  }

  const actions = [];
  const pendingByCompany = pendingExtract.reduce((acc, ev) => {
    const co = ev.company || '기타';
    acc[co] = (acc[co] || 0) + 1;
    return acc;
  }, {});
  const pendingTop = Object.entries(pendingByCompany)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([co, cnt]) => `${co} ${cnt}건`)
    .join(', ');
  actions.push(
    pendingExtract.length
      ? `미추출 경쟁 이벤트 ${pendingExtract.length}건 (상위: ${pendingTop})`
      : '진행 중 경쟁 이벤트는 모두 추출 완료 상태'
  );
  actions.push(
    endingSoon.length
      ? `14일 내 종료 예정 경쟁 이벤트 ${endingSoon.length}건`
      : '14일 내 종료 예정 경쟁 이벤트 없음'
  );
  actions.push(
    gaps.length
      ? `신한 미진입 카테고리 ${gaps.length}개 (상위: ${gaps.slice(0, 3).map(g => g.category).join(', ')})`
      : '신한 미진입 카테고리 없음'
  );
  actions.push(`최근 7일 신규 경쟁 이벤트 ${newCompetitors.length}건`);

  actionEl.innerHTML = actions.slice(0, 4).map((txt, i) => `
    <li class="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
      <span class="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold inline-flex items-center justify-center mt-0.5">${i + 1}</span>
      <span class="text-xs leading-relaxed">${esc(txt)}</span>
    </li>
  `).join('');
}

function renderUrgentEvents() {
  const el = document.getElementById('actionUrgent');
  if (!el) return;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  let urgent = ALL.filter(e => {
    if (!e.company || e.company.includes('신한')) return false;
    if (!isActive(e)) return false;
    if (e.created_at) { if (new Date(e.created_at) < weekAgo) return false; }
    return true;
  });
  const scoreMap = {'높음': 4, '중상': 3, '보통': 2, '낮음': 1};
  urgent.sort((a, b) => {
    const insA = pjson(a.marketing_insights), insB = pjson(b.marketing_insights);
    return (scoreMap[(insB||{}).benefit_level]||0) - (scoreMap[(insA||{}).benefit_level]||0);
  });
  urgent = urgent.slice(0, 5);
  if (!urgent.length) { el.innerHTML = '<p class="text-slate-400 text-xs">최근 7일 내 신규 경쟁 이벤트 없음</p>'; return; }
  el.innerHTML = urgent.map(e => `
    <div class="flex items-start gap-2 p-2 rounded-lg bg-rose-50 border border-rose-100 cursor-pointer hover:bg-rose-100 transition" onclick="openDetail(${e.id})">
      <span class="${pillCls(e.company)} badge-sm mt-0.5">${esc(e.company)}</span>
      <div class="min-w-0"><span class="font-medium text-slate-800 text-xs">${esc(getEventDisplayTitle(e, 45))}</span>
      <p class="text-[11px] text-slate-500 mt-0.5">${esc(getEventDisplayBenefit(e, 40))} ${e.period ? '| '+esc(e.period) : ''}</p></div>
    </div>`).join('');
}

function renderRiskMap() {
  const el = document.getElementById('actionRiskMap');
  if (!el) return;
  // 경쟁사만으로 카테고리별 이벤트 분포 매트릭스 구성
  const categories = {}, companies = new Set();
  ALL.filter(e => isActive(e)).forEach(e => {
    const cat = (e.category || '').trim(); if (!cat) return;
    const co = (e.company || '').trim(); if (!co) return;
    companies.add(co);
    if (!categories[cat]) categories[cat] = {};
    categories[cat][co] = (categories[cat][co] || 0) + 1;
  });
  // 4사 모두 표시 (신한 포함)
  const coList = sortCompanies([...companies]);
  // 카테고리를 총 이벤트 수 기준 정렬
  const catList = Object.keys(categories).sort((a, b) => {
    const sumA = coList.reduce((s, c) => s + (categories[a][c] || 0), 0);
    const sumB = coList.reduce((s, c) => s + (categories[b][c] || 0), 0);
    return sumB - sumA;
  });
  if (!catList.length || !coList.length) { el.innerHTML = '<p class="text-slate-400 text-xs">데이터 부족</p>'; return; }

  // 경쟁 집중 카테고리 (2사 이상 참여 + 합산 3건 이상)
  const hotCats = catList.filter(cat => {
    const participating = coList.filter(c => (categories[cat][c] || 0) > 0).length;
    const total = coList.reduce((s, c) => s + (categories[cat][c] || 0), 0);
    return participating >= 2 && total >= 3;
  });

  let html = '';
  if (hotCats.length) {
    html += '<div class="mb-3"><p class="text-xs font-bold text-rose-700 mb-2"><i class="fas fa-fire mr-1"></i>경쟁 과열 카테고리 (2사 이상 진행)</p>';
    html += hotCats.slice(0, 5).map(cat => {
      const total = coList.reduce((s, c) => s + (categories[cat][c] || 0), 0);
      const who = coList.filter(c => (categories[cat][c] || 0) > 0).map(c => c.replace('카드','')).join('·');
      return `<div class="flex justify-between items-center px-2 py-1.5 bg-rose-50 border border-rose-100 rounded mb-1"><span class="text-xs font-medium">${esc(cat)}</span><span class="text-[11px] text-rose-700">${who} (${total}건)</span></div>`;
    }).join('');
    html += '</div>';
  }

  // 특정 카드사만 독점하는 카테고리
  const exclusives = catList.filter(cat => {
    const participating = coList.filter(c => (categories[cat][c] || 0) > 0);
    return participating.length === 1 && (categories[cat][participating[0]] || 0) >= 2;
  });
  if (exclusives.length) {
    html += '<div class="mb-3"><p class="text-xs font-bold text-amber-700 mb-2"><i class="fas fa-crown mr-1"></i>단독 집중 카테고리</p>';
    html += exclusives.slice(0, 4).map(cat => {
      const owner = coList.find(c => (categories[cat][c] || 0) > 0);
      return `<div class="flex justify-between items-center px-2 py-1.5 bg-amber-50 border border-amber-100 rounded mb-1"><span class="text-xs font-medium">${esc(cat)}</span><span class="${pillCls(owner)} badge-sm">${esc((owner||'').replace('카드',''))} ${categories[cat][owner]}건</span></div>`;
    }).join('');
    html += '</div>';
  }

  // 경쟁사 히트맵 테이블
  html += '<table class="w-full text-[11px] mt-2"><thead><tr><th class="text-left px-1 py-1">카테고리</th>';
  coList.forEach(c => html += `<th class="px-1 py-1 text-center">${esc(c.replace('카드',''))}</th>`);
  html += '<th class="px-1 py-1 text-center text-slate-400">합계</th>';
  html += '</tr></thead><tbody>';
  catList.slice(0, 12).forEach(cat => {
    const total = coList.reduce((s, c) => s + (categories[cat][c] || 0), 0);
    html += '<tr>';
    html += `<td class="px-1 py-1 font-medium truncate max-w-[100px]">${esc(cat)}</td>`;
    coList.forEach(c => {
      const v = categories[cat][c] || 0;
      const bg = v === 0 ? 'text-slate-300' : v <= 2 ? 'bg-blue-50' : v <= 5 ? 'bg-blue-100 font-bold' : 'bg-blue-200 font-bold';
      html += `<td class="px-1 py-1 text-center ${bg}">${v || '-'}</td>`;
    });
    html += `<td class="px-1 py-1 text-center text-slate-500 font-bold">${total}</td>`;
    html += '</tr>';
  });
  html += '</tbody></table>';
  if (catList.length > 12) html += `<p class="text-[11px] text-slate-400 mt-1">외 ${catList.length - 12}개 카테고리</p>`;
  el.innerHTML = html;
}

function renderRiskMap() {
  const el = document.getElementById('actionRiskMap');
  if (!el) return;

  const categories = {};
  const companies = new Set();
  ALL.filter(e => isActive(e)).forEach(e => {
    const cat = (e.category || '').trim();
    const co = (e.company || '').trim();
    if (!cat || !co) return;
    companies.add(co);
    if (!categories[cat]) categories[cat] = {};
    categories[cat][co] = (categories[cat][co] || 0) + 1;
  });

  const coList = sortCompanies([...companies]);
  const catList = Object.keys(categories).sort((a, b) => {
    const sumA = coList.reduce((sum, co) => sum + (categories[a][co] || 0), 0);
    const sumB = coList.reduce((sum, co) => sum + (categories[b][co] || 0), 0);
    return sumB - sumA;
  });

  if (!catList.length || !coList.length) {
    el.innerHTML = '<p class="text-slate-400 text-xs">표시할 데이터가 없습니다.</p>';
    return;
  }

  const exclusives = catList.filter(cat => {
    const participatingCompanies = coList.filter(co => (categories[cat][co] || 0) > 0);
    return participatingCompanies.length === 1 && (categories[cat][participatingCompanies[0]] || 0) >= 2;
  });

  let html = '';
  const hotCats = [];

  if (hotCats.length) {
    html += '<div class="mb-3"><p class="text-xs font-bold text-rose-700 mb-2"><i class="fas fa-fire mr-1"></i>경쟁 과열 카테고리 (2사 이상 진행)</p>';
    html += hotCats.slice(0, 5).map(cat => {
      const participatingCompanies = coList.filter(co => (categories[cat][co] || 0) > 0);
      const participatingCount = participatingCompanies.length;
      const total = coList.reduce((sum, co) => sum + (categories[cat][co] || 0), 0);
      const who = participatingCompanies.map(co => co.replace('카드', '')).join('·');
      return `
        <div class="flex justify-between items-center gap-3 px-2 py-1.5 bg-rose-50 border border-rose-100 rounded mb-1">
          <span class="text-xs font-medium">${esc(cat)}</span>
          <span class="text-[11px] text-right text-rose-700">
            ${participatingCount}사 참여 · ${total}건
            <br>
            <span class="text-[10px] text-rose-600">${esc(who)}</span>
          </span>
        </div>
      `;
    }).join('');
    html += '</div>';
  }

  if (exclusives.length) {
    html += '<div class="mb-3"><p class="text-xs font-bold text-amber-700 mb-2"><i class="fas fa-crown mr-1"></i>단독 집중 카테고리 (1사 단독 · 2건 이상)</p>';
    html += exclusives.slice(0, 4).map(cat => {
      const owner = coList.find(co => (categories[cat][co] || 0) > 0) || '';
      const ownerShort = owner.replace('카드', '');
      return `
        <div class="flex justify-between items-center gap-3 px-2 py-1.5 bg-amber-50 border border-amber-100 rounded mb-1">
          <span class="text-xs font-medium">${esc(cat)}</span>
          <span class="${pillCls(owner)} badge-sm">${esc(ownerShort)} 단독 · ${categories[cat][owner] || 0}건</span>
        </div>
      `;
    }).join('');
    html += '</div>';
  }

  html += '<table class="w-full text-[11px] mt-2"><thead><tr><th class="text-left px-1 py-1">카테고리</th>';
  coList.forEach(co => {
    html += `<th class="px-1 py-1 text-center">${esc(co.replace('카드', ''))}</th>`;
  });
  html += '<th class="px-1 py-1 text-center text-slate-400">합계</th>';
  html += '</tr></thead><tbody>';

  catList.slice(0, 12).forEach(cat => {
    const total = coList.reduce((sum, co) => sum + (categories[cat][co] || 0), 0);
    html += '<tr>';
    html += `<td class="px-1 py-1 font-medium truncate max-w-[100px]">${esc(cat)}</td>`;
    coList.forEach(co => {
      const value = categories[cat][co] || 0;
      const bg = value === 0 ? 'text-slate-300' : value <= 2 ? 'bg-blue-50' : value <= 5 ? 'bg-blue-100 font-bold' : 'bg-blue-200 font-bold';
      html += `<td class="px-1 py-1 text-center ${bg}">${value || '-'}</td>`;
    });
    html += `<td class="px-1 py-1 text-center text-slate-500 font-bold">${total}</td>`;
    html += '</tr>';
  });

  html += '</tbody></table>';
  if (catList.length > 12) {
    html += `<p class="text-[11px] text-slate-400 mt-1">외 ${catList.length - 12}개 카테고리</p>`;
  }
  el.innerHTML = html;
}

async function renderWeeklyChanges() {
  const el = document.getElementById('actionWeekly');
  if (!el) return;
  const now = new Date();
  // 이번주 월요일~일요일 계산
  const dayOfWeek = now.getDay() || 7;
  const monday = new Date(now); monday.setDate(now.getDate() - dayOfWeek + 1); monday.setHours(0,0,0,0);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999);
  // 주차 텍스트
  const month = now.getMonth() + 1;
  const weekNum = Math.ceil(now.getDate() / 7);
  const weekLabel = `${month}월 ${weekNum}주차`;

  // 이번주 신규 이벤트 (수집일 기준)
  const newEvents = ALL.filter(e => {
    if (!e.period_start) return false;
    const d = new Date(e.period_start);
    if (Number.isNaN(d.getTime())) return false;
    return d >= monday && d <= sunday;
  });
  // 이번주 종료 예정 이벤트 (period_end 기준)
  const endingEvents = ALL.filter(e => {
    const endDate = parseEventEndDate(e);
    if (!endDate || Number.isNaN(endDate.getTime())) return false;
    return endDate >= monday && endDate <= sunday;
  });

  // 카드사별 분류
  const coOrder = ['신한카드','KB국민카드','삼성카드','현대카드'];
  const byCoNew = {};
  const byCoEnd = {};
  newEvents.forEach(e => { const co = e.company || '기타'; (byCoNew[co] = byCoNew[co] || []).push(e); });
  endingEvents.forEach(e => { const co = e.company || '기타'; (byCoEnd[co] = byCoEnd[co] || []).push(e); });

  const productCatalog = Array.isArray(PRODUCT_CATALOG)
    ? Array.from(new Map(PRODUCT_CATALOG.map(item => [`${item?.company || ''}::${item?.card_name || ''}`, item])).values())
    : [];
  const getProductLaunchDate = (product) =>
    parseEventDate(product?.launch_date) ||
    parseEventDate(product?.published_date) ||
    parseEventDate(product?.effective_date) ||
    parseEventDate(product?.collected_at);
  const getProductStopDate = (product) => {
    const raw = String(product?.discontinue_date || '').trim();
    if (!raw || raw.startsWith('9999')) return null;
    return parseEventDate(raw);
  };
  const launchedProducts = productCatalog
    .filter(product => {
      const date = getProductLaunchDate(product);
      return date && date >= monday && date <= sunday;
    })
    .sort((left, right) => (getProductLaunchDate(right)?.getTime() || 0) - (getProductLaunchDate(left)?.getTime() || 0));
  const endingProducts = productCatalog
    .filter(product => {
      const date = getProductStopDate(product);
      return date && date >= monday && date <= sunday;
    })
    .sort((left, right) => (getProductStopDate(left)?.getTime() || 0) - (getProductStopDate(right)?.getTime() || 0));
  const byCoLaunch = {};
  const byCoStop = {};
  launchedProducts.forEach(product => {
    const co = product.company || '湲고?';
    (byCoLaunch[co] = byCoLaunch[co] || []).push(product);
  });
  endingProducts.forEach(product => {
    const co = product.company || '湲고?';
    (byCoStop[co] = byCoStop[co] || []).push(product);
  });

  let html = `<div class="flex items-center justify-between mb-3">
    <span class="text-sm font-bold text-slate-800">${weekLabel}</span>
    <span class="text-[11px] text-slate-400">${monday.getMonth()+1}/${monday.getDate()} ~ ${sunday.getMonth()+1}/${sunday.getDate()}</span>
    <div class="text-center bg-indigo-50 rounded-lg p-2"><div class="text-lg font-bold text-indigo-700">${launchedProducts.length}</div><div class="text-[11px] text-indigo-500">상품 출시</div></div>
    <div class="text-center bg-rose-50 rounded-lg p-2"><div class="text-lg font-bold text-rose-700">${endingProducts.length}</div><div class="text-[11px] text-rose-500">발급중단 예정</div></div>
  </div>`;

  // 요약 숫자
  html += `<div class="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
    <div class="text-center bg-blue-50 rounded-lg p-2"><div class="text-lg font-bold text-blue-700">${newEvents.length}</div><div class="text-[11px] text-blue-500">신규 시작</div></div>
    <div class="text-center bg-amber-50 rounded-lg p-2"><div class="text-lg font-bold text-amber-700">${endingEvents.length}</div><div class="text-[11px] text-amber-500">종료 예정</div></div>
  </div>`;

  // 카드사별 신규 이벤트
  if (newEvents.length) {
    html += '<div class="mb-3"><p class="text-xs font-bold text-blue-700 mb-1.5"><i class="fas fa-play-circle mr-1"></i>이번주 신규</p>';
    const cos = coOrder.filter(c => byCoNew[c]?.length);
    // coOrder에 없는 카드사도 포함
    Object.keys(byCoNew).filter(c => !coOrder.includes(c)).forEach(c => cos.push(c));
    cos.forEach(co => {
      const events = byCoNew[co] || [];
      html += `<div class="mb-2"><span class="${pillCls(co)} badge-sm">${esc(co.replace('카드',''))}</span><span class="text-[11px] text-slate-400 ml-1">${events.length}건</span>`;
      html += '<div class="ml-1 mt-1 space-y-0.5">';
      events.slice(0, 3).forEach(e => {
        html += `<div class="text-[11px] text-slate-600 truncate cursor-pointer hover:text-blue-600" onclick="openDetail(${e.id})">${esc(getEventDisplayTitle(e, 40))}</div>`;
      });
      if (events.length > 3) html += `<div class="text-[11px] text-slate-400">외 ${events.length - 3}건</div>`;
      html += '</div></div>';
    });
    html += '</div>';
  }

  // 카드사별 종료 예정 이벤트
  if (endingEvents.length) {
    html += '<div><p class="text-xs font-bold text-amber-700 mb-1.5"><i class="fas fa-hourglass-end mr-1"></i>이번주 종료 예정</p>';
    const cos = coOrder.filter(c => byCoEnd[c]?.length);
    Object.keys(byCoEnd).filter(c => !coOrder.includes(c)).forEach(c => cos.push(c));
    cos.forEach(co => {
      const events = byCoEnd[co] || [];
      html += `<div class="mb-2"><span class="${pillCls(co)} badge-sm">${esc(co.replace('카드',''))}</span><span class="text-[11px] text-slate-400 ml-1">${events.length}건</span>`;
      html += '<div class="ml-1 mt-1 space-y-0.5">';
      events.slice(0, 3).forEach(e => {
        const endPart = (e.period||'').split('~')[1] || '';
        html += `<div class="text-[11px] text-slate-600 truncate cursor-pointer hover:text-amber-600" onclick="openDetail(${e.id})">${esc(getEventDisplayTitle(e, 35))} <span class="text-slate-400">${esc(endPart.trim())}</span></div>`;
      });
      if (events.length > 3) html += `<div class="text-[11px] text-slate-400">외 ${events.length - 3}건</div>`;
      html += '</div></div>';
    });
    html += '</div>';
  }

  if (!newEvents.length && !endingEvents.length) {
    html += '<p class="text-xs text-slate-400">이번주 신규/종료 이벤트 없음</p>';
  }
  el.innerHTML = html;
}

// ============ 최근 경쟁 이벤트 피드 ============
function isExtracted(e) {
  const raw = e.raw_text && String(e.raw_text).trim();
  const mi = pjson(e.marketing_insights);
  return !!(raw && raw.length > 20) || (mi && (typeof mi === 'object' ? Object.keys(mi).length > 0 : mi.length > 0));
}
function renderTopThreats() {
  const el = document.getElementById('topExtracted');
  if (!el) return;
  const feed = ALL
    .filter(e => !isShinhan(e.company))
    .sort((a, b) => {
      const aActive = isActive(a) ? 1 : 0;
      const bActive = isActive(b) ? 1 : 0;
      if (bActive !== aActive) return bActive - aActive;
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return tb - ta;
    })
    .slice(0, 5);
  if (!feed.length) {
    el.innerHTML = '<p class="text-slate-400">경쟁 이벤트 데이터가 없습니다.</p>';
    return;
  }
  el.innerHTML = feed.map(event => `
    <div class="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100" onclick="openDetail(${event.id})">
      <span class="${pillCls(event.company)} badge-sm mt-0.5">${esc((event.company || '').replace('카드', ''))}</span>
      <div class="min-w-0">
        <span class="font-medium text-slate-800">${esc(getEventDisplayTitle(event, 60))}</span>
        <p class="text-xs text-slate-500 mt-0.5">${esc(event.period||'')} ${getEventDisplayBenefit(event, 40) ? '| '+esc(getEventDisplayBenefit(event, 40)) : ''}</p>
      </div>
      <div class="flex flex-col gap-1 items-end">
        <span class="badge-sm ${isActive(event) ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}">${isActive(event) ? '진행중' : '종료'}</span>
        <span class="badge-sm ${isExtracted(event) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}">${isExtracted(event) ? '추출완료' : '미추출'}</span>
      </div>
    </div>
  `).join('');
}

function renderCompanyBriefings() {
  const shBox = document.getElementById('briefingShinhan');
  const compBox = document.getElementById('briefingCompetitors');
  const meta = document.getElementById('briefMeta');
  if (!meta) return;
  const items = BRIEFINGS?.items || [];
  if (!items.length) {
    meta.textContent = '';
    if (shBox) shBox.innerHTML = '';
    if (compBox) compBox.innerHTML = '<p class="text-sm text-slate-400">브리핑 데이터가 없습니다.</p>';
    return;
  }
  const generatedAt = fmtDate(BRIEFINGS.generated_at);
  meta.textContent = `업데이트: ${generatedAt}`;

  const shinhan = items.find(i => (i.company||'').includes('신한'));
  const competitors = items.filter(i => !(i.company||'').includes('신한'));

  // 신한카드 (당사) - 위협 요인 없이, 전략 현황 중심
  if (shBox) {
    if (shinhan) {
      const src = shinhan.source === 'gemini' ? 'Gemini' : 'Rule';
      const cats = (shinhan.strongest_categories || []).slice(0, 3);
      shBox.innerHTML = `
        <div class="border-2 border-blue-300 rounded-xl p-4 bg-gradient-to-r from-blue-50 via-white to-blue-50">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="pill-shinhan badge-sm">신한카드</span>
              <span class="text-xs font-bold text-blue-700">당사</span>
            </div>
            <span class="text-[11px] px-1.5 py-0.5 rounded ${src==='Gemini'?'text-emerald-700 bg-emerald-50':'text-amber-700 bg-amber-50'}">${src}</span>
          </div>
          <p class="text-sm text-slate-700 leading-relaxed mb-3">${esc(shinhan.overview || '')}</p>
          <div class="grid sm:grid-cols-2 gap-3">
            ${shinhan.key_strategy ? `<div class="bg-blue-50 rounded-lg px-3 py-2"><span class="text-[11px] font-bold text-blue-700 block mb-1">현재 핵심 전략</span><p class="text-xs text-blue-900">${esc(shinhan.key_strategy)}</p></div>` : ''}
            ${cats.length ? `<div><span class="text-[11px] font-bold text-slate-500 block mb-1">강점 카테고리</span><div class="flex flex-wrap gap-1">${cats.map(x => `<span class="text-[11px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">${esc(x)}</span>`).join('')}</div></div>` : ''}
            ${shinhan.avg_benefit_assessment ? `<div><span class="text-[11px] font-bold text-slate-500 block mb-1">혜택 수준</span><p class="text-xs text-slate-700">${esc(shinhan.avg_benefit_assessment)}</p></div>` : ''}
            ${shinhan.target_focus ? `<div><span class="text-[11px] font-bold text-slate-500 block mb-1">주력 타겟</span><p class="text-xs text-slate-700">${esc(shinhan.target_focus)}</p></div>` : ''}
          </div>
        </div>`;
    } else {
      shBox.innerHTML = '';
    }
  }

  // 경쟁 3사 - 위협 요인 포함
  if (compBox) {
    compBox.innerHTML = competitors.map(item => {
      const src = item.source === 'gemini' ? 'Gemini' : 'Rule';
      const srcCls = item.source === 'gemini' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50';
      const cats = (item.strongest_categories || []).slice(0, 3);
      return `
        <article class="border rounded-xl p-3 bg-white card-co ${coCls(item.company)}">
          <div class="flex items-center justify-between mb-2">
            <span class="${pillCls(item.company)} badge-sm">${esc(item.company)}</span>
            <span class="text-[11px] px-1.5 py-0.5 rounded ${srcCls}">${src}</span>
          </div>
          <p class="text-sm text-slate-700 leading-relaxed mb-2">${esc(item.overview || '')}</p>
          ${item.key_strategy ? `<div class="mb-2 bg-slate-50 rounded-lg px-2.5 py-1.5"><span class="text-[11px] font-bold text-slate-600">핵심 전략</span><p class="text-xs text-slate-800 mt-0.5">${esc(item.key_strategy)}</p></div>` : ''}
          ${cats.length ? `<div class="mb-2 flex flex-wrap gap-1">${cats.map(x => `<span class="text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">${esc(x)}</span>`).join('')}</div>` : ''}
          ${item.avg_benefit_assessment ? `<p class="text-xs text-slate-600 mb-1"><span class="font-bold">혜택:</span> ${esc(item.avg_benefit_assessment)}</p>` : ''}
          ${item.target_focus ? `<p class="text-xs text-slate-600 mb-1"><span class="font-bold">타겟:</span> ${esc(item.target_focus)}</p>` : ''}
          ${item.shinhan_threat ? `<div class="mb-2 bg-rose-50 rounded-lg px-2.5 py-1.5"><span class="text-[11px] font-bold text-rose-700"><i class="fas fa-exclamation-triangle mr-1"></i>신한 위협 요인</span><p class="text-xs text-rose-800 mt-0.5">${esc(item.shinhan_threat)}</p></div>` : ''}
          ${item.recommended_counter ? `<p class="text-xs text-emerald-700 font-medium"><i class="fas fa-lightbulb mr-1 text-emerald-500"></i>${esc(item.recommended_counter)}</p>` : ''}
        </article>`;
    }).join('');
  }
}

function renderQualitativeComparison() {
  const box = document.getElementById('qualitativeMatrix');
  const meta = document.getElementById('qualMeta');
  if (!box || !meta) return;
  const rows = QUAL_COMPARE?.rows || [];
  if (!rows.length) {
    meta.textContent = '';
    box.innerHTML = '<p class="text-sm text-slate-400">비교 데이터가 없습니다.</p>';
    return;
  }

  const companies = QUAL_COMPARE?.companies?.length
    ? QUAL_COMPARE.companies
    : Object.keys(rows[0]?.values || {});
  const src = QUAL_COMPARE?.source === 'gemini' ? 'Gemini' : 'Rule';
  meta.textContent = `업데이트: ${fmtDate(QUAL_COMPARE?.generated_at)} · 소스: ${src}${QUAL_COMPARE?.cached ? ' (cache)' : ''}`;

  let html = '<table class="w-full text-sm border-separate border-spacing-0">';
  html += '<thead><tr>';
  html += '<th class="px-3 py-2 text-left border-b border-slate-800 text-slate-300">구분</th>';
  companies.forEach(c => {
    html += `<th class="px-3 py-2 text-center border-b border-slate-800"><span class="${pillCls(c)} badge-sm">${esc(c)}</span></th>`;
  });
  html += '</tr></thead><tbody>';

  rows.forEach(row => {
    html += '<tr>';
    html += `<td class="px-3 py-3 border-b border-slate-900"><p class="font-semibold">${esc(row.metric || '')}</p><p class="text-[11px] text-slate-400 mt-0.5">${esc(row.reason || '')}</p></td>`;
    companies.forEach(c => {
      html += `<td class="px-3 py-3 text-center border-b border-slate-900">${levelChip(row.values?.[c] || '-')}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';

  const summary = (QUAL_COMPARE?.summary || []).slice(0, 3);
  if (summary.length) {
    html += `<div class="mt-3 grid md:grid-cols-3 gap-2">${summary.map(s => `<div class="text-xs bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-300">${esc(s)}</div>`).join('')}</div>`;
  }
  box.innerHTML = html;
}

// ============ 카드사 비교 ============
function renderCompanyCards() {
  const cs = sortCompanies(OVERVIEW?.companies || [], 'company');
  document.getElementById('companyCards').innerHTML = cs.map(c => `
    <div class="section-card card-co ${coCls(c.company)}">
      <div class="flex items-center justify-between mb-3">
        <span class="${pillCls(c.company)} badge-sm">${esc(c.company)}</span>
        <span class="text-xs text-slate-500">평균 ${c.avg_benefit_score}</span>
      </div>
      <div class="grid grid-cols-4 gap-1 text-center mb-3">
        <div><div class="text-xs text-slate-500">수집</div><div class="font-bold">${c.collected_count}</div></div>
        <div><div class="text-xs text-slate-500">노출</div><div class="font-bold">${c.visible_count}</div></div>
        <div><div class="text-xs text-emerald-600">진행</div><div class="font-bold text-emerald-600">${c.active_count}</div></div>
        <div><div class="text-xs text-slate-400">종료</div><div class="font-bold text-slate-400">${c.ended_count}</div></div>
      </div>
      <div class="space-y-1 text-xs">
        <div class="flex justify-between"><span>추출률</span><span>${c.extraction_rate}%</span></div>
        <div class="h-1.5 bg-slate-200 rounded-full overflow-hidden"><div class="h-full bg-blue-500 rounded-full" style="width:${Math.min(100,c.extraction_rate)}%"></div></div>
        <div class="flex justify-between"><span>인사이트률</span><span>${c.insight_rate}%</span></div>
        <div class="h-1.5 bg-slate-200 rounded-full overflow-hidden"><div class="h-full bg-purple-500 rounded-full" style="width:${Math.min(100,c.insight_rate)}%"></div></div>
      </div>
      ${c.top_competitive_points.length ? '<div class="mt-2 flex flex-wrap gap-1">'+c.top_competitive_points.map(p=>'<span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">'+esc(p)+'</span>').join('')+'</div>' : ''}
    </div>
  `).join('');
}

function renderBenefitDist() {
  const cs = sortCompanies(OVERVIEW?.companies || [], 'company');
  if (!cs.length) return;
  new Chart(document.getElementById('chartBenefitDist'), {
    type: 'bar',
    data: {
      labels: cs.map(c => c.company),
      datasets: [
        {label:'높음', data: cs.map(c => c.benefit_level_dist['높음']||0), backgroundColor:'#059669'},
        {label:'중상', data: cs.map(c => c.benefit_level_dist['중상']||0), backgroundColor:'#2563eb'},
        {label:'보통', data: cs.map(c => c.benefit_level_dist['보통']||0), backgroundColor:'#64748b'},
        {label:'낮음', data: cs.map(c => c.benefit_level_dist['낮음']||0), backgroundColor:'#dc2626'},
      ]
    },
    options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}}, scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true}}}
  });
}

// ============ 혜택 벤치마크 ============
function renderBenchmark() {
  if (!BENCHMARK?.companies) return;
  const cos = sortCompanies(Object.entries(BENCHMARK.companies), e => e[0]);
  const labels = cos.map(([c]) => c);
  new Chart(document.getElementById('chartBenefitAmount'), {
    type: 'bar',
    data: {labels, datasets: [{label:'평균 혜택 금액(원)', data: cos.map(([,v]) => v.avg_amount), backgroundColor: labels.map(l => coColor(l))}]},
    options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
  });
  new Chart(document.getElementById('chartBenefitPct'), {
    type: 'bar',
    data: {labels, datasets: [{label:'평균 할인율(%)', data: cos.map(([,v]) => v.avg_pct), backgroundColor: labels.map(l => coColor(l))}]},
    options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
  });
  // 테이블
  document.getElementById('benchmarkTable').innerHTML = `
    <table class="w-full text-sm"><thead class="bg-slate-100"><tr><th class="px-3 py-2 text-left">카드사</th><th class="px-3 py-2">이벤트수</th><th class="px-3 py-2">평균금액</th><th class="px-3 py-2">최대금액</th><th class="px-3 py-2">평균할인율</th><th class="px-3 py-2">최대할인율</th></tr></thead>
    <tbody>${cos.map(([c,v]) => { const sh=c.includes('신한'); return `<tr class="border-t ${sh?'bg-blue-50/50':''}"><td class="px-3 py-2"><span class="${pillCls(c)} badge-sm">${esc(c)}</span></td><td class="px-3 py-2 text-center">${v.count}</td><td class="px-3 py-2 text-right">${(v.avg_amount||0).toLocaleString()}원</td><td class="px-3 py-2 text-right">${(v.max_amount||0).toLocaleString()}원</td><td class="px-3 py-2 text-center">${v.avg_pct||0}%</td><td class="px-3 py-2 text-center">${v.max_pct||0}%</td></tr>`; }).join('')}</tbody></table>`;
}

// ============ 전략 맵 ============
function renderHeatmap() {
  if (!STRATEGY?.heatmap) return;
  const hm = STRATEGY.heatmap;
  const companies = sortCompanies(Object.keys(hm));
  const allTags = new Set();
  companies.forEach(c => Object.keys(hm[c]).forEach(t => allTags.add(t)));
  const tags = [...allTags].sort();
  if (!tags.length) { document.getElementById('heatmapContainer').innerHTML='<p class="text-slate-400 text-sm">데이터 없음</p>'; return; }
  let html = '<table class="w-full text-xs"><thead><tr><th class="px-2 py-1 text-left">카드사</th>';
  tags.forEach(t => html += `<th class="px-2 py-1 text-center">${esc(t)}</th>`);
  html += '</tr></thead><tbody>';
  companies.forEach(c => {
    const sh = c.includes('신한');
    html += `<tr class="${sh?'bg-blue-50/50':''}"><td class="px-2 py-1"><span class="${pillCls(c)} badge-sm">${esc(c)}</span></td>`;
    tags.forEach(t => {
      const v = hm[c][t] || 0;
      const bg = v === 0 ? (sh?'#eff6ff':'#f8fafc') : v <= 2 ? '#dbeafe' : v <= 5 ? '#93c5fd' : '#3b82f6';
      const fg = v > 5 ? '#fff' : '#1e293b';
      html += `<td class="px-2 py-1 text-center font-bold" style="background:${bg};color:${fg}">${v||''}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  document.getElementById('heatmapContainer').innerHTML = html;
}

function renderTrends() {
  if (!TRENDS?.weeks) return;
  const weeks = Object.entries(TRENDS.weeks).sort((a,b) => a[0].localeCompare(b[0]));
  if (!weeks.length) return;
  new Chart(document.getElementById('chartTrends'), {
    type: 'line',
    data: {
      labels: weeks.map(([w]) => w),
      datasets: [
        {label:'시작', data: weeks.map(([,v]) => v.started), borderColor:'#3b82f6', tension:.3},
        {label:'종료', data: weeks.map(([,v]) => v.ended), borderColor:'#ef4444', tension:.3},
      ]
    },
    options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}}}
  });
}

// ============ 비교 매트릭스 (FR-4) ============
async function loadCompareMatrix() {
  const el = document.getElementById('compareMatrixContainer');
  if (!el) return;
  const axis = (document.getElementById('matrixAxis') || {}).value || 'category';
  el.innerHTML = '<p class="text-slate-400 text-xs">로딩 중...</p>';
  try {
    const r = await fetch('/api/analytics/compare-matrix?axis=' + axis);
    if (!r.ok) throw new Error('API 오류');
    const d = await r.json();
    renderCompareMatrix(d, el);
  } catch (e) { el.innerHTML = '<p class="text-rose-500 text-xs">매트릭스 로드 실패</p>'; }
}

function renderCompareMatrix(d, el) {
  const hm = d.heatmap || {};
  const companies = sortCompanies(Object.keys(hm));
  const allVals = new Set();
  companies.forEach(c => Object.keys(hm[c]||{}).forEach(v => allVals.add(v)));
  const vals = [...allVals].sort();
  if (!vals.length || !companies.length) { el.innerHTML = '<p class="text-slate-400 text-xs">데이터 없음</p>'; return; }
  let html = '<table class="w-full text-xs"><thead><tr><th class="px-2 py-1.5 text-left sticky left-0 bg-white z-10">카드사</th>';
  vals.forEach(v => html += `<th class="px-2 py-1.5 text-center">${esc(v)}</th>`);
  html += '</tr></thead><tbody>';
  companies.forEach(c => {
    const sh = c.includes('신한');
    html += `<tr class="${sh?'bg-blue-50':''}"><td class="px-2 py-1.5 sticky left-0 z-10 ${sh?'bg-blue-50':'bg-white'}"><span class="${pillCls(c)} badge-sm">${esc(c)}</span></td>`;
    vals.forEach(v => {
      const cnt = (hm[c]||{})[v] || 0;
      const bg = cnt === 0 ? '' : cnt <= 2 ? 'bg-blue-100' : cnt <= 5 ? 'bg-blue-200' : 'bg-blue-400 text-white';
      html += `<td class="px-2 py-1.5 text-center font-bold ${bg}">${cnt||'-'}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

// ============ 신한 갭 뷰 (FR-6) ============
async function loadShinhanGap() {
  const el = document.getElementById('shinhanGapView');
  if (!el) return;
  try {
    const r = await fetch('/api/analytics/shinhan-gap');
    if (!r.ok) throw new Error('API 오류');
    const d = await r.json();
    renderShinhanGap(d, el);
  } catch (e) { el.innerHTML = '<p class="text-rose-500 text-xs">갭 분석 로드 실패</p>'; }
}

function renderShinhanGap(d, el) {
  const gaps = d.gaps || [];
  if (!gaps.length) {
    el.innerHTML = '<div class="text-emerald-600 text-xs font-medium p-3 bg-emerald-50 rounded-lg">현재 진행중 이벤트 기준, 신한 미대응 카테고리가 없습니다.</div>';
    return;
  }
  let html = `<p class="text-xs text-slate-500 mb-3">신한 활성 ${d.shinhan_active||0}건 / 전체 활성 ${d.total_active||0}건 기준</p>`;
  html += '<div class="space-y-3">';
  gaps.forEach(g => {
    html += `<div class="border border-amber-200 rounded-lg p-3 bg-amber-50/50">`;
    html += `<div class="flex justify-between items-center mb-2"><span class="font-bold text-amber-800 text-sm">${esc(g.category)}</span><span class="badge-sm bg-amber-200 text-amber-800">경쟁 ${g.competitor_count}건</span></div>`;
    html += '<div class="space-y-1">';
    (g.competitor_events || []).slice(0, 5).forEach(e => {
      html += `<div class="flex items-center gap-2 text-xs cursor-pointer hover:bg-amber-100 rounded px-1.5 py-1" onclick="openDetail(${e.id})">`;
      html += `<span class="${pillCls(e.company)} badge-sm">${esc((e.company||'').replace('카드',''))}</span>`;
      html += `<span class="text-slate-700 truncate">${esc(getEventDisplayTitle(e, 40))}</span>`;
      html += `<span class="text-slate-400 ml-auto text-[11px] shrink-0">${esc(getEventDisplayBenefit(e, 25))}</span>`;
      html += '</div>';
    });
    if (g.competitor_count > 5) html += `<p class="text-[11px] text-slate-400 pl-1">외 ${g.competitor_count - 5}건 더</p>`;
    html += '</div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// ============ 신한 공백 카테고리 주간 추세 ============
let _gapTrendChart = null;
async function loadGapTrend() {
  const canvas = document.getElementById('chartGapTrend');
  if (!canvas) return;
  try {
    const r = await fetch('/api/analytics/shinhan-gap-trend?weeks=8');
    if (!r.ok) return;
    const d = await r.json();
    if (_gapTrendChart) _gapTrendChart.destroy();
    _gapTrendChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: d.weeks || [],
        datasets: [
          {label: '공백 카테고리 수', data: d.gap_counts||[], borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,.1)', fill: true, tension: .3},
          {label: '신규 공백', data: d.new_gap_counts||[], borderColor: '#ef4444', borderDash: [4,3], tension: .3},
          {label: '해소된 공백', data: d.resolved_gap_counts||[], borderColor: '#10b981', borderDash: [4,3], tension: .3},
        ]
      },
      options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom',labels:{font:{size:11}}}}, scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}
    });
    const summary = document.getElementById('gapTrendSummary');
    if (summary && d.gap_counts?.length) {
      const latest = d.gap_counts[d.gap_counts.length-1];
      const prev = d.gap_counts.length > 1 ? d.gap_counts[d.gap_counts.length-2] : latest;
      const diff = latest - prev;
      const trend = diff > 0 ? `+${diff} 증가` : diff < 0 ? `${diff} 감소` : '변동 없음';
      const cats = (d.current_gaps||[]).slice(0,5).join(', ') || '없음';
      summary.textContent = `최신 주 공백 ${latest}개 (전주 대비 ${trend}) | 현재 공백: ${cats}`;
    }
  } catch(e) { console.error('gap trend', e); }
}

// ============ Gemini 텍스트 비교 (FR-5) ============
async function loadTextComparison() {
  const btn = document.getElementById('btnTextCompare');
  const el = document.getElementById('textCompareResult');
  if (!el) return;
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>분석 중...'; }
  el.innerHTML = '<p class="text-slate-400 text-xs">Gemini 분석 중... (최대 30초 소요)</p>';
  try {
    const r = await fetch('/api/analytics/text-comparison');
    if (!r.ok) throw new Error((await r.json().catch(()=>({}))).detail || 'API 오류');
    const d = await r.json();
    renderTextComparison(d, el);
  } catch (e) { el.innerHTML = '<p class="text-rose-500 text-xs">텍스트 비교 분석 실패: ' + esc(e.message) + '</p>'; }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-wand-magic-sparkles mr-1"></i>비교 분석 실행'; } }
}

function renderTextComparison(d, el) {
  const src = d.source === 'gemini' ? 'Gemini' : 'Rule';
  let html = `<p class="text-[11px] text-slate-400 mb-3">소스: ${src}${d.cached ? ' (cache)' : ''}</p>`;
  const common = d.common_patterns || [];
  const diff = d.differentiators || {};
  const cond = d.condition_patterns || [];
  if (common.length) {
    html += '<div class="mb-4"><h4 class="text-xs font-bold text-slate-700 mb-2"><i class="fas fa-equals mr-1 text-slate-400"></i>공통 패턴</h4>';
    html += '<div class="flex flex-wrap gap-1.5">' + common.map(p => `<span class="text-xs bg-slate-100 px-2 py-0.5 rounded">${esc(p)}</span>`).join('') + '</div></div>';
  }
  if (Object.keys(diff).length) {
    html += '<div class="mb-4"><h4 class="text-xs font-bold text-slate-700 mb-2"><i class="fas fa-not-equal mr-1 text-blue-400"></i>카드사별 차별 포인트</h4>';
    html += '<div class="grid sm:grid-cols-2 gap-2">';
    for (const [co, points] of Object.entries(diff)) {
      html += `<div class="border rounded-lg p-2"><span class="${pillCls(co)} badge-sm mb-1.5 inline-block">${esc(co)}</span>`;
      html += '<ul class="list-disc list-inside text-xs text-slate-600 space-y-0.5">' + (points||[]).map(p => `<li>${esc(p)}</li>`).join('') + '</ul></div>';
    }
    html += '</div></div>';
  }
  if (cond.length) {
    html += '<div class="mb-4"><h4 class="text-xs font-bold text-slate-700 mb-2"><i class="fas fa-list-check mr-1 text-amber-400"></i>고빈도 조건 패턴</h4>';
    html += '<div class="flex flex-wrap gap-1.5">' + cond.map(p => `<span class="text-xs bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">${esc(p)}</span>`).join('') + '</div></div>';
  }
  if (!common.length && !Object.keys(diff).length && !cond.length) {
    html += '<p class="text-slate-400 text-xs">분석 결과가 비어 있습니다. 추출된 이벤트가 충분한지 확인하세요.</p>';
  }
  el.innerHTML = html;
}

// ============ 이벤트 목록 ============
function isNeedsReview(e) {
  return Number(e?.needs_review || 0) > 0;
}

function isCurated(e) {
  return Number(e?.is_curated || 0) > 0;
}

function asPercentScore(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.min(100, Math.round(num * 100)));
}

function renderReviewControls(currentList) {
  const summaryEl = document.getElementById('reviewSummary');
  const onlyBtn = document.getElementById('btnReviewOnly');
  const resetBtn = document.getElementById('btnReviewReset');
  const reviewFilter = (document.getElementById('fReview') || {}).value || '';
  const reviewCount = ALL.filter(isNeedsReview).length;
  const curatedCount = ALL.filter(isCurated).length;
  const readyCount = ALL.filter(e => !isNeedsReview(e) && !isCurated(e)).length;

  if (summaryEl) {
    const parts = [
      `검수 필요 ${reviewCount}건`,
      `수동 확정 ${curatedCount}건`,
      `즉시 활용 ${readyCount}건`,
    ];
    if (Array.isArray(currentList)) {
      parts.push(`현재 ${currentList.length}건`);
    }
    summaryEl.textContent = parts.join(' · ');
  }

  if (onlyBtn) {
    const active = reviewFilter === 'needs_review';
    onlyBtn.className = `text-xs px-2.5 py-1 rounded-lg border ${active ? 'border-rose-300 bg-rose-100 text-rose-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`;
  }

  if (resetBtn) {
    resetBtn.classList.toggle('hidden', !reviewFilter);
  }
}

function focusReviewQueue() {
  const reviewEl = document.getElementById('fReview');
  if (!reviewEl) return;
  reviewEl.value = 'needs_review';
  EVT_PAGE = 1;
  renderEvents();
}

function resetReviewFilter() {
  const reviewEl = document.getElementById('fReview');
  if (!reviewEl) return;
  reviewEl.value = '';
  EVT_PAGE = 1;
  renderEvents();
}

function getFiltered() {
  let list = ALL.slice();
  const kw = (document.getElementById('searchKw').value||'').trim().toLowerCase();
  const co = document.getElementById('fCompany').value;
  const cat = document.getElementById('fCat').value;
  const st = document.getElementById('fStatus').value;
  const bt = (document.getElementById('fBenefitType')||{}).value || '';
  const ext = (document.getElementById('fExtracted')||{}).value || '';
  const tag = (document.getElementById('fTag')||{}).value || '';
  const review = (document.getElementById('fReview')||{}).value || '';
  if (co) list = list.filter(e => e.company === co);
  if (cat) list = list.filter(e => e.category === cat);
  if (st === 'active') list = list.filter(e => isActive(e));
  if (st === 'ended') list = list.filter(e => !isActive(e));
  if (bt) list = list.filter(e => (e.benefit_type||'') === bt);
  if (ext === 'done') list = list.filter(e => isExtracted(e));
  if (ext === 'pending') list = list.filter(e => !isExtracted(e));
  if (review === 'needs_review') list = list.filter(isNeedsReview);
  if (review === 'curated') list = list.filter(isCurated);
  if (review === 'ready') list = list.filter(e => !isNeedsReview(e) && !isCurated(e));
  if (tag) list = list.filter(e => {
    const ins = pjson(e.marketing_insights);
    const tags = (ins && ins.objective_tags) || [];
    return tags.includes(tag);
  });
  if (kw) list = list.filter(e => [e.title,e.benefit_value,e.company,e.category,e.benefit_type,e.review_reason].join(' ').toLowerCase().includes(kw));
  return list;
}

function renderEvents() {
  const list = getFiltered();
  const tbody = document.getElementById('eventsTbody');
  const empty = document.getElementById('eventsEmpty');
  const pagBar = document.getElementById('paginationBar');
  renderReviewControls(list);

  if (!list.length) { tbody.innerHTML=''; empty.classList.remove('hidden'); if(pagBar) pagBar.classList.add('hidden'); return; }
  empty.classList.add('hidden');
  if(pagBar) pagBar.classList.remove('hidden');

  // 페이지네이션 계산
  const totalPages = Math.max(1, Math.ceil(list.length / EVT_PAGE_SIZE));
  if (EVT_PAGE > totalPages) EVT_PAGE = totalPages;
  const start = (EVT_PAGE - 1) * EVT_PAGE_SIZE;
  const pageItems = list.slice(start, start + EVT_PAGE_SIZE);

  // 테이블 렌더링
  tbody.innerHTML = pageItems.map(e => {
    const ben = getEventDisplayBenefit(e, 60) || '—';
    const displayTitle = getEventDisplayTitle(e, 50);
    const extracted = isExtracted(e);
    const active = isActive(e);
    const extractBadge = extracted ? '<span class="badge-sm bg-emerald-100 text-emerald-700">추출 완료</span>' : '<span class="badge-sm bg-slate-200 text-slate-600">미완료</span>';
    const statusBadge = active ? '<span class="badge-sm bg-blue-100 text-blue-700">진행중</span>' : '<span class="badge-sm bg-slate-200 text-slate-500">종료</span>';
    const categoryTag = e.category ? `<span class="badge-sm bg-slate-100 text-slate-600">${esc(e.category)}</span>` : '';
    const benefitTypeTag = e.benefit_type && e.benefit_type !== '기타' ? `<span class="badge-sm bg-emerald-50 text-emerald-700">${esc(e.benefit_type)}</span>` : '';
    const reviewBadge = isNeedsReview(e)
      ? '<span class="badge-sm bg-rose-100 text-rose-700">검수 필요</span>'
      : (isCurated(e) ? '<span class="badge-sm bg-violet-100 text-violet-700">수동 확정</span>' : '');
    const reviewReason = isNeedsReview(e) && e.review_reason ? `<p class="mt-1 text-[11px] text-rose-600 truncate">${esc(e.review_reason)}</p>` : '';
    const chk = COMPARE_SET.has(e.id);
    return `<tr class="row-co ${coCls(e.company)} hover:opacity-90 cursor-pointer" onclick="openDetail(${e.id})">
      <td class="px-3 py-2" onclick="event.stopPropagation()"><input type="checkbox" class="accent-blue-600 chk-compare" data-eid="${e.id}" ${chk?'checked':''} onchange="toggleCompare(${e.id}, this.checked)"></td>
      <td class="px-3 py-2 text-center"><span class="${pillCls(e.company)} badge-sm">${coShort(e.company)}</span></td>
      <td class="px-3 py-2">
        <div class="font-medium text-slate-800">${esc(displayTitle)}</div>
        <div class="mt-1 flex flex-wrap gap-1">${[categoryTag, benefitTypeTag, reviewBadge].filter(Boolean).join('')}</div>
        ${reviewReason}
      </td>
      <td class="px-3 py-2 text-slate-600 max-w-[260px] truncate">${esc(ben)}</td>
      <td class="px-3 py-2 text-xs text-slate-500">${esc(e.period||'—')}</td>
      <td class="px-3 py-2">${extractBadge}</td>
      <td class="px-3 py-2">${statusBadge}</td>
      <td class="px-3 py-2"><a href="${e.url}" target="_blank" class="text-slate-400 hover:text-slate-600" onclick="event.stopPropagation()"><i class="fas fa-external-link-alt"></i></a></td>
    </tr>`;
  }).join('');

  // 페이지 정보
  const pageInfo = document.getElementById('pageInfo');
  if (pageInfo) pageInfo.textContent = `전체 ${list.length}건 중 ${start+1}-${Math.min(start+EVT_PAGE_SIZE, list.length)}건`;

  // 페이지 버튼
  const pagBtns = document.getElementById('pageButtons');
  if (pagBtns) {
    let bh = '';
    bh += `<button onclick="goPage(${EVT_PAGE-1})" class="px-2 py-1 rounded text-xs ${EVT_PAGE<=1?'text-slate-300 pointer-events-none':'text-slate-600 hover:bg-slate-200'}">&laquo;</button>`;
    const maxShow = 7;
    let ps = Math.max(1, EVT_PAGE - Math.floor(maxShow/2));
    let pe = Math.min(totalPages, ps + maxShow - 1);
    if (pe - ps + 1 < maxShow) ps = Math.max(1, pe - maxShow + 1);
    for (let i = ps; i <= pe; i++) {
      bh += `<button onclick="goPage(${i})" class="w-7 h-7 rounded text-xs font-medium ${i===EVT_PAGE?'bg-blue-600 text-white':'text-slate-600 hover:bg-slate-200'}">${i}</button>`;
    }
    bh += `<button onclick="goPage(${EVT_PAGE+1})" class="px-2 py-1 rounded text-xs ${EVT_PAGE>=totalPages?'text-slate-300 pointer-events-none':'text-slate-600 hover:bg-slate-200'}">&raquo;</button>`;
    pagBtns.innerHTML = bh;
  }
}

function goPage(p) {
  const list = getFiltered();
  const totalPages = Math.max(1, Math.ceil(list.length / EVT_PAGE_SIZE));
  if (p < 1 || p > totalPages) return;
  EVT_PAGE = p;
  renderEvents();
  // 테이블 상단으로 스크롤
  document.getElementById('eventsTbody')?.closest('.section-card')?.scrollIntoView({behavior:'smooth', block:'start'});
}

function changePageSize() {
  const sel = document.getElementById('pageSize');
  if (sel) EVT_PAGE_SIZE = parseInt(sel.value) || 30;
  EVT_PAGE = 1;
  renderEvents();
}

function populateFilters() {
  const cos = [...new Set(ALL.map(e => e.company))].filter(Boolean).sort();
  const cats = [...new Set(ALL.map(e => e.category))].filter(Boolean).sort();
  const bts = [...new Set(ALL.map(e => e.benefit_type))].filter(Boolean).sort();
  const allTags = new Set();
  ALL.forEach(e => { const ins = pjson(e.marketing_insights); ((ins && ins.objective_tags) || []).forEach(t => allTags.add(t)); });
  const tags = [...allTags].sort();
  document.getElementById('fCompany').innerHTML = '<option value="">전체 카드사</option>' + cos.map(c => `<option>${esc(c)}</option>`).join('');
  document.getElementById('fCat').innerHTML = '<option value="">전체 카테고리</option>' + cats.map(c => `<option>${esc(c)}</option>`).join('');
  const btEl = document.getElementById('fBenefitType');
  if (btEl) btEl.innerHTML = '<option value="">전체 혜택유형</option>' + bts.map(b => `<option>${esc(b)}</option>`).join('');
  const tagEl = document.getElementById('fTag');
  if (tagEl) tagEl.innerHTML = '<option value="">전체 태그</option>' + tags.map(t => `<option>${esc(t)}</option>`).join('');
}

// ============ 상세 모달 ============
async function openDetail(id) {
  CURRENT_ID = id;
  const md = document.getElementById('detailModal');
  md.style.display = 'flex';
  const ev = ALL.find(e => e.id === id) || {};
  document.getElementById('mdTitle').textContent = getEventDisplayTitle(ev) || '이벤트 상세';
  document.getElementById('mdSummary').textContent = ev.period || '';
  document.getElementById('mdNewTab').href = ev.url || '#';
  document.getElementById('mdFrame').src = ev.url || 'about:blank';
  switchDetailTab('iframe');

  // 편집 패널 렌더링
  renderEditPanel(ev);

  // intelligence API 호출
  document.getElementById('mp-intelligence').innerHTML = '<p class="text-slate-400">로딩 중…</p>';
  try {
    const r = await fetch(`/api/events/${id}/intelligence`);
    const d = await r.json();
    _currentLocked = d.locked || false;
    _currentSections = d.sections || [];
    updateLockUI();
    renderIntelligence(d);
    try { void loadRelatedCards(id); } catch (_) {}
  } catch { document.getElementById('mp-intelligence').innerHTML = '<p class="text-slate-400">로드 실패</p>'; }
}

function renderIntelligenceLegacy(d) {
  const ins = d.insight;
  const ev = d.event || {};
  const el = document.getElementById('mp-intelligence');
  if (!ins && !ev.period && !ev.benefit_value) {
    el.innerHTML = '<p class="text-slate-400">인사이트 없음. 「추출」 버튼을 눌러주세요.</p>';
    return;
  }
  let h = '';
  const infoBox = (icon, color, title, text) => text ? `<div class="bg-${color}-50 border border-${color}-200 rounded-lg p-3 mb-3"><p class="text-xs font-bold text-${color}-800 mb-1"><i class="fas fa-${icon} mr-1"></i>${title}</p><p class="text-${color}-900 leading-relaxed text-sm">${esc(text)}</p></div>` : '';
  const tagBlock = (label, tags, cls) => {
    if (!tags?.length) return '';
    return `<div class="mb-3"><span class="text-xs font-bold text-slate-500">${label}</span><div class="flex flex-wrap gap-1 mt-1">${tags.map(t=>`<span class="text-xs ${cls||'bg-slate-100'} px-2 py-0.5 rounded">${esc(t)}</span>`).join('')}</div></div>`;
  };

  // ── 1. 이벤트 핵심 요약 (추출 데이터 기반) ──
  const period = ev.period || '';
  const target = ev.target_segment || '';
  const benefit = getEventDisplayBenefit(ev, 100);
  const conditions = ev.conditions || '';
  const benefitType = ev.benefit_type || '';
  const category = ev.category || '';

  h += '<div class="border border-slate-200 rounded-xl p-4 mb-4 bg-gradient-to-r from-slate-50 to-white">';
  h += '<h4 class="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider"><i class="fas fa-clipboard-list mr-1.5 text-blue-500"></i>이벤트 핵심 요약</h4>';
  h += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">';
  // 기간
  h += `<div class="bg-white border border-slate-100 rounded-lg p-3">
    <div class="flex items-center gap-1.5 mb-1.5"><i class="fas fa-calendar-days text-blue-500 text-xs"></i><span class="text-[11px] font-bold text-slate-500">기간</span></div>
    <p class="text-sm font-medium text-slate-800">${period ? esc(period) : '<span class="text-slate-400">미추출</span>'}</p>
  </div>`;
  // 대상
  h += `<div class="bg-white border border-slate-100 rounded-lg p-3">
    <div class="flex items-center gap-1.5 mb-1.5"><i class="fas fa-users text-violet-500 text-xs"></i><span class="text-[11px] font-bold text-slate-500">대상</span></div>
    <p class="text-sm font-medium text-slate-800">${target ? esc(target.substring(0,80)) : '<span class="text-slate-400">미추출</span>'}</p>
  </div>`;
  // 내용 (혜택)
  h += `<div class="bg-white border border-slate-100 rounded-lg p-3">
    <div class="flex items-center gap-1.5 mb-1.5"><i class="fas fa-gift text-emerald-500 text-xs"></i><span class="text-[11px] font-bold text-slate-500">주요 혜택</span></div>
    <p class="text-sm font-medium text-slate-800">${benefit ? esc(benefit.substring(0,100)) : '<span class="text-slate-400">미추출</span>'}</p>
  </div>`;
  h += '</div>';
  // 조건 (있으면)
  if (conditions && conditions.length > 3) {
    h += `<div class="mt-3 bg-white border border-slate-100 rounded-lg p-3">
      <div class="flex items-center gap-1.5 mb-1.5"><i class="fas fa-list-check text-amber-500 text-xs"></i><span class="text-[11px] font-bold text-slate-500">참여 조건</span></div>
      <p class="text-xs text-slate-700 leading-relaxed">${esc(conditions.substring(0,200))}</p>
    </div>`;
  }
  // 카테고리 + 혜택 유형 태그
  if (category || benefitType) {
    h += '<div class="mt-2 flex flex-wrap gap-1.5">';
    if (category) h += `<span class="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded">${esc(category)}</span>`;
    if (benefitType && benefitType !== '기타') h += `<span class="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">${esc(benefitType)}</span>`;
    h += '</div>';
  }
  h += '</div>';

  // ── 2. AI 분석 결과 ──
  if (!ins) {
    h += '<p class="text-slate-400 text-sm">AI 분석이 아직 수행되지 않았습니다. 위 요약은 추출 데이터 기반입니다.</p>';
    h += `<div class="mt-4 pt-3 border-t"><button onclick="toggleExtractedText()" class="text-xs text-slate-500 hover:text-slate-700 font-medium"><i class="fas fa-file-lines mr-1"></i>이벤트 페이지에서 추출된 원문 보기</button><div id="extractedTextPanel" class="hidden mt-3"></div></div>`;
    el.innerHTML = h;
    return;
  }

  h += '<div class="border-t border-slate-200 pt-4 mt-1 mb-3"><h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider"><i class="fas fa-robot mr-1.5 text-violet-500"></i>AI 분석</h4></div>';

  // 신한 대응 제안
  h += infoBox('shield-halved', 'amber', '신한카드 대응 제안', ins.shinhan_response);
  // 마케팅 시사점
  h += infoBox('lightbulb', 'blue', '마케팅 인사이트', ins.marketing_takeaway);
  // 위협도
  if (ins.threat_level) {
    const tc = ins.threat_level === 'High' ? 'rose' : ins.threat_level === 'Mid' ? 'amber' : 'emerald';
    h += infoBox('exclamation-triangle', tc, '위협도: ' + ins.threat_level, ins.threat_reason);
  }

  // 핵심 지표
  h += '<div class="grid grid-cols-4 gap-2 mb-4 text-center">';
  const lvlColor = (lv) => lv==='높음'?'text-emerald-600':lv==='낮음'?'text-rose-600':'text-slate-700';
  h += `<div class="bg-slate-50 rounded-lg p-2"><div class="text-[11px] text-slate-500">혜택 수준</div><div class="font-bold ${lvlColor(ins.benefit_level)}">${esc(ins.benefit_level||'-')}</div></div>`;
  h += `<div class="bg-slate-50 rounded-lg p-2"><div class="text-[11px] text-slate-500">타겟 명확도</div><div class="font-bold">${esc(ins.target_clarity||'-')}</div></div>`;
  h += `<div class="bg-slate-50 rounded-lg p-2"><div class="text-[11px] text-slate-500">기간 유형</div><div class="font-bold">${esc(ins.event_duration_type||'-')}</div></div>`;
  h += `<div class="bg-slate-50 rounded-lg p-2"><div class="text-[11px] text-slate-500">소스</div><div class="font-bold text-xs">${esc(ins.source||'-')}</div></div>`;
  h += '</div>';

  // AI가 분석한 상세 (혜택/타겟/조건)
  if (ins.benefit_detail) h += `<div class="mb-3 text-sm"><span class="text-xs font-bold text-slate-500 block mb-1">AI 혜택 분석</span><p class="text-slate-700">${esc(ins.benefit_detail)}</p></div>`;
  if (ins.target_profile) h += `<div class="mb-3 text-sm"><span class="text-xs font-bold text-slate-500 block mb-1">AI 타겟 분석</span><p class="text-slate-700">${esc(ins.target_profile)}</p></div>`;
  if (ins.conditions_summary) h += `<div class="mb-3 text-sm"><span class="text-xs font-bold text-slate-500 block mb-1">AI 조건 분석</span><p class="text-slate-700 whitespace-pre-line">${esc(ins.conditions_summary)}</p></div>`;

  // 강점 vs 약점
  if (ins.competitive_points?.length || ins.weaknesses?.length) {
    h += '<div class="grid grid-cols-2 gap-3 mb-4">';
    if (ins.competitive_points?.length) {
      h += '<div><span class="text-xs font-bold text-emerald-700 block mb-1"><i class="fas fa-plus-circle mr-1"></i>경쟁 우위</span><ul class="space-y-1 text-xs text-slate-700">' + ins.competitive_points.map(p=>`<li class="flex items-start gap-1"><span class="text-emerald-500 mt-0.5">+</span>${esc(p)}</li>`).join('') + '</ul></div>';
    }
    if (ins.weaknesses?.length) {
      h += '<div><span class="text-xs font-bold text-rose-700 block mb-1"><i class="fas fa-minus-circle mr-1"></i>약점/제약</span><ul class="space-y-1 text-xs text-slate-700">' + ins.weaknesses.map(p=>`<li class="flex items-start gap-1"><span class="text-rose-500 mt-0.5">-</span>${esc(p)}</li>`).join('') + '</ul></div>';
    }
    h += '</div>';
  }

  // 태그
  h += tagBlock('프로모션 전략', ins.promo_strategies, 'bg-blue-50 text-blue-700');
  h += tagBlock('목적 태그', ins.objective_tags);
  h += tagBlock('타겟 태그', ins.target_tags);
  h += tagBlock('채널 태그', ins.channel_tags);

  // 추출 원문 보기 버튼
  h += `<div class="mt-4 pt-3 border-t"><button onclick="toggleExtractedText()" class="text-xs text-slate-500 hover:text-slate-700 font-medium"><i class="fas fa-file-lines mr-1"></i>이벤트 페이지에서 추출된 원문 보기</button><div id="extractedTextPanel" class="hidden mt-3"></div></div>`;

  el.innerHTML = h;
}

function renderIntelligence(d) {
  const ins = d.insight;
  const ev = d.event || {};
  const quality = d.quality || {};
  const classification = d.classification || {};
  const reason = pjson(classification.reason) || classification.reason || {};
  const conditionFlags = pjson(classification.condition_flags) || classification.condition_flags || {};
  const el = document.getElementById('mp-intelligence');
  const hasSummary = !!(ev.period || ev.benefit_value || ev.conditions || ev.category || ev.benefit_type);
  const hasMeta = !!(
    quality.review_reason ||
    quality.detail_quality_score != null ||
    quality.needs_review ||
    quality.is_curated ||
    classification.confidence != null ||
    classification.source ||
    Object.keys(reason).length ||
    Object.keys(conditionFlags).length
  );

  if (!ins && !hasSummary && !hasMeta) {
    el.innerHTML = '<p class="text-slate-400">인사이트 없음. 「추출」 버튼을 눌러주세요.</p>';
    return;
  }

  let h = '';
  const infoBox = (icon, color, title, text) => text ? `<div class="bg-${color}-50 border border-${color}-200 rounded-lg p-3 mb-3"><p class="text-xs font-bold text-${color}-800 mb-1"><i class="fas fa-${icon} mr-1"></i>${title}</p><p class="text-${color}-900 leading-relaxed text-sm">${esc(text)}</p></div>` : '';
  const tagBlock = (label, tags, cls) => {
    if (!tags?.length) return '';
    return `<div class="mb-3"><span class="text-xs font-bold text-slate-500">${label}</span><div class="flex flex-wrap gap-1 mt-1">${tags.map(t => `<span class="text-xs ${cls || 'bg-slate-100'} px-2 py-0.5 rounded">${esc(t)}</span>`).join('')}</div></div>`;
  };
  const toneMap = {
    rose: {wrap: 'bg-rose-50 border-rose-200', value: 'text-rose-700', sub: 'text-rose-600'},
    amber: {wrap: 'bg-amber-50 border-amber-200', value: 'text-amber-700', sub: 'text-amber-600'},
    emerald: {wrap: 'bg-emerald-50 border-emerald-200', value: 'text-emerald-700', sub: 'text-emerald-600'},
    blue: {wrap: 'bg-blue-50 border-blue-200', value: 'text-blue-700', sub: 'text-blue-600'},
    sky: {wrap: 'bg-sky-50 border-sky-200', value: 'text-sky-700', sub: 'text-sky-600'},
    violet: {wrap: 'bg-violet-50 border-violet-200', value: 'text-violet-700', sub: 'text-violet-600'},
    slate: {wrap: 'bg-slate-50 border-slate-200', value: 'text-slate-700', sub: 'text-slate-500'},
  };
  const metricCard = (label, value, tone = 'slate', sub = '') => {
    const picked = toneMap[tone] || toneMap.slate;
    return `<div class="rounded-lg border ${picked.wrap} p-3">
      <div class="text-[11px] font-bold text-slate-500 mb-1">${esc(label)}</div>
      <div class="text-sm font-semibold ${picked.value}">${esc(value || '-')}</div>
      ${sub ? `<div class="text-[11px] ${picked.sub} mt-1 leading-relaxed">${esc(sub)}</div>` : ''}
    </div>`;
  };
  const toneForScore = (score, primary = 'blue') => {
    if (score == null) return 'slate';
    if (score >= 80) return primary;
    if (score >= 60) return 'amber';
    return 'rose';
  };
  const sourceLabel = (source) => {
    if (source === 'manual') return '수동 확정';
    if (source === 'rule+gemini') return '규칙 + Gemini';
    if (source === 'rule') return '규칙';
    return source || '미정';
  };
  const renderRuleCard = (label, value, payload, tone = 'slate') => {
    const matchedTerms = payload?.matched_terms || [];
    const ruleName = payload?.rule_name || '';
    if (!value && !ruleName && !matchedTerms.length) return '';
    const picked = toneMap[tone] || toneMap.slate;
    const ruleLabel = ruleName && ruleName !== 'default' ? `규칙: ${ruleName}` : '기본값';
    return `<div class="rounded-lg border ${picked.wrap} p-3">
      <div class="flex items-center justify-between gap-2 mb-2">
        <span class="text-xs font-bold text-slate-500">${esc(label)}</span>
        <span class="text-[11px] ${picked.sub}">${esc(ruleLabel)}</span>
      </div>
      <div class="text-sm font-semibold ${picked.value}">${esc(value || '-')}</div>
      ${matchedTerms.length ? `<div class="flex flex-wrap gap-1 mt-2">${matchedTerms.map(term => `<span class="text-[11px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">${esc(term)}</span>`).join('')}</div>` : '<div class="text-[11px] text-slate-400 mt-2">명시적 매칭어 없음</div>'}
    </div>`;
  };
  const renderTagReasonGroup = (label, items) => {
    if (!items?.length) return '';
    return `<div class="mb-3">
      <span class="text-xs font-bold text-slate-500">${esc(label)}</span>
      <div class="mt-2 flex flex-wrap gap-2">
        ${items.map(item => `
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 min-w-[120px]">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-semibold text-slate-800">${esc(item.value || '')}</span>
              <span class="text-[11px] text-slate-400">${esc(item.rule_name || 'rule')}</span>
            </div>
            ${(item.matched_terms || []).length ? `<div class="flex flex-wrap gap-1 mt-1">${item.matched_terms.map(term => `<span class="text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">${esc(term)}</span>`).join('')}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>`;
  };
  const conditionChips = (() => {
    const chips = [];
    if (conditionFlags.requires_enrollment) chips.push('응모/등록 필요');
    if (conditionFlags.first_come_first_served) chips.push('선착순 가능');
    if (conditionFlags.monthly_cap) chips.push('월 한도');
    if (conditionFlags.limit_per_person) chips.push('1인 한정');
    if (conditionFlags.card_specific) chips.push('카드 보유 조건');
    if (conditionFlags.app_only) chips.push('앱 전용');
    const minSpend = Number(conditionFlags.min_spend_amount_won);
    if (Number.isFinite(minSpend) && minSpend > 0) chips.push(`최소 결제 ${Math.round(minSpend).toLocaleString('ko-KR')}원`);
    const maxBenefit = Number(conditionFlags.max_benefit_amount_won);
    if (Number.isFinite(maxBenefit) && maxBenefit > 0) chips.push(`최대 혜택 ${Math.round(maxBenefit).toLocaleString('ko-KR')}원`);
    const benefitPct = Number(conditionFlags.benefit_pct);
    if (Number.isFinite(benefitPct) && benefitPct > 0) chips.push(`혜택 비율 ${benefitPct}%`);
    return chips;
  })();
  const qualityScore = asPercentScore(quality.detail_quality_score);
  const confidenceScore = asPercentScore(classification.confidence);
  const reviewState = quality.needs_review ? '검수 필요' : (quality.is_curated ? '수동 확정' : '즉시 활용 가능');
  const reviewTone = quality.needs_review ? 'rose' : (quality.is_curated ? 'violet' : 'emerald');
  const extractedTextToggle = `<div class="mt-4 pt-3 border-t"><button onclick="toggleExtractedText()" class="text-xs text-slate-500 hover:text-slate-700 font-medium"><i class="fas fa-file-lines mr-1"></i>이벤트 페이지에서 추출한 원문 보기</button><div id="extractedTextPanel" class="hidden mt-3"></div></div>`;

  h += '<div class="border border-slate-200 rounded-xl p-4 mb-4 bg-white">';
  h += '<h4 class="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider"><i class="fas fa-circle-check mr-1.5 text-emerald-500"></i>검수 및 분류 상태</h4>';
  h += '<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">';
  h += metricCard('검수 상태', reviewState, reviewTone, quality.review_reason || '');
  h += metricCard('상세 품질', qualityScore != null ? `${qualityScore}점` : '미평가', toneForScore(qualityScore, 'emerald'), qualityScore != null ? '추출 completeness 기준' : '');
  h += metricCard('분류 신뢰도', confidenceScore != null ? `${confidenceScore}%` : '미평가', toneForScore(confidenceScore, 'blue'), classification.source ? sourceLabel(classification.source) : '');
  h += metricCard('분류 출처', sourceLabel(classification.source), classification.source === 'manual' ? 'violet' : classification.source === 'rule+gemini' ? 'amber' : 'slate', reason.manual_override ? '수동 수정 반영' : reason.gemini_override?.category ? `Gemini 보정: ${reason.gemini_override.category}` : '');
  h += '</div>';
  h += '</div>';

  if (quality.review_reason) {
    h += infoBox('triangle-exclamation', 'rose', '검수 이유', quality.review_reason);
  }

  const period = ev.period || '';
  const target = ev.target_segment || '';
  const benefit = getEventDisplayBenefit(ev, 100);
  const conditions = ev.conditions || '';
  const benefitType = ev.benefit_type || '';
  const category = ev.category || '';

  h += '<div class="border border-slate-200 rounded-xl p-4 mb-4 bg-gradient-to-r from-slate-50 to-white">';
  h += '<h4 class="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider"><i class="fas fa-clipboard-list mr-1.5 text-blue-500"></i>이벤트 핵심 요약</h4>';
  h += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">';
  h += `<div class="bg-white border border-slate-100 rounded-lg p-3">
    <div class="flex items-center gap-1.5 mb-1.5"><i class="fas fa-calendar-days text-blue-500 text-xs"></i><span class="text-[11px] font-bold text-slate-500">기간</span></div>
    <p class="text-sm font-medium text-slate-800">${period ? esc(period) : '<span class="text-slate-400">미추출</span>'}</p>
  </div>`;
  h += `<div class="bg-white border border-slate-100 rounded-lg p-3">
    <div class="flex items-center gap-1.5 mb-1.5"><i class="fas fa-users text-violet-500 text-xs"></i><span class="text-[11px] font-bold text-slate-500">대상</span></div>
    <p class="text-sm font-medium text-slate-800">${target ? esc(target.substring(0, 80)) : '<span class="text-slate-400">미추출</span>'}</p>
  </div>`;
  h += `<div class="bg-white border border-slate-100 rounded-lg p-3">
    <div class="flex items-center gap-1.5 mb-1.5"><i class="fas fa-gift text-emerald-500 text-xs"></i><span class="text-[11px] font-bold text-slate-500">주요 혜택</span></div>
    <p class="text-sm font-medium text-slate-800">${benefit ? esc(benefit.substring(0, 100)) : '<span class="text-slate-400">미추출</span>'}</p>
  </div>`;
  h += '</div>';
  if (conditions && conditions.length > 3) {
    h += `<div class="mt-3 bg-white border border-slate-100 rounded-lg p-3">
      <div class="flex items-center gap-1.5 mb-1.5"><i class="fas fa-list-check text-amber-500 text-xs"></i><span class="text-[11px] font-bold text-slate-500">참여 조건</span></div>
      <p class="text-xs text-slate-700 leading-relaxed">${esc(conditions.substring(0, 200))}</p>
    </div>`;
  }
  if (category || benefitType) {
    h += '<div class="mt-2 flex flex-wrap gap-1.5">';
    if (category) h += `<span class="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded">${esc(category)}</span>`;
    if (benefitType && benefitType !== '기타') h += `<span class="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">${esc(benefitType)}</span>`;
    h += '</div>';
  }
  h += '</div>';

  const categoryReasonCard = renderRuleCard('카테고리', category || reason.category?.category, reason.category, 'blue');
  const benefitReasonCard = renderRuleCard('혜택 유형', benefitType || reason.benefit_type?.benefit_type, reason.benefit_type, 'emerald');
  const tagReasonBlocks = [
    renderTagReasonGroup('타겟 태그 근거', reason.target_tags || []),
    renderTagReasonGroup('채널 태그 근거', reason.channel_tags || []),
    renderTagReasonGroup('전략 태그 근거', reason.strategy_tags || []),
  ].filter(Boolean).join('');

  if (categoryReasonCard || benefitReasonCard || tagReasonBlocks || conditionChips.length || reason.manual_override || reason.gemini_override?.category) {
    h += '<div class="border border-slate-200 rounded-xl p-4 mb-4 bg-white">';
    h += '<h4 class="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider"><i class="fas fa-diagram-project mr-1.5 text-blue-500"></i>분류 근거</h4>';
    h += '<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">';
    h += categoryReasonCard || '<div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-400">카테고리 규칙 근거 없음</div>';
    h += benefitReasonCard || '<div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-400">혜택 유형 규칙 근거 없음</div>';
    h += '</div>';
    h += tagReasonBlocks;
    if (reason.manual_override) {
      h += infoBox('pen-to-square', 'violet', '수동 확정', `${reason.editor || '운영자'}가 분류를 직접 수정했습니다.${reason.reason ? ` 사유: ${reason.reason}` : ''}`);
    }
    if (reason.gemini_override?.category) {
      h += infoBox('wand-magic-sparkles', 'amber', 'Gemini 보정', `카테고리를 ${reason.gemini_override.category}(으)로 보정했습니다.`);
    }
    if (conditionChips.length) {
      h += `<div class="mt-1"><span class="text-xs font-bold text-slate-500">조건 플래그</span><div class="flex flex-wrap gap-1.5 mt-2">${conditionChips.map(flag => `<span class="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded">${esc(flag)}</span>`).join('')}</div></div>`;
    }
    h += '</div>';
  }

  if (!ins) {
    h += '<p class="text-slate-400 text-sm">AI 분석은 아직 수행되지 않았습니다. 위 요약과 분류 근거는 추출 데이터 기반입니다.</p>';
    h += extractedTextToggle;
    el.innerHTML = h;
    return;
  }

  h += '<div class="border-t border-slate-200 pt-4 mt-1 mb-3"><h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider"><i class="fas fa-robot mr-1.5 text-violet-500"></i>AI 분석</h4></div>';
  h += infoBox('shield-halved', 'amber', '신한카드 대응 제안', ins.shinhan_response);
  h += infoBox('lightbulb', 'blue', '마케팅 인사이트', ins.marketing_takeaway);
  if (ins.threat_level) {
    const tc = ins.threat_level === 'High' ? 'rose' : ins.threat_level === 'Mid' ? 'amber' : 'emerald';
    h += infoBox('exclamation-triangle', tc, '위협도 ' + ins.threat_level, ins.threat_reason);
  }

  h += '<div class="grid grid-cols-4 gap-2 mb-4 text-center">';
  const lvlColor = (lv) => lv === '높음' ? 'text-emerald-600' : lv === '낮음' ? 'text-rose-600' : 'text-slate-700';
  h += `<div class="bg-slate-50 rounded-lg p-2"><div class="text-[11px] text-slate-500">혜택 수준</div><div class="font-bold ${lvlColor(ins.benefit_level)}">${esc(ins.benefit_level || '-')}</div></div>`;
  h += `<div class="bg-slate-50 rounded-lg p-2"><div class="text-[11px] text-slate-500">타겟 명확도</div><div class="font-bold">${esc(ins.target_clarity || '-')}</div></div>`;
  h += `<div class="bg-slate-50 rounded-lg p-2"><div class="text-[11px] text-slate-500">기간 유형</div><div class="font-bold">${esc(ins.event_duration_type || '-')}</div></div>`;
  h += `<div class="bg-slate-50 rounded-lg p-2"><div class="text-[11px] text-slate-500">소스</div><div class="font-bold text-xs">${esc(ins.source || '-')}</div></div>`;
  h += '</div>';

  if (ins.benefit_detail) h += `<div class="mb-3 text-sm"><span class="text-xs font-bold text-slate-500 block mb-1">AI 혜택 분석</span><p class="text-slate-700">${esc(ins.benefit_detail)}</p></div>`;
  if (ins.target_profile) h += `<div class="mb-3 text-sm"><span class="text-xs font-bold text-slate-500 block mb-1">AI 타겟 분석</span><p class="text-slate-700">${esc(ins.target_profile)}</p></div>`;
  if (ins.conditions_summary) h += `<div class="mb-3 text-sm"><span class="text-xs font-bold text-slate-500 block mb-1">AI 조건 분석</span><p class="text-slate-700 whitespace-pre-line">${esc(ins.conditions_summary)}</p></div>`;

  if (ins.competitive_points?.length || ins.weaknesses?.length) {
    h += '<div class="grid grid-cols-2 gap-3 mb-4">';
    if (ins.competitive_points?.length) {
      h += '<div><span class="text-xs font-bold text-emerald-700 block mb-1"><i class="fas fa-plus-circle mr-1"></i>경쟁 우위</span><ul class="space-y-1 text-xs text-slate-700">' + ins.competitive_points.map(p => `<li class="flex items-start gap-1"><span class="text-emerald-500 mt-0.5">+</span>${esc(p)}</li>`).join('') + '</ul></div>';
    }
    if (ins.weaknesses?.length) {
      h += '<div><span class="text-xs font-bold text-rose-700 block mb-1"><i class="fas fa-minus-circle mr-1"></i>약점/제약</span><ul class="space-y-1 text-xs text-slate-700">' + ins.weaknesses.map(p => `<li class="flex items-start gap-1"><span class="text-rose-500 mt-0.5">-</span>${esc(p)}</li>`).join('') + '</ul></div>';
    }
    h += '</div>';
  }

  h += tagBlock('프로모션 전략', ins.promo_strategies, 'bg-blue-50 text-blue-700');
  h += tagBlock('목적 태그', ins.objective_tags);
  h += tagBlock('타겟 태그', ins.target_tags);
  h += tagBlock('채널 태그', ins.channel_tags);
  h += extractedTextToggle;

  el.innerHTML = h;
}

function renderSections(sections) {
  const el = document.getElementById('mp-sections');
  if (!sections.length) { el.innerHTML = '<p class="text-slate-400">추출된 섹션 없음</p>'; return; }
  const icons = {'혜택_상세':'gift','참여방법':'clipboard-list','유의사항':'exclamation-triangle','제한사항':'ban','파트너십':'handshake','마케팅_메시지':'bullhorn','타겟_고객':'users','혜택_금액':'won-sign','혜택_비율':'percent'};
  const grouped = {};
  sections.forEach(s => { (grouped[s.type] = grouped[s.type]||[]).push(s.content); });
  let h = '';
  for (const [type, items] of Object.entries(grouped)) {
    const ico = icons[type] || 'info-circle';
    h += `<div class="mb-4"><h4 class="text-sm font-bold text-slate-700 mb-1"><i class="fas fa-${ico} mr-1 text-slate-400"></i>${esc(type)}</h4><ul class="list-disc list-inside text-sm text-slate-600 space-y-0.5">`;
    items.forEach(i => h += `<li>${esc(i)}</li>`);
    h += '</ul></div>';
  }
  el.innerHTML = h;
}

function setIframeZoom(scale) {
  const wrap = document.getElementById('iframeZoomWrap');
  if (!wrap) return;
  const inv = Math.round((1/scale)*100*10)/10; // inverse percentage for width/height
  wrap.style.transform = `scale(${scale})`;
  wrap.style.width = inv + '%';
  wrap.style.height = inv + '%';
  // 버튼 활성 상태
  const btn100 = document.getElementById('zoomBtn100');
  const btn85 = document.getElementById('zoomBtn85');
  if (btn100 && btn85) {
    const base = 'px-1.5 py-0.5 rounded border ';
    btn100.className = base + (scale===1 ? 'border-blue-400 bg-blue-50 text-blue-700 font-bold' : 'border-slate-300 hover:bg-slate-200 text-slate-400');
    btn85.className = base + (scale<1 ? 'border-blue-400 bg-blue-50 text-blue-700 font-bold' : 'border-slate-300 hover:bg-slate-200 text-slate-400');
  }
}

function closeModal() {
  document.getElementById('mdFrame').src = 'about:blank';
  document.getElementById('detailModal').style.display = 'none';
  document.getElementById('sidePanel')?.classList.remove('open');
  document.getElementById('sidePanelOverlay')?.classList.remove('open');
  switchDetailTab('iframe');
  CURRENT_ID = null;
}

async function extractOne() {
  if (!CURRENT_ID) return;
  const btn = document.getElementById('mdExtractBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>추출 중…';
  try {
    const r = await fetch(`/api/events/${CURRENT_ID}/extract-detail`, {method:'POST'});
    if (!r.ok) throw new Error((await r.json().catch(()=>({}))).detail || '실패');
    await loadAll();
    await openDetail(CURRENT_ID);
  } catch(e) { alert('추출 실패: '+e.message); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt mr-1"></i>추출'; }
}

// ============ 추출 텍스트 인라인 표시 ============
let _currentSections = [];

function toggleExtractedText() {
  const panel = document.getElementById('extractedTextPanel');
  if (!panel) return;
  if (!panel.classList.contains('hidden')) { panel.classList.add('hidden'); return; }
  panel.classList.remove('hidden');
  if (!_currentSections.length) { panel.innerHTML = '<p class="text-slate-400 text-xs">추출된 섹션 없음</p>'; return; }
  const icons = {'혜택_상세':'gift','참여방법':'clipboard-list','유의사항':'exclamation-triangle','제한사항':'ban','파트너십':'handshake','마케팅_메시지':'bullhorn','타겟_고객':'users','혜택_금액':'won-sign','혜택_비율':'percent'};
  const grouped = {};
  _currentSections.forEach(s => { (grouped[s.type] = grouped[s.type]||[]).push(s.content); });
  let h = '';
  for (const [type, items] of Object.entries(grouped)) {
    const ico = icons[type] || 'info-circle';
    h += `<div class="mb-3"><h4 class="text-xs font-bold text-slate-600 mb-1"><i class="fas fa-${ico} mr-1 text-slate-400"></i>${esc(type)}</h4><ul class="list-disc list-inside text-xs text-slate-600 space-y-0.5">`;
    items.forEach(i => h += `<li>${esc(i)}</li>`);
    h += '</ul></div>';
  }
  panel.innerHTML = h;
}

// ============ 수동 정정 (편집 / 잠금 / 이력) ============
let _currentLocked = false;

function renderEditPanel(ev) {
  const el = document.getElementById('mp-edit');
  if (!el) return;
  const fields = [
    {key:'title', label:'제목', type:'text'},
    {key:'period', label:'기간', type:'text'},
    {key:'benefit_value', label:'혜택', type:'text'},
    {key:'benefit_type', label:'혜택 유형', type:'text'},
    {key:'conditions', label:'조건', type:'textarea'},
    {key:'target_segment', label:'타겟', type:'text'},
    {key:'category', label:'카테고리', type:'text'},
  ];
  let h = '<form id="editForm" class="space-y-3">';
  fields.forEach(f => {
    const val = esc(ev[f.key] || '');
    if (f.type === 'textarea') {
      h += `<div><label class="text-xs font-bold text-slate-500 block mb-1">${f.label}</label><textarea name="${f.key}" class="w-full border rounded-lg px-3 py-1.5 text-sm" rows="2">${val}</textarea></div>`;
    } else {
      h += `<div><label class="text-xs font-bold text-slate-500 block mb-1">${f.label}</label><input name="${f.key}" value="${val}" class="w-full border rounded-lg px-3 py-1.5 text-sm"></div>`;
    }
  });
  h += '<div class="flex items-center gap-3 pt-2"><label class="text-xs text-slate-500">수정 사유 (선택)</label><input name="_reason" placeholder="사유 입력" class="flex-1 border rounded-lg px-3 py-1.5 text-sm"></div>';
  h += '<div class="flex gap-2 pt-3"><button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"><i class="fas fa-save mr-1"></i>저장</button><button type="button" onclick="showEditHistory()" class="text-slate-500 hover:text-slate-700 px-4 py-2 text-sm"><i class="fas fa-history mr-1"></i>변경 이력</button></div>';
  h += '</form><div id="editHistoryPanel" class="mt-4 hidden"></div>';
  el.innerHTML = h;
  document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveManualEdit(e.target);
  });
}

async function saveManualEdit(form) {
  if (!CURRENT_ID) return;
  const fd = new FormData(form);
  const fields = {};
  ['title','period','benefit_value','benefit_type','conditions','target_segment','category'].forEach(k => {
    const v = fd.get(k);
    if (v !== null) fields[k] = v;
  });
  const reason = fd.get('_reason') || '';
  try {
    const r = await fetch(`/api/events/${CURRENT_ID}/manual-update`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({fields, reason}),
    });
    const d = await r.json();
    if (!r.ok) { alert('저장 실패: ' + (d.detail || d.message)); return; }
    alert(d.message || '저장 완료');
    await loadAll();
    await openDetail(CURRENT_ID);
  } catch (e) { alert('저장 오류: ' + e.message); }
}

function toggleEditMode() {
  switchDetailTab('edit');
}

async function toggleLock() {
  if (!CURRENT_ID) return;
  try {
    const r = await fetch(`/api/events/${CURRENT_ID}/lock`, {method: 'POST'});
    const d = await r.json();
    _currentLocked = d.locked;
    updateLockUI();
    alert(d.message);
  } catch (e) { alert('잠금 오류: ' + e.message); }
}

function updateLockUI() {
  const btn = document.getElementById('mdLockBtn');
  if (!btn) return;
  if (_currentLocked) {
    btn.innerHTML = '<i class="fas fa-lock mr-1"></i>잠금 해제';
    btn.className = 'bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium';
  } else {
    btn.innerHTML = '<i class="fas fa-lock-open mr-1"></i>잠금';
    btn.className = 'bg-slate-500 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium';
  }
}

async function showEditHistory() {
  if (!CURRENT_ID) return;
  const panel = document.getElementById('editHistoryPanel');
  if (!panel) return;
  panel.classList.remove('hidden');
  panel.innerHTML = '<p class="text-slate-400 text-xs">로딩 중...</p>';
  try {
    const r = await fetch(`/api/events/${CURRENT_ID}/edit-history`);
    const history = await r.json();
    if (!history.length) { panel.innerHTML = '<p class="text-slate-400 text-xs">변경 이력 없음</p>'; return; }
    let h = '<h4 class="text-xs font-bold text-slate-700 mb-2"><i class="fas fa-history mr-1"></i>변경 이력</h4>';
    h += '<div class="space-y-2 max-h-60 overflow-y-auto">';
    history.forEach(item => {
      const at = item.edited_at ? item.edited_at.slice(0, 19).replace('T', ' ') : '';
      h += `<div class="text-xs border rounded-lg p-2 bg-slate-50">
        <div class="flex justify-between text-slate-500 mb-1"><span>${esc(item.field_name)}</span><span>${at} (${esc(item.editor||'')})</span></div>
        <div class="text-rose-600 line-through">${esc(item.old_value||'(비어있음)')}</div>
        <div class="text-emerald-700 font-medium">${esc(item.new_value||'(비어있음)')}</div>
        ${item.reason ? '<div class="text-slate-400 mt-1">사유: '+esc(item.reason)+'</div>' : ''}
      </div>`;
    });
    h += '</div>';
    panel.innerHTML = h;
  } catch (e) { panel.innerHTML = '<p class="text-rose-500 text-xs">이력 로드 실패</p>'; }
}

// ============ 추출 도움말 ============
function showExtractHelp() {
  const modal = document.getElementById('extractHelpModal');
  if (modal) modal.style.display = 'flex';
}
function closeExtractHelp() {
  const modal = document.getElementById('extractHelpModal');
  if (modal) modal.style.display = 'none';
}

// ============ 전체 추출 시작 + 실제 진행 경과 (폴링) ============
let _extractPollTimer = null;
let _extractHasSeenRunning = false;

// 수집 폴링용
let _ingestPollTimer = null;
let _ingestHasSeenRunning = false;

function showExtractProgress(show) {
  const wrap = document.getElementById('extractProgressWrap');
  const bar = document.getElementById('extractProgressBar');
  const text = document.getElementById('extractProgressText');
  const pct = document.getElementById('extractProgressPct');
  if (!wrap) return;
  if (show) {
    wrap.classList.remove('hidden');
    _extractHasSeenRunning = false;
    if (bar) bar.style.width = '0%';
    if (pct) pct.textContent = '대기';
    if (text) text.textContent = '준비 중…';
  } else {
    wrap.classList.add('hidden');
    if (_extractPollTimer) {
      clearInterval(_extractPollTimer);
      _extractPollTimer = null;
    }
  }
}

function updateExtractProgressFromApi(p) {
  const bar = document.getElementById('extractProgressBar');
  const text = document.getElementById('extractProgressText');
  const pct = document.getElementById('extractProgressPct');
  const total = p.total || 0;
  const processed = p.processed || 0;
  const succeeded = p.succeeded || 0;
  const failed = p.failed || 0;
  const running = p.running === true;

  // 이 진행 바는 「전체 추출」 전용. 전체 추출은 수집 없이 추출만 하므로, 실행 중에는 항상 추출 문구만 표시.
  if (running) {
    if (total > 0) {
      const percent = Math.min(100, Math.round((processed / total) * 100));
      if (bar) bar.style.width = percent + '%';
      if (pct) pct.textContent = processed + '/' + total;
      if (text) text.textContent = '추출 중 — 미추출 ' + total + '건 중 ' + processed + '개 완료 (성공 ' + succeeded + ', 실패 ' + failed + ')';
    } else {
      if (bar) bar.style.width = '0%';
      if (pct) pct.textContent = '0건';
      if (text) text.textContent = '추출 중 — 미추출 건수 확인 중…';
    }
  } else {
    if (p.phase === 'extract' && total > 0) {
      if (bar) bar.style.width = '100%';
      if (pct) pct.textContent = processed + '/' + total;
      if (text) text.textContent = '추출 중 — 미추출 ' + total + '건 중 ' + processed + '개 완료 (성공 ' + succeeded + ', 실패 ' + failed + ')';
    } else if (p.phase === 'extract') {
      if (bar) bar.style.width = '100%';
      if (pct) pct.textContent = '0건';
      if (text) text.textContent = '추출 중 — 미추출 이벤트 없음';
    } else {
      if (bar) bar.style.width = '0%';
      if (text) text.textContent = '추출 준비 중…';
      if (pct) pct.textContent = '대기';
    }
  }
}

async function pollExtractProgress() {
  try {
    const r = await fetch('/api/pipeline/progress');
    let p = {};
    try {
      p = r.ok ? await r.json() : {};
    } catch (_) { p = {}; }
    if (typeof p !== 'object') p = {};
    if (p.running === true) _extractHasSeenRunning = true;
    updateExtractProgressFromApi(p);
    if (p.running === false && _extractHasSeenRunning) {
      if (_extractPollTimer) {
        clearInterval(_extractPollTimer);
        _extractPollTimer = null;
      }
      const bar = document.getElementById('extractProgressBar');
      const text = document.getElementById('extractProgressText');
      const pct = document.getElementById('extractProgressPct');
      if (bar) bar.style.width = '100%';
      if (pct) pct.textContent = (p.processed || 0) + '/' + (p.total || 0);
      if (text) text.textContent = p.error ? '오류' : '완료';
      setTimeout(() => {
        showExtractProgress(false);
        onExtractComplete(p);
      }, 800);
    }
  } catch (e) {
    console.error('progress poll', e);
  }
}

function updateLastRunSummary(p) {
  const el = document.getElementById('lastRunSummary');
  if (!el) return;
  const last = p && p.last_finished;
  if (!last || !last.at) {
    el.classList.add('hidden');
    return;
  }
  const at = last.at.slice(0, 19).replace('T', ' ');
  const ing = last.ingest_result;
  const ext = last.extract_result || {};
  if (last.error) {
    el.textContent = '마지막 실행: ' + at + ' — 오류 발생';
    el.classList.remove('hidden');
    return;
  }
  const ingestPart = ing != null ? '수집 ' + (ing.ingested || 0) + '건, ' : '수집 생략, ';
  el.textContent = '마지막 실행: ' + at + ' — ' + ingestPart + '추출 ' + (ext.succeeded || 0) + '건 성공, ' + (ext.failed || 0) + '건 실패';
  el.classList.remove('hidden');
}

function updateLastIngestSummary(p) {
  const el = document.getElementById('lastIngestSummary');
  const headerEl = document.getElementById('headerLastIngest');
  const at = p && p.last_ingest_at;
  if (!at) {
    if (el) el.classList.add('hidden');
    if (headerEl) headerEl.classList.add('hidden');
    return;
  }
  const disp = at.slice(0, 19).replace('T', ' ');
  const res = p.last_ingest_result || {};
  const n = res.ingested != null ? res.ingested : 0;
  const txt = n > 0 ? '마지막 수집: ' + disp + ' (' + n + '건 신규)' : '마지막 수집: ' + disp;
  if (el) { el.textContent = txt; el.classList.remove('hidden'); }
  if (headerEl) { headerEl.textContent = '최종 이벤트 수집: ' + disp; headerEl.classList.remove('hidden'); }
}

function onExtractComplete(p) {
  const btn = document.getElementById('btnExtractAll');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-play mr-1"></i>전체 추출 시작';
  }
  updateLastRunSummary(p);
  updateLastIngestSummary(p);
  if (p.error) {
    alert('추출 실패: ' + p.error);
    return;
  }
  const ing = p.ingest_result;
  const ext = p.extract_result || {};
  const totalExt = (ext.processed || 0);
  const ingestPart = ing != null ? '수집 ' + (ing.ingested || 0) + '건 신규 · ' : '';
  let msg = ingestPart + '추출 ' + (ext.succeeded || 0) + '건 성공, ' + (ext.failed || 0) + '건 실패';
  if (totalExt === 0) msg = (ing != null ? '수집 ' + (ing.ingested || 0) + '건 완료. ' : '') + '상세 추출 대상 0건(미추출 이벤트 없음 또는 이미 모두 추출됨).';
  alert('전체 추출 완료\n' + msg);
  loadAll();
}

// ── 수집 진행 바 유틸 ───────────────────────────
function showIngestProgress(show) {
  const wrap = document.getElementById('ingestProgressWrap');
  const bar  = document.getElementById('ingestProgressBar');
  const text = document.getElementById('ingestProgressText');
  const pct  = document.getElementById('ingestProgressPct');
  if (!wrap) return;
  if (show) {
    wrap.classList.remove('hidden');
    _ingestHasSeenRunning = false;
    if (bar)  bar.style.width = '0%';
    if (pct)  pct.textContent = '대기';
    if (text) text.textContent = '수집 준비 중…';
  } else {
    wrap.classList.add('hidden');
    if (_ingestPollTimer) { clearInterval(_ingestPollTimer); _ingestPollTimer = null; }
  }
}

function updateIngestProgressFromApi(p) {
  const bar  = document.getElementById('ingestProgressBar');
  const text = document.getElementById('ingestProgressText');
  const pct  = document.getElementById('ingestProgressPct');
  const done  = p.ingest_done  || 0;
  const total = p.ingest_total || 0;
  const isIngest = p.running === true && p.phase === 'ingest';
  const isValidate = p.running === true && p.phase === 'validate';

  if (isIngest) {
    if (total > 0) {
      const percent = Math.min(100, Math.round((done / total) * 100));
      if (bar)  bar.style.width = percent + '%';
      if (pct)  pct.textContent = done + '/' + total + ' 카드사';
      if (text) text.textContent = '이벤트 수집 중 - ' + done + '/' + total + ' 카드사 완료';
    } else {
      if (bar)  bar.style.width = '0%';
      if (pct)  pct.textContent = '0';
      if (text) text.textContent = '이벤트 수집 중 - 카드사 수 확인 중…';
    }
  } else if (isValidate) {
    if (bar)  bar.style.width = '90%';
    if (pct)  pct.textContent = '검증';
    if (text) text.textContent = '삼성카드 이벤트 유효성 검증 중…';
  }
}

async function pollIngestProgress() {
  try {
    const r = await fetch('/api/pipeline/progress');
    let p = {};
    try { p = r.ok ? await r.json() : {}; } catch (_) { p = {}; }
    if (typeof p !== 'object') p = {};

    const isIngest = p.phase === 'ingest' || p.phase === 'validate';
    if (p.running === true && isIngest) _ingestHasSeenRunning = true;
    updateIngestProgressFromApi(p);

    // 수집 완료 감지
    if (p.running === false && _ingestHasSeenRunning) {
      if (_ingestPollTimer) { clearInterval(_ingestPollTimer); _ingestPollTimer = null; }
      const bar  = document.getElementById('ingestProgressBar');
      const text = document.getElementById('ingestProgressText');
      const pct  = document.getElementById('ingestProgressPct');
      const res  = p.ingest_result || p.last_ingest_result || {};
      const n    = res.ingested != null ? res.ingested : 0;
      const failedList = res.failed_companies || [];
      if (bar) bar.style.width = '100%';
      if (pct) pct.textContent = (p.ingest_done || p.ingest_total || 0) + '/' + (p.ingest_total || 0) + ' 카드사';
      if (text) {
        let msg = '수집 완료 - 신규 ' + n + '건 저장';
        if (failedList.length > 0) msg += ' (실패: ' + failedList.join(', ') + ')';
        const val = res.validated;
        if (val && val.removed > 0) msg += ' / 무효 ' + val.removed + '건 제거';
        text.textContent = msg;
      }
      setTimeout(() => {
        showIngestProgress(false);
        onIngestComplete(res);
      }, 2500);
    }
  } catch (e) {
    console.error('ingest progress poll', e);
  }
}

async function onIngestComplete(res) {
  const btn = document.getElementById('btnIngestOnly');
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download mr-1"></i>이벤트 수집'; }
  // 최신 progress 가져와서 수집 시각 갱신
  try {
    const pr = await fetch('/api/pipeline/progress');
    const p = pr.ok ? await pr.json() : {};
    updateLastIngestSummary(p);
  } catch (_) {}
  loadAll();
}

async function startIngestOnly() {
  const btn = document.getElementById('btnIngestOnly');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>수집 중…';
  }
  showIngestProgress(true);
  try {
    const r = await fetch('/api/pipeline/ingest', { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.started !== true) {
      showIngestProgress(false);
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download mr-1"></i>이벤트 수집'; }
      alert('수집 실패: ' + (d.detail || d.message || r.statusText));
      return;
    }
    // 백그라운드 폴링 시작
    _ingestPollTimer = setInterval(pollIngestProgress, 1000);
  } catch (e) {
    showIngestProgress(false);
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download mr-1"></i>이벤트 수집'; }
    alert('수집 실패: ' + (e.message || String(e)));
  }
}

// ── 삼성카드 유효성 검증 ───────────────────────────
let _validatePollTimer = null;

async function startValidation() {
  const btn = document.getElementById('btnValidate');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>검증 중…'; }

  const wrap = document.getElementById('validateProgressWrap');
  const bar  = document.getElementById('validateProgressBar');
  const text = document.getElementById('validateProgressText');
  const pct  = document.getElementById('validateProgressPct');
  if (wrap) wrap.classList.remove('hidden');
  if (bar) bar.style.width = '10%';
  if (text) text.textContent = '삼성카드 이벤트 유효성 검증 시작…';
  if (pct) pct.textContent = '';

  try {
    const r = await fetch('/api/pipeline/validate-samsung', { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.started !== true) {
      if (wrap) wrap.classList.add('hidden');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-shield-check mr-1"></i>삼성카드 유효성 검증'; }
      alert('검증 실패: ' + (d.message || d.detail || '시작 불가'));
      return;
    }
    _validatePollTimer = setInterval(pollValidation, 1500);
  } catch (e) {
    if (wrap) wrap.classList.add('hidden');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-shield-check mr-1"></i>삼성카드 유효성 검증'; }
    alert('검증 실패: ' + (e.message || String(e)));
  }
}

async function pollValidation() {
  try {
    const r = await fetch('/api/pipeline/progress');
    const p = r.ok ? await r.json() : {};

    const bar  = document.getElementById('validateProgressBar');
    const text = document.getElementById('validateProgressText');
    const pct  = document.getElementById('validateProgressPct');

    if (p.running && p.phase === 'validate') {
      if (bar) bar.style.width = '50%';
      if (text) text.textContent = '삼성카드 이벤트 URL 방문하여 유효성 확인 중…';
      if (pct) pct.textContent = '진행 중';
    }

    if (!p.running && p.phase !== 'validate') {
      if (_validatePollTimer) { clearInterval(_validatePollTimer); _validatePollTimer = null; }
      const res = (p.ingest_result || {}).validated || {};
      const removed = res.removed || 0;
      const kept = res.kept || 0;
      const checked = res.checked || 0;

      if (bar) bar.style.width = '100%';
      if (pct) pct.textContent = checked + '건 검사';
      if (text) text.textContent = '검증 완료 - ' + kept + '건 유지, ' + removed + '건 무효 제거';

      const btn = document.getElementById('btnValidate');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-shield-check mr-1"></i>삼성카드 유효성 검증'; }

      setTimeout(() => {
        const wrap = document.getElementById('validateProgressWrap');
        if (wrap) wrap.classList.add('hidden');
        if (removed > 0) loadAll();
      }, 3000);
    }
  } catch (e) {
    console.error('validate poll', e);
  }
}

async function loadCardProducts() {
  await loadAll();
}

function sanitizeProductFeeText(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/\b20\d{2}\s*\/\s*\d{1,2}\s*\/\s*\d{1,2}\b/.test(text)) return '';
  if (/^\d+(?:\s*\/\s*\d+)+$/.test(text)) return '';
  if (text.includes('/')) {
    const segments = text.split('/').map((segment) => segment.trim()).filter(Boolean);
    if (!segments.length) return '';
    if (segments.some((segment) => !/(원|만원|천원)/.test(segment))) return '';
  }
  if (!/(원|만원|천원)/.test(text)) return '';
  return text;
}

function normalizeProductBenefitText(value) {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/^[A-Z]\s+(?=[A-Za-z])/, '')
    .replace(/[|/,;:()\[\]<>-]+$/g, '')
    .trim();
  if (!text) return '';
  if (/^0+[만천]?\s*원/.test(text)) return '';
  if (/(할인한도|디자인함|슬로건|인벤토)/.test(text)) return '';
  if (!/\d/.test(text) && text.length < 5) return '';
  return text;
}

function normalizeProductCatalogItem(product) {
  const feeLabel = sanitizeProductFeeText(product?.annual_fee_display || product?.annual_fee || '');
  const spendLabel = String(product?.spend_requirement || '').trim();
  const benefits = Array.isArray(product?.benefit_highlights)
    ? product.benefit_highlights.map(normalizeProductBenefitText).filter(Boolean)
    : [];
  const summaryParts = [];
  if (benefits.length) summaryParts.push(benefits.slice(0, 3).join(' / '));
  if (feeLabel) summaryParts.push(`연회비 ${feeLabel}`);
  if (spendLabel) summaryParts.push(spendLabel);
  const preview = summaryParts[0] || String(product?.preview || '').trim();
  return {
    ...product,
    annual_fee_display: feeLabel,
    annual_fee: feeLabel || '',
    benefit_highlights: benefits,
    spend_requirement: spendLabel,
    summary_text: summaryParts.join(' | ') || String(product?.summary_text || '').trim(),
    preview,
    has_structured_summary: Boolean(benefits.length || feeLabel || spendLabel || product?.has_structured_summary),
  };
}

function isGenericProductListingUrl(url) {
  return Boolean(url) && (
    url.includes('/MOBFM12051R01.shc') ||
    url.includes('/HSHMCXCRSZZC0002') ||
    url.includes('/CPUUG2001_04.hc')
  );
}

function getProductPdfLink(product) {
  return product?.local_pdf_url || product?.pdf_url || '';
}

function getProductExternalLink(product) {
  if (!product?.url || isGenericProductListingUrl(product.url)) return '';
  return product.url;
}

function getProductFeeLabel(product) {
  return sanitizeProductFeeText(product?.annual_fee_display || product?.annual_fee || '') || '연회비 미확인';
}

function getProductSpendLabel(product) {
  return product?.spend_requirement || '전월실적 미확인';
}

function hasStructuredProductSummary(product) {
  return Boolean(
    product?.has_structured_summary ||
    (Array.isArray(product?.benefit_highlights) && product.benefit_highlights.length) ||
    product?.annual_fee_display ||
    product?.annual_fee ||
    product?.spend_requirement
  );
}

function getProductCategoryList(product) {
  return Array.isArray(product?.categories)
    ? product.categories.map(item => String(item || '').trim()).filter(Boolean)
    : [];
}

function getProductLaunchTimestamp(product) {
  const raw = product?.launch_date || product?.published_date || product?.collected_at || '';
  if (!raw) return 0;
  const parsed = typeof parseEventDate === 'function' ? parseEventDate(raw) : null;
  const date = parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : new Date(raw);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isRecentProduct(product, windowDays = 30) {
  const timestamp = getProductLaunchTimestamp(product);
  if (!timestamp) return false;
  return timestamp >= (Date.now() - windowDays * 24 * 60 * 60 * 1000);
}

function intersectItems(leftValues, rightValues, limit = 3) {
  const rightSet = new Set((rightValues || []).map(item => String(item || '').trim()).filter(Boolean));
  return (leftValues || [])
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index && rightSet.has(item))
    .slice(0, limit);
}

function getSortedProducts(items) {
  const compareText = (left, right, selector) =>
    String(selector(left) || '').localeCompare(String(selector(right) || ''), 'ko');
  const ranked = items.slice();
  ranked.sort((left, right) => {
    if (PRODUCT_ACTIVE_SORT === 'latest') {
      return getProductLaunchTimestamp(right) - getProductLaunchTimestamp(left)
        || compareText(left, right, item => item.card_name);
    }
    if (PRODUCT_ACTIVE_SORT === 'issuer') {
      return compareText(left, right, item => item.company)
        || compareText(left, right, item => item.card_name);
    }
    if (PRODUCT_ACTIVE_SORT === 'name') {
      return compareText(left, right, item => item.card_name);
    }

    const structuredDiff = Number(hasStructuredProductSummary(right)) - Number(hasStructuredProductSummary(left));
    if (structuredDiff) return structuredDiff;

    const spendDiff = Number(Boolean(right?.spend_requirement)) - Number(Boolean(left?.spend_requirement));
    if (spendDiff) return spendDiff;

    const pdfDiff = Number(Boolean(getProductPdfLink(right))) - Number(Boolean(getProductPdfLink(left)));
    if (pdfDiff) return pdfDiff;

    const benefitDiff = (right?.benefit_highlights?.length || 0) - (left?.benefit_highlights?.length || 0);
    if (benefitDiff) return benefitDiff;

    const latestDiff = getProductLaunchTimestamp(right) - getProductLaunchTimestamp(left);
    if (latestDiff) return latestDiff;

    return compareText(left, right, item => item.card_name);
  });
  return ranked;
}

function getProductCoverageStats() {
  return {
    total: PRODUCT_CATALOG.length,
    structured: PRODUCT_CATALOG.filter(item => hasStructuredProductSummary(item)).length,
    fee: PRODUCT_CATALOG.filter(item => Boolean(item?.annual_fee_display || item?.annual_fee)).length,
    spend: PRODUCT_CATALOG.filter(item => Boolean(item?.spend_requirement)).length,
    pdf: PRODUCT_CATALOG.filter(item => Boolean(getProductPdfLink(item))).length,
  };
}

function buildProductCompanyRowsFallback() {
  const rowMap = new Map();
  const ensureRow = (company) => {
    const key = company || '기타';
    if (!rowMap.has(key)) {
      rowMap.set(key, {
        company: key,
        active_events: 0,
        products: 0,
        products_with_pdf: 0,
        new_products_30d: 0,
        structured_products: 0,
        product_categories: new Set(),
        event_categories: new Set(),
      });
    }
    return rowMap.get(key);
  };

  PRODUCT_CATALOG.forEach(product => {
    const row = ensureRow(product.company);
    row.products += 1;
    if (getProductPdfLink(product)) row.products_with_pdf += 1;
    if (isRecentProduct(product)) row.new_products_30d += 1;
    if (hasStructuredProductSummary(product)) row.structured_products += 1;
    getProductCategoryList(product).forEach(category => row.product_categories.add(category));
  });

  ALL.forEach(event => {
    const row = ensureRow(event.company);
    if (isActive(event)) row.active_events += 1;
    if (event?.category) row.event_categories.add(String(event.category).trim());
  });

  return Array.from(rowMap.values())
    .map(row => ({
      company: row.company,
      active_events: row.active_events,
      products: row.products,
      products_with_pdf: row.products_with_pdf,
      new_products_30d: row.new_products_30d,
      structured_products: row.structured_products,
      shared_categories: intersectItems([...row.product_categories], [...row.event_categories], 4),
    }))
    .filter(row => row.products || row.active_events)
    .sort((left, right) =>
      (right.products + right.active_events * 2) - (left.products + left.active_events * 2)
      || String(left.company || '').localeCompare(String(right.company || ''), 'ko')
    );
}

function buildProductCategoryRowsFallback() {
  const rowMap = new Map();
  const ensureRow = (category) => {
    const key = category || '기타';
    if (!rowMap.has(key)) {
      rowMap.set(key, {
        category: key,
        event_count: 0,
        active_event_count: 0,
        product_count: 0,
        event_companies: new Set(),
        product_companies: new Set(),
        latest_event_at: 0,
        latest_product_at: 0,
      });
    }
    return rowMap.get(key);
  };

  PRODUCT_CATALOG.forEach(product => {
    const categories = getProductCategoryList(product);
    const appliedCategories = categories.length ? categories : ['기타'];
    appliedCategories.forEach(category => {
      const row = ensureRow(category);
      row.product_count += 1;
      if (product?.company) row.product_companies.add(product.company);
      row.latest_product_at = Math.max(row.latest_product_at, getProductLaunchTimestamp(product));
    });
  });

  ALL.forEach(event => {
    const row = ensureRow(event?.category || '기타');
    row.event_count += 1;
    if (isActive(event)) row.active_event_count += 1;
    if (event?.company) row.event_companies.add(event.company);
    const eventTime = getProductLaunchTimestamp({
      launch_date: event?.end_date || event?.start_date,
      published_date: event?.period,
      collected_at: event?.created_at,
    });
    row.latest_event_at = Math.max(row.latest_event_at, eventTime);
  });

  return Array.from(rowMap.values())
    .map(row => ({
      category: row.category,
      event_count: row.event_count,
      active_event_count: row.active_event_count,
      product_count: row.product_count,
      shared_companies: intersectItems([...row.product_companies], [...row.event_companies], 4),
      latest_event_at: row.latest_event_at || null,
      latest_product_at: row.latest_product_at || null,
      latest_at: Math.max(row.latest_event_at || 0, row.latest_product_at || 0) || null,
    }))
    .filter(row => row.product_count || row.event_count)
    .sort((left, right) =>
      (right.product_count + right.active_event_count) - (left.product_count + left.active_event_count)
      || String(left.category || '').localeCompare(String(right.category || ''), 'ko')
    );
}

function populateProductFilters() {
  const companyFilter = document.getElementById('productCompanyFilter');
  if (companyFilter) {
    const companies = [...new Set(PRODUCT_CATALOG.map(item => item.company).filter(Boolean))]
      .sort((left, right) => String(left).localeCompare(String(right), 'ko'));
    companyFilter.innerHTML = [
      '<option value="">전체 카드사</option>',
      ...companies.map(company => `<option value="${esc(company)}">${esc(company)}</option>`),
    ].join('');
    companyFilter.value = PRODUCT_ACTIVE_COMPANY;
  }

  const viewFilter = document.getElementById('productViewFilter');
  if (viewFilter) viewFilter.value = PRODUCT_ACTIVE_VIEW;

  const sortFilter = document.getElementById('productSortFilter');
  if (sortFilter) sortFilter.value = PRODUCT_ACTIVE_SORT;
}

function getVisibleProducts() {
  const query = PRODUCT_ACTIVE_QUERY.toLowerCase();
  const filtered = PRODUCT_CATALOG.filter(item => {
    if (PRODUCT_ACTIVE_COMPANY && item.company !== PRODUCT_ACTIVE_COMPANY) return false;
    if (PRODUCT_ACTIVE_VIEW === 'structured' && !hasStructuredProductSummary(item)) return false;
    if (PRODUCT_ACTIVE_VIEW === 'spend' && !item?.spend_requirement) return false;
    if (PRODUCT_ACTIVE_VIEW === 'pdf' && !getProductPdfLink(item)) return false;

    if (!query) return true;

    const haystack = [
      item.company || '',
      item.card_name || '',
      item.card_type || '',
      ...getProductCategoryList(item),
      ...(item.benefit_highlights || []),
      item.annual_fee_display || item.annual_fee || '',
      item.spend_requirement || '',
      item.summary_text || '',
      item.preview || '',
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });

  return getSortedProducts(filtered);
}

function renderProductCatalogList() {
  const listEl = document.getElementById('productsCatalogList');
  const emptyEl = document.getElementById('productsCatalogEmpty');
  const moreWrap = document.getElementById('productsCatalogMoreWrap');
  const moreText = document.getElementById('productsCatalogMoreText');
  if (!listEl) return;

  const items = getVisibleProducts();
  if (!items.length) {
    listEl.innerHTML = '';
    emptyEl?.classList.remove('hidden');
    moreWrap?.classList.add('hidden');
    return;
  }

  emptyEl?.classList.add('hidden');
  const visibleItems = items.slice(0, PRODUCT_RENDER_LIMIT);
  if (!PRODUCT_SELECTED_KEY || !items.some(item => getProductKey(item) === PRODUCT_SELECTED_KEY)) {
    PRODUCT_SELECTED_KEY = getProductKey(items[0]);
  }

  listEl.innerHTML = visibleItems.map(item => {
    const key = getProductKey(item);
    const selected = key === PRODUCT_SELECTED_KEY;
    const categories = (item.categories || []).slice(0, 3);
    const benefits = (item.benefit_highlights || []).slice(0, 3);
    const feeLabel = getProductFeeLabel(item);
    const spendLabel = getProductSpendLabel(item);
    const launchLabel = item.launch_date || item.published_date || '-';
    const preview = item.summary_text || item.preview || '';
    const hasSummary = hasStructuredProductSummary(item);
    const hasPdf = Boolean(getProductPdfLink(item));
    const keyLiteral = JSON.stringify(key);
    return `
      <button type="button" onclick='selectProductCard(${keyLiteral})' class="w-full rounded-3xl border px-4 py-4 text-left transition ${selected ? 'border-slate-900 bg-slate-900 text-white shadow-md' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[11px] font-semibold ${selected ? 'text-slate-200' : 'text-slate-500'}">${esc(item.company || '-')}</span>
              <span class="rounded-full px-2 py-0.5 text-[11px] ${selected ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-600'}">${esc(item.card_type || '카드')}</span>
              <span class="rounded-full px-2 py-0.5 text-[11px] ${hasSummary ? (selected ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-50 text-emerald-700') : (selected ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-500')}">${hasSummary ? '요약 있음' : '요약 보강중'}</span>
              ${hasPdf ? `<span class="rounded-full px-2 py-0.5 text-[11px] ${selected ? 'bg-sky-500/20 text-sky-100' : 'bg-sky-50 text-sky-700'}">PDF</span>` : ''}
              ${item.revision_type ? `<span class="rounded-full px-2 py-0.5 text-[11px] ${selected ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-50 text-emerald-700'}">${esc(item.revision_type)}</span>` : ''}
            </div>
            <div class="mt-2 text-base font-semibold leading-snug ${selected ? 'text-white' : 'text-slate-900'}">${esc(item.card_name || '-')}</div>
            <div class="mt-3 grid gap-2 text-[12px] ${selected ? 'text-slate-200' : 'text-slate-600'} sm:grid-cols-2">
              <div class="rounded-2xl ${selected ? 'bg-white/10' : 'bg-slate-50'} px-3 py-2">
                <div class="text-[11px] ${selected ? 'text-slate-300' : 'text-slate-400'}">연회비</div>
                <div class="mt-1 font-medium">${esc(feeLabel)}</div>
              </div>
              <div class="rounded-2xl ${selected ? 'bg-white/10' : 'bg-slate-50'} px-3 py-2">
                <div class="text-[11px] ${selected ? 'text-slate-300' : 'text-slate-400'}">전월실적</div>
                <div class="mt-1 font-medium">${esc(spendLabel)}</div>
              </div>
            </div>
            <div class="mt-3 space-y-1.5">
              ${benefits.length
                ? benefits.map(benefit => `<div class="flex items-start gap-2 text-[12px] leading-5 ${selected ? 'text-slate-100' : 'text-slate-700'}"><i class="fas fa-check-circle mt-0.5 ${selected ? 'text-amber-300' : 'text-amber-500'}"></i><span>${esc(benefit)}</span></div>`).join('')
                : `<div class="text-[12px] ${selected ? 'text-slate-300' : 'text-slate-500'}">핵심 혜택 요약이 아직 없습니다.</div>`
              }
            </div>
            <div class="mt-3 flex flex-wrap gap-1.5">
              ${categories.length
                ? categories.map(category => `<span class="rounded-full px-2 py-0.5 text-[11px] ${selected ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-600'}">${esc(category)}</span>`).join('')
                : `<span class="rounded-full px-2 py-0.5 text-[11px] ${selected ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-500'}">카테고리 정보 없음</span>`
              }
            </div>
          </div>
          <div class="w-[88px] shrink-0 text-right text-[11px] ${selected ? 'text-slate-300' : 'text-slate-400'}">
            <div>${esc(launchLabel)}</div>
            <div class="mt-1">${Number(item.chunk_count || 0)} 청크</div>
            <div class="mt-3">${getProductPdfLink(item) ? 'PDF 가능' : 'PDF 없음'}</div>
          </div>
        </div>
      </button>
    `;
  }).join('');
}

function renderProductDetailPanel() {
  const detailEl = document.getElementById('productsDetailPanel');
  if (!detailEl) return;

  const selected = findProductByKey(PRODUCT_SELECTED_KEY);
  if (!selected) {
    detailEl.innerHTML = '카드를 선택하면 연회비, 전월실적, 핵심 혜택, PDF 링크를 여기서 바로 확인할 수 있습니다.';
    return;
  }

  const categories = (selected.categories || []).length
    ? (selected.categories || []).map(category => `<span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">${esc(category)}</span>`).join('')
    : '<span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">카테고리 정보 없음</span>';
  const benefits = (selected.benefit_highlights || []).slice(0, 5);
  const preview = selected.summary_text || selected.preview || '상품 요약이 아직 없습니다. 필요하면 운영 탭에서 RAG 색인을 다시 생성해 최신 청킹 구조를 반영할 수 있습니다.';
  const pdfLink = getProductPdfLink(selected);
  const externalLink = getProductExternalLink(selected);
  const feeLabel = getProductFeeLabel(selected);
  const spendLabel = getProductSpendLabel(selected);

  detailEl.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs uppercase tracking-wider text-slate-400">${esc(selected.company || '-')}</div>
        <h4 class="display-font mt-1 text-lg font-bold text-slate-800">${esc(selected.card_name || '-')}</h4>
        <div class="mt-2 flex flex-wrap gap-1.5">${categories}</div>
      </div>
      <div class="text-right text-xs text-slate-400">
        <div>${esc(selected.launch_date || selected.published_date || '-')}</div>
        <div class="mt-1">${esc(selected.card_type || '카드')}</div>
      </div>
    </div>
    <div class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-xl border border-slate-200 bg-white px-3 py-3">
        <div class="text-[11px] font-bold text-slate-500">연회비</div>
        <div class="mt-1 text-sm text-slate-700">${esc(feeLabel)}</div>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white px-3 py-3">
        <div class="text-[11px] font-bold text-slate-500">전월실적</div>
        <div class="mt-1 text-sm text-slate-700">${esc(spendLabel)}</div>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white px-3 py-3">
        <div class="text-[11px] font-bold text-slate-500">출시/공시일</div>
        <div class="mt-1 text-sm text-slate-700">${esc(selected.launch_date || selected.published_date || '-')}</div>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white px-3 py-3">
        <div class="text-[11px] font-bold text-slate-500">RAG 청크</div>
        <div class="mt-1 text-sm text-slate-700">${Number(selected.chunk_count || 0)}개</div>
      </div>
    </div>
    <div class="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div class="text-[11px] font-bold text-slate-500">주요 혜택</div>
      <div class="mt-3 space-y-2">
        ${benefits.length
          ? benefits.map(benefit => `<div class="flex items-start gap-2 text-sm text-slate-700"><i class="fas fa-check-circle mt-0.5 text-amber-500"></i><span>${esc(benefit)}</span></div>`).join('')
          : '<div class="text-sm text-slate-500">PDF에서 바로 읽힌 핵심 혜택이 아직 없습니다.</div>'
        }
      </div>
    </div>
    <div class="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-4">
      <div class="text-[11px] font-bold text-slate-500">RAG 요약</div>
      <p class="mt-2 whitespace-pre-line leading-6 text-slate-700">${esc(preview)}</p>
    </div>
    <div class="mt-4 flex flex-wrap gap-2">
      ${pdfLink ? `<a href="${esc(pdfLink)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"><i class="fas fa-file-pdf text-xs"></i>PDF 보기</a>` : ''}
      ${externalLink ? `<a href="${esc(externalLink)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><i class="fas fa-up-right-from-square text-xs"></i>원문 페이지</a>` : ''}
    </div>
  `;
}

async function startFullExtraction() {
  const btn = document.getElementById('btnExtractAll');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>실행 중…';
  }
  showExtractProgress(true);
  updateExtractProgressFromApi({ phase: '', total: 0 }); // "준비 중…" / "대기"
  const textEl = document.getElementById('extractProgressText');
  if (textEl) textEl.textContent = '요청 전송 중…';
  try {
    const r = await fetch('/api/pipeline/full', { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.started !== true) {
      showExtractProgress(false);
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-play mr-1"></i>전체 추출 시작'; }
      alert('추출 실패: ' + (d.error || d.message || '시작하지 못함'));
      return;
    }
    if (textEl) textEl.textContent = '파이프라인 시작됨. 진행 상황 확인 중…';
    _extractPollTimer = setInterval(pollExtractProgress, 800);
    await pollExtractProgress();
  } catch (e) {
    showExtractProgress(false);
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-play mr-1"></i>전체 추출 시작'; }
    alert('추출 실패: ' + (e.message || String(e)));
  }
}

async function refreshCompanyBriefings(force = true) {
  const btn = document.getElementById('btnBriefRefresh');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>재생성 중…';
  }
  try {
    const r = await fetch(`/api/analytics/company-briefings?force=${force ? 'true' : 'false'}`);
    if (!r.ok) throw new Error('브리핑 API 호출 실패');
    BRIEFINGS = await r.json();
    renderCompanyBriefings();
  } catch (e) {
    console.error(e);
    alert('브리핑 갱신 실패: ' + (e.message || e));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-wand-magic-sparkles mr-1"></i>Gemini 재생성';
    }
  }
}

async function refreshQualitativeComparison(force = true) {
  const btn = document.getElementById('btnQualRefresh');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>추론 중…';
  }
  try {
    const r = await fetch(`/api/analytics/qualitative-comparison?force=${force ? 'true' : 'false'}`);
    if (!r.ok) throw new Error('정성 비교 API 호출 실패');
    QUAL_COMPARE = await r.json();
    renderQualitativeComparison();
  } catch (e) {
    console.error(e);
    alert('정성 비교 갱신 실패: ' + (e.message || e));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-chart-simple mr-1"></i>비교 재추론';
    }
  }
}

// ============ 비교 담기 (FR-13) ============
function toggleCompare(id, checked) {
  if (checked) COMPARE_SET.add(id); else COMPARE_SET.delete(id);
  updateCompareBtn();
}

function toggleAllCompare(masterChk) {
  const boxes = document.querySelectorAll('.chk-compare');
  boxes.forEach(cb => {
    const eid = parseInt(cb.dataset.eid);
    cb.checked = masterChk.checked;
    if (masterChk.checked) COMPARE_SET.add(eid); else COMPARE_SET.delete(eid);
  });
  updateCompareBtn();
}

function updateCompareBtn() {
  const btn = document.getElementById('btnCompareSelected');
  const cnt = document.getElementById('compareCount');
  if (btn) {
    if (COMPARE_SET.size >= 2) {
      btn.classList.remove('hidden');
      if (cnt) cnt.textContent = COMPARE_SET.size;
    } else {
      btn.classList.add('hidden');
    }
  }
  // 삭제 버튼: 1건 이상 선택 시 표시
  const delBtn = document.getElementById('btnDeleteSelected');
  const delCnt = document.getElementById('deleteCount');
  if (delBtn) {
    if (COMPARE_SET.size >= 1) {
      delBtn.classList.remove('hidden');
      if (delCnt) delCnt.textContent = COMPARE_SET.size;
    } else {
      delBtn.classList.add('hidden');
    }
  }
}

async function deleteSelectedEvents() {
  const ids = Array.from(COMPARE_SET);
  if (!ids.length) return;
  if (!confirm(`선택한 ${ids.length}건의 이벤트를 DB에서 완전히 삭제합니다.\n이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?`)) return;
  try {
    const res = await fetch('/api/events/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    const data = await res.json();
    if (res.ok) {
      alert(`${data.deleted}건 삭제 완료`);
      COMPARE_SET.clear();
      updateCompareBtn();
      loadAll();  // 목록 새로고침
    } else {
      alert('삭제 실패: ' + (data.error || '알 수 없는 오류'));
    }
  } catch (e) {
    alert('삭제 요청 실패: ' + e.message);
  }
}

async function openCompareModal() {
  if (COMPARE_SET.size < 2) { alert('2건 이상 선택해주세요.'); return; }
  const modal = document.getElementById('compareModal');
  const body = document.getElementById('compareBody');
  modal.style.display = 'flex';
  body.innerHTML = '<p class="text-slate-400">비교 데이터 로딩 중...</p>';

  const selected = [...COMPARE_SET].map(id => ALL.find(e => e.id === id)).filter(Boolean);
  // 각 이벤트의 intelligence 데이터 로드
  const details = await Promise.all(selected.map(async ev => {
    try {
      const r = await fetch(`/api/events/${ev.id}/intelligence`);
      return r.ok ? await r.json() : null;
    } catch { return null; }
  }));

  renderCompareTable(selected, details, body);
}

function renderCompareTable(events, details, el) {
  const rows = [
    {label: '카드사', render: (e, d) => `<span class="${pillCls(e.company)} badge-sm">${esc(e.company)}</span>`},
    {label: '제목', render: (e, d) => `<span class="font-medium text-sm">${esc(e.title||'')}</span>`},
    {label: '기간', render: (e, d) => `<span class="text-xs">${esc(e.period||'-')}</span>`},
    {label: '혜택', render: (e, d) => `<span class="text-sm">${esc(e.benefit_value||'-')}</span>`},
    {label: '혜택 유형', render: (e, d) => `<span class="text-xs">${esc(e.benefit_type||'-')}</span>`},
    {label: '조건', render: (e, d) => `<span class="text-xs">${esc(e.conditions||'-')}</span>`},
    {label: '타겟', render: (e, d) => `<span class="text-xs">${esc(e.target_segment||'-')}</span>`},
    {label: '카테고리', render: (e, d) => `<span class="text-xs">${esc(e.category||'-')}</span>`},
    {label: '혜택 수준', render: (e, d) => { const ins = d?.insight; return ins?.benefit_level ? `<span class="font-bold ${ins.benefit_level==='높음'?'text-emerald-600':ins.benefit_level==='낮음'?'text-rose-600':'text-slate-700'}">${esc(ins.benefit_level)}</span>` : '-'; }},
    {label: '타겟 명확도', render: (e, d) => `<span class="text-xs">${esc(d?.insight?.target_clarity||'-')}</span>`},
    {label: '경쟁력 포인트', render: (e, d) => { const pts = d?.insight?.competitive_points||[]; return pts.length ? pts.map(p=>`<span class="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded mr-1">${esc(p)}</span>`).join('') : '-'; }},
    {label: '프로모션 전략', render: (e, d) => { const st = d?.insight?.promo_strategies||[]; return st.length ? st.map(s=>`<span class="text-[11px] bg-blue-50 px-1.5 py-0.5 rounded mr-1">${esc(s)}</span>`).join('') : '-'; }},
    {label: 'AI 시사점', render: (e, d) => `<span class="text-xs text-slate-600">${esc((d?.insight?.marketing_takeaway||'').substring(0,120))}</span>`},
  ];

  let html = '<div class="overflow-x-auto"><table class="w-full text-sm border-separate border-spacing-0">';
  html += '<thead><tr><th class="px-3 py-2 text-left bg-slate-100 sticky left-0 z-10 min-w-[100px]">항목</th>';
  events.forEach((e, i) => {
    const sh = (e.company||'').includes('신한');
    html += `<th class="px-3 py-2 text-center bg-slate-100 min-w-[180px] ${sh?'bg-blue-50':''}"><span class="${pillCls(e.company)} badge-sm">${esc((e.company||'').replace('카드',''))}</span></th>`;
  });
  html += '</tr></thead><tbody>';

  rows.forEach((row, ri) => {
    html += `<tr class="${ri%2===0?'bg-white':'bg-slate-50/50'}">`;
    html += `<td class="px-3 py-2 font-bold text-xs text-slate-500 sticky left-0 z-10 ${ri%2===0?'bg-white':'bg-slate-50'}">${row.label}</td>`;
    events.forEach((e, i) => {
      const d = details[i];
      const sh = (e.company||'').includes('신한');
      html += `<td class="px-3 py-2 ${sh?'bg-blue-50/30':''}">${row.render(e, d)}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  html += `<div class="mt-4 text-right"><button onclick="closeCompareModal()" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium">닫기</button></div>`;
  el.innerHTML = html;
}

function closeCompareModal() {
  document.getElementById('compareModal').style.display = 'none';
}

// ============ 전체 이벤트 로드 ============
async function loadAllEvents() {
  const btn = document.getElementById('btnLoadMore');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>로딩 중...'; }
  try {
    const r = await fetch('/api/events?size=1000');
    if (r.ok) {
      ALL = await r.json();
      ALL_LOADED = true;
      renderEvents();
      populateFilters();
    }
  } catch (e) { console.error(e); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-chevron-down mr-1"></i>전체 이벤트 불러오기'; } }
}

// ============ 엑셀 ============
function exportExcel() {
  const list = getFiltered();
  const rows = [['카드사','제목','혜택','조건','기간','추출','상태','카테고리','인사이트 요약','URL']];
  list.forEach(e => {
    const ins = pjson(e.marketing_insights);
    const summary = ins ? [ins.benefit_level, ...(ins.competitive_points||[]).slice(0,2), ...(ins.promo_strategies||[]).slice(0,2)].filter(Boolean).join(' / ') : '';
    rows.push([e.company, e.title, e.benefit_value||'', e.conditions||'', e.period||'', isExtracted(e)?'완료':'미완료', isActive(e)?'진행중':'종료', e.category||'', summary, e.url]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '이벤트');
  XLSX.writeFile(wb, `경쟁사이벤트_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ============ 유틸 ============
function esc(s) { if(s==null)return''; const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function isActive(e) {
  if (e.status === 'active') return true;
  if (e.status === 'ended') return false;
  if (!e.period) return true;
  try { const end=e.period.split('~')[1]; if(!end)return true; return new Date(end.trim().replace(/\./g,'-'))>=new Date(); } catch{return true;}
}
function pjson(v) { if(!v)return null; if(typeof v==='object')return v; try{return JSON.parse(v);}catch{return null;} }
function clipText(text, limit = 0) {
  const value = String(text || '').trim();
  if (!limit || value.length <= limit) return value;
  return value.slice(0, Math.max(1, limit - 1)).trimEnd() + '…';
}
function getEventDisplayTitle(event, limit = 0) {
  const text = String(event?.display_title || event?.title || event?.one_line_summary || '').trim();
  return clipText(text, limit);
}
function getEventDisplayBenefit(event, limit = 0) {
  let text = String(event?.display_benefit || event?.one_line_summary || event?.benefit_value || '').trim();
  text = text.replace(/\s*\|\s*본문 바로가기[\s\S]*$/i, '').replace(/상세 페이지 참조|정보 없음/gi, '').trim();
  return clipText(text, limit);
}
function getEventDisplayTarget(event, limit = 0) {
  let text = String(event?.target_segment || '').trim();
  text = text.replace(/\s*\|\s*본문 바로가기[\s\S]*$/i, '').replace(/본문 바로가기[\s\S]*$/i, '').trim();
  text = text.replace(/\s+/g, ' ');
  return clipText(text, limit);
}
function levelChip(level) {
  const txt = String(level || '-');
  if (txt === '매우 높음') return '<span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-200 border border-rose-400/30">매우 높음</span>';
  if (txt === '높음') return '<span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/20 text-orange-200 border border-orange-400/30">높음</span>';
  if (txt === '중간') return '<span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/20 text-slate-200 border border-slate-400/30">중간</span>';
  if (txt === '낮음') return '<span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/30">낮음</span>';
  if (txt === '매우 낮음') return '<span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">매우 낮음</span>';
  return `<span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/20 text-slate-200 border border-slate-400/30">${esc(txt)}</span>`;
}
function fmtDate(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('ko-KR', { hour12: false });
}
function coColor(c) { if(c.includes('삼성'))return'#6ec6ff'; if(c.includes('신한'))return'#0057ff'; if(c.includes('현대'))return'#111111'; if(c.includes('KB')||c.includes('국민'))return'#ffb300'; return'#455a64'; }
function coCls(c) { if(!c)return'c-default'; if(c.includes('삼성'))return'c-samsung'; if(c.includes('신한'))return'c-shinhan'; if(c.includes('현대'))return'c-hyundai'; if(c.includes('KB')||c.includes('국민'))return'c-kb'; return'c-default'; }
function pillCls(c) { if(!c)return'pill-default'; if(c.includes('삼성'))return'pill-samsung'; if(c.includes('신한'))return'pill-shinhan'; if(c.includes('현대'))return'pill-hyundai'; if(c.includes('KB')||c.includes('국민'))return'pill-kb'; return'pill-default'; }
function coShort(c) { if(!c)return'?'; if(c.includes('KB')||c.includes('국민'))return'KB'; if(c.includes('현대'))return'HD'; if(c.includes('삼성'))return'SS'; if(c.includes('신한'))return'SH'; return c.replace('카드','').substring(0,2); }
// 차트/테이블 순서 고정: 신한 -> KB -> 삼성 -> 현대 -> 나머지
const CO_ORDER = ['신한카드','KB국민카드','삼성카드','현대카드'];
function sortCompanies(arr, key) {
  if (!key) return arr.slice().sort((a,b) => { const ia = CO_ORDER.indexOf(a), ib = CO_ORDER.indexOf(b); if(ia>=0&&ib>=0) return ia-ib; if(ia>=0) return -1; if(ib>=0) return 1; return a.localeCompare(b); });
  return arr.slice().sort((a,b) => { const ca = typeof key==='function' ? key(a) : a[key], cb = typeof key==='function' ? key(b) : b[key]; const ia = CO_ORDER.indexOf(ca), ib = CO_ORDER.indexOf(cb); if(ia>=0&&ib>=0) return ia-ib; if(ia>=0) return -1; if(ib>=0) return 1; return (ca||'').localeCompare(cb||''); });
}

// ============================================================================
// Sprint 1 Shell overrides
// ============================================================================

let LATEST_STATS = null;
let PRODUCT_STATS = null;
let PRODUCT_CATALOG = [];
let PRODUCT_SELECTED_KEY = null;
let PRODUCT_ACTIVE_QUERY = '';
let PRODUCT_ACTIVE_COMPANY = '';
let PRODUCT_ACTIVE_VIEW = 'all';
let PRODUCT_ACTIVE_SORT = 'recommended';
let PRODUCT_RENDER_LIMIT = 80;
const PRODUCT_RENDER_STEP = 80;
let WORKSPACE_BRIDGE = null;
let REVIEW_QUEUE = [];
let AUDIT_LOG = [];
let CURRENT_PAGE = 'events';
let CURRENT_EVENT_TAB = 'events';
let CALENDAR_MONTH = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let CALENDAR_SELECTED = null;
let CALENDAR_MODE = 'combined';
let CALENDAR_COMPANY_FILTER = '';

function initTabs() {
  document.querySelectorAll('#pageNav .page-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });
  document.querySelectorAll('#eventNav .subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => showEventTab(btn.dataset.tab));
  });
  showPage(CURRENT_PAGE, { scroll: false });
  showEventTab(CURRENT_EVENT_TAB);
}

function showPage(page, options = {}) {
  const nextPage = page || 'events';
  CURRENT_PAGE = nextPage;
  document.querySelectorAll('#pageNav .page-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === nextPage);
  });
  document.querySelectorAll('.page-view').forEach(section => {
    section.classList.toggle('hidden', section.id !== `page-${nextPage}`);
  });
  if (nextPage === 'events') showEventTab(CURRENT_EVENT_TAB);
  if (options.scroll !== false) {
    document.getElementById(`page-${nextPage}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function showEventTab(tab) {
  const nextTab = tab || 'events';
  CURRENT_EVENT_TAB = nextTab;
  document.querySelectorAll('#eventNav .subtab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === nextTab);
  });
  ['events', 'calendar', 'compare', 'benchmark', 'strategy'].forEach(name => {
    const section = document.getElementById(`tab-${name}`);
    if (section) section.classList.toggle('hidden', name !== nextTab);
  });
  if (nextTab === 'calendar') renderCalendar();
}

async function loadAll() {
  try {
    const [
      evR,
      stR,
      ovR,
      bridgeR,
      progR,
    ] = await Promise.all([
      fetch('/api/events'),
      fetch('/api/stats'),
      fetch('/api/analytics/company-overview'),
      fetch('/api/analytics/workspace-bridge'),
      fetch('/api/pipeline/progress'),
    ]);

    ALL = evR.ok ? await evR.json() : [];
    ALL_LOADED = true;
    const prog = progR.ok ? await progR.json().catch(() => ({})) : {};
    LATEST_STATS = stR.ok ? await stR.json() : {};
    OVERVIEW = ovR.ok ? await ovR.json() : null;
    WORKSPACE_BRIDGE = bridgeR.ok ? await bridgeR.json().catch(() => null) : null;
    REVIEW_QUEUE = Array.isArray(REVIEW_QUEUE) ? REVIEW_QUEUE : [];
    AUDIT_LOG = Array.isArray(AUDIT_LOG) ? AUDIT_LOG : [];
    PRODUCT_STATS = PRODUCT_STATS || null;
    PRODUCT_CATALOG = Array.isArray(PRODUCT_CATALOG) ? PRODUCT_CATALOG : [];
    PRODUCT_SELECTED_KEY = PRODUCT_CATALOG.length ? getProductKey(PRODUCT_CATALOG[0]) : null;
    PRODUCT_ACTIVE_QUERY = PRODUCT_ACTIVE_QUERY || '';
    PRODUCT_ACTIVE_COMPANY = PRODUCT_ACTIVE_COMPANY || '';
    PRODUCT_ACTIVE_VIEW = PRODUCT_ACTIVE_VIEW || 'all';
    PRODUCT_ACTIVE_SORT = PRODUCT_ACTIVE_SORT || 'recommended';
    PRODUCT_RENDER_LIMIT = PRODUCT_RENDER_LIMIT || PRODUCT_RENDER_STEP;

    updateLastRunSummary(prog);
    updateLastIngestSummary(prog);
    updateHeaderStats(LATEST_STATS);

    try { renderActionCards(); } catch (_) {}
    try { renderCompanyCards(); } catch (_) {}
    try { renderBenefitDist(); } catch (_) {}
    try { loadCompareMatrix(); } catch (_) {}
    try { loadShinhanGap(); } catch (_) {}
    try { loadGapTrend(); } catch (_) {}

    populateFilters();
    renderEvents();
    renderEventWorkspace();
    renderCalendar();
    renderOverviewWorkspace(prog);
    renderProductsWorkspace();
    renderReviewWorkspace();
    renderOpsWorkspace(prog);
    updateWorkspaceStatusChips();
    if (typeof window.restructureDashboardLayout === 'function') {
      try { window.restructureDashboardLayout(); } catch (_) {}
    }
    if (typeof window.renderDashboard === 'function') {
      try { await window.renderDashboard(); } catch (_) {}
    }

    void Promise.allSettled([
      loadSecondaryAnalytics(),
      loadDeferredWorkspaceData(prog),
    ]);
  } catch (e) {
    console.error(e);
  }
}

async function loadDeferredWorkspaceData(prog) {
  try {
    const [reviewR, auditR, ragR, catalogR] = await Promise.all([
      fetch('/api/events/review-queue?limit=12'),
      fetch('/api/audit/edits?size=8'),
      fetch('/api/rag/stats'),
      fetch('/api/rag/catalog?limit=5000'),
    ]);

    REVIEW_QUEUE = reviewR.ok ? await reviewR.json().catch(() => []) : [];
    const auditPayload = auditR.ok ? await auditR.json().catch(() => ({ items: [] })) : { items: [] };
    AUDIT_LOG = Array.isArray(auditPayload) ? auditPayload : (auditPayload.items || []);
    PRODUCT_STATS = ragR.ok ? await ragR.json().catch(() => null) : null;
    const catalogPayload = catalogR.ok ? await catalogR.json().catch(() => ({ items: [], products: [] })) : { items: [], products: [] };
    PRODUCT_CATALOG = (Array.isArray(catalogPayload?.items)
      ? catalogPayload.items
      : (Array.isArray(catalogPayload?.products) ? catalogPayload.products : [])
    ).map(normalizeProductCatalogItem);
    if (PRODUCT_STATS && catalogPayload?.by_company && !PRODUCT_STATS.company_counts) {
      PRODUCT_STATS.company_counts = Object.fromEntries(
        Object.entries(catalogPayload.by_company).map(([company, info]) => [company, Number(info?.count || 0)])
      );
    }
    if (!PRODUCT_SELECTED_KEY || !PRODUCT_CATALOG.some(item => getProductKey(item) === PRODUCT_SELECTED_KEY)) {
      PRODUCT_SELECTED_KEY = PRODUCT_CATALOG.length ? getProductKey(PRODUCT_CATALOG[0]) : null;
    }

    renderOverviewWorkspace(prog);
    renderProductsWorkspace();
    renderReviewWorkspace();
    updateWorkspaceStatusChips();
    if (typeof window.restructureDashboardLayout === 'function') {
      try { window.restructureDashboardLayout(); } catch (_) {}
    }
    if (typeof window.refreshPostLoadUI === 'function') {
      try { window.refreshPostLoadUI(); } catch (_) {}
    }
  } catch (e) {
    console.error('workspace data', e);
  }
}

async function loadSecondaryAnalytics() {
  try {
    const [bmR, smR, trR, brR, qcR] = await Promise.all([
      fetch('/api/analytics/benefit-benchmark'),
      fetch('/api/analytics/strategy-map'),
      fetch('/api/analytics/trends'),
      fetch('/api/analytics/company-briefings'),
      fetch('/api/analytics/qualitative-comparison'),
    ]);
    BENCHMARK = bmR.ok ? await bmR.json() : null;
    STRATEGY = smR.ok ? await smR.json() : null;
    TRENDS = trR.ok ? await trR.json() : null;
    BRIEFINGS = brR.ok ? await brR.json() : null;
    QUAL_COMPARE = qcR.ok ? await qcR.json() : null;

    try { renderCompanyBriefings(); } catch (_) {}
    try { renderQualitativeComparison(); } catch (_) {}
    try { renderBenchmark(); } catch (_) {}
    try { renderHeatmap(); } catch (_) {}
    try { renderTrends(); } catch (_) {}
  } catch (e) {
    console.error('secondary analytics', e);
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHtml(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value;
}

function setChipValue(id, value) {
  const chip = document.getElementById(id);
  if (!chip) return;
  const strong = chip.querySelector('strong');
  if (strong) strong.textContent = value;
}

function formatShortDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatShortDate(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : (parseEventDate(value) || new Date(value));
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace(/\s/g, '').replace(/\.$/, '');
}

function formatFullDate(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : (parseEventDate(value) || new Date(value));
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function takeList(values, limit = 3, fallback = '-') {
  const items = Array.isArray(values) ? values.filter(Boolean) : [];
  return items.length ? items.slice(0, limit).join(', ') : fallback;
}

function renderInfoCards(items, emptyText) {
  if (!items.length) {
    return `<div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-slate-400">${esc(emptyText)}</div>`;
  }
  return items.map(text => `
    <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 leading-6 text-slate-700">
      ${esc(text)}
    </div>
  `).join('');
}

function renderTableEmpty(colspan, message) {
  return `<tr><td colspan="${colspan}" class="px-4 py-6 text-center text-slate-400">${esc(message)}</td></tr>`;
}

function getLatestValue(...values) {
  const items = values.filter(Boolean);
  if (!items.length) return null;
  return items.sort().slice(-1)[0];
}

function getBridgeSummary() {
  return WORKSPACE_BRIDGE?.summary || {};
}

function getProductSummary() {
  const rawStatus = String(PRODUCT_STATS?.status || '').toLowerCase();
  const totalChunks = Number(
    PRODUCT_STATS?.total_chunks ??
    PRODUCT_STATS?.chunk_count ??
    PRODUCT_STATS?.chunks ??
    0
  );
  const totalCards = Number(
    PRODUCT_STATS?.total_cards ??
    PRODUCT_STATS?.card_count ??
    PRODUCT_STATS?.cards ??
    0
  );
  const updatedAt =
    PRODUCT_STATS?.last_updated ||
    PRODUCT_STATS?.updated_at ||
    PRODUCT_STATS?.last_update_at ||
    null;

  if (!PRODUCT_STATS) {
    return {
      status: 'unavailable',
      label: '대기',
      hint: '상품 통계 응답이 아직 준비되지 않았습니다.',
      chip: '준비 중',
      chunks: 0,
      cards: 0,
      updatedAt: null,
    };
  }

  if (rawStatus.includes('ready')) {
    return {
      status: 'ready',
      label: '준비 완료',
      hint: totalChunks > 0 ? '상품 검색용 색인이 준비되어 있습니다.' : '응답은 가능하지만 색인 데이터는 아직 비어 있습니다.',
      chip: '운영 중',
      chunks: totalChunks,
      cards: totalCards,
      updatedAt,
    };
  }

  if (rawStatus.includes('catalog_only')) {
    return {
      status: 'catalog',
      label: '카탈로그',
      hint: PRODUCT_STATS?.message || '상품은 수집됐지만 색인은 아직 생성되지 않았습니다.',
      chip: '카탈로그',
      chunks: totalChunks,
      cards: totalCards,
      updatedAt,
    };
  }

  if (rawStatus.includes('empty')) {
    return {
      status: 'empty',
      label: '비어 있음',
      hint: '상품 영역은 준비됐지만 아직 색인된 데이터가 없습니다.',
      chip: '비어 있음',
      chunks: totalChunks,
      cards: totalCards,
      updatedAt,
    };
  }

  if (rawStatus.includes('not_installed')) {
    return {
      status: 'staged',
      label: '연결 대기',
      hint: PRODUCT_STATS?.message || '상품 엔진이 아직 완전히 연결되지 않았습니다.',
      chip: '연결 대기',
      chunks: totalChunks,
      cards: totalCards,
      updatedAt,
    };
  }

  if (rawStatus.includes('error')) {
    return {
      status: 'error',
      label: '오류',
      hint: String(PRODUCT_STATS?.status || '상품 색인에서 오류 상태가 보고됐습니다.'),
      chip: '확인 필요',
      chunks: totalChunks,
      cards: totalCards,
      updatedAt,
    };
  }

  return {
    status: 'standby',
    label: '대기',
    hint: '상품 수집과 색인 준비가 진행 중입니다.',
    chip: '준비 중',
    chunks: totalChunks,
    cards: totalCards,
    updatedAt,
  };
}

function renderEventWorkspace() {
  const summary = getBridgeSummary();
  const companyRows = Array.isArray(WORKSPACE_BRIDGE?.company_rows) ? WORKSPACE_BRIDGE.company_rows : [];
  const recentChanges = Array.isArray(WORKSPACE_BRIDGE?.recent_changes) ? WORKSPACE_BRIDGE.recent_changes.slice(0, 8) : [];
  const observations = [];

  if (summary.active_events) observations.push(`현재 진행 중인 이벤트는 ${summary.active_events}건입니다.`);
  if (summary.new_events_30d) observations.push(`최근 30일 안에 새로 들어온 이벤트는 ${summary.new_events_30d}건입니다.`);
  if (summary.ending_events_7d) observations.push(`앞으로 7일 안에 종료되는 이벤트는 ${summary.ending_events_7d}건입니다.`);
  if (summary.companies_with_both) observations.push(`이벤트와 상품이 모두 잡힌 카드사는 ${summary.companies_with_both}곳입니다.`);
  (WORKSPACE_BRIDGE?.observations || []).forEach(item => {
    if (item && !observations.includes(item)) observations.push(item);
  });

  setText('eventsActiveCount', String(summary.active_events || ALL.filter(isActive).length));
  setText('eventsNewCount', String(summary.new_events_30d || 0));
  setText('eventsEndingSoonCount', String(summary.ending_events_7d || 0));
  setText('eventsNeedsReviewCount', String(summary.needs_review || ALL.filter(isNeedsReview).length));
  setHtml('eventObservations', renderInfoCards(observations.slice(0, 4), '표시할 관측 데이터가 없습니다.'));

  const recentKinds = recentChanges.reduce((acc, item) => {
    acc[item.kind] = (acc[item.kind] || 0) + 1;
    return acc;
  }, {});
  setText('eventRecentMeta', `이벤트 ${recentKinds.event || 0}건 · 상품 ${recentKinds.product || 0}건`);
  setHtml(
    'eventRecentChanges',
    recentChanges.length
      ? recentChanges.map(item => `
          <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2 min-w-0">
                <span class="badge-sm ${item.kind === 'event' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'}">
                  ${item.kind === 'event' ? '이벤트' : '상품'}
                </span>
                <span class="text-xs text-slate-500 truncate">${esc(item.company || '-')}</span>
              </div>
              <span class="text-[11px] text-slate-400">${esc(formatShortDateTime(item.at))}</span>
            </div>
            <div class="mt-2 font-medium text-slate-800">${esc(item.title || '-')}</div>
            <div class="mt-1 text-xs text-slate-500">${esc(item.meta || '-')}</div>
          </div>
        `).join('')
      : `<div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-slate-400">최근 변경 이력이 없습니다.</div>`
  );

  const body = document.getElementById('eventsCompanyBridgeBody');
  if (body) {
    const rows = companyRows.filter(row => row.active_events || row.products).slice(0, 12);
    body.innerHTML = rows.length
      ? rows.map(row => `
          <tr>
            <td class="px-4 py-3 font-medium text-slate-800">${esc(row.company || '-')}</td>
            <td class="px-4 py-3 text-slate-600">${row.active_events || 0}</td>
            <td class="px-4 py-3 text-slate-600">${row.new_events_30d || 0}</td>
            <td class="px-4 py-3 text-slate-600">${row.products || 0}</td>
            <td class="px-4 py-3 text-slate-600">${row.new_products_30d || 0}</td>
            <td class="px-4 py-3 text-slate-500">${esc(takeList(row.shared_categories, 3))}</td>
          </tr>
        `).join('')
      : renderTableEmpty(6, '표시할 카드사 비교 데이터가 없습니다.');
  }
}

function renderOverviewWorkspace(prog) {
  const activeCount = ALL.filter(isActive).length;
  const needsReview = ALL.filter(isNeedsReview).length;
  const curated = ALL.filter(isCurated).length;
  const product = getProductSummary();
  const phase = prog?.running ? `Running: ${prog.phase || 'pipeline'}` : 'Idle';

  setText('overviewActiveCount', String(activeCount));
  setText('overviewReviewCount', String(needsReview));
  setText('overviewCuratedCount', String(curated));
  setText('overviewProductState', product.label);
  setText('overviewProductHint', product.hint);

  setHtml(
    'overviewNarrative',
    [
      `<p><strong>${activeCount}</strong> active events are visible in the current intelligence feed.</p>`,
      `<p><strong>${needsReview}</strong> items still need manual review, while <strong>${curated}</strong> were already curated.</p>`,
      `<p>Pipeline state: <strong>${esc(phase)}</strong>. Product workspace: <strong>${esc(product.chip)}</strong>.</p>`,
    ].join('')
  );
}

function renderProductsWorkspace() {
  const product = getProductSummary();
  const summary = getBridgeSummary();
  const companyRows = buildProductCompanyRowsFallback();
  const categoryRows = buildProductCategoryRowsFallback();
  const coverage = getProductCoverageStats();
  const statusColor =
    product.status === 'ready' ? 'text-emerald-500' :
    product.status === 'catalog' ? 'text-blue-500' :
    product.status === 'error' ? 'text-rose-500' :
    product.status === 'empty' ? 'text-amber-500' :
    'text-slate-400';
  const issuerCount = companyRows.filter(row => row.products > 0).length || Object.keys(PRODUCT_STATS?.company_counts || {}).length;
  const recentProducts = PRODUCT_CATALOG.filter(item => isRecentProduct(item)).length;

  setText('productsTotalCount', String(summary.products || PRODUCT_CATALOG.length));
  setText('productsNewCount', String(summary.new_products_30d || recentProducts));
  setText('productsPdfCount', String(summary.products_with_pdf || PRODUCT_CATALOG.filter(item => getProductPdfLink(item)).length));
  setText('productsIssuerCount', String(issuerCount || 0));
  setText('productsStatusHint', product.hint);
  setHtml(
    'productsStatusPill',
    `<i class="fas fa-circle ${statusColor}"></i><strong>${esc(product.chip)}</strong>`
  );

  const details = [];
  if (PRODUCT_STATS?.collection) details.push(`수집 컬렉션: ${PRODUCT_STATS.collection}`);
  if (product.updatedAt) details.push(`마지막 갱신: ${formatShortDateTime(product.updatedAt)}`);
  if (product.chunks) details.push(`색인 청크: ${product.chunks}개`);
  if (product.cards) details.push(`카드 기준 수집: ${product.cards}개`);
  if (!details.length) details.push(product.hint);

  setHtml(
    'productsStatusPanel',
    [
      `<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">`,
      `<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">`,
      `<div>`,
      `<p class="text-sm font-semibold text-slate-800">RAG 활용 상태</p>`,
      `<p class="mt-1 text-xs leading-6 text-slate-600">${esc(product.hint)}</p>`,
      `</div>`,
      `<div class="text-xs leading-6 text-slate-500">${details.map(detail => esc(detail)).join('<br>')}</div>`,
      `</div>`,
      `</div>`,
      `<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">`,
      `<div class="rounded-2xl border border-slate-200 bg-white px-4 py-3"><div class="text-[11px] font-semibold tracking-wide text-slate-500">구조화 요약</div><div class="mt-2 text-2xl font-black text-slate-900">${coverage.structured}</div><div class="mt-1 text-xs text-slate-500">혜택/연회비/조건이 정리된 상품</div></div>`,
      `<div class="rounded-2xl border border-slate-200 bg-white px-4 py-3"><div class="text-[11px] font-semibold tracking-wide text-slate-500">연회비 노출</div><div class="mt-2 text-2xl font-black text-slate-900">${coverage.fee}</div><div class="mt-1 text-xs text-slate-500">비교 카드에 바로 표시 가능한 상품</div></div>`,
      `<div class="rounded-2xl border border-slate-200 bg-white px-4 py-3"><div class="text-[11px] font-semibold tracking-wide text-slate-500">전월실적 노출</div><div class="mt-2 text-2xl font-black text-slate-900">${coverage.spend}</div><div class="mt-1 text-xs text-slate-500">조건 비교가 가능한 상품</div></div>`,
      `<div class="rounded-2xl border border-slate-200 bg-white px-4 py-3"><div class="text-[11px] font-semibold tracking-wide text-slate-500">PDF 직결</div><div class="mt-2 text-2xl font-black text-slate-900">${coverage.pdf}</div><div class="mt-1 text-xs text-slate-500">원문 PDF를 바로 열 수 있는 상품</div></div>`,
      `</div>`,
    ].join('')
  );

  const bridgeSignals = [];
  const topCompanies = companyRows.slice(0, 3).map(row => `${row.company} ${row.products}개`);
  if (topCompanies.length) bridgeSignals.push(`상품 커버리지는 ${topCompanies.join(', ')} 순으로 넓습니다.`);
  bridgeSignals.push(`연회비는 ${coverage.fee}개, 전월실적은 ${coverage.spend}개 상품에서 바로 비교할 수 있습니다.`);
  if (coverage.spend < coverage.total) {
    bridgeSignals.push('전월실적이 비어 보이는 상품은 조건이 없는 것이 아니라 아직 추출 전일 수 있습니다.');
  }
  if (product.chunks > 0) {
    bridgeSignals.push(`현재 색인 청크 ${product.chunks}개를 기반으로 상품 검색과 추천이 가능합니다.`);
  } else if (PRODUCT_CATALOG.length) {
    bridgeSignals.push('지금은 매니페스트 요약으로 먼저 보여주고 있고, 새 색인이 완료되면 요약 품질이 더 올라갑니다.');
  }
  setHtml('productsLinksPanel', renderInfoCards(bridgeSignals, '표시할 상품 관측이 없습니다.'));
  populateProductFilters();

  const companyBody = document.getElementById('productsCompanyBridgeBody');
  if (companyBody) {
    const rows = companyRows.filter(row => row.products || row.active_events).slice(0, 12);
    companyBody.innerHTML = rows.length
      ? rows.map(row => `
          <tr>
            <td class="px-4 py-3 font-medium text-slate-800">${esc(row.company || '-')}</td>
            <td class="px-4 py-3 text-slate-600">${row.active_events || 0}</td>
            <td class="px-4 py-3 text-slate-600">${row.products || 0}</td>
            <td class="px-4 py-3 text-slate-600">${row.products_with_pdf || 0}</td>
            <td class="px-4 py-3 text-slate-600">${row.new_products_30d || 0}</td>
            <td class="px-4 py-3 text-slate-500">${esc(takeList(row.shared_categories, 3))}</td>
          </tr>
        `).join('')
      : renderTableEmpty(6, '표시할 카드사 비교 데이터가 없습니다.');
  }

  const categoryBody = document.getElementById('productsCategoryBridgeBody');
  if (categoryBody) {
    categoryBody.innerHTML = categoryRows.length
      ? categoryRows.slice(0, 12).map(row => `
          <tr>
            <td class="px-4 py-3 font-medium text-slate-800">${esc(row.category || '-')}</td>
            <td class="px-4 py-3 text-slate-600">${row.event_count || 0}</td>
            <td class="px-4 py-3 text-slate-600">${row.active_event_count || 0}</td>
            <td class="px-4 py-3 text-slate-600">${row.product_count || 0}</td>
            <td class="px-4 py-3 text-slate-500">${esc(takeList(row.shared_companies, 3))}</td>
            <td class="px-4 py-3 text-slate-500">${esc(formatShortDate(row.latest_at))}</td>
          </tr>
        `).join('')
      : renderTableEmpty(6, '표시할 카테고리 연결 데이터가 없습니다.');
  }

  const visibleProducts = getVisibleProducts();
  const shownCount = Math.min(visibleProducts.length, PRODUCT_RENDER_LIMIT);
  const activeFilters = [];
  if (PRODUCT_ACTIVE_COMPANY) activeFilters.push(PRODUCT_ACTIVE_COMPANY);
  if (PRODUCT_ACTIVE_VIEW === 'structured') activeFilters.push('요약 잘 잡힌 상품');
  if (PRODUCT_ACTIVE_VIEW === 'spend') activeFilters.push('전월실적 있는 상품');
  if (PRODUCT_ACTIVE_VIEW === 'pdf') activeFilters.push('PDF 바로 열기 가능');
  if (PRODUCT_ACTIVE_SORT === 'latest') activeFilters.push('최신순');
  if (PRODUCT_ACTIVE_SORT === 'issuer') activeFilters.push('카드사순');
  if (PRODUCT_ACTIVE_SORT === 'name') activeFilters.push('상품명순');
  if (PRODUCT_ACTIVE_QUERY) activeFilters.push(`검색: ${PRODUCT_ACTIVE_QUERY}`);
  setText(
    'productsCatalogMeta',
    visibleProducts.length
      ? `총 ${PRODUCT_CATALOG.length}개 중 ${visibleProducts.length}개 일치, 현재 ${shownCount}개 표시${activeFilters.length ? ` · ${activeFilters.join(' · ')}` : ''}`
      : `총 ${PRODUCT_CATALOG.length}개 중 조건에 맞는 상품이 없습니다.`
  );
  const searchInput = document.getElementById('productSearchInput');
  if (searchInput && searchInput.value !== PRODUCT_ACTIVE_QUERY) {
    searchInput.value = PRODUCT_ACTIVE_QUERY;
  }
  renderProductCatalogList();
  renderProductDetailPanel();
}

function getProductKey(product) {
  return `${product?.company || ''}::${product?.card_name || ''}`;
}

function findProductByKey(key) {
  return PRODUCT_CATALOG.find(item => getProductKey(item) === key) || null;
}

function getVisibleProducts() {
  if (!PRODUCT_ACTIVE_QUERY) return PRODUCT_CATALOG;
  const query = PRODUCT_ACTIVE_QUERY.toLowerCase();
  return PRODUCT_CATALOG.filter(item => {
    const haystack = [
      item.company || '',
      item.card_name || '',
      item.card_type || '',
      ...(item.categories || []),
      item.preview || '',
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

function selectProductCard(key) {
  PRODUCT_SELECTED_KEY = key;
  renderProductCatalogList();
  renderProductDetailPanel();
}

function renderProductCatalogList() {
  const listEl = document.getElementById('productsCatalogList');
  const emptyEl = document.getElementById('productsCatalogEmpty');
  if (!listEl) return;

  const items = getVisibleProducts();
  if (!items.length) {
    listEl.innerHTML = '';
    emptyEl?.classList.remove('hidden');
    return;
  }

  emptyEl?.classList.add('hidden');
  if (!PRODUCT_SELECTED_KEY || !items.some(item => getProductKey(item) === PRODUCT_SELECTED_KEY)) {
    PRODUCT_SELECTED_KEY = getProductKey(items[0]);
  }

  listEl.innerHTML = items.map(item => {
    const key = getProductKey(item);
    const selected = key === PRODUCT_SELECTED_KEY;
    const categories = (item.categories || []).slice(0, 3);
    const keyLiteral = JSON.stringify(key);
    return `
      <button type="button" onclick='selectProductCard(${keyLiteral})' class="w-full rounded-2xl border px-4 py-3 text-left transition ${selected ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-xs ${selected ? 'text-slate-300' : 'text-slate-500'}">${esc(item.company || '-')}</div>
            <div class="mt-1 font-semibold truncate">${esc(item.card_name || '-')}</div>
            <div class="mt-2 flex flex-wrap gap-1.5">
              ${categories.length
                ? categories.map(category => `<span class="rounded-full px-2 py-0.5 text-[11px] ${selected ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-600'}">${esc(category)}</span>`).join('')
                : `<span class="rounded-full px-2 py-0.5 text-[11px] ${selected ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-500'}">카테고리 없음</span>`
              }
            </div>
          </div>
          <div class="text-right text-[11px] ${selected ? 'text-slate-300' : 'text-slate-400'}">
            <div>${esc(item.published_date || '-')}</div>
            <div class="mt-1">${esc(item.card_type || '카드')}</div>
          </div>
        </div>
      </button>
    `;
  }).join('');
}

function renderProductDetailPanel() {
  const detailEl = document.getElementById('productsDetailPanel');
  if (!detailEl) return;

  const selected = findProductByKey(PRODUCT_SELECTED_KEY);
  if (!selected) {
    detailEl.innerHTML = '상품을 선택하면 출처, 카테고리, 수집 미리보기를 확인할 수 있습니다.';
    return;
  }

  const categories = (selected.categories || []).length
    ? (selected.categories || []).map(category => `<span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">${esc(category)}</span>`).join('')
    : '<span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">카테고리 없음</span>';
  const preview = selected.preview || '수집 미리보기가 아직 없습니다. 전체 상품 수집을 실행하면 문서 내용이 채워집니다.';
  const sourceLink = selected.pdf_url || selected.url;

  detailEl.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs uppercase tracking-wider text-slate-400">${esc(selected.company || '-')}</div>
        <h4 class="display-font mt-1 text-lg font-bold text-slate-800">${esc(selected.card_name || '-')}</h4>
      </div>
      <div class="text-right text-xs text-slate-400">
        <div>${esc(selected.published_date || '-')}</div>
        <div class="mt-1">${esc(selected.card_type || '카드')}</div>
      </div>
    </div>
    <div class="mt-3 flex flex-wrap gap-1.5">${categories}</div>
    <div class="mt-4 grid gap-2 sm:grid-cols-2">
      <div class="rounded-xl border border-slate-200 bg-white px-3 py-3">
        <div class="text-[11px] font-bold text-slate-500">수집 시각</div>
        <div class="mt-1 text-sm text-slate-700">${esc(formatShortDateTime(selected.collected_at))}</div>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white px-3 py-3">
        <div class="text-[11px] font-bold text-slate-500">문서</div>
        <div class="mt-1 text-sm text-slate-700">${selected.has_pdf ? '확보됨' : '미확보'}</div>
      </div>
    </div>
    <div class="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-4">
      <div class="text-[11px] font-bold text-slate-500">미리보기</div>
      <p class="mt-2 whitespace-pre-line leading-6 text-slate-700">${esc(preview)}</p>
    </div>
    ${sourceLink ? `<div class="mt-4"><a href="${esc(sourceLink)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"><i class="fas fa-up-right-from-square text-xs"></i>원문 보기</a></div>` : ''}
  `;
}

async function searchProducts() {
  const input = document.getElementById('productSearchInput');
  PRODUCT_ACTIVE_QUERY = String(input?.value || '').trim();
  renderProductsWorkspace();
}

function clearProductSearch() {
  PRODUCT_ACTIVE_QUERY = '';
  const input = document.getElementById('productSearchInput');
  if (input) input.value = '';
  renderProductsWorkspace();
}

async function loadRelatedCards(eventId) {
  document.getElementById('rag-related-cards')?.remove();
}

function renderRelatedCards(container, payload) {
  const cards = payload.related_cards || [];
  if (!cards.length) {
    container.innerHTML = '';
    return;
  }

  let html = '<div class="border-t border-slate-200 pt-4 mt-1 mb-3">';
  html += '<h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">';
  html += '<i class="fas fa-credit-card mr-1.5 text-indigo-500"></i>Related card products</h4>';

  cards.forEach(card => {
    const meta = card.metadata || {};
    const similarity = card.similarity ? `${Math.round(card.similarity * 100)}%` : '-';
    html += `
      <div class="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-2">
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <span class="text-xs font-bold text-indigo-900">${esc(meta.company || '-')} | ${esc(meta.card_name || 'Unknown card')}</span>
          <span class="text-[10px] bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded">Match ${esc(similarity)}</span>
        </div>
        ${(meta.categories || []).length ? `<div class="flex flex-wrap gap-1 mb-2">${(meta.categories || []).slice(0, 3).map(category => `<span class="text-[10px] bg-white text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">${esc(category)}</span>`).join('')}</div>` : ''}
        <p class="text-xs text-indigo-800 leading-relaxed whitespace-pre-line">${esc((card.text || '').substring(0, 260))}</p>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

function renderReviewWorkspace() {
  const needsReview = ALL.filter(isNeedsReview);
  const curated = ALL.filter(isCurated);
  const ready = ALL.filter(e => !isNeedsReview(e) && !isCurated(e));
  const lockedCount = ALL.filter(e => Number(e?.locked || 0) > 0).length;

  setText('reviewNeedsCountCard', String(needsReview.length));
  setText('reviewCuratedCountCard', String(curated.length));
  setText('reviewReadyCountCard', String(ready.length));
  setText('reviewLockedCountCard', String(lockedCount));
  setText('reviewQueueMeta', `${REVIEW_QUEUE.length || needsReview.length}건`);

  const queue = (REVIEW_QUEUE.length ? REVIEW_QUEUE : needsReview).slice(0, 10);
  const queueBody = document.getElementById('reviewQueueBody');
  const queueEmpty = document.getElementById('reviewQueueEmpty');
  if (queueBody) {
    if (!queue.length) {
      queueBody.innerHTML = '';
      queueEmpty?.classList.remove('hidden');
    } else {
      queueEmpty?.classList.add('hidden');
      queueBody.innerHTML = queue.map(event => {
        const quality = asPercentScore(event.detail_quality_score);
        const confidence = asPercentScore(event.classification_confidence);
        return `
          <tr class="cursor-pointer hover:bg-slate-50" onclick="showPage('events'); openDetail(${event.id})">
            <td class="px-4 py-3">
              <div class="font-medium text-slate-800">${esc(event.title || `Event #${event.id}`)}</div>
              <div class="text-xs text-slate-500 mt-1">${esc(event.company || '-')}</div>
            </td>
            <td class="px-4 py-3 text-slate-600">${esc(event.review_reason || '추출 필드와 분류 결과를 확인하세요')}</td>
            <td class="px-4 py-3 text-slate-600">${quality == null ? '-' : `${quality}%`}</td>
            <td class="px-4 py-3 text-slate-600">${confidence == null ? '-' : `${confidence}%`}</td>
          </tr>
        `;
      }).join('');
    }
  }

  const auditBody = document.getElementById('reviewAuditBody');
  const auditEmpty = document.getElementById('reviewAuditEmpty');
  setText('reviewAuditMeta', AUDIT_LOG.length ? `${AUDIT_LOG.length}건 최근 수정` : '최근 변경');
  if (auditBody) {
    if (!AUDIT_LOG.length) {
      auditBody.innerHTML = '';
      auditEmpty?.classList.remove('hidden');
    } else {
      auditEmpty?.classList.add('hidden');
      auditBody.innerHTML = AUDIT_LOG.slice(0, 8).map(item => `
        <div class="px-4 py-3">
          <div class="flex items-center justify-between gap-3">
            <div class="font-medium text-slate-700">${esc(item.field_name || '필드')}</div>
            <div class="text-[11px] text-slate-400">${esc(formatShortDateTime(item.edited_at))}</div>
          </div>
          <div class="mt-1 text-xs text-slate-500">Event #${item.event_id || '-'} · ${esc(item.editor || 'admin')}</div>
          <div class="mt-2 text-xs text-slate-600">
            <span class="text-rose-500">${esc(item.old_value || '(empty)')}</span>
            <span class="mx-1 text-slate-300">→</span>
            <span class="text-emerald-600">${esc(item.new_value || '(empty)')}</span>
          </div>
        </div>
      `).join('');
    }
  }
}

function renderOpsWorkspace(prog) {
  const running = !!prog?.running;
  const phase = prog?.phase || 'idle';
  const badgeTone = running ? 'text-amber-500' : 'text-blue-500';
  const badgeText = running ? `실행 중: ${phase}` : '대기';
  const lastFinished = prog?.last_finished?.at ? formatShortDateTime(prog.last_finished.at) : '-';
  const lastIngest = prog?.last_ingest_at ? formatShortDateTime(prog.last_ingest_at) : '-';
  const geminiErrors = Array.isArray(LATEST_STATS?.gemini_errors) ? LATEST_STATS.gemini_errors : [];

  setHtml(
    'opsPipelineBadge',
    `<i class="fas fa-gauge-high ${badgeTone}"></i><strong>${esc(badgeText)}</strong>`
  );
  setText('opsProgressMeta', running ? `현재 단계: ${phase}` : `마지막 완료: ${lastFinished}`);
  setHtml(
    'opsProgressSummary',
    [
      `<div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">마지막 수집: <strong>${esc(lastIngest)}</strong></div>`,
      `<div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">마지막 전체 실행: <strong>${esc(lastFinished)}</strong></div>`,
      `<div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">세션 내 Gemini 오류: <strong>${geminiErrors.length}</strong></div>`,
    ].join('')
  );

  const opsLogBody = document.getElementById('opsLogBody');
  if (!opsLogBody) return;
  const entries = [];
  if (prog?.last_finished?.at) {
    const ext = prog.last_finished.extract_result || {};
    entries.push({
      title: '전체 파이프라인',
      meta: formatShortDateTime(prog.last_finished.at),
      body: `성공 ${ext.succeeded || 0}, 실패 ${ext.failed || 0}, 처리 ${ext.processed || 0}`,
    });
  }
  if (prog?.last_ingest_at) {
    entries.push({
      title: '수집',
      meta: formatShortDateTime(prog.last_ingest_at),
      body: `신규 이벤트 ${(prog.last_ingest_result || {}).ingested || 0}건`,
    });
  }
  geminiErrors.slice(-2).reverse().forEach((err, idx) => {
    entries.push({
      title: `Gemini 오류 ${idx + 1}`,
      meta: formatShortDateTime(err.at),
      body: err.message || err.kind || '알 수 없는 오류',
    });
  });

  setText('opsLogMeta', entries.length ? `${entries.length}건 최근 작업` : '최근 작업');
  opsLogBody.innerHTML = entries.length ? entries.map(entry => `
    <div class="px-4 py-3">
      <div class="flex items-center justify-between gap-3">
        <div class="font-medium text-slate-700">${esc(entry.title)}</div>
        <div class="text-[11px] text-slate-400">${esc(entry.meta)}</div>
      </div>
      <div class="mt-1 text-sm text-slate-600">${esc(entry.body)}</div>
    </div>
  `).join('') : '<div class="px-4 py-8 text-sm text-slate-400">운영 이력이 없습니다.</div>';
}

function updateWorkspaceStatusChips() {
  const summary = getBridgeSummary();
  const activeCount = summary.active_events || ALL.filter(isActive).length;
  const productCount = summary.products || PRODUCT_CATALOG.length;
  const bridgeCount = summary.companies_with_both || 0;
  setChipValue('statusChipEvents', `${activeCount}`);
  setChipValue('statusChipProducts', `${productCount}`);
  setChipValue('statusChipBridge', `${bridgeCount}`);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseEventDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) {
    return new Date(direct.getFullYear(), direct.getMonth(), direct.getDate());
  }

  const normalized = raw.replace(/\./g, '-').replace(/\//g, '-').replace(/\s+/g, '');
  const normalizedDate = new Date(normalized);
  if (!Number.isNaN(normalizedDate.getTime())) {
    return new Date(normalizedDate.getFullYear(), normalizedDate.getMonth(), normalizedDate.getDate());
  }

  const match = raw.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function renderWeeklyChanges() {
  const el = document.getElementById('actionWeekly');
  if (!el) return;
  if (!Array.isArray(window.WEEKLY_DISCLOSURE_PRODUCTS)) {
    el.innerHTML = '<p class="text-xs text-slate-400">주간 변화를 불러오는 중입니다...</p>';
  }

  const now = new Date();
  const dayOfWeek = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const month = now.getMonth() + 1;
  const weekNum = Math.ceil(now.getDate() / 7);
  const weekLabel = `${month}월 ${weekNum}주차`;
  const companyOrder = ['신한카드', 'KB국민카드', '삼성카드', '현대카드'];

  const newEvents = ALL.filter((event) => {
    const date = parseEventDate(event?.period_start);
    return date && date >= monday && date <= sunday;
  });
  const endingEvents = ALL.filter((event) => {
    const date = parseEventEndDate(event);
    return date && date >= monday && date <= sunday;
  });

  let productCatalog = Array.isArray(window.WEEKLY_DISCLOSURE_PRODUCTS)
    ? window.WEEKLY_DISCLOSURE_PRODUCTS
    : [];
  if (!productCatalog.length) {
    try {
      const response = await fetch('/api/disclosures?new_only=false');
      const payload = response.ok ? await response.json() : {};
      productCatalog = Array.isArray(payload?.products) ? payload.products : [];
      window.WEEKLY_DISCLOSURE_PRODUCTS = productCatalog;
    } catch (_) {
      productCatalog = Array.isArray(PRODUCT_CATALOG) ? PRODUCT_CATALOG : [];
    }
  }
  productCatalog = Array.from(new Map(productCatalog.map((item) => [`${item?.company || ''}::${item?.card_name || ''}`, item])).values());
  const getProductLaunchDate = (product) =>
    parseEventDate(product?.launch_date) ||
    parseEventDate(product?.published_date) ||
    parseEventDate(product?.effective_date) ||
    parseEventDate(product?.collected_at);
  const getProductStopDate = (product) => {
    const raw = String(product?.discontinue_date || '').trim();
    if (!raw || raw.startsWith('9999')) return null;
    return parseEventDate(raw);
  };
  const launchedProducts = productCatalog
    .filter((product) => {
      const date = getProductLaunchDate(product);
      return date && date >= monday && date <= sunday;
    })
    .sort((left, right) => (getProductLaunchDate(right)?.getTime() || 0) - (getProductLaunchDate(left)?.getTime() || 0));
  const endingProducts = productCatalog
    .filter((product) => {
      const date = getProductStopDate(product);
      return date && date >= monday && date <= sunday;
    })
    .sort((left, right) => (getProductStopDate(left)?.getTime() || 0) - (getProductStopDate(right)?.getTime() || 0));

  const groupByCompany = (items, selector) => {
    const grouped = {};
    items.forEach((item) => {
      const company = selector(item) || '기타';
      (grouped[company] = grouped[company] || []).push(item);
    });
    return grouped;
  };
  const companyKeys = (groups) => {
    const ordered = companyOrder.filter((company) => groups[company]?.length);
    Object.keys(groups).filter((company) => !companyOrder.includes(company)).forEach((company) => ordered.push(company));
    return ordered;
  };
  const renderGroupedSection = ({ title, icon, titleClass, groups, items, itemRenderer, itemClass = '' }) => {
    if (!items.length) return '';
    let section = `<div class="mb-3"><p class="text-xs font-bold ${titleClass} mb-1.5"><i class="fas fa-${icon} mr-1"></i>${title}</p>`;
    companyKeys(groups).forEach((company) => {
      const entries = groups[company] || [];
      section += `<div class="mb-2"><span class="${pillCls(company)} badge-sm">${esc(coTag(company))}</span><span class="text-[11px] text-slate-400 ml-1">${entries.length}건</span>`;
      section += '<div class="ml-1 mt-1 space-y-0.5">';
      entries.slice(0, 3).forEach((item) => {
        section += `<div class="text-[11px] text-slate-600 truncate ${itemClass}">${itemRenderer(item)}</div>`;
      });
      if (entries.length > 3) {
        section += `<div class="text-[11px] text-slate-400">외 ${entries.length - 3}건</div>`;
      }
      section += '</div></div>';
    });
    section += '</div>';
    return section;
  };

  const byNewCompany = groupByCompany(newEvents, (item) => item.company);
  const byEndingCompany = groupByCompany(endingEvents, (item) => item.company);
  const byLaunchCompany = groupByCompany(launchedProducts, (item) => item.company);
  const byStopCompany = groupByCompany(endingProducts, (item) => item.company);
  const rangeLabel = `${monday.getMonth() + 1}/${monday.getDate()} ~ ${sunday.getMonth() + 1}/${sunday.getDate()}`;
  const renderMetricCard = (value, label, tone) => `
    <div class="weekly-stat-card ${tone}">
      <div class="weekly-stat-value">${value}</div>
      <div class="weekly-stat-label">${label}</div>
    </div>
  `;
  const renderEmpty = (message) => `<div class="weekly-empty">${message}</div>`;
  const renderCompanyGroups = ({ groups, items, sectionTone, itemRenderer }) => {
    if (!items.length) {
      return renderEmpty('해당 주간 변화가 없습니다.');
    }
    let section = '';
    companyKeys(groups).forEach((company) => {
      const entries = groups[company] || [];
      section += `<div class="weekly-company-group">`;
      section += `<div class="weekly-company-head"><span class="${pillCls(company)} badge-sm">${esc(coTag(company))}</span><span class="weekly-company-count">${entries.length}건</span></div>`;
      section += '<div class="weekly-item-list">';
      entries.slice(0, 3).forEach((item) => {
        section += `<div class="weekly-item ${sectionTone}">${itemRenderer(item)}</div>`;
      });
      if (entries.length > 3) {
        section += `<div class="weekly-more">외 ${entries.length - 3}건</div>`;
      }
      section += '</div></div>';
    });
    return section;
  };

  let html = '<div class="weekly-board">';
  html += `<div class="weekly-board-head">
    <div class="weekly-board-week">${weekLabel}</div>
    <div class="weekly-board-range">${rangeLabel}</div>
  </div>`;

  html += `<div class="weekly-stat-grid">
    ${renderMetricCard(newEvents.length, '이벤트 시작', 'start')}
    ${renderMetricCard(endingEvents.length, '이벤트 종료 예정', 'end')}
    ${renderMetricCard(launchedProducts.length, '상품 출시', 'launch')}
    ${renderMetricCard(endingProducts.length, '발급중단 예정', 'stop')}
  </div>`;

  html += `<div class="weekly-column-grid">
    <section class="weekly-column">
      <div class="weekly-section-title start"><i class="fas fa-play-circle"></i><span>이번주 신규 이벤트</span></div>
      ${renderCompanyGroups({
        groups: byNewCompany,
        items: newEvents,
        sectionTone: 'is-clickable',
        itemRenderer: (event) => `
          <button type="button" onclick="openDetail(${Number(event.id)})">
            ${esc((event.title || '').substring(0, 54))}
          </button>
        `,
      })}
    </section>
    <section class="weekly-column">
      <div class="weekly-section-title end"><i class="fas fa-hourglass-end"></i><span>이번주 종료 예정 이벤트</span></div>
      ${renderCompanyGroups({
        groups: byEndingCompany,
        items: endingEvents,
        sectionTone: 'is-clickable',
        itemRenderer: (event) => {
          const endDate = parseEventEndDate(event);
          const endLabel = endDate ? fmtDate(endDate) : '';
          return `
            <button type="button" onclick="openDetail(${Number(event.id)})">
              ${esc((event.title || '').substring(0, 46))}
            </button>
            ${endLabel ? `<span class="weekly-item-date">${esc(endLabel)}</span>` : ''}
          `;
        },
      })}
    </section>
  </div>`;

  html += `<div class="weekly-divider">
    <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
      <div class="weekly-section-title product"><i class="fas fa-credit-card"></i><span>이번주 상품 변화</span></div>
      <span class="text-[10px] font-semibold text-slate-400">상품 공시 기준</span>
    </div>
    <div class="space-y-4">
      <section>
        <div class="weekly-section-title product mb-1"><i class="fas fa-sparkles"></i><span>이번주 출시 상품</span></div>
        ${renderCompanyGroups({
          groups: byLaunchCompany,
          items: launchedProducts,
          sectionTone: '',
          itemRenderer: (product) => {
            const dateLabel = product.launch_date || product.published_date || product.effective_date || '';
            return `
              <span>${esc((product.card_name || '').substring(0, 54))}</span>
              ${dateLabel ? `<span class="weekly-item-date">${esc(dateLabel)}</span>` : ''}
            `;
          },
        })}
      </section>
      ${endingProducts.length ? `
        <section>
          <div class="weekly-section-title stop mb-1"><i class="fas fa-ban"></i><span>이번주 발급중단 예정 상품</span></div>
          ${renderCompanyGroups({
            groups: byStopCompany,
            items: endingProducts,
            sectionTone: '',
            itemRenderer: (product) => `
              <span>${esc((product.card_name || '').substring(0, 54))}</span>
              ${product.discontinue_date ? `<span class="weekly-item-date">${esc(product.discontinue_date)}</span>` : ''}
            `,
          })}
        </section>
      ` : ''}
    </div>
  </div>`;

  if (!newEvents.length && !endingEvents.length && !launchedProducts.length && !endingProducts.length) {
    html += renderEmpty('이번주 변화가 없습니다.');
  }

  html += '</div>';
  el.innerHTML = html;
}

function getEventDateRange(event) {
  let start = parseEventDate(event?.period_start);
  let end = parseEventDate(event?.period_end);
  const period = String(event?.period || '');
  if ((!start || !end) && period.includes('~')) {
    const [left, right] = period.split('~');
    if (!start) start = parseEventDate(left);
    if (!end) end = parseEventDate(right);
  }
  return { start, end };
}

function sameDay(left, right) {
  return left && right && formatDateKey(left) === formatDateKey(right);
}

function isEventLiveOnDate(event, date) {
  const { start, end } = getEventDateRange(event);
  if (start && end) return start <= date && date <= end;
  if (start && !end) return sameDay(start, date);
  if (!start && end) return sameDay(end, date);
  return false;
}

function setCalendarMode(mode) {
  CALENDAR_MODE = ['events', 'products', 'combined'].includes(mode) ? mode : 'combined';
  CALENDAR_SELECTED = null;
  renderCalendar();
}

function getProductLaunchDate(product) {
  return parseEventDate(product?.published_date) || parseEventDate(product?.collected_at);
}

function getCalendarProducts() {
  return PRODUCT_CATALOG.map(product => ({
    ...product,
    launchDate: getProductLaunchDate(product),
  })).filter(product => product.launchDate);
}

function getCalendarConfigLegacy() {
  if (CALENDAR_MODE === 'products') {
    return {
      mode: 'products',
      description: '상품 공시일 또는 최초 수집일 기준으로 신상품 출시 흐름을 캘린더에서 봅니다.',
      primaryLabel: '이번 달 신규 상품',
      secondaryLabel: '출시 카드사',
      tertiaryLabel: '최다 출시일',
      selectedTitle: 'Selected Launches',
      selectedIcon: 'fa-credit-card',
      emptyMessage: '선택한 날짜에 표시할 신상품이 없습니다.',
      emptySelection: '날짜를 선택하면 해당 일자에 감지된 신상품을 보여줍니다.',
      summaryUnit: 'products',
    };
  }

  return {
    mode: 'events',
    description: '이벤트 시작일, 종료일, 진행 구간을 월 단위로 확인합니다.',
    primaryLabel: '이번 달 시작 이벤트',
    secondaryLabel: '이번 달 종료 이벤트',
    tertiaryLabel: '가장 붐비는 날',
    selectedTitle: 'Selected Day',
    selectedIcon: 'fa-calendar-day',
    emptyMessage: '선택한 날짜에 표시할 이벤트가 없습니다.',
    emptySelection: '날짜를 선택하세요',
    summaryUnit: 'events',
  };
}

function updateCalendarModeUILegacy(config) {
  const eventsBtn = document.getElementById('calendarModeEvents');
  const productsBtn = document.getElementById('calendarModeProducts');
  const description = document.getElementById('calendarModeDescription');
  const panelTitle = document.getElementById('calendarPanelTitle');
  if (eventsBtn) {
    eventsBtn.className = `px-3 py-1.5 rounded-lg text-xs font-medium transition ${CALENDAR_MODE === 'events' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`;
  }
  if (productsBtn) {
    productsBtn.className = `px-3 py-1.5 rounded-lg text-xs font-medium transition ${CALENDAR_MODE === 'products' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`;
  }
  if (description) description.textContent = config.description;
  if (panelTitle) panelTitle.textContent = config.selectedTitle;

  const primaryLabel = document.getElementById('calendarMonthStarts')?.previousElementSibling;
  const secondaryLabel = document.getElementById('calendarMonthEnds')?.previousElementSibling;
  const tertiaryLabel = document.getElementById('calendarPeakDay')?.previousElementSibling;
  if (primaryLabel) primaryLabel.textContent = config.primaryLabel;
  if (secondaryLabel) secondaryLabel.textContent = config.secondaryLabel;
  if (tertiaryLabel) tertiaryLabel.textContent = config.tertiaryLabel;
}

function moveCalendarMonth(delta) {
  CALENDAR_MONTH = new Date(CALENDAR_MONTH.getFullYear(), CALENDAR_MONTH.getMonth() + delta, 1);
  CALENDAR_SELECTED = null;
  renderCalendar();
}

function selectCalendarDate(dateKey) {
  CALENDAR_SELECTED = dateKey;
  renderCalendar();
}

function renderCalendarLegacy() {
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;

  const monthStart = new Date(CALENDAR_MONTH.getFullYear(), CALENDAR_MONTH.getMonth(), 1);
  const monthEnd = new Date(CALENDAR_MONTH.getFullYear(), CALENDAR_MONTH.getMonth() + 1, 0);
  const todayKey = formatDateKey(new Date());
  const monthLabel = monthStart.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
  const calendarEvents = ALL.filter(event => matchesCalendarCompanyFilter(event.company));
  const calendarProducts = getCalendarProducts().filter(product => matchesCalendarCompanyFilter(product.company));
  setText('calendarMonthLabel', monthLabel);

  const inMonthDates = [];
  for (let day = 1; day <= monthEnd.getDate(); day += 1) {
    inMonthDates.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day));
  }
  const monthStats = inMonthDates.map(date => {
    const starts = ALL.filter(event => sameDay(getEventDateRange(event).start, date));
    const ends = ALL.filter(event => sameDay(getEventDateRange(event).end, date));
    const live = ALL.filter(event => isEventLiveOnDate(event, date));
    return { date, starts, ends, live };
  });

  setText('calendarMonthStarts', String(monthStats.reduce((sum, item) => sum + item.starts.length, 0)));
  setText('calendarMonthEnds', String(monthStats.reduce((sum, item) => sum + item.ends.length, 0)));
  const peak = monthStats.reduce((best, item) => item.live.length > best.live.length ? item : best, monthStats[0] || { date: null, live: [] });
  setText('calendarPeakDay', peak.date ? `${formatDateKey(peak.date)} · ${peak.live.length} live` : '-');

  if (!CALENDAR_SELECTED) {
    CALENDAR_SELECTED = inMonthDates.some(date => formatDateKey(date) === todayKey)
      ? todayKey
      : (inMonthDates[0] ? formatDateKey(inMonthDates[0]) : null);
  }

  const calendarMonthStats = inMonthDates.map(date => buildCalendarSnapshot(date, calendarEvents, calendarProducts));
  if (CALENDAR_MODE === 'products') {
    const peak = calendarMonthStats.reduce((best, item) => item.launches.length > best.launches.length ? item : best, calendarMonthStats[0] || { date: null, launches: [] });
    setText('calendarMonthStarts', String(calendarMonthStats.reduce((sum, item) => sum + item.launches.length, 0)));
    setText('calendarMonthEnds', String(new Set(calendarProducts.map(product => product.company).filter(Boolean)).size));
    setText('calendarPeakDay', peak.date ? `${formatShortDate(peak.date)} · ${peak.launches.length}개` : '-');
  } else if (CALENDAR_MODE === 'combined') {
    const peak = calendarMonthStats.reduce((best, item) => (item.live.length + item.launches.length) > (best.live.length + best.launches.length) ? item : best, calendarMonthStats[0] || { date: null, live: [], launches: [] });
    setText('calendarMonthStarts', String(calendarMonthStats.reduce((sum, item) => sum + item.starts.length, 0)));
    setText('calendarMonthEnds', String(calendarMonthStats.reduce((sum, item) => sum + item.launches.length, 0)));
    setText('calendarPeakDay', peak.date ? `${formatShortDate(peak.date)} · ${peak.live.length + peak.launches.length}건` : '-');
  } else {
    const peak = calendarMonthStats.reduce((best, item) => item.live.length > best.live.length ? item : best, calendarMonthStats[0] || { date: null, live: [] });
    setText('calendarMonthStarts', String(calendarMonthStats.reduce((sum, item) => sum + item.starts.length, 0)));
    setText('calendarMonthEnds', String(calendarMonthStats.reduce((sum, item) => sum + item.ends.length, 0)));
    setText('calendarPeakDay', peak.date ? `${formatShortDate(peak.date)} · ${peak.live.length}건` : '-');
  }

  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + index);
    const dateKey = formatDateKey(cellDate);
    const inMonth = cellDate.getMonth() === monthStart.getMonth();
    const starts = ALL.filter(event => sameDay(getEventDateRange(event).start, cellDate));
    const ends = ALL.filter(event => sameDay(getEventDateRange(event).end, cellDate));
    const live = ALL.filter(event => isEventLiveOnDate(event, cellDate));
    const selected = CALENDAR_SELECTED === dateKey;
    const isToday = todayKey === dateKey;
    cells.push(`
      <button
        type="button"
        onclick="selectCalendarDate('${dateKey}')"
        class="min-h-[112px] rounded-2xl border text-left px-3 py-3 transition ${selected ? 'border-blue-500 bg-blue-50 shadow-sm' : inMonth ? 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50' : 'border-slate-100 bg-slate-50 text-slate-300'}"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-semibold ${selected ? 'text-blue-700' : inMonth ? 'text-slate-700' : 'text-slate-400'}">${cellDate.getDate()}</span>
          ${isToday ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900 text-white">Today</span>' : ''}
        </div>
        <div class="mt-3 space-y-1 text-[11px]">
          <div class="${starts.length ? 'text-emerald-600' : 'text-slate-300'}">Start ${starts.length}</div>
          <div class="${ends.length ? 'text-rose-600' : 'text-slate-300'}">End ${ends.length}</div>
          <div class="${live.length ? 'text-blue-600 font-semibold' : 'text-slate-300'}">Live ${live.length}</div>
        </div>
      </button>
    `);
  }
  grid.innerHTML = cells.join('');

  renderCalendarDayPanel();
}

function renderCalendarDayPanelLegacy() {
  const label = document.getElementById('calendarSelectedLabel');
  const summary = document.getElementById('calendarSelectedSummary');
  const panel = document.getElementById('calendarDayEvents');
  if (!label || !summary || !panel) return;

  if (!CALENDAR_SELECTED) {
    label.textContent = '날짜를 선택하세요';
    summary.innerHTML = '<i class="fas fa-calendar-day text-blue-500"></i><strong>0 events</strong>';
    panel.innerHTML = '<div class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-slate-400">아직 선택된 날짜가 없습니다.</div>';
    return;
  }

  const selectedDate = parseEventDate(CALENDAR_SELECTED);
  if (!selectedDate) return;
  const dayStarts = [];
  const dayEnds = [];
  const dayLive = [];

  ALL.forEach(event => {
    const { start, end } = getEventDateRange(event);
    if (sameDay(start, selectedDate)) dayStarts.push(event);
    if (sameDay(end, selectedDate)) dayEnds.push(event);
    if (isEventLiveOnDate(event, selectedDate)) dayLive.push(event);
  });

  label.textContent = selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  summary.innerHTML = `<i class="fas fa-calendar-day text-blue-500"></i><strong>${dayLive.length} live</strong>`;

  const renderGroup = (title, items, tone) => {
    if (!items.length) return '';
    const toneClass = tone === 'start' ? 'border-emerald-200 bg-emerald-50' : tone === 'end' ? 'border-rose-200 bg-rose-50' : 'border-blue-200 bg-blue-50';
    const labelClass = tone === 'start' ? 'text-emerald-700' : tone === 'end' ? 'text-rose-700' : 'text-blue-700';
    return `
      <div class="space-y-2">
        <div class="text-xs font-bold uppercase tracking-[0.08em] ${labelClass}">${title}</div>
        ${items.slice(0, 8).map(event => `
          <button type="button" onclick="openDetail(${event.id})" class="w-full rounded-xl border ${toneClass} px-3 py-3 text-left hover:shadow-sm transition">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="font-medium text-slate-800 truncate">${esc(event.title || `Event #${event.id}`)}</div>
                <div class="mt-1 text-xs text-slate-500">${esc(event.period || '-')}</div>
              </div>
              <span class="${pillCls(event.company)} badge-sm shrink-0">${esc((event.company || '').replace('카드', ''))}</span>
            </div>
          </button>
        `).join('')}
      </div>
    `;
  };

  const parts = [
    renderGroup('Starting', dayStarts, 'start'),
    renderGroup('Ending', dayEnds, 'end'),
    renderGroup('Live events', dayLive, 'live'),
  ].filter(Boolean);

  panel.innerHTML = parts.length
    ? parts.join('')
    : '<div class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-slate-400">선택한 날짜에 표시할 이벤트가 없습니다.</div>';
}

function ensureCalendarScaffold() {
  const section = document.getElementById('tab-calendar');
  if (!section || section.dataset.calendarScaffold === 'v3') return;

  section.innerHTML = `
    <div class="section-card">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="display-font text-sm font-bold text-slate-700">통합 달력</h3>
          <p id="calendarModeDescription" class="text-xs text-slate-500 mt-1">
            이벤트 일정과 상품 출시를 한 화면에서 함께 봅니다.
          </p>
        </div>
        <div class="flex items-center gap-2 flex-wrap justify-end">
          <div class="inline-flex rounded-xl border border-slate-300 bg-white p-1">
            <button
              id="calendarModeEvents"
              type="button"
              onclick="setCalendarMode('events')"
              class="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              이벤트
            </button>
            <button
              id="calendarModeProducts"
              type="button"
              onclick="setCalendarMode('products')"
              class="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100"
            >
              상품
            </button>
            <button
              id="calendarModeCombined"
              type="button"
              onclick="setCalendarMode('combined')"
              class="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100"
            >
              함께 보기
            </button>
          </div>
          <div class="min-w-[180px]">
            <div id="calendarCompanyFilterLabel" class="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 mb-1">카드사</div>
            <select
              id="calendarCompanyFilter"
              onchange="setCalendarCompanyFilter(this.value)"
              class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">전체 카드사</option>
            </select>
          </div>
          <button type="button" onclick="moveCalendarMonth(-1)" class="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100">
            <i class="fas fa-chevron-left"></i>
          </button>
          <span id="calendarMonthLabel" class="text-sm font-semibold text-slate-700 min-w-[110px] text-center">-</span>
          <button type="button" onclick="moveCalendarMonth(1)" class="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
      <div class="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
        <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div id="calendarMonthStartsLabel" class="text-xs text-slate-500">이번 달 이벤트 시작</div>
          <div id="calendarMonthStarts" class="text-lg font-bold text-slate-800 mt-1">0</div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div id="calendarMonthEndsLabel" class="text-xs text-slate-500">이번 달 신규 상품</div>
          <div id="calendarMonthEnds" class="text-lg font-bold text-slate-800 mt-1">0</div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div id="calendarPeakDayLabel" class="text-xs text-slate-500">동시 발생 최다일</div>
          <div id="calendarPeakDay" class="text-sm font-bold text-slate-800 mt-1">-</div>
        </div>
      </div>
    </div>

    <div class="grid xl:grid-cols-[1.15fr_.85fr] gap-4">
      <div class="section-card">
        <div class="grid grid-cols-7 gap-2 mb-2 text-[11px] font-bold tracking-[0.08em] text-slate-400">
          <div class="text-center">일</div>
          <div class="text-center">월</div>
          <div class="text-center">화</div>
          <div class="text-center">수</div>
          <div class="text-center">목</div>
          <div class="text-center">금</div>
          <div class="text-center">토</div>
        </div>
        <div id="calendarGrid" class="grid grid-cols-7 gap-2"></div>
      </div>

      <div class="section-card">
        <div class="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 id="calendarPanelTitle" class="display-font text-sm font-bold text-slate-700">선택한 날짜</h3>
            <p id="calendarSelectedLabel" class="text-xs text-slate-500 mt-1">날짜를 선택하면 이벤트와 상품을 함께 확인할 수 있습니다.</p>
          </div>
          <span id="calendarSelectedSummary" class="status-chip"><i class="fas fa-layer-group text-emerald-500"></i><strong>0 항목</strong></span>
        </div>
        <div id="calendarDayEvents" class="space-y-2 text-sm text-slate-600">
          <div class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-slate-400">
            선택한 날짜 데이터가 없습니다.
          </div>
        </div>
      </div>
    </div>
  `;

  section.dataset.calendarScaffold = 'v3';
}

function getCalendarConfig() {
  if (CALENDAR_MODE === 'products') {
    return {
      mode: 'products',
      description: '상품 출시일과 최초 수집일을 기준으로 상품 흐름을 봅니다.',
      companyLabel: '카드사',
      allCompaniesLabel: '전체 카드사',
      primaryLabel: '이번 달 신규 상품',
      secondaryLabel: '출시 카드사',
      tertiaryLabel: '최다 출시일',
      selectedTitle: '선택한 날짜',
      selectedIcon: 'fa-credit-card',
      selectedIconTone: 'text-indigo-500',
      emptyMessage: '선택한 날짜에 등록된 상품이 없습니다.',
      emptySelection: '날짜를 선택하면 상품 출시를 확인할 수 있습니다.',
      summaryUnit: '상품',
    };
  }

  if (CALENDAR_MODE === 'combined') {
    return {
      mode: 'combined',
      description: '이벤트 일정과 상품 출시를 한 화면에서 함께 봅니다.',
      companyLabel: '카드사',
      allCompaniesLabel: '전체 카드사',
      primaryLabel: '이번 달 이벤트 시작',
      secondaryLabel: '이번 달 신규 상품',
      tertiaryLabel: '동시 발생 최다일',
      selectedTitle: '선택한 날짜',
      selectedIcon: 'fa-layer-group',
      selectedIconTone: 'text-emerald-500',
      emptyMessage: '선택한 날짜에 표시할 이벤트나 상품이 없습니다.',
      emptySelection: '날짜를 선택하면 이벤트와 상품을 함께 확인할 수 있습니다.',
      summaryUnit: '항목',
    };
  }

  return {
    mode: 'events',
    description: '이벤트 시작일, 종료일, 진행 구간을 날짜별로 봅니다.',
    companyLabel: '카드사',
    allCompaniesLabel: '전체 카드사',
    primaryLabel: '이번 달 시작',
    secondaryLabel: '이번 달 종료',
    tertiaryLabel: '최다 진행일',
    selectedTitle: '선택한 날짜',
    selectedIcon: 'fa-calendar-day',
    selectedIconTone: 'text-blue-500',
    emptyMessage: '선택한 날짜에 해당하는 이벤트가 없습니다.',
    emptySelection: '날짜를 선택하면 이벤트를 확인할 수 있습니다.',
    summaryUnit: '이벤트',
  };
}

function setCalendarCompanyFilter(value) {
  CALENDAR_COMPANY_FILTER = value || '';
  renderCalendar();
}

function matchesCalendarCompanyFilter(company) {
  return !CALENDAR_COMPANY_FILTER || (company || '') === CALENDAR_COMPANY_FILTER;
}

function getCalendarCompanyOptions() {
  const source = CALENDAR_MODE === 'events'
    ? ALL
    : CALENDAR_MODE === 'products'
      ? getCalendarProducts()
      : [...ALL, ...getCalendarProducts()];
  return [...new Set(source.map(item => item.company).filter(Boolean))].sort((left, right) => left.localeCompare(right, 'ko-KR'));
}

function buildCalendarSnapshot(date, calendarEvents, calendarProducts) {
  const starts = calendarEvents.filter(event => sameDay(getEventDateRange(event).start, date));
  const ends = calendarEvents.filter(event => sameDay(getEventDateRange(event).end, date));
  const live = calendarEvents.filter(event => isEventLiveOnDate(event, date));
  const launches = calendarProducts.filter(product => sameDay(product.launchDate, date));
  return {
    date,
    starts,
    ends,
    live,
    launches,
    brands: new Set(launches.map(product => product.company).filter(Boolean)),
  };
}

function syncCalendarCompanyFilterUI(config) {
  const filterLabel = document.getElementById('calendarCompanyFilterLabel');
  const filterSelect = document.getElementById('calendarCompanyFilter');
  if (!filterSelect) return;

  const options = getCalendarCompanyOptions();
  if (CALENDAR_COMPANY_FILTER && !options.includes(CALENDAR_COMPANY_FILTER)) {
    CALENDAR_COMPANY_FILTER = '';
  }

  filterSelect.innerHTML = [
    `<option value="">${esc(config.allCompaniesLabel)}</option>`,
    ...options.map(company => `<option value="${esc(company)}">${esc(company)}</option>`),
  ].join('');
  filterSelect.value = CALENDAR_COMPANY_FILTER;
  if (filterLabel) filterLabel.textContent = config.companyLabel;
}

function updateCalendarModeUI(config) {
  const eventsBtn = document.getElementById('calendarModeEvents');
  const productsBtn = document.getElementById('calendarModeProducts');
  const combinedBtn = document.getElementById('calendarModeCombined');
  const description = document.getElementById('calendarModeDescription');
  const panelTitle = document.getElementById('calendarPanelTitle');
  const primaryLabel = document.getElementById('calendarMonthStartsLabel');
  const secondaryLabel = document.getElementById('calendarMonthEndsLabel');
  const tertiaryLabel = document.getElementById('calendarPeakDayLabel');

  if (eventsBtn) {
    eventsBtn.className = `px-3 py-1.5 rounded-lg text-xs font-medium transition ${CALENDAR_MODE === 'events' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`;
  }
  if (productsBtn) {
    productsBtn.className = `px-3 py-1.5 rounded-lg text-xs font-medium transition ${CALENDAR_MODE === 'products' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`;
  }
  if (combinedBtn) {
    combinedBtn.className = `px-3 py-1.5 rounded-lg text-xs font-medium transition ${CALENDAR_MODE === 'combined' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`;
  }
  if (description) description.textContent = config.description;
  if (panelTitle) panelTitle.textContent = config.selectedTitle;
  if (primaryLabel) primaryLabel.textContent = config.primaryLabel;
  if (secondaryLabel) secondaryLabel.textContent = config.secondaryLabel;
  if (tertiaryLabel) tertiaryLabel.textContent = config.tertiaryLabel;
}

function renderCalendarCombinedLegacy() {
  ensureCalendarScaffold();

  const grid = document.getElementById('calendarGrid');
  if (!grid) return;

  const config = getCalendarConfig();
  updateCalendarModeUI(config);
  syncCalendarCompanyFilterUI(config);

  const monthStart = new Date(CALENDAR_MONTH.getFullYear(), CALENDAR_MONTH.getMonth(), 1);
  const monthEnd = new Date(CALENDAR_MONTH.getFullYear(), CALENDAR_MONTH.getMonth() + 1, 0);
  const todayKey = formatDateKey(new Date());
  const monthLabel = monthStart.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
  setText('calendarMonthLabel', monthLabel);

  const inMonthDates = [];
  for (let day = 1; day <= monthEnd.getDate(); day += 1) {
    inMonthDates.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day));
  }

  if (!CALENDAR_SELECTED) {
    CALENDAR_SELECTED = inMonthDates.some(date => formatDateKey(date) === todayKey)
      ? todayKey
      : (inMonthDates[0] ? formatDateKey(inMonthDates[0]) : null);
  }

  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const cells = [];

  if (CALENDAR_MODE === 'products') {
    const products = getCalendarProducts().filter(product => matchesCalendarCompanyFilter(product.company));
    const monthProducts = products.filter(product => product.launchDate?.getMonth() === monthStart.getMonth() && product.launchDate?.getFullYear() === monthStart.getFullYear());
    const monthBrands = new Set(monthProducts.map(product => product.company).filter(Boolean));
    const peak = inMonthDates.reduce((best, date) => {
      const launches = products.filter(product => sameDay(product.launchDate, date));
      return launches.length > best.launches.length ? { date, launches } : best;
    }, { date: null, launches: [] });

    setText('calendarMonthStarts', String(monthProducts.length));
    setText('calendarMonthEnds', String(monthBrands.size));
    setText('calendarPeakDay', peak.date ? `${formatDateKey(peak.date)} · ${peak.launches.length} launches` : '-');

    for (let index = 0; index < 42; index += 1) {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + index);
      const dateKey = formatDateKey(cellDate);
      const inMonth = cellDate.getMonth() === monthStart.getMonth();
      const launches = products.filter(product => sameDay(product.launchDate, cellDate));
      const brands = new Set(launches.map(product => product.company).filter(Boolean));
      const leadProduct = launches[0]?.card_name || '';
      const selected = CALENDAR_SELECTED === dateKey;
      const isToday = todayKey === dateKey;

      cells.push(`
        <button
          type="button"
          onclick="selectCalendarDate('${dateKey}')"
          class="min-h-[112px] rounded-2xl border text-left px-3 py-3 transition ${selected ? 'border-indigo-500 bg-indigo-50 shadow-sm' : inMonth ? 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50' : 'border-slate-100 bg-slate-50 text-slate-300'}"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-semibold ${selected ? 'text-indigo-700' : inMonth ? 'text-slate-700' : 'text-slate-400'}">${cellDate.getDate()}</span>
            ${isToday ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900 text-white">Today</span>' : ''}
          </div>
          <div class="mt-3 space-y-1 text-[11px]">
            <div class="${launches.length ? 'text-indigo-600 font-semibold' : 'text-slate-300'}">Launch ${launches.length}</div>
            <div class="${brands.size ? 'text-slate-600' : 'text-slate-300'}">Brands ${brands.size}</div>
            <div class="${leadProduct ? 'text-slate-500 truncate' : 'text-slate-300'}">${leadProduct ? esc(leadProduct) : 'No release'}</div>
          </div>
        </button>
      `);
    }
  } else {
    const calendarEvents = ALL.filter(event => matchesCalendarCompanyFilter(event.company));
    const monthStats = inMonthDates.map(date => {
      const starts = calendarEvents.filter(event => sameDay(getEventDateRange(event).start, date));
      const ends = calendarEvents.filter(event => sameDay(getEventDateRange(event).end, date));
      const live = calendarEvents.filter(event => isEventLiveOnDate(event, date));
      return { date, starts, ends, live };
    });

    setText('calendarMonthStarts', String(monthStats.reduce((sum, item) => sum + item.starts.length, 0)));
    setText('calendarMonthEnds', String(monthStats.reduce((sum, item) => sum + item.ends.length, 0)));
    const peak = monthStats.reduce((best, item) => item.live.length > best.live.length ? item : best, monthStats[0] || { date: null, live: [] });
    setText('calendarPeakDay', peak.date ? `${formatDateKey(peak.date)} · ${peak.live.length} live` : '-');

    for (let index = 0; index < 42; index += 1) {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + index);
      const dateKey = formatDateKey(cellDate);
      const inMonth = cellDate.getMonth() === monthStart.getMonth();
      const starts = calendarEvents.filter(event => sameDay(getEventDateRange(event).start, cellDate));
      const ends = calendarEvents.filter(event => sameDay(getEventDateRange(event).end, cellDate));
      const live = calendarEvents.filter(event => isEventLiveOnDate(event, cellDate));
      const selected = CALENDAR_SELECTED === dateKey;
      const isToday = todayKey === dateKey;

      cells.push(`
        <button
          type="button"
          onclick="selectCalendarDate('${dateKey}')"
          class="min-h-[112px] rounded-2xl border text-left px-3 py-3 transition ${selected ? 'border-blue-500 bg-blue-50 shadow-sm' : inMonth ? 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50' : 'border-slate-100 bg-slate-50 text-slate-300'}"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-semibold ${selected ? 'text-blue-700' : inMonth ? 'text-slate-700' : 'text-slate-400'}">${cellDate.getDate()}</span>
            ${isToday ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900 text-white">Today</span>' : ''}
          </div>
          <div class="mt-3 space-y-1 text-[11px]">
            <div class="${starts.length ? 'text-emerald-600' : 'text-slate-300'}">Start ${starts.length}</div>
            <div class="${ends.length ? 'text-rose-600' : 'text-slate-300'}">End ${ends.length}</div>
            <div class="${live.length ? 'text-blue-600 font-semibold' : 'text-slate-300'}">Live ${live.length}</div>
          </div>
        </button>
      `);
    }
  }

  cells.length = 0;
  for (let index = 0; index < 42; index += 1) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + index);
    const dateKey = formatDateKey(cellDate);
    const inMonth = cellDate.getMonth() === monthStart.getMonth();
    const snapshot = buildCalendarSnapshot(cellDate, calendarEvents, calendarProducts);
    const selected = CALENDAR_SELECTED === dateKey;
    const isToday = todayKey === dateKey;
    const tone = CALENDAR_MODE === 'products'
      ? {
          selected: 'border-indigo-500 bg-indigo-50 shadow-sm',
          normal: 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50',
          dim: 'border-slate-100 bg-slate-50 text-slate-300',
          number: selected ? 'text-indigo-700' : inMonth ? 'text-slate-700' : 'text-slate-400',
        }
      : CALENDAR_MODE === 'combined'
        ? {
            selected: 'border-emerald-500 bg-emerald-50 shadow-sm',
            normal: 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50',
            dim: 'border-slate-100 bg-slate-50 text-slate-300',
            number: selected ? 'text-emerald-700' : inMonth ? 'text-slate-700' : 'text-slate-400',
          }
        : {
            selected: 'border-blue-500 bg-blue-50 shadow-sm',
            normal: 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50',
            dim: 'border-slate-100 bg-slate-50 text-slate-300',
            number: selected ? 'text-blue-700' : inMonth ? 'text-slate-700' : 'text-slate-400',
          };

    const leadProduct = snapshot.launches[0]?.card_name || '';
    const metrics = CALENDAR_MODE === 'products'
      ? `
          <div class="mt-3 space-y-1 text-[11px]">
            <div class="${snapshot.launches.length ? 'text-indigo-600 font-semibold' : 'text-slate-300'}">상품 ${snapshot.launches.length}</div>
            <div class="${snapshot.brands.size ? 'text-slate-600' : 'text-slate-300'}">카드사 ${snapshot.brands.size}</div>
            <div class="${leadProduct ? 'text-slate-500 truncate' : 'text-slate-300'}">${leadProduct ? esc(leadProduct) : '출시 없음'}</div>
          </div>
        `
      : CALENDAR_MODE === 'combined'
        ? `
            <div class="mt-3 space-y-1 text-[11px]">
              <div class="${snapshot.live.length ? 'text-emerald-700 font-semibold' : 'text-slate-300'}">진행 ${snapshot.live.length}</div>
              <div class="${snapshot.launches.length ? 'text-indigo-600' : 'text-slate-300'}">상품 ${snapshot.launches.length}</div>
              <div class="${snapshot.starts.length ? 'text-blue-600' : 'text-slate-300'}">시작 ${snapshot.starts.length}</div>
            </div>
          `
        : `
            <div class="mt-3 space-y-1 text-[11px]">
              <div class="${snapshot.starts.length ? 'text-emerald-600' : 'text-slate-300'}">시작 ${snapshot.starts.length}</div>
              <div class="${snapshot.ends.length ? 'text-rose-600' : 'text-slate-300'}">종료 ${snapshot.ends.length}</div>
              <div class="${snapshot.live.length ? 'text-blue-600 font-semibold' : 'text-slate-300'}">진행 ${snapshot.live.length}</div>
            </div>
          `;

    cells.push(`
      <button
        type="button"
        onclick="selectCalendarDate('${dateKey}')"
        class="min-h-[112px] rounded-2xl border text-left px-3 py-3 transition ${selected ? tone.selected : inMonth ? tone.normal : tone.dim}"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-semibold ${tone.number}">${cellDate.getDate()}</span>
          ${isToday ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900 text-white">오늘</span>' : ''}
        </div>
        ${metrics}
      </button>
    `);
  }

  grid.innerHTML = cells.join('');
  renderCalendarDayPanel();
}

function renderCalendarDayPanelCombinedLegacy() {
  ensureCalendarScaffold();

  const label = document.getElementById('calendarSelectedLabel');
  const summary = document.getElementById('calendarSelectedSummary');
  const panel = document.getElementById('calendarDayEvents');
  if (!label || !summary || !panel) return;

  const config = getCalendarConfig();
  updateCalendarModeUI(config);

  if (!CALENDAR_SELECTED) {
    label.textContent = config.emptySelection;
    summary.innerHTML = `<i class="fas ${config.selectedIcon} ${config.selectedIconTone}"></i><strong>0 ${config.summaryUnit}</strong>`;
    panel.innerHTML = `<div class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-slate-400">${config.emptySelection}</div>`;
    return;
  }

  const selectedDate = parseEventDate(CALENDAR_SELECTED);
  if (!selectedDate) return;

  label.textContent = selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  const calendarEvents = ALL.filter(event => matchesCalendarCompanyFilter(event.company));
  const calendarProducts = getCalendarProducts().filter(product => matchesCalendarCompanyFilter(product.company));
  const snapshot = buildCalendarSnapshot(selectedDate, calendarEvents, calendarProducts);
  const summaryCount = CALENDAR_MODE === 'products'
    ? snapshot.launches.length
    : CALENDAR_MODE === 'combined'
      ? snapshot.live.length + snapshot.launches.length
      : snapshot.live.length;
  summary.innerHTML = `<i class="fas ${config.selectedIcon} ${config.selectedIconTone}"></i><strong>${summaryCount} ${config.summaryUnit}</strong>`;

  const renderEventGroup = (title, items, tone) => {
    if (!items.length) return '';
    const toneClass = tone === 'start' ? 'border-emerald-200 bg-emerald-50' : tone === 'end' ? 'border-rose-200 bg-rose-50' : 'border-blue-200 bg-blue-50';
    const labelClass = tone === 'start' ? 'text-emerald-700' : tone === 'end' ? 'text-rose-700' : 'text-blue-700';
    return `
      <div class="space-y-2">
        <div class="text-xs font-bold tracking-[0.08em] ${labelClass}">${title}</div>
        ${items.slice(0, 8).map(event => `
          <button type="button" onclick="openDetail(${event.id})" class="w-full rounded-xl border ${toneClass} px-3 py-3 text-left hover:shadow-sm transition">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="font-medium text-slate-800 truncate">${esc(event.title || `이벤트 #${event.id}`)}</div>
                <div class="mt-1 text-xs text-slate-500">${esc(event.period || '-')}</div>
              </div>
              <span class="${pillCls(event.company)} badge-sm shrink-0">${esc((event.company || '').replace('카드', ''))}</span>
            </div>
          </button>
        `).join('')}
      </div>
    `;
  };

  const renderProductGroup = (title, items) => {
    if (!items.length) return '';
    return `
      <div class="space-y-2">
        <div class="text-xs font-bold tracking-[0.08em] text-indigo-700">${title}</div>
        ${items.slice(0, 8).map(product => {
          const keyLiteral = JSON.stringify(getProductKey(product));
          const categories = (product.categories || []).slice(0, 3);
          const launchNote = product.published_date
            ? `출시일 ${esc(product.published_date)}`
            : (product.collected_at ? `수집일 ${esc(formatShortDateTime(product.collected_at))}` : '상품 목록 기준');
          return `
            <button type="button" onclick='showPage("products"); selectProductCard(${keyLiteral})' class="w-full rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-3 text-left hover:shadow-sm transition">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-xs text-slate-500">${esc(product.company || '-')}</div>
                  <div class="mt-1 font-medium text-slate-800 truncate">${esc(product.card_name || '이름 없는 상품')}</div>
                  <div class="mt-1 text-xs text-slate-500">${launchNote}</div>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    ${categories.length
                      ? categories.map(category => `<span class="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-600">${esc(category)}</span>`).join('')
                      : '<span class="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500">카테고리 없음</span>'}
                  </div>
                </div>
                <span class="badge-sm shrink-0 bg-indigo-600 text-white border border-indigo-600">상품</span>
              </div>
            </button>
          `;
        }).join('')}
      </div>
    `;
  };

  const panelSections = CALENDAR_MODE === 'products'
    ? [renderProductGroup('상품 출시', snapshot.launches)]
    : CALENDAR_MODE === 'combined'
      ? [
          renderProductGroup('상품 출시', snapshot.launches),
          renderEventGroup('시작 이벤트', snapshot.starts, 'start'),
          renderEventGroup('종료 이벤트', snapshot.ends, 'end'),
          renderEventGroup('진행 중 이벤트', snapshot.live, 'live'),
        ]
      : [
          renderEventGroup('시작 이벤트', snapshot.starts, 'start'),
          renderEventGroup('종료 이벤트', snapshot.ends, 'end'),
          renderEventGroup('진행 중 이벤트', snapshot.live, 'live'),
        ];
  panel.innerHTML = panelSections.filter(Boolean).length
    ? panelSections.filter(Boolean).join('')
    : `<div class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-slate-400">${config.emptyMessage}</div>`;
  return;

  if (CALENDAR_MODE === 'products') {
    const launches = getCalendarProducts()
      .filter(product => matchesCalendarCompanyFilter(product.company))
      .filter(product => sameDay(product.launchDate, selectedDate));
    summary.innerHTML = `<i class="fas ${config.selectedIcon} ${config.selectedIconTone}"></i><strong>${launches.length} ${config.summaryUnit}</strong>`;

    if (!launches.length) {
      panel.innerHTML = `<div class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-slate-400">${config.emptyMessage}</div>`;
      return;
    }

    panel.innerHTML = launches
      .slice(0, 12)
      .map(product => {
        const keyLiteral = JSON.stringify(getProductKey(product));
        const categories = (product.categories || []).slice(0, 3);
        const launchNote = product.published_date
          ? `Published ${esc(product.published_date)}`
          : (product.collected_at ? `Collected ${esc(formatShortDateTime(product.collected_at))}` : 'Launch tracked in catalog');

        return `
          <button type="button" onclick='showPage("products"); selectProductCard(${keyLiteral})' class="w-full rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-3 text-left hover:shadow-sm transition">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-xs text-slate-500">${esc(product.company || '-')}</div>
                <div class="mt-1 font-medium text-slate-800 truncate">${esc(product.card_name || 'Unnamed product')}</div>
                <div class="mt-1 text-xs text-slate-500">${launchNote}</div>
                <div class="mt-2 flex flex-wrap gap-1.5">
                  ${categories.length
                    ? categories.map(category => `<span class="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-600">${esc(category)}</span>`).join('')
                    : '<span class="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500">No category</span>'}
                </div>
              </div>
              <span class="badge-sm shrink-0 bg-indigo-600 text-white border border-indigo-600">New</span>
            </div>
          </button>
        `;
      })
      .join('');
    return;
  }

  const dayStarts = [];
  const dayEnds = [];
  const dayLive = [];

  ALL.filter(event => matchesCalendarCompanyFilter(event.company)).forEach(event => {
    const { start, end } = getEventDateRange(event);
    if (sameDay(start, selectedDate)) dayStarts.push(event);
    if (sameDay(end, selectedDate)) dayEnds.push(event);
    if (isEventLiveOnDate(event, selectedDate)) dayLive.push(event);
  });

  summary.innerHTML = `<i class="fas ${config.selectedIcon} ${config.selectedIconTone}"></i><strong>${dayLive.length} live</strong>`;

  const renderGroup = (title, items, tone) => {
    if (!items.length) return '';
    const toneClass = tone === 'start' ? 'border-emerald-200 bg-emerald-50' : tone === 'end' ? 'border-rose-200 bg-rose-50' : 'border-blue-200 bg-blue-50';
    const labelClass = tone === 'start' ? 'text-emerald-700' : tone === 'end' ? 'text-rose-700' : 'text-blue-700';
    return `
      <div class="space-y-2">
        <div class="text-xs font-bold uppercase tracking-[0.08em] ${labelClass}">${title}</div>
        ${items.slice(0, 8).map(event => `
          <button type="button" onclick="openDetail(${event.id})" class="w-full rounded-xl border ${toneClass} px-3 py-3 text-left hover:shadow-sm transition">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="font-medium text-slate-800 truncate">${esc(event.title || `Event #${event.id}`)}</div>
                <div class="mt-1 text-xs text-slate-500">${esc(event.period || '-')}</div>
              </div>
              <span class="${pillCls(event.company)} badge-sm shrink-0">${esc((event.company || '').replace('카드', ''))}</span>
            </div>
          </button>
        `).join('')}
      </div>
    `;
  };

  const parts = [
    renderGroup('Starting', dayStarts, 'start'),
    renderGroup('Ending', dayEnds, 'end'),
    renderGroup('Live events', dayLive, 'live'),
  ].filter(Boolean);

  panel.innerHTML = parts.length
    ? parts.join('')
    : `<div class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-slate-400">${config.emptyMessage}</div>`;
}

function renderCalendar() {
  ensureCalendarScaffold();

  const grid = document.getElementById('calendarGrid');
  if (!grid) return;

  const config = getCalendarConfig();
  updateCalendarModeUI(config);
  syncCalendarCompanyFilterUI(config);

  const monthStart = new Date(CALENDAR_MONTH.getFullYear(), CALENDAR_MONTH.getMonth(), 1);
  const monthEnd = new Date(CALENDAR_MONTH.getFullYear(), CALENDAR_MONTH.getMonth() + 1, 0);
  const todayKey = formatDateKey(new Date());
  const monthLabel = monthStart.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
  const calendarEvents = ALL.filter(event => matchesCalendarCompanyFilter(event.company));
  const calendarProducts = getCalendarProducts().filter(product => matchesCalendarCompanyFilter(product.company));

  setText('calendarMonthLabel', monthLabel);

  const inMonthDates = [];
  for (let day = 1; day <= monthEnd.getDate(); day += 1) {
    inMonthDates.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day));
  }

  if (!CALENDAR_SELECTED) {
    CALENDAR_SELECTED = inMonthDates.some(date => formatDateKey(date) === todayKey)
      ? todayKey
      : (inMonthDates[0] ? formatDateKey(inMonthDates[0]) : null);
  }

  const calendarMonthStats = inMonthDates.map(date => buildCalendarSnapshot(date, calendarEvents, calendarProducts));
  if (CALENDAR_MODE === 'products') {
    const peak = calendarMonthStats.reduce((best, item) => item.launches.length > best.launches.length ? item : best, calendarMonthStats[0] || { date: null, launches: [] });
    setText('calendarMonthStarts', String(calendarMonthStats.reduce((sum, item) => sum + item.launches.length, 0)));
    setText('calendarMonthEnds', String(new Set(calendarProducts.map(product => product.company).filter(Boolean)).size));
    setText('calendarPeakDay', peak.date ? `${formatShortDate(peak.date)} · ${peak.launches.length}개` : '-');
  } else if (CALENDAR_MODE === 'combined') {
    const peak = calendarMonthStats.reduce((best, item) => (item.live.length + item.launches.length) > (best.live.length + best.launches.length) ? item : best, calendarMonthStats[0] || { date: null, live: [], launches: [] });
    setText('calendarMonthStarts', String(calendarMonthStats.reduce((sum, item) => sum + item.starts.length, 0)));
    setText('calendarMonthEnds', String(calendarMonthStats.reduce((sum, item) => sum + item.launches.length, 0)));
    setText('calendarPeakDay', peak.date ? `${formatShortDate(peak.date)} · ${peak.live.length + peak.launches.length}건` : '-');
  } else {
    const peak = calendarMonthStats.reduce((best, item) => item.live.length > best.live.length ? item : best, calendarMonthStats[0] || { date: null, live: [] });
    setText('calendarMonthStarts', String(calendarMonthStats.reduce((sum, item) => sum + item.starts.length, 0)));
    setText('calendarMonthEnds', String(calendarMonthStats.reduce((sum, item) => sum + item.ends.length, 0)));
    setText('calendarPeakDay', peak.date ? `${formatShortDate(peak.date)} · ${peak.live.length}건` : '-');
  }

  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + index);
    const dateKey = formatDateKey(cellDate);
    const inMonth = cellDate.getMonth() === monthStart.getMonth();
    const snapshot = buildCalendarSnapshot(cellDate, calendarEvents, calendarProducts);
    const selected = CALENDAR_SELECTED === dateKey;
    const isToday = todayKey === dateKey;
    const tone = CALENDAR_MODE === 'products'
      ? {
          selected: 'border-indigo-500 bg-indigo-50 shadow-sm',
          normal: 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50',
          dim: 'border-slate-100 bg-slate-50 text-slate-300',
          number: selected ? 'text-indigo-700' : inMonth ? 'text-slate-700' : 'text-slate-400',
        }
      : CALENDAR_MODE === 'combined'
        ? {
            selected: 'border-emerald-500 bg-emerald-50 shadow-sm',
            normal: 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50',
            dim: 'border-slate-100 bg-slate-50 text-slate-300',
            number: selected ? 'text-emerald-700' : inMonth ? 'text-slate-700' : 'text-slate-400',
          }
        : {
            selected: 'border-blue-500 bg-blue-50 shadow-sm',
            normal: 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50',
            dim: 'border-slate-100 bg-slate-50 text-slate-300',
            number: selected ? 'text-blue-700' : inMonth ? 'text-slate-700' : 'text-slate-400',
          };

    const leadProduct = snapshot.launches[0]?.card_name || '';
    const metrics = CALENDAR_MODE === 'products'
      ? `
          <div class="mt-3 space-y-1 text-[11px]">
            <div class="${snapshot.launches.length ? 'text-indigo-600 font-semibold' : 'text-slate-300'}">상품 ${snapshot.launches.length}</div>
            <div class="${snapshot.brands.size ? 'text-slate-600' : 'text-slate-300'}">카드사 ${snapshot.brands.size}</div>
            <div class="${leadProduct ? 'text-slate-500 truncate' : 'text-slate-300'}">${leadProduct ? esc(leadProduct) : '출시 없음'}</div>
          </div>
        `
      : CALENDAR_MODE === 'combined'
        ? `
            <div class="mt-3 space-y-1 text-[11px]">
              <div class="${snapshot.live.length ? 'text-emerald-700 font-semibold' : 'text-slate-300'}">진행 ${snapshot.live.length}</div>
              <div class="${snapshot.launches.length ? 'text-indigo-600' : 'text-slate-300'}">상품 ${snapshot.launches.length}</div>
              <div class="${snapshot.starts.length ? 'text-blue-600' : 'text-slate-300'}">시작 ${snapshot.starts.length}</div>
            </div>
          `
        : `
            <div class="mt-3 space-y-1 text-[11px]">
              <div class="${snapshot.starts.length ? 'text-emerald-600' : 'text-slate-300'}">시작 ${snapshot.starts.length}</div>
              <div class="${snapshot.ends.length ? 'text-rose-600' : 'text-slate-300'}">종료 ${snapshot.ends.length}</div>
              <div class="${snapshot.live.length ? 'text-blue-600 font-semibold' : 'text-slate-300'}">진행 ${snapshot.live.length}</div>
            </div>
          `;

    cells.push(`
      <button
        type="button"
        onclick="selectCalendarDate('${dateKey}')"
        class="min-h-[112px] rounded-2xl border text-left px-3 py-3 transition ${selected ? tone.selected : inMonth ? tone.normal : tone.dim}"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-semibold ${tone.number}">${cellDate.getDate()}</span>
          ${isToday ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900 text-white">오늘</span>' : ''}
        </div>
        ${metrics}
      </button>
    `);
  }

  grid.innerHTML = cells.join('');
  renderCalendarDayPanel();
}

function renderCalendarDayPanel() {
  ensureCalendarScaffold();

  const label = document.getElementById('calendarSelectedLabel');
  const summary = document.getElementById('calendarSelectedSummary');
  const panel = document.getElementById('calendarDayEvents');
  if (!label || !summary || !panel) return;

  const config = getCalendarConfig();
  updateCalendarModeUI(config);

  if (!CALENDAR_SELECTED) {
    label.textContent = config.emptySelection;
    summary.innerHTML = `<i class="fas ${config.selectedIcon} ${config.selectedIconTone}"></i><strong>0 ${config.summaryUnit}</strong>`;
    panel.innerHTML = `<div class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-slate-400">${config.emptySelection}</div>`;
    return;
  }

  const selectedDate = parseEventDate(CALENDAR_SELECTED);
  if (!selectedDate) return;

  const calendarEvents = ALL.filter(event => matchesCalendarCompanyFilter(event.company));
  const calendarProducts = getCalendarProducts().filter(product => matchesCalendarCompanyFilter(product.company));
  const snapshot = buildCalendarSnapshot(selectedDate, calendarEvents, calendarProducts);

  label.textContent = selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  const summaryCount = CALENDAR_MODE === 'products'
    ? snapshot.launches.length
    : CALENDAR_MODE === 'combined'
      ? snapshot.live.length + snapshot.launches.length
      : snapshot.live.length;
  summary.innerHTML = `<i class="fas ${config.selectedIcon} ${config.selectedIconTone}"></i><strong>${summaryCount} ${config.summaryUnit}</strong>`;

  const renderEventGroup = (title, items, tone) => {
    if (!items.length) return '';
    const toneClass = tone === 'start' ? 'border-emerald-200 bg-emerald-50' : tone === 'end' ? 'border-rose-200 bg-rose-50' : 'border-blue-200 bg-blue-50';
    const labelClass = tone === 'start' ? 'text-emerald-700' : tone === 'end' ? 'text-rose-700' : 'text-blue-700';
    return `
      <div class="space-y-2">
        <div class="text-xs font-bold tracking-[0.08em] ${labelClass}">${title}</div>
        ${items.slice(0, 8).map(event => `
          <button type="button" onclick="openDetail(${event.id})" class="w-full rounded-xl border ${toneClass} px-3 py-3 text-left hover:shadow-sm transition">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="font-medium text-slate-800 truncate">${esc(event.title || `이벤트 #${event.id}`)}</div>
                <div class="mt-1 text-xs text-slate-500">${esc(event.period || '-')}</div>
              </div>
              <span class="${pillCls(event.company)} badge-sm shrink-0">${esc((event.company || '').replace('카드', ''))}</span>
            </div>
          </button>
        `).join('')}
      </div>
    `;
  };

  const renderProductGroup = (title, items) => {
    if (!items.length) return '';
    return `
      <div class="space-y-2">
        <div class="text-xs font-bold tracking-[0.08em] text-indigo-700">${title}</div>
        ${items.slice(0, 8).map(product => {
          const keyLiteral = JSON.stringify(getProductKey(product));
          const categories = (product.categories || []).slice(0, 3);
          const launchNote = product.published_date
            ? `출시일 ${esc(product.published_date)}`
            : (product.collected_at ? `수집일 ${esc(formatShortDateTime(product.collected_at))}` : '상품 목록 기준');
          return `
            <button type="button" onclick='showPage("products"); selectProductCard(${keyLiteral})' class="w-full rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-3 text-left hover:shadow-sm transition">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-xs text-slate-500">${esc(product.company || '-')}</div>
                  <div class="mt-1 font-medium text-slate-800 truncate">${esc(product.card_name || '이름 없는 상품')}</div>
                  <div class="mt-1 text-xs text-slate-500">${launchNote}</div>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    ${categories.length
                      ? categories.map(category => `<span class="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-600">${esc(category)}</span>`).join('')
                      : '<span class="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500">카테고리 없음</span>'}
                  </div>
                </div>
                <span class="badge-sm shrink-0 bg-indigo-600 text-white border border-indigo-600">상품</span>
              </div>
            </button>
          `;
        }).join('')}
      </div>
    `;
  };

  const panelSections = CALENDAR_MODE === 'products'
    ? [renderProductGroup('상품 출시', snapshot.launches)]
    : CALENDAR_MODE === 'combined'
      ? [
          renderProductGroup('상품 출시', snapshot.launches),
          renderEventGroup('시작 이벤트', snapshot.starts, 'start'),
          renderEventGroup('종료 이벤트', snapshot.ends, 'end'),
          renderEventGroup('진행 중 이벤트', snapshot.live, 'live'),
        ]
      : [
          renderEventGroup('시작 이벤트', snapshot.starts, 'start'),
          renderEventGroup('종료 이벤트', snapshot.ends, 'end'),
          renderEventGroup('진행 중 이벤트', snapshot.live, 'live'),
        ];

  panel.innerHTML = panelSections.filter(Boolean).length
    ? panelSections.filter(Boolean).join('')
    : `<div class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-slate-400">${config.emptyMessage}</div>`;
}

function setButtonBusy(id, busy, idleHtml, busyHtml) {
  const button = document.getElementById(id);
  if (!button) return;
  button.disabled = busy;
  button.innerHTML = busy ? busyHtml : idleHtml;
}

async function triggerProductUpdateCheck() {
  showPage('ops', { scroll: false });
  setButtonBusy(
    'btnCheckProducts',
    true,
    '<i class="fas fa-satellite-dish"></i>신규 상품 확인',
    '<i class="fas fa-spinner fa-spin"></i>확인 중...'
  );
  try {
    const response = await fetch('/api/rag/check-updates', { method: 'POST' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || '신규 상품 확인을 시작할 수 없습니다.');
    alert(data.message || '신규 상품 확인을 시작했습니다.');
  } catch (error) {
    alert(error.message || String(error));
  } finally {
    setButtonBusy(
      'btnCheckProducts',
      false,
      '<i class="fas fa-satellite-dish"></i>신규 상품 확인',
      '<i class="fas fa-spinner fa-spin"></i>확인 중...'
    );
    setTimeout(() => loadAll(), 600);
  }
}

function ensureProductRagButtonPlacement() {
  const legacyButton = document.querySelector('button[onclick="buildRAGIndex()"]');
  if (legacyButton) {
    legacyButton.remove();
  }

  const statusEl = document.getElementById('opsRagStatus');
  if (!statusEl) return;

  const card = statusEl.closest('.bg-slate-50');
  if (!card) return;

  let wrap = document.getElementById('opsRagActionWrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'opsRagActionWrap';
    wrap.className = 'mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between';

    const description = document.createElement('p');
    description.className = 'text-[11px] leading-relaxed text-slate-500';
    description.textContent = '\uc0c9\uc778 \uc7ac\uc0dd\uc131\uc740 \uc0c1\ud488 PDF\ub97c \ub2e4\uc2dc \uc77d\uc5b4 RAG \uac80\uc0c9\uc6a9 \ubca1\ud130 DB\ub97c \uc0c8\ub85c \ub9cc\ub4dc\ub294 \uc6b4\uc601 \uc791\uc5c5\uc785\ub2c8\ub2e4.';

    const button = document.createElement('button');
    button.id = 'btnBuildProductRag';
    button.type = 'button';
    button.className = 'bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap';
    button.innerHTML = '<i class="fas fa-database mr-1"></i>RAG \uc0c9\uc778 \uc0dd\uc131';
    button.addEventListener('click', triggerProductRagBuild);

    wrap.appendChild(description);
    wrap.appendChild(button);
    card.appendChild(wrap);
    return;
  }

  if (!document.getElementById('btnBuildProductRag')) {
    const button = document.createElement('button');
    button.id = 'btnBuildProductRag';
    button.type = 'button';
    button.className = 'bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap';
    button.innerHTML = '<i class="fas fa-database mr-1"></i>RAG \uc0c9\uc778 \uc0dd\uc131';
    button.addEventListener('click', triggerProductRagBuild);
    wrap.appendChild(button);
  }
}

async function triggerProductRagBuild() {
  showPage('ops', { scroll: false });
  setButtonBusy(
    'btnBuildProductRag',
    true,
    '<i class="fas fa-cubes"></i>상품 색인 생성',
    '<i class="fas fa-spinner fa-spin"></i>생성 중...'
  );
  try {
    const response = await fetch('/api/rag/build', { method: 'POST' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || '상품 색인 생성을 시작할 수 없습니다.');
    alert(data.message || '상품 색인 생성을 시작했습니다.');
  } catch (error) {
    alert(error.message || String(error));
  } finally {
    setButtonBusy(
      'btnBuildProductRag',
      false,
      '<i class="fas fa-cubes"></i>상품 색인 생성',
      '<i class="fas fa-spinner fa-spin"></i>생성 중...'
    );
    setTimeout(() => loadAll(), 600);
  }
}

window.buildRAGIndex = triggerProductRagBuild;

function isGenericProductListingUrl(url) {
  return Boolean(url) && (
    url.includes('/MOBFM12051R01.shc') ||
    url.includes('/HSHMCXCRSZZC0002') ||
    url.includes('/CPUUG2001_04.hc')
  );
}

function getProductPdfLink(product) {
  return product?.local_pdf_url || product?.pdf_url || '';
}

function getProductExternalLink(product) {
  if (!product?.url || isGenericProductListingUrl(product.url)) return '';
  return product.url;
}

function getProductFeeLabel(product) {
  return product?.annual_fee_display || product?.annual_fee || '연회비 정보 없음';
}

function getProductSpendLabel(product) {
  return product?.spend_requirement || '전월실적 정보 없음';
}

function getVisibleProducts() {
  const query = PRODUCT_ACTIVE_QUERY.toLowerCase();
  const filtered = PRODUCT_CATALOG.filter(item => {
    if (PRODUCT_ACTIVE_COMPANY && item.company !== PRODUCT_ACTIVE_COMPANY) return false;
    if (PRODUCT_ACTIVE_VIEW === 'structured' && !hasStructuredProductSummary(item)) return false;
    if (PRODUCT_ACTIVE_VIEW === 'spend' && !item?.spend_requirement) return false;
    if (PRODUCT_ACTIVE_VIEW === 'pdf' && !getProductPdfLink(item)) return false;

    if (!query) return true;

    const haystack = [
      item.company || '',
      item.card_name || '',
      item.card_type || '',
      ...getProductCategoryList(item),
      ...(item.benefit_highlights || []),
      item.annual_fee_display || item.annual_fee || '',
      item.spend_requirement || '',
      item.summary_text || '',
      item.preview || '',
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });

  return getSortedProducts(filtered);
}

function renderProductCatalogList() {
  const listEl = document.getElementById('productsCatalogList');
  const emptyEl = document.getElementById('productsCatalogEmpty');
  const moreWrap = document.getElementById('productsCatalogMoreWrap');
  const moreText = document.getElementById('productsCatalogMoreText');
  if (!listEl) return;

  const items = getVisibleProducts();
  if (!items.length) {
    listEl.innerHTML = '';
    emptyEl?.classList.remove('hidden');
    moreWrap?.classList.add('hidden');
    return;
  }

  emptyEl?.classList.add('hidden');
  const visibleItems = items.slice(0, PRODUCT_RENDER_LIMIT);
  if (!PRODUCT_SELECTED_KEY || !items.some(item => getProductKey(item) === PRODUCT_SELECTED_KEY)) {
    PRODUCT_SELECTED_KEY = getProductKey(items[0]);
  }

  listEl.innerHTML = visibleItems.map(item => {
    const key = getProductKey(item);
    const selected = key === PRODUCT_SELECTED_KEY;
    const categories = (item.categories || []).slice(0, 3);
    const benefits = (item.benefit_highlights || []).slice(0, 3);
    const feeLabel = getProductFeeLabel(item);
    const spendLabel = getProductSpendLabel(item);
    const launchLabel = item.launch_date || item.published_date || '-';
    const preview = item.summary_text || item.preview || '';
    const hasSummary = hasStructuredProductSummary(item);
    const hasPdf = Boolean(getProductPdfLink(item));
    const keyLiteral = JSON.stringify(key);
    return `
      <button type="button" onclick='selectProductCard(${keyLiteral})' class="w-full rounded-3xl border px-4 py-4 text-left transition ${selected ? 'border-slate-900 bg-slate-900 text-white shadow-md' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[11px] font-semibold ${selected ? 'text-slate-200' : 'text-slate-500'}">${esc(item.company || '-')}</span>
              <span class="rounded-full px-2 py-0.5 text-[11px] ${selected ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-600'}">${esc(item.card_type || '카드')}</span>
              <span class="rounded-full px-2 py-0.5 text-[11px] ${hasSummary ? (selected ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-50 text-emerald-700') : (selected ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-500')}">${hasSummary ? '요약 있음' : '요약 보강중'}</span>
              ${hasPdf ? `<span class="rounded-full px-2 py-0.5 text-[11px] ${selected ? 'bg-sky-500/20 text-sky-100' : 'bg-sky-50 text-sky-700'}">PDF</span>` : ''}
              ${item.revision_type ? `<span class="rounded-full px-2 py-0.5 text-[11px] ${selected ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-50 text-emerald-700'}">${esc(item.revision_type)}</span>` : ''}
            </div>
            <div class="mt-2 text-base font-semibold leading-snug ${selected ? 'text-white' : 'text-slate-900'}">${esc(item.card_name || '-')}</div>
            <div class="mt-3 grid gap-2 text-[12px] ${selected ? 'text-slate-200' : 'text-slate-600'} sm:grid-cols-2">
              <div class="rounded-2xl ${selected ? 'bg-white/10' : 'bg-slate-50'} px-3 py-2">
                <div class="text-[11px] ${selected ? 'text-slate-300' : 'text-slate-400'}">연회비</div>
                <div class="mt-1 font-medium">${esc(feeLabel)}</div>
              </div>
              <div class="rounded-2xl ${selected ? 'bg-white/10' : 'bg-slate-50'} px-3 py-2">
                <div class="text-[11px] ${selected ? 'text-slate-300' : 'text-slate-400'}">전월실적</div>
                <div class="mt-1 font-medium">${esc(spendLabel)}</div>
              </div>
            </div>
            <div class="mt-3 space-y-1.5">
              ${benefits.length
                ? benefits.map(benefit => `<div class="flex items-start gap-2 text-[12px] leading-5 ${selected ? 'text-slate-100' : 'text-slate-700'}"><span class="${selected ? 'text-amber-300' : 'text-amber-500'}">•</span><span>${esc(benefit)}</span></div>`).join('')
                : `<div class="text-[12px] ${selected ? 'text-slate-300' : 'text-slate-500'}">핵심 혜택 요약이 아직 없습니다.</div>`
              }
            </div>
            <div class="mt-3 text-[12px] leading-5 ${selected ? 'text-slate-200' : 'text-slate-600'}" style="display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;">
              ${esc(preview || 'RAG 요약이 아직 짧게 정리되지 않았습니다.')}
            </div>
            <div class="mt-3 flex flex-wrap gap-1.5">
              ${categories.length
                ? categories.map(category => `<span class="rounded-full px-2 py-0.5 text-[11px] ${selected ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-600'}">${esc(category)}</span>`).join('')
                : `<span class="rounded-full px-2 py-0.5 text-[11px] ${selected ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-500'}">카테고리 정보 없음</span>`
              }
            </div>
          </div>
          <div class="w-[88px] shrink-0 text-right text-[11px] ${selected ? 'text-slate-300' : 'text-slate-400'}">
            <div>${esc(launchLabel)}</div>
            <div class="mt-1">${Number(item.chunk_count || 0)} 청크</div>
            <div class="mt-3">${hasPdf ? 'PDF 가능' : 'PDF 없음'}</div>
          </div>
        </div>
      </button>
    `;
  }).join('');

  if (moreWrap && moreText) {
    if (items.length > visibleItems.length) {
      moreWrap.classList.remove('hidden');
      moreWrap.classList.add('flex');
      moreText.textContent = `총 ${items.length}개 중 ${visibleItems.length}개를 먼저 보여주고 있습니다.`;
    } else {
      moreWrap.classList.add('hidden');
      moreWrap.classList.remove('flex');
    }
  }
}

function renderProductDetailPanel() {
  const detailEl = document.getElementById('productsDetailPanel');
  if (!detailEl) return;

  const selected = findProductByKey(PRODUCT_SELECTED_KEY);
  if (!selected) {
    detailEl.innerHTML = '카드를 선택하면 연회비, 전월실적, 핵심혜택, PDF 링크를 여기서 바로 확인할 수 있습니다.';
    return;
  }

  const categories = (selected.categories || []).length
    ? (selected.categories || []).map(category => `<span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">${esc(category)}</span>`).join('')
    : '<span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">카테고리 정보 없음</span>';
  const benefits = (selected.benefit_highlights || []).slice(0, 5);
  const preview = selected.summary_text || selected.preview || '상품 요약이 아직 없습니다. 필요하면 운영 탭에서 RAG 색인을 다시 생성해 최신 청킹 구조를 반영할 수 있습니다.';
  const pdfLink = getProductPdfLink(selected);
  const externalLink = getProductExternalLink(selected);
  const feeLabel = getProductFeeLabel(selected);
  const spendLabel = getProductSpendLabel(selected);
  const summaryReady = hasStructuredProductSummary(selected);

  detailEl.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs uppercase tracking-wider text-slate-400">${esc(selected.company || '-')}</div>
        <h4 class="display-font mt-1 text-lg font-bold text-slate-800">${esc(selected.card_name || '-')}</h4>
        <div class="mt-2 flex flex-wrap gap-1.5">${categories}</div>
        <div class="mt-3 flex flex-wrap gap-2">
          <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold ${summaryReady ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}">${summaryReady ? '구조화 요약 완료' : '요약 보강중'}</span>
          ${pdfLink ? '<span class="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">PDF 열람 가능</span>' : ''}
        </div>
      </div>
      <div class="text-right text-xs text-slate-400">
        <div>${esc(selected.launch_date || selected.published_date || '-')}</div>
        <div class="mt-1">${esc(selected.card_type || '카드')}</div>
      </div>
    </div>
    <div class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-xl border border-slate-200 bg-white px-3 py-3">
        <div class="text-[11px] font-bold text-slate-500">연회비</div>
        <div class="mt-1 text-sm text-slate-700">${esc(feeLabel)}</div>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white px-3 py-3">
        <div class="text-[11px] font-bold text-slate-500">전월실적</div>
        <div class="mt-1 text-sm text-slate-700">${esc(spendLabel)}</div>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white px-3 py-3">
        <div class="text-[11px] font-bold text-slate-500">출시/공시일</div>
        <div class="mt-1 text-sm text-slate-700">${esc(selected.launch_date || selected.published_date || '-')}</div>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white px-3 py-3">
        <div class="text-[11px] font-bold text-slate-500">RAG 청크</div>
        <div class="mt-1 text-sm text-slate-700">${Number(selected.chunk_count || 0)}개</div>
      </div>
    </div>
    <div class="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div class="text-[11px] font-bold text-slate-500">주요 혜택</div>
      <div class="mt-3 space-y-2">
        ${benefits.length
          ? benefits.map(benefit => `<div class="flex items-start gap-2 text-sm text-slate-700"><span class="text-amber-500">•</span><span>${esc(benefit)}</span></div>`).join('')
          : '<div class="text-sm text-slate-500">PDF에서 바로 읽힌 핵심 혜택이 아직 없습니다.</div>'
        }
      </div>
    </div>
    <div class="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-4">
      <div class="text-[11px] font-bold text-slate-500">RAG 요약</div>
      <p class="mt-2 whitespace-pre-line leading-6 text-slate-700">${esc(preview)}</p>
    </div>
    <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div class="text-[11px] font-bold text-slate-500">비교 메모</div>
      <p class="mt-2 text-sm leading-6 text-slate-600">
        ${summaryReady
          ? '연회비, 전월실적, 주요 혜택이 카드형 비교에 반영된 상태입니다. 다른 카드와 빠르게 비교하기 좋습니다.'
          : '아직은 원문 기반 정보가 섞여 있어 비교 문구가 거칠 수 있습니다. 새 색인이 끝나면 더 정교해집니다.'
        }
      </p>
    </div>
    <div class="mt-4 flex flex-wrap gap-2">
      ${pdfLink ? `<a href="${esc(pdfLink)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"><i class="fas fa-file-pdf text-xs"></i>PDF 보기</a>` : ''}
      ${externalLink ? `<a href="${esc(externalLink)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><i class="fas fa-up-right-from-square text-xs"></i>원문 페이지</a>` : ''}
    </div>
  `;
}

function searchProducts() {
  const input = document.getElementById('productSearchInput');
  PRODUCT_ACTIVE_QUERY = String(input?.value || '').trim();
  PRODUCT_RENDER_LIMIT = PRODUCT_RENDER_STEP;
  renderProductsWorkspace();
}

function clearProductSearch() {
  PRODUCT_ACTIVE_QUERY = '';
  PRODUCT_RENDER_LIMIT = PRODUCT_RENDER_STEP;
  const input = document.getElementById('productSearchInput');
  if (input) input.value = '';
  renderProductsWorkspace();
}

function setProductCompanyFilter(value) {
  PRODUCT_ACTIVE_COMPANY = value || '';
  PRODUCT_RENDER_LIMIT = PRODUCT_RENDER_STEP;
  renderProductsWorkspace();
}

function setProductViewFilter(value) {
  PRODUCT_ACTIVE_VIEW = value || 'all';
  PRODUCT_RENDER_LIMIT = PRODUCT_RENDER_STEP;
  renderProductsWorkspace();
}

function setProductSortFilter(value) {
  PRODUCT_ACTIVE_SORT = value || 'recommended';
  PRODUCT_RENDER_LIMIT = PRODUCT_RENDER_STEP;
  renderProductsWorkspace();
}

function showMoreProducts() {
  PRODUCT_RENDER_LIMIT += PRODUCT_RENDER_STEP;
  renderProductsWorkspace();
}

function getValidationElements() {
  return {
    buttons: [
      document.getElementById('btnValidate'),
      document.getElementById('btnValidateOps'),
    ].filter(Boolean),
    wrap: document.getElementById('validateProgressWrapOps') || document.getElementById('validateProgressWrap'),
    bar: document.getElementById('validateProgressBarOps') || document.getElementById('validateProgressBar'),
    text: document.getElementById('validateProgressTextOps') || document.getElementById('validateProgressText'),
    pct: document.getElementById('validateProgressPctOps') || document.getElementById('validateProgressPct'),
  };
}

function setValidationButtonState(disabled, html) {
  getValidationElements().buttons.forEach(btn => {
    btn.disabled = disabled;
    btn.innerHTML = html;
  });
}

async function startValidation() {
  showPage('ops', { scroll: false });
  const ui = getValidationElements();
  setValidationButtonState(true, '<i class="fas fa-spinner fa-spin mr-1"></i>검증 중...');
  if (ui.wrap) ui.wrap.classList.remove('hidden');
  if (ui.bar) ui.bar.style.width = '10%';
  if (ui.text) ui.text.textContent = '삼성 검증을 시작합니다...';
  if (ui.pct) ui.pct.textContent = '';

  try {
    const r = await fetch('/api/pipeline/validate-samsung', { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.started !== true) {
      if (ui.wrap) ui.wrap.classList.add('hidden');
      setValidationButtonState(false, '<i class="fas fa-shield-check mr-1"></i>삼성 검증');
      alert('검증 실패: ' + (d.message || d.detail || '검증을 시작할 수 없습니다.'));
      return;
    }
    _validatePollTimer = setInterval(pollValidation, 1500);
  } catch (e) {
    if (ui.wrap) ui.wrap.classList.add('hidden');
    setValidationButtonState(false, '<i class="fas fa-shield-check mr-1"></i>삼성 검증');
    alert('검증 실패: ' + (e.message || String(e)));
  }
}

async function pollValidation() {
  try {
    const r = await fetch('/api/pipeline/progress');
    const p = r.ok ? await r.json() : {};
    const ui = getValidationElements();

    if (p.running && p.phase === 'validate') {
      if (ui.bar) ui.bar.style.width = '50%';
      if (ui.text) ui.text.textContent = '삼성 이벤트 URL을 확인하는 중입니다...';
      if (ui.pct) ui.pct.textContent = '실행 중';
    }

    if (!p.running && p.phase !== 'validate') {
      if (_validatePollTimer) {
        clearInterval(_validatePollTimer);
        _validatePollTimer = null;
      }
      const res = (p.ingest_result || {}).validated || {};
      const removed = res.removed || 0;
      const kept = res.kept || 0;
      const checked = res.checked || 0;

      if (ui.bar) ui.bar.style.width = '100%';
      if (ui.pct) ui.pct.textContent = `${checked}건 확인`;
      if (ui.text) ui.text.textContent = `검증 완료 - 유지 ${kept}건, 제거 ${removed}건`;

      setValidationButtonState(false, '<i class="fas fa-shield-check mr-1"></i>삼성 검증');

      setTimeout(() => {
        if (ui.wrap) ui.wrap.classList.add('hidden');
        if (removed > 0) loadAll();
      }, 2000);
    }
  } catch (e) {
    console.error('validate poll', e);
  }
}
