// ════════════════════════════════════════════════════════════════
// MAAFE — Email Parser
// Parses a raw bank email text → structured transaction object
// ════════════════════════════════════════════════════════════════

const BANKS = {
  HDFC: {
    name: 'HDFC Bank', color: '#004c8f',
    samples: [
      // ── Exact format from real HDFC InstaAlert (single-line body, 2-digit year, VPA) ──
      { label: '🍕 UPI debit — Zomato (real format)', icon: '🍕',
        text: `From: alerts@hdfcbank.bank.in\nSubject: HDFC Bank InstaAlert\n\nDear Customer, Rs.184.53 has been debited from account 1490 to VPA payzomato@hdfcbank ZOMATO on 08-04-26. Your UPI transaction reference number is 663123700578. If you did not authorize this transaction, please report it immediately by calling 18002586161 Or SMS BLOCK UPI to 7308080808. Warm Regards, HDFC Bank` },
      { label: '💸 UPI debit — Swiggy', icon: '🛵',
        text: `From: alerts@hdfcbank.bank.in\nSubject: HDFC Bank InstaAlert\n\nDear Customer, Rs.312.00 has been debited from account 1490 to VPA swiggyfood@hdfcbank SWIGGY on 07-04-26. Your UPI transaction reference number is 741852963014. If you did not authorize this transaction, please report it immediately by calling 18002586161 Or SMS BLOCK UPI to 7308080808. Warm Regards, HDFC Bank` },
      { label: '💰 Money received from Dad', icon: '💰',
        text: `From: alerts@hdfcbank.bank.in\nSubject: HDFC Bank InstaAlert\n\nDear Customer, Rs.20000.00 has been credited to account 1490 from VPA rahulgarg@okaxis RAHUL GARG on 05-04-26. Your UPI transaction reference number is 852963741025. If you did not initiate this transaction, please report it immediately by calling 18002586161. Warm Regards, HDFC Bank` },
      { label: '🏠 Rent paid via UPI', icon: '🏠',
        text: `From: alerts@hdfcbank.bank.in\nSubject: HDFC Bank InstaAlert\n\nDear Customer, Rs.15000.00 has been debited from account 1490 to VPA landlord@upi PROPERTY OWNER on 01-04-26. Your UPI transaction reference number is 963741852036. If you did not authorize this transaction, please report it immediately by calling 18002586161. Warm Regards, HDFC Bank` },
      { label: '💼 Salary credited (NEFT)', icon: '💼',
        text: `From: alerts@hdfcbank.bank.in\nSubject: HDFC Bank InstaAlert\n\nDear Customer, Rs.85000.00 has been credited to account 1490 from NEFT TECHCORP SOLUTIONS PVT LTD SALARY APR2026 on 01-04-26. Your NEFT reference number is HDFC0000123456. Warm Regards, HDFC Bank` },
    ]
  },
  SBI: {
    name: 'State Bank of India', color: '#2e5fa3',
    samples: [
      { label: 'ATM cash withdrawal', icon: '🏧',
        text: `From: sbialerts@sbi.co.in\nSubject: SBI ATM Transaction Alert\n\nDear SBI Customer,\n\nRs.5,000/- has been withdrawn from your SBI account XX7234 at SBI ATM CHENNAI ANNA NAGAR on 26/03/2026 at 10:15 AM.\n\nAvailable Balance: Rs.14,235.00\n\nFor any dispute, call SBI helpline 1800-425-3800.\n\nSBI` },
      { label: 'UPI payment made', icon: '📱',
        text: `From: sbialerts@sbi.co.in\nSubject: SBI YONO UPI Transaction Alert\n\nDear Customer,\n\nUPI transaction of Rs.1,200 has been debited from your SBI account XX7234 to FLIPKART SELLER (flipkart@ybl) on 25/03/2026.\n\nReference No: SBI20260325871234\nTime: 3:42 PM IST\nBalance after txn: Rs.19,435.00` },
      { label: 'Fixed deposit matured', icon: '🏦',
        text: `From: sbialerts@sbi.co.in\nSubject: Fixed Deposit Maturity Credit\n\nDear Customer,\n\nYour Fixed Deposit of Rs.50,000 (FD No: SBI87654321) has matured and interest of Rs.3,850 has been credited to account XX7234 on 25/03/2026.\n\nTotal credited: Rs.53,850\nAvailable Balance: Rs.73,285.00` },
    ]
  },
  ICICI: {
    name: 'ICICI Bank', color: '#f04e23',
    samples: [
      { label: 'Credit card purchase at Flipkart', icon: '🛍️',
        text: `From: credit_cards@icicibank.com\nSubject: ICICI Bank Credit Card Transaction Alert\n\nDear Cardholder,\n\nA purchase of INR 8,999 has been made on your ICICI Bank Credit Card ending 6789 at FLIPKART INTERNET PVT LTD on 22 Mar 2026.\n\nTotal Outstanding: INR 23,450\nAvailable Credit Limit: INR 76,550\nPayment Due Date: 15 Apr 2026\n\nICICI Bank` },
      { label: 'NEFT salary received', icon: '💼',
        text: `From: alerts@icicibank.com\nSubject: NEFT Credit Alert - ICICI Bank\n\nHello,\n\nINR 82,500.00 has been credited to your ICICI Bank account XX9012 on 25/03/2026 via NEFT.\n\nSender: TECHCORP SOLUTIONS PVT LTD\nRemarks: SALARY/MARCH2026\nBalance: INR 94,830.00` },
      { label: 'SIP investment debited', icon: '📈',
        text: `From: alerts@icicibank.com\nSubject: Auto Debit for Mutual Fund SIP\n\nDear Customer,\n\nINR 5,000.00 has been auto-debited from your account XX9012 on 25/03/2026 towards Mutual Fund SIP.\n\nScheme: ICICI Pru Bluechip Fund - Growth\nFolio No: 1234567\nBalance after debit: INR 89,830.00` },
    ]
  },
  AXIS: {
    name: 'Axis Bank', color: '#97144d',
    samples: [
      { label: 'Online shopping transaction', icon: '🛒',
        text: `From: alerts@axisbank.com\nSubject: Axis Bank - Debit Alert\n\nDear Axis Bank Customer,\n\nYour account XX5678 has been debited with INR 2,199.00 on 26-MAR-2026 at 11:20:45 AM.\n\nMerchant: MYNTRA DESIGNS PVT LTD\nMode: Online (Debit Card)\nBalance: INR 31,450.50\n\nAxis Bank` },
      { label: 'EMI deducted', icon: '🏠',
        text: `From: alerts@axisbank.com\nSubject: EMI Deduction Alert - Axis Bank\n\nHi,\n\nYour EMI of INR 15,247.00 for Home Loan (Loan A/C: XXXXX1234) has been deducted from account XX5678 on 05-MAR-2026.\n\nOutstanding Loan Balance: INR 18,43,200.00\nNext EMI Date: 05-APR-2026` },
    ]
  },
  KOTAK: {
    name: 'Kotak Mahindra Bank', color: '#e31837',
    samples: [
      { label: 'Debit card purchase', icon: '💳',
        text: `From: alerts@kotak.com\nSubject: Kotak Bank - Debit Card Transaction\n\nDear Customer,\n\nRs.1,550 has been debited from your Kotak 811 account XX3456 for a purchase at BIG BAZAAR CHENNAI on 26/03/2026.\n\nMode: Debit Card (POS)\nAuth Code: 782341\nAvailable Balance: Rs.22,890.00\n\nKotak Mahindra Bank` },
    ]
  },
  OTHER: {
    name: 'Other Bank', color: '#6b7280',
    samples: [
      { label: 'Generic debit transaction', icon: '💳',
        text: `From: alerts@yourbank.com\nSubject: Transaction Alert\n\nDear Customer,\n\nRs.2,500.00 has been debited from your account XX1234 on 26/03/2026.\n\nMerchant: LOCAL SUPERMARKET\nMode: UPI\nAvailable Balance: Rs.18,750.00` },
    ]
  },
};

// ── Parser patterns ───────────────────────────────────────────
// Tuned against real HDFC InstaAlert format (from screenshot):
//   "Rs.184.53 has been debited from account 1490 to VPA payzomato@hdfcbank ZOMATO on 08-04-26"
// Key: date uses 2-digit year (DD-MM-YY), merchant is AFTER the VPA handle
const PARSE_PATTERNS = {
  HDFC: {
    amount:   /(?:₹|inr|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
    // VPA pattern: "to VPA handle@bank MERCHANTNAME on" → capture MERCHANTNAME
    // Fallback:    "at AMAZON" / "to RAHUL" / "merchant: XYZ"
    merchant: /(?:to\s+vpa\s+\S+\s+([A-Z][A-Z0-9\s&\-\.]{1,30}?)(?:\s+on\b|\s+your\b|\s*\.))|(?:(?:at|to|merchant[:\s]+|paid\s+to[:\s]+)\s*([A-Za-z][A-Za-z0-9\s&\-\.\/]{1,40}?)(?:\s+on\b|\s+via\b|\s+has\b|\s+\(|\n|$))/im,
    // DD-MM-YY or DD-MM-YYYY or DD Mon YYYY
    date:     /(\d{2}[-\/]\d{2}[-\/]\d{2,4}|\d{2}\s+\w+\s+\d{4})/i,
    type:     /(credited|debited|credit|debit|withdrawn|received|sent|paid|purchase|payment)/i,
  },
  SBI: {
    amount:   /(?:₹|rs\.?|inr)\s*([\d,]+(?:[\/\-]|\.\d{1,2})?)/i,
    merchant: /(?:to|at|from|merchant[:\s]+|paid\s+to[:\s]+)\s*([A-Za-z][A-Za-z0-9\s&\-\.\/]{1,40}?)(?:\s+on\b|\s+\(|\n|$)/im,
    date:     /(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/i,
    type:     /(credited|debited|withdrawn|received|debit|credit|paid|payment)/i,
  },
  ICICI: {
    amount:   /(?:₹|inr|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
    merchant: /(?:at|to|merchant[:\s]+|paid\s+to[:\s]+)\s*([A-Za-z][A-Za-z0-9\s&\-\.\/]{1,40}?)(?:\s+on\b|\s+has\b|\s+via\b|\n|$)/im,
    date:     /(\d{2}[\s\/\-]\w+[\s\/\-]\d{2,4}|\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/i,
    type:     /(credited|debited|credit|debit|purchase|payment|paid)/i,
  },
  AXIS: {
    amount:   /(?:₹|inr|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
    merchant: /(?:merchant[:\s]+|at\s+|paid\s+to[:\s]+|payment\s+to[:\s]+)([A-Za-z][A-Za-z0-9\s&\-\.\/]{1,40}?)(?:\n|$)/im,
    date:     /(\d{2}[-\/][A-Za-z]{3}[-\/]\d{2,4}|\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
    type:     /(debited|credited|debit|credit|purchase|payment)/i,
  },
  KOTAK: {
    amount:   /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i,
    merchant: /(?:at|for\s+a\s+purchase\s+at|merchant[:\s]+|paid\s+to[:\s]+)\s*([A-Za-z][A-Za-z0-9\s&\-\.\/]{1,40}?)(?:\s+on\b|\n|$)/im,
    date:     /(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/i,
    type:     /(debited|credited|debit|credit|purchase|payment)/i,
  },
  OTHER: {
    amount:   /(?:₹|rs\.?|inr|amount[:\s]+|amt[:\s]+|debited\s+(?:with\s+)?(?:₹|rs\.?|inr)|credited[:\s]+(?:₹|rs\.?|inr)?)\s*([\d,]+(?:\.\d{1,2})?)/i,
    merchant: /(?:merchant[:\s]+|at\s+|to\s+|paid\s+to[:\s]+|payment\s+to[:\s]+|towards\s+|for\s+purchase\s+at\s+)([A-Za-z][A-Za-z0-9\s&\-\.\/]{1,40}?)(?:\n|$)/im,
    date:     /(\d{2}[\/\-]\d{2}[\/\-]\d{2,4}|\d{1,2}\s+\w+\s+\d{4})/i,
    type:     /(debited|credited|debit|credit|withdrawn|received|sent|paid|purchase|payment|refund)/i,
  },
};


function detectCategory(merchant) {
  // Always lowercase — fully case-insensitive matching
  const m = (merchant || '').toLowerCase();

  // Salary / Income — check first (high priority)
  if (/salary|sal credit|payroll|wages|stipend|neft cr|rtgs cr|imps cr|income credit/.test(m))
    return { cat:'Salary / Income', icon:'💼' };

  // Food & Dining
  if (/zomato|swiggy|dunzo|blinkit|zepto|bigbasket|grofer|fresh|food|restaurant|cafe|dhaba|biryani|pizza|burger|kfc|mcdonald|domino|subway|sweets|bakery|hotel|eat|dining|canteen|mess|tiffin|dabba/.test(m))
    return { cat:'Food & Dining', icon:'🍕' };

  // Shopping & E-commerce
  if (/amazon|flipkart|myntra|ajio|nykaa|meesho|snapdeal|shopsy|tata cliq|reliance|jiomart|d-mart|dmart|big bazaar|bigbazaar|more supermarket|spencer|lulu|lifestyle|shoppers stop|pantaloon|westside|h&m|zara|uniqlo|decathlon|croma|vijay sales|reliance digital|apple store|samsung|shopping|retail|store|mart|bazaar|market|hypermarket/.test(m))
    return { cat:'Shopping', icon:'🛒' };

  // Transport & Travel
  if (/uber|ola|rapido|meru|namma yatri|auto|cab|taxi|petrol|diesel|fuel|bpcl|hpcl|iocl|indian oil|hp gas|bharat gas|metro|dmrc|bmtc|best bus|ksrtc|tsrtc|railway|irctc|bus|flight|indigo|air india|spicejet|makemytrip|goibibo|yatra|redbus|parking|toll|fastag/.test(m))
    return { cat:'Transport', icon:'🚗' };

  // Housing & Rent
  if (/rent|house rent|flat rent|pg rent|hostel|maintenance|society|apartment|housing|nobroker|nestaway|commonfloor|magicbricks|99acres/.test(m))
    return { cat:'Housing', icon:'🏠' };

  // Utilities & Bills
  if (/airtel|jio|vodafone|vi |bsnl|mtnl|tata sky|dish tv|sun direct|d2h|broadband|wifi|internet|electricity|bescom|tneb|mseb|discom|water bill|gas bill|piped gas|lpg|cylinder|recharge|mobile bill|postpaid|prepaid|utility|bill payment|bbps/.test(m))
    return { cat:'Utilities & Bills', icon:'📱' };

  // Health & Medical
  if (/hospital|apollo|fortis|manipal|max healthcare|narayana|medanta|clinic|doctor|physician|dentist|pharmacy|chemist|medical|medicine|health|wellness|diagnostic|lab test|pathology|1mg|pharmeasy|netmeds|practo|healthkart|fitness|gym/.test(m))
    return { cat:'Health', icon:'🏥' };

  // Entertainment & Subscriptions
  if (/netflix|amazon prime|hotstar|disney|zee5|sony liv|voot|mxplayer|spotify|gaana|jiosaavn|wynk|youtube|gaming|steam|playstation|xbox|bookmyshow|paytm movies|inox|pvr|cinepolis|concert|event|entertainment|subscription/.test(m))
    return { cat:'Entertainment', icon:'🎬' };

  // Investments & Mutual Funds
  if (/zerodha|groww|upstox|angel broking|hdfc securities|icici direct|kotak securities|motilal oswal|sharekhan|5paisa|mutual fund|mf|sip|nifty|sensex|stock|equity|demat|ipo|nps|ppf|elss|bluechip|index fund|smallcase|fisdom|kuvera|coin by zerodha/.test(m))
    return { cat:'Investments', icon:'📈' };

  // Savings & Returns
  if (/interest credit|fd interest|recurring deposit|rd interest|fixed deposit|maturity|savings interest|bank interest|sweep/.test(m))
    return { cat:'Savings / Returns', icon:'💰' };

  // Loan & EMI
  if (/emi|loan emi|home loan|car loan|personal loan|credit card emi|bajaj finance|hdfc credila|lic housing|pnb housing|repayment|ecs debit|nach debit|standing instruction|auto debit emi/.test(m))
    return { cat:'Loan / EMI', icon:'🏦' };

  // Insurance
  if (/insurance|lic|life insurance|health insurance|car insurance|bike insurance|term plan|premium|policy|lici|star health|niva bupa|hdfc ergo|icici lombard|bajaj allianz|sbi general/.test(m))
    return { cat:'Insurance', icon:'🛡️' };

  // Education
  if (/school|college|university|tuition|coaching|byju|unacademy|vedantu|coursera|udemy|skill|course|exam fee|education|fees/.test(m))
    return { cat:'Education', icon:'📚' };

  // ATM / Cash
  if (/atm|cash withdrawal|atm withdrawal|cash deposit/.test(m))
    return { cat:'ATM / Cash', icon:'🏧' };

  // Card payments — credit card bill payments
  if (/credit card|card payment|card bill|card outstanding|minimum due/.test(m))
    return { cat:'Credit Card Payment', icon:'💳' };

  return { cat:'Other', icon:'💳' };
}

// ── Transaction email validator ───────────────────────────────
// Returns true only if the text looks like a real bank transaction alert.
// This gates out promotional emails, newsletters, etc. that happen to
// contain numbers or the word "credited".
function isTransactionEmail(subject, body) {
  const s = (subject || '').toLowerCase();
  const b = (body    || '').toLowerCase().slice(0, 800);

  // ── Subject-line signals ─────────────────────────────────────
  const subjectHits = [
    /\b(debited|credited|debit|credit)\b/,
    /\b(transaction|txn)\b.*\b(alert|notification|successful)\b/,
    /\b(upi|neft|rtgs|imps)\b/,
    /\b(payment|paid)\b.*\b(alert|successful|received|done)\b/,
    /\batm\b.*\b(withdrawal|transaction)\b/,
    /\b(salary|payroll)\b.*\bcredit/,
    /\brefund\b.*\b(processed|credited)\b/,
    /\bauto.?debit\b|\bemi\b.*\b(deducted|due)\b/,
    /\bbalance[:\s]/,
    /\baccount\b.*\b(debited|credited)\b/,
    // HDFC InstaAlert subject: "HDFC Bank Debit" or just "Alert"
    /hdfc\s+bank\s+(debit|credit|alert|instaAlert)/i,
  ];
  if (subjectHits.some(r => r.test(s))) return true;

  // ── Body signals (first 800 chars) ───────────────────────────
  const bodyHits = [
    // HDFC InstaAlert exact pattern: "Rs.184.53 has been debited from account"
    /rs\.?\s*[\d,]+(?:\.\d{1,2})?\s+has\s+been\s+(debited|credited)/i,
    /(?:has been|has been successfully)\s+(debited|credited)/i,
    /(?:inr|rs\.?|₹)\s*[\d,]+\s+(?:has been|was)\s+(debited|credited)/i,
    // "debited from account XXXX to VPA"
    /debited\s+from\s+(?:account|a\/c|ac)\s+\d+/i,
    /credited\s+(?:to|in)\s+(?:account|a\/c|ac)\s+\d+/i,
    // UPI reference number
    /upi\s+(?:ref|transaction|txn|reference)\s+(?:number|no\.?|id)?\s*(?:is\s+)?[\d]+/i,
    /(?:available|avl\.?)\s+(?:balance|bal)/i,
    /(?:a\/c|account|acct)[\s\w]*(?:debited|credited)/i,
    /(?:neft|rtgs|imps)\s+(?:ref|transaction|txn)/i,
    /(?:transaction\s+(?:id|ref|no|number)|txn\s+(?:id|ref|no))/i,
    // "to VPA payzomato@hdfcbank" pattern
    /to\s+vpa\s+\S+@\S+/i,
  ];
  if (bodyHits.some(r => r.test(b))) return true;

  return false;
}

// ── Extract only the first meaningful chunk of body text ──────
// Bank alert emails put all the important info in the first ~20 lines.
// Cutting the body prevents marketing footers from polluting merchant
// extraction and amount matching.
function _truncateBody(body) {
  if (!body) return '';
  // Take up to first 80 lines or 3000 chars, whichever is shorter
  const lines = body.split('\n').slice(0, 80).join('\n');
  return lines.slice(0, 3000);
}

function parseEmailText(text, bank, subjectHint) {
  const subjectMatch = text.match(/^Subject:\s*(.+)/im);
  const subject = subjectHint || (subjectMatch ? subjectMatch[1].trim() : '');

  // Body: take first 2000 chars only — bank alerts are short
  const bodyStart = text.indexOf('\n\n');
  const rawBody   = bodyStart >= 0 ? text.slice(bodyStart + 2) : text;
  // HDFC InstaAlerts arrive as one long single line — normalise by splitting on ". "
  const body = rawBody.slice(0, 2000).replace(/\.\s+/g, '.\n');

  const parseTarget = `Subject: ${subject}\n\n${body}`;
  const p = PARSE_PATTERNS[bank] || PARSE_PATTERNS.OTHER;

  const amtM  = parseTarget.match(p.amount);
  const merM  = parseTarget.match(p.merchant);
  const dateM = parseTarget.match(p.date);

  // ── Amount ───────────────────────────────────────────────────
  const universalAmt = amtM || parseTarget.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i);
  const rawAmt = (amtM || universalAmt) ? (amtM || universalAmt)[1].replace(/[,]/g, '') : null;
  const amount = rawAmt ? parseFloat(rawAmt) : null;

  // ── Merchant ─────────────────────────────────────────────────
  // HDFC VPA regex has two capture groups — pick whichever matched
  const merchantRaw = merM ? (merM[1] || merM[2] || '').trim() : null;
  const merchant    = merchantRaw || (subject || _guessSubject(text));

  // ── Date ─────────────────────────────────────────────────────
  const date = dateM ? dateM[1] : new Date().toLocaleDateString('en-IN');

  // ── Type: credit vs debit ────────────────────────────────────
  // Strategy: find the sentence that contains the amount — that sentence's
  // verb is authoritative. "debited" appearing later in fraud warnings should
  // NOT override the primary transaction verb.
  const type = _detectTransactionType(body, subject, amount);

  const { cat, icon } = detectCategory(merchant);
  return {
    amount: amount || 0,
    amountFormatted: amount ? '₹' + amount.toLocaleString('en-IN') : '?',
    merchant, cat, icon, type,
    typeLabel: type === 'credit' ? 'Money received (Credit)' : 'Money spent (Debit)',
    date, bank,
    confidence: {
      amount:   amtM ? 97 : universalAmt ? 70 : 30,
      merchant: merM ? 89 : subject ? 60 : 30,
      category: 85,
      type:     95,
    }
  };
}

// ── Determine credit vs debit from the sentence containing the amount ──
// This is much more reliable than a single regex on the whole body,
// because fraud-warning sentences like "...report this debit" can flip the type.
function _detectTransactionType(body, subject, amount) {
  const combined = (subject + '\n' + body).toLowerCase();

  // 1. Look for the sentence that mentions the amount and contains a direction word
  //    Split on sentence boundaries (period/newline)
  const amtStr  = amount ? String(Math.round(amount)) : null;
  const sentences = combined.split(/[.\n]/);

  for (const sent of sentences) {
    // Does this sentence mention the amount?
    if (amtStr && !sent.includes(amtStr) &&
        !sent.match(/(?:₹|rs\.?|inr)/)) continue;

    if (/\bcredited\b|\bcredit\b/.test(sent) && !/\bdebited\b/.test(sent)) return 'credit';
    if (/\bdebited\b|\bdebit\b/.test(sent)   && !/\bcredited\b/.test(sent)) return 'debit';
    if (/\breceived\b/.test(sent))  return 'credit';
    if (/\brefund\b/.test(sent))    return 'credit';
    if (/\bwithdrawn\b/.test(sent)) return 'debit';
  }

  // 2. Fallback: first occurrence of credited/debited anywhere in combined text
  const firstCredit = combined.search(/\bcredited\b/);
  const firstDebit  = combined.search(/\bdebited\b/);

  if (firstCredit !== -1 && (firstDebit === -1 || firstCredit < firstDebit)) return 'credit';
  if (firstDebit  !== -1 && (firstCredit === -1 || firstDebit < firstCredit)) return 'debit';

  // 3. Secondary keywords
  if (/\breceived\b|\bincoming\b|\bsalary\b/.test(combined))  return 'credit';
  if (/\bpaid\b|\bpurchase\b|\bwithdrawn\b/.test(combined))   return 'debit';

  return 'debit'; // safe default
}

function _guessSubject(text) {
  const subjectLine = text.match(/Subject:\s*(.+)/i);
  if (subjectLine) return subjectLine[1].slice(0, 40);
  return 'Unknown merchant';
}

// ── Email page UI ─────────────────────────────────────────────
function initEmailsPage() {
  const user = JSON.parse(localStorage.getItem('maafe_current_user') || '{}');
  const bank = user.bank || 'HDFC';
  renderBankSelector(bank);
  renderSampleEmails(bank);
  renderTxnList('email-txn-list', getUserTransactions() || []);  // never show demo data
  updateDataBar();
  updateGmailConnectStatus();
}

let selectedBank = 'HDFC';

function renderBankSelector(active) {
  selectedBank = active;
  const el = document.getElementById('bank-selector');
  if (!el) return;
  el.innerHTML = Object.entries(BANKS).map(([k, b]) =>
    `<div class="bank-chip ${k === active ? 'active' : ''}" onclick="switchBank('${k}')">${b.name}</div>`
  ).join('');
}

function renderSampleEmails(bank) {
  const el = document.getElementById('sample-emails-list');
  if (!el) return;
  const data = BANKS[bank] || BANKS.HDFC;
  el.innerHTML = data.samples.map((s, i) =>
    `<div class="email-sample-item" onclick="loadSample(${i})">
      <span class="email-sample-icon">${s.icon}</span>
      <span>${s.label}</span>
      <span style="margin-left:auto;font-size:12px;color:var(--text-muted);">Load →</span>
    </div>`
  ).join('');
}

function switchBank(bank) {
  selectedBank = bank;
  document.querySelectorAll('.bank-chip').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  renderSampleEmails(bank);
  document.getElementById('parse-output-empty').style.display = 'block';
  document.getElementById('parse-output').style.display = 'none';
  document.getElementById('email-paste').value = '';
}

function loadSample(i) {
  const s = BANKS[selectedBank]?.samples[i];
  if (s) document.getElementById('email-paste').value = s.text;
}

function parseEmail() {
  const text = document.getElementById('email-paste').value.trim();
  if (!text) { showToast('Please paste an email or load a sample first.'); return; }
  const result = parseEmailText(text, selectedBank);
  displayParseResult(result);
}

function displayParseResult(result) {
  document.getElementById('parse-output-empty').style.display = 'none';
  const out = document.getElementById('parse-output');
  out.style.display = 'block';
  const col = result.type === 'credit' ? 'var(--green)' : 'var(--red)';
  const resultJson = JSON.stringify(result);
  out.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;margin-bottom:16px;">
      <span style="font-size:32px;">${result.icon}</span>
      <div>
        <div style="font-size:18px;font-weight:800;color:${col};">${result.type==='credit'?'+':'-'}${result.amountFormatted}</div>
        <div style="font-size:13px;color:var(--text-sec);">${result.merchant}</div>
      </div>
      <span class="tag ${result.type==='credit'?'tag-green':'tag-red'}" style="margin-left:auto;">${result.typeLabel}</span>
    </div>
    <div style="margin-bottom:16px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px;">Extracted from email</div>
      <div class="parse-result-item"><span class="parse-result-label">💰 Amount</span><span class="parse-result-val" style="color:${col};">${result.amountFormatted}</span></div>
      <div class="parse-result-item"><span class="parse-result-label">🏪 Merchant</span><span class="parse-result-val">${result.merchant}</span></div>
      <div class="parse-result-item"><span class="parse-result-label">📂 Category</span><span class="parse-result-val">${result.cat}</span></div>
      <div class="parse-result-item"><span class="parse-result-label">📅 Date</span><span class="parse-result-val">${result.date}</span></div>
      <div class="parse-result-item"><span class="parse-result-label">🏦 Bank</span><span class="parse-result-val">${result.bank}</span></div>
    </div>
    <div style="margin-bottom:16px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px;">Parser confidence</div>
      ${['Amount','Merchant','Category','Type'].map((f, i) => {
        const pct = [result.confidence.amount,result.confidence.merchant,result.confidence.category,result.confidence.type][i];
        const c = pct>85?'var(--green)':pct>60?'var(--amber)':'var(--red)';
        return `<div class="confidence-row"><div class="conf-label">${f}</div><div class="conf-bar"><div class="conf-fill" style="width:${pct}%;background:${c};"></div></div><div class="conf-pct">${pct}%</div></div>`;
      }).join('')}
    </div>
    <button class="btn-primary" style="width:100%;" onclick='_saveManualTxn(${resultJson})'>✓ Add this transaction to my history</button>`;
  showToast('✓ Email parsed successfully!');
}

window._saveManualTxn = function(result) {
  const txn = { date:result.date, merchant:result.merchant, cat:result.cat, type:result.type, amount:result.amount, icon:result.icon };
  const all = addUserTransaction(txn);
  renderTxnList('email-txn-list', all);
  renderTxnList('home-txn-list', all.slice(0,5));
  updateTxnCount(all.length);
  updateDataBar();
  if (typeof populateSuggestions === 'function') populateSuggestions();
  if (typeof refreshCharts === 'function') refreshCharts(all);
  showToast('✓ Transaction saved!');
};

function updateGmailConnectStatus() {
  const txns = getUserTransactions();
  const statusEl = document.getElementById('gmail-status-text');
  if (!statusEl) return;
  if (txns && txns.length > 0) {
    statusEl.textContent = `✓ ${txns.length} transactions loaded from Gmail`;
    statusEl.style.color = 'var(--green)';
  } else {
    statusEl.textContent = 'Connect Gmail to automatically import all your bank transaction emails.';
    statusEl.style.color = 'var(--text-muted)';
  }
}

window.initEmailsPage      = initEmailsPage;
window.switchBank          = switchBank;
window.loadSample          = loadSample;
window.parseEmail          = parseEmail;
window.parseEmailText      = parseEmailText;
window.detectCategory      = detectCategory;
window.isTransactionEmail  = isTransactionEmail;
window.DEMO_TRANSACTIONS   = window.DEMO_TRANSACTIONS || [];
