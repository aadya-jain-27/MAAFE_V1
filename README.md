# MAAFE — Multi-Agent Autonomous Financial Ecosystem

## Project Structure

```
maafe/
├── index.html          ← Login / Sign Up page
├── onboarding.html     ← First-time setup wizard  
├── dashboard.html      ← Main app (all features)
│
├── css/
│   ├── style.css       ← Global shared styles
│   ├── auth.css        ← Login/signup page styles
│   ├── onboarding.css  ← Onboarding wizard styles
│   └── dashboard.css   ← Dashboard & all sections
│
└── js/
    ├── auth.js         ← Login/signup logic + localStorage users
    ├── onboarding.js   ← 5-step onboarding wizard
    ├── dashboard.js    ← Core dashboard, navigation, transactions
    ├── emailparser.js  ← Bank-specific NLP email parser (HDFC/SBI/ICICI/Axis/Kotak)
    ├── agents.js       ← 5 AI agents + negotiation engine
    ├── advisor.js      ← AI financial advisor chat
    └── charts.js       ← All charts (Chart.js) + goals + simulator
```

## Demo Flow 

### Step 1 — Show Sign Up
- Click "Sign Up" → fill in name, email, password → Create Account
- You'll be taken to the **onboarding wizard**

### Step 2 — Onboarding Wizard
- Select income range (e.g., ₹50,000 – ₹1 Lakh)
- Choose bank (e.g., HDFC Bank)
- Select your goals (Emergency fund + Home + Retire)
- Click "Take me to my dashboard!"

### Step 3 — Dashboard Home
- Show the **4 summary cards** (income, expenses, savings, safety net)
- Point out the **AI insight banner**
- Show the **spending pie chart** and **savings trend**
- Show the **plain-English suggestions** at the bottom

### Step 4 — Email Parser (Bank Emails tab)
- Note the bank is already selected based on onboarding
- Click a sample: "Debit card purchase at Amazon"
- Click **"Read this email"**
- Show the extracted details: amount, merchant, category, confidence scores

### Step 5 — AI Agents tab
- Show all 5 agents with friendly names
- Click **"Spending Watcher"** → show its analysis
- Click **"Watch them debate →"** → show the animated negotiation
- Show the **consensus plan** that the agents agree on

### Step 6 — Goals tab
- Show the **3 goal progress bars** based on their onboarding selections
- Play with the **"What if" simulator** — change the SIP amount
- Watch the wealth projection chart update live

### Step 7 — Ask Advisor tab
- Type: "Am I spending too much on food?"
- Click the quick question: "Give me a simple budget"
- Show how it responds in plain, personalised English

---


---

## Key Technical Points 

### 1. Multi-Agent Architecture
- 5 specialised agents (Spending, Risk, Investment, Tax, Compliance)
- Each analyses a different aspect of financial health
- Negotiation engine resolves conflicts between agents
- Consensus decision combines all inputs

### 2. NLP Email Parsing
- Bank-specific regex patterns for each bank's email format
- Extracts: amount, merchant, category, date, transaction type
- Confidence scoring for each extracted field
- Automatic category detection from merchant name

### 3. Explainable AI (XAI)
- Every recommendation shown to user is explained in plain English
- "Why this agent said this" is always clear
- Negotiation log shows how the decision was reached

### 4. User-Friendly Design
- No financial jargon — everything in plain English
- Onboarding customises the experience per user
- Bank-specific email parsing
- Goal-based framing (not just numbers)

### 5. Data Flow
```
Email Input
    ↓
NLP Parser (bank-specific)
    ↓  
Structured Transaction Record
    ↓
5 AI Agents analyse in parallel
    ↓
Negotiation Engine resolves conflicts
    ↓
Unified Recommendations → Dashboard
    ↓
User asks advisor → Plain English answers
```

---

## Technologies Used
- **HTML5/CSS3/JavaScript** — Frontend (no framework needed)
- **Chart.js** — Visualisations
- **localStorage** — User data persistence (demo)
- **Anthropic API** — AI agent analysis & advisor chat
- **NLP** — Regex-based entity extraction for email parsing


