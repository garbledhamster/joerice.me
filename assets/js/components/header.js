/**
 * @file components/header.js
 * @description Site header component with navigation
 *
 * Renders the fixed header with brand logo and navigation links
 * Handles mobile menu toggle and active nav state
 */

import { $, $$, addListener } from "../core/dom.js";
import { getCurrentRoute, navigate, onRouteChange } from "../core/router.js";
import { getState, subscribe } from "../core/state.js";

let menuToggle = null;
let mainNav = null;
let cleanupFns = [];

/**
 * Navigation items configuration
 * Each item maps to a route or special action
 */
const navItems = [
	{ label: "Home", route: "/home" },
	{ label: "Portfolio", route: "/portfolio" },
	{ label: "Gallery", route: "/gallery" },
	{ label: "Hire Me", route: "/hire" },
	{ label: "Quotes", route: "/quotes" },
	{ label: "Contact", route: "/contact" },
	{ label: "Links", route: "/links" },
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

			if (item.route) {
				return `<a href="#${item.route}"${className}${id} data-route="${item.route}">${item.label}</a>`;
			} else if (item.action === "login") {
				return `<a href="#loginModal"${className}${id}>${item.label}</a>`;
			}
			return "";
		})
		.join("");

	return `
    <header class="siteHeader">
      <div class="brand"><a href="#/home">joerice.me</a></div>
      <button class="menuToggle" aria-label="Menu"><span></span><span></span><span></span></button>
      <nav id="mainNav">
        ${navLinksHtml}
      </nav>
    </header>
  `;
}

/**
 * Update navigation active states based on current route
 */
function updateActiveNav() {
	const currentRoute = getCurrentRoute();
	const navLinks = $$("[data-route]", mainNav);

	navLinks.forEach((link) => {
		const isActive = link.dataset.route === currentRoute;
		link.classList.toggle("active", isActive);
		if (isActive) {
			link.setAttribute("aria-current", "page");
		} else {
			link.removeAttribute("aria-current");
		}
	});
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
 * Handle navigation link clicks
 * @param {Event} e - Click event
 */
function handleNavClick(e) {
	const link = e.target.closest("[data-route]");
	if (link) {
		e.preventDefault();
		const route = link.dataset.route;
		navigate(route);
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
	cleanupFns.push(addListener(window, "resize", updateHeaderHeight));

	// Listen for route changes
	cleanupFns.push(onRouteChange(updateActiveNav));

	// Listen for auth state changes
	cleanupFns.push(subscribe("isAdmin", updateLoginButton));

	// Initial state
	updateActiveNav();
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
	menuToggle = null;
	mainNav = null;
}
