// ══════════════════════════════════════
// Auth Logic
// ══════════════════════════════════════

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  event.target.classList.add('active');
}

function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pwd   = document.getElementById('login-pwd').value.trim();

  if (!email || !pwd) {
    alert('Please fill in your email and password.');
    return;
  }

  const users = JSON.parse(localStorage.getItem('maafe_users') || '{}');
  if (!users[email]) {
    alert('No account found with that email. Please sign up first.');
    return;
  }
  if (users[email].password !== pwd) {
    alert('Incorrect password. Please try again.');
    return;
  }

  // Save session
  localStorage.setItem('maafe_current_user', JSON.stringify(users[email]));

  // Go to dashboard (skip onboarding since already set up)
  window.location.href = 'dashboard.html';
}

function doSignup() {
  const name  = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pwd   = document.getElementById('signup-pwd').value.trim();

  if (!name || !email || !pwd) {
    alert('Please fill in all fields.');
    return;
  }
  if (pwd.length < 8) {
    alert('Password must be at least 8 characters.');
    return;
  }

  const users = JSON.parse(localStorage.getItem('maafe_users') || '{}');
  if (users[email]) {
    alert('An account with this email already exists. Please log in.');
    return;
  }

  // Create user
  const newUser = {
    name,
    email,
    password: pwd,
    createdAt: new Date().toISOString(),
    onboarded: false,
    bank: null,
    income: null,
    goals: []
  };

  users[email] = newUser;
  localStorage.setItem('maafe_users', JSON.stringify(users));
  localStorage.setItem('maafe_current_user', JSON.stringify(newUser));

  // Go to onboarding
  window.location.href = 'onboarding.html';
}

function demoLogin() {
  // Create demo user if not exists
  const demoUser = {
    name: 'Priya',
    email: 'demo@maafe.ai',
    password: 'demo1234',
    onboarded: true,
    bank: 'HDFC',
    income: '50to1L',
    goals: ['emergency', 'home', 'retire'],
    isDemo: true
  };

  const users = JSON.parse(localStorage.getItem('maafe_users') || '{}');
  users['demo@maafe.ai'] = demoUser;
  localStorage.setItem('maafe_users', JSON.stringify(users));
  localStorage.setItem('maafe_current_user', JSON.stringify(demoUser));

  window.location.href = 'dashboard.html';
}
