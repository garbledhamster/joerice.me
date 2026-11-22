import { isAdminUser, onAuthStateChange } from "../services/auth.js";
import {
	getEditableNotes,
	isPortfolioExampleAddress,
	readFolderCopyForEdit,
	readNoteForEdit,
	saveFolderCopy,
	saveFolderNote,
} from "./content-store.js";
import { startingCatalog } from "./starting-catalog.js";

const copyPages = new Map([
	["guide", "How to build an idea"],
	["employers", "For employers"],
]);

function addOptions(element, items) {
	for (const [value, label] of items) element.append(new Option(label, value));
}

function fillNote(fields, note) {
	fields.title.value = note.title;
	fields.included.value = note.included.join("\n");
	fields.exampleHref.value = note.exampleHref;
	fields.category.value = note.category;
	fields.order.value = String(note.order);
	fields.hidden.checked = note.hidden;
}

function noteValues(fields) {
	const title = fields.title.value.trim();
	const included = fields.included.value
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	const exampleHref = fields.exampleHref.value.trim();
	const order = fields.order.valueAsNumber;
	if (!title || !included.length)
		throw new Error("Enter a title and at least one included item.");
	if (!Number.isSafeInteger(order) || order < 0) {
		throw new Error("Enter an order of zero or a higher whole number.");
	}
	if (exampleHref && !isPortfolioExampleAddress(exampleHref)) {
		throw new Error("Use a complete HTTPS address for the example.");
	}

	return {
		title,
		included,
		exampleHref,
		category: fields.category.value,
		order,
		hidden: fields.hidden.checked,
	};
}

const noteFields = `
	<label class="portfolioField">Note title
		<input type="text" name="title" required>
	</label>
	<label class="portfolioField">Included work (one item per line)
		<textarea name="included" rows="4" required></textarea>
	</label>
	<label class="portfolioField">Example link (optional)
		<input type="text" name="exampleHref" inputmode="url">
	</label>
	<label class="portfolioField">Category
		<select name="category" required></select>
	</label>
	<label class="portfolioField">Order (0 first)
		<input type="number" name="order" min="0" step="1" required>
	</label>
	<label class="portfolioFieldCheckbox folder-editor-visibility">
		<input type="checkbox" name="hidden">
		Hide this note from visitors
	</label>
`;

const copyFields = `
	<label class="portfolioField">Page copy (leave a blank line between paragraphs)
		<textarea name="text" rows="6" required></textarea>
	</label>
`;

export function mountFolderEditor(container, { getCopy, refresh }) {
	let open = false;
	let adminId = null;
	let selection;

	function clear() {
		selection = null;
		container.replaceChildren();
	}

	function showEditor() {
		clear();
		if (adminId === null || !isAdminUser()) {
			container.innerHTML = `
				<p>Sign in with the admin email to edit portfolio content.</p>
				<button class="portfolioSaveButton" type="button">Sign in</button>
			`;
			const signIn = container.querySelector("button");
			signIn.addEventListener("click", () =>
				document.getElementById("loginButton")?.click(),
			);
			signIn.focus();
			return;
		}

		container.innerHTML = `
			<div class="folder-editor">
				<label class="portfolioField">Content to edit
					<select name="content">
						<option value="">Choose a note or page</option>
						<optgroup label="Notes"></optgroup>
						<optgroup label="Pages"></optgroup>
					</select>
				</label>
				<div class="folder-editor-form"></div>
				<p class="portfolioEditorStatus" role="status" tabindex="-1"></p>
			</div>
		`;
		const picker = container.querySelector("select");
		const [noteOptions, pageOptions] = picker.querySelectorAll("optgroup");
		addOptions(
			noteOptions,
			getEditableNotes().map(({ id, title }) => [id, title]),
		);
		addOptions(pageOptions, copyPages);
		const formSlot = container.querySelector(".folder-editor-form");
		const status = container.querySelector("[role=status]");

		function announce(message, focus = true) {
			status.textContent = message;
			if (focus) status.focus();
		}

		async function loadSelection() {
			const current = { id: picker.value };
			selection = current;
			const isCurrent = () => selection === current && isAdminUser();
			const isCopy = copyPages.has(current.id);
			formSlot.replaceChildren();
			announce("", false);
			if (!current.id) return;

			let currentContent;
			announce(
				isCopy ? "Loading page copy…" : "Loading note…",
				document.activeElement !== picker,
			);
			try {
				currentContent = isCopy
					? await readFolderCopyForEdit(current.id)
					: await readNoteForEdit(current.id);
			} catch {
				if (!isCurrent()) return;
				const retry = document.createElement("button");
				retry.type = "button";
				retry.className = "portfolioSaveButton";
				retry.textContent = "Retry loading";
				retry.addEventListener("click", loadSelection);
				formSlot.replaceChildren(retry);
				announce(
					isCopy ? "Couldn’t load this page copy." : "Couldn’t load this note.",
				);
				return;
			}
			if (!isCurrent()) return;

			const form = document.createElement("form");
			form.innerHTML = `
				<fieldset class="folder-editor-fields">
					<legend>${isCopy ? "Page copy" : "Note details"}</legend>
					${isCopy ? copyFields : noteFields}
					<button class="portfolioSaveButton" type="submit">Save</button>
				</fieldset>
			`;
			const fields = form.elements;
			const fieldset = form.querySelector("fieldset");
			if (isCopy) {
				fields.text.value = currentContent ?? getCopy(current.id) ?? "";
			} else {
				addOptions(
					fields.category,
					startingCatalog.map(({ id, name }) => [id, name]),
				);
				fillNote(fields, currentContent);
			}
			formSlot.replaceChildren(form);
			if (document.activeElement === status)
				form.querySelector("input, textarea").focus();
			announce("", false);

			async function save(event) {
				event.preventDefault();
				if (!isCurrent() || fieldset.disabled) return;

				let values;
				try {
					values = isCopy ? fields.text.value.trim() : noteValues(fields);
					if (values === "")
						throw new Error("Enter the copy you want to publish.");
				} catch (error) {
					announce(error.message);
					return;
				}

				picker.disabled = true;
				fieldset.disabled = true;
				announce("Saving…");
				let result;
				try {
					if (isCopy) await saveFolderCopy(current.id, values);
					else await saveFolderNote(current.id, values);
					if (!isCurrent()) return;
					try {
						if ((await refresh()) === false)
							throw new Error("Public refresh unavailable.");
						result = "Saved.";
					} catch {
						result = "Saved. Reload the page to see the update.";
					}
				} catch {
					result = "Couldn’t save. Your changes are still here. Try again.";
				} finally {
					if (isCurrent()) {
						picker.disabled = false;
						fieldset.disabled = false;
						announce(result, document.activeElement === status);
					}
				}
			}

			form.addEventListener("submit", save);
		}

		picker.addEventListener("change", loadSelection);
		picker.focus();
	}

	onAuthStateChange((user) => {
		const nextAdminId = isAdminUser() ? (user?.uid ?? null) : null;
		if (adminId === nextAdminId) return;
		adminId = nextAdminId;
		if (open) showEditor();
	});

	function openEditor() {
		open = true;
		showEditor();
	}

	openEditor.close = () => {
		open = false;
		clear();
	};

	return openEditor;
}
