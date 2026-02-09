/* 경쟁사 카드 이벤트 인텔리전스 - 대시보드 JS v2 */

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

// ============ 초기화 ============
document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initModalTabs();
  initFilters();
  await loadAll();
});

async function loadAll() {
  try {
    const [evR, stR, ovR, bmR, smR, trR, brR, qcR, progR] = await Promise.all([
      fetch('/api/events'), fetch('/api/stats'),
      fetch('/api/analytics/company-overview'),
      fetch('/api/analytics/benefit-benchmark'),
      fetch('/api/analytics/strategy-map'),
      fetch('/api/analytics/trends'),
      fetch('/api/analytics/company-briefings'),
      fetch('/api/analytics/qualitative-comparison'),
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
    BRIEFINGS = brR.ok ? await brR.json() : null;
    QUAL_COMPARE = qcR.ok ? await qcR.json() : null;

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
  } catch (e) { console.error(e); }
}

// ============ 상단 배너 지표 ============
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
  document.querySelectorAll('#detailModal .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#detailModal .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ['iframe','intelligence','edit'].forEach(k => { const p = document.getElementById('mp-'+k); if(p) p.classList.add('hidden'); });
      document.getElementById('mp-'+btn.dataset.mtab).classList.remove('hidden');
    });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && CURRENT_ID) closeModal(); });
  document.getElementById('detailModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
}

function initFilters() {
  ['searchKw','fCompany','fCat','fStatus','fBenefitType','fExtracted','fTag'].forEach(id => {
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
      <div class="min-w-0"><span class="font-medium text-slate-800 text-xs">${esc((e.title||'').substring(0,45))}</span>
      <p class="text-[11px] text-slate-500 mt-0.5">${esc((e.benefit_value||'').substring(0,40))} ${e.period ? '| '+esc(e.period) : ''}</p></div>
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

function renderWeeklyChanges() {
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
    if (!e.created_at) return false;
    const d = new Date(e.created_at);
    return d >= monday && d <= sunday;
  });
  // 이번주 종료 예정 이벤트 (period_end 기준)
  const endingEvents = ALL.filter(e => {
    if (!e.period) return false;
    try {
      const parts = e.period.split('~');
      if (!parts[1]) return false;
      const endDate = new Date(parts[1].trim().replace(/\./g, '-'));
      return endDate >= monday && endDate <= sunday;
    } catch { return false; }
  });

  // 카드사별 분류
  const coOrder = ['신한카드','KB국민카드','삼성카드','현대카드'];
  const byCoNew = {};
  const byCoEnd = {};
  newEvents.forEach(e => { const co = e.company || '기타'; (byCoNew[co] = byCoNew[co] || []).push(e); });
  endingEvents.forEach(e => { const co = e.company || '기타'; (byCoEnd[co] = byCoEnd[co] || []).push(e); });

  let html = `<div class="flex items-center justify-between mb-3">
    <span class="text-sm font-bold text-slate-800">${weekLabel}</span>
    <span class="text-[11px] text-slate-400">${monday.getMonth()+1}/${monday.getDate()} ~ ${sunday.getMonth()+1}/${sunday.getDate()}</span>
  </div>`;

  // 요약 숫자
  html += `<div class="grid grid-cols-2 gap-2 mb-3">
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
        html += `<div class="text-[11px] text-slate-600 truncate cursor-pointer hover:text-blue-600" onclick="openDetail(${e.id})">${esc((e.title||'').substring(0,40))}</div>`;
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
        html += `<div class="text-[11px] text-slate-600 truncate cursor-pointer hover:text-amber-600" onclick="openDetail(${e.id})">${esc((e.title||'').substring(0,35))} <span class="text-slate-400">${esc(endPart.trim())}</span></div>`;
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
        <span class="font-medium text-slate-800">${esc((event.title||'').substring(0,60))}</span>
        <p class="text-xs text-slate-500 mt-0.5">${esc(event.period||'')} ${event.benefit_value ? '| '+esc(event.benefit_value.substring(0,40)) : ''}</p>
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
      html += `<span class="text-slate-700 truncate">${esc((e.title||'').substring(0,40))}</span>`;
      html += `<span class="text-slate-400 ml-auto text-[11px] shrink-0">${esc((e.benefit_value||'').substring(0,25))}</span>`;
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
function getFiltered() {
  let list = ALL.slice();
  const kw = (document.getElementById('searchKw').value||'').trim().toLowerCase();
  const co = document.getElementById('fCompany').value;
  const cat = document.getElementById('fCat').value;
  const st = document.getElementById('fStatus').value;
  const bt = (document.getElementById('fBenefitType')||{}).value || '';
  const ext = (document.getElementById('fExtracted')||{}).value || '';
  const tag = (document.getElementById('fTag')||{}).value || '';
  if (co) list = list.filter(e => e.company === co);
  if (cat) list = list.filter(e => e.category === cat);
  if (st === 'active') list = list.filter(e => isActive(e));
  if (st === 'ended') list = list.filter(e => !isActive(e));
  if (bt) list = list.filter(e => (e.benefit_type||'') === bt);
  if (ext === 'done') list = list.filter(e => isExtracted(e));
  if (ext === 'pending') list = list.filter(e => !isExtracted(e));
  if (tag) list = list.filter(e => {
    const ins = pjson(e.marketing_insights);
    const tags = (ins && ins.objective_tags) || [];
    return tags.includes(tag);
  });
  if (kw) list = list.filter(e => [e.title,e.benefit_value,e.company,e.category].join(' ').toLowerCase().includes(kw));
  return list;
}

function renderEvents() {
  const list = getFiltered();
  const tbody = document.getElementById('eventsTbody');
  const empty = document.getElementById('eventsEmpty');
  const pagBar = document.getElementById('paginationBar');

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
    const ben = (e.benefit_value||'').replace(/상세 페이지 참조|정보 없음/gi,'').trim()||'—';
    const extracted = isExtracted(e);
    const active = isActive(e);
    const extractBadge = extracted ? '<span class="badge-sm bg-emerald-100 text-emerald-700">추출 완료</span>' : '<span class="badge-sm bg-slate-200 text-slate-600">미완료</span>';
    const statusBadge = active ? '<span class="badge-sm bg-blue-100 text-blue-700">진행중</span>' : '<span class="badge-sm bg-slate-200 text-slate-500">종료</span>';
    const catTag = e.category ? `<span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded ml-1">${esc(e.category)}</span>` : '';
    const chk = COMPARE_SET.has(e.id);
    return `<tr class="row-co ${coCls(e.company)} hover:opacity-90 cursor-pointer" onclick="openDetail(${e.id})">
      <td class="px-3 py-2" onclick="event.stopPropagation()"><input type="checkbox" class="accent-blue-600 chk-compare" data-eid="${e.id}" ${chk?'checked':''} onchange="toggleCompare(${e.id}, this.checked)"></td>
      <td class="px-3 py-2"><span class="${pillCls(e.company)} badge-sm">${esc(e.company)}</span></td>
      <td class="px-3 py-2 font-medium">${esc((e.title||'').substring(0,50))}${catTag}</td>
      <td class="px-3 py-2 text-slate-600 max-w-[200px] truncate">${esc(ben.substring(0,60))}</td>
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
  document.getElementById('mdTitle').textContent = ev.title || '이벤트 상세';
  document.getElementById('mdSummary').textContent = ev.period || '';
  document.getElementById('mdNewTab').href = ev.url || '#';
  document.getElementById('mdFrame').src = ev.url || 'about:blank';
  // 모달 탭 초기화 (원본 페이지 우선)
  document.querySelectorAll('#detailModal .tab-btn').forEach((b,i) => b.classList.toggle('active', i===0));
  ['iframe','intelligence','edit'].forEach((k,i) => { const p = document.getElementById('mp-'+k); if(p) p.classList.toggle('hidden', i!==0); });

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
  } catch { document.getElementById('mp-intelligence').innerHTML = '<p class="text-slate-400">로드 실패</p>'; }
}

function renderIntelligence(d) {
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
  const benefit = ev.benefit_value || '';
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
  // 수동 정정 탭으로 이동
  document.querySelectorAll('#detailModal .tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mtab === 'edit');
  });
  ['iframe','sections','intelligence','edit'].forEach(k => {
    const p = document.getElementById('mp-'+k);
    if (p) p.classList.toggle('hidden', k !== 'edit');
  });
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

async function startIngestOnly() {
  const btn = document.getElementById('btnIngestOnly');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>수집 중…';
  }
  try {
    const r = await fetch('/api/pipeline/ingest', { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      alert('수집 실패: ' + (d.detail || d.message || r.statusText));
      return;
    }
    const n = d.ingested != null ? d.ingested : 0;
    alert('수집 완료\n신규 ' + n + '건 저장. (이제 「전체 추출 시작」으로 미추출 건을 상세 추출할 수 있습니다.)');
    loadAll();
  } catch (e) {
    alert('수집 실패: ' + (e.message || String(e)));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-download mr-1"></i>이벤트 수집';
    }
  }
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
  if (!btn) return;
  if (COMPARE_SET.size >= 2) {
    btn.classList.remove('hidden');
    if (cnt) cnt.textContent = COMPARE_SET.size;
  } else {
    btn.classList.add('hidden');
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
// 차트/테이블 순서 고정: 신한 -> KB -> 삼성 -> 현대 -> 나머지
const CO_ORDER = ['신한카드','KB국민카드','삼성카드','현대카드'];
function sortCompanies(arr, key) {
  if (!key) return arr.slice().sort((a,b) => { const ia = CO_ORDER.indexOf(a), ib = CO_ORDER.indexOf(b); if(ia>=0&&ib>=0) return ia-ib; if(ia>=0) return -1; if(ib>=0) return 1; return a.localeCompare(b); });
  return arr.slice().sort((a,b) => { const ca = typeof key==='function' ? key(a) : a[key], cb = typeof key==='function' ? key(b) : b[key]; const ia = CO_ORDER.indexOf(ca), ib = CO_ORDER.indexOf(cb); if(ia>=0&&ib>=0) return ia-ib; if(ia>=0) return -1; if(ib>=0) return 1; return (ca||'').localeCompare(cb||''); });
}
