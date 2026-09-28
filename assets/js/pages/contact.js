/**
 * @file pages/contact.js
 * @description Contact page module
 *
 * Displays contact form with Formspree integration
 */

import { closeModal, openModal } from "../components/modal.js";
import { $, addListener } from "../core/dom.js";

let contactForm = null;
let cleanupFns = [];

/**
 * Get contact page HTML template
 * @returns {string} Contact page HTML
 */
export function getContactTemplate() {
	return `
    <section class="contact" id="contactSection">
      <h2>Contact</h2>
      <form id="contactForm">
        <label>Name<input type="text" name="name" required/></label>
        <label>Email<input type="email" name="email" required/></label>
        <label>Contact Type
          <select name="project" required>
            <option value="">Select an option...</option>
            <option>Personal Website</option>
            <option>Professional Website</option>
            <option>Recruiter</option>
            <option>Friend</option>
            <option>Family</option>
            <option>Training/Coaching</option>
            <option>Other</option>
          </select>
        </label>
        <label>Message<textarea name="message" required></textarea></label>
        <button type="submit">Send</button>
      </form>
    </section>
    <div class="modal" id="contactModal">
      <div class="modalContent">
        <p>Thank you! Your message has been sent.</p>
        <button id="closeContactModal" style="margin-top:1rem; border:1px solid var(--border); padding:.5rem 1rem; background:var(--yellow); font-family:var(--fontHead); cursor:pointer;">close</button>
      </div>
    </div>
  `;
}

/**
 * Handle form submission
 * @param {Event} e - Submit event
 */
async function handleSubmit(e) {
	e.preventDefault();

	const form = e.target;
	const submitBtn = form.querySelector('button[type="submit"]');
	const fd = new FormData(form);

	// Disable submit button
	if (submitBtn) {
		submitBtn.disabled = true;
		submitBtn.textContent = "Sending...";
	}

	try {
		// Get reCAPTCHA token if available
		if (window.grecaptcha?.execute) {
			const token = await window.grecaptcha.execute(
				"6LcYpE4sAAAAALOW_7HWe81eUCnFkGFu-e8dAW_S",
				{ action: "submit" },
			);
			fd.append("g-recaptcha-response", token);
		}

		await fetch("https://formspree.io/f/xovqpvdv", {
			method: "POST",
			body: fd,
			headers: { Accept: "application/json" },
		});

		// Reset form and show success
		form.reset();
		openModal("contactModal");
	} catch (error) {
		console.error("Form submission error:", error);
		alert("Unable to send message. Please try again.");
	} finally {
		// Re-enable submit button
		if (submitBtn) {
			submitBtn.disabled = false;
			submitBtn.textContent = "Send";
		}
	}
}

/**
 * Render contact page
 */
export function renderContact() {
	const mainContent = $("#mainContent");
	if (!mainContent) return;

	mainContent.innerHTML = getContactTemplate();
	initContact();
}

/**
 * Initialize contact page
 */
export function initContact() {
	contactForm = $("#contactForm");

	if (contactForm) {
		cleanupFns.push(addListener(contactForm, "submit", handleSubmit));
	}

	// Close modal button
	const closeBtn = $("#closeContactModal");
	if (closeBtn) {
		cleanupFns.push(
			addListener(closeBtn, "click", () => closeModal("contactModal")),
		);
	}

	// Modal backdrop click
	const modal = $("#contactModal");
	if (modal) {
		cleanupFns.push(
			addListener(modal, "click", (e) => {
				if (e.target === modal) closeModal("contactModal");
			}),
		);
	}
}

/**
 * Clean up contact page
 */
export function destroyContact() {
	cleanupFns.forEach((fn) => {
		fn();
	});
	cleanupFns = [];
	contactForm = null;
}
