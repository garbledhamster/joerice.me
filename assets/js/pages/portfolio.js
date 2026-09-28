/**
 * @file pages/portfolio.js
 * @description Portfolio page module
 *
 * Displays all portfolio entries with search and inline post viewing.
 * Supports Firestore, local storage, and YAML post sources
 */

import { closeModal, openModal } from "../components/modal.js";
import { $, $$, addListener } from "../core/dom.js";
import {
	ensureAdmin,
	getFirestore,
	isAdminUser,
	onAuthStateChange,
} from "../services/auth.js";
import {
	relatedServices,
	selectService,
	servicePicker,
} from "../services/catalog.js";
import { importedPostId, savePost } from "../services/post-storage.js";
import { sanitizeMarkdown, sanitizeText } from "../services/sanitize.js";

// State
const pinned = [];
const notes = [];
const yamlEntries = [];
let currentPost = null;
let openAccordion = null;
let postOpenRequestId = 0;
let editingPostId = null;
let editingPostSource = null;
let editingPostCreatedDate = null;
let hasLoadedInitialPosts = false;
let relatedPostsStatus = "loading";

export function getRelatedPosts(serviceId) {
	return {
		status: relatedPostsStatus,
		posts: [...pinned, ...notes].filter(
			(post) =>
				post.published !== false && post.serviceIds?.includes(serviceId),
		),
	};
}

// DOM references
let pinnedGrid = null;
let entryGrid = null;
let searchInput = null;
let cleanupFns = [];

/**
 * Get portfolio page HTML template
 * @returns {string} Portfolio page HTML
 */
export function getPortfolioTemplate() {
	return `
    <div class="search"><input id="q" type="search" placeholder="Search posts and notes..."/></div>
    <section class="portfolio" id="portfolioSection">
      <div class="sectionHeader">
        <div class="sectionHeaderLeft">
          <h2>Portfolio</h2>
          <button class="refreshBtn" id="refreshPostsBtn" type="button" title="Refresh posts" aria-label="Refresh posts">
            <i class="fas fa-sync"></i>
          </button>
        </div>
        <button class="editBtn" id="addPortfolioBtn" type="button" data-admin-only>Add Post</button>
      </div>
      <div class="portfolioStatus" id="portfolioStatus" hidden></div>
      <div class="subhead">Pinned</div>
      <div class="grid" id="pinnedGrid"></div>
      <div class="subhead">Posts</div>
      <div class="grid" id="entryGrid"></div>
    </section>
  `;
}

/**
 * Format a post entry for display
 * @param {Object} post - Post data
 * @param {number} index - Entry index within its collection
 * @param {string} group - Collection name used to create a unique DOM ID
 * @returns {string} Entry HTML
 */
function formatPostEntry(post, index, group) {
	const safeTitle = sanitizeText(post.title);
	const safeTags = (post.tags || []).map((t) => sanitizeText(t)).join("|");
	const safeUrl = sanitizeText(post.url);
	const sourceAttr = post.source
		? ` data-source="${sanitizeText(post.source)}"`
		: "";
	const idAttr = post.id ? ` data-id="${sanitizeText(post.id)}"` : "";
	const publishedAttr =
		post.published !== undefined ? ` data-published="${post.published}"` : "";
	const unpublishedIndicator =
		post.published === false && isAdminUser() ? " [DRAFT]" : "";
	const readerId = `post-reader-${group}-${index}`;
	const canManage = isAdminUser();
	const managementControls = canManage
		? `
        <div class="postTitleActions" data-admin-only>
          <button class="postTitleEditButton" type="button" data-admin-action="edit post" aria-label="Edit ${safeTitle}">Edit</button>
          ${post.source === "firestore" ? `<button class="postTitleDeleteButton" type="button" data-admin-action="delete post" aria-label="Delete ${safeTitle}">Delete</button>` : ""}
        </div>
      `
		: "";

	return `
    <article class="postAccordion" data-tags="${safeTags}">
      <div class="postTitleRow${canManage ? " is-manageable" : ""}">
        <button class="entry postTitleButton" type="button" data-url="${safeUrl}"${sourceAttr}${idAttr}${publishedAttr} aria-expanded="false" aria-controls="${readerId}">
          <span>${safeTitle}${unpublishedIndicator}</span>
          <span class="postToggleIcon" aria-hidden="true">+</span>
        </button>
        ${managementControls}
      </div>
      <div class="postInlineViewer" id="${readerId}" aria-hidden="true">
        <div class="postInlineClip">
          <div class="postInlineReader">
            <div class="postInlineActions">
              <button class="closePostButton" type="button">close</button>
            </div>
            <div class="postInlineBody"></div>
          </div>
        </div>
      </div>
    </article>
  `;
}

/**
 * Get posts collection reference
 * @returns {Object|null} Firestore collection ref
 */
function getPostsCollectionRef() {
	const firestore = getFirestore();
	return firestore ? firestore.collection("Posts") : null;
}

/**
 * Check if post is published
 * @param {Object} data - Post data
 * @returns {boolean} Whether post is published
 */
function isPostPublished(data) {
	const publishedLower = data?.published;
	const publishedUpper = data?.Published;
	if (publishedLower === false || publishedUpper === false) return false;
	return true;
}

/**
 * Load posts from Firestore
 */
async function loadFirestorePosts() {
	const postsRef = getPostsCollectionRef();
	relatedPostsStatus = "loading";
	window.dispatchEvent(new Event("portfolio-posts-change"));

	try {
		if (!postsRef) throw new Error("Posts are not connected.");
		let query = postsRef;
		if (!isAdminUser()) {
			query = postsRef.where("published", "==", true);
		}

		const snapshot = await query.get();
		const firestoreEntries = [];
		const overriddenSources = new Set();

		snapshot.forEach((doc) => {
			const data = doc.data() || {};
			if (data.sourceUrl) overriddenSources.add(data.sourceUrl);
			if (data.kind === "source-override" || data.kind === "service") return;
			const isPublished = isPostPublished(data);
			const isPinned = data.pinned === true;

			firestoreEntries.push({
				title: data.title ?? data.Title ?? "Untitled",
				date:
					data["Created Date"] || data.createdDate || new Date().toISOString(),
				url: `firestore:${doc.id}`,
				pinned: isPinned,
				tags: [],
				id: doc.id,
				source: "firestore",
				published: isPublished,
				serviceIds: Array.isArray(data.serviceIds) ? data.serviceIds : [],
			});
		});

		// Clear existing firestore entries
		const fallbackEntries = yamlEntries.filter(
			(post) => !overriddenSources.has(post.url),
		);
		const otherPinned = fallbackEntries.filter((post) => post.pinned);
		const otherNotes = fallbackEntries.filter((post) => !post.pinned);

		pinned.length = 0;
		notes.length = 0;

		pinned.push(...otherPinned, ...firestoreEntries.filter((e) => e.pinned));
		notes.push(...otherNotes, ...firestoreEntries.filter((e) => !e.pinned));

		pinned.sort((a, b) => new Date(b.date) - new Date(a.date));
		notes.sort((a, b) => new Date(b.date) - new Date(a.date));
		relatedPostsStatus = "ready";
	} catch (error) {
		relatedPostsStatus = "error";
		console.warn("Unable to load Firestore posts:", error);
	} finally {
		window.dispatchEvent(new Event("portfolio-posts-change"));
	}
}

/**
 * Set editor status message
 * @param {string} message - Status message
 */
function setEditorStatus(message) {
	const editorStatus = $("#portfolioEditorStatus");
	if (editorStatus) {
		editorStatus.textContent = message || "";
	}
}

/**
 * Get post title from post object
 * @param {Object} post - Post object
 * @returns {string} Post title
 */
function getPostTitle(post) {
	if (!post) return "Untitled";
	// Handle flat structure (when post has title directly)
	if (post.title?.trim()) return post.title;
	// Handle nested structure (when post has data.title)
	if (post.data) {
		const title = post.data.title ?? post.data.Title;
		if (title?.trim()) return title;
	}
	return "Untitled";
}

/**
 * Populate and open the portfolio editor modal
 * @param {Object|null} post - Post to edit, or null for new post
 */
function openPortfolioEditor(post = null) {
	const portfolioModal = $("#portfolioModal");
	const portfolioModalTitle = $("#portfolioModalTitle");
	const portfolioPostTitle = $("#portfolioPostTitle");
	const portfolioPostBody = $("#portfolioPostBody");
	const portfolioPostPublished = $("#portfolioPostPublished");
	const portfolioPostPinned = $("#portfolioPostPinned");
	const portfolioDeleteButton = $("#portfolioDeleteButton");

	if (!portfolioModal) return;

	// Only allow editing of local and firestore posts
	const isReadOnlyPost =
		Boolean(post) && !["local", "firestore"].includes(post?.source ?? "");

	// Set editing state
	editingPostId = post?.id ?? null;
	editingPostSource = post?.source ?? null;
	editingPostCreatedDate = post?.createdDate ?? null;

	if (isReadOnlyPost) {
		editingPostId = null;
		editingPostSource = null;
		editingPostCreatedDate = null;
	}

	// Update modal title
	if (portfolioModalTitle) {
		portfolioModalTitle.textContent = editingPostId ? "Edit Post" : "Add Post";
	}

	// Populate form fields
	if (portfolioPostTitle) {
		portfolioPostTitle.value = post ? getPostTitle(post) : "";
	}

	if (portfolioPostBody) {
		portfolioPostBody.value = post?.content || "";
	}

	if (portfolioPostPublished) {
		// Default to checked (published) for new posts, use existing value for edits
		portfolioPostPublished.checked = post?.published !== false;
	}

	if (portfolioPostPinned) {
		// Default to unchecked (not pinned) for new posts, use existing value for edits
		portfolioPostPinned.checked = post?.pinned === true;
	}

	// Configure delete button
	if (portfolioDeleteButton) {
		portfolioDeleteButton.disabled = !editingPostId || isReadOnlyPost;
	}

	// Set read-only state
	if (isReadOnlyPost) {
		if (portfolioPostTitle) portfolioPostTitle.readOnly = true;
		if (portfolioPostBody) portfolioPostBody.readOnly = true;
		if (portfolioPostPublished) portfolioPostPublished.disabled = true;
		if (portfolioPostPinned) portfolioPostPinned.disabled = true;
		const saveButton = $("#portfolioSaveButton");
		if (saveButton) saveButton.disabled = true;
		setEditorStatus("Preloaded posts are read-only.");
	} else {
		if (portfolioPostTitle) portfolioPostTitle.readOnly = false;
		if (portfolioPostBody) portfolioPostBody.readOnly = false;
		if (portfolioPostPublished) portfolioPostPublished.disabled = false;
		if (portfolioPostPinned) portfolioPostPinned.disabled = false;
		const saveButton = $("#portfolioSaveButton");
		if (saveButton) saveButton.disabled = false;
		setEditorStatus("");
	}

	// Open modal
	$("#portfolioServicePicker").innerHTML = servicePicker(
		post?.serviceIds || [],
	);
	openModal("portfolioModal");

	// Focus title field
	setTimeout(() => portfolioPostTitle?.focus(), 0);
}

/**
 * Render pinned posts
 */
function renderPinned() {
	if (!pinnedGrid) return;
	if (openAccordion && pinnedGrid.contains(openAccordion))
		closePost(openAccordion);
	pinnedGrid.innerHTML = pinned
		.map((post, index) => formatPostEntry(post, index, "pinned"))
		.join("");
}

/**
 * Render every non-pinned post.
 */
export function renderPage() {
	if (!entryGrid) return;
	if (openAccordion && entryGrid.contains(openAccordion))
		closePost(openAccordion);
	entryGrid.innerHTML = notes
		.map((post, index) => formatPostEntry(post, index, "post"))
		.join("");
}

/**
 * Handle post controls through the stable grid container so Firestore refreshes
 * can replace entries without dropping their interactions.
 * @param {Event} event - Grid click event
 */
function handlePostGridClick(event) {
	const accordion = event.target.closest(".postAccordion");
	if (!accordion) return;

	if (event.target.closest(".postTitleEditButton")) {
		void openInlinePostEditor(accordion);
		return;
	}

	if (event.target.closest(".postTitleDeleteButton")) {
		void deletePostFromTitle(accordion);
		return;
	}

	if (event.target.closest(".closePostButton")) {
		closePost(accordion);
		return;
	}

	if (event.target.closest(".postInlineCancelButton")) {
		renderCurrentPost(accordion);
		return;
	}

	const titleButton = event.target.closest(".postTitleButton");
	if (!titleButton) return;

	if (openAccordion === accordion) {
		closePost(accordion);
		return;
	}

	closePost(openAccordion);
	void openPost(titleButton.dataset.url, accordion);
}

/**
 * Render the active post as an inline editor.
 * @param {Element} accordion - Post accordion
 */
function renderInlinePostEditor(accordion) {
	const postBody = $(".postInlineBody", accordion);
	if (!postBody || !currentPost) return;

	const safeTitle = sanitizeText(getPostTitle(currentPost));
	const safeContent = sanitizeText(currentPost.content || "");
	postBody.innerHTML = `
    <form class="postInlineEditor" data-id="${sanitizeText(currentPost.id)}">
      <label>Title
        <input name="title" type="text" value="${safeTitle}" required/>
      </label>
      <label>Post
        <textarea class="postEditor" name="body" required>${safeContent}</textarea>
      </label>
      <div class="postInlineOptions">
        <label><input name="published" type="checkbox"${currentPost.published !== false ? " checked" : ""}/> Published</label>
        <label><input name="pinned" type="checkbox"${currentPost.pinned === true ? " checked" : ""}/> Pinned</label>
      </div>
      ${servicePicker(currentPost.serviceIds || [])}
      <div class="editorControls">
        <button class="postInlineCancelButton cancelBtn" type="button">Cancel</button>
        <button class="postInlineSaveButton saveBtn" type="submit">Save</button>
      </div>
      <p class="postInlineEditorStatus" role="status" aria-live="polite"></p>
    </form>
  `;
	accordion.classList.add("is-editing");
	$("input[name='title']", postBody)?.focus();
}

/**
 * Load a post and open its editor inside the accordion.
 * @param {Element} accordion - Post accordion
 */
async function openInlinePostEditor(accordion) {
	if (!ensureAdmin("edit post")) return;
	const titleButton = $(".postTitleButton", accordion);
	if (!titleButton) return;

	if (
		openAccordion !== accordion ||
		currentPost?.url !== titleButton.dataset.url
	) {
		closePost(openAccordion);
		const loadedPost = await openPost(titleButton.dataset.url, accordion);
		if (!loadedPost) return;
	}

	renderInlinePostEditor(accordion);
}

/**
 * Restore the rendered Markdown after cancelling an edit.
 * @param {Element} accordion - Post accordion
 */
function renderCurrentPost(accordion) {
	const postBody = $(".postInlineBody", accordion);
	if (!postBody || !currentPost) return;
	postBody.innerHTML =
		sanitizeMarkdown(currentPost.content || "") +
		relatedServices(currentPost.serviceIds || []);
	accordion.classList.remove("is-editing");
}

/**
 * Delete an editable post from its title-row control.
 * @param {Element} accordion - Post accordion
 */
async function deletePostFromTitle(accordion) {
	if (!ensureAdmin("delete post")) return;
	const titleButton = $(".postTitleButton", accordion);
	const postId = titleButton?.dataset.id;
	if (!postId || titleButton.dataset.source !== "firestore") return;
	if (
		!confirm(
			"Are you sure you want to delete this post? This cannot be undone.",
		)
	)
		return;

	const postsRef = getPostsCollectionRef();
	if (!postsRef) return;

	try {
		await postsRef.doc(postId).delete();
		if (openAccordion === accordion) closePost(accordion);
		await loadFirestorePosts();
		renderPinned();
		renderPage();
	} catch (error) {
		console.warn("Unable to delete post.", error);
	}
}

/**
 * Save an existing post from its inline editor.
 * @param {Event} event - Form submit event
 */
async function handlePostGridSubmit(event) {
	const form = event.target.closest(".postInlineEditor");
	if (!form) return;
	event.preventDefault();
	if (!ensureAdmin("save post")) return;
	const accordion = form.closest(".postAccordion");
	const postId = form.dataset.id;
	if (accordion !== openAccordion || !postId || currentPost?.id !== postId)
		return;

	const title = form.elements.title.value.trim();
	const content = form.elements.body.value.trim();
	const status = $(".postInlineEditorStatus", form);
	if (!title || !content) return;

	const postsRef = getPostsCollectionRef();
	if (!postsRef) {
		if (status) status.textContent = "Firestore is not available.";
		return;
	}

	const saveButton = $(".postInlineSaveButton", form);
	if (saveButton?.disabled) return;
	if (saveButton) saveButton.disabled = true;
	const savedPost = currentPost;

	try {
		await savePost(savedPost, {
			title,
			body: content,
			published: form.elements.published.checked,
			pinned: form.elements.pinned.checked,
			serviceIds: Array.from(
				form.querySelectorAll('[name="serviceIds"]:checked'),
				(input) => input.value,
			),
		});
		await loadFirestorePosts();
		if (openAccordion === accordion && currentPost === savedPost) {
			renderPinned();
			renderPage();
		}
	} catch (error) {
		console.warn("Unable to save post.", error);
		if (status) status.textContent = "Unable to save this post right now.";
		if (saveButton) saveButton.disabled = false;
	}
}

/**
 * Open a post inside its accordion.
 * @param {string} url - Post URL/ID
 * @param {Element} accordion - Accordion that owns the inline reader
 */
async function openPost(url, accordion) {
	const requestId = ++postOpenRequestId;
	currentPost = null;
	openAccordion = accordion;

	const titleButton = $(".postTitleButton", accordion);
	const viewer = $(".postInlineViewer", accordion);
	const postBody = $(".postInlineBody", accordion);

	titleButton?.classList.add("active");
	titleButton?.setAttribute("aria-expanded", "false");
	viewer?.setAttribute("aria-hidden", "true");
	accordion.classList.add("is-loading");
	if (postBody) postBody.innerHTML = "<p>Loading post…</p>";

	let loadedPost = null;
	let renderedContent = "";

	try {
		if (url.startsWith("firestore:")) {
			const postId = url.replace("firestore:", "");
			const postsRef = getPostsCollectionRef();
			if (!postsRef) throw new Error("Firestore unavailable");

			const doc = await postsRef.doc(postId).get();
			if (!doc.exists) throw new Error("Post unavailable");

			const data = doc.data() || {};
			const content = data.body ?? data.Body ?? "";

			loadedPost = {
				url,
				data,
				content,
				id: postId,
				source: "firestore",
				createdDate: data["Created Date"] || data.createdDate,
				published: isPostPublished(data),
				pinned: data.pinned === true,
				serviceIds: Array.isArray(data.serviceIds) ? data.serviceIds : [],
			};
			renderedContent =
				sanitizeMarkdown(content) + relatedServices(loadedPost.serviceIds);
		} else {
			const yaml = globalThis.jsyaml;
			if (!yaml) throw new Error("YAML parser unavailable");
			const raw = await fetch(url).then((r) => r.text());
			const data = yaml.load(raw);
			const content = data.content || "";
			loadedPost = {
				url,
				data,
				content,
				source: "yaml",
				id: importedPostId(url),
				createdDate:
					data.date instanceof Date ? data.date.toISOString() : data.date,
				published: true,
				pinned: data.pinned === true,
				serviceIds: [],
			};
			renderedContent = sanitizeMarkdown(content);
		}
	} catch (error) {
		if (requestId !== postOpenRequestId || openAccordion !== accordion)
			return null;
		console.warn("Unable to load post:", error);
		renderedContent = "<p>Unable to load this post.</p>";
	}

	if (requestId !== postOpenRequestId || openAccordion !== accordion)
		return null;

	currentPost = loadedPost;
	if (postBody) postBody.innerHTML = renderedContent;
	accordion.classList.remove("is-loading");
	accordion.classList.add("is-open");
	titleButton?.setAttribute("aria-expanded", "true");
	viewer?.setAttribute("aria-hidden", "false");

	setTimeout(() => {
		if (requestId === postOpenRequestId && openAccordion === accordion) {
			accordion.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}, 220);

	return loadedPost;
}

/**
 * Close an inline post reader.
 * @param {Element|null} accordion - Accordion to close
 */
function closePost(accordion) {
	if (!accordion) return;
	const isActive = openAccordion === accordion;
	const titleButton = $(".postTitleButton", accordion);
	const viewer = $(".postInlineViewer", accordion);
	titleButton?.classList.remove("active");
	titleButton?.setAttribute("aria-expanded", "false");
	viewer?.setAttribute("aria-hidden", "true");
	accordion.classList.remove("is-loading");
	accordion.classList.remove("is-open");
	accordion.classList.remove("is-editing");
	if (isActive) {
		postOpenRequestId += 1;
		openAccordion = null;
		currentPost = null;
	}
}

/**
 * Set portfolio status message
 * @param {string} message - Status message
 */
function setPortfolioStatus(message) {
	const portfolioStatus = $("#portfolioStatus");
	if (!portfolioStatus) return;
	portfolioStatus.hidden = !message;
	portfolioStatus.textContent = message || "";
}

/**
 * Load posts from YAML files
 */
async function loadYamlPosts() {
	yamlEntries.length = 0;
	const yaml = globalThis.jsyaml;
	if (!yaml) {
		console.warn("YAML parser not available, skipping YAML posts.");
		return;
	}
	try {
		const loaderText = await fetch("posts/loader.yaml").then((r) => r.text());
		const loaderData = yaml.load(loaderText);
		const count = Number(loaderData.posts) || 0;
		for (let i = 1; i <= count; i++) {
			const filePath = `posts/${String(i).padStart(4, "0")}.yaml`;
			try {
				const raw = await fetch(filePath).then((r) => {
					if (!r.ok) throw new Error();
					return r.text();
				});
				const data = yaml.load(raw);
				const entry = {
					title: data.title,
					date: data.date,
					url: filePath,
					pinned: data.pinned,
					tags: data.tags || [],
					source: "yaml",
				};
				yamlEntries.push(entry);
				if (entry.pinned) pinned.push(entry);
				else notes.push(entry);
			} catch {}
		}
	} catch (error) {
		console.warn("Unable to load YAML posts.", error);
	}
}

/**
 * Load all posts
 */
async function loadPosts() {
	setPortfolioStatus("Loading posts...");
	await loadYamlPosts();
	await loadFirestorePosts();

	pinned.sort((a, b) => new Date(b.date) - new Date(a.date));
	notes.sort((a, b) => new Date(b.date) - new Date(a.date));

	renderPinned();
	renderPage();

	if (!pinned.length && !notes.length) {
		setPortfolioStatus("No posts available yet.");
	} else {
		setPortfolioStatus("");
	}
}

/**
 * Render portfolio page
 */
export function renderPortfolio() {
	const mainContent = $("#mainContent");
	if (!mainContent) return;

	mainContent.innerHTML = getPortfolioTemplate();
	initPortfolio();
}

/**
 * Initialize portfolio page
 */
export function initPortfolio() {
	pinnedGrid = $("#pinnedGrid");
	entryGrid = $("#entryGrid");
	searchInput = $("#q");

	if (!pinnedGrid || !entryGrid) return;

	cleanupFns.push(addListener(pinnedGrid, "click", handlePostGridClick));
	cleanupFns.push(addListener(entryGrid, "click", handlePostGridClick));
	cleanupFns.push(addListener(pinnedGrid, "submit", handlePostGridSubmit));
	cleanupFns.push(addListener(entryGrid, "submit", handlePostGridSubmit));
	cleanupFns.push(
		addListener($("#portfolioSection"), "change", (event) => {
			if (event.target.matches(".relatedServiceSelect"))
				selectService(event.target.value, event.target.checked);
		}),
	);
	cleanupFns.push(
		addListener(window, "service-catalog-change", () => {
			document
				.querySelectorAll(
					".postInlineEditor .servicePicker, #portfolioServicePicker .servicePicker",
				)
				.forEach((picker) => {
					const checked = Array.from(
						picker.querySelectorAll("input:checked"),
						(input) => input.value,
					);
					picker.outerHTML = servicePicker(checked);
				});
			if (openAccordion && !openAccordion.classList.contains("is-editing"))
				renderCurrentPost(openAccordion);
		}),
	);
	cleanupFns.push(
		addListener(window, "open-related-post", (event) => {
			const url = event.detail?.url;
			if (
				![...pinned, ...notes].some(
					(post) => post.url === url && post.published !== false,
				)
			)
				return;
			const findTitle = () =>
				Array.from(document.querySelectorAll(".postTitleButton")).find(
					(button) => button.dataset.url === url,
				);
			let title = findTitle();
			// A background YAML save may have created a new Firestore URL while
			// leaving another active reader untouched. Reconcile when navigating.
			if (!title) {
				renderPinned();
				renderPage();
				title = findTitle();
			}
			if (!title) return;
			if (searchInput) {
				searchInput.value = "";
				searchInput.dispatchEvent(new Event("input"));
			}
			const accordion = title.closest(".postAccordion");
			if (accordion !== openAccordion) {
				closePost(openAccordion);
				void openPost(title.dataset.url, accordion);
			} else {
				accordion.scrollIntoView({ block: "start", behavior: "smooth" });
			}
			title.focus({ preventScroll: true });
		}),
	);

	// Add post button
	const addPortfolioBtn = $("#addPortfolioBtn");
	if (addPortfolioBtn) {
		addPortfolioBtn.hidden = !isAdminUser();
		cleanupFns.push(
			addListener(addPortfolioBtn, "click", () => {
				if (!ensureAdmin("add post")) return;
				openPortfolioEditor(null);
			}),
		);
	}

	// Refresh posts button
	const refreshPostsBtn = $("#refreshPostsBtn");
	if (refreshPostsBtn) {
		cleanupFns.push(
			addListener(refreshPostsBtn, "click", async () => {
				// Clear existing posts
				pinned.length = 0;
				notes.length = 0;
				// Reload all posts
				await loadPosts();
			}),
		);
	}

	// Portfolio modal save button
	const portfolioSaveButton = $("#portfolioSaveButton");
	if (portfolioSaveButton) {
		cleanupFns.push(
			addListener(portfolioSaveButton, "click", async () => {
				if (!ensureAdmin("save portfolio post")) return;

				const portfolioPostTitle = $("#portfolioPostTitle");
				const portfolioPostBody = $("#portfolioPostBody");
				const portfolioPostPublished = $("#portfolioPostPublished");
				const portfolioPostPinned = $("#portfolioPostPinned");

				const title = portfolioPostTitle?.value.trim();
				const content = portfolioPostBody?.value.trim();

				if (!title || !content) {
					setEditorStatus("Title and post content are required.");
					return;
				}

				if (!confirm("Are you sure you want to save this post?")) {
					return;
				}

				const now = new Date().toISOString();
				const published = portfolioPostPublished?.checked ?? true;
				const pinned = portfolioPostPinned?.checked ?? false;
				const postsRef = getPostsCollectionRef();

				if (!postsRef) {
					setEditorStatus("Firestore is not available.");
					return;
				}

				try {
					if (portfolioSaveButton.disabled) return;
					portfolioSaveButton.disabled = true;
					const createdDate = editingPostCreatedDate ?? now;

					const savedId = await savePost(
						editingPostId
							? { id: editingPostId, source: editingPostSource, createdDate }
							: null,
						{
							title: title,
							body: content,
							createdDate: createdDate,
							lastEditedDate: now,
							published: published,
							pinned: pinned,
							serviceIds: Array.from(
								$("#portfolioServicePicker").querySelectorAll(
									'[name="serviceIds"]:checked',
								),
								(input) => input.value,
							),
						},
					);

					// Update state
					editingPostId = savedId;
					editingPostSource = "firestore";
					editingPostCreatedDate = createdDate;

					// Reload posts and re-render
					await loadFirestorePosts();
					renderPinned();
					renderPage();
					setPortfolioStatus("");
					closeModal("portfolioModal");

					// Clear editing state
					editingPostId = null;
					editingPostSource = null;
					editingPostCreatedDate = null;
				} catch (error) {
					console.warn("Unable to save post.", error);
					setEditorStatus("Unable to save this post right now.");
				} finally {
					portfolioSaveButton.disabled = false;
				}
			}),
		);
	}

	// Portfolio modal delete button
	const portfolioDeleteButton = $("#portfolioDeleteButton");
	if (portfolioDeleteButton) {
		cleanupFns.push(
			addListener(portfolioDeleteButton, "click", async () => {
				if (!ensureAdmin("delete portfolio post")) return;

				if (!editingPostId) {
					setEditorStatus("There is no post to delete.");
					return;
				}

				if (
					!confirm(
						"Are you sure you want to delete this post? This cannot be undone.",
					)
				) {
					return;
				}

				const postsRef = getPostsCollectionRef();
				if (!postsRef || editingPostSource !== "firestore") {
					setEditorStatus("Unable to delete this post.");
					return;
				}

				try {
					await postsRef.doc(editingPostId).delete();

					// Clear editing state
					editingPostId = null;
					editingPostSource = null;
					editingPostCreatedDate = null;

					// Reload posts and re-render
					await loadFirestorePosts();
					renderPinned();
					renderPage();
					setPortfolioStatus("");
					closeModal("portfolioModal");
				} catch (error) {
					console.warn("Unable to delete post.", error);
					setEditorStatus("Unable to delete this post right now.");
				}
			}),
		);
	}

	// Search
	if (searchInput) {
		cleanupFns.push(
			addListener(searchInput, "input", (e) => {
				const query = e.target.value.toLowerCase();
				$$(".postAccordion").forEach((accordion) => {
					accordion.style.display = accordion.textContent
						.toLowerCase()
						.includes(query)
						? ""
						: "none";
				});
			}),
		);
	}

	// Portfolio modal close button
	const portfolioCloseButton = $("#portfolioCloseButton");
	if (portfolioCloseButton) {
		cleanupFns.push(
			addListener(portfolioCloseButton, "click", () => {
				closeModal("portfolioModal");
			}),
		);
	}

	// Load posts on auth state change
	cleanupFns.push(
		onAuthStateChange(async () => {
			if (!hasLoadedInitialPosts) {
				hasLoadedInitialPosts = true;
				await loadPosts();
			} else {
				await loadFirestorePosts();
				renderPinned();
				renderPage();
			}
		}),
	);
}

/**
 * Clean up portfolio page
 */
export function destroyPortfolio() {
	cleanupFns.forEach((fn) => {
		fn();
	});
	cleanupFns = [];
	hasLoadedInitialPosts = false;
	pinned.length = 0;
	notes.length = 0;
	openAccordion = null;
	currentPost = null;
	postOpenRequestId += 1;
}
