/**
 * @file core/dom.js
 * @description DOM utility functions and helpers
 *
 * Provides convenient shortcuts for common DOM operations
 */

/**
 * Query selector shorthand
 * @param {string} selector - CSS selector
 * @param {Element|Document} root - Root element to query from
 * @returns {Element|null} Found element or null
 */
export const $ = (selector, root = document) => root.querySelector(selector);

/**
 * Query selector all shorthand (returns array)
 * @param {string} selector - CSS selector
 * @param {Element|Document} root - Root element to query from
 * @returns {Element[]} Array of found elements
 */
export const $$ = (selector, root = document) =>
	Array.from(root.querySelectorAll(selector));

/**
 * Create an element with attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes to set
 * @param {(string|Element)[]} children - Child elements or text
 * @returns {Element} Created element
 */
export function createElement(tag, attrs = {}, children = []) {
	const el = document.createElement(tag);

	Object.entries(attrs).forEach(([key, value]) => {
		if (key === "className") {
			el.className = value;
		} else if (key === "dataset") {
			Object.entries(value).forEach(([dataKey, dataValue]) => {
				el.dataset[dataKey] = dataValue;
			});
		} else if (key.startsWith("on") && typeof value === "function") {
			const event = key.slice(2).toLowerCase();
			el.addEventListener(event, value);
		} else if (key === "style" && typeof value === "object") {
			Object.assign(el.style, value);
		} else {
			el.setAttribute(key, value);
		}
	});

	children.forEach((child) => {
		if (typeof child === "string") {
			el.appendChild(document.createTextNode(child));
		} else if (child instanceof Element) {
			el.appendChild(child);
		}
	});

	return el;
}

/**
 * Create element from HTML string
 * @param {string} html - HTML string
 * @returns {Element} Created element
 */
export function htmlToElement(html) {
	const template = document.createElement("template");
	template.innerHTML = html.trim();
	return template.content.firstChild;
}

/**
 * Set element content (safely)
 * @param {Element} el - Target element
 * @param {string} content - Text content
 */
export function setTextContent(el, content) {
	if (el) {
		el.textContent = content;
	}
}

/**
 * Toggle element visibility
 * @param {Element} el - Target element
 * @param {boolean} visible - Whether to show or hide
 */
export function setVisible(el, visible) {
	if (el) {
		el.hidden = !visible;
	}
}

/**
 * Add event listener with automatic cleanup
 * @param {Element} el - Target element
 * @param {string} event - Event type
 * @param {Function} handler - Event handler
 * @param {Object} options - Event listener options
 * @returns {Function} Cleanup function
 */
export function addListener(el, event, handler, options) {
	if (!el) return () => {};
	el.addEventListener(event, handler, options);
	return () => el.removeEventListener(event, handler, options);
}

/**
 * Delegate event handling
 * @param {Element} container - Container element
 * @param {string} selector - Selector for target elements
 * @param {string} event - Event type
 * @param {Function} handler - Event handler
 * @returns {Function} Cleanup function
 */
export function delegate(container, selector, event, handler) {
	if (!container) return () => {};

	const delegatedHandler = (e) => {
		const target = e.target.closest(selector);
		if (target && container.contains(target)) {
			handler(e, target);
		}
	};

	container.addEventListener(event, delegatedHandler);
	return () => container.removeEventListener(event, delegatedHandler);
}

/**
 * Wait for DOM ready
 * @returns {Promise} Resolves when DOM is ready
 */
export function ready() {
	return new Promise((resolve) => {
		if (document.readyState !== "loading") {
			resolve();
		} else {
			document.addEventListener("DOMContentLoaded", resolve, { once: true });
		}
	});
}

/**
 * Scroll lock utilities
 */
let scrollY = 0;

export function lockScroll() {
	scrollY = window.scrollY;
	document.body.style.position = "fixed";
	document.body.style.top = `-${scrollY}px`;
	document.body.style.width = "100%";
}

export function unlockScroll() {
	document.body.style.position = "";
	document.body.style.top = "";
	document.body.style.width = "";
	window.scrollTo(0, scrollY);
}
