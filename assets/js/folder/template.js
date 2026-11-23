const companionSites = [
	["Ourstuff", "https://ourstuff.space/", "ourstuff"],
	["The Classics", "https://classics.ourstuff.space/", "classics"],
	["Feelings & Needs", "https://feelings.ourstuff.space/", "feelings"],
];

const destinations = [
	["Hire me", "#hire", "hire"],
	["For employers", "#employers", "employers"],
	["Work & Notes", "#work", "work"],
	["Personal", "#personal", "personal"],
];

const iconPaths = {
	hire: "M9 7V4h6v3M3 10V7h18v13H3V10Zm0 2c6 3 12 3 18 0m-10 2h2",
	employers:
		"M3 5h18v14H3zm12 5h3m-3 4h3M6 15v-1a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v1m-1-6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z",
	work: "M6 3h14v18H6zm-2 4h4m-4 5h4m-4 5h4m3-10h5m-5 5h5",
	personal:
		"M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2",
	guide:
		"M12 6c-3-3-7-3-10-2v14c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 2zm0 0v14",
	close: "M6 6l12 12M18 6 6 18",
	open: "M5 12h14m-7-7 7 7-7 7",
	external: "M6 18 18 6M8 6h10v10",
};

/*
 * Category icons from Lucide 1.17.0, https://lucide.dev/license
 *
 * ISC License
 * Copyright (c) 2026 Lucide Icons and Contributors
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * The Info icon is derived from Feather under the MIT License.
 * Copyright (c) 2013-present Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
const categoryIcons = {
	about: [
		"info",
		'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
	],
	build: [
		"blocks",
		'<path d="M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2"/><rect x="14" y="2" width="8" height="8" rx="1"/>',
	],
	security: [
		"shield-check",
		'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zM9 12l2 2 4-4"/>',
	],
	systems: [
		"network",
		'<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3M12 12V8"/>',
	],
	automation: [
		"zap",
		'<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
	],
	ai: [
		"bot",
		'<rect width="16" height="12" x="4" y="8" rx="2"/><path d="M12 8V4H8M2 14h2m16 0h2m-7-1v2m-6-2v2"/>',
	],
	games: [
		"gamepad-2",
		'<path d="M6 11h4m-2-2v4m7-1h.01M18 10h.01M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>',
	],
	writing: [
		"pencil-ruler",
		'<path d="M13 7 8.7 2.7a2.41 2.41 0 0 0-3.4 0L2.7 5.3a2.41 2.41 0 0 0 0 3.4L7 13M8 6l2-2m8 12 2-2m-3-3 4.3 4.3c.94.94.94 2.46 0 3.4l-2.6 2.6c-.94.94-2.46.94-3.4 0L11 17M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497zM15 5l4 4"/>',
	],
};

function icon(name) {
	const categoryIcon = categoryIcons[name];
	if (categoryIcon) {
		const [symbol, shapes] = categoryIcon;
		return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-category-icon="${symbol}">${shapes}</svg>`;
	}
	return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${iconPaths[name]}"/></svg>`;
}

function rail(classes, label, entries, { sheets = false } = {}) {
	return `<nav class="tab-rail ${classes}" aria-label="${label}">
		${entries
			.map(([name, href, symbol], index) => {
				const external = href.startsWith("https:");
				const tabIcon =
					symbol &&
					(external
						? `<img class="site-favicon" src="/assets/images/site-favicons/${symbol}.png" width="16" height="16" alt="">`
						: `<span class="tab-orb" aria-hidden="true">${icon(symbol)}</span>`);
				const newTab = external
					? ' target="_blank" rel="noopener noreferrer" aria-description="Opens in a new tab"'
					: "";
				const route = sheets ? ` data-route="${href.slice(1)}"` : "";
				const linkId = `${classes.split(" ").at(-1)}-tab-${index + 1}`;
				return `<div class="folder-tab">
				<div class="tab-controls">
					<button class="tab-toggle" type="button" aria-label="${name}" aria-expanded="false" aria-controls="${linkId}">
						<span class="tab-number" aria-hidden="true">
							${tabIcon || ""}${index + 1}
						</span>
						<span class="tab-title">${name}</span>
					</button>
					<a id="${linkId}" class="tab-link" href="${href}"${route}${newTab} aria-label="${name}">
						${tabIcon ? `<span class="tab-symbol">${tabIcon}</span>` : ""}
						<span class="tab-title">${name}</span>
						<span class="tab-arrow">${icon(external ? "external" : "open")}</span>
					</a>
				</div>
			</div>`;
			})
			.join("")}
	</nav>`;
}

export function setupTabs(root) {
	const rails = [...root.querySelectorAll(".tab-rail")];
	const sides = rails.filter((rail) => rail.classList.contains("rail"));
	let expanded;

	function visibleControl(tab) {
		return tab?.querySelector(
			tab.parentElement.hasAttribute("data-compact")
				? ".tab-toggle"
				: ".tab-link",
		);
	}

	function closeExpanded(restoreFocus = false) {
		if (!expanded) return;
		const button = expanded.querySelector(".tab-toggle");
		expanded.removeAttribute("data-expanded");
		button.setAttribute("aria-expanded", "false");
		if (restoreFocus) button.focus({ preventScroll: true });
		expanded = undefined;
	}

	function placeDisclosure() {
		if (!expanded?.parentElement.classList.contains("rail")) return;
		const bounds = expanded.getBoundingClientRect();
		const rail = expanded.parentElement.getBoundingClientRect();
		if (bounds.bottom <= rail.top || bounds.top >= rail.bottom) {
			closeExpanded(expanded.contains(document.activeElement));
			return;
		}
		expanded.style.setProperty("--tab-left", `${bounds.left}px`);
		expanded.style.setProperty("--tab-right", `${innerWidth - bounds.right}px`);
		expanded.style.setProperty(
			"--tab-top",
			`${Math.max(rail.top, Math.min(bounds.top, innerHeight - 44))}px`,
		);
	}

	function setCompact(rail, compact) {
		if (rail.hasAttribute("data-compact") === compact) return;
		const focusedTab = document.activeElement.closest(".folder-tab");
		if (expanded?.parentElement === rail) closeExpanded();
		rail.toggleAttribute("data-compact", compact);
		for (const tab of rail.children) {
			const name = tab.querySelector(".tab-toggle").getAttribute("aria-label");
			tab
				.querySelector(".tab-link")
				.setAttribute("aria-label", compact ? `Open ${name}` : name);
		}
		if (focusedTab?.parentElement === rail)
			visibleControl(focusedTab).focus({ preventScroll: true });
	}

	function fitTabs() {
		for (const rail of rails) {
			const vertical = sides.includes(rail);
			// Measure the full labels even when the visible rail is compact.
			const measure = rail.cloneNode(true);
			measure.classList.add("tab-measure");
			measure.removeAttribute("data-compact");
			measure.inert = true;
			measure.style.inlineSize = vertical
				? `${rail.clientWidth}px`
				: "max-content";
			rail.after(measure);
			const { height, width } = measure.getBoundingClientRect();
			measure.remove();
			setCompact(
				rail,
				vertical ? height > rail.clientHeight : width > rail.clientWidth,
			);
		}
		placeDisclosure();
	}

	for (const rail of rails) {
		rail.addEventListener("click", (event) => {
			const button = event.target.closest(".tab-toggle");
			if (!button) return;
			const tab = button.closest(".folder-tab");
			if (tab === expanded) {
				closeExpanded();
				return;
			}
			closeExpanded();
			expanded = tab;
			tab.setAttribute("data-expanded", "");
			button.setAttribute("aria-expanded", "true");
			if (sides.includes(rail)) placeDisclosure();
			else {
				const arrow = tab.querySelector(".tab-link").getBoundingClientRect();
				const track = rail.getBoundingClientRect();
				rail.scrollLeft +=
					Math.max(0, arrow.right - track.right) +
					Math.min(0, arrow.left - track.left);
			}
		});
		if (sides.includes(rail)) rail.addEventListener("scroll", placeDisclosure);
	}
	root.addEventListener("keydown", (event) => {
		if (event.key !== "Escape" || !expanded || event.target.closest("dialog"))
			return;
		event.preventDefault();
		closeExpanded(true);
	});
	const resize = new ResizeObserver(fitTabs);
	for (const rail of rails) resize.observe(rail);
	document.fonts?.ready.then(fitTabs);
	fitTabs();

	return {
		visibleControl,
		select(rail, current) {
			for (const tab of rail.children) {
				const link = tab.querySelector(".tab-link");
				const active = link === current;
				tab.toggleAttribute("data-current", active);
				for (const control of [link, tab.querySelector(".tab-toggle")]) {
					if (active) control.setAttribute("aria-current", "location");
					else control.removeAttribute("aria-current");
				}
			}
		},
		collapseFrom(link) {
			if (expanded && link.closest(".folder-tab") === expanded)
				closeExpanded(true);
		},
	};
}

export function folderTemplate({
	quote,
	work,
	products,
	personal,
	employers,
	guide,
	categories,
}) {
	return `
		<a class="skip" href="#whiteboard">Skip to the whiteboard</a>
		<div class="folder">
			<header class="masthead">
				<a class="wordmark" href="#about" aria-label="Joe Rice home">Joe Rice.</a>
			</header>
			${rail("site-links", "Joe’s sites", companionSites)}
			<div class="workspace">
				${rail(
					"rail categories",
					"Service categories",
					categories.map(({ id, name }) => [name, `#${id}`, id]),
				)}
				<main id="whiteboard" class="whiteboard" tabindex="-1">
					<div class="phone-picker">
						<label for="folder-category">Category</label><select id="folder-category"></select>
					</div>
					<div class="track"></div>
				</main>
				${rail("rail destinations", "More from Joe", destinations, { sheets: true })}
			</div>
			${rail("guide", "Guides", [["How to build an idea", "#guide", "guide"]], { sheets: true })}
		</div>
		<dialog class="route-sheet" aria-labelledby="folder-sheet-title">
			<header class="sheet-heading">
				<h1 id="folder-sheet-title" tabindex="-1"></h1>
				<button class="sheet-close" data-close type="button" aria-label="Close panel" title="Close panel">${icon("close")}</button>
			</header>
			<div class="route-body">
				<div data-sheet="hire" hidden>${quote}</div>
				<div data-sheet="work" hidden>${work}</div>
				<div data-sheet="employers" hidden>${employers}</div>
				<div data-sheet="personal" hidden>${personal}</div>
				<div data-sheet="guide" hidden>${guide}</div>
				<div data-sheet="products" hidden>${products}</div>
			</div>
		</dialog>
	`;
}
