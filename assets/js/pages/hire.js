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

const serviceGroups = [
	{
		id: "online",
		title: "Build something online",
		description:
			"A website, an interactive tool, or a visual identity for what you're making.",
		ids: ["web-site", "web-app", "logo-design"],
	},
	{
		id: "tools",
		title: "Make your tools and information easier to use",
		description:
			"Help with technology, scattered information, and learning how AI can fit your work.",
		ids: ["it-services", "knowledge-mgmt", "ai-coaching"],
	},
	{
		id: "experience",
		title: "Explain what you bring to the work",
		description: "Put your experience into words people can understand.",
		ids: ["resume-writing"],
	},
];

function cards() {
	const services = getServices().filter(
		(service) => service.available || isAdminUser(),
	);
	const knownIds = new Set(serviceGroups.flatMap((group) => group.ids));
	const groups = [
		...serviceGroups,
		{
			id: "other",
			title: "Other ways I can help",
			description: "",
			ids: services
				.filter((service) => !knownIds.has(service.id))
				.map((service) => service.id),
		},
	];
	return groups
		.map((group) => {
			const members = services.filter((service) =>
				group.ids.includes(service.id),
			);
			if (!members.length) return "";
			return `<section class="servicePurposeGroup" aria-labelledby="service-group-${group.id}"><h3 id="service-group-${group.id}">${group.title}</h3>${group.description ? `<p class="serviceGroupIntro">${group.description}</p>` : ""}<div class="serviceGrid">${members.map((service) => `<div class="serviceItem">${createServiceCard(service)}${isAdminUser() ? `<button class="editBtn serviceEditButton" type="button" data-service-id="${sanitizeText(service.id)}" aria-label="Edit ${sanitizeText(service.title)}">Edit service${service.available ? "" : " (unavailable)"}</button>` : ""}</div>`).join("")}</div></section>`;
		})
		.join("");
}

export function getHireTemplate() {
	return `<section class="services" id="servicesSection" aria-labelledby="servicesHeading">
      <div class="sectionHeader"><h2 id="servicesHeading">How I can help</h2><button class="editBtn" id="addServiceButton" type="button" data-admin-only hidden>Add service</button></div>
      <p class="servicesIntro">You might have a project in mind or need help sorting out a problem. We can use these services as starting points so we can talk about what would help and work out a scope that fits your project.</p>
      <p class="servicesNote">Read the details or browse related posts to learn more. Select any services that interest you, or use the form and explain what you need.</p>
      <p id="servicesStatus" role="status" hidden></p>
      <div id="serviceEditorHost"></div>
      <div id="serviceGroups">${cards()}</div>
      <div class="quoteProcess">
        <h3>How we get started</h3>
        <ol class="quoteSteps">
          <li><h4>Tell me what you're trying to do</h4><p>Share your idea, the problem, or what you'd like to learn. A rough description is enough to start.</p></li>
          <li><h4>We'll work out what's needed</h4><p>I'll review your request and follow up with questions so we can understand the scope.</p></li>
          <li><h4>Get a quote for the work</h4><p>Once the scope is clear, I'll prepare a quote so you can decide whether you'd like to go ahead.</p></li>
        </ol>
        <a class="quoteLink" href="#contact">Tell me what you need</a>
      </div>
    </section>`;
}

export function getProductsTemplate() {
	const products = [
		{
			title: "The Manual for Feelings and Needs",
			description:
				"Find words for what you feel and what matters to you. The website explains the manual, lets you look through a real sample, and helps you choose between paperback and PDF.",
			service:
				"A product website that connects your work, useful content, and buying options so people can decide whether it fits.",
			url: "https://feelings.ourstuff.space/",
			domain: "feelings.ourstuff.space",
			linkText: "Explore the manual",
			screens: [
				{
					image: "feelings-home-2026-10-12.jpg",
					title: "The manual",
					width: 1265,
					height: 712,
					alt: "Feelings and Needs product website introducing the manual, its sample, and format choices.",
					caption: "Understand the book before choosing a format.",
				},
				{
					image: "feelings-sample-2026-10-12.jpg",
					title: "Look inside",
					width: 1265,
					height: 712,
					alt: "Sample pages from the manual with feeling and need definitions and a strategy for turning a reaction into words.",
					caption: "Read sample definitions and a practical strategy.",
				},
				{
					image: "feelings-stories-index-2026-10-12.jpg",
					title: "Illustrated stories",
					width: 1492,
					height: 712,
					alt: "Stories index with an illustrated birthday preview and Read More link.",
					caption: "Browse a story preview and open the full article.",
				},
				{
					image: "feelings-book-formats-2026-10-12.jpg",
					title: "Formats and free companion",
					width: 1215,
					height: 395,
					alt: "Shop cards for paperback, PDF, bundle and free companion.",
					caption: "Choose a format or begin with the free companion.",
				},
			],
		},
		{
			title: "The Classics",
			description:
				"Find classic works through search and ideas, follow a ten-year reading plan, and keep notes connected to what you read.",
			service:
				"A web app that makes a large collection easier to browse and connects information to a practical plan.",
			url: "https://classics.ourstuff.space/",
			domain: "classics.ourstuff.space",
			linkText: "Try The Classics",
			screens: [
				{
					image: "classics-library-2026-10-12.jpg",
					title: "Reading collection",
					alt: "The Classics public library showing search controls and a collection of classic works.",
					caption: "A public view of the searchable reading collection.",
				},
				{
					image: "classics-plan-2026-10-12.jpg",
					title: "Ten-year reading plan",
					alt: "The Classics reading plan with year and idea filters, works by Plato and Aristophanes, and reading progress controls.",
					caption: "Browse each year's works and track reading progress.",
				},
				{
					image: "classics-republic-tools-2026-10-12.jpg",
					title: "Inside a book entry",
					width: 1280,
					height: 720,
					alt: "Republic entry with idea tags, reading-plan links and research resources.",
					caption:
						"Follow a book from its library entry into reading and research resources.",
				},
				{
					image: "classics-justice-idea-map-2026-10-12.jpg",
					title: "Explore an idea",
					width: 1280,
					height: 720,
					alt: "Justice glossary map linking Great Ideas and related books.",
					caption: "Move from a glossary term to related ideas and works.",
				},
			],
		},
		{
			title: "Ourstuff.space",
			description:
				"Start with Mind, Body, Spirit, or Life to check in, capture thoughts, and work with goals. Calendar and other tools keep related activities within reach.",
			service:
				"A dashboard that brings related tasks and information together so people know where to start.",
			url: "https://ourstuff.space/",
			domain: "ourstuff.space",
			linkText: "Try Ourstuff.space",
			screens: [
				{
					image: "ourstuff-dashboard-2026-10-12.jpg",
					title: "Everyday dashboard",
					alt: "Ourstuff public dashboard with Mind, Body, Spirit, and Life check-in paths.",
					caption: "One starting place for related parts of everyday life.",
				},
				{
					image: "ourstuff-calendar-2026-10-12.jpg",
					title: "Calendar",
					alt: "Ourstuff Life calendar with month, week, day, and list views, alongside todo, project, and note tools.",
					caption: "See the calendar alongside tasks, projects, and notes.",
				},
				{
					image: "ourstuff-daily-return-guidance-2026-10-12.jpg",
					title: "Daily Return guidance",
					width: 1280,
					height: 720,
					alt: "Guidance for choosing Mind, Body, Spirit or Life.",
					caption: "Read the prompts for choosing a check-in path.",
				},
				{
					image: "ourstuff-focus-timer-2026-10-12.jpg",
					title: "Focus timer",
					width: 1280,
					height: 720,
					alt: "Unstarted focus timer with duration presets and alarm controls.",
					caption: "Choose a duration and alarm for a focused session.",
				},
			],
		},
		{
			title: "Fast Track",
			description:
				"Choose a duration and start a fasting timer. Nutrition, history, and notes sit alongside it so you can keep related information in one place.",
			service:
				"A focused web app with a timer, duration controls, and related tracking tools that are easy to find.",
			url: "https://fasttrack.ourstuff.space/",
			domain: "fasttrack.ourstuff.space",
			linkText: "Open Fast Track",
			screens: [
				{
					image: "fasttrack-timer-detail-2026-10-12.jpg",
					title: "Timer and duration choices",
					width: 660,
					height: 838,
					alt: "Fast Track signed-in timer at rest, with duration choices and Start Fast control.",
					caption: "See elapsed time and choose a duration before starting.",
				},
				{
					image: "fasttrack-duration-detail-2026-10-12.jpg",
					title: "Preview a duration",
					width: 500,
					height: 113,
					alt: "An eight-hour duration preview with Close and Use this fast type controls.",
					caption: "Preview a duration before applying it.",
				},
				{
					image: "fasttrack-meal-entry-2026-10-12.jpg",
					title: "Meal and nutrition notes",
					width: 420,
					height: 712,
					alt: "A blank meal-note editor with calorie, macronutrient, and mineral fields.",
					caption:
						"Write a meal note and enter the nutrition listed on a food label.",
				},
				{
					image: "fasttrack-history-detail-2026-10-12.jpg",
					title: "Calendar and history",
					width: 660,
					height: 712,
					alt: "Fast Track history calendar with daily progress, notes and recent fasts controls.",
					caption: "Browse dates and reach daily notes or recent fasts.",
				},
			],
		},
	];
	return `<section class="services productsGroup" id="productsSection" aria-labelledby="productsHeading">
        <h2 id="productsHeading">Books and tools</h2>
        <p class="portfolioIntro">These are my own projects for learning, reflection, and everyday life. I shape the purpose and experience, with AI helping me develop the software and content.</p>
        <p class="projectGalleryHint">Take a look through the screens to see how each project works. Select any screenshot to open it full size.</p>
        <ul class="productList">
          ${products
						.map(
							(product) => `<li class="productItem projectRow projectShowcase">
            ${renderProductScreen(product.screens[0], product.title, "projectPreview")}
            <div class="projectContent">
              <h3>${product.title}</h3>
              <p>${product.description}</p>
              <p class="projectService"><strong>What I can help build:</strong> ${product.service}</p>
              <a class="productLink" href="${product.url}" target="_blank" rel="noopener noreferrer">${product.linkText}<span class="productDomain">${product.domain}</span><span class="sr-only"> (opens in a new tab)</span></a>
            </div>${
							product.screens.length > 1
								? `<ul class="projectScreenshotGallery${product.screens[0].width < product.screens[0].height ? " projectPortraitGallery" : ""}">${product.screens
										.slice(1)
										.map(
											(screen) =>
												`<li>${renderProductScreen(screen, product.title, "projectFeaturePreview")}</li>`,
										)
										.join("")}</ul>`
								: ""
						}
          </li>`,
						)
						.join("")}
        </ul>
      </section>`;
}

function renderProductScreen(screen, productTitle, className) {
	return `<figure class="${className}${screen.width > screen.height * 2 ? " projectWideScreenshot" : ""}">
    <a class="projectImageLink" href="assets/images/projects/${screen.image}" target="_blank" rel="noopener noreferrer" aria-label="View ${sanitizeText(productTitle)}: ${sanitizeText(screen.title)} full-size screenshot (opens in a new tab)">
      <img src="assets/images/projects/${screen.image}" width="${screen.width || 1280}" height="${screen.height || 720}" loading="lazy" decoding="async" alt="${sanitizeText(screen.alt)}">
    </a>
    <figcaption><strong class="projectShotTitle">${sanitizeText(screen.title)}</strong><span>${sanitizeText(screen.caption)}</span></figcaption>
  </figure>`;
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
					? "Added to your request"
					: "Add to my quote request";
			}
		});
}

function renderCards() {
	const grid = $("#serviceGroups");
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
