import { $, addListener } from "../core/dom.js";
import { sanitizeText } from "../services/sanitize.js";

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

let cleanupFns = [];
const selectedScreens = products.map(() => 0);

function imagePath(screen) {
	return `assets/images/projects/${screen.image}`;
}

function screenCaption(screen) {
	return (
		"<strong>" +
		sanitizeText(screen.title) +
		"</strong><span>" +
		sanitizeText(screen.caption) +
		"</span>"
	);
}

function chevron(direction) {
	return (
		'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="' +
		(direction < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7") +
		'"/></svg>'
	);
}

export function getProductsTemplate() {
	const first = products[0].screens[0];
	return (
		'<section class="services productsGroup productGallery" id="productsSection" aria-labelledby="productsHeading">' +
		'<div class="productGalleryHeader"><h2 id="productsHeading">Books and tools</h2><label class="productProjectLabel" for="productProjectPicker">Choose a project<select id="productProjectPicker">' +
		products
			.map(
				(product, index) =>
					'<option value="' +
					index +
					'">' +
					sanitizeText(product.title) +
					"</option>",
			)
			.join("") +
		'</select></label></div><p class="portfolioIntro">These are my own projects for learning, reflection, and everyday life. I shape the purpose and experience, with AI helping me develop the software and content.</p>' +
		'<figure class="productGalleryFigure"><a class="productGalleryViewport" href="' +
		imagePath(first) +
		'" target="_blank" rel="noopener noreferrer" aria-label="View the selected example full size (opens in a new tab)"><img class="productMainImage" src="' +
		imagePath(first) +
		'" width="' +
		(first.width || 1280) +
		'" height="' +
		(first.height || 720) +
		'" loading="lazy" decoding="async" alt="' +
		sanitizeText(first.alt) +
		'"><span class="productEnlargeHint">View full size</span><span class="productImageStatus" role="status" hidden></span></a>' +
		'<div class="productGalleryCaptionRow"><figcaption class="productCaptionStack"><span class="productCaptionLive">' +
		screenCaption(first) +
		"</span>" +
		products
			.flatMap((product) => product.screens)
			.map(
				(screen) =>
					'<span class="productCaptionReserve" aria-hidden="true" inert>' +
					screenCaption(screen) +
					"</span>",
			)
			.join("") +
		'</figcaption><div class="productGalleryNavigation" role="group" aria-label="Browse examples"><button type="button" class="productGalleryArrow" data-product-direction="-1" aria-label="Previous example">' +
		chevron(-1) +
		'</button><span class="productSampleCount" aria-hidden="true">1 of 4</span><button type="button" class="productGalleryArrow" data-product-direction="1" aria-label="Next example">' +
		chevron(1) +
		"</button></div></div></figure>" +
		'<div class="productThumbnailStack">' +
		products
			.map(
				(product, index) =>
					'<nav class="productThumbnailPanel' +
					(index === 0 ? " is-active" : "") +
					'" data-product-panel="' +
					index +
					'" aria-label="' +
					sanitizeText(product.title) +
					' examples" aria-hidden="' +
					(index !== 0) +
					'"' +
					(index !== 0 ? " inert" : "") +
					">" +
					product.screens
						.map(
							(screen, shot) =>
								'<button type="button" class="productThumbnail" data-product-shot="' +
								shot +
								'" aria-pressed="' +
								(shot === 0) +
								'"><img src="' +
								imagePath(screen) +
								'" width="' +
								(screen.width || 1280) +
								'" height="' +
								(screen.height || 720) +
								'" loading="lazy" decoding="async" alt=""><span>' +
								sanitizeText(screen.title) +
								"</span></button>",
						)
						.join("") +
					"</nav>",
			)
			.join("") +
		"</div>" +
		'<div class="productDetailsStack">' +
		products
			.map(
				(product, index) =>
					'<article class="productDetailsPanel' +
					(index === 0 ? " is-active" : "") +
					'" data-product-panel="' +
					index +
					'" aria-hidden="' +
					(index !== 0) +
					'"' +
					(index !== 0 ? " inert" : "") +
					"><h3>" +
					sanitizeText(product.title) +
					'</h3><p class="productDescription">' +
					sanitizeText(product.description) +
					'</p><p class="productServiceConnection"><strong>What I can help build</strong>' +
					sanitizeText(product.service) +
					'</p><div class="productGalleryActions"><a class="productQuoteLink" href="#contact">Request something like this</a><a class="productVisitLink" href="' +
					product.url +
					'" target="_blank" rel="noopener noreferrer">' +
					sanitizeText(product.linkText) +
					'<span class="productVisitDomain">' +
					product.domain +
					'</span><span class="sr-only"> (opens in a new tab)</span></a></div></article>',
			)
			.join("") +
		'</div><p class="sr-only" id="productSelectionStatus" role="status" aria-live="polite" aria-atomic="true"></p></section>'
	);
}

export function initProducts() {
	destroyProducts();
	const section = $("#productsSection");
	const picker = $("#productProjectPicker", section || document);
	if (!section || !picker) return;
	let project = Number(picker.value) || 0;
	const frame = $(".productGalleryViewport", section);
	const status = $(".productImageStatus", section);

	const renderSelection = (announce = true) => {
		const product = products[project];
		const shot = selectedScreens[project];
		const screen = product.screens[shot];
		section.querySelectorAll("[data-product-panel]").forEach((panel) => {
			const active = Number(panel.dataset.productPanel) === project;
			panel.classList.toggle("is-active", active);
			panel.inert = !active;
			panel.setAttribute("aria-hidden", String(!active));
		});
		section.querySelectorAll(".productThumbnailPanel").forEach((panel) => {
			panel.querySelectorAll("[data-product-shot]").forEach((button) => {
				button.setAttribute(
					"aria-pressed",
					String(
						Number(button.dataset.productShot) ===
							selectedScreens[Number(panel.dataset.productPanel)],
					),
				);
			});
		});
		$(".productCaptionLive", section).innerHTML = screenCaption(screen);
		$(".productSampleCount", section).textContent =
			`${shot + 1} of ${product.screens.length}`;
		if (announce)
			$("#productSelectionStatus", section).textContent =
				product.title +
				": " +
				screen.title +
				", " +
				(shot + 1) +
				" of " +
				product.screens.length;
		frame.href = imagePath(screen);
		frame.setAttribute(
			"aria-label",
			"View " +
				product.title +
				": " +
				screen.title +
				" full size (opens in a new tab)",
		);

		const image = document.createElement("img");
		image.className = "productMainImage";
		image.alt = screen.alt;
		image.width = screen.width || 1280;
		image.height = screen.height || 720;
		image.decoding = "async";
		image.loading = announce ? "eager" : "lazy";
		const current = () => image === $(".productMainImage", section);
		const loaded = () => {
			if (!current()) return;
			status.hidden = true;
			status.textContent = "";
			image.hidden = false;
		};
		const failed = () => {
			if (!current()) return;
			image.hidden = true;
			status.hidden = false;
			status.textContent =
				"This screenshot could not load. Try another example or open the image.";
		};
		image.addEventListener("load", loaded);
		image.addEventListener("error", failed);
		status.hidden = false;
		status.textContent = "Loading screenshot…";
		$(".productMainImage", section).replaceWith(image);
		image.src = imagePath(screen);
		if (image.complete && image.naturalWidth) loaded();
	};
	const changeShot = (shot) => {
		const count = products[project].screens.length;
		selectedScreens[project] = (shot + count) % count;
		renderSelection();
	};
	cleanupFns.push(
		addListener(picker, "change", () => {
			const next = Number(picker.value);
			if (!Number.isInteger(next) || !products[next]) return;
			project = next;
			renderSelection();
		}),
	);
	cleanupFns.push(
		addListener(section, "click", (event) => {
			const button = event.target.closest("button");
			if (!button || button.closest("[inert]")) return;
			if (button.dataset.productShot !== undefined) {
				const shot = Number(button.dataset.productShot);
				if (Number.isInteger(shot) && products[project].screens[shot])
					changeShot(shot);
			}
			if (button.dataset.productDirection)
				changeShot(
					selectedScreens[project] + Number(button.dataset.productDirection),
				);
		}),
	);
	cleanupFns.push(
		addListener(section, "keydown", (event) => {
			if (
				!event.target.closest(".productThumbnailPanel") ||
				!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
			)
				return;
			event.preventDefault();
			const count = products[project].screens.length;
			const focusedShot = Number(
				event.target.closest("[data-product-shot]")?.dataset.productShot ??
					selectedScreens[project],
			);
			const shot =
				event.key === "Home"
					? 0
					: event.key === "End"
						? count - 1
						: focusedShot + (event.key === "ArrowLeft" ? -1 : 1);
			changeShot(shot);
			section
				.querySelector(
					'.productThumbnailPanel.is-active [data-product-shot="' +
						selectedScreens[project] +
						'"]',
				)
				.focus({ preventScroll: true });
		}),
	);
	renderSelection(false);
}

export function destroyProducts() {
	cleanupFns.forEach((cleanup) => {
		cleanup();
	});
	cleanupFns = [];
}
