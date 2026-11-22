/**
 * @file pages/quotes.js
 * @description Public quote carousel and authenticated quote editor.
 */

import { $, addListener } from "../core/dom.js";
import {
	ensureAdmin,
	getFirestore,
	isAdminUser,
	onAuthStateChange,
} from "../services/auth.js";
import { sanitizeText, validateLength } from "../services/sanitize.js";

const SERVER_READ = { source: "server" };
const slideMs = 7000;
let cleanupQuotes;

export function getQuotesTemplate() {
	return `
    <section class="quotes" id="quotesSection">
      <div class="sectionHeader">
        <h2>Favorite quotes</h2>
        <button class="editBtn" id="editQuotesBtn" type="button" data-admin-only hidden aria-hidden="true" aria-controls="quoteEditor" aria-expanded="false">Edit</button>
      </div>
      <p id="quoteAvailability" role="status">Loading favorite quotes…</p>
      <div class="quoteBox" id="quoteBox" hidden>
        <blockquote id="quoteText"></blockquote>
        <cite id="quoteCite"></cite>
      </div>
      <div class="progressWrap" hidden><div class="progressBar" id="quoteProgress"></div></div>
      <div class="quoteEditor editPanel is-collapsed" id="quoteEditor" data-admin-only hidden aria-hidden="true">
        <aside class="quoteList">
          <div class="quoteListHeader">
            <span>Quotes</span>
            <button class="quoteAddButton" type="button">Add</button>
          </div>
          <p id="quoteEditorStatus" role="status"></p>
          <ul id="quoteListItems"></ul>
        </aside>
      </div>
    </section>
  `;
}

function quoteRecord(id, data) {
	return {
		id,
		text: typeof data.text === "string" ? data.text : "",
		author: typeof data.author === "string" ? data.author : "",
		visible: data.visible,
	};
}

function quoteDate(value) {
	return typeof value?.toMillis === "function"
		? value.toMillis()
		: Date.parse(value) || 0;
}

function quoteEditorRow(quote, index, isEditing) {
	if (isEditing) {
		return `
      <li class="quote-list-item editing">
        <div class="quote-inline-editor">
          <textarea class="quote-inline-text" rows="3" placeholder="Quote text">${sanitizeText(quote.text)}</textarea>
          <input class="quote-inline-author" type="text" placeholder="Author" value="${sanitizeText(quote.author)}"/>
          <div class="quote-inline-actions">
            <button class="quote-inline-save" type="button" data-index="${index}">Save</button>
            <button class="quote-inline-cancel" type="button" data-index="${index}">Cancel</button>
            ${quote.id ? `<button class="quote-inline-delete" type="button" data-index="${index}">Delete</button>` : ""}
          </div>
        </div>
      </li>
    `;
	}

	const visible = quote.visible === true;
	const text = sanitizeText(quote.text.slice(0, 32) || "Untitled");
	const ellipsis = quote.text.length > 32 ? "…" : "";
	let visibilityLabel = "Show to public";
	if (visible) visibilityLabel = "Hide from public";
	if (quote.visible === undefined) visibilityLabel = "Publish legacy quote";
	return `
    <li class="quote-list-item${visible ? "" : " quote-hidden"}">
      <button class="quoteListButton" type="button" data-index="${index}"${visible ? "" : " disabled"}>${text}${ellipsis}</button>
      <button class="quote-visibility-button" type="button" data-index="${index}" title="${visibilityLabel}" aria-label="${visibilityLabel}">
        <i class="fas fa-eye${visible ? "" : "-slash"}" aria-hidden="true"></i>
      </button>
      <button class="quote-edit-button" type="button" data-index="${index}" title="Edit">✎</button>
    </li>
  `;
}

export function renderQuotes() {
	const mainContent = $("#mainContent");
	if (!mainContent) return;
	mainContent.innerHTML = getQuotesTemplate();
	initQuotes();
}

export function initQuotes() {
	destroyQuotes();
	const quoteBox = $("#quoteBox");
	if (!quoteBox) return;

	const quoteText = $("#quoteText");
	const quoteCite = $("#quoteCite");
	const availability = $("#quoteAvailability");
	const progressBar = $("#quoteProgress");
	const editQuotesBtn = $("#editQuotesBtn");
	const quoteEditor = $("#quoteEditor");
	const quoteListItems = $("#quoteListItems");
	const editorStatus = $("#quoteEditorStatus");
	const quoteAddButton = $(".quoteAddButton");
	const quotesRef = getFirestore()?.collection("Quotes");
	let publicQuotes = [];
	let publicRequest = 0;
	let editor;
	let interval;
	let transition;
	let mounted = true;

	function showPublicQuote(
		quote,
		emptyMessage = "No favorite quotes to show yet.",
	) {
		quoteBox.hidden = !quote;
		progressBar.parentElement.hidden = publicQuotes.length < 2;
		availability.hidden = Boolean(quote);
		availability.textContent = quote ? "" : emptyMessage;
		quoteText.textContent = quote ? `"${quote.text}"` : "";
		quoteCite.textContent = quote ? `— ${quote.author || "Unknown"}` : "";
		quoteBox.classList.toggle("active", Boolean(quote));
		progressBar.style.transition = "none";
		progressBar.style.width = quote ? "100%" : "0%";
		if (publicQuotes.length > 1) {
			void progressBar.offsetWidth;
			progressBar.style.transition = "width linear 6.4s";
			progressBar.style.width = "0%";
		}
	}

	function startCarousel(startIndex = 0, emptyMessage) {
		clearInterval(interval);
		clearTimeout(transition);
		showPublicQuote(publicQuotes[startIndex], emptyMessage);
		if (publicQuotes.length < 2) return;

		let index = startIndex;
		interval = setInterval(() => {
			quoteBox.classList.remove("active");
			transition = setTimeout(() => {
				index = (index + 1) % publicQuotes.length;
				showPublicQuote(publicQuotes[index]);
			}, 600);
		}, slideMs);
	}

	async function refreshPublicQuotes() {
		const unavailable = "Favorite quotes are unavailable right now.";
		if (!quotesRef) {
			startCarousel(0, unavailable);
			return;
		}
		const request = ++publicRequest;
		const visibleQuotes = [];
		let message;
		try {
			// A single-field query avoids needing a composite index for quote dates.
			const snapshot = await quotesRef
				.where("visible", "==", true)
				.get(SERVER_READ);
			if (!mounted || request !== publicRequest) return;
			if (snapshot.metadata?.fromCache || snapshot.metadata?.hasPendingWrites)
				throw new Error("Public quote data could not be confirmed.");
			snapshot.forEach((doc) => {
				const data = doc.data();
				if (
					data.visible === true &&
					typeof data.text === "string" &&
					data.text.trim()
				) {
					visibleQuotes.push({
						...quoteRecord(doc.id, data),
						date: quoteDate(data.createdAt),
					});
				}
			});
		} catch (error) {
			message = unavailable;
			if (mounted && request === publicRequest)
				console.warn("Unable to load public quotes:", error);
		}
		if (!mounted || request !== publicRequest) return;
		publicQuotes = visibleQuotes.sort((a, b) => b.date - a.date);
		startCarousel(0, message);
	}

	function closeEditor() {
		if (editor) {
			editor.quotes = [];
			editor = undefined;
		}
		quoteEditor.classList.add("is-collapsed");
		editQuotesBtn.textContent = "Edit";
		editQuotesBtn.setAttribute("aria-expanded", "false");
		quoteListItems.replaceChildren();
		editorStatus.textContent = "";
	}

	function renderEditor() {
		quoteListItems.innerHTML = editor.quotes
			.map((quote, index) =>
				quoteEditorRow(quote, index, index === editor.editingIndex),
			)
			.join("");
	}

	async function refreshEditorQuotes(session) {
		editorStatus.textContent = "Loading quotes…";
		try {
			if (!quotesRef)
				throw new Error("Could not connect to the quote archive.");
			const snapshot = await quotesRef
				.orderBy("createdAt", "desc")
				.get(SERVER_READ);
			if (editor !== session || !isAdminUser()) return;
			const quotes = [];
			snapshot.forEach((doc) => {
				quotes.push(quoteRecord(doc.id, doc.data()));
			});
			session.quotes = quotes;
			renderEditor();
			editorStatus.textContent = "";
		} catch (error) {
			if (editor === session) {
				editorStatus.textContent =
					"Couldn’t reload the quote list. Close and reopen the editor to retry.";
				console.warn("Unable to load quote editor:", error);
			}
		}
	}

	async function changeQuote(session, change, errorMessage, removedId) {
		session.saving = true;
		try {
			await change();
			if (!mounted) return;
			if (removedId) {
				publicQuotes = publicQuotes.filter((quote) => quote.id !== removedId);
				startCarousel();
			}
			void refreshPublicQuotes();
			if (editor !== session) return;
			session.editingIndex = null;
			session.quotes = [];
			renderEditor();
			await refreshEditorQuotes(session);
		} catch (error) {
			if (editor === session) {
				console.warn(errorMessage, error);
				alert(errorMessage);
			}
		} finally {
			session.saving = false;
		}
	}

	const cleanup = [
		onAuthStateChange(() => {
			closeEditor();
			const hidden = !isAdminUser();
			for (const element of [editQuotesBtn, quoteEditor]) {
				element.hidden = hidden;
				element.setAttribute("aria-hidden", String(hidden));
			}
			void refreshPublicQuotes();
		}),
		addListener(editQuotesBtn, "click", () => {
			if (!ensureAdmin("edit quotes")) return;
			if (editor) {
				closeEditor();
				return;
			}
			editor = { quotes: [], editingIndex: null, saving: true };
			quoteEditor.classList.remove("is-collapsed");
			editQuotesBtn.textContent = "Close";
			editQuotesBtn.setAttribute("aria-expanded", "true");
			const session = editor;
			void refreshEditorQuotes(session).finally(() => {
				session.saving = false;
			});
		}),
		addListener(quoteAddButton, "click", () => {
			if (!editor || editor.saving || !ensureAdmin("add quote")) return;
			if (!editor.quotes.length || editor.quotes[0].id) {
				editor.quotes.unshift({ text: "", author: "" });
			}
			editor.editingIndex = 0;
			renderEditor();
		}),
		addListener(quoteListItems, "click", (event) => {
			if (!editor || editor.saving || !ensureAdmin("manage quotes")) return;
			const button = event.target.closest("button[data-index]");
			if (!button) return;
			const index = Number(button.dataset.index);
			const quote = editor.quotes[index];
			if (!quote) return;

			if (button.matches(".quoteListButton")) {
				if (quote.visible !== true) return;
				const publicIndex = publicQuotes.findIndex(
					(item) => item.id === quote.id,
				);
				if (publicIndex >= 0) startCarousel(publicIndex);
			} else if (button.matches(".quote-edit-button")) {
				editor.editingIndex = index;
				renderEditor();
			} else if (button.matches(".quote-inline-cancel")) {
				if (!quote.id) editor.quotes.splice(index, 1);
				editor.editingIndex = null;
				renderEditor();
			} else if (button.matches(".quote-inline-save")) {
				const row = button.closest(".quote-list-item");
				const text = row.querySelector(".quote-inline-text").value.trim();
				const author = row.querySelector(".quote-inline-author").value.trim();
				if (!text) {
					alert("Quote text required");
					return;
				}
				if (!quotesRef || !confirm("Save this quote?")) return;

				const record = {
					text: validateLength(text, 1000),
					author: validateLength(author, 200),
					updatedAt: new Date().toISOString(),
				};
				const save = quote.id
					? () => quotesRef.doc(quote.id).set(record, { merge: true })
					: () =>
							quotesRef.add({
								...record,
								visible: true,
								createdAt: record.updatedAt,
							});
				void changeQuote(editor, save, "Unable to save quote");
			} else if (button.matches(".quote-inline-delete")) {
				if (!quotesRef || !quote.id || !confirm("Delete this quote?")) return;
				void changeQuote(
					editor,
					() => quotesRef.doc(quote.id).delete(),
					"Unable to delete quote",
					quote.id,
				);
			} else if (button.matches(".quote-visibility-button")) {
				if (!quotesRef || !quote.id) return;
				const visible = quote.visible !== true;
				const updateVisibility = () =>
					quotesRef
						.doc(quote.id)
						.update({ visible, updatedAt: new Date().toISOString() });
				void changeQuote(
					editor,
					updateVisibility,
					"Unable to change quote visibility",
					visible ? undefined : quote.id,
				);
			}
		}),
	];

	cleanupQuotes = () => {
		mounted = false;
		for (const remove of cleanup) remove();
		closeEditor();
		publicQuotes = [];
		startCarousel();
	};
}

export function destroyQuotes() {
	cleanupQuotes?.();
	cleanupQuotes = undefined;
}
