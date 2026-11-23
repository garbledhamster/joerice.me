const companionSites = [
	["Ourstuff", "https://ourstuff.space/"],
	["The Classics", "https://classics.ourstuff.space/"],
	["Feelings & Needs", "https://feelings.ourstuff.space/"],
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

function icon(name) {
	return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${iconPaths[name]}"/></svg>`;
}

function rail(classes, label, entries) {
	return `<nav class="tab-rail ${classes}" aria-label="${label}">
		${entries
			.map(([name, href, symbol], index) => {
				const external = href.startsWith("https:");
				const cue = external ? "external" : symbol;
				const newTab = external
					? ' target="_blank" rel="noopener noreferrer" aria-description="Opens in a new tab"'
					: "";
				const route = symbol ? ` data-route="${href.slice(1)}"` : "";
				const linkId = `${classes.split(" ").at(-1)}-tab-${index + 1}`;
				return `<div class="folder-tab">
				<div class="tab-controls">
					<button class="tab-toggle" type="button" aria-label="${name}" aria-expanded="false" aria-controls="${linkId}">
						<span class="tab-number" aria-hidden="true">
							${cue ? icon(cue) : ""}${index + 1}
						</span>
						<span class="tab-title">${name}</span>
					</button>
					<a id="${linkId}" class="tab-link" href="${href}"${route}${newTab} aria-label="${name}">
						${symbol ? `<span class="tab-symbol">${icon(symbol)}</span>` : ""}
						<span class="tab-title">${name}</span>
						<span class="tab-arrow">${icon(external ? "external" : "open")}</span>
					</a>
				</div>
			</div>`;
			})
			.join("")}
	</nav>`;
}

export function setupTabs(root, phone) {
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
			if (!sides.includes(rail)) {
				setCompact(rail, phone.matches);
				continue;
			}
			// Measure the labels at their natural size, even while the real rail is compact.
			const measure = rail.cloneNode(true);
			measure.classList.add("tab-measure");
			measure.removeAttribute("data-compact");
			measure.inert = true;
			measure.style.inlineSize = `${rail.clientWidth}px`;
			rail.after(measure);
			const required = measure.getBoundingClientRect().height;
			measure.remove();
			setCompact(rail, required > rail.clientHeight);
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
	for (const rail of sides) resize.observe(rail);
	phone.addEventListener("change", fitTabs);
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
					categories.map(({ id, name }) => [name, `#${id}`]),
				)}
				<main id="whiteboard" class="whiteboard" tabindex="-1">
					<div class="phone-picker">
						<label for="folder-category">Category</label><select id="folder-category"></select>
					</div>
					<div class="track"></div>
				</main>
				${rail("rail destinations", "More from Joe", destinations)}
			</div>
			${rail("guide", "Guides", [["How to build an idea", "#guide", "guide"]])}
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
