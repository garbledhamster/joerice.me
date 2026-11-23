/**
 * @file pages/portfolio.js
 * @description Portfolio page module
 *
 * Displays all portfolio entries with search and inline post viewing.
 * Reads Firestore posts and combines them with current bundled YAML sources.
 */

import { closeModal, isModalOpen, openModal } from "../components/modal.js";
import { $, addListener } from "../core/dom.js";
import {
	ensureAdmin,
	getFirestore,
	isAdminUser,
	onAuthStateChange,
} from "../services/auth.js";
import {
	getServices,
	relatedServices,
	selectService,
	servicePicker,
} from "../services/catalog.js";
import { importedPostId, savePost } from "../services/post-storage.js";
import { sanitizeMarkdown, sanitizeText } from "../services/sanitize.js";

// State
const pinned = [];
const notes = [];
let currentPost = null;
let openAccordion = null;
let postOpenRequestId = 0;
let editingPostId = null;
let editingPostSource = null;
let editingPostCreatedDate = null;
let archiveRequestId = 0;
let archiveSessionId = 0;
let adminSession = null;
let relatedPostsStatus = "loading";
const SERVER_READ = { source: "server" };
const NON_POST_KINDS = [
	"source-override",
	"service",
	"working-folder-note",
	"working-folder-note-edit",
	"working-folder-copy",
	"working-folder-layout",
];
const POSTS_PER_PAGE = 6;
let currentPage = 1;
let linkedPostKey = "";
let linkedPost = null;
let resultScroll;

export function getRelatedPosts(serviceId) {
	return {
		status: relatedPostsStatus,
		posts: [...pinned, ...notes].filter(
			(post) =>
				post.published !== false && post.serviceIds?.includes(serviceId),
		),
	};
}

const backArrow =
	'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 12H5m7 7-7-7 7-7"/></svg>';

function archiveScrollBehavior() {
	return matchMedia("(prefers-reduced-motion: reduce)").matches
		? "instant"
		: "smooth";
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
export function getPortfolioTemplate({ folder = false } = {}) {
	return `
    <section class="portfolio" id="portfolioSection">
      <h2>Work &amp; notes</h2>
      ${
				folder
					? `<section id="linkedPost" hidden aria-labelledby="linkedPostTitle">
        <a class="back" href="#work" data-return-to-results aria-label="Back to results" title="Back to results">${backArrow}</a>
        <h3 id="linkedPostTitle" tabindex="-1">Selected work</h3>
        <article class="postAccordion" id="linkedPostArticle">
          <div class="postInlineBody" aria-live="polite"></div>
        </article>
      </section>`
					: ""
			}
      <section class="portfolioNotes" aria-labelledby="portfolioNotesHeading">
        <div class="sectionHeader">
          <div class="sectionHeaderLeft">
            <h3 id="portfolioNotesHeading">Posts</h3>
            <button class="refreshBtn" id="refreshPostsBtn" type="button" title="Refresh posts" aria-label="Refresh posts">
              <i class="fas fa-sync"></i>
            </button>
          </div>
          ${folder ? "" : '<button class="editBtn" id="addPortfolioBtn" type="button" data-admin-only>Add Post</button>'}
        </div>
        <p class="portfolioIntro">Projects I'm working on, websites I've built, and notes on how I work. Choose a topic or open a post to look through it.</p>
        <div class="postFilters">
          <div class="search"><label for="q">Search</label><input id="q" type="search" placeholder="Search posts and notes..."/></div>
          <label for="postTopicFilter">Service or topic<select id="postTopicFilter"><option value="all">All topics</option></select></label>
          <label for="postTypeFilter">Post type<select id="postTypeFilter"><option value="all">All types</option><option value="project">Projects</option><option value="article">Articles</option><option value="note">Notes</option><option value="product">Products</option></select></label>
        </div>
        <div class="portfolioStatus" id="portfolioStatus" role="status" hidden></div>
        <div id="pinnedPosts" hidden><h4 class="subhead">Pinned</h4><div class="grid" id="pinnedGrid"></div></div>
        <p class="postResultsCount" id="postResultsCount" aria-live="polite" aria-atomic="true"></p>
        <div class="grid" id="entryGrid"></div>
        <div class="postEmptyState" id="postEmptyState" hidden>
          <p>No posts match. Try another topic or clear your search.</p>
          <button class="action" id="clearPostFilters" type="button">Clear search and filters</button>
        </div>
        <nav class="postPagination" id="postPagination" aria-label="Post pages" hidden></nav>
      </section>
    </section>
  `;
}

function shareKey(post) {
	const source = post.source === "yaml" ? post.url : post.sourceUrl;
	const bundled = /^posts\/(\d{4})\.yaml$/.exec(source);
	return bundled?.[1] ?? `post-${encodeURIComponent(post.id)}`;
}

function renderLinkedPost() {
	if (!linkedPost || !linkedPostKey) return;
	const title = $("#linkedPostTitle", linkedPost);
	const article = $("#linkedPostArticle", linkedPost);
	const entry =
		relatedPostsStatus === "ready" &&
		[...pinned, ...notes].find(
			(post) => post.published !== false && shareKey(post) === linkedPostKey,
		);
	closePost(openAccordion);
	if (entry) {
		title.textContent = entry.title;
		void openPost(entry.url, article);
	} else {
		title.textContent = "Selected work";
		$(".postInlineBody", article).textContent =
			relatedPostsStatus === "loading"
				? "Loading work…"
				: "This work is unavailable. Return to results to find other published work.";
	}
}

export function selectLinkedPortfolioPost(key) {
	if (!linkedPost || linkedPostKey === key) return;
	linkedPostKey = key;
	linkedPost.hidden = !key;
	$(".portfolioNotes", linkedPost.parentElement).hidden = Boolean(key);
	if (key) {
		renderLinkedPost();
		$("#linkedPostTitle", linkedPost).focus({ preventScroll: true });
	} else if (openAccordion === $("#linkedPostArticle", linkedPost)) {
		closePost(openAccordion);
	}
}

export function portfolioResultPosition(accordion) {
	if (resultScroll?.accordion === accordion) return resultScroll?.top;
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
	const directLink = postSiteLink(post);
	const share =
		linkedPost && post.published !== false
			? `<a class="action postShareLink" href="#work/${sanitizeText(shareKey(post))}">Direct link to this post</a>`
			: "";
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
    <article class="postAccordion${directLink ? " has-site-link" : ""}" data-tags="${safeTags}">
      <div class="postTitleRow${canManage ? " is-manageable" : ""}">
        <button class="entry postTitleButton" type="button" data-url="${safeUrl}"${sourceAttr}${idAttr}${publishedAttr} aria-expanded="false" aria-controls="${readerId}">
          <span class="postTitleText"><span>${safeTitle}${unpublishedIndicator}</span><span class="postLabels">${postLabels(post)}</span></span>
          <span class="postToggleIcon" aria-hidden="true">+</span>
        </button>
        ${managementControls}
      </div>
      ${directLink}
      <div class="postInlineViewer" id="${readerId}" aria-hidden="true">
        <div class="postInlineClip">
          <div class="postInlineReader">
            <div class="postInlineActions">
              ${linkedPost ? `<button class="closePostButton" type="button" aria-label="Back to results" title="Back to results">${backArrow}</button>` : '<button class="closePostButton" type="button">← Back to results</button>'}
              ${share}
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

function isPublicPost(data) {
	return data.published === true && isPostPublished(data);
}

function isPostRecord(data) {
	return !NON_POST_KINDS.includes(data.kind);
}

/**
 * Read posts and public suppression markers from Firestore.
 */
async function readFirestorePosts(canReadDrafts) {
	const postsRef = getPostsCollectionRef();
	if (!postsRef) throw new Error("Posts are not connected.");
	const query = canReadDrafts
		? postsRef
		: postsRef.where("published", "==", true);
	const snapshot = await query.get(SERVER_READ);
	if (snapshot.metadata?.fromCache || snapshot.metadata?.hasPendingWrites)
		throw new Error("Publication state could not be confirmed.");

	const entries = [];
	const overriddenSources = new Set();
	snapshot.forEach((doc) => {
		const data = doc.data() || {};
		const isPost = isPostRecord(data);
		if (data.sourceUrl && (isPost || data.kind === "source-override")) {
			overriddenSources.add(data.sourceUrl);
		}
		const published = isPublicPost(data);
		if (!isPost || (!canReadDrafts && !published)) return;

		entries.push({
			title: data.title ?? data.Title ?? "Untitled",
			date:
				data["Created Date"] || data.createdDate || new Date().toISOString(),
			url: `firestore:${doc.id}`,
			pinned: data.pinned === true,
			tags: Array.isArray(data.tags) ? data.tags : [],
			postType: data.postType,
			productName: data.productName,
			websiteUrl: data.websiteUrl,
			id: doc.id,
			source: "firestore",
			sourceUrl: data.sourceUrl,
			published,
			serviceIds: Array.isArray(data.serviceIds) ? data.serviceIds : [],
		});
	});
	return { entries, overriddenSources };
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

function resetPortfolioEditor() {
	editingPostId = null;
	editingPostSource = null;
	editingPostCreatedDate = null;
	if (isModalOpen("portfolioModal")) closeModal("portfolioModal");
	for (const id of ["portfolioPostTitle", "portfolioPostBody"]) {
		const input = $(`#${id}`);
		if (input) input.value = "";
	}
	const published = $("#portfolioPostPublished");
	const pinned = $("#portfolioPostPinned");
	if (published) published.checked = true;
	if (pinned) pinned.checked = false;
	const picker = $("#portfolioServicePicker");
	if (picker) picker.replaceChildren();
	setEditorStatus("");
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
	setTimeout(() => {
		if (isAdminUser() && isModalOpen("portfolioModal"))
			portfolioPostTitle?.focus();
	}, 0);
}

function postSiteLink(post) {
	if (typeof post.websiteUrl !== "string") return "";
	try {
		const site = new URL(post.websiteUrl);
		if (!["https:", "http:"].includes(site.protocol)) return "";
		return `<div class="postSiteRow"><a class="postSiteLink" href="${sanitizeText(site.href)}" target="_blank" rel="noopener noreferrer"><span>Visit site</span><span class="postSiteDomain">${sanitizeText(site.hostname.replace(/^www\./, ""))}</span><span class="sr-only"> (opens in a new tab)</span></a></div>`;
	} catch {
		return "";
	}
}

const postTypes = {
	project: "Project",
	article: "Article",
	note: "Note",
	product: "Product",
};

function postType(post) {
	return Object.hasOwn(postTypes, post.postType) ? post.postType : "article";
}

function postTopics(post) {
	const serviceNames = getServices()
		.filter((service) => post.serviceIds?.includes(service.id))
		.map((service) => service.title);
	return [
		...new Set(
			[
				post.productName,
				...serviceNames,
				...(serviceNames.length ? [] : post.tags || []),
			].filter(Boolean),
		),
	];
}

function postLabels(post) {
	return `<span class="postType">${postTypes[postType(post)]}</span>${postTopics(
		post,
	)
		.slice(0, 2)
		.map((topic) => `<span class="postTopic">${sanitizeText(topic)}</span>`)
		.join("")}`;
}

function filteredPosts(collection) {
	const query = searchInput?.value.trim().toLocaleLowerCase() || "";
	const topic = $("#postTopicFilter")?.value || "all";
	const type = $("#postTypeFilter")?.value || "all";
	return collection.filter((post) => {
		const matchesTopic =
			topic === "all" ||
			(topic.startsWith("service:")
				? post.serviceIds?.includes(topic.slice(8))
				: post.tags?.includes(topic.slice(6)));
		const searchable = [
			post.title,
			postTypes[postType(post)],
			...postTopics(post),
			...(post.tags || []),
		]
			.join(" ")
			.toLocaleLowerCase();
		return (
			matchesTopic &&
			(type === "all" || postType(post) === type) &&
			searchable.includes(query)
		);
	});
}

function renderPostFilters() {
	const filter = $("#postTopicFilter");
	if (!filter) return;
	const previous = filter.value;
	const all = [...pinned, ...notes];
	const services = getServices().filter((service) =>
		all.some((post) => post.serviceIds?.includes(service.id)),
	);
	const topics = [...new Set(all.flatMap((post) => post.tags || []))].sort(
		(a, b) => a.localeCompare(b),
	);
	filter.innerHTML = `<option value="all">All topics</option>${services.length ? `<optgroup label="Services">${services.map((service) => `<option value="service:${sanitizeText(service.id)}">${sanitizeText(service.title)}</option>`).join("")}</optgroup>` : ""}${topics.length ? `<optgroup label="Topics">${topics.map((topic) => `<option value="topic:${sanitizeText(topic)}">${sanitizeText(topic)}</option>`).join("")}</optgroup>` : ""}`;
	filter.value = [...filter.options].some((option) => option.value === previous)
		? previous
		: "all";
}

function renderPinned() {
	if (!pinnedGrid) return;
	if (openAccordion && pinnedGrid.contains(openAccordion))
		closePost(openAccordion);
	const entries = filteredPosts(pinned);
	pinnedGrid.innerHTML = entries
		.map((post, index) => formatPostEntry(post, index, "pinned"))
		.join("");
	$("#pinnedPosts").hidden = entries.length === 0;
}

export function renderPage() {
	if (!entryGrid) return;
	if (openAccordion && entryGrid.contains(openAccordion))
		closePost(openAccordion);
	renderPostFilters();
	renderPinned();
	const entries = filteredPosts(notes);
	const pages = Math.max(1, Math.ceil(entries.length / POSTS_PER_PAGE));
	currentPage = Math.min(Math.max(1, currentPage), pages);
	const start = (currentPage - 1) * POSTS_PER_PAGE;
	entryGrid.innerHTML = entries
		.slice(start, start + POSTS_PER_PAGE)
		.map((post, index) => formatPostEntry(post, start + index, "post"))
		.join("");
	const pinnedCount = filteredPosts(pinned).length;
	const ready = relatedPostsStatus === "ready";
	$("#postResultsCount").textContent = ready
		? `${entries.length ? start + 1 : 0}–${Math.min(start + POSTS_PER_PAGE, entries.length)} of ${entries.length} posts${pinnedCount ? ` · ${pinnedCount} pinned` : ""}`
		: "";
	$("#postEmptyState").hidden = !ready || entries.length + pinnedCount > 0;
	const pagination = $("#postPagination");
	pagination.hidden = pages <= 1;
	const pageButton = (page, label, disabled = false) =>
		`<button type="button" data-page="${page}"${disabled ? " disabled" : ""}${page === currentPage && typeof label === "number" ? ' aria-current="page"' : ""} aria-label="${typeof label === "number" ? `Page ${page}` : `${label} page`}">${label}</button>`;
	const pageNumbers = [
		...new Set([1, currentPage - 1, currentPage, currentPage + 1, pages]),
	]
		.filter((page) => page > 0 && page <= pages)
		.sort((a, b) => a - b);
	pagination.innerHTML =
		pageButton(currentPage - 1, "Previous", currentPage === 1) +
		pageNumbers
			.map(
				(page, index) =>
					`${index && page - pageNumbers[index - 1] > 1 ? '<span aria-hidden="true">…</span>' : ""}${pageButton(page, page)}`,
			)
			.join("") +
		pageButton(currentPage + 1, "Next", currentPage === pages);
	if (linkedPostKey) renderLinkedPost();
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
		const position = resultScroll?.accordion === accordion && resultScroll;
		closePost(accordion);
		$(".postTitleButton", accordion)?.focus({ preventScroll: true });
		if (position)
			position.scroller.scrollTo({ top: position.top, behavior: "instant" });
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
	const scroller = accordion.closest("dialog") || window;
	resultScroll = {
		accordion,
		scroller,
		top: scroller.scrollTop ?? window.scrollY,
	};
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
		if (!loadedPost || openAccordion !== accordion || !isAdminUser()) return;
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
	const sessionId = archiveSessionId;

	try {
		await postsRef.doc(postId).delete();
		if (sessionId !== archiveSessionId) return;
		if (openAccordion === accordion) closePost(accordion);
		await loadPosts();
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
	const sessionId = archiveSessionId;

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
		if (sessionId !== archiveSessionId) return;
		await loadPosts(() => openAccordion === accordion || !openAccordion);
	} catch (error) {
		console.warn("Unable to save post.", error);
		if (sessionId !== archiveSessionId) return;
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

			const doc = await postsRef.doc(postId).get(SERVER_READ);
			const data = doc.data() || {};
			if (
				!doc.exists ||
				doc.metadata?.fromCache ||
				doc.metadata?.hasPendingWrites ||
				!isPostRecord(data) ||
				(!isAdminUser() && !isPublicPost(data))
			) {
				throw new Error("Post unavailable");
			}

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
			const response = await fetch(url);
			if (!response.ok) throw new Error("Post unavailable");
			const data = yaml.load(await response.text());
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
				serviceIds: Array.isArray(data.serviceIds) ? data.serviceIds : [],
			};
			renderedContent =
				sanitizeMarkdown(content) + relatedServices(loadedPost.serviceIds);
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
		if (
			titleButton &&
			requestId === postOpenRequestId &&
			openAccordion === accordion
		) {
			accordion.scrollIntoView({
				behavior: archiveScrollBehavior(),
				block: "start",
			});
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
	$(".postInlineBody", accordion)?.replaceChildren();
	titleButton?.classList.remove("active");
	titleButton?.setAttribute("aria-expanded", "false");
	viewer?.setAttribute("aria-hidden", "true");
	accordion.classList.remove("is-loading");
	accordion.classList.remove("is-open");
	accordion.classList.remove("is-editing");
	if (isActive) {
		if (resultScroll?.accordion === accordion) resultScroll = undefined;
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
async function readYamlPosts(overriddenSources) {
	const entries = [];
	const yaml = globalThis.jsyaml;
	if (!yaml) {
		console.warn("YAML parser not available, skipping YAML posts.");
		return entries;
	}
	try {
		const loader = await fetch("posts/loader.yaml");
		if (!loader.ok) throw new Error("The bundled post list is unavailable.");
		const loaderText = await loader.text();
		const loaderData = yaml.load(loaderText);
		const filePaths = Array.isArray(loaderData.posts)
			? loaderData.posts
			: Array.from(
					{ length: Number(loaderData.posts) || 0 },
					(_, index) => `posts/${String(index + 1).padStart(4, "0")}.yaml`,
				);
		for (const filePath of filePaths) {
			if (overriddenSources.has(filePath)) continue;
			try {
				const response = await fetch(filePath);
				if (!response.ok) continue;
				const data = yaml.load(await response.text());
				entries.push({
					title: data.title,
					date: data.date,
					url: filePath,
					pinned: data.pinned,
					tags: Array.isArray(data.tags) ? data.tags : [],
					postType: data.postType,
					productName: data.productName,
					websiteUrl: data.websiteUrl,
					serviceIds: Array.isArray(data.serviceIds) ? data.serviceIds : [],
					source: "yaml",
				});
			} catch {
				// A missing bundled post does not prevent the remaining posts from loading.
			}
		}
	} catch (error) {
		console.warn("Unable to load YAML posts.", error);
	}
	return entries;
}

function clearArchive() {
	closePost(openAccordion);
	pinned.length = 0;
	notes.length = 0;
}

async function loadPosts(shouldRender = () => true) {
	const requestId = ++archiveRequestId;
	const canReadDrafts = isAdminUser();
	const isCurrent = () =>
		requestId === archiveRequestId && canReadDrafts === isAdminUser();
	relatedPostsStatus = "loading";
	setPortfolioStatus("Loading posts…");
	if (linkedPostKey) renderLinkedPost();
	window.dispatchEvent(new Event("portfolio-posts-change"));

	try {
		const { entries, overriddenSources } =
			await readFirestorePosts(canReadDrafts);
		if (!isCurrent()) return;
		// Every bundled post can have a Firestore replacement. Only list it
		// after verifying the current suppression markers on the server.
		const bundled = await readYamlPosts(overriddenSources);
		if (!isCurrent()) return;
		const posts = [...bundled, ...entries].sort(
			(a, b) => new Date(b.date) - new Date(a.date),
		);
		pinned.length = 0;
		notes.length = 0;
		for (const post of posts) {
			(post.pinned ? pinned : notes).push(post);
		}
		relatedPostsStatus = "ready";
		setPortfolioStatus("");
		if (shouldRender()) renderPage();
	} catch (error) {
		if (!isCurrent()) return;
		clearArchive();
		if (error?.code === "permission-denied") resetPortfolioEditor();
		relatedPostsStatus = "error";
		setPortfolioStatus("Posts are temporarily unavailable. Try refreshing.");
		renderPage();
		console.warn("Unable to load Firestore posts:", error);
	}
	window.dispatchEvent(new Event("portfolio-posts-change"));
}

function handleArchiveAuthChange(user) {
	const nextAdminSession = isAdminUser() ? user?.uid : null;
	if (nextAdminSession !== adminSession) {
		adminSession = nextAdminSession;
		archiveSessionId += 1;
		relatedPostsStatus = "loading";
		clearArchive();
		resetPortfolioEditor();
		currentPage = 1;
		if (searchInput) searchInput.value = "";
		$("#postTopicFilter").value = "all";
		$("#postTypeFilter").value = "all";
		renderPage();
	}
	void loadPosts();
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
	linkedPost = $("#linkedPost");

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
			renderPostFilters();
			for (const button of document.querySelectorAll(".postTitleButton")) {
				const post = [...pinned, ...notes].find(
					(entry) => entry.url === button.dataset.url,
				);
				if (post) $(".postLabels", button).innerHTML = postLabels(post);
			}
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
			if (
				searchInput?.value.trim() &&
				!openAccordion?.classList.contains("is-editing")
			) {
				const activeUrl = currentPost?.url;
				renderPage();
				const title = Array.from(
					document.querySelectorAll(".postTitleButton"),
				).find((button) => button.dataset.url === activeUrl);
				if (title) void openPost(activeUrl, title.closest(".postAccordion"));
			} else if (
				openAccordion &&
				!openAccordion.classList.contains("is-editing")
			) {
				renderCurrentPost(openAccordion);
			}
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
			if (searchInput) searchInput.value = "";
			$("#postTopicFilter").value = "all";
			$("#postTypeFilter").value = "all";
			const index = notes.findIndex((post) => post.url === url);
			currentPage = index < 0 ? 1 : Math.floor(index / POSTS_PER_PAGE) + 1;
			renderPage();
			const title = Array.from(
				document.querySelectorAll(".postTitleButton"),
			).find((button) => button.dataset.url === url);
			if (!title) return;
			const accordion = title.closest(".postAccordion");
			if (accordion !== openAccordion) {
				closePost(openAccordion);
				void openPost(title.dataset.url, accordion);
			} else {
				accordion.scrollIntoView({
					block: "start",
					behavior: archiveScrollBehavior(),
				});
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
			addListener(refreshPostsBtn, "click", () => {
				void loadPosts();
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

				const sessionId = archiveSessionId;
				try {
					if (portfolioSaveButton.disabled) return;
					portfolioSaveButton.disabled = true;
					const createdDate = editingPostCreatedDate ?? now;

					await savePost(
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

					if (sessionId !== archiveSessionId) return;
					await loadPosts();
					if (sessionId === archiveSessionId) resetPortfolioEditor();
				} catch (error) {
					console.warn("Unable to save post.", error);
					if (sessionId === archiveSessionId)
						setEditorStatus("Unable to save this post right now.");
				} finally {
					if (sessionId === archiveSessionId)
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

				const sessionId = archiveSessionId;
				try {
					await postsRef.doc(editingPostId).delete();
					if (sessionId !== archiveSessionId) return;
					resetPortfolioEditor();
					await loadPosts();
				} catch (error) {
					console.warn("Unable to delete post.", error);
					if (sessionId === archiveSessionId)
						setEditorStatus("Unable to delete this post right now.");
				}
			}),
		);
	}

	// Filter the full collection before choosing a page.
	const changeFilters = () => {
		currentPage = 1;
		renderPage();
	};
	if (searchInput)
		cleanupFns.push(addListener(searchInput, "input", changeFilters));
	cleanupFns.push(
		addListener($("#clearPostFilters"), "click", () => {
			searchInput.value = "";
			$("#postTopicFilter").value = "all";
			$("#postTypeFilter").value = "all";
			changeFilters();
			searchInput.focus();
		}),
	);
	for (const id of ["postTopicFilter", "postTypeFilter"]) {
		cleanupFns.push(addListener($(`#${id}`), "change", changeFilters));
	}
	cleanupFns.push(
		addListener($("#postPagination"), "click", (event) => {
			const button = event.target.closest("button[data-page]");
			if (!button || button.disabled) return;
			currentPage = Number(button.dataset.page);
			renderPage();
			$("#postPagination [aria-current='page']")?.focus({
				preventScroll: true,
			});
			entryGrid.scrollIntoView({
				block: "start",
				behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
					? "auto"
					: "smooth",
			});
		}),
	);

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
	cleanupFns.push(onAuthStateChange(handleArchiveAuthChange));
}

/**
 * Clean up portfolio page
 */
export function destroyPortfolio() {
	cleanupFns.forEach((fn) => {
		fn();
	});
	cleanupFns = [];
	archiveRequestId += 1;
	archiveSessionId += 1;
	adminSession = null;
	currentPage = 1;
	relatedPostsStatus = "loading";
	linkedPostKey = "";
	linkedPost = null;
	clearArchive();
	resetPortfolioEditor();
	renderPage();
	pinnedGrid = null;
	entryGrid = null;
	searchInput = null;
}
