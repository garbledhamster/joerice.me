import { $, $$ } from './dom.js';
import { lockScroll, unlockScroll } from './ui/layout.js';

let firebaseConfig = window.firebaseConfig ?? window.FIREBASE_CONFIG;
const requiredFirebaseKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId'
];
let missingFirebaseKeys = requiredFirebaseKeys.filter(
  key => typeof firebaseConfig?.[key] !== 'string' || !firebaseConfig[key].trim()
);
let hasFirebaseConfig = missingFirebaseKeys.length === 0;
let firebaseAvailable = hasFirebaseConfig;

let auth = null;
let firestore = null;
let storage = null;
let isAdmin = false;
let currentUserId = null;
const authListeners = new Set();

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

export function getStorage() {
  return storage;
}

export function getCurrentUserId() {
  return currentUserId;
}

export function onAuthStateChange(callback) {
  if (typeof callback !== 'function') return () => {};
  authListeners.add(callback);
  return () => authListeners.delete(callback);
}

function setLoginStatus(message = '') {
  const loginStatus = $('#loginStatus');
  if (!loginStatus) return;
  loginStatus.textContent = message;
}

function getFirebaseUnavailableMessage() {
  if (!hasFirebaseConfig) {
    return `Firebase auth is unavailable. Missing config: ${missingFirebaseKeys.join(', ')}.`;
  }
  return 'Firebase auth is unavailable. Check the site config.';
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
  initFirebase();
  if (!auth?.sendSignInLinkToEmail) {
    setLoginStatus(getFirebaseUnavailableMessage());
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
    const errorMessage = error?.message ? ` ${error.message}` : '';
    setLoginStatus(`Unable to send the sign-in link. Please try again.${errorMessage}`);
  }
}

async function completeEmailLinkSignIn(email) {
  initFirebase();
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
    const errorMessage = error?.message ? ` ${error.message}` : '';
    setLoginStatus(`Unable to complete sign-in. Please try again.${errorMessage}`);
  }
}

function initFirebase() {
  firebaseConfig = window.firebaseConfig ?? window.FIREBASE_CONFIG ?? null;
  missingFirebaseKeys = requiredFirebaseKeys.filter(
    key => typeof firebaseConfig?.[key] !== 'string' || !firebaseConfig[key].trim()
  );
  hasFirebaseConfig = missingFirebaseKeys.length === 0;
  firebaseAvailable = hasFirebaseConfig;
  if (!firebaseAvailable || !window.firebase) {
    auth = null;
    firestore = null;
    storage = null;
    return;
  }
  if (window.firebase?.apps?.length === 0) {
    window.firebase.initializeApp(firebaseConfig);
  }
  if (window.firebase?.apps?.length && window.firebase?.auth) {
    auth = window.firebase.auth();
  }
  if (window.firebase?.apps?.length && window.firebase?.firestore) {
    firestore = window.firebase.firestore();
  }
  if (window.firebase?.apps?.length && window.firebase?.storage) {
    storage = window.firebase.storage();
  }
  if (!auth) {
    firebaseAvailable = false;
  }
}

function notifyAuthListeners(user) {
  authListeners.forEach(listener => {
    try {
      listener(user);
    } catch (error) {
      console.warn('Auth state listener failed.', error);
    }
  });
}

export function initAuth() {
  initFirebase();

  window.isAdminUser = isAdminUser;

  const loginButton = $('#loginButton');
  const loginModal = $('#loginModal');
  const loginForm = $('#loginForm');
  const loginEmail = $('#loginEmail');
  const loginCancel = $('#loginCancel');

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

  initFirebase();
  if (!firebaseAvailable) {
    if (loginButton) {
      loginButton.setAttribute('aria-disabled', 'true');
      loginButton.addEventListener('click', event => {
        event.preventDefault();
        setLoginStatus(getFirebaseUnavailableMessage());
        openLoginModal();
      });
    }
    if (loginForm) {
      loginForm.addEventListener('submit', event => {
        event.preventDefault();
        setLoginStatus(getFirebaseUnavailableMessage());
      });
    }
    if (loginEmail) {
      loginEmail.removeAttribute('disabled');
    }
    updateAdminUi();
  }

  if (loginButton) {
    loginButton.addEventListener('click', event => {
      event.preventDefault();
      initFirebase();
      if (!firebaseAvailable) {
        setLoginStatus(getFirebaseUnavailableMessage());
        openLoginModal();
        return;
      }
      if (isAdmin) {
        setLoginStatus('You are already signed in.');
      }
      openLoginModal();
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async event => {
      event.preventDefault();
      initFirebase();
      if (!firebaseAvailable) {
        setLoginStatus(getFirebaseUnavailableMessage());
        return;
      }
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
    auth.onAuthStateChanged(async user => {
      // If no user is signed in, sign in anonymously to allow Firestore access
      if (!user && auth?.signInAnonymously) {
        try {
          await auth.signInAnonymously();
          // onAuthStateChanged will be called again with the anonymous user
          return;
        } catch (error) {
          console.warn('Failed to sign in anonymously:', error);
        }
      }
      
      isAdmin = user?.email === adminEmail;
      currentUserId = user?.uid ?? null;
      updateAdminUi();
      notifyAuthListeners(user);
    });
  } else {
    updateAdminUi();
    notifyAuthListeners(null);
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
