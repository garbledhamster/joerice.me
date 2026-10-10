import { ensureAdmin, getFirestore } from "./auth.js";
import { sanitizeText } from "./sanitize.js";

const defaults = [
	[
		"web-site",
		"Web Site",
		"I can help you plan and build a website for your business, portfolio, or project so visitors understand what you offer and how to reach you.",
		[
			"Work out what your visitors need and how to organize the pages",
			"Build a layout that works on phones and computers",
			"Set up the basics for speed and search visibility",
		],
	],
	[
		"web-app",
		"Web App",
		"If you have an idea for an interactive tool, dashboard, or tracker, I can help you work out what it needs to do and build an app people can use.",
		[
			"Define the tasks and features the app needs to support",
			"Plan and build the screens and how people move through them",
			"Help you understand deployment and what comes next",
		],
	],
	[
		"it-services",
		"IT Services",
		"I help troubleshoot devices and networks for homes and small businesses. We can look at what is going wrong and work out how to get you back to what you need to do.",
		[
			"Troubleshoot home and office network problems",
			"Diagnose hardware issues and help set up devices",
			"Review your setup for basic security concerns",
		],
	],
	[
		"knowledge-mgmt",
		"Knowledge Management",
		"I can help you organize notes and ideas you have scattered across apps and folders so you can find what you need. We can set up a system that fits how you work and is easier to keep up with.",
		[
			"Set up a note system that fits how you think and work",
			"Organize information so it is easier to search and connect",
			"Learn habits that make the system easier to keep up with",
		],
	],
	[
		"logo-design",
		"Logo Design",
		"I can help you work out a direction for your business or project and create a logo you can use on your website, social profiles, and print materials.",
		[
			"Explore concepts that fit your project and the people it serves",
			"Prepare vector files for digital and print use",
			"Explain where and how to use the logo files",
		],
	],
	[
		"resume-writing",
		"Resume Writing",
		"I can help you sort through your experience and explain what you have done so employers understand what you bring to the role. We can organize that into a resume and work on the wording.",
		[
			"Identify the experience and accomplishments that matter for the role",
			"Build a readable resume with an ATS-friendly format",
			"Bring the same clarity to your LinkedIn profile",
		],
	],
	[
		"ai-coaching",
		"AI Coaching",
		"We can work through tasks from your day so you can learn how to use AI and decide where it helps. I can show you how to ask for what you need and check the results.",
		[
			"Practice asking AI tools for useful help on your own tasks",
			"Explore ways to reduce repetitive work",
			"Understand limitations and check results before using them",
		],
	],
].map(([id, title, description, highlights]) => ({
	id,
	title,
	description,
	highlights,
	available: true,
}));

let catalog = defaults;
const selected = new Set();
export const getServices = () => catalog.map((service) => ({ ...service }));
export const getSelectedServices = () =>
	catalog.filter((service) => selected.has(service.id));

function notifySelection() {
	window.dispatchEvent(new CustomEvent("service-selection-change"));
}

function notifyCatalog() {
	for (const id of selected) {
		if (!catalog.some((service) => service.id === id && service.available))
			selected.delete(id);
	}
	window.dispatchEvent(new CustomEvent("service-catalog-change"));
	notifySelection();
}

export function selectService(id, checked) {
	if (!catalog.some((service) => service.id === id && service.available))
		return;
	if (checked) selected.add(id);
	else selected.delete(id);
	notifySelection();
}

export function clearSelectedServices() {
	selected.clear();
	notifySelection();
}

export async function loadServices() {
	const db = getFirestore();
	if (!db) throw new Error("Services could not connect to Firebase.");
	// Use the site's existing published-content permissions. Service records are
	// distinguished by kind and excluded from the portfolio list.
	const snapshot = await db
		.collection("Posts")
		.where("published", "==", true)
		.get();
	const overrides = new Map();
	snapshot.forEach((doc) => {
		const data = doc.data();
		if (data.kind !== "service" || typeof data.serviceId !== "string") return;
		overrides.set(data.serviceId, {
			id: data.serviceId,
			title: String(data.title || "Untitled service"),
			description: String(data.description || ""),
			highlights: Array.isArray(data.highlights)
				? data.highlights.map(String)
				: [],
			available: data.available !== false,
		});
	});
	catalog = defaults.map((service) => overrides.get(service.id) || service);
	for (const service of overrides.values()) {
		if (!defaults.some((item) => item.id === service.id)) catalog.push(service);
	}
	notifyCatalog();
}

export async function saveService(id, values) {
	if (!ensureAdmin("save service"))
		throw new Error("Sign in as admin to save services.");
	const db = getFirestore();
	if (!db) throw new Error("Services could not connect to Firebase.");
	if (!values.title?.trim() || !values.description?.trim())
		throw new Error("Enter a service name and description.");
	const serviceId = id || db.collection("Posts").doc().id;
	const ref = db.collection("Posts").doc(`service-${serviceId}`);
	await ref.set(
		{
			...values,
			kind: "service",
			serviceId,
			published: true,
			lastEditedDate: new Date().toISOString(),
		},
		{ merge: true },
	);
	const saved = { ...values, id: serviceId };
	const index = catalog.findIndex((service) => service.id === serviceId);
	catalog = [...catalog];
	if (index < 0) catalog.push(saved);
	else catalog[index] = saved;
	notifyCatalog();
}

export function servicePicker(ids = [], name = "serviceIds") {
	const choices = catalog.filter(
		(service) => service.available || ids.includes(service.id),
	);
	return `<fieldset class="servicePicker"><legend>Related services</legend>${choices.map((service) => `<label><input type="checkbox" name="${sanitizeText(name)}" value="${sanitizeText(service.id)}"${ids.includes(service.id) ? " checked" : ""}> ${sanitizeText(service.title)}${service.available ? "" : " (unavailable)"}</label>`).join("")}${ids
		.filter((id) => !catalog.some((service) => service.id === id))
		.map(
			(id) =>
				`<label><input type="checkbox" name="${sanitizeText(name)}" value="${sanitizeText(id)}" checked> Unavailable service (${sanitizeText(id)})</label>`,
		)
		.join("")}</fieldset>`;
}

export function relatedServices(ids = []) {
	const services = catalog.filter(
		(service) => service.available && ids.includes(service.id),
	);
	if (!services.length) return "";
	return `<fieldset class="relatedServices"><legend>Interested in these services?</legend>${services.map((service) => `<label><input class="relatedServiceSelect" type="checkbox" value="${sanitizeText(service.id)}"${selected.has(service.id) ? " checked" : ""}> ${sanitizeText(service.title)}</label>`).join("")}</fieldset>`;
}
