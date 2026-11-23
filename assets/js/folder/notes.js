import { createElement } from "../core/dom.js";
import { isPortfolioExampleAddress } from "./content-store.js";

function element(tag, attrs, text) {
	return createElement(tag, attrs, text === undefined ? [] : [text]);
}

// Each hinge paints a slice of the same face. The real controls stay on the card.
function paperStrip(face, start, portion, offset) {
	const hinge = element("div", { className: "paper-hinge" });
	const slice = element("div", { className: "paper-slice" });
	hinge.style.top = `${offset}%`;
	slice.style.height = `${portion}%`;
	const print = face.cloneNode(true);
	print.classList.remove("turning-out");
	print.style.top = `${(-100 * start) / portion}%`;
	print.style.height = `${10000 / portion}%`;
	slice.append(print);
	hinge.append(slice);
	return hinge;
}

function peel(from, to, goingBack, onFinish) {
	const cover = goingBack ? to : from;
	const scrollTop = cover.querySelector(".note-copy").scrollTop;
	const animations = [];

	from.classList.add("turning-out");
	from.inert = true;
	from.setAttribute("aria-hidden", "true");

	const shadow = element("div", {
		className: "paper-shadow",
		"aria-hidden": "true",
	});
	const sheet = element("div", {
		className: "paper-peel",
		"aria-hidden": "true",
	});
	sheet.inert = true;
	const topSize = 42;
	const middleSize = 30;
	const tipStart = topSize + middleSize;
	const top = paperStrip(cover, 0, topSize, 0);
	const middle = paperStrip(cover, topSize, middleSize, topSize);
	const tip = paperStrip(cover, tipStart, 100 - tipStart, middleSize);
	const light = element("div", { className: "paper-light" });
	tip.firstElementChild.append(light);
	top.append(middle);
	middle.append(tip);
	sheet.append(top);
	cover.classList.add("under-paper-peel");
	from.parentElement.append(shadow, sheet);
	for (const copy of sheet.querySelectorAll(".note-copy")) {
		copy.scrollTop = scrollTop;
	}

	const timing = {
		duration: 740,
		direction: goingBack ? "reverse" : "normal",
		fill: "both",
	};
	const animate = (target, frames) => {
		animations.push(target.animate(frames, timing));
	};
	animate(top, [
		{ transform: "translateY(0) rotateX(0deg)", easing: "ease-in-out" },
		{
			offset: 0.46,
			transform: "translateY(0) rotateX(20deg)",
			easing: "ease-in",
		},
		{
			offset: 0.68,
			transform: "translateY(-34%) rotateX(30deg)",
			easing: "ease-out",
		},
		{ transform: "translateY(-105%) rotateX(23deg)" },
	]);
	animate(middle, [
		{ transform: "rotateX(0deg)", easing: "ease-out" },
		{ offset: 0.31, transform: "rotateX(22deg)" },
		{ offset: 0.51, transform: "rotateX(27deg)" },
		{ transform: "rotateX(16deg)" },
	]);
	animate(tip, [
		{ transform: "rotateX(0deg)", easing: "ease-out" },
		{ offset: 0.22, transform: "rotateX(25deg)" },
		{ offset: 0.51, transform: "rotateX(27deg)" },
		{ transform: "rotateX(12deg)" },
	]);
	for (const slice of sheet.querySelectorAll(".paper-slice")) {
		animate(slice, [
			{ opacity: 1 },
			{ offset: 0.78, opacity: 1 },
			{ opacity: 0 },
		]);
	}
	animate(shadow, [
		{ opacity: 0, transform: "scaleY(0.5)" },
		{ offset: 0.45, opacity: 0.85, transform: "scaleY(1)" },
		{ opacity: 0, transform: "scaleY(1.2)" },
	]);
	animate(light, [
		{ opacity: 0 },
		{ offset: 0.45, opacity: 1 },
		{ opacity: 0 },
	]);

	let finished = false;
	function clean() {
		if (finished) return;
		finished = true;
		cover.classList.remove("under-paper-peel");
		from.remove();
		sheet.remove();
		shadow.remove();
		for (const animation of animations) animation.cancel();
		onFinish();
	}
	animations[0].finished.then(clean, clean);
	return clean;
}

export function createNote(note, layers, onInquire) {
	const article = element("article", {
		className: "note",
		id: `note-${note.id}`,
		"aria-label": note.title,
	});
	let finishPeel;

	function render(layer, moveFocus = false) {
		finishPeel?.();
		const previous = article.firstElementChild;
		const goingBack = layer < Number(article.dataset.layer);
		article.dataset.layer = layer;
		const face = element("div", { className: "face", "data-layer": layer });
		const copy = element("div", { className: "note-copy" });
		if (layer > 0) {
			copy.tabIndex = 0;
			copy.setAttribute("role", "group");
			copy.setAttribute("aria-label", `Read ${note.title}`);
		}
		const headings = [note.title, "What’s included", note.example.title];
		const title = element("h2", {}, headings[layer]);
		copy.append(title);
		const actions = element("div", { className: "actions" });

		if (layer > 0) {
			const icon = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"svg",
			);
			icon.setAttribute("viewBox", "0 0 24 24");
			icon.setAttribute("aria-hidden", "true");
			icon.setAttribute("focusable", "false");
			const path = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"path",
			);
			path.setAttribute("d", "M19 12H5m0 0 7-7m-7 7 7 7");
			icon.append(path);
			const back = element(
				"button",
				{
					type: "button",
					className: "back",
					"aria-label": `Back one layer for ${note.title}`,
					onClick: () => change(layer - 1),
				},
				icon,
			);
			actions.append(back);
		}
		if (layer < 2) {
			if (layer === 1) {
				const list = element("ul", {});
				for (const line of note.included) list.append(element("li", {}, line));
				copy.append(list);
			}
			const label = layer === 0 ? "See what’s included" : "See an example";
			actions.append(
				element(
					"button",
					{
						type: "button",
						className: "action",
						"aria-label": `${label} for ${note.title}`,
						onClick: () => change(layer + 1),
					},
					layer === 0 ? "What’s included" : "Example",
				),
			);
		} else {
			copy.append(
				element("p", { className: "note-kind" }, note.example.kind),
				element("p", {}, note.example.text),
			);
			if (isPortfolioExampleAddress(note.example.href)) {
				actions.append(
					element(
						"a",
						{
							className: "action",
							href: note.example.href,
							target: "_blank",
							rel: "noopener noreferrer",
							"aria-label": "Open example (new tab)",
						},
						"Open ↗",
					),
				);
			} else {
				actions.append(
					element(
						"button",
						{
							type: "button",
							className: "action",
							"aria-label": "Ask about this work",
							onClick: (event) => onInquire(event.currentTarget, note),
						},
						"Ask Joe",
					),
				);
			}
		}
		face.append(copy, actions);
		if (previous) {
			article.prepend(face);
			finishPeel = peel(previous, face, goingBack, () => {
				finishPeel = undefined;
			});
		} else {
			article.replaceChildren(face);
		}
		requestAnimationFrame(() =>
			fitTitle(copy.querySelector("h2"), article, layer),
		);
		if (moveFocus) {
			title.tabIndex = -1;
			title.focus({ preventScroll: true });
		}
	}

	function fitTitle(title, card, layer) {
		const countLines = () => {
			const range = document.createRange();
			range.selectNodeContents(title);
			const tops = Array.from(range.getClientRects()).map((rect) =>
				Math.round(rect.top),
			);
			return new Set(tops).size || 1;
		};
		const fit = () => {
			if (!title.isConnected || !card.contains(title)) return;
			if (
				layer === 0 &&
				countLines() >= 3 &&
				!card.classList.contains("note-wide")
			) {
				card.classList.add("note-wide");
				requestAnimationFrame(fit);
				return;
			}
			let size = Number.parseFloat(getComputedStyle(title).fontSize);
			while (countLines() > 2 && size > 9) {
				size -= 0.5;
				title.style.fontSize = `${size}px`;
			}
		};
		title.style.removeProperty("font-size");
		if (document.fonts?.ready) document.fonts.ready.then(fit);
		else fit();
	}

	function change(depth) {
		layers.set(note.id, depth);
		render(depth, true);
	}

	if (typeof ResizeObserver !== "undefined") {
		const resizeObserver = new ResizeObserver(() => {
			const activeTitle = article.firstElementChild?.querySelector("h2");
			if (activeTitle)
				fitTitle(activeTitle, article, Number(article.dataset.layer));
		});
		resizeObserver.observe(article);
	}

	article.addEventListener("click", (event) => {
		const layer = Number(article.dataset.layer);
		if (layer === 2 || event.target.closest("button, a")) return;
		const selection = window.getSelection();
		if (
			selection &&
			!selection.isCollapsed &&
			article.contains(selection.anchorNode)
		)
			return;
		change(layer + 1);
	});

	render(layers.get(note.id) || 0);
	return article;
}
