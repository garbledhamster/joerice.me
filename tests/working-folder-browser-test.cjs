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
				decodeURIComponent(uri.pathname === "/" ? "/index.html" : uri.pathname),
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

async function checkMotion(page, index, viewport) {
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto(index);
	const book = page.locator("#note-book");
	await book.waitFor({ state: "attached" });
	const board = page.locator('.categories a[href="#build"]');
	const tabMotion = await board.evaluate((link) => {
		const old = document.querySelector(
			'.categories a[aria-current="location"]',
		);
		link.click();
		return [old, link].map((tab) =>
			tab
				.getAnimations()
				.flatMap((animation) =>
					animation.effect.getKeyframes().map((frame) => frame.transform),
				),
		);
	});
	assert(tabMotion[0].some((frame) => frame.includes("translateY(6px)")));
	assert(tabMotion[1].some((frame) => frame.includes("translateY(-7px)")));
	const dimensions = await page
		.locator('[data-category="build"] .note')
		.evaluateAll((notes) =>
			notes.map((note) => [note.offsetWidth, note.offsetHeight]),
		);
	for (const [width, height] of dimensions) {
		assert(
			Math.abs(width / height - (viewport.width <= 350 ? 1 : 2)) < 0.03,
			`${viewport.width}: ${width}×${height} paper`,
		);
		assert.deepEqual([width, height], dimensions[0]);
	}
	const included = book.getByRole("button", { name: /^See what’s included/ });
	await included.evaluate((button) => button.click());
	await book
		.getByRole("button", { name: /^See an example/ })
		.evaluate((button) => button.click());
	const ghost = book.locator(".peeling-face");
	assert.equal(await ghost.getAttribute("inert"), "");
	assert.equal(await ghost.locator("li").count(), 3);
	assert.equal(await ghost.locator("[id]").count(), 0);
	await page.emulateMedia({ reducedMotion: "reduce" });
	await ghost.waitFor({ state: "detached" });
	await page.emulateMedia({ reducedMotion: "no-preference" });
	const returning = await book
		.getByRole("button", { name: /^Back one layer/ })
		.evaluate((button) => {
			const note = button.closest(".note");
			button.click();
			return note.firstElementChild
				.getAnimations()
				.some(
					(animation) => animation.effect.getTiming().direction === "reverse",
				);
		});
	assert(returning, "Back animates the returning paper face");
	await page.emulateMedia({ reducedMotion: "reduce" });
	console.log(
		`${viewport.width}px paper sizing, opposing tab cues and peel/restore passed`,
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
		content: fixture.replace(
			"onAuthStateChanged(callback) {",
			"onAuthStateChanged(callback) { window.applyWorkingFolderAuth = callback;",
		),
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
	const errors = [];
	page.on("pageerror", (error) => errors.push(error));
	try {
		const index = `http://127.0.0.1:${server.address().port}/`;
		await checkMotion(page, index, viewport);
		await page.goto(index, { waitUntil: "domcontentloaded" });
		await page
			.locator(".panel:not([inert]) h1")
			.filter({ hasText: /^About$/ })
			.waitFor({ state: "attached" });
		await page.evaluate(() => document.fonts.ready);
		await page.locator(".categories a[href='#build']").click();
		const book = page.locator("#note-book");
		await book.waitFor();
		assert.equal(await page.evaluate(() => innerWidth), viewport.width);
		const hire = page.locator(mobile ? ".phone-hire" : ".desktop-hire");
		assert(await hire.isVisible());
		assert.equal(
			await page.locator(mobile ? ".desktop-hire" : ".phone-hire").isVisible(),
			false,
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
		assert.equal(await book.getAttribute("data-layer"), "1");
		await book.locator("button.action").click();
		assert.equal(await book.getAttribute("data-layer"), "2");
		assert.equal(
			await book.locator("a.action").getAttribute("target"),
			"_blank",
		);
		await page.locator(".categories a[href='#systems']").click();
		await page.locator(".categories a[href='#build']").click();
		assert.equal(await book.getAttribute("data-layer"), "2");
		await book.locator(".back").click();
		assert.equal(await book.getAttribute("data-layer"), "1");

		await hire.click();
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
		await page.locator("[data-close]").click();
		await page.locator("dialog[open]").waitFor({ state: "hidden" });

		for (const [id, expected] of [
			["work", "Work & Notes"],
			["employers", "For employers"],
			["personal", "Personal"],
			["guide", "How to build an idea"],
		]) {
			await page.locator(`[data-route="${id}"]:visible`).first().click();
			await page.locator("dialog[open]").waitFor();
			assert.equal(
				await page.locator("#folder-sheet-title").textContent(),
				expected,
			);
			await page.locator("[data-close]").click();
			await page.locator("dialog[open]").waitFor({ state: "hidden" });
		}
		await page.locator(".categories a[href='#build']").click();
		await hire.click();
		await page.locator("[data-close]").evaluate((control) => {
			control.click();
			control.click();
		});
		await page.locator("dialog[open]").waitFor({ state: "hidden" });
		assert.equal(new URL(page.url()).hash, "#build");

		await page.locator("#loginButton").click();
		await page.getByRole("link", { name: "Edit portfolio content" }).click();
		await page.locator("dialog[open] .folder-editor").waitFor();
		if (viewport.width === 390) {
			await page
				.locator('.folder-editor [name="content"]')
				.selectOption("guide");
			await page
				.getByRole("textbox", { name: "Introduction" })
				.fill("Test guide opening.");
			await page
				.locator(".folder-editor")
				.getByRole("button", { name: "Save" })
				.click();
			await page
				.locator(".folder-editor [role=status]")
				.getByText("Saved.", { exact: true })
				.waitFor();
		}
		await page.locator("[data-close]").click();
		await page.locator("dialog[open]").waitFor({ state: "hidden" });
		assert.equal(await page.locator(".folder-editor").count(), 0);
		if (viewport.width === 390) {
			await page.locator('.guide [data-route="guide"]').click();
			const guide = page.locator('dialog[open] [data-sheet="guide"]');
			const paragraphs = await guide
				.locator("[data-folder-copy]")
				.allTextContents();
			assert.equal(paragraphs[0], "Test guide opening.");
			assert(paragraphs.slice(1).every((text) => text.trim().length > 50));
			await guide
				.getByRole("link", { name: /Find and read a sample page/ })
				.waitFor();
			await page.locator("[data-close]").click();
			await page.locator("dialog[open]").waitFor({ state: "hidden" });
		}
		await exerciseQuote(page, hire);
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
			["gallery", "#personal-photos"],
			["quotes", "#quotesSection"],
			["links", "#linksSection"],
			["products", "[data-sheet=products]"],
		]) {
			await page.goto(`${index}#${fragment}`);
			await page.locator(`dialog[open] ${selector}`).waitFor();
		}
		await page.goto(`${index}#edit-content`);
		await page.locator("dialog[open] .folder-editor").waitFor();
		await page.evaluate(() => {
			window.testFailPostReads = true;
			window.applyWorkingFolderAuth({ uid: "fixture-public" });
		});
		await page.locator("dialog[open]").waitFor({ state: "hidden" });
		assert.equal(await page.locator(".folder-editor").count(), 0);
		await page
			.locator("#loginButton")
			.filter({ hasText: /^Login$/ })
			.waitFor();
		await page
			.locator(".panel:not([inert])")
			.getByText("Notes are currently unavailable.", { exact: false })
			.waitFor();
		await page.locator(mobile ? ".phone-hire" : ".desktop-hire").click();
		await page.locator("dialog[open] #contactForm").waitFor();

		await page.goto(`${index}#edit-services`);
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.locator("dialog[open] #addServiceButton").click();
		await page
			.locator(".serviceEditor [name=title]")
			.fill("Draft service sample");
		await page.evaluate(() => {
			window.testFailPostReads = true;
			window.applyWorkingFolderAuth({ uid: "fixture-public" });
		});
		await page.locator("dialog[open]").waitFor({ state: "hidden" });
		assert.equal(await page.locator(".serviceEditor").count(), 0);
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

async function exerciseQuote(page, hire) {
	await hire.click();
	const form = page.locator("#contactForm");
	await form.waitFor();
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
	await name.press("Enter");
	await page.waitForFunction(() => window.folderQuoteCount === 1);
	await name.press("Enter");
	await page.locator("[data-close]").click();
	await page.locator("dialog[open]").waitFor({ state: "hidden" });
	await hire.click();
	assert.equal(await page.evaluate(() => window.folderQuoteCount), 1);
	await page.evaluate(() => window.finishFolderQuote(429));
	await page.locator("#contactError").waitFor();
	assert.equal(await message.inputValue(), "I would like a book site.");
	await submit.click();
	await page.waitForFunction(() => window.folderQuoteCount === 2);
	await page.evaluate(() => window.finishFolderQuote(200));
	await page.locator("#quoteConfirmation").waitFor();
	await page.locator("[data-close]").click();
	await page.locator("dialog[open]").waitFor({ state: "hidden" });
	await page.locator('[data-route="personal"]:visible').click();
	await page
		.getByRole("link", { name: "Send feedback or request an update" })
		.click();
	await page.locator("dialog[open] [data-sheet=hire]:not([hidden])").waitFor();
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
	const browser = await chromium.launch();
	try {
		for (const viewport of [
			{ width: 1440, height: 900 },
			{ width: 390, height: 844 },
			{ width: 375, height: 667 },
			{ width: 320, height: 640 },
		]) {
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
