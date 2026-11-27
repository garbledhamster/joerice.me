import { createPortfolioVoice } from "./kal-voice.js";

const welcome = "What would you like to do?";

// The tour points to the site title and public tabs within the folder.
const captions = {
	practice: {
		edge: "top",
		link: ".masthead .wordmark",
		title: "How the tour works",
		text: "Let’s practice. I’m pointing to the site title. Press Next and I’ll point to the portfolio tabs. Back revisits a stop. Main menu takes you out of the tour.",
	},
	build: {
		edge: "left",
		link: '.categories [href="#build"]',
		title: "Portfolio tabs",
		text: "The tabs on the left organize Joe’s work by subject. Pick a category, open a note, and you can see what went into the work and go straight to a live example.",
	},
	guide: {
		edge: "bottom",
		link: '.guide [href="#guide"]',
		title: "How-to guides",
		text: "The guides at the bottom show how Joe works through a project. Start with one thing you want someone to do, then plan how to build it and check that it works.",
	},
	work: {
		edge: "right",
		link: '.destinations [href="#work"]',
		title: "Work showcased here",
		text: "The tabs on the right open pages here on the portfolio. Work & Notes has case studies you can read here. There’s also a section for employers and a more personal side of Joe.",
	},
	ourstuff: {
		edge: "top",
		link: '.site-links [href="https://ourstuff.space/"]',
		title: "Ourstuff",
		text: "Ourstuff is Joe’s personal dashboard. Try checking in or keeping a note, then see how Mind, Body, Spirit, and Life organize what you want to work on.",
	},
	classics: {
		edge: "top",
		link: '.site-links [href="https://classics.ourstuff.space/"]',
		title: "The Classics",
		text: "The Classics is Joe’s reading companion. You can explore classic books, try a ten-year reading plan, and keep notes as you read.",
	},
	feelings: {
		edge: "top",
		link: '.site-links [href="https://feelings.ourstuff.space/"]',
		title: "Feelings & Needs",
		text: "Feelings & Needs helps you find words for what you’re feeling and what matters to you. Joe built it around his book. You can read a sample and try a guide.",
	},
	meet: {
		edge: "right",
		link: '.destinations [href="#personal"]',
		title: "Meet Joe",
		text: "Open Personal on the right for Joe’s photos, favorite quotes, and links.",
	},
};
const journeys = [
	{
		label: "Tour Joe’s portfolio",
		stops: [
			"practice",
			"build",
			"guide",
			"work",
			"ourstuff",
			"classics",
			"feelings",
		],
	},
	{ label: "Meet Joe", stops: ["meet"], facing: "target" },
];

export function portfolioNarrationLines() {
	return {
		welcome,
		...Object.fromEntries(
			Object.entries(captions).map(([id, caption]) => [id, caption.text]),
		),
	};
}

export function mountPortfolioTour(app) {
	const root = app.querySelector(".folder");
	if (!root) return;
	const wordmark = root.querySelector(".masthead .wordmark");
	const stops = Object.entries(captions)
		.map(([id, entry]) => {
			const link = root.querySelector(entry.link);
			const target = link?.closest(".folder-tab") ?? link;
			if (!target) return null;
			target.dataset.kalExcerpt = entry.text;
			target.dataset.tourStop = id;
			target.dataset.kalEdge = entry.edge;
			return { id, title: entry.title, target };
		})
		.filter(Boolean);
	if (stops.length !== Object.keys(captions).length) return;

	let guide;
	const voice = createPortfolioVoice((active) => guide?.setVoicing(active));
	let disclosed;
	function reset() {
		if (disclosed?.getAttribute("aria-expanded") === "true") disclosed.click();
		disclosed = undefined;
	}
	function reveal(id) {
		const target = stops.find((stop) => stop.id === id)?.target;
		if (!target) return;
		voice.show(captions[id].text);
		const button = target.querySelector(".tab-toggle");
		const compact = button && target.parentElement.hasAttribute("data-compact");
		if (!compact || disclosed !== button) reset();
		if (compact && button.getAttribute("aria-expanded") === "false") {
			button.click();
			if (button.getAttribute("aria-expanded") === "true") disclosed = button;
		}
	}
	root.addEventListener("click", (event) => {
		if (event.isTrusted && event.target.closest(".tab-toggle"))
			disclosed = undefined;
	});
	function frame(target) {
		return target.matches(".rail > .folder-tab[data-expanded]")
			? target.querySelector(".tab-controls")
			: target;
	}
	function blocked() {
		return Boolean(document.querySelector(".route-sheet[open], .modal.show"));
	}
	function sync() {
		if (blocked()) {
			voice.stop();
			guide?.destroy();
			guide = undefined;
		} else if (!guide && window.AIHelpers) {
			guide = window.AIHelpers.mount({
				root,
				title: "Joe Rice’s portfolio",
				stops,
				tour: {
					menu: "guides",
					pronouns: "he/him",
					welcome,
					voiceControl: voice.button,
					onMenu: () => voice.show(welcome),
					onOpenChange: (open) => {
						if (open) {
							const current = root.querySelector(
								"[data-kal-target][data-tour-stop]",
							);
							voice.show(captions[current?.dataset.tourStop]?.text ?? welcome);
						} else voice.stop();
					},
					launcherPrompt: "Click me!",
					journeys,
					reveal,
					reset,
					frame,
					fullMotion: true,
					motionControl: true,
					avoid: () => [wordmark.getBoundingClientRect()],
				},
			});
		}
	}
	// Native dialogs and account UI take focus and Escape; recreate Kal after they close.
	new MutationObserver(sync).observe(document.body, {
		subtree: true,
		attributes: true,
		attributeFilter: ["open", "class"],
	});
	// A rail may become compact while a stop is active. Reveal the same stop without navigating.
	new MutationObserver((records) => {
		if (!records.some((record) => record.attributeName === "data-compact"))
			return;
		const current = root.querySelector("[data-kal-target][data-tour-stop]");
		if (current) reveal(current.dataset.tourStop);
	}).observe(root, {
		subtree: true,
		attributes: true,
		attributeFilter: ["data-compact"],
	});

	const script = document.createElement("script");
	script.src = "/assets/vendor/ai-helpers-presentation.js?v=c8783699";
	script.async = true;
	script.addEventListener("load", sync, { once: true });
	document.head.append(script);
}
