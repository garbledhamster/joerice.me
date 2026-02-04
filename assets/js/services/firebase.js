/**
 * @file services/firebase.js
 * @description Firebase initialization and configuration
 *
 * Centralizes Firebase setup and provides access to Firebase services
 */

let firebaseApp = null;
let auth = null;
let firestore = null;
let storage = null;
let isInitialized = false;

const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];

/**
 * Get Firebase config from window
 * @returns {Object|null} Firebase config or null
 */
function getConfig() {
  return window.firebaseConfig ?? window.FIREBASE_CONFIG ?? null;
}

/**
 * Check if Firebase config is valid
 * @returns {Object} Validation result with isValid and missingKeys
 */
export function validateConfig() {
  const config = getConfig();
  const missingKeys = requiredKeys.filter(
    key => typeof config?.[key] !== 'string' || !config[key].trim()
  );

  return {
    isValid: missingKeys.length === 0,
    missingKeys,
    config: missingKeys.length === 0 ? config : null,
  };
}

/**
 * Initialize Firebase services
 * @returns {boolean} Whether initialization was successful
 */
export function initFirebase() {
  if (isInitialized) return true;

  const { isValid, config } = validateConfig();

  if (!isValid || !window.firebase) {
    console.warn('Firebase not available or config invalid');
    return false;
  }

  try {
    // Initialize Firebase app if not already done
    if (window.firebase.apps?.length === 0) {
      firebaseApp = window.firebase.initializeApp(config);
    } else {
      firebaseApp = window.firebase.apps[0];
    }

    // Initialize services
    if (window.firebase.auth) {
      auth = window.firebase.auth();
    }

    if (window.firebase.firestore) {
      firestore = window.firebase.firestore();
    }

    if (window.firebase.storage) {
      storage = window.firebase.storage();
    }

    isInitialized = true;
    return true;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return false;
  }
}

/**
 * Get Firebase Auth instance
 * @returns {Object|null} Firebase Auth instance
 */
export function getAuth() {
  if (!isInitialized) initFirebase();
  return auth;
}

/**
 * Get Firestore instance
 * @returns {Object|null} Firestore instance
 */
export function getFirestore() {
  if (!isInitialized) initFirebase();
  return firestore;
}

/**
 * Get Firebase Storage instance
 * @returns {Object|null} Storage instance
 */
export function getStorage() {
  if (!isInitialized) initFirebase();
  return storage;
}

/**
 * Check if Firebase is available and initialized
 * @returns {boolean} Whether Firebase is ready
 */
export function isFirebaseReady() {
  return isInitialized && auth !== null;
}

/**
 * Get Firebase server timestamp
 * @returns {Object} Firestore server timestamp
 */
export function serverTimestamp() {
  return window.firebase?.firestore?.FieldValue?.serverTimestamp?.() ?? new Date().toISOString();
}
