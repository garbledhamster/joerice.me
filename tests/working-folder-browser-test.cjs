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

async function smoke(browser, fixture, viewport) {
	const mobile = viewport.width < 600;
	const context = await browser.newContext({
		viewport,
		isMobile: mobile,
		hasTouch: mobile,
		reducedMotion: "reduce",
		ignoreHTTPSErrors: true,
	});
	await context.addInitScript({ content: fixture });
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
		await page.locator("[data-close]").click();
		await page.locator("dialog[open]").waitFor({ state: "hidden" });
		assert.equal(await page.locator(".folder-editor").count(), 0);
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
