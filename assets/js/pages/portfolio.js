/**
 * @file pages/portfolio.js
 * @description Portfolio page module
 *
 * Displays portfolio entries with search, pagination, and post viewing
 * Supports Firestore, local storage, and YAML post sources
 */

import { $, $$, lockScroll, unlockScroll, addListener } from '../core/dom.js';
import { getState } from '../core/state.js';
import { isAdminUser, ensureAdmin, onAuthStateChange, getFirestore, getCurrentUserId } from '../services/auth.js';
import { sanitizeMarkdown, sanitizeText, validateLength } from '../services/sanitize.js';
import { openModal, closeModal } from '../components/modal.js';

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
        <h2>Portfolio</h2>
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
  const safeTags = (post.tags || []).map(t => sanitizeText(t)).join('|');
  const safeUrl = sanitizeText(post.url);
  const sourceAttr = post.source ? ` data-source="${sanitizeText(post.source)}"` : '';
  const idAttr = post.id ? ` data-id="${sanitizeText(post.id)}"` : '';
  const publishedAttr = post.published !== undefined ? ` data-published="${post.published}"` : '';
  const unpublishedIndicator = post.published === false && isAdminUser() ? ' [DRAFT]' : '';

  return `<a class="entry" data-tags="${safeTags}" data-url="${safeUrl}"${sourceAttr}${idAttr}${publishedAttr}>${safeTitle}${unpublishedIndicator}</a>`;
}

/**
 * Get posts collection reference
 * @returns {Object|null} Firestore collection ref
 */
function getPostsCollectionRef() {
  const firestore = getFirestore();
  return firestore ? firestore.collection('Posts') : null;
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
      query = postsRef.where('published', '==', true);
    }

    const snapshot = await query.get();
    const firestoreEntries = [];

    snapshot.forEach(doc => {
      const data = doc.data() || {};
      const isPublished = isPostPublished(data);
      const isPinned = data.pinned === true;

      firestoreEntries.push({
        title: data.Title || data.title || 'Untitled',
        date: data['Created Date'] || data.createdDate || new Date().toISOString(),
        url: `firestore:${doc.id}`,
        pinned: isPinned,
        tags: [],
        id: doc.id,
        source: 'firestore',
        published: isPublished,
      });
    });

    // Clear existing firestore entries
    const otherPinned = pinned.filter(p => p.source !== 'firestore');
    const otherNotes = notes.filter(n => n.source !== 'firestore');

    pinned.length = 0;
    notes.length = 0;

    pinned.push(...otherPinned, ...firestoreEntries.filter(e => e.pinned));
    notes.push(...otherNotes, ...firestoreEntries.filter(e => !e.pinned));

    pinned.sort((a, b) => new Date(b.date) - new Date(a.date));
    notes.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.warn('Unable to load Firestore posts:', error);
  }
}

/**
 * Render pinned posts
 */
function renderPinned() {
  if (!pinnedGrid) return;
  pinnedGrid.innerHTML = pinned.map(p => formatPostEntry(p)).join('');
  attachEntryHandlers();
}

/**
 * Render current page of posts
 */
export function renderPage() {
  if (!entryGrid) return;

  const start = page * pageSize;
  const slice = notes.slice(start, start + pageSize);

  entryGrid.innerHTML = slice.map(n => formatPostEntry(n)).join('');

  if (prevBtn) prevBtn.disabled = page === 0;
  if (nextBtn) nextBtn.disabled = start + pageSize >= notes.length;

  attachEntryHandlers();
}

/**
 * Attach click handlers to entry elements
 */
function attachEntryHandlers() {
  $$('.entry').forEach(el => {
    el.addEventListener('click', async () => {
      $$('.entry.active').forEach(a => a.classList.remove('active'));
      el.classList.add('active');
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
  const editPostBtn = $('#editPostBtn');
  if (editPostBtn) editPostBtn.hidden = true;

  try {
    if (url.startsWith('firestore:')) {
      const postId = url.replace('firestore:', '');
      const postsRef = getPostsCollectionRef();
      if (!postsRef) throw new Error('Firestore unavailable');

      const doc = await postsRef.doc(postId).get();
      if (!doc.exists) throw new Error('Post unavailable');

      const data = doc.data() || {};
      const content = data.Body || data.body || '';

      currentPost = {
        url,
        data,
        content,
        id: postId,
        source: 'firestore',
        createdDate: data['Created Date'] || data.createdDate,
        published: isPostPublished(data),
        pinned: data.pinned === true,
      };

      if (postContentEl) {
        postContentEl.innerHTML = sanitizeMarkdown(content);
      }

      if (editPostBtn && isAdminUser()) {
        editPostBtn.hidden = false;
      }
    }
  } catch (error) {
    console.warn('Unable to load post:', error);
    if (postContentEl) {
      postContentEl.innerHTML = '<p>Unable to load this post.</p>';
    }
  }

  if (postView) {
    lockScroll();
    postView.classList.add('show');
  }
}

/**
 * Close post view
 */
function closePost() {
  $$('.entry.active').forEach(a => a.classList.remove('active'));
  if (postView) postView.classList.remove('show');
  currentPost = null;
  unlockScroll();
}

/**
 * Set portfolio status message
 * @param {string} message - Status message
 */
function setPortfolioStatus(message) {
  const portfolioStatus = $('#portfolioStatus');
  if (!portfolioStatus) return;
  portfolioStatus.hidden = !message;
  portfolioStatus.textContent = message || '';
}

/**
 * Load all posts
 */
async function loadPosts() {
  setPortfolioStatus('Loading posts...');
  await loadFirestorePosts();

  pinned.sort((a, b) => new Date(b.date) - new Date(a.date));
  notes.sort((a, b) => new Date(b.date) - new Date(a.date));

  renderPinned();
  renderPage();

  if (!pinned.length && !notes.length) {
    setPortfolioStatus('No posts available yet.');
  } else {
    setPortfolioStatus('');
  }
}

/**
 * Render portfolio page
 */
export function renderPortfolio() {
  const mainContent = $('#mainContent');
  if (!mainContent) return;

  mainContent.innerHTML = getPortfolioTemplate();
  initPortfolio();
}

/**
 * Initialize portfolio page
 */
export function initPortfolio() {
  pinnedGrid = $('#pinnedGrid');
  entryGrid = $('#entryGrid');
  prevBtn = $('#prevBtn');
  nextBtn = $('#nextBtn');
  postView = $('#postView');
  postContentEl = $('#postContentInner');
  searchInput = $('#q');

  if (!pinnedGrid || !entryGrid) return;

  // Close button
  const closePostBtn = $('#closePost');
  if (closePostBtn) {
    cleanupFns.push(addListener(closePostBtn, 'click', closePost));
  }

  // Edit button
  const editPostBtn = $('#editPostBtn');
  if (editPostBtn) {
    cleanupFns.push(addListener(editPostBtn, 'click', () => {
      if (!ensureAdmin('edit post') || !currentPost) return;
      // Open portfolio editor modal with current post
      openModal('portfolioModal');
    }));
  }

  // Add post button
  const addPortfolioBtn = $('#addPortfolioBtn');
  if (addPortfolioBtn) {
    addPortfolioBtn.hidden = !isAdminUser();
    cleanupFns.push(addListener(addPortfolioBtn, 'click', () => {
      if (!ensureAdmin('add post')) return;
      openModal('portfolioModal');
    }));
  }

  // Pagination
  if (prevBtn) {
    cleanupFns.push(addListener(prevBtn, 'click', () => {
      if (page > 0) {
        page--;
        renderPage();
      }
    }));
  }

  if (nextBtn) {
    cleanupFns.push(addListener(nextBtn, 'click', () => {
      if ((page + 1) * pageSize < notes.length) {
        page++;
        renderPage();
      }
    }));
  }

  // Search
  if (searchInput) {
    cleanupFns.push(addListener(searchInput, 'input', e => {
      const query = e.target.value.toLowerCase();
      $$('.entry').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(query) ? '' : 'none';
      });
    }));
  }

  // Load posts on auth state change
  cleanupFns.push(onAuthStateChange(async () => {
    if (!hasLoadedInitialPosts) {
      hasLoadedInitialPosts = true;
      await loadPosts();
    } else {
      await loadFirestorePosts();
      renderPinned();
      renderPage();
    }
  }));
}

/**
 * Clean up portfolio page
 */
export function destroyPortfolio() {
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];
  hasLoadedInitialPosts = false;
  pinned.length = 0;
  notes.length = 0;
  page = 0;
}
