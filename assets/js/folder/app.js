import {
	closeModal,
	getCurrentModal,
	initModals,
} from "../components/modal.js";
import { getSocialLinksTemplate } from "../components/profile.js";
import { createElement } from "../core/dom.js";
import { getContactTemplate, initContact } from "../pages/contact.js";
import { getGalleryTemplate, initGallery } from "../pages/gallery.js";
import { getLinksTemplate } from "../pages/links.js";
import {
	getPortfolioTemplate,
	initPortfolio,
	portfolioResultPosition,
	selectLinkedPortfolioPost,
} from "../pages/portfolio.js";
import { getProductsTemplate, initProducts } from "../pages/products.js";
import { getQuotesTemplate, initQuotes } from "../pages/quotes.js";
import {
	getServices,
	loadServices,
	resetPublishedServiceVisibility,
	selectService,
} from "../services/catalog.js";
import { employers, guide } from "./contents.js";
import { mountPortfolioTour } from "./kal-tour.js";
import { createNote } from "./notes.js";
import { startingCatalog } from "./starting-catalog.js";
import { folderTemplate, setupTabs } from "./template.js";

const titles = {
	hire: "Hire me",
	employers: "For employers",
	work: "Work & Notes",
	personal: "Personal",
	guide: "How to build an idea",
	products: "Books and tools",
};
const retiredRoutes = new Set(["loginModal", "edit-services", "edit-content"]);
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

export function mountWorkingFolder(root) {
	const personal = `
		<div id="personal-photos">
			<img class="personal-portrait" src="assets/images/pictures/profile.jpg" width="140" height="140" alt="Portrait of Joe Rice">
			${getGalleryTemplate()}
		</div>
		${getQuotesTemplate({ readOnly: true })}
		${getLinksTemplate()}
		<h2>Profiles</h2>
		${getSocialLinksTemplate({ labels: ["Instagram", "GitHub", "Etsy"] })}
		<a class="action" href="#hire" data-route="hire" data-feedback-entry>Send feedback or request an update</a>
	`;
	root.innerHTML = folderTemplate({
		categories: startingCatalog,
		quote: getContactTemplate({ sheet: true }),
		work:
			getPortfolioTemplate({ folder: true }) +
			`<a class="action" href="#hire" data-route="hire">Ask about this work</a>`,
		products: getProductsTemplate(),
		personal,
		employers,
		guide,
	});

	const phone = matchMedia("(max-width: 720px)");
	const nav = root.querySelector(".categories");
	const picker = root.querySelector("#folder-category");
	const board = root.querySelector(".whiteboard");
	const track = root.querySelector(".track");
	const sheet = root.querySelector(".route-sheet");
	const heading = sheet.querySelector("#folder-sheet-title");
	const close = sheet.querySelector("[data-close]");
	const layers = new Map();
	const sheetPanels = Array.from(sheet.querySelectorAll("[data-sheet]"));
	const categoryIds = new Set(startingCatalog.map((category) => category.id));
	let activeCategory = "about";
	let activeRoute;
	let opener;
	let closingSheet = false;
	let openerKey = 0;
	const routeOpeners = new Map();
	let personalStarted = false;
	let productsStarted = false;
	let workResultsReturn;

	function renderCatalog() {
		const panels = startingCatalog.map((category) => {
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
			for (const note of category.notes) {
				notes.append(createNote(note, layers, inquire));
			}
			panel.append(intro, notes);
			return panel;
		});
		track.append(...panels);
		return panels;
	}

	const panels = renderCatalog();
	const tabs = setupTabs(root);

	function inquire(control, note) {
		const service = getServices().find(
			(entry) => entry.id === note.serviceId && entry.available,
		);
		if (service) selectService(service.id, true);
		opener = control;
		navigate("hire");
	}

	function selectCategory(id) {
		const index = panels.findIndex((panel) => panel.dataset.category === id);
		if (index < 0) return;
		activeCategory = id;
		picker.value = id;
		const currentLink = nav.querySelector(`[href="#${id}"]`);
		const previousLink = nav.querySelector('a[aria-current="location"]');
		tabs.select(nav, currentLink);
		if (previousLink && previousLink !== currentLink) {
			for (const [link, distance, angle] of [
				[previousLink, 6, 28],
				[currentLink, -7, -32],
			]) {
				const tab = tabs.visibleControl(link.closest(".folder-tab"));
				for (const animation of tab.getAnimations()) animation.cancel();
				tab.animate(
					[
						{ transform: "none" },
						{
							transform: `translateY(${distance}px) perspective(240px) rotateY(${angle}deg)`,
							offset: 0.44,
						},
						{ transform: "none" },
					],
					{ duration: 310, easing: "ease-in-out" },
				);
			}
			for (const panel of panels)
				for (const animation of panel.getAnimations()) animation.cancel();
			panels[index].animate(
				[
					{ opacity: 0.55, transform: "translateY(9px)" },
					{ opacity: 1, transform: "translateY(0)" },
				],
				{ duration: 230, easing: "ease-out" },
			);
		}
		const departing = panels.find(
			(panel) =>
				panel.dataset.category !== id && panel.contains(document.activeElement),
		);
		if (departing)
			(phone.matches
				? picker
				: tabs.visibleControl(currentLink.closest(".folder-tab"))
			).focus({ preventScroll: true });
		panels.forEach((panel, position) => {
			panel.inert = position !== index;
		});
	}

	function openRoute(id, anchor) {
		if (id === activeRoute && sheet.open && !anchor) return;
		const legacyModal = getCurrentModal();
		if (legacyModal) closeModal(legacyModal);
		activeRoute = id;
		heading.textContent = titles[id];
		for (const panel of sheetPanels) panel.hidden = panel.dataset.sheet !== id;
		for (const rail of root.querySelectorAll(".destinations, .guide"))
			tabs.select(rail, rail.querySelector(`[data-route="${id}"]`));
		sheet.dataset.route = id;
		if (!sheet.open) {
			sheet.showModal();
			sheet.animate(
				[
					{ transform: "translateY(24px) scale(0.98)", opacity: 0.6 },
					{ transform: "none", opacity: 1 },
				],
				{ duration: 260, easing: "cubic-bezier(0.18, 0.75, 0.28, 1)" },
			);
		}
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
		const postKey = raw.startsWith("work/") ? raw.slice(5) : "";
		const id = postKey ? "work" : legacy?.id || raw;
		if (legacy || hash !== raw) {
			history.replaceState(
				{ ...history.state, folderAnchor: legacy?.anchor },
				"",
				`#${legacy ? id : raw}`,
			);
		}
		if (Object.hasOwn(titles, id)) {
			if (categoryIds.has(history.state?.folderCategory))
				selectCategory(history.state.folderCategory);
			opener = routeOpeners.get(history.state?.folderOpener) || opener;
			openRoute(id, history.state?.folderAnchor);
			selectLinkedPortfolioPost(postKey);
			if (id !== "work") workResultsReturn = undefined;
			if (!postKey && id === "work" && workResultsReturn) {
				const { control, scrollTop } = workResultsReturn;
				workResultsReturn = undefined;
				(control.isConnected ? control : root.querySelector("#q")).focus({
					preventScroll: true,
				});
				sheet.scrollTop = scrollTop;
			}
			return;
		}
		selectLinkedPortfolioPost("");
		workResultsReturn = undefined;
		const boardOnly = raw === "whiteboard" || retiredRoutes.has(raw);
		if (retiredRoutes.has(raw))
			history.replaceState(null, "", `#${activeCategory}`);
		const closedRoute = activeRoute;
		for (const rail of root.querySelectorAll(".destinations, .guide"))
			tabs.select(rail);
		activeRoute = undefined;
		closingSheet = false;
		selectCategory(
			categoryIds.has(id) ? id : boardOnly ? activeCategory : "about",
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
					...routeControls.flatMap((control) => {
						const tab = control.closest(".folder-tab");
						return tab ? [control, tabs.visibleControl(tab)] : [control];
					}),
					phone.matches
						? picker
						: tabs.visibleControl(
								nav.querySelector(".folder-tab[data-current]"),
							),
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

	function isBackdrop(event) {
		if (event.target !== sheet) return false;
		const { left, right, top, bottom } = sheet.getBoundingClientRect();
		return (
			event.clientX < left ||
			event.clientX >= right ||
			event.clientY < top ||
			event.clientY >= bottom
		);
	}

	for (const { id, name } of startingCatalog) {
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
		if (fragment.startsWith("work/")) {
			event.preventDefault();
			if (activeRoute === "work") {
				const accordion = link.closest(".postAccordion");
				const control = accordion?.querySelector(".postTitleButton");
				if (control)
					workResultsReturn = {
						control,
						scrollTop: portfolioResultPosition(accordion) ?? sheet.scrollTop,
					};
			} else if (!activeRoute) opener = link;
			navigate(fragment);
			sheet.scrollTop = 0;
			return;
		}
		if (link.hasAttribute("data-return-to-results") && !workResultsReturn)
			workResultsReturn = { control: root.querySelector("#q"), scrollTop: 0 };
		const id = legacyAddresses[fragment]?.id ?? fragment;
		if (id === "whiteboard") {
			event.preventDefault();
			board.focus();
			return;
		}

		if (!categoryIds.has(id) && !Object.hasOwn(titles, id)) return;
		event.preventDefault();
		if (!activeRoute && Object.hasOwn(titles, id)) opener = link;
		if (categoryIds.has(id) || link.closest(".destinations"))
			tabs.collapseFrom(link);
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
	let startedOnBackdrop = false;
	sheet.addEventListener("pointerdown", (event) => {
		startedOnBackdrop = isBackdrop(event);
	});
	sheet.addEventListener("pointercancel", () => {
		startedOnBackdrop = false;
	});
	sheet.addEventListener("click", (event) => {
		if (startedOnBackdrop && isBackdrop(event)) closeSheet();
		startedOnBackdrop = false;
	});
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
	window.addEventListener("popstate", syncLocation);
	window.addEventListener("hashchange", syncLocation);
	initModals();
	resetPublishedServiceVisibility();
	void loadServices().catch(() => {
		// The service catalog retains its unavailable state when a read fails.
	});
	initContact();
	window.addEventListener("open-related-post", () => {
		if (activeRoute !== "work") navigate("work");
	});
	initPortfolio();
	syncLocation();
	document.body.classList.add("loaded");
	mountPortfolioTour(root);
}
