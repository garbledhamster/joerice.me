import { createElement } from "../core/dom.js";
import { isPortfolioExampleAddress } from "./content-store.js";

function element(tag, attrs, text) {
	return createElement(tag, attrs, text === undefined ? [] : [text]);
}

function flip(from, to, direction, motion, onFinish) {
	from.classList.add("turning-out");
	from.inert = true;
	from.setAttribute("aria-hidden", "true");

	const timing = { duration: 500, easing: "ease-in-out" };
	const outgoing = from.animate(
		[
			{ transform: "rotateY(0deg)" },
			{ transform: `rotateY(${direction * 180}deg)` },
		],
		timing,
	);
	const incoming = to.animate(
		[
			{ transform: `rotateY(${-direction * 180}deg)` },
			{ transform: "rotateY(0deg)" },
		],
		timing,
	);
	let finished = false;
	function clean() {
		if (finished) return;
		finished = true;
		from.remove();
		motion.removeEventListener("change", clean);
		outgoing.cancel();
		incoming.cancel();
		onFinish();
	}
	motion.addEventListener("change", clean);
	outgoing.finished.then(clean, clean);
	return clean;
}

export function createNote(note, layers, onInquire, motion) {
	const article = element("article", {
		className: "note",
		id: `note-${note.id}`,
		"aria-label": note.title,
	});
	let finishFlip;

	function render(layer, moveFocus = false) {
		finishFlip?.();
		const previous = article.firstElementChild;
		const direction = layer < Number(article.dataset.layer) ? -1 : 1;
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
			const back = element(
				"button",
				{
					type: "button",
					className: "back",
					"aria-label": `Back one layer for ${note.title}`,
					onClick: () => change(layer - 1),
				},
				"Back",
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
		if (previous && !motion.matches) {
			article.prepend(face);
			finishFlip = flip(previous, face, direction, motion, () => {
				finishFlip = undefined;
			});
		} else {
			article.replaceChildren(face);
		}
		if (moveFocus) {
			title.tabIndex = -1;
			title.focus({ preventScroll: true });
		}
	}

	function change(depth) {
		layers.set(note.id, depth);
		render(depth, true);
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
