import { ensureAdmin, getCurrentUserId, getFirestore, isAdminUser, onAuthStateChange } from './auth.js';
import { $, $$ } from './dom.js';
import { sanitizeMarkdown, sanitizeText, validateLength } from './sanitize.js';
import { lockScroll, unlockScroll } from './ui/layout.js';

const pinned = [];
const notes = [];
const pageSize = 10;
const selectedTags = new Set();
const localPosts = [];
const localPostsStorageKey = 'portfolioLocalPosts';
const page = 0;
let currentPost = null;
let editingPostId = null;
let editingPostSource = null;
let editingPostCreatedDate = null;
let hasLoadedInitialPosts = false;

let pinnedGrid = null;
let entryGrid = null;
let prevBtn = null;
let nextBtn = null;
let postView = null;
let postContentEl = null;
let closePostBtn = null;
let editPostBtn = null;
let portfolioStatus = null;
let addPortfolioBtn = null;
let searchInput = null;
let portfolioModal = null;
let portfolioModalTitle = null;
let portfolioCloseButton = null;
let portfolioPostTitle = null;
let portfolioPostBody = null;
let portfolioSaveButton = null;
let portfolioDeleteButton = null;
let portfolioEditorStatus = null;
let portfolioPostPublished = null;
let portfolioPostPinned = null;
let editingLocalPostId = null;
let isPortfolioEditorReadOnly = false;

function renderPostContent(content) {
  if (!postContentEl) return;
  // Sanitize markdown content before rendering
  const sanitizedHtml = sanitizeMarkdown(content);
  postContentEl.innerHTML = sanitizedHtml;
}

function getYamlParser() {
  return globalThis.jsyaml;
}

function getPostTitle(post) {
  if (!post || !post.data) return 'Untitled';
  return post.data.Title || post.data.title || 'Untitled';
}

function formatPostEntry(post) {
  const safeTitle = sanitizeText(post.title);
  const safeTags = (post.tags || []).map((t) => sanitizeText(t)).join('|');
  const safeUrl = sanitizeText(post.url);
  const sourceAttr = post.source ? ` data-source="${sanitizeText(post.source)}"` : '';
  const idAttr = post.id ? ` data-id="${sanitizeText(post.id)}"` : '';
  const publishedAttr = post.published !== undefined ? ` data-published="${post.published}"` : '';
  // Add visual indicator for unpublished posts (only visible to admins)
  const unpublishedIndicator = post.published === false && isAdminUser() ? ' [DRAFT]' : '';
  return `<a class="entry" data-tags="${safeTags}" data-url="${safeUrl}"${sourceAttr}${idAttr}${publishedAttr}>${safeTitle}${unpublishedIndicator}</a>`;
}

function clearCurrentPost() {
  currentPost = null;
  if (postContentEl) {
    postContentEl.innerHTML = '';
  }
}

function getPostsCollectionRef() {
  const firestore = getFirestore();
  if (!firestore) return null;
  return firestore.collection('Posts');
}

function removeBySource(array, source) {
  const filtered = array.filter((item) => item.source !== source);
  array.length = 0;
  array.push(...filtered);
}

function removeNotesBySource(source) {
  removeBySource(notes, source);
}

function removePinnedBySource(source) {
  removeBySource(pinned, source);
}

function setPortfolioStatus(message) {
  if (!portfolioStatus) return;
  if (!message) {
    portfolioStatus.hidden = true;
    portfolioStatus.textContent = '';
    return;
  }
  portfolioStatus.hidden = false;
  portfolioStatus.textContent = message;
}

function setEditorStatus(message) {
  if (!portfolioEditorStatus) return;
  portfolioEditorStatus.textContent = message || '';
}

function setPortfolioEditorReadOnly(isReadOnly) {
  isPortfolioEditorReadOnly = isReadOnly;
  if (portfolioPostTitle) {
    portfolioPostTitle.readOnly = isReadOnly;
  }
  if (portfolioPostBody) {
    portfolioPostBody.readOnly = isReadOnly;
  }
  if (portfolioPostPublished) {
    portfolioPostPublished.disabled = isReadOnly;
  }
  if (portfolioPostPinned) {
    portfolioPostPinned.disabled = isReadOnly;
  }
  if (portfolioSaveButton) {
    portfolioSaveButton.disabled = isReadOnly;
  }
  if (portfolioDeleteButton) {
    portfolioDeleteButton.disabled = isReadOnly || !editingPostId;
  }
  if (isReadOnly) {
    setEditorStatus('Preloaded posts are read-only.');
  } else {
    setEditorStatus('');
  }
}

function loadLocalPosts() {
  localPosts.length = 0;
  try {
    const raw = window.localStorage.getItem(localPostsStorageKey);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    parsed.forEach((post) => {
      if (!post?.id || !post?.title || typeof post?.content !== 'string') return;
      localPosts.push({
        id: post.id,
        title: post.title,
        content: post.content,
        date: post.date || new Date().toISOString(),
      });
    });
  } catch {
    setPortfolioStatus('Unable to load saved posts.');
  }
}

function saveLocalPosts() {
  window.localStorage.setItem(localPostsStorageKey, JSON.stringify(localPosts));
}

function syncLocalPostsToNotes() {
  const nonLocalNotes = notes.filter((note) => !note.local);
  notes.length = 0;
  notes.push(...nonLocalNotes);
  localPosts.forEach((post) => {
    notes.push({
      title: post.title,
      date: post.date,
      url: `local:${post.id}`,
      pinned: false,
      tags: [],
      local: true,
      id: post.id,
      source: 'local',
    });
  });
  notes.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getLocalPostById(id) {
  return localPosts.find((post) => post.id === id) || null;
}

function isPostPublished(data) {
  // Check both 'published' (lowercase) and 'Published' (capitalized) for backward compatibility
  // Default to true if not set (for backward compatibility with posts that don't have this field)
  // A post is unpublished if ANY published-related field is explicitly false
  const publishedLower = data?.published;
  const publishedUpper = data?.Published;

  // If either field is explicitly false, the post is not published
  // This handles: published=false, Published=false, or both=false
  if (publishedLower === false || publishedUpper === false) {
    return false;
  }

  // Otherwise, default to published (true)
  // This handles: both undefined, either true, or both true
  return true;
}

async function loadFirestorePosts() {
  const postsRef = getPostsCollectionRef();
  if (!postsRef) {
    removeNotesBySource('firestore');
    return;
  }
  try {
    // Fetch posts with proper query based on user role
    // Admin users see all posts, non-admin users only see published posts
    // For non-admin users, we must add a query filter to match what the security rules allow
    // Without this filter, the collection query fails with "Missing or insufficient permissions"
    // because Firestore evaluates rules at query time
    let query = postsRef;
    if (!isAdminUser()) {
      // Non-admin users (including anonymous) can only read published posts
      // Add where clause to ensure query only requests accessible documents
      query = postsRef.where('published', '==', true);
    }
    const snapshot = await query.get();
    const entries = [];

    snapshot.forEach((doc) => {
      const data = doc.data() || {};
      const isPublished = isPostPublished(data);
      const isPinned = data.pinned === true;

      entries.push({
        title: data.Title || data.title || 'Untitled',
        date: data['Created Date'] || data.createdDate || new Date().toISOString(),
        lastEdited: data['Last Edited Date'] || data.lastEditedDate || data['Created Date'] || data.createdDate || null,
        url: `firestore:${doc.id}`,
        pinned: isPinned,
        tags: [],
        id: doc.id,
        source: 'firestore',
        published: isPublished,
      });
    });

    // Clean up existing Firestore and local entries before adding new ones
    removeNotesBySource('firestore');
    removePinnedBySource('firestore');
    removeNotesBySource('local');

    // Separate entries into pinned and notes arrays
    const pinnedEntries = entries.filter((entry) => entry.pinned);
    const regularEntries = entries.filter((entry) => !entry.pinned);

    pinned.push(...pinnedEntries);
    notes.push(...regularEntries);

    // Sort both pinned and notes arrays by date (most recent first)
    pinned.sort((a, b) => new Date(b.date) - new Date(a.date));
    notes.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.warn('Unable to load posts from Firestore.', error);
    console.error('Firestore error details:', error);
  }
}

function openPortfolioEditor(post = null) {
  if (!portfolioModal) return;
  const isReadOnlyPost = !!post && !['local', 'firestore'].includes(post?.source ?? '');
  editingLocalPostId = post?.id ?? null;
  editingPostId = post?.id ?? null;
  editingPostSource = post?.source ?? null;
  editingPostCreatedDate = post?.createdDate ?? null;
  if (isReadOnlyPost) {
    editingLocalPostId = null;
    editingPostId = null;
    editingPostSource = null;
    editingPostCreatedDate = null;
  }
  if (portfolioModalTitle) {
    portfolioModalTitle.textContent = editingPostId ? 'Edit Post' : 'Add Post';
  }
  if (portfolioPostTitle) {
    portfolioPostTitle.value = post?.title || '';
  }
  if (portfolioPostBody) {
    portfolioPostBody.value = post?.content || '';
  }
  if (portfolioPostPublished) {
    // Default to checked (published) for new posts, use existing value for edits
    portfolioPostPublished.checked = post?.published !== false;
  }
  if (portfolioPostPinned) {
    // Default to unchecked (not pinned) for new posts, use existing value for edits
    portfolioPostPinned.checked = post?.pinned === true;
  }
  if (portfolioDeleteButton) {
    portfolioDeleteButton.disabled = !editingPostId;
  }
  setPortfolioEditorReadOnly(isReadOnlyPost);
  portfolioModal.classList.add('show');
  portfolioModal.setAttribute('aria-hidden', 'false');
  setTimeout(() => portfolioPostTitle?.focus(), 0);
  lockScroll();
}

function closePortfolioEditor() {
  if (!portfolioModal) return;
  portfolioModal.classList.remove('show');
  portfolioModal.setAttribute('aria-hidden', 'true');
  setEditorStatus('');
  setPortfolioEditorReadOnly(false);
  unlockScroll();
  editingLocalPostId = null;
  editingPostId = null;
  editingPostSource = null;
  editingPostCreatedDate = null;
  if (window.location.hash === '#portfolioModal') {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

function attachClickHandlers() {
  $$('.entry').forEach((el) => {
    el.addEventListener('click', async () => {
      $$('.entry.active').forEach((a) => {
        a.classList.remove('active');
      });
      el.classList.add('active');
      await openPost(el.dataset.url);
    });
  });
}

function filterEntries() {
  $$('.entry').forEach((el) => {
    const tags = (el.dataset.tags || '').split('|');
    const hide = selectedTags.size && ![...selectedTags].some((t) => tags.includes(t));
    el.style.display = hide ? 'none' : '';
  });
}

function renderPinned() {
  if (!pinnedGrid) return;
  pinnedGrid.innerHTML = pinned.map((p) => formatPostEntry(p)).join('');
  attachClickHandlers();
  filterEntries();
}

export function renderPage() {
  if (!entryGrid) return;
  const start = page * pageSize;
  const slice = notes.slice(start, start + pageSize);
  entryGrid.innerHTML = slice.map((n) => formatPostEntry(n)).join('');
  if (prevBtn) prevBtn.disabled = page === 0;
  if (nextBtn) nextBtn.disabled = start + pageSize >= notes.length;
  attachClickHandlers();
  filterEntries();
}

export async function openPost(url) {
  if (typeof window.exitEditorMode === 'function') {
    window.exitEditorMode();
  }
  clearCurrentPost();

  // Hide edit button by default
  if (editPostBtn) {
    editPostBtn.hidden = true;
  }

  try {
    if (url.startsWith('local:')) {
      const localId = url.replace('local:', '');
      const localPost = getLocalPostById(localId);
      if (!localPost) throw new Error('Local post unavailable');
      const content = localPost.content || '';
      currentPost = { url, data: { title: localPost.title }, content, local: true, id: localId, source: 'local' };
      renderPostContent(content);
      // Show edit button for local posts in admin mode
      if (editPostBtn && isAdminUser()) {
        editPostBtn.hidden = false;
      }
    } else if (url.startsWith('firestore:')) {
      const postId = url.replace('firestore:', '');
      const postsRef = getPostsCollectionRef();
      if (!postsRef) throw new Error('Firestore unavailable');
      const doc = await postsRef.doc(postId).get();
      if (!doc.exists) throw new Error('Post unavailable');
      const data = doc.data() || {};
      const content = data.Body || data.body || '';
      const isPublished = isPostPublished(data);
      const isPinned = data.pinned === true;
      currentPost = {
        url,
        data,
        content,
        firestore: true,
        id: postId,
        source: 'firestore',
        createdDate: data['Created Date'] || data.createdDate,
        published: isPublished,
        pinned: isPinned,
      };
      renderPostContent(content);
      // Show edit button for Firestore posts in admin mode
      if (editPostBtn && isAdminUser()) {
        editPostBtn.hidden = false;
      }
    } else {
      const yaml = getYamlParser();
      if (!yaml) {
        throw new Error('YAML parser unavailable');
      }
      const raw = await fetch(url).then((r) => r.text());
      const data = yaml.load(raw);
      const storedContent = typeof window.getStoredPostContent === 'function' ? window.getStoredPostContent(url) : null;
      const content = storedContent ?? (data.content || '');
      currentPost = { url, data, content, source: 'yaml' };
      renderPostContent(content);
      // Don't show edit button for YAML posts (they're read-only)
    }
  } catch {
    currentPost = { url, data: null, content: '' };
    if (postContentEl) {
      postContentEl.innerHTML = '<p>Unable to load this post.</p>';
    }
  }
  if (postView) {
    lockScroll();
    postView.classList.add('show');
    window.scrollTo(0, 0);
  }
}

async function loadYamlPosts() {
  const yaml = getYamlParser();
  if (!yaml) {
    console.warn('YAML parser not available, skipping YAML posts.');
    return;
  }
  try {
    const loaderText = await fetch('posts/loader.yaml').then((r) => r.text());
    const loaderData = yaml.load(loaderText);
    const count = Number(loaderData.posts) || 0;
    for (let i = 1; i <= count; i++) {
      const filePath = `posts/${String(i).padStart(4, '0')}.yaml`;
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
          source: 'yaml',
        };
        if (entry.pinned) pinned.push(entry);
        else notes.push(entry);
      } catch {}
    }
  } catch (error) {
    console.warn('Unable to load YAML posts.', error);
  }
}

async function loadPosts() {
  try {
    setPortfolioStatus('Loading posts...');

    // Load function 1: Load YAML posts
    await loadYamlPosts();

    // Load function 2: Load Firestore posts (if available) or local posts
    const postsRef = getPostsCollectionRef();
    if (postsRef) {
      await loadFirestorePosts();
    } else {
      loadLocalPosts();
      syncLocalPostsToNotes();
    }

    // Sort both pinned and notes arrays by date (most recent first)
    pinned.sort((a, b) => new Date(b.date) - new Date(a.date));
    notes.sort((a, b) => new Date(b.date) - new Date(a.date));
    renderPinned();
    renderPage();
    if (!pinned.length && !notes.length) {
      setPortfolioStatus('No posts are available yet.');
    } else {
      setPortfolioStatus('');
    }
  } catch (error) {
    console.error('Unable to load posts.', error);
    setPortfolioStatus('Unable to load posts right now.');
  }
}

export function initPosts() {
  pinnedGrid = $('#pinnedGrid');
  entryGrid = $('#entryGrid');
  prevBtn = $('#prevBtn');
  nextBtn = $('#nextBtn');
  postView = $('#postView');
  postContentEl = $('#postContentInner');
  closePostBtn = $('#closePost');
  editPostBtn = $('#editPostBtn');
  portfolioStatus = $('#portfolioStatus');
  addPortfolioBtn = $('#addPortfolioBtn');
  searchInput = $('#q');
  portfolioModal = $('#portfolioModal');
  portfolioModalTitle = $('#portfolioModalTitle');
  portfolioCloseButton = $('#portfolioCloseButton');
  portfolioPostTitle = $('#portfolioPostTitle');
  portfolioPostBody = $('#portfolioPostBody');
  portfolioSaveButton = $('#portfolioSaveButton');
  portfolioDeleteButton = $('#portfolioDeleteButton');
  portfolioEditorStatus = $('#portfolioEditorStatus');
  portfolioPostPublished = $('#portfolioPostPublished');
  portfolioPostPinned = $('#portfolioPostPinned');

  if (!pinnedGrid || !entryGrid) return;

  if (closePostBtn) {
    closePostBtn.addEventListener('click', () => {
      $$('.entry.active').forEach((a) => {
        a.classList.remove('active');
      });
      if (postView) postView.classList.remove('show');
      clearCurrentPost();
      unlockScroll();
      if (typeof window.exitEditorMode === 'function') {
        window.exitEditorMode();
      }
    });
  }

  if (editPostBtn) {
    editPostBtn.addEventListener('click', () => {
      if (!ensureAdmin('edit post')) return;
      if (!currentPost) return;

      // Only allow editing of local and firestore posts
      if (currentPost.source === 'local' || currentPost.source === 'firestore') {
        const postToEdit = {
          id: currentPost.id,
          title: getPostTitle(currentPost),
          content: currentPost.content || '',
          source: currentPost.source,
          createdDate: currentPost.createdDate,
          published: currentPost.published !== false, // Default to true if not set
          pinned: currentPost.pinned === true, // Default to false if not set
        };
        openPortfolioEditor(postToEdit);
      }
    });
  }

  if (addPortfolioBtn) {
    addPortfolioBtn.hidden = !isAdminUser();
    addPortfolioBtn.addEventListener('click', () => {
      if (!ensureAdmin('add portfolio post')) return;
      openPortfolioEditor();
    });
  }

  if (portfolioModal) {
    portfolioModal.addEventListener('click', (event) => {
      if (event.target === portfolioModal) {
        closePortfolioEditor();
      }
    });
  }

  if (portfolioCloseButton) {
    portfolioCloseButton.addEventListener('click', closePortfolioEditor);
  }

  if (portfolioSaveButton) {
    portfolioSaveButton.addEventListener('click', async () => {
      if (!ensureAdmin('save portfolio post')) return;
      if (isPortfolioEditorReadOnly) return;
      const title = portfolioPostTitle?.value.trim();
      const content = portfolioPostBody?.value.trim();
      if (!title || !content) {
        setEditorStatus('Title and post content are required.');
        return;
      }

      if (!confirm('Are you sure you want to save this post?')) {
        return;
      }

      // Validate input length to prevent abuse
      const validatedTitle = validateLength(title, 500);
      const validatedContent = validateLength(content, 50000);

      if (validatedTitle.length !== title.length || validatedContent.length !== content.length) {
        setEditorStatus('Content was truncated due to length restrictions.');
      }

      const now = new Date().toISOString();
      const published = portfolioPostPublished?.checked ?? true; // Default to true if checkbox doesn't exist
      const pinned = portfolioPostPinned?.checked ?? false; // Default to false if checkbox doesn't exist
      const postsRef = getPostsCollectionRef();
      const userId = getCurrentUserId();
      if (postsRef && userId) {
        try {
          const isEditing = editingPostId && editingPostSource === 'firestore';
          const docRef = isEditing ? postsRef.doc(editingPostId) : postsRef.doc();
          const createdDate = editingPostCreatedDate ?? now;
          await docRef.set(
            {
              userId: userId,
              title: validatedTitle,
              body: validatedContent,
              createdDate: createdDate,
              lastEditedDate: now,
              published: published,
              pinned: pinned,
            },
            { merge: true },
          );
          editingPostId = docRef.id;
          editingPostSource = 'firestore';
          editingPostCreatedDate = createdDate;
          await loadFirestorePosts();
          renderPinned();
          renderPage();
          setPortfolioStatus('');
          closePortfolioEditor();
        } catch (error) {
          console.warn('Unable to save post.', error);
          setEditorStatus('Unable to save this post right now.');
        }
        return;
      }
      if (editingLocalPostId) {
        const existing = getLocalPostById(editingLocalPostId);
        if (!existing) {
          setEditorStatus('Unable to find that post.');
          return;
        }
        existing.title = validatedTitle;
        existing.content = validatedContent;
        existing.date = now;
      } else {
        const newId = window.crypto?.randomUUID?.() ?? `local-${Date.now()}`;
        localPosts.unshift({
          id: newId,
          title: validatedTitle,
          content: validatedContent,
          date: now,
        });
        editingLocalPostId = newId;
      }
      saveLocalPosts();
      syncLocalPostsToNotes();
      renderPage();
      setPortfolioStatus('');
      closePortfolioEditor();
    });
  }

  if (portfolioDeleteButton) {
    portfolioDeleteButton.addEventListener('click', async () => {
      if (!ensureAdmin('delete portfolio post')) return;
      if (isPortfolioEditorReadOnly) return;
      if (!editingPostId) {
        setEditorStatus('There is no post to delete.');
        return;
      }

      if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) {
        return;
      }

      const postsRef = getPostsCollectionRef();
      if (postsRef && editingPostSource === 'firestore') {
        try {
          await postsRef.doc(editingPostId).delete();
          await loadFirestorePosts();
          renderPinned();
          renderPage();
          setPortfolioStatus('');
          closePortfolioEditor();
        } catch (error) {
          console.warn('Unable to delete post.', error);
          setEditorStatus('Unable to delete this post right now.');
        }
        return;
      }
      const index = localPosts.findIndex((post) => post.id === editingLocalPostId);
      if (index === -1) {
        setEditorStatus('Unable to find that post.');
        return;
      }
      localPosts.splice(index, 1);
      saveLocalPosts();
      syncLocalPostsToNotes();
      renderPage();
      setPortfolioStatus('');
      closePortfolioEditor();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const v = e.target.value.toLowerCase();
      $$('.entry').forEach((el) => {
        el.style.display = el.textContent.toLowerCase().includes(v) ? '' : 'none';
      });
    });
  }

  $$('.filterBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      btn.classList.toggle('active');
      if (btn.classList.contains('active')) selectedTags.add(tag);
      else selectedTags.delete(tag);
      renderPage();
    });
  });

  onAuthStateChange(async () => {
    // On first auth state change (including anonymous auth), load all posts
    // On subsequent auth changes (login/logout), reload Firestore posts
    if (!hasLoadedInitialPosts) {
      hasLoadedInitialPosts = true;
      await loadPosts();
    } else {
      await loadFirestorePosts();
      renderPinned();
      renderPage();
    }
  });
}
