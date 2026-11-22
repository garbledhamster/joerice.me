import { ensureAdmin, getFirestore } from "../services/auth.js";
import { startingCatalog } from "./starting-catalog.js";

const NOTE = "working-folder-note";
const NOTE_EDIT = "working-folder-note-edit";
const COPY = "working-folder-copy";
export const FOLDER_LAYOUT_KIND = "working-folder-layout";
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

function requireConfirmed(snapshot) {
	if (snapshot.metadata?.fromCache || snapshot.metadata?.hasPendingWrites)
		throw new Error("Portfolio publication data could not be confirmed.");
	return snapshot;
}

function copyParts(data) {
	const [legacyIntro, ...legacyBody] = cleanText(data.text).split(
		/\r?\n\s*\r?\n/,
	);
	return { intro: cleanText(data.intro) || legacyIntro, legacyBody };
}

function exampleFor(note, href) {
	if (href === (note.example.href || "")) return note.example;
	return href
		? {
				href,
				title: "Work example",
				kind: "Example",
				text: "Open the example to see the work.",
			}
		: {
				title: "Example currently unavailable",
				kind: "Example availability",
				text: "Get in touch if you’d like to talk through how this work could fit your project.",
			};
}

function arrangeNotes(notes, ids) {
	const indexed = new Map(
		notes.sort((a, b) => a.order - b.order).map((note) => [note.id, note]),
	);
	const arranged = [];
	for (const id of Array.isArray(ids) ? ids : []) {
		if (!indexed.has(id)) continue;
		arranged.push(indexed.get(id));
		indexed.delete(id);
	}
	return [...arranged, ...indexed.values()];
}

export function isPortfolioExampleAddress(address) {
	if (
		address === "/examples/backup-restore/" ||
		/^\/examples\/worked-cases\/#(?:printer|report|meeting)$/.test(address)
	)
		return true;
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
	const snapshot = requireConfirmed(
		await posts().where("published", "==", true).get({ source: "server" }),
	);
	const overrides = new Map();
	const copy = {};
	let layout;
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
			copy[data.page] = copyParts(data);
		} else if (
			data.kind === FOLDER_LAYOUT_KIND &&
			doc.id === FOLDER_LAYOUT_KIND
		) {
			layout = data.categories;
		}
	});
	const notes = [];
	for (const starter of starterNotes) {
		const override = overrides.get(starter.id);
		if (override?.hidden === true) continue;
		try {
			const fields = override ? noteFields(override) : noteToFields(starter);
			notes.push({
				...starter,
				...fields,
				example: exampleFor(starter, fields.exampleHref),
				serviceId: serviceIds[starter.id],
			});
		} catch {
			// Leave malformed publication records out until they can be corrected.
		}
	}
	return {
		catalog: startingCatalog.map((category) => ({
			...category,
			notes: arrangeNotes(
				notes.filter((note) => note.category === category.id),
				layout?.[category.id],
			),
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
	const draft = requireConfirmed(
		await collection.doc(`${NOTE_EDIT}-${noteId}`).get({ source: "server" }),
	);
	const { catalog } = await loadPublishedFolder();
	const category = catalog.find(({ notes }) =>
		notes.some(({ id }) => id === noteId),
	);
	const order = category?.notes.findIndex(({ id }) => id === noteId);
	if (draft.exists) {
		const fields = noteFields(draft.data());
		return order === undefined ? fields : { ...fields, order };
	}
	const published = category?.notes[order];
	if (published) return { ...noteToFields(published), order };
	const saved = requireConfirmed(
		await collection.doc(`${NOTE}-${noteId}`).get({ source: "server" }),
	);
	return saved.exists
		? { ...noteToFields(starter), hidden: saved.data().hidden === true }
		: noteToFields(starter);
}

export async function saveFolderNote(noteId, values) {
	if (!ensureAdmin("save folder note"))
		throw new Error("Sign in as admin to edit portfolio content.");
	if (!starterById.has(noteId)) throw new Error("This note is unavailable.");
	const fields = noteFields(values);
	const db = getFirestore();
	const collection = posts();
	const layoutRef = collection.doc(FOLDER_LAYOUT_KIND);
	const { catalog } = await loadPublishedFolder();
	return db.runTransaction(async (transaction) => {
		const current = await transaction.get(layoutRef);
		const saved = current.exists ? current.data() : undefined;
		if (saved && (saved.kind !== FOLDER_LAYOUT_KIND || !saved.categories))
			throw new Error("The current note order could not be read.");
		const categories = Object.fromEntries(
			catalog.map(({ id, notes }) => {
				const order = saved
					? saved.categories[id]
					: notes.map((note) => note.id);
				if (!Array.isArray(order))
					throw new Error("The current note order could not be read.");
				return [
					id,
					[
						...new Set(
							order.filter((id) => id !== noteId && starterById.has(id)),
						),
					],
				];
			}),
		);
		const destination = categories[fields.category];
		const order = Math.min(fields.order, destination.length);
		if (!fields.hidden) destination.splice(order, 0, noteId);
		const record = { ...fields, order };
		transaction.set(layoutRef, {
			kind: FOLDER_LAYOUT_KIND,
			categories,
			published: true,
		});
		transaction.set(collection.doc(`${NOTE_EDIT}-${noteId}`), {
			...record,
			kind: NOTE_EDIT,
			noteId,
			published: false,
		});
		transaction.set(collection.doc(`${NOTE}-${noteId}`), {
			...(fields.hidden ? { hidden: true } : record),
			kind: NOTE,
			noteId,
			published: true,
		});
		return order;
	});
}

export async function readFolderCopyForEdit(page) {
	if (!ensureAdmin("read folder copy"))
		throw new Error("Sign in as admin to edit portfolio content.");
	if (!copyPages.has(page)) throw new Error("This page is unavailable.");
	const record = requireConfirmed(
		await posts().doc(`${COPY}-${page}`).get({ source: "server" }),
	);
	if (!record.exists) return undefined;
	const data = record.data();
	const { intro } = copyParts(data);
	if (data.kind !== COPY || data.page !== page || !intro)
		throw new Error("This page copy is unavailable.");
	return intro;
}

export async function saveFolderCopy(page, value) {
	if (!ensureAdmin("save folder copy"))
		throw new Error("Sign in as admin to edit portfolio content.");
	const intro = cleanText(value);
	if (!copyPages.has(page) || !intro)
		throw new Error("Enter the copy you want to publish.");
	await posts()
		.doc(`${COPY}-${page}`)
		.set({ kind: COPY, page, intro, published: true }, { merge: true });
}
