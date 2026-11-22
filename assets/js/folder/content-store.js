import { ensureAdmin, getFirestore } from "../services/auth.js";
import { startingCatalog } from "./starting-catalog.js";

const NOTE = "working-folder-note";
const NOTE_EDIT = "working-folder-note-edit";
const COPY = "working-folder-copy";
const copyPages = new Set(["guide", "employers"]);
const categoryIds = new Set(startingCatalog.map(({ id }) => id));
const starterNotes = startingCatalog.flatMap(({ id, notes }) =>
	notes.map((note, order) => ({ ...note, category: id, order, hidden: false })),
);
const starterById = new Map(starterNotes.map((note) => [note.id, note]));
const serviceIds = {
	book: "web-site",
	channel: "web-site",
	local: "web-site",
	product: "web-site",
	portfolio: "web-site",
	fan: "web-site",
	app: "web-app",
	troubleshoot: "it-services",
	knowledge: "knowledge-mgmt",
	coach: "ai-coaching",
	logo: "logo-design",
	resume: "resume-writing",
};

export const emptyFolderCatalog = startingCatalog.map((category) => ({
	...category,
	notes: [],
}));

function posts() {
	const db = getFirestore();
	if (!db) throw new Error("Portfolio content could not connect.");
	return db.collection("Posts");
}

function cleanText(value) {
	return typeof value === "string" ? value.trim() : "";
}

export function isPortfolioExampleAddress(address) {
	if (address === "/examples/backup-restore/") return true;
	try {
		const url = new URL(address);
		return url.protocol === "https:" && !url.username && !url.password;
	} catch {
		return false;
	}
}

function noteFields(values) {
	const title = cleanText(values.title);
	const included = Array.isArray(values.included)
		? values.included.map(cleanText).filter(Boolean)
		: [];
	const href = cleanText(values.exampleHref);
	if (!title || !included.length)
		throw new Error("Enter a note title and at least one included item.");
	if (
		!categoryIds.has(values.category) ||
		!Number.isSafeInteger(values.order) ||
		values.order < 0
	) {
		throw new Error(
			"Choose a category and enter a nonnegative whole number for the order.",
		);
	}
	if (href && !isPortfolioExampleAddress(href)) {
		throw new Error("Use a complete HTTPS address for the example.");
	}

	return {
		title,
		included,
		category: values.category,
		order: values.order,
		exampleHref: href,
		hidden: values.hidden === true,
	};
}

function noteToFields(note) {
	return {
		title: note.title,
		included: [...note.included],
		category: note.category,
		order: note.order,
		exampleHref: note.example.href || "",
		hidden: note.hidden,
	};
}

export async function loadPublishedFolder() {
	const snapshot = await posts()
		.where("published", "==", true)
		.get({ source: "server" });
	if (snapshot.metadata?.fromCache || snapshot.metadata?.hasPendingWrites) {
		throw new Error("Portfolio publication data could not be confirmed.");
	}
	const overrides = new Map();
	const copy = {};
	snapshot.forEach((doc) => {
		const data = doc.data();
		if (data.published !== true) return;
		if (
			data.kind === NOTE &&
			doc.id === `${NOTE}-${data.noteId}` &&
			starterById.has(data.noteId)
		) {
			overrides.set(data.noteId, data);
		} else if (
			data.kind === COPY &&
			copyPages.has(data.page) &&
			doc.id === `${COPY}-${data.page}`
		) {
			const text = cleanText(data.text);
			if (text) copy[data.page] = text;
		}
	});
	const notes = [];
	for (const starter of starterNotes) {
		const override = overrides.get(starter.id);
		if (override?.hidden === true) continue;
		try {
			const fields = override ? noteFields(override) : noteToFields(starter);
			const example =
				starter.example.href && !fields.exampleHref
					? {
							title: "Example currently unavailable",
							kind: "Example availability",
							text: "Get in touch if you’d like to talk through how this work could fit your project.",
						}
					: { ...starter.example, href: fields.exampleHref };
			notes.push({
				...starter,
				...fields,
				example,
				serviceId: serviceIds[starter.id],
			});
		} catch {
			// Leave malformed publication records out until they can be corrected.
		}
	}
	return {
		catalog: startingCatalog.map((category) => ({
			...category,
			notes: notes
				.filter((note) => note.category === category.id)
				.sort((a, b) => a.order - b.order),
		})),
		copy,
	};
}

export function getEditableNotes() {
	return starterNotes.map((note) => ({ id: note.id, title: note.title }));
}

export async function readNoteForEdit(noteId) {
	if (!ensureAdmin("read folder edit"))
		throw new Error("Sign in as admin to edit portfolio content.");
	const starter = starterById.get(noteId);
	if (!starter) throw new Error("This note is unavailable.");
	const collection = posts();
	const draft = await collection
		.doc(`${NOTE_EDIT}-${noteId}`)
		.get({ source: "server" });
	if (draft.exists) return noteFields(draft.data());
	const saved = await collection
		.doc(`${NOTE}-${noteId}`)
		.get({ source: "server" });
	return saved.exists ? noteFields(saved.data()) : noteToFields(starter);
}

export async function saveFolderNote(noteId, values) {
	if (!ensureAdmin("save folder note"))
		throw new Error("Sign in as admin to edit portfolio content.");
	if (!starterById.has(noteId)) throw new Error("This note is unavailable.");
	const fields = noteFields(values);
	const db = getFirestore();
	const collection = posts();
	const batch = db.batch();
	batch.set(collection.doc(`${NOTE_EDIT}-${noteId}`), {
		...fields,
		kind: NOTE_EDIT,
		noteId,
		published: false,
	});
	const publicFields = fields.hidden ? { hidden: true } : fields;
	batch.set(collection.doc(`${NOTE}-${noteId}`), {
		...publicFields,
		kind: NOTE,
		noteId,
		published: true,
	});
	await batch.commit();
}

export async function readFolderCopyForEdit(page) {
	if (!ensureAdmin("read folder copy"))
		throw new Error("Sign in as admin to edit portfolio content.");
	if (!copyPages.has(page)) throw new Error("This page is unavailable.");
	const record = await posts().doc(`${COPY}-${page}`).get({ source: "server" });
	if (record.metadata?.fromCache || record.metadata?.hasPendingWrites) {
		throw new Error("Page copy could not be confirmed.");
	}
	if (!record.exists) return undefined;
	const data = record.data();
	const text = cleanText(data.text);
	if (data.kind !== COPY || data.page !== page || !text)
		throw new Error("This page copy is unavailable.");
	return text;
}

export async function saveFolderCopy(page, value) {
	if (!ensureAdmin("save folder copy"))
		throw new Error("Sign in as admin to edit portfolio content.");
	const text = cleanText(value);
	if (!copyPages.has(page) || !text)
		throw new Error("Enter the copy you want to publish.");
	await posts()
		.doc(`${COPY}-${page}`)
		.set({ kind: COPY, page, text, published: true });
}
