import {
	closeModal,
	getCurrentModal,
	initModals,
} from "../components/modal.js";
import { getSocialLinksTemplate } from "../components/profile.js";
import { createElement } from "../core/dom.js";
import { getContactTemplate, initContact } from "../pages/contact.js";
import { getGalleryTemplate, initGallery } from "../pages/gallery.js";
import { getHireTemplate, initHire } from "../pages/hire.js";
import { getLinksTemplate } from "../pages/links.js";
import { getPortfolioTemplate, initPortfolio } from "../pages/portfolio.js";
import { getProductsTemplate, initProducts } from "../pages/products.js";
import { getQuotesTemplate, initQuotes } from "../pages/quotes.js";
import {
	initAuth,
	isAdminUser,
	onAuthStateChange,
	updateAdminUi,
} from "../services/auth.js";
import {
	getServices,
	resetPublishedServiceVisibility,
	selectService,
} from "../services/catalog.js";
import { emptyFolderCatalog, loadPublishedFolder } from "./content-store.js";
import { employers, guide } from "./contents.js";
import { mountFolderEditor } from "./editor.js";
import { createNote } from "./notes.js";
import { startingCatalog } from "./starting-catalog.js";
import { folderTemplate } from "./template.js";

const titles = {
	hire: "Hire me",
	employers: "For employers",
	work: "Work & Notes",
	personal: "Personal",
	guide: "How to build an idea",
	products: "Books and tools",
	"edit-services": "Edit services",
	"edit-content": "Edit portfolio content",
};
const adminRoutes = new Set(["edit-services", "edit-content"]);
const legacyAddresses = {
	contact: { id: "hire" },
	portfolio: { id: "work" },
	blog: { id: "work" },
	services: { id: "build" },
	gallery: { id: "personal", anchor: "personal-photos" },
	quotes: { id: "personal", anchor: "quotesSection" },
	links: { id: "personal", anchor: "linksSection" },
};

function element(tag, attributes, text) {
	return createElement(tag, attributes, text === undefined ? [] : [text]);
}

export function mountWorkingFolder(root, templates) {
	const personal = `
		<div id="personal-photos">
			<img src="assets/images/pictures/profile.jpg" width="140" height="140" alt="Portrait of Joe Rice">
			${getGalleryTemplate()}
		</div>
		${getQuotesTemplate()}
		${getLinksTemplate()}
		<h2>Profiles</h2>
		${getSocialLinksTemplate({ labels: ["Instagram", "GitHub", "Etsy"] })}
		<a class="action" href="#hire" data-route="hire" data-feedback-entry>Send feedback or request an update</a>
	`;
	root.innerHTML = folderTemplate({
		...templates,
		quote: getContactTemplate({ sheet: true }),
		work:
			getPortfolioTemplate() +
			`<a class="action" href="#hire" data-route="hire">Ask about this work</a>`,
		products: getProductsTemplate(),
		services: getHireTemplate(),
		personal,
		employers,
		guide,
	});

	const motion = matchMedia("(prefers-reduced-motion: reduce)");
	const phone = matchMedia("(max-width: 720px)");
	const nav = root.querySelector(".categories");
	const picker = root.querySelector("#folder-category");
	const board = root.querySelector(".whiteboard");
	const track = root.querySelector(".track");
	const sheet = root.querySelector(".route-sheet");
	const heading = sheet.querySelector("#folder-sheet-title");
	const close = sheet.querySelector("[data-close]");
	const layers = new Map();
	const scrollPositions = new Map();
	const sheetPanels = Array.from(sheet.querySelectorAll("[data-sheet]"));
	const categoryIds = new Set(startingCatalog.map((category) => category.id));
	const copyNodes = new Map(
		["guide", "employers"].map((page) => [
			page,
			Array.from(root.querySelectorAll(`[data-folder-copy="${page}"]`)),
		]),
	);
	const originalCopy = new Map(
		Array.from(copyNodes, ([page, nodes]) => [
			page,
			nodes.map((node) => node.textContent.replace(/\s+/g, " ").trim()),
		]),
	);
	const openEditor = mountFolderEditor(
		root.querySelector('[data-sheet="edit-content"]'),
		{
			getCopy: (page) =>
				copyNodes
					.get(page)
					.map((node) => node.textContent.trim())
					.filter(Boolean)
					.join("\n\n"),
			refresh: refreshFolder,
		},
	);
	let contentVersion = 0;
	let renderedCatalog = "";
	let panels = [];
	let activeCategory = "about";
	let activeRoute;
	let opener;
	let closingSheet = false;
	let openerKey = 0;
	const routeOpeners = new Map();
	let scrollTimer;
	let ignoreScrollUntil = 0;
	let personalStarted = false;
	let productsStarted = false;

	function showPublishedCopy(copy = {}) {
		for (const [page, nodes] of copyNodes) {
			const paragraphs =
				copy[page]?.split(/\r?\n\s*\r?\n/) || originalCopy.get(page);
			nodes.forEach((node, index) => {
				const text =
					index === nodes.length - 1
						? paragraphs.slice(index).join("\n\n")
						: paragraphs[index];
				node.textContent = text || "";
				node.hidden = !text;
			});
		}
	}

	async function refreshFolder() {
		const version = ++contentVersion;
		try {
			const { catalog, copy } = await loadPublishedFolder();
			if (version !== contentVersion) return;
			renderCatalog(catalog);
			showPublishedCopy(copy);
			return true;
		} catch {
			if (version !== contentVersion) return;
			renderCatalog(emptyFolderCatalog);
			showPublishedCopy();
			return false;
		}
	}

	function renderCatalog(catalog) {
		const signature = JSON.stringify(catalog);
		if (signature === renderedCatalog) return;
		renderedCatalog = signature;
		for (const panel of panels)
			scrollPositions.set(panel.dataset.category, panel.scrollTop);
		panels = catalog.map((category) => {
			const panel = element("section", {
				className: "panel",
				"data-category": category.id,
				"aria-labelledby": `folder-heading-${category.id}`,
			});
			const intro = element("header", { className: "intro" });
			const lead = element("div", {});
			lead.append(
				element("h1", { id: `folder-heading-${category.id}` }, category.name),
				element("p", {}, category.intro),
			);
			intro.append(lead);
			if (category.handoff) {
				const aside = element("aside", { className: "handoff" });
				aside.append(
					element("strong", {}, category.handoff.title),
					element("p", {}, category.handoff.text),
				);
				intro.append(aside);
			}
			const notes = element("div", { className: "notes" });
			for (const note of category.notes)
				notes.append(createNote(note, layers, inquire, motion));
			if (!notes.childElementCount) {
				notes.append(
					element(
						"p",
						{},
						"Notes are currently unavailable. You can still get in touch.",
					),
				);
			}
			panel.append(intro, notes);
			return panel;
		});
		track.replaceChildren(...panels);
		for (const panel of panels)
			panel.scrollTop = scrollPositions.get(panel.dataset.category) || 0;
		selectCategory(activeCategory, true);
	}

	function inquire(control, note) {
		const service = getServices().find(
			(entry) => entry.id === note.serviceId && entry.available,
		);
		if (service) selectService(service.id, true);
		opener = control;
		navigate("hire");
	}

	function selectCategory(id, moveTrack) {
		const index = panels.findIndex((panel) => panel.dataset.category === id);
		if (index < 0) return;
		activeCategory = id;
		picker.value = id;
		const currentLink = nav.querySelector(`[href="#${id}"]`);
		for (const link of nav.children) {
			if (link === currentLink) link.setAttribute("aria-current", "location");
			else link.removeAttribute("aria-current");
		}
		const departing = panels.find(
			(panel) =>
				panel.dataset.category !== id && panel.contains(document.activeElement),
		);
		if (departing)
			(phone.matches ? picker : currentLink)?.focus({ preventScroll: true });
		panels.forEach((panel, position) => {
			panel.inert = position !== index;
		});
		if (moveTrack) {
			clearTimeout(scrollTimer);
			ignoreScrollUntil = performance.now() + 180;
			track.scrollTo({ left: track.clientWidth * index, behavior: "instant" });
		}
	}

	function openRoute(id, anchor) {
		if (id === activeRoute && sheet.open && !anchor) return;
		const legacyModal = getCurrentModal();
		if (legacyModal) closeModal(legacyModal);
		if (activeRoute === "edit-content" && id !== activeRoute)
			openEditor.close();
		activeRoute = id;
		heading.textContent = titles[id];
		for (const panel of sheetPanels) panel.hidden = panel.dataset.sheet !== id;
		if (!sheet.open) sheet.showModal();
		if (id === "edit-content") openEditor();
		if (id === "products" && !productsStarted) {
			productsStarted = true;
			initProducts();
		}
		if (id === "personal" && !personalStarted) {
			personalStarted = true;
			initGallery();
			initQuotes();
		}
		sheet.scrollTop = 0;
		heading.focus({ preventScroll: true });
		if (anchor)
			root.querySelector(`#${anchor}`)?.scrollIntoView({ block: "start" });
	}

	function syncLocation() {
		const hash = location.hash.slice(1);
		const raw = hash.replace(/^\//, "");
		const legacy = legacyAddresses[raw];
		const id = legacy?.id || raw;
		if (legacy || hash !== raw) {
			history.replaceState(
				{ ...history.state, folderAnchor: legacy?.anchor },
				"",
				`#${id}`,
			);
		}
		if (Object.hasOwn(titles, id) && (!adminRoutes.has(id) || isAdminUser())) {
			if (categoryIds.has(history.state?.folderCategory))
				selectCategory(history.state.folderCategory, true);
			opener = routeOpeners.get(history.state?.folderOpener) || opener;
			openRoute(id, history.state?.folderAnchor);
			return;
		}
		const boardOnly = raw === "loginModal" || raw === "whiteboard";
		const closedRoute = activeRoute;
		if (closedRoute === "edit-content") openEditor.close();
		activeRoute = undefined;
		closingSheet = false;
		selectCategory(
			categoryIds.has(id) ? id : boardOnly ? activeCategory : "about",
			true,
		);
		if (sheet.open) {
			const legacyModal = getCurrentModal();
			if (legacyModal) closeModal(legacyModal);
			sheet.close();
			const routeControls = [
				...root.querySelectorAll(`[data-route="${closedRoute}"]`),
			];
			const returnTarget =
				[
					opener,
					...routeControls,
					phone.matches
						? picker
						: nav.querySelector('[aria-current="location"]'),
				].find(
					(control) =>
						control?.isConnected &&
						!control.closest("[inert]") &&
						control.getClientRects().length,
				) || board;
			returnTarget.focus({ preventScroll: true });
			opener = undefined;
		}
	}

	function navigate(
		id,
		replace = Boolean(activeRoute) && !categoryIds.has(id),
	) {
		if (location.hash === `#${id}`) {
			syncLocation();
			return;
		}
		const category = categoryIds.has(id);
		if (
			category &&
			!replace &&
			activeRoute &&
			id === activeCategory &&
			history.state?.folderRouteFromBoard
		) {
			history.back();
			return;
		}
		const fromBoard = replace
			? Boolean(history.state?.folderRouteFromBoard)
			: !activeRoute;
		let source = history.state?.folderOpener;
		if (!category && !replace && opener) {
			source = ++openerKey;
			routeOpeners.set(source, opener);
		}
		const state = category
			? null
			: {
					folderRouteFromBoard: fromBoard,
					folderCategory: activeCategory,
					folderOpener: source,
				};
		if (replace) history.replaceState(state, "", `#${id}`);
		else history.pushState(state, "", `#${id}`);
		syncLocation();
	}

	function closeSheet() {
		if (closingSheet || !sheet.open) return;
		closingSheet = true;
		if (history.state?.folderRouteFromBoard) history.back();
		else navigate(activeCategory, true);
	}

	for (const { id, name } of startingCatalog) {
		nav.append(element("a", { href: `#${id}` }, name));
		picker.append(element("option", { value: id }, name));
	}
	root.addEventListener("click", (event) => {
		const link = event.target.closest("a[href^='#']");
		if (
			!link ||
			event.defaultPrevented ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		)
			return;
		const fragment = link.getAttribute("href").slice(1);
		const id = legacyAddresses[fragment]?.id ?? fragment;
		if (id === "whiteboard") {
			event.preventDefault();
			board.focus();
			return;
		}

		if (
			(!categoryIds.has(id) && !Object.hasOwn(titles, id)) ||
			(adminRoutes.has(id) && !isAdminUser())
		)
			return;
		event.preventDefault();
		if (link.closest("#loginModal") && adminRoutes.has(id)) {
			root.querySelector("#loginCancel").click();
			opener = root.querySelector("#loginButton");
		} else if (!activeRoute && Object.hasOwn(titles, id)) opener = link;
		if (
			link.hasAttribute("data-feedback-entry") &&
			root.querySelector("#quoteConfirmation:not([hidden])")
		) {
			root.querySelector("#restartQuote").click();
		}
		navigate(id);
	});
	picker.addEventListener("change", () => navigate(picker.value));
	close.addEventListener("click", closeSheet);
	sheet.addEventListener("keydown", (event) => {
		const modal = getCurrentModal();
		if (modal && event.key === "Escape") {
			event.preventDefault();
			event.stopPropagation();
			closeModal(modal);
			heading.focus({ preventScroll: true });
		}
	});
	sheet.addEventListener("cancel", (event) => {
		event.preventDefault();
		closeSheet();
	});
	track.addEventListener(
		"scroll",
		() => {
			if (!phone.matches || performance.now() < ignoreScrollUntil) return;
			clearTimeout(scrollTimer);
			scrollTimer = setTimeout(() => {
				const panel = panels[Math.round(track.scrollLeft / track.clientWidth)];
				const id = panel?.dataset.category;
				if (!id || id === activeCategory || activeRoute) return;
				history.replaceState(null, "", `#${id}`);
				selectCategory(id, false);
			}, 110);
		},
		{ passive: true },
	);
	window.addEventListener("popstate", syncLocation);
	window.addEventListener("hashchange", syncLocation);
	new ResizeObserver(() => selectCategory(activeCategory, true)).observe(track);

	renderCatalog(emptyFolderCatalog);
	initModals();
	initAuth();
	resetPublishedServiceVisibility();
	initHire();
	initContact();
	window.addEventListener("open-related-post", () => {
		if (activeRoute !== "work") navigate("work");
	});
	initPortfolio();
	updateAdminUi();
	onAuthStateChange(() => {
		refreshFolder();
		if (adminRoutes.has(activeRoute) && !isAdminUser()) closeSheet();
		else if (isAdminUser() && adminRoutes.has(location.hash.slice(1)))
			syncLocation();
	});
	syncLocation();
	document.body.classList.add("loaded");
}
