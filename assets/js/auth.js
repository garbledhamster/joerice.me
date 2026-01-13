import { $, $$ } from './dom.js';
import { lockScroll, unlockScroll } from './ui/layout.js';

const firebaseConfig = window.firebaseConfig || {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

let auth = null;
let firestore = null;
let isAdmin = false;

const adminEmail = 'jmjrice94@gmail.com';
let pendingEmailSignInLink = null;

export function isAdminUser() {
  return isAdmin;
}

export function updateAdminUi() {
  const adminOnlyElements = $$(
    '[data-admin-only], .editButton, .editBtn, .editPanel'
  );
  adminOnlyElements.forEach(el => {
    const shouldHide = !isAdmin;
    el.hidden = shouldHide;
    el.setAttribute('aria-hidden', String(shouldHide));
    el.classList.toggle('admin-hidden', shouldHide);
  });

  const loginButton = $('#loginButton');
  if (loginButton) {
    loginButton.textContent = isAdmin ? 'Admin' : 'Login';
  }
}

export function ensureAdmin(actionLabel = 'admin action') {
  if (isAdmin) return true;
  console.warn(`Blocked ${actionLabel}: not an admin user.`);
  return false;
}

export function getFirestore() {
  return firestore;
}

function setLoginStatus(message = '') {
  const loginStatus = $('#loginStatus');
  if (!loginStatus) return;
  loginStatus.textContent = message;
}

function openLoginModal() {
  const loginModal = $('#loginModal');
  const loginEmail = $('#loginEmail');
  if (!loginModal) return;
  loginModal.classList.add('show');
  loginModal.setAttribute('aria-hidden', 'false');
  setTimeout(() => loginEmail?.focus(), 0);
  lockScroll();
}

function closeLoginModal(event) {
  event?.preventDefault();
  const loginModal = $('#loginModal');
  if (!loginModal) return;
  loginModal.classList.remove('show');
  loginModal.setAttribute('aria-hidden', 'true');
  setLoginStatus('');
  unlockScroll();
  if (window.location.hash === '#loginModal') {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

async function sendLoginLink(email) {
  if (!auth?.sendSignInLinkToEmail) {
    setLoginStatus('Firebase auth is unavailable. Check the site config.');
    return;
  }
  const actionCodeSettings = {
    url: `${window.location.origin}${window.location.pathname}`,
    handleCodeInApp: true
  };
  try {
    await auth.sendSignInLinkToEmail(email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
    setLoginStatus('Check your inbox for a sign-in link.');
  } catch (error) {
    console.error('Failed to send sign-in link', error);
    setLoginStatus('Unable to send the sign-in link. Please try again.');
  }
}

async function completeEmailLinkSignIn(email) {
  if (!pendingEmailSignInLink || !auth?.signInWithEmailLink) return;
  try {
    await auth.signInWithEmailLink(email, pendingEmailSignInLink);
    window.localStorage.removeItem('emailForSignIn');
    pendingEmailSignInLink = null;
    const cleanUrl = new URL(window.location.href);
    cleanUrl.search = '';
    cleanUrl.hash = '';
    window.location.replace(cleanUrl.toString());
  } catch (error) {
    console.error('Failed to complete email link sign-in', error);
    setLoginStatus('Unable to complete sign-in. Please try again.');
  }
}

function initFirebase() {
  if (window.firebase?.apps?.length === 0) {
    if (firebaseConfig?.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY') {
      window.firebase.initializeApp(firebaseConfig);
    } else {
      console.warn('Firebase config missing; auth is disabled.');
    }
  }
  if (window.firebase?.apps?.length && window.firebase?.auth) {
    auth = window.firebase.auth();
  }
  if (window.firebase?.apps?.length && window.firebase?.firestore) {
    firestore = window.firebase.firestore();
  }
}

export function initAuth() {
  initFirebase();

  window.isAdminUser = isAdminUser;

  const loginButton = $('#loginButton');
  const loginModal = $('#loginModal');
  const loginForm = $('#loginForm');
  const loginEmail = $('#loginEmail');
  const loginCancel = $('#loginCancel');

  if (loginButton) {
    loginButton.addEventListener('click', event => {
      event.preventDefault();
      if (isAdmin) {
        setLoginStatus('You are already signed in.');
      }
      openLoginModal();
    });
  }

  if (loginModal) {
    loginModal.addEventListener('click', event => {
      if (event.target === loginModal) {
        closeLoginModal();
      }
    });
  }

  if (loginCancel) {
    loginCancel.addEventListener('click', closeLoginModal);
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async event => {
      event.preventDefault();
      const email = loginEmail?.value.trim();
      if (!email) return;
      if (pendingEmailSignInLink) {
        await completeEmailLinkSignIn(email);
        return;
      }
      await sendLoginLink(email);
    });
  }

  if (auth?.isSignInWithEmailLink && auth.isSignInWithEmailLink(window.location.href)) {
    pendingEmailSignInLink = window.location.href;
    const storedEmail = window.localStorage.getItem('emailForSignIn');
    if (storedEmail) {
      completeEmailLinkSignIn(storedEmail);
    } else {
      setLoginStatus('Enter your email to finish signing in.');
      openLoginModal();
    }
  }

  if (auth?.onAuthStateChanged) {
    auth.onAuthStateChanged(user => {
      isAdmin = user?.email === adminEmail;
      updateAdminUi();
    });
  } else {
    updateAdminUi();
  }

  document.addEventListener('click', event => {
    const adminTarget = event.target.closest('[data-admin-action], .editButton, .editBtn');
    if (!adminTarget) return;
    const label = adminTarget.dataset.adminAction || 'admin action';
    if (!ensureAdmin(label)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  document.addEventListener('submit', event => {
    const adminTarget = event.target.closest('[data-admin-action]');
    if (!adminTarget) return;
    const label = adminTarget.dataset.adminAction || 'admin action';
    if (!ensureAdmin(label)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  $$('.editButton[data-panel-target], .editBtn[data-panel-target]').forEach(button => {
    const panel = $(`#${button.dataset.panelTarget}`);
    if (panel) {
      button.setAttribute('aria-expanded', String(!panel.classList.contains('is-collapsed')));
    }
    button.addEventListener('click', () => {
      if (!ensureAdmin(button.dataset.adminAction || 'admin action')) return;
      if (!panel) return;
      const isCollapsed = panel.classList.toggle('is-collapsed');
      button.setAttribute('aria-expanded', String(!isCollapsed));
    });
  });
}
