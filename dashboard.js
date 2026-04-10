// ════════════════════════════════════════════════════════════════
// MAAFE — Dashboard Core
// All values computed from real user transactions — nothing hardcoded
// ════════════════════════════════════════════════════════════════

// Demo transactions — only shown when user has NO real data yet
const DEMO_TRANSACTIONS = [
  { date: '26 Mar 2026', merchant: 'Amazon India',    cat: 'Shopping',   type: 'debit',  amount: 3450 },
  { date: '25 Mar 2026', merchant: 'Salary Credit',   cat: 'Salary / Income', type: 'credit', amount: 82500 },
  { date: '24 Mar 2026', merchant: 'Zomato Order',    cat: 'Food & Dining',  type: 'debit',  amount: 680 },
  { date: '23 Mar 2026', merchant: 'BPCL Petrol',     cat: 'Transport',  type: 'debit',  amount: 2200 },
  { date: '22 Mar 2026', merchant: 'Airtel Recharge', cat: 'Utilities & Bills', type: 'debit', amount: 899 },
  { date: '21 Mar 2026', merchant: 'House Rent',      cat: 'Housing',    type: 'debit',  amount: 18000 },
  { date: '20 Mar 2026', merchant: 'Swiggy Order',    cat: 'Food & Dining',  type: 'debit',  amount: 420 },
  { date: '19 Mar 2026', merchant: 'Netflix',         cat: 'Entertainment',  type: 'debit',  amount: 649 },
];

window.DEMO_TRANSACTIONS = DEMO_TRANSACTIONS;

// ── Boot ──────────────────────────────────────────────────────
window.addEventListener('load', () => {
  checkAuth();
  populateGreeting();
  populateTransactions();
  populateSuggestions();
  // Gmail auth initialises after GIS library loads
  if (window.google?.accounts?.oauth2) initGmailAuth();
});

// Google GIS fires this callback when library is ready
window.gmailLibReady = function() { initGmailAuth(); };

function checkAuth() {
  const user = JSON.parse(localStorage.getItem('maafe_current_user') || 'null');
  if (!user) { window.location.href = 'index.html'; return; }
}

function logout() {
  localStorage.removeItem('maafe_current_user');
  window.location.href = 'index.html';
}

// ── Greeting ──────────────────────────────────────────────────
function populateGreeting() {
  const h    = new Date().getHours();
  const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const user = JSON.parse(localStorage.getItem('maafe_current_user') || '{}');
  const name = (user.name || 'there').split(' ')[0];
  const el   = document.getElementById('greeting-main');
  if (el) el.textContent = `${time}, ${name}`;
  const nav  = document.getElementById('user-greeting');
  if (nav) nav.textContent = `Hi, ${name}!`;

  // Show user email + connect status in home
  const emailEl = document.getElementById('home-user-email');
  if (emailEl && user.email) emailEl.textContent = user.email;
}

// ── Transactions ──────────────────────────────────────────────
function populateTransactions() {
  const real    = getUserTransactions();
  const hasReal = real && real.length > 0;
  const data    = hasReal ? real : [];   // never silently show demo numbers

  renderTxnList('home-txn-list',   hasReal ? data.slice(0, 5) : []);
  renderTxnList('email-txn-list',  data);
  updateTxnCount(hasReal ? data.length : 0);

  if (hasReal) {
    const summary = computeFinancialSummary(data);
    if (summary) updateHomeStats(summary);
  }
  // If no real data: stat cards stay as "—" (set in HTML)
}

function updateHomeStats(s) {
  const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('stat-income',   fmt(s.monthlyIncome));
  set('stat-expenses', fmt(s.monthlyExpenses));
  set('stat-surplus',  s.monthlySurplus >= 0 ? fmt(s.monthlySurplus) : '-' + fmt(Math.abs(s.monthlySurplus)));

  // Safety net days
  const safetyDays = s.monthlyExpenses > 0 ? Math.round((s.monthlySurplus / s.monthlyExpenses) * 30) : 0;
  set('stat-safety', safetyDays > 0 ? safetyDays + ' days' : '< 1 day');

  // Notes under each card
  const savingsRate = s.monthlyIncome > 0 ? Math.round((s.monthlySurplus / s.monthlyIncome) * 100) : 0;
  set('stat-income-note',   'Est. from ' + s.txnCount + ' transactions');
  set('stat-expenses-note', s.topCats.length > 0 ? 'Biggest: ' + s.topCats[0].cat : 'Across all categories');
  set('stat-surplus-note',  savingsRate + '% of income ' + (savingsRate >= 20 ? '✓' : '— improve this'));
  const emergTarget = s.monthlyExpenses * 3;
  const monthsLeft  = s.monthlySurplus > 0 ? Math.ceil(emergTarget / (s.monthlySurplus * 0.35)) : '?';
  set('stat-safety-note', safetyDays >= 90 ? '3 months covered!' : 'Need ' + fmt(emergTarget) + ' (~' + monthsLeft + ' months)');

  // Health score
  const score = Math.min(100, Math.max(20, Math.round(40 + savingsRate * 1.5)));
  set('health-val', score);

  // Advisor sidebar stats
  set('adv-income',       fmt(s.monthlyIncome));
  set('adv-expenses',     fmt(s.monthlyExpenses));
  set('adv-surplus',      fmt(s.monthlySurplus));
  set('adv-safety',       safetyDays + ' days');
  set('adv-health-score', score + ' / 100');

  // Insight banner
  const top = s.topCats[0];
  if (top) {
    set('insight-title', 'Your AI agents noticed something');
    set('insight-body',
      'Your biggest expense is ' + top.cat + ' at ' + fmt(top.amt) +
      " — that's " + Math.round((top.amt / Math.max(1, s.totalExpenses)) * 100) + "% of all spending. Click to see the full breakdown."
    );
    const btn = document.querySelector('#insight-banner .insight-action');
    if (btn) { btn.textContent = 'See Details →'; btn.onclick = () => showSection('agents'); }
  }
}

function renderTxnList(id, txns) {
  const el = document.getElementById(id);
  if (!el || !txns) return;
  if (txns.length === 0) {
    el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">No transactions yet — connect Gmail or paste an email below.</div>';
    return;
  }
  el.innerHTML = txns.map(t => `
    <div class="txn-item">
      <div class="txn-icon txn-icon-text">${(t.cat || 'Other').slice(0,2).toUpperCase()}</div>
      <div class="txn-info">
        <div class="txn-merchant">${t.merchant || 'Unknown'}</div>
        <div class="txn-meta">${t.cat || 'Other'} · ${t.date || ''}</div>
      </div>
      <div class="txn-amount ${t.type}">
        ${t.type === 'credit' ? '+' : '-'}₹${Number(t.amount).toLocaleString('en-IN')}
      </div>
    </div>`).join('');
}

function updateTxnCount(n) {
  const el = document.getElementById('txn-count');
  if (el) el.textContent = `${n} transaction${n === 1 ? '' : 's'} recorded`;
}

// ── Suggestions — always computed from real data ──────────────
function populateSuggestions() {
  const el = document.getElementById('suggestions-list');
  if (!el) return;
  const txns    = getUserTransactions();
  const summary = computeFinancialSummary(txns || []);
  const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');

  let items;
  if (summary && txns) {
    const top  = summary.topCats[0] || { cat: 'expenses', amt: 0 };
    const sip  = Math.round(summary.monthlySurplus * 0.4 / 500) * 500;
    const eSave = Math.round(summary.monthlySurplus * 0.35);
    const eMos  = eSave > 0 ? Math.ceil((summary.monthlyExpenses * 3) / eSave) : '?';
    items = [
      { icon: '',
        title: `Your biggest spend: ${top.cat} — ${fmt(top.amt)}`,
        desc:  `That's your top expense. Trimming it by just 15% frees ${fmt(Math.round(top.amt * 0.15))} every month — enough to kickstart investing.`,
        tags:  [{ text:'Spending Watcher', cls:'tag-blue' }, { text:'Act now', cls:'tag-red' }] },
      { icon: '',
        title: 'Build your emergency safety net',
        desc:  `Target ${fmt(summary.monthlyExpenses * 3)} (3 months of expenses). Setting aside ${fmt(eSave)}/month gets you there in ~${eMos} months.`,
        tags:  [{ text:'Safety Guard', cls:'tag-amber' }, { text:'Important', cls:'tag-red' }] },
      { icon: '',
        title: `Start a ${fmt(sip)}/month SIP investment`,
        desc:  `You have ${fmt(summary.monthlySurplus)} surplus/month. A ${fmt(sip)} SIP in a NIFTY 50 index fund could grow significantly over 10 years at 12% p.a.`,
        tags:  [{ text:'Growth Advisor', cls:'tag-green' }, { text:'Long-term', cls:'tag-purple' }] },
      { icon: '',
        title: 'Check your tax-saving opportunities',
        desc:  `Annual income ~${fmt(summary.monthlyIncome * 12)}. Claiming 80C (ELSS/PPF) + HRA + 80D before July 31 could save you a meaningful amount.`,
        tags:  [{ text:'Tax Saver', cls:'tag-blue' }, { text:'Before July 31', cls:'tag-amber' }] },
    ];
  } else {
    // No data yet — show generic prompt to connect Gmail
    items = [{
      icon: '📧',
      title: 'Connect Gmail to see your personalised insights',
      desc:  'Once you connect Gmail, every suggestion here will be based on your real transactions — no generic advice.',
      tags:  [{ text:'Action needed', cls:'tag-amber' }]
    }];
  }

  el.innerHTML = items.map(s => `
    <div class="suggestion-item">
      ${s.icon ? `<div class="sug-icon">${s.icon}</div>` : ""}
      <div class="sug-content">
        <div class="sug-title">${s.title}</div>
        <div class="sug-desc">${s.desc}</div>
        <div class="sug-tags">${s.tags.map(t => `<span class="tag ${t.cls}">${t.text}</span>`).join('')}</div>
      </div>
    </div>`).join('');
}

// ── Section navigation ────────────────────────────────────────
function showSection(id) {
  document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-pill').forEach(p => p.classList.remove('active'));
  document.getElementById('section-' + id)?.classList.add('active');
  const pillMap = { home:0, emails:1, agents:2, goals:3, advisor:4 };
  const pills = document.querySelectorAll('.nav-pill');
  if (pills[pillMap[id]]) pills[pillMap[id]].classList.add('active');

  if (id === 'goals')  initGoalsPage();
  if (id === 'emails') initEmailsPage();
  if (id === 'agents') initAgentsPage();
}

// ── Data bar ──────────────────────────────────────────────────
function updateDataBar() {
  const label = document.getElementById('user-data-label');
  if (!label) return;
  const user = JSON.parse(localStorage.getItem('maafe_current_user') || '{}');
  const txns = getUserTransactions();
  if (txns && txns.length > 0) {
    label.textContent = `${txns.length} real transactions loaded for ${user.email || 'you'}`;
    label.style.color = 'var(--green)';
  } else {
    label.textContent = `⚠ Showing demo data — connect Gmail or paste emails below`;
    label.style.color = 'var(--text-muted)';
  }
}

function confirmClearData() {
  if (confirm('Delete all imported transactions? This cannot be undone.')) {
    clearUserTransactions();
    populateTransactions();
    populateSuggestions();
    updateDataBar();
    if (typeof refreshCharts === 'function') refreshCharts(null);
    showToast('Transaction history cleared.');
  }
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

window.showSection      = showSection;
window.showToast        = showToast;
window.renderTxnList    = renderTxnList;
window.updateTxnCount   = updateTxnCount;
window.updateDataBar    = updateDataBar;
window.confirmClearData = confirmClearData;
window.populateTransactions = populateTransactions;
window.populateSuggestions  = populateSuggestions;
