import { loadData, loadWorkspaces } from './storage.js';
import { supabase, signIn, signUp, signOut, getSession, getProfile, getInviteByToken, acceptInvite } from './supabase.js';
import { AppState } from './state.js';

/* ══════════════════════════════════════════════════
   AUTH — Login / signup screen and session management
   ══════════════════════════════════════════════════ */

export async function initAuth() {
  const session = await getSession();
  if (session) {
    const profile = await getProfile();
    AppState.currentUser = session.user;
    AppState.currentProfile = profile;
    return true;
  }
  return false;
}

export async function renderAuthScreen(mode = 'login') {
  // Check for invite token in URL
  const hashParts = window.location.hash.split('/');
  const inviteToken = hashParts[0] === '#invite' ? hashParts[1] : null;

  const screen = document.createElement('div');
  screen.className = 'auth-screen';
  screen.id = 'authScreen';

  screen.innerHTML = `
    <div class="auth-card">
      <div class="auth-logo">
        <div class="auth-logo-dot"></div>
        <div class="auth-logo-text">Project Dashboard</div>
      </div>

      <div id="authLogin" style="${mode === 'login' ? '' : 'display:none'}">
        <div class="auth-title">Welcome back</div>
        <div class="auth-sub">Sign in to your account to continue.</div>
        <div class="auth-error" id="loginError"></div>
        <div class="auth-field"><label>Email</label><input type="email" id="loginEmail" placeholder="you@example.com" autocomplete="email"/></div>
        <div class="auth-field"><label>Password</label><input type="password" id="loginPassword" placeholder="••••••••" autocomplete="current-password"/></div>
        <button class="auth-btn" id="loginBtn">Sign In</button>
        <div class="auth-switch">Don't have an account? <a id="showSignup">Create one</a></div>
      </div>

      <div id="authSignup" style="${mode === 'signup' ? '' : 'display:none'}">
        <div class="auth-title">${inviteToken ? 'Accept Invite' : 'Create account'}</div>
        <div class="auth-sub">${inviteToken ? 'Complete your account to join the organisation.' : 'Set up your organisation and get started.'}</div>
        <div class="auth-error" id="signupError"></div>
        <div class="auth-field"><label>Full Name</label><input type="text" id="signupName" placeholder="Jane Smith"/></div>
        ${!inviteToken ? `<div class="auth-field"><label>Organisation Name</label><input type="text" id="signupOrg" placeholder="Acme Corp"/></div>` : '<input type="hidden" id="signupOrg" value="invited"/>'}
        <div class="auth-field"><label>Email</label><input type="email" id="signupEmail" placeholder="you@example.com" autocomplete="email"/></div>
        <div class="auth-field"><label>Password</label><input type="password" id="signupPassword" placeholder="Min. 6 characters" autocomplete="new-password"/></div>
        <button class="auth-btn" id="signupBtn">${inviteToken ? 'Join Organisation' : 'Create Account'}</button>
        <div class="auth-switch">Already have an account? <a id="showLogin">Sign in</a></div>
      </div>
    </div>
  `;

  document.body.appendChild(screen);

  // Toggle between login and signup
  screen.querySelector('#showSignup').addEventListener('click', () => {
    screen.querySelector('#authLogin').style.display = 'none';
    screen.querySelector('#authSignup').style.display = '';
  });
  screen.querySelector('#showLogin').addEventListener('click', () => {
    screen.querySelector('#authSignup').style.display = 'none';
    screen.querySelector('#authLogin').style.display = '';
  });

  // If invite token present, show signup by default and update title
  if (inviteToken) {
    screen.querySelector('#authLogin').style.display = 'none';
    screen.querySelector('#authSignup').style.display = '';
    // Pre-fill email if available from invite
    const { getInviteByToken } = await import('./supabase.js');
    const { data: invite } = await getInviteByToken(inviteToken);
    if (invite?.email) {
      screen.querySelector('#signupEmail').value = invite.email;
    }
  }

  // Login
  screen.querySelector('#loginBtn').addEventListener('click', async () => {
    const btn = screen.querySelector('#loginBtn');
    const errEl = screen.querySelector('#loginError');
    const email = screen.querySelector('#loginEmail').value.trim();
    const password = screen.querySelector('#loginPassword').value;
    if (!email || !password) { showError(errEl, 'Please fill in all fields.'); return; }
    btn.disabled = true; btn.textContent = 'Signing in…';
    const { error } = await signIn(email, password);
    if (error) { showError(errEl, error.message); btn.disabled = false; btn.textContent = 'Sign In'; return; }
    const profile = await getProfile();
    const session = await getSession();
    AppState.currentUser = session.user;
    AppState.currentProfile = profile;
    removeAuthScreen();
    AppState.currentTab = 'dashboard';
    AppState.currentSubtab = 0;
    AppState.currentBriefingId = null;
    history.replaceState({ tab: 'dashboard', sub: 0, briefingId: null }, '', '#dashboard');
    await loadWorkspaces();
    await loadData();
    window.__initApp();
  });

  // Signup
  screen.querySelector('#signupBtn').addEventListener('click', async () => {
    const btn = screen.querySelector('#signupBtn');
    const errEl = screen.querySelector('#signupError');
    const fullName = screen.querySelector('#signupName').value.trim();
    const orgName = screen.querySelector('#signupOrg').value.trim();
    const email = screen.querySelector('#signupEmail').value.trim();
    const password = screen.querySelector('#signupPassword').value;
    if (!fullName || !email || !password) { showError(errEl, 'Please fill in all fields.'); return; }
    if (!inviteToken && !orgName) { showError(errEl, 'Please enter your organisation name.'); return; }
    if (password.length < 6) { showError(errEl, 'Password must be at least 6 characters.'); return; }
    btn.disabled = true; btn.textContent = inviteToken ? 'Joining…' : 'Creating account…';

    let signUpError = null;
    if (inviteToken) {
      // Sign up via invite — join existing org
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } }
      });
      if (error) { showError(errEl, error.message); btn.disabled = false; btn.textContent = 'Join Organisation'; return; }
      if (data?.user) {
        await supabase.from('profiles').update({ full_name: fullName }).eq('id', data.user.id);
        await acceptInvite(inviteToken, data.user.id);
      }
    } else {
      const { error } = await signUp(email, password, fullName, orgName);
      signUpError = error;
    }

    if (signUpError) { showError(errEl, signUpError.message); btn.disabled = false; btn.textContent = 'Create Account'; return; }

    const successMsg = inviteToken
      ? '✓ Account created! You can now sign in.'
      : '✓ Account created! Check your email to confirm, then sign in.';
    showError(errEl, successMsg);
    errEl.style.background = 'rgba(62,207,142,.1)';
    errEl.style.borderColor = 'var(--green)';
    errEl.style.color = 'var(--green)';
    btn.disabled = false;
    btn.textContent = inviteToken ? 'Join Organisation' : 'Create Account';
    if (inviteToken) {
      setTimeout(async () => {
        const { error: signInError } = await signIn(email, password);
        if (!signInError) {
          const profile = await getProfile();
          const session = await getSession();
          AppState.currentUser = session.user;
          AppState.currentProfile = profile;
          removeAuthScreen();
          AppState.currentTab = 'dashboard';
          AppState.currentSubtab = 0;
          AppState.currentBriefingId = null;
          history.replaceState({ tab: 'dashboard', sub: 0, briefingId: null }, '', '#dashboard');
          await loadWorkspaces();
          await loadData();
          window.__initApp();
        }
      }, 1500);
    } else {
      setTimeout(() => {
        screen.querySelector('#authSignup').style.display = 'none';
        screen.querySelector('#authLogin').style.display = '';
      }, 2500);
    }
  });

  // Enter key support
  screen.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const loginVisible = screen.querySelector('#authLogin').style.display !== 'none';
      if (loginVisible) screen.querySelector('#loginBtn').click();
      else screen.querySelector('#signupBtn').click();
    }
  });
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.add('show');
}

function removeAuthScreen() {
  document.getElementById('authScreen')?.remove();
}

export async function handleSignOut() {
  await signOut();
  AppState.currentUser = null;
  AppState.currentProfile = null;
  AppState.organisationId = null;
  AppState.currentProfile = null;
  renderAuthScreen('login');
}