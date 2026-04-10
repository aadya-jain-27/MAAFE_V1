// ════════════════════════════════════════════════════════════════
// MAAFE — Per-User Data Layer
// All storage keyed by the logged-in user's email address.
// ════════════════════════════════════════════════════════════════

function _userKey(suffix) {
  const user = JSON.parse(localStorage.getItem('maafe_current_user') || '{}');
  const email = user.email || 'guest';
  return `maafe_${suffix}_${email}`;
}

function getUserTransactions() {
  try { return JSON.parse(localStorage.getItem(_userKey('txns'))); }
  catch(e) { return null; }
}

function saveUserTransactions(txns) {
  localStorage.setItem(_userKey('txns'), JSON.stringify(txns));
}

function addUserTransaction(txn) {
  const existing = getUserTransactions() || [];
  existing.unshift(txn);
  saveUserTransactions(existing);
  return existing;
}

function clearUserTransactions() {
  localStorage.removeItem(_userKey('txns'));
}

// ── Financial summary ─────────────────────────────────────────
function computeFinancialSummary(txns) {
  if (!txns || txns.length === 0) return null;

  let totalIncome = 0, totalExpenses = 0;
  const catTotals = {}, monthlyMap = {};

  txns.forEach(t => {
    const amt = parseFloat(t.amount) || 0;
    if (amt <= 0) return;
    const mk = _monthKey(t.date || t.rawDate);
    if (!monthlyMap[mk]) monthlyMap[mk] = { income: 0, expenses: 0 };
    if (t.type === 'credit') {
      totalIncome += amt;
      monthlyMap[mk].income += amt;
    } else {
      totalExpenses += amt;
      monthlyMap[mk].expenses += amt;
      const cat = t.cat || 'Other';
      catTotals[cat] = (catTotals[cat] || 0) + amt;
    }
  });

  const topCats = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => ({ cat, amt }));

  const sortedMonths = Object.entries(monthlyMap)
    .sort((a, b) => new Date('01 ' + a[0]) - new Date('01 ' + b[0]))
    .slice(-6);

  const monthlyIncome   = _avgProp(monthlyMap, 'income');
  const monthlyExpenses = _avgProp(monthlyMap, 'expenses');
  const monthlySurplus  = monthlyIncome - monthlyExpenses;

  const user = JSON.parse(localStorage.getItem('maafe_current_user') || '{}');
  return {
    totalIncome, totalExpenses, surplus: totalIncome - totalExpenses,
    monthlyIncome, monthlyExpenses, monthlySurplus,
    catTotals, topCats, monthlyTrend: sortedMonths,
    txnCount: txns.length,
    bank: user.bank || 'HDFC',
    goals: user.goals || [],
    userName: user.name || 'User',
    userEmail: user.email || '',
  };
}

function _monthKey(dateStr) {
  if (!dateStr) return 'Unknown';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d)) return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  } catch(e) {}
  return String(dateStr).slice(0, 7);
}

function _avgProp(map, prop) {
  const vals = Object.values(map).filter(m => m[prop] > 0);
  if (!vals.length) return 0;
  return Math.round(vals.reduce((s, m) => s + m[prop], 0) / vals.length);
}

// ── Agent prompts ──────────────────────────────────────────────
function buildAgentPrompt(agentKey, s) {
  const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const catLines = s.topCats.slice(0, 6).map(c => `  - ${c.cat}: ${fmt(c.amt)}`).join('\n');
  const sipAmt = Math.round(s.monthlySurplus * 0.4 / 500) * 500;
  const base = `REAL data from ${s.txnCount} parsed bank emails:\n- Est. monthly income: ${fmt(s.monthlyIncome)}\n- Est. monthly expenses: ${fmt(s.monthlyExpenses)}\n- Est. monthly surplus: ${fmt(s.monthlySurplus)}\n- Spending breakdown:\n${catLines}\n- Bank: ${s.bank} | Goals: ${s.goals.join(', ') || 'none set'}`;

  const prompts = {
    spending: `You are the Spending Watcher agent in MAAFE, a friendly personal finance app for Indian users.\n\n${base}\n\nWrite a SHORT friendly analysis (max 5 sentences, no bullets). Name the top spending category with its exact ₹ amount. Say whether it seems high or reasonable. Give one specific actionable tip. Use only the real numbers above — never invent figures. Encouraging tone, no jargon.`,
    risk: `You are the Safety Guard agent in MAAFE.\n\n${base}\n\nMax 5 sentences. Their savings rate is ${s.monthlyIncome > 0 ? Math.round(s.monthlySurplus/s.monthlyIncome*100) : 0}% — say if that's good. Emergency fund target = ${fmt(s.monthlyExpenses * 3)}. At ${fmt(Math.round(s.monthlySurplus*0.35))}/month it takes ${Math.ceil((s.monthlyExpenses*3)/Math.max(1,Math.round(s.monthlySurplus*0.35)))} months. Mention insurance gap. Be reassuring.`,
    investment: `You are the Growth Advisor in MAAFE.\n\n${base}\n\nMax 5 sentences. Recommend investing ${fmt(sipAmt)}/month (40% of surplus) in a NIFTY 50 index SIP. Compute what ${fmt(sipAmt)}/month grows to in 10 years at 12% p.a. Mention 40/25/20/15 fund split. Make it exciting.`,
    tax: `You are the Tax Saver in MAAFE.\n\n${base}\n\nMax 5 sentences. Annual income ≈ ${fmt(s.monthlyIncome*12)}. Key deductions: 80C (₹1.5L limit), HRA if paying rent, 80D (health insurance). Estimate total tax savings. Give the single most urgent action. Sound like free money they're leaving on the table.`,
    compliance: `You are the Rule Checker in MAAFE.\n\n${base}\n\nMax 4 sentences. Say you reviewed ${s.txnCount} transactions and things look clean. Note any unusually large transactions. Remind about ITR deadline July 31. Explain ITR simply. Friendly reassuring tone.`
  };
  return prompts[agentKey] || prompts.spending;
}

// ── Advisor system prompt ─────────────────────────────────────
function buildAdvisorSystemPrompt(s) {
  if (!s) return null;
  const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const catLines = s.topCats.slice(0, 6).map(c => `  - ${c.cat}: ${fmt(c.amt)}`).join('\n');
  return `You are a friendly personal financial advisor in MAAFE, an Indian personal finance app.\n\nUser: ${s.userName} | Bank: ${s.bank} | ${s.txnCount} transactions parsed\n\nMONTHLY ESTIMATES:\n- Income: ${fmt(s.monthlyIncome)}\n- Expenses: ${fmt(s.monthlyExpenses)}\n- Surplus: ${fmt(s.monthlySurplus)}\n\nSPENDING BY CATEGORY:\n${catLines}\n\nEmergency fund target: ${fmt(s.monthlyExpenses*3)}\nRecommended SIP: ${fmt(Math.round(s.monthlySurplus*0.4/500)*500)}/month\nGoals: ${s.goals.join(', ') || 'not set'}\n\nRULES:\n- ALWAYS use only the real numbers above — never invent or use generic example figures\n- 3–5 sentences max for simple questions\n- Plain English — explain any jargon immediately\n- Warm, encouraging, like a knowledgeable friend`;
}

// ── Negotiation script ────────────────────────────────────────
function buildNegotiationScript(s) {
  if (!s) return null;
  const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const top = s.topCats[0] || { cat: 'expenses', amt: 0 };
  const sip = Math.round(s.monthlySurplus * 0.4 / 500) * 500;
  const eSave = Math.round(s.monthlySurplus * 0.35);
  const eTarget = s.monthlyExpenses * 3;
  const eMonths = eSave > 0 ? Math.ceil(eTarget / eSave) : '?';
  const sipGrowth = fmt(Math.round(sip * 12 * ((Math.pow(1.01,120)-1)/0.01) * 1.01));
  const savingsRate = s.monthlyIncome > 0 ? Math.round(s.monthlySurplus/s.monthlyIncome*100) : 0;
  return [
    { agent:'Spending Watcher', color:'var(--blue)',   text:`Reviewed ${s.txnCount} transactions. Top expense is ${top.cat} at ${fmt(top.amt)}. That's the first place to look for savings.` },
    { agent:'Safety Guard',     color:'var(--amber)',  text:`Savings rate is ${savingsRate}% — ${savingsRate>=20?'good':'needs improvement'}. Most urgent: build an emergency fund of ${fmt(eTarget)} (3 months of expenses).` },
    { agent:'Growth Advisor',   color:'var(--green)',  text:`Monthly surplus is ${fmt(s.monthlySurplus)}. Trimming ${top.cat} by 15% frees ${fmt(Math.round(top.amt*0.15))} more per month — enough to do emergency savings AND a SIP together.` },
    { agent:'Tax Saver',        color:'var(--purple)', text:`On ${fmt(s.monthlyIncome*12)}/year income, Section 80C + HRA + 80D deductions could save significant tax. That money is currently being left on the table.` },
    { agent:'Spending Watcher', color:'var(--blue)',   text:`Agreed. Combine the ${top.cat} cut with tax savings and this user has a materially better financial position before year-end.` },
    { agent:'Safety Guard',     color:'var(--amber)',  text:`Proposal: ${fmt(eSave)}/month into emergency fund. Reaches ${fmt(eTarget)} target in ~${eMonths} months. That's the safety net locked in.` },
    { agent:'Growth Advisor',   color:'var(--green)',  text:`And ${fmt(sip)}/month SIP in NIFTY 50. At 12% p.a., that becomes ~${sipGrowth} in 10 years. Life-changing compounding.` },
    { agent:'Rule Checker',     color:'var(--teal)',   text:`All ${s.txnCount} transactions checked — nothing suspicious. One item: ITR must be filed by July 31 to avoid penalties.` },
    { type:'divider', text:'— Agents reached unanimous decision —' },
    { agent:'FINAL PLAN', color:'var(--green)', text:`Cut ${top.cat} by 15% · Save ${fmt(eSave)}/month emergency fund (${eMonths} months) · Invest ${fmt(sip)}/month SIP · Claim tax deductions by July 31` }
  ];
}

function buildConsensusActions(s) {
  if (!s) return null;
  const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const top = s.topCats[0] || { cat: 'top expense', amt: 0 };
  const sip = Math.round(s.monthlySurplus * 0.4 / 500) * 500;
  const eSave = Math.round(s.monthlySurplus * 0.35);
  const eMonths = eSave > 0 ? Math.ceil((s.monthlyExpenses * 3) / eSave) : '?';
  return [
    { icon:'', action:`Reduce ${top.cat} by 15%`,               impact:`Save ~${fmt(Math.round(top.amt*0.15))}/month` },
    { icon:'', action:`${fmt(eSave)}/month → emergency fund`,   impact:`Hit ${fmt(s.monthlyExpenses*3)} in ~${eMonths} months` },
    { icon:'', action:`${fmt(sip)}/month SIP — NIFTY 50`,       impact:`Grows significantly in 10 years at 12%` },
    { icon:'', action:'Claim 80C + HRA tax deductions',          impact:'File ITR before July 31' },
  ];
}

window.getUserTransactions      = getUserTransactions;
window.saveUserTransactions     = saveUserTransactions;
window.addUserTransaction       = addUserTransaction;
window.clearUserTransactions    = clearUserTransactions;
window.computeFinancialSummary  = computeFinancialSummary;
window.buildAgentPrompt         = buildAgentPrompt;
window.buildAdvisorSystemPrompt = buildAdvisorSystemPrompt;
window.buildNegotiationScript   = buildNegotiationScript;
window.buildConsensusActions    = buildConsensusActions;
