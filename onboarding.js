// ══════════════════════════════════════
// Onboarding Logic
// ══════════════════════════════════════

let currentStep = 1;
let selections = {
  income: null,
  bank: null,
  goals: []
};

// Load user name on step 1
window.addEventListener('load', () => {
  const user = JSON.parse(localStorage.getItem('maafe_current_user') || '{}');
  const nameEl = document.getElementById('welcome-name');
  if (nameEl && user.name) nameEl.textContent = user.name.split(' ')[0] + '!';
  else if (nameEl) nameEl.textContent = 'there!';
});

function nextStep(n) {
  // Validate required steps
  if (n === 3 && !selections.income) return;
  if (n === 4 && !selections.bank) return;

  // Hide current
  document.getElementById('step-' + currentStep).classList.remove('active');
  document.getElementById('step-dot-' + currentStep).classList.add('done');
  document.getElementById('step-dot-' + currentStep).textContent = '✓';

  // Show next
  currentStep = n;
  document.getElementById('step-' + n).classList.add('active');
  document.getElementById('step-dot-' + n).classList.add('active');

  // Update progress bar
  const pct = (n / 5) * 100;
  document.getElementById('ob-progress').style.width = pct + '%';

  // Step 5 summary
  if (n === 5) {
    const bankNames = { HDFC:'HDFC Bank', SBI:'State Bank of India', ICICI:'ICICI Bank', AXIS:'Axis Bank', KOTAK:'Kotak Mahindra', OTHER:'Your bank' };
    const goalNames = { emergency:'Safety net', home:'Buy a home', car:'Buy a car', retire:'Retirement', travel:'Travel', invest:'Grow wealth' };
    document.getElementById('sum-bank').textContent = 'Configured for ' + (bankNames[selections.bank] || 'your bank');
    const goalText = selections.goals.map(g => goalNames[g] || g).join(', ') || 'No specific goals selected';
    document.getElementById('sum-goals').textContent = goalText;
  }
}

function selectOption(el, field, value, label) {
  // Deselect others in same group
  el.closest('.ob-options-grid').querySelectorAll('.ob-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selections[field] = value;

  // Enable next button
  const nextBtn = document.getElementById('next-2');
  if (nextBtn) nextBtn.disabled = false;
}

function selectBank(el, bank) {
  el.closest('.ob-banks-grid').querySelectorAll('.ob-bank').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  selections.bank = bank;

  const nextBtn = document.getElementById('next-3');
  if (nextBtn) nextBtn.disabled = false;
}

function toggleGoal(el, goal) {
  el.classList.toggle('selected');
  if (el.classList.contains('selected')) {
    if (!selections.goals.includes(goal)) selections.goals.push(goal);
  } else {
    selections.goals = selections.goals.filter(g => g !== goal);
  }
}

function finishOnboarding() {
  // Save updated user profile
  const user = JSON.parse(localStorage.getItem('maafe_current_user') || '{}');
  user.onboarded = true;
  user.bank = selections.bank;
  user.income = selections.income;
  user.goals = selections.goals;

  localStorage.setItem('maafe_current_user', JSON.stringify(user));

  // Update in users store too
  const users = JSON.parse(localStorage.getItem('maafe_users') || '{}');
  if (users[user.email]) {
    users[user.email] = user;
    localStorage.setItem('maafe_users', JSON.stringify(users));
  }

  window.location.href = 'dashboard.html';
}
