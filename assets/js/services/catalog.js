import { ensureAdmin, getFirestore } from "./auth.js";
import { sanitizeText } from "./sanitize.js";

const defaults = [
	[
		"web-site",
		"Web Site",
		"Marketing sites, portfolios, and landing pages that load fast and look sharp.",
		["Discovery + sitemap", "Responsive layout", "Performance + SEO basics"],
	],
	[
		"web-app",
		"Web App",
		"Interactive products with clean UI, scalable structure, and thoughtful UX.",
		["Product planning", "UI/UX flows", "Deployment guidance"],
	],
	[
		"it-services",
		"IT Services",
		"Troubleshooting, device setup, and small-business tech support.",
		["Home/office networks", "Hardware diagnostics", "Security checkups"],
	],
	[
		"knowledge-mgmt",
		"Knowledge Mgmt",
		"Note systems and workflows to capture, organize, and retrieve ideas.",
		["Zettelkasten setup", "Searchable structure", "Training + habits"],
	],
	[
		"logo-design",
		"Logo Design",
		"Simple, bold marks with usable brand assets for print and digital.",
		["Concept sketches", "Vector delivery", "Usage guidance"],
	],
	[
		"resume-writing",
		"Resume Writing",
		"Recruiter-ready resumes tuned for clarity, impact, and outcomes.",
		["Story arc", "ATS-friendly format", "LinkedIn polish"],
	],
	[
		"ai-coaching",
		"AI Coaching",
		"Hands-on coaching to use AI tools for real work and daily workflows.",
		["Prompt patterns", "Workflow automation", "Ethics + guardrails"],
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
