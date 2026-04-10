// ════════════════════════════════════════════════════════════════
// MAAFE — Gmail Integration
// Fetches real bank transaction emails via Gmail API + OAuth2
// ════════════════════════════════════════════════════════════════

// ── Known bank & UPI sender addresses ────────────────────────
// These are the EXACT "From" addresses banks and UPI apps use.
const BANK_SENDERS = [
  // HDFC — two domains: .com for net-banking alerts, .bank.in for InstaAlerts (UPI/debit/credit)
  'alerts@hdfcbank.com',
  'alerts@hdfcbank.bank.in',       // HDFC InstaAlerts sender (UPI, debit, credit)
  'netbanking@hdfcbank.com',
  'noreply@hdfcbank.com',
  'noreply@hdfcbank.bank.in',
  'hdfc@hdfcbank.net',
  'rewards@hdfcbank.com',
  // SBI
  'sbialerts@sbi.co.in',
  'alerts@sbi.co.in',
  'mobilebanking@sbi.co.in',
  'noreply@sbi.co.in',
  // ICICI
  'alerts@icicibank.com',
  'credit_cards@icicibank.com',
  'alerts@icici.com',
  'noreply@icicibank.com',
  'rewards@icicibank.com',
  // Axis
  'alerts@axisbank.com',
  'noreply@axisbank.com',
  // Kotak
  'alerts@kotak.com',
  'noreply@kotak.com',
  // Yes, IndusInd, Federal, IDFC, RBL, AU
  'alerts@yesbank.in',
  'alerts@indusind.com',
  'alerts@federalbank.co.in',
  'alerts@idfcfirstbank.com',
  'alerts@rbl.co.in',
  'alerts@aubank.in',
  'alerts@kvb.co.in',
  'alerts@southindianbank.com',
  // International banks operating in India
  'alerts@sc.com',
  'alerts@hsbc.co.in',
  'alerts@citi.com',
  'alerts@dbs.com',
  // Paytm Bank
  'alerts@paytmbank.com',
  'notify@paytm.com',
  // Google Pay — real sender (NOT noreply@gpay.com which doesn't exist)
  'googlepay-noreply@google.com',
  // PhonePe — real senders
  'noreply@phonepe.com',
  'alerts@phonepe.com',
  // Amazon Pay
  'payments-messages@amazon.in',
  'amazonpay@amazon.in',
  // CRED
  'noreply@cred.club',
  // Mobikwik / Freecharge
  'support@mobikwik.com',
  'noreply@freecharge.in',
  // Cashback / reward mailers
  'cashback@paisabazaar.com',
  'noreply@fnp.com',
  'alerts@fnp.com',
];

// ── Build Gmail search queries ────────────────────────────────
// Split across 4 small queries — Gmail silently truncates queries > ~500 chars.
function buildGmailQueries() {
  const lookback = MAAFE_CONFIG.EMAIL_LOOKBACK || 'newer_than:12m';

  // Sender queries — split the list in half so each OR-chain is short
  const half  = Math.ceil(BANK_SENDERS.length / 2);
  const sndQ1 = BANK_SENDERS.slice(0, half).map(s => `from:${s}`).join(' OR ');
  const sndQ2 = BANK_SENDERS.slice(half).map(s  => `from:${s}`).join(' OR ');

  // Core transaction subject keywords
  const coreSubjects = [
    'debited', 'credited', 'transaction alert', 'debit alert', 'credit alert',
    'upi payment', 'upi transaction', 'payment successful', 'payment received',
    'neft', 'rtgs', 'imps', 'fund transfer', 'atm withdrawal', 'salary credit',
  ];
  const subQ1 = coreSubjects.map(k => `subject:"${k}"`).join(' OR ');

  // Broader financial subject keywords
  const broadSubjects = [
    'refund credited', 'refund processed', 'emi deducted', 'auto debit',
    'account debited', 'account credited', 'money received', 'nach debit',
    'ecs debit', 'card payment', 'upi credit', 'upi debit',
  ];
  const subQ2 = broadSubjects.map(k => `subject:"${k}"`).join(' OR ');

  return [
    `(${sndQ1}) ${lookback}`,
    `(${sndQ2}) ${lookback}`,
    `(${subQ1}) ${lookback}`,
    `(${subQ2}) ${lookback}`,
  ];
}

// ── OAuth state ───────────────────────────────────────────────
let _tokenClient    = null;
let _accessToken    = null;
let _gmailUserEmail = null;

// ── Init Google Identity Services ─────────────────────────────
function initGmailAuth() {
  const clientId = MAAFE_CONFIG.GOOGLE_CLIENT_ID;
  if (!clientId || clientId.includes('YOUR_CLIENT_ID')) return;
  if (!window.google?.accounts?.oauth2) {
    console.warn('Google Identity Services not loaded yet.');
    return;
  }
  _tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    callback: _onTokenResponse,
  });
}

async function _onTokenResponse(resp) {
  if (resp.error) {
    _setGmailUI('error', 'OAuth failed: ' + resp.error);
    showToast('Gmail connection failed. Please try again.');
    return;
  }
  _accessToken = resp.access_token;

  try {
    const profile = await _gmailFetch('https://gmail.googleapis.com/gmail/v1/users/me/profile');
    _gmailUserEmail = profile.emailAddress;
  } catch(e) { _gmailUserEmail = null; }

  _setGmailUI('syncing', 'Connected! Scanning your inbox for bank emails…');
  showToast('✓ Gmail connected! Scanning…');
  await syncGmailTransactions();
}

// ── Main sync pipeline ────────────────────────────────────────
async function syncGmailTransactions() {
  _setGmailUI('syncing', 'Searching for bank transaction emails…');

  try {
    const msgIds = await _listBankEmails();
    if (msgIds.length === 0) {
      _setGmailUI('no-emails',
        'No bank transaction emails found. Try expanding the lookback in config.js or paste an email manually below.');
      showToast('No bank emails found — try the manual paste option.');
      return;
    }

    _setGmailUI('syncing', `Found ${msgIds.length} emails — parsing transactions…`);

    const transactions = [];
    const dedupKeys    = new Set(); // "date|amount" — prevents duplicate entries

    for (let i = 0; i < msgIds.length; i++) {
      _setGmailProgress(i + 1, msgIds.length);
      try {
        const raw = await _fetchEmail(msgIds[i]);
        if (!raw) continue;

        // ── Gate: reject promotional / non-transaction emails ──
        if (!isTransactionEmail(raw.subject, raw.body)) continue;

        const bank = _detectBank(raw.from, raw.subject + ' ' + (raw.body || '').slice(0, 400));
        const txn  = parseEmailText(raw.fullText, bank, raw.subject);

        // If body parsing found no amount, fall back to subject-only parse
        if (!txn || !txn.amount || txn.amount <= 0) {
          const stxn = parseEmailText(
            `From: ${raw.from}\nSubject: ${raw.subject}\n\n${raw.subject}`,
            bank, raw.subject
          );
          if (stxn && stxn.amount > 0) {
            stxn.gmailMsgId = msgIds[i];
            stxn.rawDate    = raw.date;
            stxn.date       = _formatDate(raw.date) || stxn.date;
            const dk = `${stxn.date}|${Math.round(stxn.amount)}`;
            if (!dedupKeys.has(dk)) { dedupKeys.add(dk); transactions.push(stxn); }
          }
          continue;
        }

        txn.gmailMsgId = msgIds[i];
        txn.rawDate    = raw.date;
        txn.date       = _formatDate(raw.date) || txn.date;

        const dk = `${txn.date}|${Math.round(txn.amount)}`;
        if (dedupKeys.has(dk)) continue;
        dedupKeys.add(dk);
        transactions.push(txn);

      } catch(e) {
        console.warn('Failed to parse email:', msgIds[i], e);
      }
    }

    if (transactions.length === 0) {
      _setGmailUI('no-txn',
        `Found ${msgIds.length} emails but couldn't extract transactions. Try pasting one manually below.`);
      return;
    }

    transactions.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
    saveUserTransactions(transactions);
    _refreshAllUI(transactions);

    const label = _gmailUserEmail ? ` for ${_gmailUserEmail}` : '';
    _setGmailUI('done', `✓ ${transactions.length} real transactions loaded${label}`);
    showToast(`✓ ${transactions.length} real transactions loaded!`);

  } catch(err) {
    _setGmailUI('error', 'Error: ' + (err.message || 'Unknown error. Check console.'));
    showToast('Gmail sync failed — ' + err.message);
    console.error('Gmail sync error:', err);
  }
}

// ── List bank emails (multi-query, deduped) ───────────────────
async function _listBankEmails() {
  const limit   = MAAFE_CONFIG.EMAIL_FETCH_LIMIT || 300;
  const queries = buildGmailQueries();
  const seen    = new Set();
  const ids     = [];

  for (const query of queries) {
    let pageToken = null;
    const perQueryLimit = Math.ceil(limit / 2);

    do {
      const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
      url.searchParams.set('q', query);
      url.searchParams.set('maxResults', Math.min(perQueryLimit, 100));
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const data = await _gmailFetch(url.toString());
      if (data.messages) {
        for (const m of data.messages) {
          if (!seen.has(m.id)) { seen.add(m.id); ids.push(m.id); }
        }
      }
      pageToken = data.nextPageToken || null;
    } while (pageToken && ids.length < perQueryLimit);

    if (ids.length >= limit) break;
  }

  return ids.slice(0, limit);
}

// ── Fetch and decode a single email ──────────────────────────
async function _fetchEmail(msgId) {
  const data = await _gmailFetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`
  );

  const hdrs = {};
  (data.payload?.headers || []).forEach(h => { hdrs[h.name.toLowerCase()] = h.value; });

  const from    = hdrs['from']    || '';
  const subject = hdrs['subject'] || '';
  const date    = hdrs['date']    || '';
  const body    = _extractBody(data.payload);

  if (!body && !subject) return null;

  return {
    from, subject, date,
    body,     // raw body — used by isTransactionEmail() validator
    fullText: `From: ${from}\nSubject: ${subject}\n\n${body}`
  };
}

// ── Extract plaintext body from MIME payload ──────────────────
function _extractBody(payload) {
  if (!payload) return '';
  if (payload.body?.data) return _b64decode(payload.body.data);

  const allParts = _flattenParts(payload.parts || []);

  // Prefer plain text
  for (const p of allParts) {
    if (p.mimeType === 'text/plain' && p.body?.data) return _b64decode(p.body.data);
  }
  // Fallback: strip HTML
  for (const p of allParts) {
    if (p.mimeType === 'text/html' && p.body?.data) {
      return _b64decode(p.body.data)
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }
  return '';
}

function _flattenParts(parts) {
  if (!parts) return [];
  const out = [];
  for (const p of parts) { out.push(p); if (p.parts) out.push(..._flattenParts(p.parts)); }
  return out;
}

function _b64decode(str) {
  try {
    return decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/'))));
  } catch(e) {
    try { return atob(str.replace(/-/g, '+').replace(/_/g, '/')); }
    catch(e2) { return ''; }
  }
}

async function _gmailFetch(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${_accessToken}` } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Bank detection ────────────────────────────────────────────
function _detectBank(fromHeader, contextText) {
  const f = (fromHeader  || '').toLowerCase();
  const c = (contextText || '').toLowerCase().slice(0, 400);
  const x = f + ' ' + c;

  if (x.includes('hdfc'))                                   return 'HDFC';
  if (x.includes('state bank') || x.includes('@sbi.'))      return 'SBI';
  if (x.includes('icici'))                                  return 'ICICI';
  if (x.includes('axis'))                                   return 'AXIS';
  if (x.includes('kotak'))                                  return 'KOTAK';
  return 'OTHER';
}

function _formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d)) return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  } catch(e) {}
  return null;
}

// ── Connect / retry ───────────────────────────────────────────
function connectGmail() {
  const clientId = MAAFE_CONFIG.GOOGLE_CLIENT_ID;
  if (!clientId || clientId.includes('YOUR_CLIENT_ID')) {
    document.getElementById('gmail-setup-modal').style.display = 'flex';
    return;
  }
  if (!_tokenClient) initGmailAuth();
  if (!_tokenClient) {
    showToast('Google Identity Services not ready. Please refresh and try again.');
    return;
  }
  _tokenClient.requestAccessToken({ prompt: 'consent' });
}

function reSync() {
  if (!_accessToken) { connectGmail(); return; }
  syncGmailTransactions();
}

// ── UI helpers ────────────────────────────────────────────────
function _setGmailUI(state, message) {
  const btn    = document.getElementById('gmail-connect-btn');
  const status = document.getElementById('gmail-status-text');
  const dot    = document.getElementById('gmail-status-dot');
  if (!btn || !status) return;

  const cfg = {
    idle:        { btnText:'🔗 Connect Gmail', dotCls:'',          btnCls:'btn-primary'   },
    syncing:     { btnText:'⟳ Syncing…',       dotCls:'dot-blue',  btnCls:'btn-secondary' },
    done:        { btnText:'🔁 Re-sync',        dotCls:'dot-green', btnCls:'btn-secondary' },
    error:       { btnText:'🔁 Retry Gmail',    dotCls:'dot-red',   btnCls:'btn-primary'   },
    'no-emails': { btnText:'🔁 Retry',          dotCls:'dot-amber', btnCls:'btn-secondary' },
    'no-txn':    { btnText:'🔁 Retry',          dotCls:'dot-amber', btnCls:'btn-secondary' },
  };
  const c = cfg[state] || cfg.idle;
  btn.textContent = c.btnText;
  btn.className   = c.btnCls + ' gmail-btn';
  if (dot) dot.className = 'gmail-status-dot ' + c.dotCls;
  status.textContent = message || '';
}

function _setGmailProgress(done, total) {
  const bar  = document.getElementById('gmail-progress-bar');
  const text = document.getElementById('gmail-progress-text');
  if (!bar) return;
  bar.style.display = 'block';
  if (text) text.textContent = `Reading email ${done} of ${total}…`;
  const fill = bar.querySelector('.gmail-progress-fill');
  if (fill) fill.style.width = Math.round((done / total) * 100) + '%';
  if (done >= total) setTimeout(() => { bar.style.display = 'none'; }, 1000);
}

function _refreshAllUI(transactions) {
  if (typeof renderTxnList        === 'function') renderTxnList('email-txn-list', transactions);
  if (typeof renderTxnList        === 'function') renderTxnList('home-txn-list', transactions.slice(0, 5));
  if (typeof updateTxnCount       === 'function') updateTxnCount(transactions.length);
  if (typeof populateTransactions === 'function') populateTransactions();
  if (typeof populateSuggestions  === 'function') populateSuggestions();
  if (typeof refreshCharts        === 'function') refreshCharts(transactions);
  if (typeof updateDataBar        === 'function') updateDataBar();
}

function closeSetupModal() {
  const m = document.getElementById('gmail-setup-modal');
  if (m) m.style.display = 'none';
}

window.connectGmail    = connectGmail;
window.reSync          = reSync;
window.initGmailAuth   = initGmailAuth;
window.closeSetupModal = closeSetupModal;
