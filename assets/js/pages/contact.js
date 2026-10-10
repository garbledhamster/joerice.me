/**
 * @file pages/contact.js
 * @description Quote request form with Formspree delivery.
 */

import { closeModal, openModal } from "../components/modal.js";
import { $, addListener } from "../core/dom.js";
import {
	clearSelectedServices,
	getSelectedServices,
	getServices,
	selectService,
} from "../services/catalog.js";
import { sanitizeText } from "../services/sanitize.js";

let contactForm = null;
let cleanupFns = [];

export function getContactTemplate() {
	return `
    <section class="contact" id="contactSection" aria-labelledby="contactHeading">
      <h2 id="contactHeading">Tell me what you need help with</h2>
      <p class="contactIntro">Have a project in mind, a problem to sort out, or something you'd like to learn? Tell me what you're trying to accomplish so we can figure out the next step. You don't need to know which service fits.</p>
      <p class="contactIntro">I'll review your request, follow up with any questions, and put together a quote once the scope is clear.</p>
      <form id="contactForm">
        <p class="formHelp">Name, email, and a description are required. Phone and service choices are optional.</p>
        <label>Name<input type="text" name="name" autocomplete="name" required/></label>
        <label>Email<input type="email" name="email" autocomplete="email" required/></label>
        <label>Phone <span class="optionalField">(optional)</span><input type="tel" name="phone" autocomplete="tel" aria-describedby="phoneHelp"/></label>
        <small class="formHelp" id="phoneHelp">Include a number if you're comfortable being contacted by phone.</small>
        <label for="quoteMessage">What do you need help with?</label>
        <textarea id="quoteMessage" name="message" aria-describedby="messageHelp" required></textarea>
        <small class="formHelp" id="messageHelp">Share what you'd like to accomplish and what's getting in the way. If you have a timeline or budget in mind, you can include it. A rough idea is enough to start.</small>
        <details class="contactServiceChoices">
          <summary>Choose services if you know what you need <span class="optionalField">(optional)</span></summary>
          <div id="contactServicePicker"></div>
        </details>
        <div class="selectedServices" id="selectedServices" aria-live="polite" hidden></div>
        <p class="contactError" id="contactError" role="alert" hidden></p>
        <button type="submit">Request a quote</button>
      </form>
    </section>
    <aside class="serviceSelectionBanner" id="serviceSelectionBanner" aria-label="Selected services" hidden>
      <span id="serviceSelectionCount" role="status" aria-live="polite"></span>
      <button type="button" id="jumpToContact">Request a quote</button>
    </aside>
    <div class="modal" id="contactModal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="quoteSuccessHeading">
      <div class="modalContent">
        <h3 id="quoteSuccessHeading">Thanks for your request</h3>
        <p>I'll review what you need and follow up to clarify the scope so I can prepare a quote.</p>
        <button class="quoteSuccessClose" id="closeContactModal" type="button">Close</button>
      </div>
    </div>
  `;
}

function renderContactServicePicker() {
	const picker = $("#contactServicePicker");
	if (!picker) return;
	picker.innerHTML = `<fieldset class="contactServiceList"><legend class="sr-only">Services (optional)</legend>${getServices()
		.filter((service) => service.available)
		.map(
			(service) =>
				`<label><input class="contactServiceSelect" type="checkbox" value="${sanitizeText(service.id)}"/> <span>${sanitizeText(service.title)}</span></label>`,
		)
		.join("")}</fieldset>`;
	renderSelectedServices();
}

function renderSelectedServices() {
	const selections = getSelectedServices();
	const ids = new Set(selections.map((service) => service.id));
	document.querySelectorAll(".contactServiceSelect").forEach((input) => {
		input.checked = ids.has(input.value);
	});
	const banner = $("#serviceSelectionBanner");
	if (banner) banner.hidden = selections.length === 0;
	document.body.classList.toggle("hasServiceSelection", selections.length > 0);
	const count = $("#serviceSelectionCount");
	if (count)
		count.textContent = `${selections.length} service${selections.length === 1 ? "" : "s"} selected`;
	const container = $("#selectedServices");
	if (!container) return;
	container.hidden = selections.length === 0;
	container.innerHTML = selections
		.map(
			({ title }) =>
				`<div class="selectedServiceAttachment"><span>${sanitizeText(title)}</span><input type="hidden" name="services" value="${sanitizeText(title)}"/></div>`,
		)
		.join("");
}

async function handleSubmit(event) {
	event.preventDefault();
	const form = event.target;
	const submitBtn = form.querySelector('button[type="submit"]');
	if (submitBtn.disabled || !form.reportValidity()) return;
	const errorMessage = $("#contactError");
	errorMessage.hidden = true;
	const data = new FormData(form);
	submitBtn.disabled = true;
	submitBtn.textContent = "Sending request…";

	try {
		if (window.grecaptcha?.execute) {
			const token = await window.grecaptcha.execute(
				"6LcYpE4sAAAAALOW_7HWe81eUCnFkGFu-e8dAW_S",
				{ action: "submit" },
			);
			data.append("g-recaptcha-response", token);
		}
		const response = await fetch("https://formspree.io/f/xovqpvdv", {
			method: "POST",
			body: data,
			headers: { Accept: "application/json" },
		});
		if (!response.ok) throw new Error("Quote request could not be sent.");
		form.reset();
		clearSelectedServices();
		openModal("contactModal");
	} catch (error) {
		console.error("Quote request error:", error);
		errorMessage.textContent =
			"We couldn't send your request. Your information is still here so you can try again.";
		errorMessage.hidden = false;
	} finally {
		submitBtn.disabled = false;
		submitBtn.textContent = "Request a quote";
	}
}

export function renderContact() {
	const mainContent = $("#mainContent");
	if (!mainContent) return;
	mainContent.innerHTML = getContactTemplate();
	initContact();
}

export function initContact() {
	contactForm = $("#contactForm");
	cleanupFns.push(
		addListener($("#jumpToContact"), "click", () => {
			$("#contactSection")?.scrollIntoView({
				behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
					? "instant"
					: "smooth",
				block: "start",
			});
			contactForm
				?.querySelector('[name="name"]')
				?.focus({ preventScroll: true });
		}),
	);
	renderContactServicePicker();
	if (contactForm) {
		cleanupFns.push(addListener(contactForm, "submit", handleSubmit));
		cleanupFns.push(
			addListener(contactForm, "change", (event) => {
				if (event.target.matches(".contactServiceSelect"))
					selectService(event.target.value, event.target.checked);
			}),
		);
	}
	cleanupFns.push(
		addListener(window, "service-selection-change", renderSelectedServices),
	);
	cleanupFns.push(
		addListener(window, "service-catalog-change", renderContactServicePicker),
	);
	cleanupFns.push(
		addListener($("#closeContactModal"), "click", () =>
			closeModal("contactModal"),
		),
	);
	const modal = $("#contactModal");
	cleanupFns.push(
		addListener(modal, "click", (event) => {
			if (event.target === modal) closeModal("contactModal");
		}),
	);
}

export function destroyContact() {
	cleanupFns.forEach((cleanup) => {
		cleanup();
	});
	cleanupFns = [];
	contactForm = null;
}
