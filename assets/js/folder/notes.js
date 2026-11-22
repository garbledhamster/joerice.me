import { createElement } from "../core/dom.js";
import { isPortfolioExampleAddress } from "./content-store.js";

function element(tag, attrs, text) {
	return createElement(tag, attrs, text === undefined ? [] : [text]);
}

const peelFrames = [
	{ transform: "perspective(500px) translateY(0) rotateX(0) rotateZ(0)" },
	{
		offset: 0.32,
		transform:
			"perspective(500px) translateY(-9px) rotateX(28deg) rotateZ(-2deg)",
	},
	{
		opacity: 0,
		transform:
			"perspective(500px) translateY(-88px) rotateX(58deg) rotateZ(-12deg)",
	},
];

export function createNote(note, layers, onInquire, motion) {
	const article = element("article", {
		className: "note",
		id: `note-${note.id}`,
		"aria-labelledby": `note-${note.id}-title`,
	});
	let animation;

	function render(layer, moveFocus = false) {
		animation?.cancel();
		const previous = article.firstElementChild;
		const animate = previous && !motion.matches;
		const restoring = animate && layer < Number(article.dataset.layer);
		const oldHeight = animate && previous.offsetHeight;
		article.dataset.layer = layer;
		const face = element("div", { className: "face", "data-layer": layer });
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
			if (isPortfolioExampleAddress(note.example.href)) {
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
			let leaving;
			if (!restoring) {
				leaving = previous.cloneNode(true);
				leaving.classList.add("peeling-face");
				leaving.inert = true;
				leaving.setAttribute("aria-hidden", "true");
				for (const control of leaving.querySelectorAll("[id]"))
					control.removeAttribute("id");
				leaving.style.blockSize = `${oldHeight}px`;
				article.append(leaving);
			}
			const run = (leaving || face).animate(peelFrames, {
				duration: restoring ? 330 : 420,
				direction: restoring ? "reverse" : "normal",
				easing: "cubic-bezier(.35, .05, .65, .95)",
			});
			animation = run;
			const stopForReducedMotion = () => {
				if (motion.matches) run.cancel();
			};
			const clean = () => {
				leaving?.remove();
				motion.removeEventListener("change", stopForReducedMotion);
				if (animation === run) animation = undefined;
			};
			motion.addEventListener("change", stopForReducedMotion);
			run.finished.then(clean, clean);
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
