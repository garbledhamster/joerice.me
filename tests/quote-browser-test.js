import {
	destroyContact,
	getContactTemplate,
	initContact,
} from "../assets/js/pages/contact.js";
import {
	clearSelectedServices,
	selectService,
} from "../assets/js/services/catalog.js";

const endpoint = "https://formspree.io/f/xovqpvdv";
const quoteSheet = document.querySelector("#quoteSheet");
const workSheet = document.querySelector("#workSheet");
const requests = [];
let form;
let submit;

for (const id of ["hire", "feedback"]) {
	document.getElementById(id).onclick = () => quoteSheet.showModal();
}
document.querySelector("#work").onclick = () => workSheet.showModal();

window.fetch = (url, options) => {
	assert(url === endpoint, `Unexpected fetch: ${url}`);
	assert(options.method === "POST", "Formspree transport must be POST");
	assert(
		options.headers.Accept === "application/json",
		"Formspree expects JSON",
	);
	assert(options.body instanceof FormData, "Formspree requires FormData");
	return new Promise((resolve, reject) => {
		requests.push({
			data: [...options.body.entries()],
			accept: (status = 200) => {
				resolve(
					new Response(JSON.stringify({ ok: status === 200 }), { status }),
				);
			},
			reject,
		});
	});
};

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

function equal(actual, expected, description) {
	assert(
		JSON.stringify(actual) === JSON.stringify(expected),
		`${description}. Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
	);
}

async function until(check, description) {
	const end = performance.now() + 1200;
	while (performance.now() < end) {
		const result = check();
		if (result) return result;
		await new Promise((resolve) => setTimeout(resolve, 15));
	}
	throw new Error(`Timed out waiting for ${description}`);
}

async function request(number) {
	await until(() => requests.length >= number, `POST ${number}`);
	equal(requests.length, number, "Observed POST count");
	return requests[number - 1];
}

async function settle() {
	await new Promise((resolve) => setTimeout(resolve, 80));
}

function configureCaptcha(execute) {
	const script = document.createElement("script");
	script.type = "application/json";
	script.src =
		"https://www.google.com/recaptcha/api.js?render=fixture-site-key";
	document.head.append(script);
	if (execute) {
		window.grecaptcha = {
			ready: (callback) => queueMicrotask(callback),
			async execute(key, options) {
				equal(key, "fixture-site-key", "Configured CAPTCHA site key");
				equal(options, { action: "submit" }, "CAPTCHA action");
				return execute();
			},
		};
	}
}

function prepare(openWith = "#hire") {
	destroyContact();
	quoteSheet.close();
	workSheet.close();
	clearSelectedServices();
	requests.length = 0;
	document.querySelector('script[type="application/json"]')?.remove();
	delete window.grecaptcha;
	document.querySelector("#quoteBody").innerHTML = getContactTemplate({
		sheet: true,
	});
	initContact();
	document.querySelector(openWith).click();
	form = document.querySelector("#contactForm");
	submit = form.querySelector('[type="submit"]');
}

function fill({
	name = "Quote Test",
	email = "quote@example.invalid",
	phone = "",
	message = "Help me get my project online.",
} = {}) {
	for (const [key, value] of Object.entries({ name, email, phone, message })) {
		form.elements.namedItem(key).value = value;
	}
}

function formError() {
	const error = document.querySelector("#contactError");
	return !error.hidden && error.closest('[role="alert"]') && error.textContent;
}

function confirmation() {
	const result = document.querySelector("#quoteConfirmation");
	return result && !result.hidden && result;
}

const cases = [
	[
		"Invalid values never reach Formspree",
		async () => {
			prepare();
			fill({ name: " ", email: "unusable", message: " \n " });
			form.requestSubmit();
			await settle();
			equal(requests.length, 0, "POSTs from invalid inputs");
			for (const name of ["name", "email", "message"]) {
				const input = form.elements.namedItem(name);
				equal(
					input.getAttribute("aria-invalid"),
					"true",
					`Invalid ${name} announcement`,
				);
				assert(
					input
						.getAttribute("aria-describedby")
						.split(" ")
						.some((id) => {
							const message = document.getElementById(id);
							return (
								message &&
								!message.hidden &&
								/Enter|Describe/.test(message.textContent)
							);
						}),
					`Visible validation description for ${name}`,
				);
			}
			equal(
				document.activeElement.name,
				"name",
				"Focus moves to the first invalid field",
			);
			assert(formError(), "Validation must announce how to fix the form");
		},
	],
	[
		"A pending submission sends each field once, even across closing and reopening",
		async () => {
			prepare();
			equal(
				form.querySelectorAll(".contactServiceSelect:checked").length,
				0,
				"Global Hire me selections",
			);
			fill({ phone: "555-0100" });
			selectService("web-site", true);
			selectService("ai-coaching", true);
			configureCaptcha(() => "fixture-token");
			submit.click();
			const pending = await request(1);
			assert(submit.disabled, "Submit is unavailable during delivery");
			const status = document.querySelector("#contactStatus");
			assert(
				status?.getAttribute("role") === "status" &&
					/Sending/.test(status.textContent),
				"Sending must be announced",
			);
			assert(!confirmation(), "Pending delivery must not show confirmation");
			equal(
				pending.data,
				[
					["name", "Quote Test"],
					["email", "quote@example.invalid"],
					["phone", "555-0100"],
					["message", "Help me get my project online."],
					["services", "Web Site"],
					["services", "AI Coaching"],
					["g-recaptcha-response", "fixture-token"],
				],
				"POST payload",
			);
			submit.click();
			form.requestSubmit();
			quoteSheet.close();
			document.querySelector("#hire").click();
			submit.click();
			form.requestSubmit();
			quoteSheet.close();
			document.querySelector("#work").click();
			await settle();
			equal(requests.length, 1, "POSTs after repeat submit and reopen");
			pending.accept();
			await until(confirmation, "quote confirmation");
			assert(workSheet.open, "The unrelated sheet stays open");
			assert(
				!workSheet.textContent.includes("Thanks"),
				"Quote result stays in the quote sheet",
			);
			assert(
				!workSheet.contains(document.querySelector("#quoteConfirmation")),
				"Confirmation stays in the quote sheet",
			);
			assert(
				document.activeElement.closest("dialog") === workSheet,
				"A background result keeps focus in the active sheet",
			);
			workSheet.close();
			document.querySelector("#hire").click();
			assert(
				confirmation().textContent.includes("scope"),
				"Confirmation explains follow-up on scope",
			);
			assert(
				confirmation().textContent.includes("price"),
				"Confirmation explains follow-up on price",
			);
			assert(
				!document.querySelector("#contactModal.show"),
				"A native sheet uses its own confirmation",
			);
			document.querySelector("#restartQuote").click();
			assert(!confirmation(), "Starting a new request restores the form");
			equal(
				form.elements.namedItem("message").value,
				"",
				"Accepted draft is cleared",
			);
			equal(
				form.querySelectorAll(".contactServiceSelect:checked").length,
				0,
				"Accepted selections are cleared",
			);
			equal(
				document.activeElement.name,
				"name",
				"Starting again focuses the first field",
			);
			equal(requests.length, 1, "Starting again is not a POST");
		},
	],
	[
		"The feedback entrance uses the same form without phone or services",
		async () => {
			prepare("#feedback");
			fill({ message: "Please send an update about your projects." });
			form.requestSubmit();
			const pending = await request(1);
			equal(
				pending.data,
				[
					["name", "Quote Test"],
					["email", "quote@example.invalid"],
					["phone", ""],
					["message", "Please send an update about your projects."],
				],
				"Feedback POST payload with optional fields unset",
			);
			pending.accept();
			await until(confirmation, "feedback confirmation");
			equal(requests.length, 1, "Feedback POST count");
		},
	],
	[
		"A suggested service can be removed before a valid request",
		async () => {
			prepare();
			selectService("web-app", true);
			const choice = form.querySelector('[value="web-app"]');
			assert(
				choice.checked && choice.getClientRects().length,
				"Suggested service is visible and selected",
			);
			choice.click();
			equal(choice.checked, false, "Suggested service can be unchecked");
			fill();
			form.requestSubmit();
			const pending = await request(1);
			assert(
				!pending.data.some(([name]) => name === "services"),
				"Removed suggestion never travels in the payload",
			);
			pending.accept();
			await until(confirmation, "confirmation after removing a suggestion");
		},
	],
	...[
		[
			"A rejected fetch",
			(pending) => pending.reject(new TypeError("Fixture connection closed")),
		],
		["A provider rejection", (pending) => pending.accept(422)],
		["An HTTP 429", (pending) => pending.accept(429)],
	].map(([label, fail]) => [
		`${label} retains values and sends again only on retry`,
		async () => {
			prepare();
			fill({ phone: "555-0100" });
			selectService("web-app", true);
			let tokens = 0;
			configureCaptcha(() => `fixture-token-${++tokens}`);
			form.requestSubmit();
			const pending = await request(1);
			fail(pending);
			const error = await until(formError, "announced delivery error");
			if (label === "An HTTP 429")
				assert(
					/wait/i.test(error),
					"Rate limit error tells the visitor when to retry",
				);
			assert(!confirmation(), "Unaccepted request stays on the form");
			equal(
				form.elements.namedItem("name").value,
				"Quote Test",
				"Retained name",
			);
			equal(
				form.elements.namedItem("email").value,
				"quote@example.invalid",
				"Retained email",
			);
			equal(
				form.elements.namedItem("phone").value,
				"555-0100",
				"Retained phone",
			);
			equal(
				form.elements.namedItem("message").value,
				"Help me get my project online.",
				"Retained message",
			);
			assert(
				form.querySelector('[value="web-app"]').checked,
				"Retained service",
			);
			await settle();
			equal(requests.length, 1, "No automatic POST after a failure");
			assert(
				!submit.disabled && /try again/i.test(submit.textContent),
				"A visitor can explicitly retry",
			);
			submit.click();
			const retry = await request(2);
			equal(
				retry.data.slice(0, -1),
				pending.data.slice(0, -1),
				"Retried POST retains field values",
			);
			equal(
				pending.data.at(-1),
				["g-recaptcha-response", "fixture-token-1"],
				"Initial token",
			);
			equal(
				retry.data.at(-1),
				["g-recaptcha-response", "fixture-token-2"],
				"Fresh retry token",
			);
			retry.accept();
			await until(confirmation, "accepted retry");
			equal(requests.length, 2, "Only one retry reached Formspree");
		},
	]),
	...[
		["missing CAPTCHA script API", undefined],
		[
			"rejected CAPTCHA token",
			() => Promise.reject(new Error("Fixture blocked CAPTCHA")),
		],
		["blank CAPTCHA token", () => "  "],
		["invalid CAPTCHA token", () => ({})],
	].map(([label, execute]) => [
		`A ${label} blocks delivery and permits recovery`,
		async () => {
			prepare();
			fill();
			selectService("web-app", true);
			configureCaptcha(execute);
			form.requestSubmit();
			const error = await until(formError, "announced CAPTCHA failure");
			assert(
				/spam check/i.test(error),
				"CAPTCHA failure explains the spam check",
			);
			equal(
				form.elements.namedItem("message").value,
				"Help me get my project online.",
				"Retained message after CAPTCHA failure",
			);
			assert(
				form.querySelector('[value="web-app"]').checked,
				"Service survives CAPTCHA failure",
			);
			equal(requests.length, 0, "POSTs without a valid CAPTCHA token");
			assert(
				!confirmation() && !submit.disabled,
				"CAPTCHA failure is recoverable",
			);
			window.grecaptcha = { execute: async () => "replacement-token" };
			submit.click();
			const pending = await request(1);
			equal(
				pending.data.at(-1),
				["g-recaptcha-response", "replacement-token"],
				"Token from the recovered CAPTCHA",
			);
			pending.accept();
			await until(confirmation, "confirmation after CAPTCHA recovery");
		},
	]),
	[
		"The five-day offer is available alongside the inquiry",
		() => {
			prepare();
			const terms = document.querySelector("#quoteTerms")?.textContent || "";
			for (const detail of [
				/one usable outcome/i,
				/agreed scope, content, access and approvals/i,
				/date in the quote/i,
				/five.business.day/i,
				/live system/i,
				/set up the agreed integrations/i,
				/main thing they came to do/i,
				/access and instructions to own and update/i,
				/follow.up.*questions and fixes/i,
			]) {
				assert(detail.test(terms), `Quote terms should describe ${detail}`);
			}
		},
	],
];

const results = [];
for (const [description, run] of cases) {
	try {
		await run();
		results.push(`PASS ${description}`);
	} catch (error) {
		results.push(`FAIL ${description}: ${error.message}`);
	}
}
quoteSheet.close();
workSheet.close();
document.querySelector("#testResults").textContent = results.join("\n");
document.body.dataset.testStatus = results.some((result) =>
	result.startsWith("FAIL"),
)
	? "failed"
	: "passed";
