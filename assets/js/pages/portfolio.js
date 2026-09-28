/**
 * @file pages/portfolio.js
 * @description Portfolio page module
 *
 * Displays portfolio entries with search, pagination, and post viewing
 * Supports Firestore, local storage, and YAML post sources
 */

import { closeModal, openModal } from "../components/modal.js";
import { $, $$, addListener, lockScroll, unlockScroll } from "../core/dom.js";
import {
	ensureAdmin,
	getFirestore,
	isAdminUser,
	onAuthStateChange,
} from "../services/auth.js";
import { sanitizeMarkdown, sanitizeText } from "../services/sanitize.js";

// State
const pinned = [];
const notes = [];
const pageSize = 10;
let page = 0;
let currentPost = null;
let editingPostId = null;
let editingPostSource = null;
let editingPostCreatedDate = null;
let hasLoadedInitialPosts = false;

// DOM references
let pinnedGrid = null;
let entryGrid = null;
let prevBtn = null;
let nextBtn = null;
let postView = null;
let postContentEl = null;
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
      <div class="pageControls">
        <button id="prevBtn" class="pageBtn">Prev</button>
        <button id="nextBtn" class="pageBtn">Next</button>
      </div>
    </section>
    <div id="postView">
      <div id="postContent">
        <button id="closePost">close</button>
        <button id="editPostBtn" class="editBtn" data-admin-only hidden>Edit</button>
        <div id="postContentInner"></div>
      </div>
    </div>
  `;
}

/**
 * Format a post entry for display
 * @param {Object} post - Post data
 * @returns {string} Entry HTML
 */
function formatPostEntry(post) {
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

	return `<a class="entry" data-tags="${safeTags}" data-url="${safeUrl}"${sourceAttr}${idAttr}${publishedAttr}>${safeTitle}${unpublishedIndicator}</a>`;
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
	if (!postsRef) return;

	try {
		let query = postsRef;
		if (!isAdminUser()) {
			query = postsRef.where("published", "==", true);
		}

		const snapshot = await query.get();
		const firestoreEntries = [];

		snapshot.forEach((doc) => {
			const data = doc.data() || {};
			const isPublished = isPostPublished(data);
			const isPinned = data.pinned === true;

			firestoreEntries.push({
				title: data.Title || data.title || "Untitled",
				date:
					data["Created Date"] || data.createdDate || new Date().toISOString(),
				url: `firestore:${doc.id}`,
				pinned: isPinned,
				tags: [],
				id: doc.id,
				source: "firestore",
				published: isPublished,
			});
		});

		// Clear existing firestore entries
		const otherPinned = pinned.filter((p) => p.source !== "firestore");
		const otherNotes = notes.filter((n) => n.source !== "firestore");

		pinned.length = 0;
		notes.length = 0;

		pinned.push(...otherPinned, ...firestoreEntries.filter((e) => e.pinned));
		notes.push(...otherNotes, ...firestoreEntries.filter((e) => !e.pinned));

		pinned.sort((a, b) => new Date(b.date) - new Date(a.date));
		notes.sort((a, b) => new Date(b.date) - new Date(a.date));
	} catch (error) {
		console.warn("Unable to load Firestore posts:", error);
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
		const title = post.data.Title || post.data.title;
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
	const isReadOnlyPost = !["local", "firestore"].includes(post?.source ?? "");

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
	openModal("portfolioModal");

	// Focus title field
	setTimeout(() => portfolioPostTitle?.focus(), 0);
}

/**
 * Render pinned posts
 */
function renderPinned() {
	if (!pinnedGrid) return;
	pinnedGrid.innerHTML = pinned.map((p) => formatPostEntry(p)).join("");
	attachEntryHandlers();
}

/**
 * Render current page of posts
 */
export function renderPage() {
	if (!entryGrid) return;

	const start = page * pageSize;
	const slice = notes.slice(start, start + pageSize);

	entryGrid.innerHTML = slice.map((n) => formatPostEntry(n)).join("");

	if (prevBtn) prevBtn.disabled = page === 0;
	if (nextBtn) nextBtn.disabled = start + pageSize >= notes.length;

	attachEntryHandlers();
}

/**
 * Attach click handlers to entry elements
 */
function attachEntryHandlers() {
	$$(".entry").forEach((el) => {
		el.addEventListener("click", async () => {
			$$(".entry.active").forEach((a) => {
				a.classList.remove("active");
			});
			el.classList.add("active");
			await openPost(el.dataset.url);
		});
	});
}

/**
 * Open a post for viewing
 * @param {string} url - Post URL/ID
 */
async function openPost(url) {
	currentPost = null;
	const editPostBtn = $("#editPostBtn");
	if (editPostBtn) editPostBtn.hidden = true;

	try {
		if (url.startsWith("firestore:")) {
			const postId = url.replace("firestore:", "");
			const postsRef = getPostsCollectionRef();
			if (!postsRef) throw new Error("Firestore unavailable");

			const doc = await postsRef.doc(postId).get();
			if (!doc.exists) throw new Error("Post unavailable");

			const data = doc.data() || {};
			const content = data.Body || data.body || "";

			currentPost = {
				url,
				data,
				content,
				id: postId,
				source: "firestore",
				createdDate: data["Created Date"] || data.createdDate,
				published: isPostPublished(data),
				pinned: data.pinned === true,
			};

			if (postContentEl) {
				postContentEl.innerHTML = sanitizeMarkdown(content);
			}

			if (editPostBtn && isAdminUser()) {
				editPostBtn.hidden = false;
			}
		} else {
			const yaml = globalThis.jsyaml;
			if (!yaml) throw new Error("YAML parser unavailable");
			const raw = await fetch(url).then((r) => r.text());
			const data = yaml.load(raw);
			const content = data.content || "";
			currentPost = { url, data, content, source: "yaml" };
			if (postContentEl) {
				postContentEl.innerHTML = sanitizeMarkdown(content);
			}
		}
	} catch (error) {
		console.warn("Unable to load post:", error);
		if (postContentEl) {
			postContentEl.innerHTML = "<p>Unable to load this post.</p>";
		}
	}

	if (postView) {
		lockScroll();
		postView.classList.add("show");
	}
}

/**
 * Close post view
 */
function closePost() {
	$$(".entry.active").forEach((a) => {
		a.classList.remove("active");
	});
	if (postView) postView.classList.remove("show");
	currentPost = null;
	unlockScroll();
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
	prevBtn = $("#prevBtn");
	nextBtn = $("#nextBtn");
	postView = $("#postView");
	postContentEl = $("#postContentInner");
	searchInput = $("#q");

	if (!pinnedGrid || !entryGrid) return;

	// Close button
	const closePostBtn = $("#closePost");
	if (closePostBtn) {
		cleanupFns.push(addListener(closePostBtn, "click", closePost));
	}

	// Edit button
	const editPostBtn = $("#editPostBtn");
	if (editPostBtn) {
		cleanupFns.push(
			addListener(editPostBtn, "click", () => {
				if (!ensureAdmin("edit post") || !currentPost) return;

				// Only allow editing of local and firestore posts
				if (
					currentPost.source === "local" ||
					currentPost.source === "firestore"
				) {
					const postToEdit = {
						id: currentPost.id,
						title: getPostTitle(currentPost),
						content: currentPost.content || "",
						source: currentPost.source,
						createdDate: currentPost.createdDate,
						published: currentPost.published !== false, // Default to true if not set
						pinned: currentPost.pinned === true, // Default to false if not set
					};
					openPortfolioEditor(postToEdit);
				}
			}),
		);
	}

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
					const isEditing = editingPostId && editingPostSource === "firestore";
					const docRef = isEditing
						? postsRef.doc(editingPostId)
						: postsRef.doc();
					const createdDate = editingPostCreatedDate ?? now;

					await docRef.set(
						{
							title: title,
							body: content,
							createdDate: createdDate,
							lastEditedDate: now,
							published: published,
							pinned: pinned,
						},
						{ merge: true },
					);

					// Update state
					editingPostId = docRef.id;
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

	// Pagination
	if (prevBtn) {
		cleanupFns.push(
			addListener(prevBtn, "click", () => {
				if (page > 0) {
					page--;
					renderPage();
				}
			}),
		);
	}

	if (nextBtn) {
		cleanupFns.push(
			addListener(nextBtn, "click", () => {
				if ((page + 1) * pageSize < notes.length) {
					page++;
					renderPage();
				}
			}),
		);
	}

	// Search
	if (searchInput) {
		cleanupFns.push(
			addListener(searchInput, "input", (e) => {
				const query = e.target.value.toLowerCase();
				$$(".entry").forEach((el) => {
					el.style.display = el.textContent.toLowerCase().includes(query)
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
	page = 0;
}
