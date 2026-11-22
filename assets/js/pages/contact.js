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

const quoteTerms = `
      <section id="quoteTerms" aria-labelledby="quoteTermsHeading">
        <h3 id="quoteTermsHeading">What can we build in a week?</h3>
        <p>We’ll agree on one usable outcome and what it will take to deliver it. The five-business-day build starts on the date in the quote once we have the agreed scope, content, access and approvals.</p>
        <p>For a website or app, I’ll hand over the live system, set up the agreed integrations, and check that someone can do the main thing they came to do. You’ll have the access and instructions to own and update the work. The quote spells out how much follow-up for questions and fixes is included.</p>
        <p>I’ll review your request, follow up with questions about scope and timing, and quote a price once we agree on the work.</p>
      </section>`;

const confirmationCopy = `I’ll review what you need and follow up by email. Once we work out the scope, I can put together a price and timeline for you to consider.`;

export function getContactTemplate({ sheet = false } = {}) {
	return `
    <section class="contact" id="contactSection" aria-labelledby="contactHeading">
      <div id="quoteInquiry">
      <h2 id="contactHeading">${sheet ? "Request a quote" : "Tell me what you need help with"}</h2>
      ${
				sheet
					? `<p class="contactIntro">Tell me what you’re trying to accomplish. A rough idea or a problem you want to solve is enough to start.</p>
          <p class="contactIntro">I’ll review what you need and follow up so we can see if a one-week build fits.</p>`
					: `<p class="contactIntro">Have a project in mind, a problem to sort out, or something you'd like to learn? Tell me what you're trying to accomplish so we can figure out the next step. You don't need to know which service fits.</p>
          <p class="contactIntro">I'll review your request, follow up with any questions, and put together a quote once the scope is clear.</p>`
			}
      <form id="contactForm" novalidate>
        <label for="quoteName">Name (required)</label>
        <input id="quoteName" type="text" name="name" autocomplete="name" aria-describedby="nameError" required/>
        <small class="contactFieldError" id="nameError" hidden></small>
        <label for="quoteEmail">Email (required)</label>
        <input id="quoteEmail" type="email" name="email" autocomplete="email" aria-describedby="emailError" required/>
        <small class="contactFieldError" id="emailError" hidden></small>
        <label for="quotePhone">Phone <span class="optionalField">(optional)</span></label>
        <input id="quotePhone" type="tel" name="phone" autocomplete="tel" aria-describedby="phoneHelp"/>
        <small class="formHelp" id="phoneHelp">Include a number if you're comfortable being contacted by phone.</small>
        <label for="quoteMessage">What do you need help with? (required)</label>
        <textarea id="quoteMessage" name="message" aria-describedby="messageHelp messageError" required></textarea>
        <small class="contactFieldError" id="messageError" hidden></small>
        <small class="formHelp" id="messageHelp">Share what you'd like to accomplish and what's getting in the way. If you have a timeline or budget in mind, you can include it. A rough idea is enough to start.</small>
        ${
					sheet
						? `<div id="contactServicePicker"></div>`
						: `<details class="contactServiceChoices">
            <summary>Choose services if you know what you need <span class="optionalField">(optional)</span></summary>
            <div id="contactServicePicker"></div>
          </details>`
				}
        <div class="selectedServices" id="selectedServices" aria-live="polite" hidden></div>
        <div role="alert" aria-atomic="true"><p class="contactError" id="contactError" hidden></p></div>
        <p id="contactStatus" role="status" aria-atomic="true"></p>
        <button type="submit">Request a quote</button>
      </form>
      ${sheet ? quoteTerms : ""}
      </div>
      ${
				sheet
					? `<div id="quoteConfirmation" hidden>
        <h3 id="quoteSuccessHeading" tabindex="-1">Thanks for your request</h3>
        <p role="status">${confirmationCopy}</p>
        <button id="restartQuote" type="button">Start a new request</button>
      </div>`
					: ""
			}
    </section>
    ${
			sheet
				? ""
				: `<aside class="serviceSelectionBanner" id="serviceSelectionBanner" aria-label="Selected services" hidden>
      <span id="serviceSelectionCount" role="status" aria-live="polite"></span>
      <button type="button" id="jumpToContact">Request a quote</button>
    </aside>
    <div class="modal" id="contactModal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="quoteSuccessHeading">
      <div class="modalContent">
        <h3 id="quoteSuccessHeading">Thanks for your request</h3>
        <p>${confirmationCopy}</p>
        <button class="quoteSuccessClose" id="closeContactModal" type="button">Close</button>
      </div>
    </div>`
		}
  `;
}

function renderContactServicePicker() {
	const picker = $("#contactServicePicker");
	if (!picker) return;
	const legendClass = picker.closest("details") ? ' class="sr-only"' : "";
	picker.innerHTML = `<fieldset class="contactServiceList"><legend${legendClass}>Services (optional)</legend>${getServices()
		.filter((service) => service.available)
		.map(
			(service) =>
				`<label><input class="contactServiceSelect" type="checkbox" value="${sanitizeText(service.id)}"/> <span>${sanitizeText(service.title)}</span></label>`,
		)
		.join("")}</fieldset>`;
	picker.firstElementChild.disabled = contactForm.querySelector(
		'button[type="submit"]',
	).disabled;
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
	document.body.classList.toggle(
		"hasServiceSelection",
		Boolean(banner && selections.length),
	);
	const count = $("#serviceSelectionCount");
	if (count)
		count.textContent = `${selections.length} service${selections.length === 1 ? "" : "s"} selected`;
	const container = $("#selectedServices");
	if (!container) return;
	container.hidden = !banner || selections.length === 0;
	container.innerHTML = selections
		.map(
			({ title }) =>
				`<div class="selectedServiceAttachment"><span>${sanitizeText(title)}</span><input type="hidden" name="services" value="${sanitizeText(title)}"/></div>`,
		)
		.join("");
}

const requiredFields = {
	name: "Enter your name.",
	email: "Enter a valid email address.",
	message: "Describe what you need help with.",
};

function updateFieldError(form, input) {
	const message =
		input.value.trim() && input.validity.valid
			? ""
			: requiredFields[input.name];
	const error = form.querySelector(`#${input.name}Error`);
	error.textContent = message;
	error.hidden = !message;
	if (message) input.setAttribute("aria-invalid", "true");
	else input.removeAttribute("aria-invalid");
	return Boolean(message);
}

function showFormError(form, message) {
	const error = form.querySelector("#contactError");
	error.hidden = !message;
	error.textContent = message;
}

async function getCaptchaToken() {
	const script = document.querySelector(
		'script[src^="https://www.google.com/recaptcha/api.js?"]',
	);
	if (!script) return null;

	const siteKey = new URL(script.src).searchParams.get("render");
	const captcha = window.grecaptcha;
	if (!siteKey || !captcha) throw new Error("CAPTCHA unavailable");

	let timeout;
	try {
		const token = await Promise.race([
			new Promise((resolve, reject) => {
				const execute = () =>
					Promise.resolve()
						.then(() => captcha.execute(siteKey, { action: "submit" }))
						.then(resolve, reject);
				if (typeof captcha.ready === "function") captcha.ready(execute);
				else execute();
			}),
			new Promise((_, reject) => {
				timeout = window.setTimeout(
					() => reject(new Error("CAPTCHA timed out")),
					10000,
				);
			}),
		]);
		if (typeof token !== "string" || !token.trim()) {
			throw new Error("CAPTCHA returned no token");
		}
		return token;
	} finally {
		window.clearTimeout(timeout);
	}
}

function setSending(form, submitBtn, sending) {
	for (const control of form.querySelectorAll(
		"input:not([type=hidden]):not([type=checkbox]), textarea, fieldset",
	)) {
		control.disabled = sending;
	}
	submitBtn.disabled = sending;
	submitBtn.textContent = sending ? "Sending request…" : "Request a quote";
	form.querySelector("#contactStatus").textContent = sending
		? "Sending request…"
		: "";
}

function acceptRequest(form) {
	if (!form.isConnected) return;
	form.reset();
	clearSelectedServices();
	const section = form.closest(".contact");
	const confirmation = section.querySelector("#quoteConfirmation");
	if (!confirmation) {
		openModal("contactModal");
		return;
	}
	section.querySelector("#quoteInquiry").hidden = true;
	confirmation.hidden = false;
	if (section.closest("dialog")?.open) {
		confirmation.querySelector("#quoteSuccessHeading").focus();
	}
}

async function handleSubmit(event) {
	event.preventDefault();
	const form = event.currentTarget;
	const submitBtn = form.querySelector('button[type="submit"]');
	if (submitBtn.disabled || form.closest("[hidden]")) return;

	const invalid = Object.keys(requiredFields)
		.map((name) => form.elements.namedItem(name))
		.filter((input) => updateFieldError(form, input));
	showFormError(form, "");
	if (invalid.length) {
		showFormError(form, "Check the highlighted fields and try again.");
		invalid[0].focus();
		return;
	}

	const data = new FormData(form);
	setSending(form, submitBtn, true);
	let failure;

	try {
		try {
			const token = await getCaptchaToken();
			if (token) data.set("g-recaptcha-response", token);
		} catch {
			failure =
				"The spam check couldn’t verify your request. Your information is still here. Try again.";
			return;
		}
		const response = await fetch("https://formspree.io/f/xovqpvdv", {
			method: "POST",
			body: data,
			headers: { Accept: "application/json" },
		});
		if (response.status === 429) {
			failure =
				"There have been too many requests. Your information is still here. Wait a moment, then try again.";
		} else if (!response.ok) {
			failure =
				"Your request couldn’t be sent. Your information is still here. Try again.";
		}
	} catch {
		failure =
			"I couldn’t confirm that your request went through. Your information is still here. Try again.";
	} finally {
		setSending(form, submitBtn, false);
		if (failure) {
			showFormError(form, failure);
			submitBtn.textContent = "Try again";
		}
	}
	if (!failure) acceptRequest(form);
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
			addListener(contactForm, "input", (event) => {
				const input = event.target;
				if (input.getAttribute("aria-invalid") === "true") {
					updateFieldError(event.currentTarget, input);
				}
			}),
		);
		cleanupFns.push(
			addListener(contactForm, "change", (event) => {
				if (event.target.matches(".contactServiceSelect"))
					selectService(event.target.value, event.target.checked);
			}),
		);
	}
	cleanupFns.push(
		addListener($("#restartQuote"), "click", (event) => {
			event.target.closest("#quoteConfirmation").hidden = true;
			$("#quoteInquiry").hidden = false;
			$("#quoteName").focus();
		}),
	);
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
