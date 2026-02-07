/* 경쟁사 카드 이벤트 인텔리전스 - 대시보드 JS v2 */

let ALL = [];          // 전체 이벤트
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
    const [evR, stR, ovR, bmR, smR, trR, brR, qcR] = await Promise.all([
      fetch('/api/events'), fetch('/api/stats'),
      fetch('/api/analytics/company-overview'),
      fetch('/api/analytics/benefit-benchmark'),
      fetch('/api/analytics/strategy-map'),
      fetch('/api/analytics/trends'),
      fetch('/api/analytics/company-briefings'),
      fetch('/api/analytics/qualitative-comparison'),
    ]);
    ALL = await evR.json();
    const stats = await stR.json();
    OVERVIEW = ovR.ok ? await ovR.json() : null;
    BENCHMARK = bmR.ok ? await bmR.json() : null;
    STRATEGY = smR.ok ? await smR.json() : null;
    TRENDS = trR.ok ? await trR.json() : null;
    BRIEFINGS = brR.ok ? await brR.json() : null;
    QUAL_COMPARE = qcR.ok ? await qcR.json() : null;

    renderKPI(stats);
    renderCoverage();
    renderTopThreats();
    renderCompanyBriefings();
    renderQualitativeComparison();
    renderCompanyCards();
    renderBenefitDist();
    renderBenchmark();
    renderHeatmap();
    renderTrends();
    renderEvents();
    populateFilters();
  } catch (e) { console.error(e); }
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
      ['intelligence','sections','iframe'].forEach(k => document.getElementById('mp-'+k).classList.add('hidden'));
      document.getElementById('mp-'+btn.dataset.mtab).classList.remove('hidden');
    });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && CURRENT_ID) closeModal(); });
  document.getElementById('detailModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
}

function initFilters() {
  ['searchKw','fCompany','fCat','fStatus'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', renderEvents);
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
  const cs = OVERVIEW?.companies || [];
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

// ============ 주목 이벤트 ============
function renderTopThreats() {
  const threats = ALL.filter(e => e.threat_level === 'High').slice(0, 5);
  const el = document.getElementById('topThreats');
  if (!threats.length) { el.innerHTML = '<p class="text-slate-400">High 위협 이벤트 없음</p>'; return; }
  el.innerHTML = threats.map(e => `
    <div class="flex items-start gap-2 p-2 rounded-lg bg-red-50 border border-red-100 cursor-pointer hover:bg-red-100" onclick="openDetail(${e.id})">
      <span class="badge-sm badge-hi mt-0.5">High</span>
      <div class="min-w-0">
        <span class="${pillCls(e.company)} badge-sm mr-1">${esc(e.company)}</span>
        <span class="font-medium text-slate-800">${esc((e.title||'').substring(0,60))}</span>
        <p class="text-xs text-slate-500 mt-0.5">${esc(e.period||'')} ${e.benefit_value ? '| '+esc(e.benefit_value.substring(0,60)) : ''}</p>
      </div>
    </div>
  `).join('');
}

function renderCompanyBriefings() {
  const box = document.getElementById('companyBriefings');
  const meta = document.getElementById('briefMeta');
  if (!box || !meta) return;
  const items = BRIEFINGS?.items || [];
  if (!items.length) {
    meta.textContent = '';
    box.innerHTML = '<p class="text-sm text-slate-400">브리핑 데이터가 없습니다.</p>';
    return;
  }
  const generatedAt = fmtDate(BRIEFINGS.generated_at);
  meta.textContent = `업데이트: ${generatedAt} · 캐시 TTL ${BRIEFINGS.ttl_sec || 0}초`;
  box.innerHTML = items.map(item => {
    const focus = (item.focus_points || []).slice(0, 3);
    const watch = (item.watchouts || []).slice(0, 2);
    const src = item.source === 'gemini' ? 'Gemini' : 'Rule';
    const srcCls = item.source === 'gemini' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50';
    return `
      <article class="border rounded-xl p-3 bg-white card-co ${coCls(item.company)}">
        <div class="flex items-center justify-between mb-2">
          <span class="${pillCls(item.company)} badge-sm">${esc(item.company)}</span>
          <span class="text-[11px] px-1.5 py-0.5 rounded ${srcCls}">${src}${item.cached ? ' · cache' : ''}</span>
        </div>
        <p class="text-sm text-slate-700 leading-relaxed mb-2">${esc(item.overview || '')}</p>
        ${focus.length ? `<div class="mb-2 flex flex-wrap gap-1">${focus.map(x => `<span class="text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">${esc(x)}</span>`).join('')}</div>` : ''}
        ${watch.length ? `<ul class="space-y-1 text-xs text-rose-700 mb-2">${watch.map(x => `<li>• ${esc(x)}</li>`).join('')}</ul>` : ''}
        <p class="text-xs text-slate-600">${esc(item.action_hint || '')}</p>
      </article>
    `;
  }).join('');
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
  const cs = OVERVIEW?.companies || [];
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
  const cs = OVERVIEW?.companies || [];
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
  const cos = Object.entries(BENCHMARK.companies);
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
    <tbody>${cos.map(([c,v]) => `<tr class="border-t"><td class="px-3 py-2"><span class="${pillCls(c)} badge-sm">${esc(c)}</span></td><td class="px-3 py-2 text-center">${v.count}</td><td class="px-3 py-2 text-right">${(v.avg_amount||0).toLocaleString()}원</td><td class="px-3 py-2 text-right">${(v.max_amount||0).toLocaleString()}원</td><td class="px-3 py-2 text-center">${v.avg_pct||0}%</td><td class="px-3 py-2 text-center">${v.max_pct||0}%</td></tr>`).join('')}</tbody></table>`;
}

// ============ 전략 맵 ============
function renderHeatmap() {
  if (!STRATEGY?.heatmap) return;
  const hm = STRATEGY.heatmap;
  const companies = Object.keys(hm);
  const allTags = new Set();
  companies.forEach(c => Object.keys(hm[c]).forEach(t => allTags.add(t)));
  const tags = [...allTags].sort();
  if (!tags.length) { document.getElementById('heatmapContainer').innerHTML='<p class="text-slate-400 text-sm">데이터 없음</p>'; return; }
  let html = '<table class="w-full text-xs"><thead><tr><th class="px-2 py-1 text-left">카드사</th>';
  tags.forEach(t => html += `<th class="px-2 py-1 text-center">${esc(t)}</th>`);
  html += '</tr></thead><tbody>';
  companies.forEach(c => {
    html += `<tr><td class="px-2 py-1"><span class="${pillCls(c)} badge-sm">${esc(c)}</span></td>`;
    tags.forEach(t => {
      const v = hm[c][t] || 0;
      const bg = v === 0 ? '#f8fafc' : v <= 2 ? '#dbeafe' : v <= 5 ? '#93c5fd' : '#3b82f6';
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

// ============ 이벤트 목록 ============
function getFiltered() {
  let list = ALL.slice();
  const kw = (document.getElementById('searchKw').value||'').trim().toLowerCase();
  const co = document.getElementById('fCompany').value;
  const cat = document.getElementById('fCat').value;
  const st = document.getElementById('fStatus').value;
  if (co) list = list.filter(e => e.company === co);
  if (cat) list = list.filter(e => e.category === cat);
  if (st === 'active') list = list.filter(e => isActive(e));
  if (st === 'ended') list = list.filter(e => !isActive(e));
  if (kw) list = list.filter(e => [e.title,e.benefit_value,e.company,e.category].join(' ').toLowerCase().includes(kw));
  return list;
}

function renderEvents() {
  const list = getFiltered();
  const tbody = document.getElementById('eventsTbody');
  const empty = document.getElementById('eventsEmpty');
  if (!list.length) { tbody.innerHTML=''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  tbody.innerHTML = list.map(e => {
    const ben = (e.benefit_value||'').replace(/상세 페이지 참조|정보 없음/gi,'').trim()||'—';
    const tl = e.threat_level;
    const tlCls = tl==='High'?'badge-hi':tl==='Mid'?'badge-mid':'badge-lo';
    return `<tr class="row-co ${coCls(e.company)} hover:opacity-90 cursor-pointer" onclick="openDetail(${e.id})">
      <td class="px-3 py-2"><span class="${pillCls(e.company)} badge-sm">${esc(e.company)}</span></td>
      <td class="px-3 py-2 font-medium">${esc((e.title||'').substring(0,50))}</td>
      <td class="px-3 py-2 text-slate-600 max-w-[200px] truncate">${esc(ben.substring(0,60))}</td>
      <td class="px-3 py-2 text-xs text-slate-500">${esc(e.period||'—')}</td>
      <td class="px-3 py-2"><span class="badge-sm ${tlCls}">${tl||'-'}</span></td>
      <td class="px-3 py-2"><a href="${e.url}" target="_blank" class="text-slate-400 hover:text-slate-600" onclick="event.stopPropagation()"><i class="fas fa-external-link-alt"></i></a></td>
    </tr>`;
  }).join('');
}

function populateFilters() {
  const cos = [...new Set(ALL.map(e => e.company))].filter(Boolean).sort();
  const cats = [...new Set(ALL.map(e => e.category))].filter(Boolean).sort();
  document.getElementById('fCompany').innerHTML = '<option value="">전체 카드사</option>' + cos.map(c => `<option>${esc(c)}</option>`).join('');
  document.getElementById('fCat').innerHTML = '<option value="">전체 카테고리</option>' + cats.map(c => `<option>${esc(c)}</option>`).join('');
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
  // 모달 탭 초기화
  document.querySelectorAll('#detailModal .tab-btn').forEach((b,i) => b.classList.toggle('active', i===0));
  ['intelligence','sections','iframe'].forEach((k,i) => document.getElementById('mp-'+k).classList.toggle('hidden', i!==0));

  // intelligence API 호출
  document.getElementById('mp-intelligence').innerHTML = '<p class="text-slate-400">로딩 중…</p>';
  document.getElementById('mp-sections').innerHTML = '<p class="text-slate-400">로딩 중…</p>';
  try {
    const r = await fetch(`/api/events/${id}/intelligence`);
    const d = await r.json();
    renderIntelligence(d);
    renderSections(d.sections || []);
  } catch { document.getElementById('mp-intelligence').innerHTML = '<p class="text-slate-400">로드 실패</p>'; }
}

function renderIntelligence(d) {
  const ins = d.insight;
  const el = document.getElementById('mp-intelligence');
  if (!ins) { el.innerHTML = '<p class="text-slate-400">인사이트 없음. 「추출」 버튼을 눌러주세요.</p>'; return; }
  let h = '';
  // 마케팅 시사점
  if (ins.marketing_takeaway) {
    h += `<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4"><p class="text-xs font-bold text-blue-800 mb-1"><i class="fas fa-robot mr-1"></i>AI 마케팅 시사점</p><p class="text-blue-900 leading-relaxed text-sm">${esc(ins.marketing_takeaway)}</p></div>`;
  }
  // 위협도
  if (ins.threat_level) {
    const tc = ins.threat_level==='High'?'text-red-600':ins.threat_level==='Mid'?'text-amber-600':'text-emerald-600';
    h += `<div class="mb-3"><span class="text-xs font-bold text-slate-500 uppercase">위협도</span> <span class="${tc} font-bold">${esc(ins.threat_level)}</span>`;
    if (ins.threat_reason) h += `<p class="text-xs text-slate-500 mt-0.5">${esc(ins.threat_reason)}</p>`;
    h += '</div>';
  }
  // 핵심 지표
  h += '<div class="grid grid-cols-3 gap-3 mb-4">';
  h += `<div class="text-center"><div class="text-xs text-slate-500">혜택 수준</div><div class="font-bold ${ins.benefit_level==='높음'?'text-emerald-600':ins.benefit_level==='낮음'?'text-red-600':'text-slate-700'}">${esc(ins.benefit_level||'-')}</div></div>`;
  h += `<div class="text-center"><div class="text-xs text-slate-500">타겟 명확도</div><div class="font-bold">${esc(ins.target_clarity||'-')}</div></div>`;
  h += `<div class="text-center"><div class="text-xs text-slate-500">신뢰도</div><div class="font-bold">${ins.insight_confidence ? Math.round(ins.insight_confidence*100)+'%' : '-'}</div></div>`;
  h += '</div>';
  // 태그
  const tagBlock = (label, tags) => {
    if (!tags?.length) return '';
    return `<div class="mb-3"><span class="text-xs font-bold text-slate-500 uppercase">${label}</span><div class="flex flex-wrap gap-1 mt-1">${tags.map(t=>'<span class="text-xs bg-slate-100 px-2 py-0.5 rounded">'+esc(t)+'</span>').join('')}</div></div>`;
  };
  h += tagBlock('경쟁력 포인트', ins.competitive_points);
  h += tagBlock('프로모션 전략', ins.promo_strategies);
  h += tagBlock('목적 태그', ins.objective_tags);
  h += tagBlock('타겟 태그', ins.target_tags);
  h += tagBlock('채널 태그', ins.channel_tags);
  // 원문 근거
  if (ins.evidence?.length) {
    h += '<div class="mt-3"><span class="text-xs font-bold text-slate-500 uppercase">원문 근거</span><ul class="mt-1 space-y-1 text-xs text-slate-600 list-disc list-inside">';
    ins.evidence.forEach(e => h += `<li>${esc(e)}</li>`);
    h += '</ul></div>';
  }
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

// ============ 파이프라인 트리거 ============
async function triggerPipeline() {
  const btn = document.getElementById('btnPipe');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>실행 중…';
  try {
    const r = await fetch('/api/pipeline/full', {method:'POST'});
    const d = await r.json();
    alert(d.message || '완료');
    await loadAll();
  } catch(e) { alert('파이프라인 실패: '+e.message); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-bolt mr-1"></i>전체 파이프라인'; }
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

// ============ 엑셀 ============
function exportExcel() {
  const list = getFiltered();
  const rows = [['카드사','제목','혜택','조건','기간','위협도','카테고리','인사이트 요약','URL']];
  list.forEach(e => {
    const ins = pjson(e.marketing_insights);
    const summary = ins ? [ins.benefit_level, ...(ins.competitive_points||[]).slice(0,2), ...(ins.promo_strategies||[]).slice(0,2)].filter(Boolean).join(' / ') : '';
    rows.push([e.company, e.title, e.benefit_value||'', e.conditions||'', e.period||'', e.threat_level||'', e.category||'', summary, e.url]);
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
