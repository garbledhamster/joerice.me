import { $, $$ } from "./dom.js";
import { lockScroll, unlockScroll } from "./ui/layout.js";

const requiredFirebaseKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

// These MUST be let, because initFirebase() refreshes them from window.*
let firebaseConfig = window.firebaseConfig ?? window.FIREBASE_CONFIG ?? null;
let missingFirebaseKeys = [];
let hasFirebaseConfig = false;
let firebaseAvailable = false;

let auth = null;
let firestore = null;
let isAdmin = false;
let currentUserId = null;
const authListeners = new Set();

const adminEmail = "jmjrice94@gmail.com";
let pendingEmailSignInLink = null;

function refreshFirebaseConfigState() {
  firebaseConfig = window.firebaseConfig ?? window.FIREBASE_CONFIG ?? null;

  missingFirebaseKeys = requiredFirebaseKeys.filter(
    key =>
      typeof firebaseConfig?.[key] !== "string" || !firebaseConfig[key].trim()
  );

  hasFirebaseConfig = missingFirebaseKeys.length === 0;
  firebaseAvailable = hasFirebaseConfig;
}

export function isAdminUser() {
  return isAdmin;
}

export function ensureAdmin(actionLabel = "admin action") {
  if (isAdmin) return true;
  console.warn(`Blocked ${actionLabel}: not an admin user.`);
  return false;
}

export function getFirestore() {
  return firestore;
}

export function getCurrentUserId() {
  return currentUserId;
}

export function onAuthStateChange(callback) {
  if (typeof callback !== "function") return () => {};
  authListeners.add(callback);
  return () => authListeners.delete(callback);
}

function notifyAuthListeners(user) {
  authListeners.forEach(listener => {
    try {
      listener(user);
    } catch (error) {
      console.warn("Auth state listener failed.", error);
    }
  });
}

export function updateAdminUi() {
  const adminOnlyElements = $$(
    "[data-admin-only], .editButton, .editBtn, .editPanel"
  );
  adminOnlyElements.forEach(el => {
    const shouldHide = !isAdmin;
    el.hidden = shouldHide;
    el.setAttribute("aria-hidden", String(shouldHide));
    el.classList.toggle("admin-hidden", shouldHide);
  });

  const loginButton = $("#loginButton");
  if (loginButton) {
    loginButton.textContent = isAdmin ? "Admin" : "Login";
  }
}

function setLoginStatus(message = "") {
  const loginStatus = $("#loginStatus");
  if (!loginStatus) return;
  loginStatus.textContent = message;
}

function getFirebaseUnavailableMessage() {
  refreshFirebaseConfigState();

  if (!hasFirebaseConfig) {
    return `Firebase auth is unavailable. Missing config: ${missingFirebaseKeys.join(
      ", "
    )}.`;
  }
  return "Firebase auth is unavailable. Check the site config.";
}

function openLoginModal() {
  const loginModal = $("#loginModal");
  const loginEmail = $("#loginEmail");
  if (!loginModal) return;

  loginModal.classList.add("show");
  loginModal.setAttribute("aria-hidden", "false");
  setTimeout(() => loginEmail?.focus(), 0);
  lockScroll();
}

function closeLoginModal(event) {
  event?.preventDefault();

  const loginModal = $("#loginModal");
  if (!loginModal) return;

  loginModal.classList.remove("show");
  loginModal.setAttribute("aria-hidden", "true");
  setLoginStatus("");
  unlockScroll();

  if (window.location.hash === "#loginModal") {
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );
  }
}

/**
 * Idempotent initializer.
 * Safe to call multiple times.
 */
function initFirebase() {
  refreshFirebaseConfigState();

  // Hard stop if config missing or firebase scripts not present
  if (!firebaseAvailable || !window.firebase) {
    auth = null;
    firestore = null;
    firebaseAvailable = false;
    return;
  }

  // Initialize app if needed (compat SDK exposes firebase.apps)
  const apps = window.firebase.apps || [];
  if (apps.length === 0) {
    try {
      window.firebase.initializeApp(firebaseConfig);
    } catch (e) {
      console.warn("Firebase initializeApp failed.", e);
      auth = null;
      firestore = null;
      firebaseAvailable = false;
      return;
    }
  }

  // Grab services
  auth =
    typeof window.firebase.auth === "function" ? window.firebase.auth() : null;
  firestore =
    typeof window.firebase.firestore === "function"
      ? window.firebase.firestore()
      : null;

  // If auth is missing, treat firebase as unavailable for login features
  firebaseAvailable = !!auth;
}

async function sendLoginLink(email) {
  initFirebase();
  if (!firebaseAvailable || !auth?.sendSignInLinkToEmail) {
    setLoginStatus(getFirebaseUnavailableMessage());
    return;
  }

  const actionCodeSettings = {
    url: `${window.location.origin}${window.location.pathname}`,
    handleCodeInApp: true,
  };

  try {
    await auth.sendSignInLinkToEmail(email, actionCodeSettings);
    window.localStorage.setItem("emailForSignIn", email);
    setLoginStatus("Check your inbox for a sign-in link.");
  } catch (error) {
    console.error("Failed to send sign-in link", error);
    const errorMessage = error?.message ? ` ${error.message}` : "";
    setLoginStatus(
      `Unable to send the sign-in link. Please try again.${errorMessage}`
    );
  }
}

async function completeEmailLinkSignIn(email) {
  initFirebase();
  if (
    !firebaseAvailable ||
    !pendingEmailSignInLink ||
    !auth?.signInWithEmailLink
  )
    return;

  try {
    await auth.signInWithEmailLink(email, pendingEmailSignInLink);
    window.localStorage.removeItem("emailForSignIn");
    pendingEmailSignInLink = null;

    const cleanUrl = new URL(window.location.href);
    cleanUrl.search = "";
    cleanUrl.hash = "";
    window.location.replace(cleanUrl.toString());
  } catch (error) {
    console.error("Failed to complete email link sign-in", error);
    const errorMessage = error?.message ? ` ${error.message}` : "";
    setLoginStatus(
      `Unable to complete sign-in. Please try again.${errorMessage}`
    );
  }
}

export function initAuth() {
  // Initialize once up front
  initFirebase();

  // Some of your other modules call this
  window.isAdminUser = isAdminUser;

  const loginButton = $("#loginButton");
  const loginModal = $("#loginModal");
  const loginForm = $("#loginForm");
  const loginEmail = $("#loginEmail");
  const loginCancel = $("#loginCancel");

  // Modal click-away
  if (loginModal) {
    loginModal.addEventListener("click", event => {
      if (event.target === loginModal) closeLoginModal(event);
    });
  }

  if (loginCancel) {
    loginCancel.addEventListener("click", closeLoginModal);
  }

  // Login button opens modal, and shows a helpful message if Firebase is unavailable
  if (loginButton) {
    loginButton.addEventListener("click", event => {
      event.preventDefault();
      initFirebase();

      if (!firebaseAvailable) {
        setLoginStatus(getFirebaseUnavailableMessage());
        openLoginModal();
        return;
      }

      if (isAdmin) setLoginStatus("You are already signed in.");
      else setLoginStatus("");

      openLoginModal();
    });
  }

  // Submit email
  if (loginForm) {
    loginForm.addEventListener("submit", async event => {
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

  // Complete email-link sign-in if URL contains a sign-in link
  if (
    firebaseAvailable &&
    auth?.isSignInWithEmailLink &&
    auth.isSignInWithEmailLink(window.location.href)
  ) {
    pendingEmailSignInLink = window.location.href;
    const storedEmail = window.localStorage.getItem("emailForSignIn");

    if (storedEmail) {
      completeEmailLinkSignIn(storedEmail);
    } else {
      setLoginStatus("Enter your email to finish signing in.");
      openLoginModal();
    }
  }

  // Subscribe to auth state
  if (firebaseAvailable && auth?.onAuthStateChanged) {
    auth.onAuthStateChanged(user => {
      isAdmin = user?.email === adminEmail;
      currentUserId = user?.uid ?? null;
      updateAdminUi();
      notifyAuthListeners(user);
    });
  } else {
    // Not signed in / auth unavailable
    isAdmin = false;
    currentUserId = null;
    updateAdminUi();
    notifyAuthListeners(null);
  }

  // Generic admin guard
  document.addEventListener("click", event => {
    const adminTarget = event.target.closest(
      "[data-admin-action], .editButton, .editBtn"
    );
    if (!adminTarget) return;

    const label = adminTarget.dataset.adminAction || "admin action";
    if (!ensureAdmin(label)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  document.addEventListener("submit", event => {
    const adminTarget = event.target.closest("[data-admin-action]");
    if (!adminTarget) return;

    const label = adminTarget.dataset.adminAction || "admin action";
    if (!ensureAdmin(label)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  // Toggle panels
  $$(".editButton[data-panel-target], .editBtn[data-panel-target]").forEach(
    button => {
      const panel = $(`#${button.dataset.panelTarget}`);
      if (panel) {
        button.setAttribute(
          "aria-expanded",
          String(!panel.classList.contains("is-collapsed"))
        );
      }
      button.addEventListener("click", () => {
        if (!ensureAdmin(button.dataset.adminAction || "admin action")) return;
        if (!panel) return;
        const isCollapsed = panel.classList.toggle("is-collapsed");
        button.setAttribute("aria-expanded", String(!isCollapsed));
      });
    }
  );
}
