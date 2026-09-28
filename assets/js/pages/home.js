/**
 * @file pages/home.js
 * @description Home page module
 *
 * The profile photo, social links, and landing description are rendered
 * by the persistent profile component in the app shell.  This page has
 * navigation cards to other sections.
 */

import { createNavCard } from "../components/card.js";
import { $ } from "../core/dom.js";
import { navigate } from "../core/router.js";

/**
 * Navigation cards data configuration
 */
const navCards = [
	{
		title: "Portfolio",
		description: "Posts, notes, and projects from my work and learning.",
		highlights: ["Technical articles", "Project showcases", "Learning notes"],
		route: "/portfolio",
		ariaLabel: "Navigate to Portfolio section",
	},
	{
		title: "Gallery",
		description: "A curated collection of photos and images.",
		highlights: ["Photography", "Design inspiration", "Visual stories"],
		route: "/gallery",
		ariaLabel: "Navigate to Gallery section",
	},
	{
		title: "Hire",
		description: "Services I offer for individuals and small teams.",
		highlights: ["Web development", "IT services", "Consulting"],
		route: "/hire",
		ariaLabel: "Navigate to Hire section",
	},
	{
		title: "Quotes",
		description: "Inspiring quotes that have shaped my thinking.",
		highlights: ["Wisdom", "Philosophy", "Motivation"],
		route: "/quotes",
		ariaLabel: "Navigate to Quotes section",
	},
	{
		title: "Contact",
		description: "Get in touch via the contact form.",
		highlights: ["Quick response", "Collaboration", "Questions welcome"],
		route: "/contact",
		ariaLabel: "Navigate to Contact section",
	},
	{
		title: "Links",
		description: "Resources and bookmarks I return to regularly.",
		highlights: [
			"Curated resources",
			"Tools & references",
			"Learning materials",
		],
		route: "/links",
		ariaLabel: "Navigate to Links section",
	},
];

/**
 * Render home page content
 */
export function renderHome() {
	const mainContent = $("#mainContent");
	if (!mainContent) return;

	const navCardsHtml = navCards.map((card) => createNavCard(card)).join("");

	mainContent.innerHTML = `
    <section class="navSection">
      <div class="sectionHeader">
        <h2>Explore</h2>
        <span class="servicesNote">Tap or click a card to see more, then tap again to visit.</span>
      </div>
      <div class="serviceGrid">
        ${navCardsHtml}
      </div>
    </section>
  `;

	initHome();
}

/**
 * Initialize home page - attach click handlers to nav cards
 */
export function initHome() {
	const navCards = document.querySelectorAll(".navCard");
	navCards.forEach((card) => {
		const checkbox = card.querySelector(".serviceToggle");
		if (checkbox) {
			// Initialize state
			card.dataset.wasFlipped = "false";

			// Capture the checked state at the start of interaction
			const captureState = () => {
				card.dataset.wasFlipped = checkbox.checked ? "true" : "false";
			};

			card.addEventListener("mousedown", captureState, { passive: true });
			card.addEventListener("touchstart", captureState, { passive: true });

			// Handle navigation on click - only if it was already flipped
			card.addEventListener("click", (e) => {
				const wasFlipped = card.dataset.wasFlipped === "true";
				if (wasFlipped) {
					const route = card.dataset.route;
					if (route) {
						e.preventDefault();
						e.stopPropagation();
						navigate(route);
					}
				}
			});
		}
	});
}

/**
 * Clean up home page
 */
export function destroyHome() {
	// Event listeners will be cleaned up when the page is re-rendered
}
