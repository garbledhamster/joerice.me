const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { mkdir, readFile } = require("node:fs/promises");
const { resolve, sep, extname } = require("node:path");
const { chromium } = require("playwright");

const root = resolve(__dirname, "..");
const captures = process.env.WORKING_FOLDER_CAPTURES;
const mime = {
	".html": "text/html",
	".css": "text/css",
	".js": "text/javascript",
	".json": "application/json",
	".yaml": "text/plain",
	".jpg": "image/jpeg",
};
const server = createServer(async (request, response) => {
	try {
		const uri = new URL(request.url, "http://127.0.0.1");
		const path = resolve(
			root,
			"." +
				decodeURIComponent(
					uri.pathname.endsWith("/")
						? `${uri.pathname}index.html`
						: uri.pathname,
				),
		);
		if (!path.startsWith(root + sep)) return response.writeHead(403).end();
		const contents = await readFile(path);
		response
			.writeHead(200, {
				"Content-Type": mime[extname(path)] || "application/octet-stream",
			})
			.end(contents);
	} catch {
		response.writeHead(404).end();
	}
});

function folderTab(page, id) {
	return page.locator(`.tab-rail:not(.tab-measure) .tab-link[href="#${id}"]`);
}

async function openFolderTab(page, id) {
	const link = folderTab(page, id);
	if (!(await link.isVisible()))
		await link.locator("..").locator(".tab-toggle").click();
	await link.click();
}

async function settlePaper(note) {
	await note.evaluate((card) => {
		for (const animation of card.getAnimations({ subtree: true }))
			animation.finish();
	});
	await note.locator(".turning-out").waitFor({ state: "detached" });
}

async function checkMotion(page, index, viewport) {
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto(index);
	const book = page.locator("#note-book");
	await book.waitFor({ state: "attached" });
	const board = folderTab(page, "build");
	const tabMotion = await board.evaluate((link) => {
		const old = document.querySelector(
			'.categories a[aria-current="location"]',
		);
		const compact = link.closest(".tab-rail").hasAttribute("data-compact");
		link.click();
		return [old, link].map((item) => {
			const tab = compact
				? item.parentElement.querySelector(".tab-toggle")
				: item;
			return tab
				.getAnimations()
				.flatMap((animation) =>
					animation.effect.getKeyframes().map((frame) => frame.transform),
				);
		});
	});
	assert(tabMotion[0].some((frame) => frame?.includes("translateY(6px)")));
	assert(tabMotion[1].some((frame) => frame?.includes("translateY(-7px)")));
	await page.emulateMedia({ reducedMotion: "reduce" });
	const tabFramesWithReduce = await folderTab(page, "security").evaluate(
		(link) => {
			link.click();
			const tab = link.closest(".tab-rail").hasAttribute("data-compact")
				? link.parentElement.querySelector(".tab-toggle")
				: link;
			return tab.getAnimations()[0].effect.getKeyframes();
		},
	);
	assert(
		tabFramesWithReduce.some((frame) => frame.transform?.includes("rotateY")),
	);
	await openFolderTab(page, "build");
	const panel = page.locator('[data-category="build"]');
	const measure = () =>
		panel
			.locator(".note")
			.evaluateAll((notes) =>
				notes.map((note) => [
					note.offsetLeft,
					note.offsetTop,
					note.offsetWidth,
					note.offsetHeight,
					note.classList.contains("note-wide"),
				]),
			);
	const dimensions = await measure();
	const squareWidth = Math.min(dimensions[0][2], dimensions[0][3]);
	assert(
		dimensions.every(([, , width, height]) =>
			[width, height].includes(squareWidth),
		),
		"All notes use one shared square unit",
	);
	const boardWidth = await panel
		.locator(".notes")
		.evaluate((el) => el.clientWidth);
	const wide = boardWidth >= 2 * squareWidth;
	const rows = Map.groupBy(dimensions, ([, top]) => top);
	for (const row of rows.values()) {
		const [[left]] = row;
		const [lastLeft, , lastWidth] = row.at(-1);
		assert(Math.abs(left - (boardWidth - lastLeft - lastWidth)) <= 2);
	}
	if (viewport.width <= 720) {
		assert(
			dimensions.every(([, , width, height]) => width === height),
			"Every phone note is a square with the doubled landscape height",
		);
		assert(
			dimensions.every(
				([, , width, height]) =>
					width === dimensions[0][2] && height === dimensions[0][3],
			),
			"Phone notes keep one fixed square size",
		);
	} else {
		for (const [
			position,
			[, , width, height, becomesWide],
		] of dimensions.entries()) {
			const horizontal = becomesWide || (position % 2 === 0 && wide);
			const vertical = !becomesWide && position % 2 === 0 && !wide;
			assert(Math.abs(width - squareWidth * (horizontal ? 2 : 1)) <= 1);
			assert(Math.abs(height - squareWidth * (vertical ? 2 : 1)) <= 1);
		}
	}
	assert.equal(
		await page
			.locator(".track")
			.evaluate((el) => el.scrollWidth - el.clientWidth),
		0,
	);
	assert.equal(
		await panel.evaluate((el) => el.scrollWidth - el.clientWidth),
		0,
	);
	assert.equal(
		await page.evaluate(
			() => document.documentElement.scrollWidth - innerWidth,
		),
		0,
	);

	// Pause a real card activation while the paper is curling.
	await book.locator(".note-copy h2").click();
	assert.equal(await book.getAttribute("data-layer"), "1");
	const turn = await book.evaluate((note) => {
		for (const animation of note.getAnimations({ subtree: true })) {
			animation.pause();
			animation.currentTime = 365;
		}
		const sheet = note.querySelector(".paper-peel");
		return {
			inert: sheet.inert,
			text: sheet.querySelector("h2").textContent,
			hinges: [...sheet.querySelectorAll(".paper-hinge")].map((hinge) => ({
				transform: getComputedStyle(hinge).transform,
				origin: getComputedStyle(hinge).transformOrigin,
			})),
			tip: sheet
				.querySelector(
					".paper-hinge > .paper-hinge > .paper-hinge .paper-slice",
				)
				.getBoundingClientRect().bottom,
			bottom: note.getBoundingClientRect().bottom,
			shadow: Number(
				getComputedStyle(note.querySelector(".paper-shadow")).opacity,
			),
		};
	});
	assert.equal(turn.text, "A website for your book");
	assert.equal(turn.inert, true);
	assert.equal(turn.hinges.length, 3);
	assert(turn.hinges.every((hinge) => hinge.transform.startsWith("matrix3d(")));
	assert(turn.hinges.every((hinge) => hinge.origin.split(" ")[1] === "0px"));
	assert(
		turn.tip < turn.bottom - 12,
		"The bent paper visibly reveals the layer beneath",
	);
	assert(turn.shadow > 0.5, "The paper casts a shadow on the layer beneath");
	assert.equal(
		await book.evaluate((note) => {
			const hinge = note.querySelector(".paper-hinge");
			const animation = hinge.getAnimations()[0];
			animation.currentTime = 520;
			return (
				hinge.getBoundingClientRect().top <
				note.getBoundingClientRect().top - 40
			);
		}),
		true,
		"The paper travels upward after bending",
	);
	if (captures && viewport.width === 1440)
		await page.screenshot({ path: resolve(captures, "midflip-1440.png") });
	assert.deepEqual(await measure(), dimensions);
	const ghost = book.locator(".turning-out");
	assert.equal(await ghost.getAttribute("inert"), "");
	assert.equal(await ghost.locator("[id]").count(), 0);
	await settlePaper(book);
	const next = book.getByRole("button", { name: /^See an example/ });
	await next.focus();
	await page.keyboard.press("Enter");
	assert.equal(await book.getAttribute("data-layer"), "2");
	assert.equal(await book.locator(".paper-hinge").count(), 3);
	assert.equal(await page.locator(".preview-motion").count(), 0);
	await settlePaper(book);
	assert.deepEqual(await measure(), dimensions);

	const square = panel.locator(".note").nth(1);
	await square.locator("button.action").click();
	await square.locator(".turning-out").waitFor({ state: "detached" });
	const copy = square.locator(".note-copy");
	await copy.focus();
	const scrollable = await copy.evaluate((el) => {
		el.scrollTop = el.scrollHeight;
		return {
			scrolled: el.scrollTop > 0,
			horizontalOverflow: el.scrollWidth > el.clientWidth,
			verticalOverflow: getComputedStyle(el).overflowY,
		};
	});
	assert.equal(scrollable.horizontalOverflow, false);
	assert.equal(scrollable.verticalOverflow, "auto");
	assert(await square.locator(".back").isVisible());
	assert.equal(await square.locator(".back").innerText(), "");
	assert.equal(await square.locator(".back svg path").count(), 1);
	assert.deepEqual(await measure(), dimensions);

	await page.emulateMedia({ reducedMotion: "no-preference" });
	const returning = await book
		.getByRole("button", { name: /^Back one layer/ })
		.evaluate((button) => {
			const note = button.closest(".note");
			button.click();
			const sheet = note.querySelector(".paper-peel");
			return {
				text: sheet.querySelector("h2").textContent,
				direction: sheet
					.querySelector(".paper-hinge")
					.getAnimations()[0]
					.effect.getTiming().direction,
			};
		});
	assert.deepEqual(returning, {
		text: "What’s included",
		direction: "reverse",
	});
	await page.emulateMedia({ reducedMotion: "reduce" });
	await ghost.waitFor({ state: "detached" });
	if (viewport.width <= 390) {
		await page.evaluate(async () => {
			const { createNote } = await import("/assets/js/folder/notes.js");
			const card = createNote(
				{
					id: "layout-fit",
					title:
						"A deliberately long project title that should adapt to the phone note shape",
					included: Array.from(
						{ length: 14 },
						(_, index) =>
							`A longer included detail line for scrolling check ${index + 1}`,
					),
					example: { title: "Example", text: "Example", kind: "Example" },
				},
				new Map(),
				() => {},
			);
			document
				.querySelector('.panel[data-category="build"] .notes')
				.append(card);
			await document.fonts.ready;
			await new Promise(requestAnimationFrame);
			await new Promise(requestAnimationFrame);
		});
		const fitted = page.locator("#note-layout-fit");
		await page.waitForFunction(() =>
			document
				.querySelector("#note-layout-fit")
				?.classList.contains("note-wide"),
		);
		const shape = await fitted.evaluate((card) => ({
			width: card.offsetWidth,
			height: card.offsetHeight,
			fontSize: getComputedStyle(card.querySelector("h2")).fontSize,
			inlineFontSize: card.querySelector("h2").style.fontSize,
			titleWidth: card.querySelector("h2").clientWidth,
			panelOverflow:
				card.closest(".panel").scrollWidth - card.closest(".panel").clientWidth,
			pageOverflow: document.documentElement.scrollWidth - innerWidth,
			lines: (() => {
				const range = document.createRange();
				range.selectNodeContents(card.querySelector("h2"));
				return new Set(
					Array.from(range.getClientRects()).map((rect) =>
						Math.round(rect.top),
					),
				).size;
			})(),
		}));
		assert(
			Math.abs(shape.width - shape.height * (viewport.width <= 720 ? 1 : 2)) <=
				1,
		);
		assert(
			shape.lines <= 2,
			`The long title scales down to fit two lines: ${JSON.stringify(shape)}`,
		);
		assert.equal(shape.panelOverflow, 0);
		assert.equal(shape.pageOverflow, 0);
		await fitted.click();
		await fitted.locator(".turning-out").waitFor({ state: "detached" });
		const fittedCopy = fitted.locator(".note-copy");
		await fittedCopy.evaluate((el) => {
			el.scrollTop = el.scrollHeight;
		});
		assert(
			await fittedCopy.evaluate((el) => el.scrollTop > 0),
			"Long note details remain internally scrollable in the fixed phone square",
		);
		const beforeResize = page.viewportSize();
		await page.setViewportSize({
			width: viewport.width === 320 ? 340 : viewport.width - 20,
			height: beforeResize.height,
		});
		await page.waitForFunction(() => {
			const title = document.querySelector("#note-layout-fit h2");
			if (!title) return false;
			const range = document.createRange();
			range.selectNodeContents(title);
			return (
				new Set(
					Array.from(range.getClientRects()).map((rect) =>
						Math.round(rect.top),
					),
				).size <= 2
			);
		});
		assert.equal(
			await page.evaluate(
				() => document.documentElement.scrollWidth - innerWidth,
			),
			0,
		);
		await page.setViewportSize(beforeResize);
	}
	console.log(
		`${viewport.width}px fixed-size centered cards, flip, and scrolling passed`,
	);
}

async function checkHorizontalTabSeams(page) {
	for (const [rail, edge, tabEdge, count] of [
		["site-links", "top", "bottom", 3],
		["guide", "bottom", "top", 1],
	]) {
		const { gaps, insets } = await page
			.locator(`.${rail} :is(.tab-link, .tab-toggle):visible`)
			.evaluateAll(
				(tabs, [edge, tabEdge]) => {
					const frame = document
						.querySelector(".whiteboard")
						.getBoundingClientRect();
					const nav = tabs[0]?.closest("nav").getBoundingClientRect();
					return {
						gaps: tabs.map(
							(tab) => frame[edge] - tab.getBoundingClientRect()[tabEdge],
						),
						insets: [nav?.left - frame.left, frame.right - nav?.right],
					};
				},
				[edge, tabEdge],
			);
		assert(gaps.length >= count, `The ${rail} tabs are present`);
		assert(
			gaps.every((gap) => Math.abs(gap) < 1),
			`${rail} tabs meet the frame. Gaps in CSS pixels: ${gaps.join(", ")}`,
		);
		assert(
			insets.every((inset) => inset >= 9 && inset <= 16),
			`${rail} sits inside the rounded frame. Insets: ${insets.join(", ")}`,
		);
	}
}

async function checkCompactTabs(page, index) {
	const viewport = page.viewportSize();
	await page.setViewportSize({ width: 320, height: 420 });
	await page.goto(`${index}#build`);
	const home = page.getByRole("heading", { name: "Build", exact: true });
	await home.waitFor();
	await page.evaluate(() => document.fonts.ready);
	await checkHorizontalTabSeams(page);
	const panel = page.locator('.panel[data-category="build"]');
	const action = panel
		.locator("#note-book")
		.getByRole("button", { name: /See what’s included/ });
	await action.scrollIntoViewIfNeeded();
	const initialScroll = await panel.evaluate((el) => el.scrollTop);
	assert(initialScroll > 0, "The short board scrolls to the book action");
	if (captures)
		await page.screenshot({ path: resolve(captures, "short-rails.png") });
	for (const [id, name] of [
		["personal", "Personal"],
		["hire", "Hire me"],
		["employers", "For employers"],
		["work", "Work & Notes"],
	]) {
		const toggle = page.getByRole("button", { name, exact: true });
		const arrow = page.getByRole("link", { name: `Open ${name}`, exact: true });
		const dialog = page.getByRole("dialog", { name, exact: true });
		const { x, y, width, height } = await toggle.boundingBox();
		const center = [x + width / 2, y + height / 2];
		await page.touchscreen.tap(...center);
		await arrow.waitFor();
		assert(
			await toggle.evaluate(
				(button, [x, y]) => button.contains(document.elementFromPoint(x, y)),
				center,
			),
			`${name}'s number remains the toggle at the original tap point`,
		);
		const note = await action.boundingBox();
		for (const control of [toggle, arrow]) {
			const tab = await control.boundingBox();
			assert(
				tab.x >= note.x + note.width ||
					tab.y >= note.y + note.height ||
					tab.y + tab.height <= note.y,
				`${name}'s disclosure leaves the book action clear`,
			);
		}
		if (captures && id === "personal")
			await page.screenshot({
				path: resolve(captures, "short-personal.png"),
			});
		await page.touchscreen.tap(...center);
		await arrow.waitFor({ state: "hidden" });
		assert.equal(new URL(page.url()).hash, "#build");
		assert.equal(await toggle.getAttribute("aria-expanded"), "false");
		await toggle.press("Space");
		await arrow.waitFor();
		await page.keyboard.press("Escape");
		assert(await toggle.evaluate((el) => el === document.activeElement));
		await toggle.press("Space");
		if (id === "personal") await arrow.tap();
		else {
			await page.keyboard.press("Tab");
			assert(await arrow.evaluate((el) => el === document.activeElement));
			await page.keyboard.press("Enter");
		}
		await dialog.waitFor();
		assert.equal(new URL(page.url()).hash, `#${id}`);
		await dialog.locator("[data-close]").click();
		await dialog.waitFor({ state: "hidden" });
		assert(await toggle.evaluate((el) => el === document.activeElement));
	}

	const companion = page.getByRole("button", { name: "Feelings & Needs" });
	await companion.tap();
	const companionArrow = page.getByRole("link", {
		name: "Open Feelings & Needs",
	});
	assert(
		await companionArrow.evaluate((link) => {
			const rail = link.closest("nav").getBoundingClientRect();
			const arrow = link.getBoundingClientRect();
			return arrow.left >= rail.left - 1 && arrow.right <= rail.right + 1;
		}),
		"The open arrow scrolls into view inside the top rail",
	);
	await page.keyboard.press("Escape");
	assert.equal(await panel.evaluate((el) => el.scrollTop), initialScroll);
	assert(
		await page.evaluate(
			() => document.documentElement.scrollWidth === innerWidth,
		),
	);
	await page.setViewportSize(viewport);
	console.log(
		"320×420: compact tab touch, keyboard, focus return, and board scroll passed.",
	);
}

async function smoke(browser, fixture, viewport) {
	const mobile = viewport.width < 600;
	const context = await browser.newContext({
		viewport,
		isMobile: mobile,
		hasTouch: mobile,
		reducedMotion: "reduce",
		ignoreHTTPSErrors: true,
	});
	await context.addInitScript({
		content: fixture,
	});
	await context.addInitScript(() => {
		window.grecaptcha = {
			ready: (run) => run(),
			execute: async () => "working-folder-test-token",
		};
	});
	await context.route(
		/https:\/\/(?:www\.gstatic\.com\/firebasejs|www\.google\.com\/recaptcha|www\.instagram\.com\/embed)/,
		(route) => route.abort(),
	);
	await context.route(
		/https:\/\/[^/]*(formspree|firestore|firebaseapp)\./,
		(route) => route.abort(),
	);
	const page = await context.newPage();
	page.setDefaultTimeout(12000);
	const proofSizes = viewport.width === 1440 || viewport.width === 390;
	const snap = async (state) => {
		if (!captures || !proofSizes) return;
		await page.screenshot({
			path: resolve(captures, `${state}-${viewport.width}.jpg`),
			quality: 85,
		});
	};
	const errors = [];
	page.on("pageerror", (error) => errors.push(error));
	try {
		const index = `http://127.0.0.1:${server.address().port}/`;
		if (viewport.width === 390) await checkCompactTabs(page, index);
		await checkMotion(page, index, viewport);
		if (viewport.width === 390) await checkMobileGestures(context, page, index);
		await page.goto(index, { waitUntil: "domcontentloaded" });
		await page
			.locator(".panel:not([inert]) h1")
			.filter({ hasText: /^About$/ })
			.waitFor({ state: "attached" });
		await page.evaluate(() => document.fonts.ready);
		await checkHorizontalTabSeams(page);
		if (proofSizes) {
			await page.locator("#note-look-around").waitFor();
			await snap("about");
		}
		await openFolderTab(page, "build");
		const book = page.locator("#note-book");
		await book.waitFor();
		assert.equal(await page.evaluate(() => innerWidth), viewport.width);
		const hire = folderTab(page, "hire");
		assert.equal(await hire.count(), 1);
		assert.equal(
			await page.locator(".masthead [data-route='hire']").count(),
			0,
		);
		const noteAction = await book.locator(".action").boundingBox();
		assert(
			noteAction &&
				noteAction.y >= 0 &&
				noteAction.y + noteAction.height <= viewport.height,
		);
		if (captures)
			await page.screenshot({
				path: resolve(captures, `build-${viewport.width}.jpg`),
				quality: 82,
			});
		await book.locator("button.action").click();
		await book.locator(".turning-out").waitFor({ state: "detached" });
		assert.equal(await book.getAttribute("data-layer"), "1");
		await snap("included");
		await book.locator("button.action").click();
		await book.locator(".turning-out").waitFor({ state: "detached" });
		assert.equal(await book.getAttribute("data-layer"), "2");
		const footer = await book.locator(".actions").boundingBox();
		assert(
			footer.height <= 32,
			"The note footer makes more room for body text",
		);
		await snap("example");
		assert.equal(
			await book.locator("a.action").getAttribute("target"),
			"_blank",
		);
		await openFolderTab(page, "systems");
		await openFolderTab(page, "build");
		assert.equal(await book.getAttribute("data-layer"), "2");
		await book.locator(".back").click();
		assert.equal(await book.getAttribute("data-layer"), "1");

		await openFolderTab(page, "hire");
		await page.locator("dialog[open] #contactForm").waitFor();
		assert.equal(new URL(page.url()).hash, "#hire");
		await page.keyboard.press("Escape");
		await page.locator("dialog[open]").waitFor({ state: "hidden" });
		assert.equal(
			await hire.evaluate((node) => document.activeElement === node),
			true,
		);
		assert.equal(await book.getAttribute("data-layer"), "1");
		await page.goForward();
		await page.locator("dialog[open] #contactForm").waitFor();
		const sheetTitle = page.locator("#folder-sheet-title");
		const exit = page.getByRole("button", { name: "Close panel", exact: true });
		assert(
			await exit.evaluate(
				(el) => el.previousElementSibling?.id === "folder-sheet-title",
			),
		);
		assert(
			await sheetTitle.evaluate((el) => {
				const title = el.getBoundingClientRect();
				const sheet = el.closest("dialog").getBoundingClientRect();
				return (
					getComputedStyle(el).textAlign === "center" &&
					Math.abs(
						title.left + title.width / 2 - sheet.left - sheet.width / 2,
					) <= 8
				);
			}),
			"The sheet heading is centered",
		);
		await page.getByLabel("Name (required)").click();
		assert(await exit.isVisible(), "Inside clicks leave the panel open");
		if (mobile) await page.touchscreen.tap(2, 2);
		else {
			const titleBounds = await sheetTitle.boundingBox();
			await page.mouse.move(titleBounds.x + 5, titleBounds.y + 5);
			await page.mouse.down();
			await page.mouse.move(2, 2);
			await page.mouse.up();
			assert(await exit.isVisible(), "Dragging out of the panel keeps it open");
			await page.mouse.click(2, 2);
		}
		await page.locator("dialog[open]").waitFor({ state: "hidden" });
		assert.equal(new URL(page.url()).hash, "#build");
		assert(await hire.evaluate((el) => el === document.activeElement));

		for (const [id, expected] of [
			["work", "Work & Notes"],
			["employers", "For employers"],
			["personal", "Personal"],
			["guide", "How to build an idea"],
		]) {
			await openFolderTab(page, id);
			await page.locator("dialog[open]").waitFor();
			assert.equal(
				await page.locator("#folder-sheet-title").textContent(),
				expected,
			);
			if (id === "work") await exerciseArchive(page, index, snap);
			else await snap(id);
			await page.locator("[data-close]").click();
			await page.locator("dialog[open]").waitFor({ state: "hidden" });
		}
		await openFolderTab(page, "build");
		await openFolderTab(page, "hire");
		await page.locator("[data-close]").evaluate((control) => {
			control.click();
			control.click();
		});
		await page.locator("dialog[open]").waitFor({ state: "hidden" });
		assert.equal(new URL(page.url()).hash, "#build");

		for (const link of await page.locator(".site-links .tab-link").all()) {
			assert.equal(await link.getAttribute("target"), "_blank");
			assert.match(await link.getAttribute("rel"), /\bnoopener\b/);
		}
		const companion = page.locator(".site-links .folder-tab").first();
		const companionLink = companion.locator(".tab-link");
		if (mobile) {
			const number = companion.locator(".tab-toggle");
			await number.focus();
			await number.press("Enter");
			assert.equal(await number.getAttribute("aria-expanded"), "true");
			await checkHorizontalTabSeams(page);
			assert.equal(
				await companion
					.getByRole("link", { name: "Open Ourstuff" })
					.getAttribute("href"),
				"https://ourstuff.space/",
			);
			await number.press("Enter");
			assert.equal(await number.getAttribute("aria-expanded"), "false");
			await number.tap();
		}
		if (proofSizes) {
			const companionUrl = "https://ourstuff.space/";
			await context.route(companionUrl, (route) =>
				route.fulfill({ body: "Companion site fixture" }),
			);
			const popupReady = page.waitForEvent("popup");
			await companionLink.click();
			const popup = await popupReady;
			await popup.waitForURL(companionUrl);
			assert.equal(new URL(page.url()).hash, "#build");
			await popup.close();
			await context.unroute(companionUrl);
		}
		await page.goto(`${index}?static=1#edit-content`);
		await page.locator('.panel[data-category="about"]:not([inert])').waitFor();
		assert.equal(
			await page
				.locator("#loginButton, .folder-editor, #addPortfolioBtn")
				.count(),
			0,
		);
		await openFolderTab(page, "guide");
		const guide = page.locator('dialog[open] [data-sheet="guide"]');
		await guide
			.getByRole("link", { name: /Find and read a sample page/ })
			.waitFor();
		assert(
			(await guide.locator("[data-folder-copy]").allTextContents()).every(
				(text) => text.trim().length > 50,
			),
		);
		await page.getByRole("button", { name: "Close panel" }).click();
		await page.locator("dialog[open]").waitFor({ state: "hidden" });

		await exerciseQuote(page, snap);
		const categories = [
			"about",
			"build",
			"security",
			"systems",
			"automation",
			"ai",
			"games",
			"writing",
		];
		const sheets = ["hire", "employers", "work", "personal", "guide"];
		for (const [ids, selector] of [
			[categories, ".panel:not([inert])"],
			[sheets, "dialog[open] [data-sheet]:not([hidden])"],
		]) {
			for (const id of ids) {
				await page.goto(`${index}#${id}`);
				await page.reload({ waitUntil: "domcontentloaded" });
				await page.locator(selector).waitFor();
				assert.equal(
					await page
						.locator(selector)
						.evaluate((node) => node.dataset.category || node.dataset.sheet),
					id,
				);
				if (categories.includes(id) && !["about", "build"].includes(id))
					await snap(id);
			}
		}
		await page.goto(`${index}index.html#/hire`);
		await page.locator("dialog[open] #contactForm").waitFor();
		await page.goto(`${index}hire.html`);
		await page.locator("dialog[open] #contactForm").waitFor();
		assert.equal(new URL(page.url()).hash, "#hire");
		await page.goto(`${index}index.html#portfolio`);
		await page.locator("dialog[open] #q").waitFor();
		for (const [fragment, selector] of [
			["contact", "#contactForm"],
			["blog", "#q"],
			["gallery", "#personal-photos"],
			["quotes", "#quotesSection"],
			["links", "#linksSection"],
			["products", "[data-sheet=products]"],
		]) {
			await page.goto(`${index}#${fragment}`);
			await page.locator(`dialog[open] ${selector}`).waitFor();
		}
		await page.goto(`${index}#services`);
		await page.locator('.panel[data-category="build"]:not([inert])').waitFor();
		if (proofSizes) await exerciseEvidence(page, index);
		await page.addInitScript(() => {
			if (new URLSearchParams(location.search).has("offline"))
				window.testFailPostReads = true;
		});
		await page.goto(`${index}?offline=1#build`);
		await page
			.locator('.panel[data-category="build"]:not([inert]) #note-book')
			.waitFor();
		await page.goto(`${index}?offline=1#edit-services`);
		assert.equal(
			await page.locator("dialog[open], .serviceEditor, #loginModal").count(),
			0,
		);
		await openFolderTab(page, "hire");
		await page.locator("dialog[open] #contactForm").waitFor();
		assert.deepEqual(
			errors.map((error) => error.message),
			[],
		);
		console.log(
			viewport.width +
				"×" +
				viewport.height +
				": folder, note return, quote retry, and direct addresses passed.",
		);
	} finally {
		await context.close();
	}
}

async function checkMobileGestures(context, page, index) {
	await page.goto(`${index}#build`);
	await page.reload({ waitUntil: "domcontentloaded" });
	const book = page.locator("#note-book");
	await book.waitFor();
	const cdp = await context.newCDPSession(page);
	try {
		const action = await book.locator("button.action").boundingBox();
		const send = (type, touchPoints) =>
			cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
		const drag = async (x, y, dx, dy) => {
			await send("touchStart", [{ x, y }]);
			for (let step = 1; step <= 12; step++) {
				await page.evaluate(() => new Promise(requestAnimationFrame));
				await send("touchMove", [
					{ x: x + (dx * step) / 12, y: y + (dy * step) / 12 },
				]);
			}
			await send("touchEnd", []);
		};
		await drag(action.x + 25, action.y + 15, 0, -145);
		await page.waitForFunction(
			() =>
				document.querySelector('.panel[data-category="build"]').scrollTop > 20,
		);
		assert.equal(await book.getAttribute("data-layer"), "0");
		assert.equal(await page.locator("#folder-category").inputValue(), "build");
		const channel = page.locator("#note-channel");
		await channel.locator("button.action").tap();
		await channel.locator(".turning-out").waitFor({ state: "detached" });
		const copy = channel.locator(".note-copy");
		await copy.scrollIntoViewIfNeeded();
		const body = await copy.boundingBox();
		const copyOverflows = await copy.evaluate(
			(el) => el.scrollHeight > el.clientHeight,
		);
		await drag(body.x + body.width / 2, body.y + body.height - 6, 0, -48);
		if (copyOverflows)
			await page.waitForFunction(
				() => document.querySelector("#note-channel .note-copy").scrollTop > 0,
			);
		assert.equal(await channel.getAttribute("data-layer"), "1");
		await channel.locator(".back").tap();
		assert.equal(await channel.getAttribute("data-layer"), "0");
		const board = await page.locator(".track").boundingBox();
		await drag(
			board.x + board.width - 12,
			board.y + board.height / 2,
			-board.width * 0.75,
			0,
		);
		assert.equal(new URL(page.url()).hash, "#build");
		assert.equal(
			await page.locator(".track").evaluate((el) => el.scrollLeft),
			0,
		);
		await page.locator("#folder-category").selectOption("security");
		await page
			.locator('.panel[data-category="security"]:not([inert])')
			.waitFor();
		assert.equal(new URL(page.url()).hash, "#security");
	} finally {
		await cdp.detach();
	}
}

async function exerciseArchive(page, index, snap) {
	const query = page.locator("#q");
	const result = page.getByRole("button", { name: /^Editable test post/ });
	await page.locator("#entryGrid .postTitleButton").first().waitFor();
	await snap("work");
	await query.fill("nothing matches this query");
	await page.getByText("No posts match.", { exact: false }).waitFor();
	await snap("work-empty");
	await page.getByRole("button", { name: "Clear search and filters" }).click();
	assert.equal(await query.inputValue(), "");
	await query.fill("editable test post");
	await result.scrollIntoViewIfNeeded();
	const sheet = page.locator("dialog[open]");
	const resultTop = await sheet.evaluate((node) => node.scrollTop);
	await result.click();
	await page
		.getByText("This post exists so the browser test", { exact: false })
		.waitFor();
	await page.getByRole("button", { name: "Back to results" }).click();
	assert.equal(await query.inputValue(), "editable test post");
	assert(
		await result.evaluate((control) => document.activeElement === control),
	);
	assert.equal(await sheet.evaluate((node) => node.scrollTop), resultTop);

	await result.click();
	await page.getByRole("link", { name: "Direct link to this post" }).click();
	await page
		.locator("#linkedPostTitle")
		.getByText("Editable test post", { exact: true })
		.waitFor();
	await page.getByRole("link", { name: "Back to results" }).click();
	assert.equal(await query.inputValue(), "editable test post");
	assert(
		await result.evaluate((control) => document.activeElement === control),
	);

	await page.goto(`${index}#work/0008`);
	await page.reload({ waitUntil: "domcontentloaded" });
	await page
		.locator("#linkedPostTitle")
		.getByText("Helping People Get Back to Work", { exact: true })
		.waitFor();
	await page
		.locator("#linkedPostArticle.is-open .postInlineBody p")
		.first()
		.waitFor();
	await checkContrast(
		page.locator("#linkedPostArticle .postInlineBody p").first(),
	);
	await snap("work-detail");
	await page.getByRole("link", { name: "Back to results" }).click();
	await query.waitFor();
	await page.locator("#refreshPostsBtn").click();
	await query.fill("editable test post");
	await result.waitFor();
}

async function exerciseEvidence(page, index) {
	let count = 0;
	for (const category of [
		"about",
		"build",
		"security",
		"systems",
		"automation",
		"ai",
		"games",
		"writing",
	]) {
		await page.goto(`${index}#${category}`);
		const panel = page.locator(
			`.panel[data-category="${category}"]:not([inert])`,
		);
		await panel.locator(".note").first().waitFor();
		for (const note of await panel.locator(".note").all()) {
			count++;
			await note.locator("button.action").evaluate((button) => button.click());
			await settlePaper(note);
			assert((await note.locator(".face li").count()) > 0);
			await note.locator("button.action").evaluate((button) => button.click());
			await settlePaper(note);
			assert((await note.locator(".face h2").textContent()).trim());
			const target = (await note.locator("a.action").count())
				? await note.locator("a.action").getAttribute("href")
				: "";
			if (target.startsWith("/examples/")) {
				const [popup] = await Promise.all([
					page.waitForEvent("popup"),
					note.locator("a.action").click(),
				]);
				const hash = new URL(target, index).hash;
				const workedExample = hash
					? popup.locator(`${hash} details summary`)
					: popup.locator("details summary").first();
				await workedExample.click();
				assert(
					(await workedExample.locator("..").getAttribute("open")) !== null,
				);
				await popup.close();
				assert.equal(await note.getAttribute("data-layer"), "2");
			}
			await note.locator("button.back").evaluate((button) => button.click());
			await settlePaper(note);
			await note.locator("button.back").evaluate((button) => button.click());
			await settlePaper(note);
			assert.equal(await note.getAttribute("data-layer"), "0");
		}
	}
	assert.equal(count, 19);
	await page.goto(`${index}#employers`);
	for (const [key, title] of [
		["0008", "Helping People Get Back to Work"],
		["0010", "Making Repeated Work Easier"],
		["0017", "Building Feelings and Needs, my current project"],
	]) {
		await page
			.locator(`dialog[open] [data-sheet="employers"] a[href="#work/${key}"]`)
			.click();
		await page
			.locator("#linkedPostTitle")
			.getByText(title, { exact: true })
			.waitFor();
		await page
			.locator("#linkedPostArticle.is-open .postInlineBody p")
			.first()
			.waitFor();
		await page.goto(`${index}#employers`);
	}
}

async function checkContrast(locator) {
	const ratio = await locator.evaluate((node) => {
		const luminance = (color) => {
			const [r, g, b] = color
				.match(/[\d.]+/g)
				.slice(0, 3)
				.map((channel) => {
					const srgb = Number(channel) / 255;
					return srgb <= 0.04045
						? srgb / 12.92
						: ((srgb + 0.055) / 1.055) ** 2.4;
				});
			return 0.2126 * r + 0.7152 * g + 0.0722 * b;
		};
		let parent = node;
		let background;
		do {
			background = getComputedStyle(parent).backgroundColor;
			parent = parent.parentElement;
		} while (parent && background.startsWith("rgba("));
		const foreground = luminance(getComputedStyle(node).color);
		const ground = luminance(background);
		return (
			(Math.max(foreground, ground) + 0.05) /
			(Math.min(foreground, ground) + 0.05)
		);
	});
	assert(ratio >= 4.5, `Text contrast ${ratio.toFixed(2)}:1 is too low`);
}

async function exerciseQuote(page, snap) {
	await openFolderTab(page, "hire");
	const form = page.locator("#contactForm");
	await form.waitFor();
	assert.equal(await page.locator("#quoteConfirmation").isVisible(), false);
	await checkContrast(form.getByText("Name (required)", { exact: true }));
	await snap("hire");
	await page.evaluate(() => {
		const original = window.fetch;
		window.folderQuoteCount = 0;
		window.fetch = (input, options) => {
			if (!String(input).startsWith("https://formspree.io/"))
				return original(input, options);
			window.folderQuoteCount++;
			return new Promise((resolve) => {
				window.finishFolderQuote = (status) =>
					resolve(new Response("{}", { status }));
			});
		};
	});
	const submit = form.locator("[type=submit]");
	const name = form.locator("#quoteName");
	const message = form.locator("#quoteMessage");
	await submit.click();
	assert.equal(await name.getAttribute("aria-invalid"), "true");
	assert.equal(await page.evaluate(() => window.folderQuoteCount), 0);
	await name.fill("Sample Client");
	await form.locator("#quoteEmail").fill("sample@example.com");
	await message.fill("I would like a book site.");
	await snap("quote-form");
	await name.press("Enter");
	await page.waitForFunction(() => window.folderQuoteCount === 1);
	await snap("quote-pending");
	await name.press("Enter");
	await page.locator("[data-close]").click();
	await page.locator("dialog[open]").waitFor({ state: "hidden" });
	await openFolderTab(page, "hire");
	assert.equal(await page.evaluate(() => window.folderQuoteCount), 1);
	await page.evaluate(() => window.finishFolderQuote(429));
	await page.locator("#contactError").waitFor();
	assert.equal(await message.inputValue(), "I would like a book site.");
	await snap("quote-error");
	await submit.click();
	await page.waitForFunction(() => window.folderQuoteCount === 2);
	await page.evaluate(() => window.finishFolderQuote(200));
	await page.locator("#quoteConfirmation").waitFor();
	assert.equal(await form.isVisible(), false);
	await snap("quote-sent");
	await page.locator("[data-close]").click();
	await page.locator("dialog[open]").waitFor({ state: "hidden" });
	await openFolderTab(page, "personal");
	await page
		.getByRole("link", { name: "Send feedback or request an update" })
		.click();
	await page.locator("dialog[open] [data-sheet=hire]:not([hidden])").waitFor();
	await message.fill("Please update the example link.");
	await snap("feedback");
}

(async () => {
	if (captures) await mkdir(captures, { recursive: true });
	const source = await readFile(
		resolve(root, "tests/single-page-browser-test.html"),
		"utf8",
	);
	const fixture = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(
		(match) => match[1].includes("const testPost"),
	)?.[1];
	assert(fixture, "The incumbent browser double is required");
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch(
		process.env.WORKING_FOLDER_CHROME_EXECUTABLE
			? { executablePath: process.env.WORKING_FOLDER_CHROME_EXECUTABLE }
			: {},
	);
	const viewports = [
		{ width: 1440, height: 900 },
		{ width: 390, height: 844 },
		{ width: 375, height: 667 },
		{ width: 320, height: 640 },
	];
	const requestedWidths = new Set(
		(process.env.WORKING_FOLDER_TEST_VIEWPORTS || "")
			.split(",")
			.filter(Boolean)
			.map(Number),
	);
	try {
		for (const viewport of viewports.filter(
			({ width }) => !requestedWidths.size || requestedWidths.has(width),
		)) {
			await smoke(browser, fixture, viewport);
		}
	} finally {
		await browser.close();
		await new Promise((resolve) => server.close(resolve));
	}
})().catch((error) => {
	console.error(error);
	server.close();
	process.exitCode = 1;
});
