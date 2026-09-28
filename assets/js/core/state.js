/**
 * @file core/state.js
 * @description Simple state management for shared app state
 *
 * Provides a centralized store for app-wide state with
 * subscription support for reactive updates
 */

const state = {
	// Auth state
	isAdmin: false,
	userId: null,
	user: null,

	// UI state
	currentPage: null,
	menuOpen: false,
	modalOpen: null,

	// Feature flags
	githubContentEnabled: true,
};

const listeners = new Map();

/**
 * Get current state value
 * @param {string} key - State key to retrieve
 * @returns {*} Current value for the key
 */
export function getState(key) {
	return state[key];
}

/**
 * Get entire state object (read-only copy)
 * @returns {Object} Copy of current state
 */
export function getAllState() {
	return { ...state };
}

/**
 * Set state value and notify listeners
 * @param {string} key - State key to update
 * @param {*} value - New value
 */
export function setState(key, value) {
	const previousValue = state[key];
	if (previousValue === value) return;

	state[key] = value;
	notifyListeners(key, value, previousValue);
}

/**
 * Update multiple state values at once
 * @param {Object} updates - Object with key-value pairs to update
 */
export function setStateMany(updates) {
	Object.entries(updates).forEach(([key, value]) => {
		setState(key, value);
	});
}

/**
 * Subscribe to state changes for a specific key
 * @param {string} key - State key to watch
 * @param {Function} callback - Function called when value changes
 * @returns {Function} Unsubscribe function
 */
export function subscribe(key, callback) {
	if (typeof callback !== "function") return () => {};

	if (!listeners.has(key)) {
		listeners.set(key, new Set());
	}

	listeners.get(key).add(callback);

	return () => {
		const keyListeners = listeners.get(key);
		if (keyListeners) {
			keyListeners.delete(callback);
		}
	};
}

/**
 * Subscribe to all state changes
 * @param {Function} callback - Function called when any value changes
 * @returns {Function} Unsubscribe function
 */
export function subscribeAll(callback) {
	return subscribe("*", callback);
}

/**
 * Notify listeners of state change
 * @param {string} key - State key that changed
 * @param {*} value - New value
 * @param {*} previousValue - Previous value
 */
function notifyListeners(key, value, previousValue) {
	// Notify specific key listeners
	const keyListeners = listeners.get(key);
	if (keyListeners) {
		keyListeners.forEach((listener) => {
			try {
				listener(value, previousValue, key);
			} catch (error) {
				console.warn(`State listener error for key "${key}":`, error);
			}
		});
	}

	// Notify global listeners
	const globalListeners = listeners.get("*");
	if (globalListeners) {
		globalListeners.forEach((listener) => {
			try {
				listener(value, previousValue, key);
			} catch (error) {
				console.warn("Global state listener error:", error);
			}
		});
	}
}

/**
 * Reset state to initial values (for testing)
 */
export function resetState() {
	Object.keys(state).forEach((key) => {
		delete state[key];
	});
	Object.assign(state, {
		isAdmin: false,
		userId: null,
		user: null,
		currentPage: null,
		menuOpen: false,
		modalOpen: null,
		githubContentEnabled: true,
	});
}
