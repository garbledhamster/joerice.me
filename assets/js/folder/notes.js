import { createElement } from "../core/dom.js";

function element(tag, attrs, text) {
	return createElement(tag, attrs, text === undefined ? [] : [text]);
}

export function createNote(note, layers, onInquire, motion) {
	const article = element("article", {
		className: "note",
		id: `note-${note.id}`,
		"aria-labelledby": `note-${note.id}-title`,
	});

	function render(layer, moveFocus = false) {
		const previous = article.querySelector(".face");
		const animate =
			previous && layer > Number(article.dataset.layer) && !motion.matches;
		article.dataset.layer = layer;
		const face = element("div", { className: "face" });
		const title = element("h2", { id: `note-${note.id}-title` }, note.title);
		if (layer > 0) {
			const kind = layer === 1 ? "What’s included" : note.example.kind;
			face.append(element("p", { className: "note-kind" }, kind));
		}
		face.append(title);
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
				"← Back",
			);
			actions.append(back);
		}
		if (layer < 2) {
			if (layer === 1) {
				const list = element("ul", {});
				for (const line of note.included) list.append(element("li", {}, line));
				face.append(list);
			}
			const label = layer === 0 ? "See what’s included" : "See an example";
			actions.append(
				element(
					"button",
					{
						type: "button",
						className: "action",
						"aria-label": `${label} for ${note.title}`,
						onClick: () => {
							if (article.dataset.layer === String(layer)) change(layer + 1);
						},
					},
					`${label} +`,
				),
			);
		} else {
			face.append(
				element("h3", {}, note.example.title),
				element("p", {}, note.example.text),
			);
			if (/^https:\/\//i.test(note.example.href || "")) {
				actions.append(
					element(
						"a",
						{
							className: "action",
							href: note.example.href,
							target: "_blank",
							rel: "noopener noreferrer",
						},
						"Open example (new tab) ↗",
					),
				);
			} else {
				actions.append(
					element(
						"button",
						{
							type: "button",
							className: "action",
							onClick: (event) => onInquire(event.currentTarget, note),
						},
						"Ask about this work",
					),
				);
			}
		}
		face.append(actions);
		article.replaceChildren(face);
		if (animate) {
			const leaving = element(
				"div",
				{
					className: "peeling-face",
					"aria-hidden": "true",
					inert: "",
				},
				note.title,
			);
			article.append(leaving);
			leaving.addEventListener("animationend", () => leaving.remove(), {
				once: true,
			});
			face.classList.add("note-face-enter");
		}
		if (moveFocus) {
			title.tabIndex = -1;
			title.focus({ preventScroll: true });
			title.scrollIntoView({
				block: "nearest",
				inline: "nearest",
				behavior: "instant",
			});
		}
	}

	function change(depth) {
		layers.set(note.id, depth);
		render(depth, true);
	}

	render(layers.get(note.id) || 0);
	return article;
}
