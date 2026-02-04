/**
 * @file services/auth.js
 * @description Authentication service
 *
 * Handles user authentication, admin verification, and auth state
 */

import { $, $$, lockScroll, unlockScroll } from '../core/dom.js';
import { setState, getState } from '../core/state.js';
import { getAuth, getFirestore, getStorage, initFirebase, isFirebaseReady, validateConfig } from './firebase.js';

const adminEmail = 'jmjrice94@gmail.com';
const LOGOUT_DELAY_MS = 1500;

let pendingEmailSignInLink = null;
let isSigningInAnonymously = false;
const authListeners = new Set();

/**
 * Check if current user is admin
 * @returns {boolean} Whether user is admin
 */
export function isAdminUser() {
  return getState('isAdmin');
}

/**
 * Get current user ID
 * @returns {string|null} Current user ID
 */
export function getCurrentUserId() {
  return getState('userId');
}

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Called when auth state changes
 * @returns {Function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  if (typeof callback !== 'function') return () => {};
  authListeners.add(callback);
  return () => authListeners.delete(callback);
}

/**
 * Notify auth state listeners
 * @param {Object|null} user - Firebase user object
 */
function notifyAuthListeners(user) {
  authListeners.forEach(listener => {
    try {
      listener(user);
    } catch (error) {
      console.warn('Auth listener error:', error);
    }
  });
}

/**
 * Update admin-only UI elements
 */
export function updateAdminUi() {
  const isAdmin = isAdminUser();
  const adminElements = $$('[data-admin-only], .editButton, .editBtn, .editPanel');

  adminElements.forEach(el => {
    if (el.hasAttribute('data-skip-admin-ui')) return;
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

/**
 * Ensure user is admin before action
 * @param {string} actionLabel - Description of the action
 * @returns {boolean} Whether user is admin
 */
export function ensureAdmin(actionLabel = 'admin action') {
  if (isAdminUser()) return true;
  console.warn(`Blocked ${actionLabel}: not an admin user.`);
  return false;
}

/**
 * Set login status message
 * @param {string} message - Status message
 */
function setLoginStatus(message = '') {
  const loginStatus = $('#loginStatus');
  if (loginStatus) {
    loginStatus.textContent = message;
  }
}

/**
 * Get error message for unavailable Firebase
 * @returns {string} Error message
 */
function getUnavailableMessage() {
  const { isValid, missingKeys } = validateConfig();
  if (!isValid) {
    return `Firebase auth unavailable. Missing: ${missingKeys.join(', ')}.`;
  }
  return 'Firebase auth unavailable. Check site config.';
}

/**
 * Open login modal
 */
function openLoginModal() {
  const loginModal = $('#loginModal');
  const loginEmail = $('#loginEmail');
  if (!loginModal) return;

  loginModal.classList.add('show');
  loginModal.setAttribute('aria-hidden', 'false');
  setTimeout(() => loginEmail?.focus(), 0);
  lockScroll();
}

/**
 * Close login modal
 * @param {Event} event - Click event
 */
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

/**
 * Send login link email
 * @param {string} email - User email
 */
async function sendLoginLink(email) {
  const auth = getAuth();
  if (!auth?.sendSignInLinkToEmail) {
    setLoginStatus(getUnavailableMessage());
    return;
  }

  const actionCodeSettings = {
    url: `${window.location.origin}${window.location.pathname}`,
    handleCodeInApp: true,
  };

  try {
    await auth.sendSignInLinkToEmail(email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
    setLoginStatus('Check your inbox for a sign-in link.');
  } catch (error) {
    console.error('Failed to send sign-in link:', error);
    setLoginStatus(`Unable to send sign-in link. ${error?.message || ''}`);
  }
}

/**
 * Complete email link sign-in
 * @param {string} email - User email
 */
async function completeEmailLinkSignIn(email) {
  const auth = getAuth();
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
    console.error('Failed to complete sign-in:', error);
    setLoginStatus(`Unable to complete sign-in. ${error?.message || ''}`);
  }
}

/**
 * Handle logout
 */
async function handleLogout() {
  const auth = getAuth();
  if (!auth?.signOut) {
    setLoginStatus('Unable to log out. Firebase unavailable.');
    return;
  }

  try {
    await auth.signOut();
    setLoginStatus('You have been logged out.');
    setTimeout(closeLoginModal, LOGOUT_DELAY_MS);
  } catch (error) {
    console.error('Failed to log out:', error);
    setLoginStatus(`Unable to log out. ${error?.message || ''}`);
  }
}

/**
 * Initialize auth system
 */
export function initAuth() {
  initFirebase();

  // Expose for backward compatibility
  window.isAdminUser = isAdminUser;

  const loginButton = $('#loginButton');
  const loginModal = $('#loginModal');
  const loginForm = $('#loginForm');
  const loginEmail = $('#loginEmail');
  const loginCancel = $('#loginCancel');
  const loginLogoutButton = $('#loginLogoutButton');

  // Modal backdrop click
  if (loginModal) {
    loginModal.addEventListener('click', e => {
      if (e.target === loginModal) closeLoginModal();
    });
  }

  // Cancel button
  if (loginCancel) {
    loginCancel.addEventListener('click', closeLoginModal);
  }

  // Logout button
  if (loginLogoutButton) {
    loginLogoutButton.addEventListener('click', handleLogout);
  }

  // Login button
  if (loginButton) {
    loginButton.addEventListener('click', e => {
      e.preventDefault();
      if (!isFirebaseReady()) {
        setLoginStatus(getUnavailableMessage());
      } else if (isAdminUser()) {
        setLoginStatus('You are already signed in.');
      }
      openLoginModal();
    });
  }

  // Login form
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (!isFirebaseReady()) {
        setLoginStatus(getUnavailableMessage());
        return;
      }

      const email = loginEmail?.value.trim();
      if (!email) return;

      if (pendingEmailSignInLink) {
        await completeEmailLinkSignIn(email);
      } else {
        await sendLoginLink(email);
      }
    });
  }

  // Check for email sign-in link
  const auth = getAuth();
  if (auth?.isSignInWithEmailLink?.(window.location.href)) {
    pendingEmailSignInLink = window.location.href;
    const storedEmail = window.localStorage.getItem('emailForSignIn');
    if (storedEmail) {
      completeEmailLinkSignIn(storedEmail);
    } else {
      setLoginStatus('Enter your email to finish signing in.');
      openLoginModal();
    }
  }

  // Auth state listener
  if (auth?.onAuthStateChanged) {
    auth.onAuthStateChanged(async user => {
      // Sign in anonymously if no user
      if (!user && auth?.signInAnonymously && !isSigningInAnonymously) {
        isSigningInAnonymously = true;
        try {
          await auth.signInAnonymously();
          return;
        } catch (error) {
          console.warn('Anonymous sign-in failed:', error?.code || error?.message);
        } finally {
          isSigningInAnonymously = false;
        }
      }

      const isAdmin = user?.email === adminEmail;
      setState('isAdmin', isAdmin);
      setState('userId', user?.uid ?? null);
      setState('user', user);

      updateAdminUi();
      notifyAuthListeners(user);
    });
  } else {
    updateAdminUi();
    notifyAuthListeners(null);
  }

  // Admin action protection
  document.addEventListener('click', e => {
    const adminTarget = e.target.closest('[data-admin-action], .editButton, .editBtn');
    if (adminTarget) {
      const label = adminTarget.dataset.adminAction || 'admin action';
      if (!ensureAdmin(label)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });
}

// Re-export Firebase getters for convenience
export { getFirestore, getStorage } from './firebase.js';
