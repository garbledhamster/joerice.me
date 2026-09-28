import { $ } from "./dom.js";

const STORAGE_KEY = "showGithubContent";
let checkbox = null;
const changeCallbacks = [];

/**
 * Check if GitHub content (YAML-sourced quotes and posts) should be shown
 * @returns {boolean} true if GitHub content should be shown, false otherwise
 */
export function isGithubContentEnabled() {
	const stored = window.localStorage.getItem(STORAGE_KEY);
	// Default to true (show GitHub content) if not set
	return stored === null ? true : stored === "true";
}

/**
 * Set whether GitHub content should be shown
 * @param {boolean} enabled - true to show GitHub content, false to hide it
 */
export function setGithubContentEnabled(enabled) {
	window.localStorage.setItem(STORAGE_KEY, String(enabled));
	// Notify all registered callbacks
	changeCallbacks.forEach((callback) => {
		callback(enabled);
	});
}

/**
 * Register a callback to be called when GitHub content visibility changes
 * @param {function(boolean): void} callback - Function to call when visibility changes
 */
export function onGithubContentChange(callback) {
	if (typeof callback === "function") {
		changeCallbacks.push(callback);
	}
}

/**
 * Initialize the GitHub content visibility control
 * This should be called after the DOM is ready and auth is initialized
 */
export function initGithubContentToggle() {
	checkbox = $("#showGithubContent");
	if (!checkbox) {
		console.warn("GitHub content checkbox not found in DOM");
		return;
	}

	// Set initial state from localStorage
	checkbox.checked = isGithubContentEnabled();

	// Listen for changes
	checkbox.addEventListener("change", () => {
		const enabled = checkbox.checked;
		setGithubContentEnabled(enabled);
	});
}
