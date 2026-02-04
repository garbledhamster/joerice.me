/**
 * @file services/sanitize.js
 * @description Sanitization utilities for user-generated content
 *
 * Uses DOMPurify to prevent XSS attacks and provides
 * safe text/HTML/URL sanitization functions
 */

/**
 * Get DOMPurify instance
 * @returns {Object|null} DOMPurify instance or null if not available
 */
function getDOMPurify() {
	return window.DOMPurify || null;
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} html - HTML string to sanitize
 * @param {Object} options - DOMPurify configuration options
 * @returns {string} Sanitized HTML string
 */
export function sanitizeHtml(html, options = {}) {
	const purify = getDOMPurify();

	if (!purify) {
		console.warn("DOMPurify not available. Content will not be sanitized.");
		return sanitizeText(String(html || ""));
	}

	const defaultOptions = {
		ALLOWED_TAGS: [
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6",
			"p",
			"br",
			"hr",
			"strong",
			"b",
			"em",
			"i",
			"u",
			"s",
			"del",
			"ins",
			"mark",
			"small",
			"a",
			"img",
			"ul",
			"ol",
			"li",
			"blockquote",
			"pre",
			"code",
			"table",
			"thead",
			"tbody",
			"tr",
			"th",
			"td",
			"div",
			"span",
		],
		ALLOWED_ATTR: [
			"href",
			"title",
			"target",
			"rel",
			"src",
			"alt",
			"width",
			"height",
			"class",
			"id",
		],
		ALLOW_DATA_ATTR: false,
		ADD_ATTR: ["target"],
		SANITIZE_NAMED_PROPS: true,
		RETURN_TRUSTED_TYPE: false,
	};

	const config = { ...defaultOptions, ...options };

	// Add security attributes to external links
	purify.addHook("afterSanitizeAttributes", (node) => {
		if (node.tagName === "A") {
			const href = node.getAttribute("href");
			if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
				const currentRel = node.getAttribute("rel") || "";
				const relParts = currentRel.split(" ").filter(Boolean);
				if (!relParts.includes("noopener")) relParts.push("noopener");
				if (!relParts.includes("noreferrer")) relParts.push("noreferrer");
				node.setAttribute("rel", relParts.join(" "));
				if (!node.getAttribute("target")) {
					node.setAttribute("target", "_blank");
				}
			}
		}
	});

	const sanitized = purify.sanitize(html, config);
	purify.removeHook("afterSanitizeAttributes");

	return sanitized;
}

/**
 * Sanitize plain text to prevent HTML/script injection
 * Escapes HTML entities
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text with HTML entities escaped
 */
export function sanitizeText(text) {
	if (typeof text !== "string") {
		return "";
	}

	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#x27;")
		.replace(/\//g, "&#x2F;");
}

/**
 * Sanitize markdown content before rendering
 * @param {string} markdown - Markdown content to sanitize
 * @returns {string} Sanitized HTML from markdown
 */
export function sanitizeMarkdown(markdown) {
	if (typeof window.marked?.parse !== "function") {
		console.warn("Marked.js not available. Returning sanitized text.");
		return sanitizeText(markdown);
	}

	const html = window.marked.parse(markdown);
	return sanitizeHtml(html);
}

/**
 * Validate and sanitize input length
 * @param {string} input - Input to validate
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Truncated input
 */
export function validateLength(input, maxLength = 10000) {
	const text = String(input || "");
	if (text.length > maxLength) {
		console.warn(
			`Input exceeds maximum length of ${maxLength} characters. Truncating.`,
		);
		return text.substring(0, maxLength);
	}
	return text;
}

/**
 * Sanitize a URL to prevent javascript: and data: URL attacks
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url) {
	if (typeof url !== "string") {
		return "";
	}

	const trimmed = url.trim();
	const lower = trimmed.toLowerCase();

	// Block dangerous protocols
	if (
		lower.startsWith("javascript:") ||
		lower.startsWith("data:") ||
		lower.startsWith("vbscript:") ||
		lower.startsWith("file:")
	) {
		console.warn("Blocked potentially dangerous URL:", url);
		return "";
	}

	// Allow safe URL patterns
	if (
		trimmed.startsWith("/") ||
		trimmed.startsWith("./") ||
		trimmed.startsWith("../") ||
		lower.startsWith("http://") ||
		lower.startsWith("https://") ||
		lower.startsWith("mailto:") ||
		lower.startsWith("#")
	) {
		return trimmed;
	}

	console.warn("URL does not match safe patterns:", url);
	return "";
}
