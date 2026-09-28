import { createServiceCard } from "../components/card.js";
import { $, addListener } from "../core/dom.js";
import {
	ensureAdmin,
	isAdminUser,
	onAuthStateChange,
} from "../services/auth.js";
import {
	getSelectedServices,
	getServices,
	loadServices,
	saveService,
	selectService,
} from "../services/catalog.js";
import { sanitizeText } from "../services/sanitize.js";
import { getRelatedPosts } from "./portfolio.js";

let cleanupFns = [];

function syncCardFlip(card) {
	const flipped = card.querySelector(".serviceToggle").checked;
	card.classList.toggle("is-flipped", flipped);
	card.querySelector(".serviceCardBack").inert = !flipped;
	card.querySelector(".serviceCardFront").inert = flipped;
}

function renderRelatedPosts(card) {
	const { status, posts } = getRelatedPosts(card.dataset.serviceId);
	const panel = card.querySelector(".servicePosts");
	panel.innerHTML =
		status === "loading"
			? "<p>Loading posts…</p>"
			: status === "error"
				? "<p>Posts could not load. Use Refresh posts in Portfolio to try again.</p>"
				: posts.length
					? `<ul>${posts.map((post) => `<li><button class="servicePostLink" type="button" data-post-url="${sanitizeText(post.url)}">${sanitizeText(post.title)}</button></li>`).join("")}</ul>`
					: "<p>No published posts for this service yet.</p>";
}

function showRelatedPosts(card, show) {
	card.classList.toggle("show-related-posts", show);
	card.querySelector(".serviceDetails").hidden = show;
	card.querySelector(".servicePosts").hidden = !show;
	const button = card.querySelector(".servicePostsToggle");
	button.setAttribute("aria-pressed", String(show));
	card
		.querySelector(".serviceDetailsButton")
		.setAttribute("aria-pressed", String(!show));
	button.setAttribute("aria-expanded", String(show));
	if (show) renderRelatedPosts(card);
}

function cards() {
	return getServices()
		.filter((service) => service.available || isAdminUser())
		.map(
			(service) =>
				`<div class="serviceItem">${createServiceCard(service)}${isAdminUser() ? `<button class="editBtn serviceEditButton" type="button" data-service-id="${sanitizeText(service.id)}" aria-label="Edit ${sanitizeText(service.title)}">Edit service${service.available ? "" : " (unavailable)"}</button>` : ""}</div>`,
		)
		.join("");
}

export function getHireTemplate() {
	return `<section class="services" id="servicesSection">
      <div class="sectionHeader"><h2>Services</h2><button class="editBtn" id="addServiceButton" type="button" data-admin-only hidden>Add service</button></div>
      <p class="servicesNote">Explore a service, browse related work, then select what you need.</p>
      <p id="servicesStatus" role="status" hidden></p>
      <div id="serviceEditorHost"></div>
      <div class="serviceGrid">${cards()}</div>
    </section>`;
}

function syncSelections() {
	const ids = new Set(getSelectedServices().map((service) => service.id));
	document
		.querySelectorAll(".serviceSelect, .relatedServiceSelect")
		.forEach((input) => {
			input.checked = ids.has(input.value);
			if (input.matches(".serviceSelect")) {
				input
					.closest(".serviceCard")
					.classList.toggle("is-selected", input.checked);
				input.nextElementSibling.textContent = input.checked
					? "Service selected"
					: "Select this service";
			}
		});
}

function renderCards() {
	const grid = $("#servicesSection .serviceGrid");
	if (!grid) return;
	const flipped = new Set(
		Array.from(
			grid.querySelectorAll(".serviceToggle:checked"),
			(input) => input.id,
		),
	);
	const related = new Set(
		Array.from(
			grid.querySelectorAll(".show-related-posts"),
			(card) => card.dataset.serviceId,
		),
	);
	grid.innerHTML = cards();
	grid.querySelectorAll(".serviceToggle").forEach((input) => {
		input.checked = flipped.has(input.id);
		const card = input.closest(".serviceCard");
		syncCardFlip(card);
		showRelatedPosts(card, related.has(card.dataset.serviceId));
	});
	syncSelections();
}

function editService(id) {
	if (!ensureAdmin("edit service")) return;
	const service = getServices().find((item) => item.id === id);
	const host = $("#serviceEditorHost");
	host.innerHTML = `<form class="serviceEditor" data-id="${sanitizeText(service?.id || "")}">
      <h3>${service ? "Edit service" : "Add service"}</h3>
      <label>Service name<input name="title" required maxlength="100" value="${sanitizeText(service?.title || "")}"></label>
      <label>Description<textarea name="description" required>${sanitizeText(service?.description || "")}</textarea></label>
      <label>Highlights (one per line)<textarea name="highlights">${sanitizeText(service?.highlights.join("\n") || "")}</textarea></label>
      <label class="serviceAvailable"><input name="available" type="checkbox"${service?.available !== false ? " checked" : ""}> Available to select</label>
      <div class="editorControls"><button type="button" class="serviceCancelButton">Cancel</button><button type="submit" class="saveBtn">Save service</button></div>
      <p role="status" aria-live="polite"></p>
    </form>`;
	host.scrollIntoView({ behavior: "smooth", block: "start" });
	$("input", host)?.focus({ preventScroll: true });
}

export function renderHire() {
	const main = $("#mainContent");
	if (!main) return;
	main.innerHTML = getHireTemplate();
	initHire();
}

export function initHire() {
	const section = $("#servicesSection");
	if (!section) return;
	cleanupFns.push(
		addListener(section, "change", (event) => {
			if (event.target.matches(".serviceToggle"))
				syncCardFlip(event.target.closest(".serviceCard"));
			if (event.target.matches(".serviceSelect"))
				selectService(event.target.value, event.target.checked);
		}),
	);
	cleanupFns.push(
		addListener(section, "click", (event) => {
			const card = event.target.closest(".serviceCard");
			if (event.target.closest(".servicePostsToggle")) {
				showRelatedPosts(card, true);
				return;
			}
			if (event.target.closest(".serviceDetailsButton")) {
				showRelatedPosts(card, false);
				return;
			}
			const postLink = event.target.closest(".servicePostLink");
			if (postLink) {
				window.dispatchEvent(
					new CustomEvent("open-related-post", {
						detail: { url: postLink.dataset.postUrl },
					}),
				);
				return;
			}
			if (
				event.target.closest(".serviceCardFront, .serviceCloseButton") ||
				event.target.matches(".serviceCardFlip")
			) {
				const toggle = card.querySelector(".serviceToggle");
				toggle.checked = !toggle.checked;
				syncCardFlip(card);
				card
					.querySelector(
						toggle.checked ? ".serviceCloseButton" : ".serviceOpenButton",
					)
					.focus({ preventScroll: true });
			}
			const edit = event.target.closest(".serviceEditButton");
			if (edit) editService(edit.dataset.serviceId);
			if (event.target.closest("#addServiceButton")) editService(null);
			if (event.target.closest(".serviceCancelButton"))
				$("#serviceEditorHost").replaceChildren();
		}),
	);
	cleanupFns.push(
		addListener(section, "submit", async (event) => {
			const form = event.target.closest(".serviceEditor");
			if (!form) return;
			event.preventDefault();
			const save = form.querySelector('[type="submit"]');
			if (save.disabled) return;
			save.disabled = true;
			const status = form.querySelector('[role="status"]');
			status.textContent = "Saving…";
			try {
				await saveService(form.dataset.id, {
					title: form.elements.title.value.trim(),
					description: form.elements.description.value.trim(),
					highlights: form.elements.highlights.value
						.split("\n")
						.map((line) => line.trim())
						.filter(Boolean),
					available: form.elements.available.checked,
				});
				if (form.isConnected) form.remove();
			} catch (error) {
				status.textContent = `Unable to save service. ${error.message} Your changes are still here; try again.`;
				save.disabled = false;
			}
		}),
	);
	cleanupFns.push(
		addListener(window, "service-selection-change", syncSelections),
	);
	cleanupFns.push(addListener(window, "service-catalog-change", renderCards));
	cleanupFns.push(
		addListener(window, "portfolio-posts-change", () => {
			section
				.querySelectorAll(".show-related-posts")
				.forEach(renderRelatedPosts);
		}),
	);
	cleanupFns.push(
		onAuthStateChange(async () => {
			renderCards();
			try {
				await loadServices();
				$("#servicesStatus").hidden = true;
			} catch (error) {
				const status = $("#servicesStatus");
				status.hidden = !isAdminUser();
				status.textContent = `Using default services. Firebase services could not load: ${error.message}`;
			}
		}),
	);
}

export function destroyHire() {
	cleanupFns.forEach((cleanup) => {
		cleanup();
	});
	cleanupFns = [];
}
