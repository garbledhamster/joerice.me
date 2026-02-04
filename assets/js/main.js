/**
 * @file main.js
 * @description Application entry point
 *
 * Initializes the SPA router, components, and services
 * This is the main orchestrator for the modular architecture
 */

import { getHeaderTemplate, initHeader } from "./components/header.js";
import { initModals } from "./components/modal.js";
import {
	getProfileTemplate,
	updateProfileDescription,
} from "./components/profile.js";
import { ready } from "./core/dom.js";
import {
	initRouter,
	onRouteChange,
	registerRoutes,
	setDefaultRoute,
} from "./core/router.js";
import { destroyContact, renderContact } from "./pages/contact.js";
import { destroyGallery, renderGallery } from "./pages/gallery.js";
import { destroyHire, renderHire } from "./pages/hire.js";
// Page modules
import { destroyHome, renderHome } from "./pages/home.js";
import { destroyLinks, renderLinks } from "./pages/links.js";
import { destroyPortfolio, renderPortfolio } from "./pages/portfolio.js";
import { destroyQuotes, renderQuotes } from "./pages/quotes.js";
import { initAuth, updateAdminUi } from "./services/auth.js";
import { initFirebase } from "./services/firebase.js";

/**
 * Page cleanup functions map
 * Used to clean up previous page before rendering new one
 */
const _pageCleanup = {
	"/home": destroyHome,
	"/portfolio": destroyPortfolio,
	"/gallery": destroyGallery,
	"/hire": destroyHire,
	"/quotes": destroyQuotes,
	"/contact": destroyContact,
	"/links": destroyLinks,
};

let currentPageCleanup = null;

/**
 * Create a page renderer with cleanup
 * @param {Function} renderFn - Page render function
 * @param {Function} cleanupFn - Page cleanup function
 * @returns {Function} Wrapped render function
 */
function createPageRenderer(renderFn, cleanupFn) {
	return () => {
		// Clean up previous page
		if (currentPageCleanup) {
			currentPageCleanup();
		}

		// Render new page
		renderFn();

		// Store cleanup for next navigation
		currentPageCleanup = cleanupFn;

		// Scroll to top
		window.scrollTo(0, 0);
	};
}

/**
 * Route configuration
 * Maps route paths to render functions
 */
const routes = {
	"/home": createPageRenderer(renderHome, destroyHome),
	"/portfolio": createPageRenderer(renderPortfolio, destroyPortfolio),
	"/gallery": createPageRenderer(renderGallery, destroyGallery),
	"/hire": createPageRenderer(renderHire, destroyHire),
	"/quotes": createPageRenderer(renderQuotes, destroyQuotes),
	"/contact": createPageRenderer(renderContact, destroyContact),
	"/links": createPageRenderer(renderLinks, destroyLinks),
};

/**
 * Get the login modal template
 * @returns {string} Login modal HTML
 */
function getLoginModalTemplate() {
	return `
    <div class="modal loginModal" id="loginModal" aria-hidden="true" role="dialog" aria-modal="true">
      <div class="modalContent">
        <h3>Admin login</h3>
        <p>Enter your email to receive a sign-in link.</p>
        <form id="loginForm">
          <label for="loginEmail">Email</label>
          <input id="loginEmail" type="email" autocomplete="email" required/>
          <div class="loginActions">
            <button class="loginSendButton" type="submit">Send login link</button>
            <a class="loginCancelButton" id="loginCancel" href="#" role="button">Cancel</a>
          </div>
        </form>
        <label class="loginFieldCheckbox" data-admin-only hidden>
          <input id="showGithubContent" type="checkbox" checked/>
          <span>Show GitHub Content</span>
        </label>
        <button class="loginLogoutButton" id="loginLogoutButton" type="button" data-admin-only hidden>Logout</button>
        <p class="loginStatus" id="loginStatus" role="status" aria-live="polite"></p>
      </div>
    </div>
  `;
}

/**
 * Get the portfolio editor modal template
 * @returns {string} Portfolio modal HTML
 */
function getPortfolioModalTemplate() {
	return `
    <div class="modal portfolioModal" id="portfolioModal" aria-hidden="true" role="dialog" aria-modal="true">
      <div class="modalContent">
        <div class="portfolioModalHeader">
          <h3 id="portfolioModalTitle">Add Post</h3>
          <button class="portfolioCloseButton" id="portfolioCloseButton" type="button">Close</button>
        </div>
        <label class="portfolioField">Title
          <input id="portfolioPostTitle" type="text" placeholder="Post title"/>
        </label>
        <label class="portfolioField portfolioBodyField">Post
          <textarea id="portfolioPostBody" placeholder="Write your post here"></textarea>
        </label>
        <label class="portfolioFieldCheckbox">
          <input id="portfolioPostPublished" type="checkbox" checked/>
          <span>Published</span>
        </label>
        <label class="portfolioFieldCheckbox">
          <input id="portfolioPostPinned" type="checkbox"/>
          <span>Pinned</span>
        </label>
        <div class="portfolioActions">
          <button class="portfolioSaveButton" id="portfolioSaveButton" type="button">Save</button>
          <button class="portfolioDeleteButton" id="portfolioDeleteButton" type="button">Delete</button>
        </div>
        <p class="portfolioEditorStatus" id="portfolioEditorStatus" role="status" aria-live="polite"></p>
      </div>
    </div>
  `;
}

/**
 * Initialize the application
 */
async function initApp() {
	// Initialize Firebase first
	initFirebase();

	// Get app container
	const app = document.getElementById("app");
	if (!app) {
		console.error("App container not found");
		return;
	}

	// Render app shell (header + profile + main content area + footer + modals)
	app.innerHTML = `
    ${getHeaderTemplate()}
    ${getProfileTemplate()}
    <main class="max" id="mainContent"></main>
    <footer>© <span id="year">${new Date().getFullYear()}</span> Joe Rice. All rights reserved.</footer>
    ${getLoginModalTemplate()}
    ${getPortfolioModalTemplate()}
  `;

	// Initialize core systems
	initHeader();
	initModals();
	initAuth();

	// Register routes and initialize router
	registerRoutes(routes);
	setDefaultRoute("/home");
	initRouter();

	// Update admin UI and profile description on route change
	onRouteChange((route) => {
		updateAdminUi();
		updateProfileDescription(route);
	});

	// Mark page as loaded
	requestAnimationFrame(() => {
		document.body.classList.add("loaded");
	});
}

// Initialize when DOM is ready
ready().then(initApp);
