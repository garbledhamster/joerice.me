/**
 * @file components/header.js
 * @description Site header component with navigation
 *
 * Renders the fixed header with anchor navigation and scroll-aware state.
 */

import { $, $$, addListener } from "../core/dom.js";
import { getState, subscribe } from "../core/state.js";

let menuToggle = null;
let mainNav = null;
let sectionScrollFrame = null;
let cleanupFns = [];

/**
 * Navigation items configuration
 * Each item maps to a section or special action.
 */
const navItems = [
	{ label: "About", section: "about" },
	{ label: "Portfolio", section: "portfolio" },
	{ label: "Gallery", section: "gallery" },
	{ label: "Services", section: "services" },
	{ label: "Quotes", section: "quotes" },
	{ label: "Contact", section: "contact" },
	{ label: "Links", section: "links" },
	{
		label: "Login",
		route: null,
		id: "loginButton",
		action: "login",
		className: "navButton",
	},
];

/**
 * Get the HTML template for the header
 * @returns {string} Header HTML
 */
export function getHeaderTemplate() {
	const navLinksHtml = navItems
		.map((item) => {
			const className = item.className ? ` class="${item.className}"` : "";
			const id = item.id ? ` id="${item.id}"` : "";

			if (item.section) {
				return `<a href="#${item.section}"${className}${id} data-section="${item.section}">${item.label}</a>`;
			} else if (item.action === "login") {
				return `<a href="#loginModal"${className}${id}>${item.label}</a>`;
			}
			return "";
		})
		.join("");

	return `
    <header class="siteHeader">
      <div class="brand"><a href="#about">joerice.me</a></div>
      <button class="menuToggle" aria-label="Menu"><span></span><span></span><span></span></button>
      <nav id="mainNav">
        ${navLinksHtml}
      </nav>
    </header>
  `;
}

/**
 * Update navigation active states based on the visible section.
 * @param {string} sectionId - Active section ID
 */
function updateActiveNav(sectionId) {
	const navLinks = $$("[data-section]", mainNav);

	navLinks.forEach((link) => {
		const isActive = link.dataset.section === sectionId;
		link.classList.toggle("active", isActive);
		if (isActive) {
			link.setAttribute("aria-current", "true");
		} else {
			link.removeAttribute("aria-current");
		}
	});
}

/**
 * Track page sections and highlight the anchor nearest the sticky header.
 */
function initSectionObserver() {
	const sections = $$(".singlePageSection[data-section]");
	if (!sections.length) {
		updateActiveNav("about");
		return;
	}

	const updateFromScroll = () => {
		sectionScrollFrame = null;
		const pageBottom = window.scrollY + window.innerHeight;
		const documentBottom = document.documentElement.scrollHeight;

		if (pageBottom >= documentBottom - 2) {
			updateActiveNav(sections.at(-1).dataset.section);
			return;
		}

		const headerHeight = Number.parseFloat(
			getComputedStyle(document.documentElement).getPropertyValue("--header-h"),
		);
		const headerMarker = (Number.isNaN(headerHeight) ? 0 : headerHeight) + 24;
		const marker = Math.max(
			headerMarker,
			Math.min(window.innerHeight * 0.25, 220),
		);
		let activeSection = sections[0];

		for (const section of sections) {
			if (section.getBoundingClientRect().top > marker) break;
			activeSection = section;
		}

		updateActiveNav(activeSection.dataset.section);
	};

	const scheduleUpdate = () => {
		if (sectionScrollFrame !== null) return;
		sectionScrollFrame = requestAnimationFrame(updateFromScroll);
	};

	cleanupFns.push(addListener(window, "scroll", scheduleUpdate));
	updateActiveNav(window.location.hash.slice(1) || "about");
}

/**
 * Update login button text based on admin state
 */
function updateLoginButton() {
	const loginButton = $("#loginButton");
	if (loginButton) {
		const isAdmin = getState("isAdmin");
		loginButton.textContent = isAdmin ? "Admin" : "Login";
	}
}

/**
 * Close the mobile menu after an anchor is selected.
 * @param {Event} e - Click event
 */
function handleNavClick(e) {
	const link = e.target.closest("[data-section]");
	if (link) {
		updateActiveNav(link.dataset.section);
		closeMenu();
	}
}

/**
 * Toggle mobile menu open/closed
 */
function toggleMenu() {
	if (mainNav) {
		mainNav.classList.toggle("open");
	}
}

/**
 * Close mobile menu
 */
function closeMenu() {
	if (mainNav) {
		mainNav.classList.remove("open");
	}
}

/**
 * Update header height CSS variable
 */
function updateHeaderHeight() {
	const header = $(".siteHeader");
	if (!header) return;
	const height = header.offsetHeight;
	document.documentElement.style.setProperty("--header-h", `${height}px`);
}

/**
 * Initialize header component
 * Sets up event listeners and initial state
 */
export function initHeader() {
	menuToggle = $(".menuToggle");
	mainNav = $("#mainNav");

	if (!menuToggle || !mainNav) {
		console.warn("Header elements not found");
		return;
	}

	// Set up event listeners
	cleanupFns.push(addListener(menuToggle, "click", toggleMenu));
	cleanupFns.push(addListener(mainNav, "click", handleNavClick));

	// Update header height on resize
	updateHeaderHeight();
	cleanupFns.push(
		addListener(window, "resize", () => {
			updateHeaderHeight();
			window.dispatchEvent(new Event("scroll"));
		}),
	);

	initSectionObserver();

	// Listen for auth state changes
	cleanupFns.push(subscribe("isAdmin", updateLoginButton));

	// Initial state
	updateLoginButton();
}

/**
 * Clean up header component
 */
export function destroyHeader() {
	cleanupFns.forEach((fn) => {
		fn();
	});
	cleanupFns = [];
	if (sectionScrollFrame !== null) cancelAnimationFrame(sectionScrollFrame);
	sectionScrollFrame = null;
	menuToggle = null;
	mainNav = null;
}
