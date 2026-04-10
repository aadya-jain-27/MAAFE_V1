// ════════════════════════════════════════════════════════════════
// MAAFE — Charts & Goals
// All charts rendered from real user transaction data
// ════════════════════════════════════════════════════════════════

let pieChart    = null;
let trendChart  = null;
let simChartObj = null;

// Called on page load and whenever transactions update
window.addEventListener('load', () => {
  const txns = getUserTransactions();
  refreshCharts(txns);
  updateSim();
});

function refreshCharts(txns) {
  const summary = computeFinancialSummary(txns || []);
  renderPieChart(summary);
  renderTrendChart(summary);
}

// ── Spending Pie Chart ────────────────────────────────────────
function renderPieChart(summary) {
  const ctx = document.getElementById('spendPieChart');
  if (!ctx) return;

  let labels, values, colors;
  const palette = ['#2563eb','#dc2626','#ec4899','#7c3aed','#0d9488','#d97706','#16a34a','#f97316'];

  if (summary && summary.topCats.length > 0) {
    const debitCats = summary.topCats.slice(0, 7);
    labels  = debitCats.map(c => c.cat);
    values  = debitCats.map(c => c.amt);
    colors  = debitCats.map((_, i) => palette[i % palette.length]);
  } else {
    // No real data — show empty placeholder
    labels  = ['No data yet'];
    values  = [1];
    colors  = ['#e2e8f0'];
  }

  const data = { labels, datasets:[{ data:values, backgroundColor:colors, borderWidth:0, hoverOffset:8 }] };
  const opts = {
    responsive:true, cutout:'62%',
    plugins:{
      legend:{ display:false },
      tooltip:{ callbacks:{ label: c => ' ₹'+c.parsed.toLocaleString('en-IN')+' on '+c.label } }
    }
  };

  if (pieChart) { pieChart.data = data; pieChart.update(); }
  else pieChart = new Chart(ctx, { type:'doughnut', data, options:opts });

  const leg = document.getElementById('spend-legend');
  if (leg) leg.innerHTML = labels.map((l,i) =>
    `<div class="legend-item"><div class="legend-dot" style="background:${colors[i]};"></div><span>${l}</span></div>`
  ).join('');
}

// ── Monthly Savings Trend ─────────────────────────────────────
function renderTrendChart(summary) {
  const ctx = document.getElementById('savingsTrendChart');
  if (!ctx) return;

  let labels, values;
  if (summary && summary.monthlyTrend.length > 1) {
    labels = summary.monthlyTrend.map(([month]) => month);
    values = summary.monthlyTrend.map(([, data]) => Math.max(0, data.income - data.expenses));
  } else {
    // No real data — empty chart
    labels = ['No data'];
    values = [0];
  }

  const data = {
    labels,
    datasets:[{
      label:'Saved (₹)', data:values,
      backgroundColor: ctx => {
        const v = ctx.raw;
        return v>=25000?'rgba(22,163,74,0.8)':v>=10000?'rgba(37,99,235,0.7)':'rgba(220,38,38,0.7)';
      },
      borderRadius:6, borderSkipped:false
    }]
  };
  const opts = {
    responsive:true,
    plugins:{
      legend:{display:false},
      tooltip:{callbacks:{label:c=>' ₹'+c.parsed.y.toLocaleString('en-IN')+' saved'}}
    },
    scales:{
      x:{grid:{display:false},ticks:{color:'#8fa0b8',font:{size:11}}},
      y:{grid:{color:'rgba(0,0,0,0.04)'},ticks:{color:'#8fa0b8',font:{size:11},callback:v=>'₹'+(v/1000).toFixed(0)+'k'}}
    }
  };

  if (trendChart) { trendChart.data = data; trendChart.update(); }
  else trendChart = new Chart(ctx, { type:'bar', data, options:opts });
}

// ── Goals page ────────────────────────────────────────────────
function initGoalsPage() {
  const grid = document.getElementById('goals-grid');
  if (!grid) return;

  const txns    = getUserTransactions();
  const summary = computeFinancialSummary(txns || []);
  const user    = JSON.parse(localStorage.getItem('maafe_current_user') || '{}');
  const fmt     = n => n.toLocaleString('en-IN');

  const monthlySave   = summary ? Math.round(summary.monthlySurplus * 0.35) : 10000;
  const monthlyInvest = summary ? Math.round(summary.monthlySurplus * 0.4 / 500) * 500 : 12000;
  const monthlyExp    = summary ? summary.monthlyExpenses : 54230;

  const GOAL_DEFS = {
    emergency: { icon:'🛡️', title:'Emergency Safety Net',
      desc:'3 months of monthly expenses as a financial cushion',
      target: monthlyExp * 3, monthlyAdd: monthlySave, color:'var(--amber)' },
    home:      { icon:'🏠', title:'Buy a Home',
      desc:'Save for a 20% down payment on a home (₹60L estimate)',
      target:1200000, monthlyAdd: monthlyInvest, color:'var(--blue)' },
    car:       { icon:'🚗', title:'Buy a Car',
      desc:'Save for a car down payment (20% of ₹12L)',
      target:240000,  monthlyAdd: Math.round(summary?.monthlySurplus*0.2||5000), color:'var(--teal)' },
    retire:    { icon:'🌅', title:'Retirement Corpus',
      desc:'Build a retirement fund for financial freedom after 60',
      target:5000000, monthlyAdd: monthlyInvest, color:'var(--green)' },
    travel:    { icon:'✈️', title:'Travel Fund',
      desc:'Save for a big international trip',
      target:200000,  monthlyAdd: Math.round(summary?.monthlySurplus*0.15||3000), color:'var(--purple)' },
    invest:    { icon:'📈', title:'Investment Portfolio',
      desc:'Build a diversified investment portfolio',
      target:1000000, monthlyAdd: monthlyInvest, color:'var(--green)' },
  };

  const selectedGoals = (user.goals || ['emergency','home','retire'])
    .map(k => GOAL_DEFS[k])
    .filter(Boolean);

  grid.innerHTML = selectedGoals.map(g => {
    const pct   = Math.min(Math.round((0 / g.target) * 100), 100); // start from 0 — no saved corpus
    const months = g.monthlyAdd > 0 ? Math.ceil(g.target / g.monthlyAdd) : '?';
    return `<div class="goal-card">
      <div class="goal-card-icon">${g.icon}</div>
      <div class="goal-card-title">${g.title}</div>
      <div class="goal-card-desc">${g.desc}</div>
      <div class="goal-progress-label">
        <span>₹0 saved</span>
        <strong>₹${fmt(g.target)} goal</strong>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${g.color};"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:var(--text-muted);">
        <span>${pct}% complete</span>
        <span>~${months} months at ${summary?'₹'+fmt(g.monthlyAdd):'est.'}/month</span>
      </div>
    </div>`;
  }).join('');

  if (summary) {
    const infoEl = document.getElementById('goals-note');
    if (infoEl) infoEl.textContent =
      `Based on your real data: ₹${fmt(summary.monthlySurplus)} monthly surplus, ₹${fmt(monthlySave)}/month toward safety net, ₹${fmt(monthlyInvest)}/month for investing.`;
  }

  initSimChart();
  updateSim();
}

// ── Investment simulator ──────────────────────────────────────
function updateSim() {
  const sipEl = document.getElementById('s-sip');
  const retEl = document.getElementById('s-ret');
  const yrEl  = document.getElementById('s-yr');
  if (!sipEl) return;

  const sip     = parseInt(sipEl.value) || 12000;
  const ret     = parseFloat(retEl.value) || 12;
  const yrs     = parseInt(yrEl.value) || 10;
  const monthly = ret / 12 / 100;
  const n       = yrs * 12;
  const corpus  = sip * ((Math.pow(1+monthly,n)-1)/monthly) * (1+monthly);
  const invested= sip * n;
  const profit  = corpus - invested;

  const setD = (id, v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  setD('sip-display', '₹'+sip.toLocaleString('en-IN'));
  setD('ret-display', ret+'%');
  setD('yr-display',  yrs+' year'+(yrs===1?'':'s'));
  setD('sim-corpus',  _fmt(corpus));
  setD('sim-invested',_fmt(invested));
  setD('sim-profit',  _fmt(profit));

  // Pre-fill SIP from real surplus if available
  const txns = getUserTransactions();
  const s    = computeFinancialSummary(txns || []);
  if (s && !sipEl.dataset.userChanged) {
    const suggestedSip = Math.round(s.monthlySurplus * 0.4 / 500) * 500;
    if (suggestedSip > 0 && suggestedSip !== sip) {
      sipEl.value = suggestedSip;
      sipEl.dataset.userChanged = ''; // update once
      updateSim();
      return;
    }
  }

  if (simChartObj) {
    const labs=[], cData=[], iData=[];
    for (let y=1; y<=yrs; y++) {
      labs.push('Yr '+y);
      const nm = y*12;
      cData.push(Math.round(sip*((Math.pow(1+monthly,nm)-1)/monthly)*(1+monthly)));
      iData.push(sip*nm);
    }
    simChartObj.data.labels = labs;
    simChartObj.data.datasets[0].data = cData;
    simChartObj.data.datasets[1].data = iData;
    simChartObj.update('none');
  }
}

function _fmt(v) {
  if (v>=10000000) return '₹'+(v/10000000).toFixed(1)+' Cr';
  if (v>=100000)   return '₹'+(v/100000).toFixed(1)+' L';
  return '₹'+Math.round(v).toLocaleString('en-IN');
}

function initSimChart() {
  const ctx = document.getElementById('simChart');
  if (!ctx || simChartObj) return;
  simChartObj = new Chart(ctx, {
    type:'line',
    data:{ labels:[], datasets:[
      { label:'Total wealth', data:[], borderColor:'#16a34a', backgroundColor:'rgba(22,163,74,0.08)', fill:true, tension:0.4, pointRadius:3, pointBackgroundColor:'#16a34a' },
      { label:'Amount invested', data:[], borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,0.04)', fill:true, tension:0.4, borderDash:[6,4], pointRadius:0 }
    ]},
    options:{
      responsive:true, interaction:{intersect:false,mode:'index'},
      plugins:{
        legend:{labels:{font:{size:12,family:'Plus Jakarta Sans'},color:'#4a5568',boxWidth:12}},
        tooltip:{callbacks:{label:c=>{const v=c.parsed.y; return ' '+c.dataset.label+': '+_fmt(v);}}}
      },
      scales:{
        x:{ticks:{color:'#8fa0b8',font:{size:11}},grid:{color:'rgba(0,0,0,0.04)'}},
        y:{ticks:{color:'#8fa0b8',font:{size:11},callback:v=>v>=100000?'₹'+(v/100000).toFixed(0)+'L':'₹'+(v/1000).toFixed(0)+'k'},grid:{color:'rgba(0,0,0,0.04)'}}
      }
    }
  });
  updateSim();
}

window.refreshCharts = refreshCharts;
window.updateSim     = updateSim;
window.initGoalsPage = initGoalsPage;
