/**
 * @file components/card.js
 * @description Reusable card components
 *
 * Provides templates for various card types used throughout the site
 * including service cards (with flip), entry cards, and info cards
 */

import { sanitizeText } from "../services/sanitize.js";

/**
 * Create a service card with flip animation
 * @param {Object} options - Card options
 * @param {string} options.title - Card title
 * @param {string} options.description - Front description
 * @param {string[]} options.highlights - Back highlights list
 * @param {string} options.ariaLabel - Aria label for accessibility
 * @returns {string} Service card HTML
 */
export function createServiceCard({
	title,
	description,
	highlights = [],
	ariaLabel,
}) {
	const safeTitle = sanitizeText(title);
	const safeDesc = sanitizeText(description);
	const safeAriaLabel = sanitizeText(ariaLabel || `Flip ${title} card`);

	const highlightsList = highlights
		.map((h) => `<li>${sanitizeText(h)}</li>`)
		.join("");

	return `
    <label class="serviceCard">
      <input class="serviceToggle" type="checkbox" aria-label="${safeAriaLabel}"/>
      <span class="serviceCardInner">
        <span class="serviceCardFace serviceCardFront">
          <h3>${safeTitle}</h3>
          <p>${safeDesc}</p>
          <span class="serviceCardHint">Tap to flip</span>
        </span>
        <span class="serviceCardFace serviceCardBack">
          <h3>Highlights</h3>
          <ul>
            ${highlightsList}
          </ul>
        </span>
      </span>
    </label>
  `;
}

/**
 * Create a navigation card with flip animation and link
 * @param {Object} options - Card options
 * @param {string} options.title - Card title
 * @param {string} options.description - Front description
 * @param {string[]} options.highlights - Back highlights list
 * @param {string} options.route - Route to navigate to (e.g., '/portfolio')
 * @param {string} options.ariaLabel - Aria label for accessibility
 * @returns {string} Navigation card HTML
 */
export function createNavCard({
	title,
	description,
	highlights = [],
	route,
	ariaLabel,
}) {
	const safeTitle = sanitizeText(title);
	const safeDesc = sanitizeText(description);
	const safeRoute = sanitizeText(route);
	const safeAriaLabel = sanitizeText(ariaLabel || `Navigate to ${title}`);

	const highlightsList = highlights
		.map((h) => `<li>${sanitizeText(h)}</li>`)
		.join("");

	return `
    <label class="serviceCard navCard" data-route="${safeRoute}">
      <input class="serviceToggle" type="checkbox" aria-label="${safeAriaLabel}"/>
      <span class="serviceCardInner">
        <span class="serviceCardFace serviceCardFront">
          <h3>${safeTitle}</h3>
          <p>${safeDesc}</p>
          <span class="serviceCardHint">Tap to flip</span>
        </span>
        <span class="serviceCardFace serviceCardBack">
          <h3>Quick View</h3>
          <ul>
            ${highlightsList}
          </ul>
          <span class="serviceCardHint">Tap to visit</span>
        </span>
      </span>
    </label>
  `;
}

/**
 * Create a grid of service cards
 * @param {Object[]} services - Array of service data
 * @returns {string} Service grid HTML
 */
export function createServiceGrid(services) {
	const cards = services.map((service) => createServiceCard(service)).join("");
	return `<div class="serviceGrid">${cards}</div>`;
}

/**
 * Create an entry card (for portfolio items)
 * @param {Object} options - Entry options
 * @param {string} options.title - Entry title
 * @param {string} options.url - Entry URL/ID
 * @param {string[]} options.tags - Entry tags
 * @param {string} options.source - Data source (firestore, local, yaml)
 * @param {string} options.id - Entry ID
 * @param {boolean} options.published - Whether entry is published
 * @returns {string} Entry card HTML
 */
export function createEntryCard({
	title,
	url,
	tags = [],
	source,
	id,
	published = true,
}) {
	const safeTitle = sanitizeText(title);
	const safeTags = tags.map((t) => sanitizeText(t)).join("|");
	const safeUrl = sanitizeText(url);
	const sourceAttr = source ? ` data-source="${sanitizeText(source)}"` : "";
	const idAttr = id ? ` data-id="${sanitizeText(id)}"` : "";
	const publishedAttr =
		published !== undefined ? ` data-published="${published}"` : "";
	const draftIndicator = published === false ? " [DRAFT]" : "";

	return `<a class="entry" data-tags="${safeTags}" data-url="${safeUrl}"${sourceAttr}${idAttr}${publishedAttr}>${safeTitle}${draftIndicator}</a>`;
}

/**
 * Create a grid of entry cards
 * @param {Object[]} entries - Array of entry data
 * @returns {string} Entry grid HTML
 */
export function createEntryGrid(entries) {
	const cards = entries.map((entry) => createEntryCard(entry)).join("");
	return cards;
}

/**
 * Create an info card (simple card with title and content)
 * @param {Object} options - Card options
 * @param {string} options.title - Card title
 * @param {string} options.content - Card content
 * @param {string} options.className - Additional CSS class
 * @returns {string} Info card HTML
 */
export function createInfoCard({ title, content, className = "" }) {
	const safeTitle = sanitizeText(title);

	return `
    <div class="infoCard ${className}">
      <h3>${safeTitle}</h3>
      <div class="infoCardContent">${content}</div>
    </div>
  `;
}

/**
 * Create a link card
 * @param {Object} options - Link options
 * @param {string} options.title - Link title
 * @param {string} options.url - Link URL
 * @param {string} options.description - Link description
 * @returns {string} Link card HTML
 */
export function createLinkCard({ title, url, description }) {
	const safeTitle = sanitizeText(title);
	const safeUrl = sanitizeText(url);
	const safeDesc = description ? sanitizeText(description) : "";

	return `
    <a class="linkCard" href="${safeUrl}" target="_blank" rel="noopener">
      <span class="linkCardTitle">${safeTitle}</span>
      ${safeDesc ? `<span class="linkCardDesc">${safeDesc}</span>` : ""}
    </a>
  `;
}
