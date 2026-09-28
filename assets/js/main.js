/**
 * @file main.js
 * @description Application entry point
 *
 * Initializes the single-page portfolio, components, and services.
 */

import { getHeaderTemplate, initHeader } from "./components/header.js";
import { initModals } from "./components/modal.js";
import { getProfileTemplate } from "./components/profile.js";
import { ready } from "./core/dom.js";
import { getContactTemplate, initContact } from "./pages/contact.js";
import { getGalleryTemplate, initGallery } from "./pages/gallery.js";
import { getHireTemplate, initHire } from "./pages/hire.js";
import { getLinksTemplate, initLinks } from "./pages/links.js";
import { getPortfolioTemplate, initPortfolio } from "./pages/portfolio.js";
import { getQuotesTemplate, initQuotes } from "./pages/quotes.js";
import { initAuth, updateAdminUi } from "./services/auth.js";
import { initFirebase } from "./services/firebase.js";

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

	// Render every public section once so navigation can use page anchors.
	app.innerHTML = `
    ${getHeaderTemplate()}
    ${getProfileTemplate()}
    <main class="max singlePage" id="mainContent">
      <div class="singlePageSection" id="portfolio" data-section="portfolio">
        ${getPortfolioTemplate()}
      </div>
      <div class="singlePageSection" id="gallery" data-section="gallery">
        ${getGalleryTemplate()}
      </div>
      <div class="singlePageSection" id="services" data-section="services">
        ${getHireTemplate()}
      </div>
      <div class="singlePageSection" id="quotes" data-section="quotes">
        ${getQuotesTemplate()}
      </div>
      <div class="singlePageSection" id="contact" data-section="contact">
        ${getContactTemplate()}
      </div>
      <div class="singlePageSection" id="links" data-section="links">
        ${getLinksTemplate()}
      </div>
    </main>
    <footer>© <span id="year">${new Date().getFullYear()}</span> Joe Rice. All rights reserved.</footer>
    ${getLoginModalTemplate()}
    ${getPortfolioModalTemplate()}
  `;

	// Initialize core systems
	initHeader();
	initModals();
	initAuth();
	initPortfolio();
	initGallery();
	initHire();
	initQuotes();
	initContact();
	initLinks();
	updateAdminUi();

	// Mark page as loaded
	requestAnimationFrame(() => {
		document.body.classList.add("loaded");
	});
}

// Initialize when DOM is ready
ready().then(initApp);
