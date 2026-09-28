/**
 * @file components/modal.js
 * @description Modal dialog component
 *
 * Provides reusable modal functionality with open/close handling,
 * backdrop clicks, escape key support, and scroll locking
 */

import { $, addListener, lockScroll, unlockScroll } from "../core/dom.js";
import { getState, setState } from "../core/state.js";

const openModals = new Set();
let cleanupFns = [];

/**
 * Open a modal by ID
 * @param {string} modalId - Modal element ID
 */
export function openModal(modalId) {
	const modal = $(`#${modalId}`);
	if (!modal) {
		console.warn(`Modal not found: ${modalId}`);
		return;
	}

	modal.classList.add("show");
	modal.setAttribute("aria-hidden", "false");
	openModals.add(modalId);
	setState("modalOpen", modalId);

	// Lock scroll only for first modal
	if (openModals.size === 1) {
		lockScroll();
	}

	// Focus first focusable element
	const focusable = modal.querySelector(
		"input, button, textarea, select, a[href]",
	);
	if (focusable) {
		setTimeout(() => focusable.focus(), 0);
	}
}

/**
 * Close a modal by ID
 * @param {string} modalId - Modal element ID
 */
export function closeModal(modalId) {
	const modal = $(`#${modalId}`);
	if (!modal) return;

	modal.classList.remove("show");
	modal.setAttribute("aria-hidden", "true");
	openModals.delete(modalId);

	// Update state
	if (openModals.size === 0) {
		setState("modalOpen", null);
		unlockScroll();
	} else {
		// Set to last open modal
		setState("modalOpen", Array.from(openModals).pop());
	}

	// Clean up URL hash if it matches this modal
	if (window.location.hash === `#${modalId}`) {
		history.replaceState(
			null,
			"",
			window.location.pathname + window.location.search,
		);
	}
}

/**
 * Close all open modals
 */
export function closeAllModals() {
	openModals.forEach((modalId) => {
		closeModal(modalId);
	});
}

/**
 * Check if a modal is currently open
 * @param {string} modalId - Modal element ID
 * @returns {boolean} Whether the modal is open
 */
export function isModalOpen(modalId) {
	return openModals.has(modalId);
}

/**
 * Get currently open modal ID
 * @returns {string|null} Currently open modal ID or null
 */
export function getCurrentModal() {
	return getState("modalOpen");
}

/**
 * Handle escape key to close modals
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleEscapeKey(e) {
	if (e.key === "Escape" && openModals.size > 0) {
		const lastModal = Array.from(openModals).pop();
		closeModal(lastModal);
	}
}

/**
 * Handle backdrop click to close modal
 * @param {MouseEvent} e - Click event
 */
function handleBackdropClick(e) {
	const modal = e.target.closest(".modal");
	if (modal && e.target === modal) {
		const modalId = modal.id;
		if (modalId && openModals.has(modalId)) {
			closeModal(modalId);
		}
	}
}

/**
 * Handle hash change for modal URLs
 */
function handleHashModal() {
	const hash = window.location.hash.slice(1);
	if (hash?.endsWith("Modal")) {
		const modal = $(`#${hash}`);
		if (modal?.classList.contains("modal")) {
			openModal(hash);
		}
	}
}

/**
 * Initialize modal system
 * Sets up global event listeners for modal handling
 */
export function initModals() {
	cleanupFns.push(addListener(document, "keydown", handleEscapeKey));
	cleanupFns.push(addListener(document, "click", handleBackdropClick));

	// Handle hash-based modal opening
	handleHashModal();
	cleanupFns.push(addListener(window, "hashchange", handleHashModal));
}

/**
 * Clean up modal system
 */
export function destroyModals() {
	closeAllModals();
	cleanupFns.forEach((fn) => {
		fn();
	});
	cleanupFns = [];
}

/**
 * Create a modal element
 * @param {Object} options - Modal options
 * @param {string} options.id - Modal ID
 * @param {string} options.title - Modal title
 * @param {string} options.content - Modal content HTML
 * @param {string} options.className - Additional CSS class
 * @returns {string} Modal HTML
 */
export function createModalTemplate({ id, title, content, className = "" }) {
	return `
    <div class="modal ${className}" id="${id}" aria-hidden="true" role="dialog" aria-modal="true">
      <div class="modalContent">
        ${title ? `<h3>${title}</h3>` : ""}
        ${content}
      </div>
    </div>
  `;
}
