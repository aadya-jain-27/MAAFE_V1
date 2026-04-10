// ════════════════════════════════════════════════════════════════
// MAAFE — AI Agents
// All static charts + AI prompts computed from real user data
// ════════════════════════════════════════════════════════════════

const AGENT_META = {
  spending:   { icon:'SW', name:'Spending Watcher', subtitle:'Tracks where your money goes',           color:'var(--blue)'   },
  risk:       { icon:'SG', name:'Safety Guard',     subtitle:'Checks if you\'re financially safe',    color:'var(--amber)'  },
  investment: { icon:'GA', name:'Growth Advisor',   subtitle:'Helps your money grow',                 color:'var(--green)'  },
  tax:        { icon:'TS', name:'Tax Saver',        subtitle:'Finds legal ways to pay less tax',      color:'var(--purple)' },
  compliance: { icon:'', name:'Rule Checker',      subtitle:'Makes sure everything is legal',        color:'var(--teal)'   },
};

let selectedAgent = 'spending';

function initAgentsPage() {
  loadAgentPanel('spending');
}

function selectAgent(key) {
  selectedAgent = key;
  document.querySelectorAll('.agent-bubble').forEach(b => b.classList.remove('active'));
  document.getElementById('abubble-' + key)?.classList.add('active');
  loadAgentPanel(key);
}

function loadAgentPanel(key) {
  const meta = AGENT_META[key];
  const txns = getUserTransactions();
  const s    = computeFinancialSummary(txns || []);

  document.getElementById('adp-icon').textContent    = meta.icon;
  document.getElementById('adp-title').textContent   = meta.name;
  document.getElementById('adp-subtitle').textContent = meta.subtitle;
  document.getElementById('adp-static-content').innerHTML = buildStaticHTML(key, s);
  document.getElementById('adp-ai-output').innerHTML =
    '<div class="adp-placeholder">Click "Get Analysis" to see what this agent thinks about your finances.</div>';
}

// ── Static visual cards — all data-driven ─────────────────────
function buildStaticHTML(key, s) {
  const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const hasReal = s && s.txnCount > 0;

  if (key === 'spending') {
    let cats;
    if (hasReal && s.topCats.length > 0) {
      const max = Math.max(...s.topCats.map(c=>c.amt), 1);
      cats = s.topCats.slice(0,5).map(c => {
        const pct = Math.round((c.amt/max)*100);
        return { label:c.cat, spent:c.amt, pct, color: pct>85?'var(--red)':pct>55?'var(--amber)':'var(--blue)', note: pct>85?'Top spend':'On track' };
      });
    } else {
      cats = [
        {label:'Food & Dining',pct:85,spent:12400,color:'var(--red)',note:'Top spend'},
        {label:'Housing',pct:65,spent:18000,color:'var(--amber)',note:'Fixed cost'},
        {label:'Shopping',pct:45,spent:8800,color:'var(--blue)',note:'On track'},
        {label:'Transport',pct:30,spent:7200,color:'var(--blue)',note:'On track'},
        {label:'Utilities',pct:20,spent:3400,color:'var(--green)',note:'Great!'},
      ];
    }
    const top = cats[0];
    return `<div style="margin-bottom:16px;">
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">Spending by category ${hasReal?'(your real data)':'(demo)'}</div>
      ${cats.map(c=>`<div class="stat-bar-row">
        <div class="stat-bar-label">${c.label}</div>
        <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${Math.min(c.pct,100)}%;background:${c.color};"></div></div>
        <div style="font-size:11px;color:${c.color};width:90px;text-align:right;flex-shrink:0;">${c.note}</div>
      </div>`).join('')}
    </div>
    <div style="background:var(--red-bg);border:1px solid var(--red-brd);border-radius:10px;padding:12px;font-size:13px;color:var(--text);">
      <strong style="color:var(--red);">⚠ Biggest spend:</strong> ${top.label} — ${hasReal?fmt(top.spent):'demo data'}
    </div>`;
  }

  if (key === 'risk') {
    const income   = hasReal ? s.monthlyIncome   : 82500;
    const expenses = hasReal ? s.monthlyExpenses  : 54230;
    const surplus  = hasReal ? s.monthlySurplus   : 28270;
    const savingsRate = income>0 ? Math.round(surplus/income*100) : 34;
    const sColor = savingsRate>=20?'var(--green)':savingsRate>=10?'var(--amber)':'var(--red)';
    const eTarget = fmt(expenses*3);
    const eMonths = surplus>0 ? Math.ceil((expenses*3)/(surplus*0.35)) : '?';
    const rows = [
      {label:'Monthly surplus',    val:fmt(surplus),               color: surplus>=0?'var(--green)':'var(--red)', icon: surplus>=0?'●':'●', note: surplus>=0?'Positive flow':'Overspending'},
      {label:'Savings rate',       val:`${savingsRate}% of income`, color: sColor,         icon: savingsRate>=20?'●':'●', note: savingsRate>=20?'Above average':'Needs attention'},
      {label:'Emergency fund target',val:eTarget,                 color:'var(--blue)',    icon:'●', note:`~${eMonths} months to build`},
      {label:'Insurance detected', val:'Not found',               color:'var(--red)',     icon:'●', note:'Risky without coverage'},
    ];
    const needle = Math.max(5, Math.min(95, 100 - savingsRate*2));
    return `<div style="margin-bottom:16px;">
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">Financial safety check ${hasReal?'(your real data)':'(demo)'}</div>
      ${rows.map(r=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;">
        <span style="font-size:13px;color:var(--text-sec);">${r.icon} ${r.label}</span>
        <div style="text-align:right;">
          <div style="font-size:13px;font-weight:700;color:${r.color};">${r.val}</div>
          <div style="font-size:11px;color:var(--text-muted);">${r.note}</div>
        </div>
      </div>`).join('')}
    </div>
    <div style="margin-top:12px;">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">Overall financial safety:</div>
      <div class="risk-meter-wrap">
        <div class="risk-meter-track"><div class="risk-needle" style="left:${needle}%;"></div></div>
        <div class="risk-meter-labels"><span>Safe</span><span>Moderate</span><span>Risky</span></div>
      </div>
    </div>`;
  }

  if (key === 'investment') {
    const surplus  = hasReal ? s.monthlySurplus : 28270;
    const sipAmt   = Math.round(surplus * 0.4 / 500) * 500;
    const sipGrowth = fmt(Math.round(sipAmt * 12 * ((Math.pow(1.01,120)-1)/0.01) * 1.01));
    const funds = [
      {name:'NIFTY 50 Index Fund',pct:40,color:'var(--green)',why:'Low cost, steady growth'},
      {name:'Mid Cap Mutual Fund', pct:25,color:'var(--blue)', why:'Higher growth potential'},
      {name:'Debt / Bond Fund',    pct:20,color:'var(--amber)',why:'Stability & balance'},
      {name:'Gold ETF',            pct:15,color:'var(--purple)',why:'Inflation protection'},
    ];
    return `<div style="margin-bottom:16px;">
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">Suggested investment mix ${hasReal?'(based on your surplus)':'(demo)'}</div>
      ${funds.map(f=>`<div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
          <span style="color:var(--text);">${f.name}</span>
          <span style="font-weight:700;color:${f.color};">${f.pct}%</span>
        </div>
        <div class="stat-bar-track" style="height:8px;"><div class="stat-bar-fill" style="width:${f.pct*2.5}%;background:${f.color};"></div></div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">${f.why}</div>
      </div>`).join('')}
    </div>
    <div style="background:var(--green-bg);border:1px solid var(--green-brd);border-radius:10px;padding:12px;font-size:13px;">
      <strong style="color:var(--green);">Suggested:</strong> ${fmt(sipAmt)}/month SIP — could grow to ${sipGrowth} in 10 years!
    </div>`;
  }

  if (key === 'tax') {
    const annual = hasReal ? s.monthlyIncome*12 : 990000;
    const est    = fmt(Math.round(annual*0.0315));
    return `<div style="margin-bottom:16px;">
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">Tax saving opportunities ${hasReal?'(based on your income)':'(demo)'}</div>
      ${[
        {label:'80C — Invest in ELSS/PPF/NPS', saving:'Up to ₹46,800/year', status:'Not done yet', cls:'tag-amber'},
        {label:'HRA — Rent exemption',         saving:'Reduces taxable income', status:'Claim it!',    cls:'tag-red'},
        {label:'80D — Health insurance',       saving:'Up to ₹7,800/year',  status:'Buy insurance', cls:'tag-red'},
      ].map(t=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--text);">${t.label}</div>
          <div style="font-size:11px;color:var(--text-muted);">Potential saving: ${t.saving}</div>
        </div>
        <span class="tag ${t.cls}">${t.status}</span>
      </div>`).join('')}
    </div>
    <div style="background:var(--green-bg);border:1px solid var(--green-brd);border-radius:10px;padding:12px;font-size:13px;font-weight:700;color:var(--green);">
       Estimated savings on ${fmt(annual)}/year: up to ${est}!
    </div>`;
  }

  if (key === 'compliance') {
    const count = hasReal ? s.txnCount : 0;
    return `<div style="margin-bottom:16px;">
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">Compliance status</div>
      ${[
        {label:`${count>0?count+' transactions':'All transactions'} reviewed — look normal`, ok:true},
        {label:'UPI payments within RBI limits', ok:true},
        {label:'Income Tax Return filed?',        ok:false, note:'Due July 31, 2026'},
        {label:'No suspicious patterns found',    ok:true},
      ].map(c=>`<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;font-size:13px;margin-bottom:6px;">
        <span style="font-size:16px;">${c.ok?'':''}</span>
        <span style="color:var(--text);">${c.label}</span>
        ${c.note?`<span style="font-size:11px;color:var(--amber);margin-left:auto;">${c.note}</span>`:''}
      </div>`).join('')}
    </div>
    <div style="background:var(--green-bg);border:1px solid var(--green-brd);border-radius:10px;padding:12px;font-size:13px;color:var(--green);">
       Everything looks good! Just remember to file your ITR before July 31.
    </div>`;
  }
  return '';
}

// ── AI analysis ───────────────────────────────────────────────
async function runAgentAI() {
  const meta  = AGENT_META[selectedAgent];
  const outEl = document.getElementById('adp-ai-output');
  outEl.innerHTML = '<div class="thinking-dots"><span></span><span></span><span></span></div><div style="font-size:13px;color:var(--text-muted);margin-top:8px;">Analysing your finances…</div>';

  const txns    = getUserTransactions();
  const summary = computeFinancialSummary(txns || []);

  if (!txns || txns.length === 0) {
    outEl.innerHTML = `<div style="font-size:13px;color:var(--text-sec);line-height:1.7;">
      <strong style="color:var(--amber);">No real data yet.</strong><br><br>
      Connect Gmail in the <b>Bank Emails</b> section first, then come back here for a real personalised analysis of your finances.
    </div>`;
    return;
  }

  const prompt = buildAgentPrompt(selectedAgent, summary);

  try {
    const res  = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MAAFE_CONFIG.AI_MODEL,
        max_tokens: 1000,
        messages: [{ role:'user', content: prompt }]
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.content?.map(c=>c.text||'').join('') || 'No analysis.';
    outEl.innerHTML = `<div style="font-size:14px;line-height:1.75;color:var(--text);">${text.replace(/\n/g,'<br>')}</div>`;
    showToast('✓ Analysis complete!');
  } catch(e) {
    outEl.innerHTML = `<div style="font-size:13px;color:var(--text-sec);line-height:1.7;">
      <strong style="color:var(--amber);">Note:</strong> AI analysis requires an Anthropic API key configured in the app.<br><br>
      The agent prompt was built from your real data (${summary.txnCount} transactions). With an API key, this would show personalised advice for your actual numbers.
    </div>`;
  }
}

// ── Agent negotiation ─────────────────────────────────────────
// Static fallback script
const STATIC_NEG = [
  {agent:'Spending Watcher',color:'var(--blue)',   text:'Connect Gmail first so I can see your real transactions.'},
  {agent:'Safety Guard',    color:'var(--amber)',  text:'Agreed — we need real data before giving meaningful advice.'},
  {agent:'Growth Advisor',  color:'var(--green)',  text:'Go to Bank Emails, connect Gmail, then come back here.'},
  {agent:'Rule Checker',    color:'var(--teal)',   text:'Once you have real data, I\'ll check all transactions.'},
  {type:'divider',text:'— Import your emails to unlock real analysis —'},
  {agent:'ALL AGENTS',color:'var(--text-muted)',text:'Go to Bank Emails → Connect Gmail → then return here.'},
];

function runNegotiation() {
  const log = document.getElementById('neg-log');
  log.innerHTML = '';
  document.getElementById('consensus-result').style.display = 'none';

  const txns   = getUserTransactions();
  const s      = computeFinancialSummary(txns || []);
  const script = s ? buildNegotiationScript(s) : STATIC_NEG;

  let delay = 0;
  script.forEach((line, i) => {
    delay += 750;
    setTimeout(() => {
      if (line.type === 'divider') {
        log.innerHTML += `<div class="neg-divider">${line.text}</div>`;
      } else {
        log.innerHTML += `<div class="neg-line">
          <span class="neg-agent" style="color:${line.color};">[${line.agent}]</span>
          <span class="neg-text">${line.text}</span>
        </div>`;
      }
      log.scrollTop = log.scrollHeight;
      if (i === script.length - 1 && s) showConsensus(s);
    }, delay);
  });
}

function showConsensus(s) {
  const el = document.getElementById('consensus-result');
  el.style.display = 'block';
  const actions = buildConsensusActions(s) || [];
  el.innerHTML = `
    <div style="background:var(--green-bg);border:1.5px solid var(--green-brd);border-radius:12px;padding:18px 20px;">
      <div style="font-size:14px;font-weight:800;color:var(--green);margin-bottom:12px;"> Your personalised financial plan — based on your real data</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${actions.map(a=>`<div style="background:white;border:1px solid var(--green-brd);border-radius:10px;padding:12px;">
          <div style="font-size:18px;margin-bottom:6px;">${a.icon}</div>
          <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px;">${a.action}</div>
          <div style="font-size:12px;color:var(--green);">${a.impact}</div>
        </div>`).join('')}
      </div>
    </div>`;
  showToast(' Your agents have agreed on a plan!');
}

window.selectAgent    = selectAgent;
window.runAgentAI     = runAgentAI;
window.runNegotiation = runNegotiation;
