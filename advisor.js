// ════════════════════════════════════════════════════════════════
// MAAFE — AI Financial Advisor Chat
// System prompt built fresh from real user transaction data
// ════════════════════════════════════════════════════════════════

const chatHistory = [];

async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg   = input.value.trim();
  if (!msg) return;
  input.value = '';

  appendMsg('user', msg);
  chatHistory.push({ role:'user', content:msg });

  const thinkingId = appendMsg('ai', '<div class="thinking-dots"><span></span><span></span><span></span></div>');

  // Build system prompt from real data
  const txns    = getUserTransactions();
  const summary = computeFinancialSummary(txns || []);
  const system  = buildAdvisorSystemPrompt(summary) || FALLBACK_SYSTEM;

  try {
    const res  = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      MAAFE_CONFIG.AI_MODEL,
        max_tokens: 700,
        system,
        messages:   chatHistory.slice(-12)
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const reply = data.content?.map(c=>c.text||'').join('') || "I couldn't process that.";
    updateMsg(thinkingId, reply.replace(/\n/g,'<br>'));
    chatHistory.push({ role:'assistant', content:reply });
  } catch(e) {
    const fallback = buildFallbackResponse(msg, summary);
    updateMsg(thinkingId, fallback);
    chatHistory.push({ role:'assistant', content:fallback });
  }
}

// ── Fallback system prompt (no transactions yet) ──────────────
const FALLBACK_SYSTEM = `You are a friendly personal financial advisor in MAAFE, an Indian personal finance app. 
The user hasn't imported any bank emails yet, so you don't have their real numbers.
Keep responses SHORT (3–5 sentences). Be warm and encouraging.
Politely remind them to connect Gmail in the Bank Emails section to get personalised advice based on their real data.`;

// ── Offline fallback responses using real data ────────────────
function buildFallbackResponse(msg, s) {
  const m = msg.toLowerCase();
  if (!s) return "I'd love to help with personalised advice! Head to the Bank Emails section and connect your Gmail first — once I have your real transaction data, my advice will actually be specific to your situation.";

  const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const top = s.topCats[0] || { cat:'expenses', amt:0 };
  const sip = Math.round(s.monthlySurplus * 0.4 / 500) * 500;

  if (/food|dining|eating|zomato|swiggy/.test(m)) {
    const foodAmt = s.catTotals['Food & Dining'] || top.amt;
    return `Your food spending is ${fmt(foodAmt)} — ${top.cat==='Food & Dining'?'your single biggest category!':'significant but not your top spend'}. Set a weekly food budget of ${fmt(Math.round(foodAmt/4.3/100)*100)} on your UPI app and cook at home 3–4 times a week. Even a 20% cut saves ${fmt(Math.round(foodAmt*0.2))} every month.`;
  }
  if (/saving|save|surplus/.test(m)) {
    const rate = s.monthlyIncome>0 ? Math.round(s.monthlySurplus/s.monthlyIncome*100) : 0;
    return `You're saving ${fmt(s.monthlySurplus)}/month — that's ${rate}% of your income, which is ${rate>=20?'genuinely good':'worth improving'}. The next step is to split this: ${fmt(Math.round(s.monthlySurplus*0.35))} into an emergency fund and ${fmt(sip)} into a SIP investment.`;
  }
  if (/tax|80c|deduction|hra/.test(m)) {
    return `On ${fmt(s.monthlyIncome*12)}/year, you can save tax via Section 80C (invest ₹1.5L in ELSS/PPF), HRA (if you pay rent), and 80D (health insurance). The most urgent thing: invest in an ELSS fund before July 31 to claim 80C deduction this year.`;
  }
  if (/invest|sip|mutual fund|nifty/.test(m)) {
    return `Based on your ${fmt(s.monthlySurplus)} monthly surplus, you can invest ${fmt(sip)}/month — that's 40% of your surplus. A NIFTY 50 index SIP is the simplest start: one fund, low cost, market-linked returns. At 12% p.a., ${fmt(sip)}/month becomes ${fmt(Math.round(sip*12*((Math.pow(1.01,120)-1)/0.01)*1.01))} in 10 years.`;
  }
  if (/emergency|safety net/.test(m)) {
    const target = s.monthlyExpenses*3;
    const monthly = Math.round(s.monthlySurplus*0.35);
    const months = monthly>0 ? Math.ceil(target/monthly) : '?';
    return `Your emergency fund target is ${fmt(target)} (3 months of your ${fmt(s.monthlyExpenses)}/month expenses). Put ${fmt(monthly)}/month aside in a separate high-interest account — you'd hit the target in ~${months} months. Try Kotak 811 or Fi for higher savings interest.`;
  }
  if (/budget/.test(m)) {
    return `Your income is ${fmt(s.monthlyIncome)}/month. A simple split: ${fmt(Math.round(s.monthlyIncome*0.5))} (50%) on needs, ${fmt(Math.round(s.monthlyIncome*0.2))} (20%) on savings/investments, ${fmt(Math.round(s.monthlyIncome*0.3))} (30%) on wants. Right now your top expense is ${top.cat} at ${fmt(top.amt)} — that's the main area to optimise.`;
  }
  return `Based on your finances — ${fmt(s.monthlyIncome)}/month income and ${fmt(s.monthlySurplus)} surplus — you're in a ${s.monthlySurplus>0?'solid':'challenging'} position. Your main focus areas: (1) cut ${top.cat} spending, (2) build emergency fund of ${fmt(s.monthlyExpenses*3)}, (3) start a ${fmt(sip)}/month SIP. What would you like to dig into?`;
}

function appendMsg(role, html) {
  const id  = 'msg-' + Date.now() + Math.random().toString(36).slice(2);
  const box = document.getElementById('chat-msgs');
  if (!box) return id;
  const div = document.createElement('div');
  div.className = 'chat-msg ' + role;
  div.id = id;
  div.innerHTML = `<div class="chat-avatar">${role==='ai'?'AI':'You'}</div><div class="chat-bubble">${html}</div>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return id;
}

function updateMsg(id, html) {
  const el = document.getElementById(id);
  if (el) {
    el.querySelector('.chat-bubble').innerHTML = html;
    document.getElementById('chat-msgs').scrollTop = 99999;
  }
}

function askQ(q) {
  document.getElementById('chat-input').value = q;
  sendChat();
}

window.sendChat = sendChat;
window.askQ     = askQ;
