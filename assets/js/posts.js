import {
  ensureAdmin,
  getCurrentUserId,
  getFirestore,
  isAdminUser,
  onAuthStateChange
} from './auth.js';
import { $, $$ } from './dom.js';
import { lockScroll, unlockScroll } from './ui/layout.js';
import { sanitizeHtml, sanitizeMarkdown, sanitizeText, validateLength } from './sanitize.js';

const pinned = [];
const notes = [];
const pageSize = 10;
const selectedTags = new Set();
const localPosts = [];
const localPostsStorageKey = 'portfolioLocalPosts';
let page = 0;
let currentPost = null;
let editingPostId = null;
let editingPostSource = null;
let editingPostCreatedDate = null;

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

function removeNotesBySource(source) {
  const filtered = notes.filter(note => note.source !== source);
  notes.length = 0;
  notes.push(...filtered);
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
    parsed.forEach(post => {
      if (!post?.id || !post?.title || typeof post?.content !== 'string') return;
      localPosts.push({
        id: post.id,
        title: post.title,
        content: post.content,
        date: post.date || new Date().toISOString()
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
  const nonLocalNotes = notes.filter(note => !note.local);
  notes.length = 0;
  notes.push(...nonLocalNotes);
  localPosts.forEach(post => {
    notes.push({
      title: post.title,
      date: post.date,
      url: `local:${post.id}`,
      pinned: false,
      tags: [],
      local: true,
      id: post.id,
      source: 'local'
    });
  });
  notes.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getLocalPostById(id) {
  return localPosts.find(post => post.id === id) || null;
}

async function loadFirestorePosts() {
  const postsRef = getPostsCollectionRef();
  const userId = getCurrentUserId();
  if (!postsRef || !userId) {
    removeNotesBySource('firestore');
    return;
  }
  try {
    // Fetch posts for the current user and sort locally to support flexible field naming
    const baseQuery = postsRef.where('userId', '==', userId);
    const snapshot = await baseQuery.get();
    const entries = [];
    snapshot.forEach(doc => {
      const data = doc.data() || {};
      
      // Filter by published status for non-admin users
      const isPublished = data['published'] !== false; // Default to true if not set
      if (!isAdminUser() && !isPublished) {
        return; // Skip unpublished posts for non-admin users
      }
      
      entries.push({
        title: data['Title'] || data['title'] || 'Untitled',
        date: data['Created Date'] || data['createdDate'] || new Date().toISOString(),
        lastEdited: data['Last Edited Date'] || data['lastEditedDate'] || data['Created Date'] || data['createdDate'] || null,
        url: `firestore:${doc.id}`,
        pinned: false,
        tags: [],
        id: doc.id,
        source: 'firestore',
        published: isPublished
      });
    });
    removeNotesBySource('firestore');
    removeNotesBySource('local');
    notes.push(...entries);
    notes.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.warn('Unable to load posts from Firestore.', error);
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
    portfolioModalTitle.textContent = editingPostId
      ? 'Edit Post'
      : 'Add Post';
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
  $$('.entry').forEach(el => {
    el.addEventListener('click', async () => {
      $$('.entry.active').forEach(a => a.classList.remove('active'));
      el.classList.add('active');
      await openPost(el.dataset.url);
    });
  });
}

function filterEntries() {
  $$('.entry').forEach(el => {
    const tags = (el.dataset.tags || '').split('|');
    const hide = selectedTags.size &&
                 ![...selectedTags].some(t => tags.includes(t));
    el.style.display = hide ? 'none' : '';
  });
}

function renderPinned() {
  if (!pinnedGrid) return;
  pinnedGrid.innerHTML = pinned
    .map(p => {
      const safeTitle = sanitizeText(p.title);
      const safeTags = p.tags.map(t => sanitizeText(t)).join('|');
      const safeUrl = sanitizeText(p.url);
      return `<a class="entry" data-tags="${safeTags}" data-url="${safeUrl}">${safeTitle}</a>`;
    }).join('');
  attachClickHandlers();
  filterEntries();
}

export function renderPage() {
  if (!entryGrid) return;
  const start = page * pageSize;
  const slice = notes.slice(start, start + pageSize);
  entryGrid.innerHTML = slice
    .map(n => {
      const safeTitle = sanitizeText(n.title);
      const safeTags = n.tags.map(t => sanitizeText(t)).join('|');
      const safeUrl = sanitizeText(n.url);
      const sourceAttr = n.source ? ` data-source="${sanitizeText(n.source)}"` : '';
      const idAttr = n.id ? ` data-id="${sanitizeText(n.id)}"` : '';
      return `<a class="entry" data-tags="${safeTags}" data-url="${safeUrl}"${sourceAttr}${idAttr}>${safeTitle}</a>`;
    }).join('');
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
      const content = data['Body'] || data['body'] || '';
      const isPublished = data['published'] !== false; // Default to true if not set
      currentPost = { 
        url, 
        data, 
        content, 
        firestore: true, 
        id: postId, 
        source: 'firestore',
        createdDate: data['Created Date'] || data['createdDate'],
        published: isPublished
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
      const raw = await fetch(url).then(r => r.text());
      const data = yaml.load(raw);
      const storedContent = typeof window.getStoredPostContent === 'function'
        ? window.getStoredPostContent(url)
        : null;
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
    const loaderText = await fetch('posts/loader.yaml').then(r => r.text());
    const loaderData = yaml.load(loaderText);
    const count = Number(loaderData.posts) || 0;
    for (let i = 1; i <= count; i++) {
      const filePath = `posts/${String(i).padStart(4, '0')}.yaml`;
      try {
        const raw = await fetch(filePath).then(r => {
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
          source: 'yaml'
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

  if (!pinnedGrid || !entryGrid) return;

  if (closePostBtn) {
    closePostBtn.addEventListener('click', () => {
      $$('.entry.active').forEach(a => a.classList.remove('active'));
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
          published: currentPost.published !== false // Default to true if not set
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
    portfolioModal.addEventListener('click', event => {
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
      // Validate input length to prevent abuse
      const validatedTitle = validateLength(title, 500);
      const validatedContent = validateLength(content, 50000);
      
      if (validatedTitle.length !== title.length || validatedContent.length !== content.length) {
        setEditorStatus('Content was truncated due to length restrictions.');
      }
      
      const now = new Date().toISOString();
      const published = portfolioPostPublished?.checked !== false; // Default to true
      const postsRef = getPostsCollectionRef();
      const userId = getCurrentUserId();
      if (postsRef && userId) {
        try {
          const isEditing = editingPostId && editingPostSource === 'firestore';
          const docRef = isEditing ? postsRef.doc(editingPostId) : postsRef.doc();
          const createdDate = editingPostCreatedDate ?? now;
          await docRef.set({
            'userId': userId,
            'title': validatedTitle,
            'body': validatedContent,
            'createdDate': createdDate,
            'lastEditedDate': now,
            'published': published
          }, { merge: true });
          editingPostId = docRef.id;
          editingPostSource = 'firestore';
          editingPostCreatedDate = createdDate;
          await loadFirestorePosts();
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
          date: now
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
      const postsRef = getPostsCollectionRef();
      if (postsRef && editingPostSource === 'firestore') {
        try {
          await postsRef.doc(editingPostId).delete();
          await loadFirestorePosts();
          renderPage();
          setPortfolioStatus('');
          closePortfolioEditor();
        } catch (error) {
          console.warn('Unable to delete post.', error);
          setEditorStatus('Unable to delete this post right now.');
        }
        return;
      }
      const index = localPosts.findIndex(post => post.id === editingLocalPostId);
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
    searchInput.addEventListener('input', e => {
      const v = e.target.value.toLowerCase();
      $$('.entry').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(v) ? '' : 'none';
      });
    });
  }

  $$('.filterBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      btn.classList.toggle('active');
      if (btn.classList.contains('active')) selectedTags.add(tag);
      else selectedTags.delete(tag);
      renderPage();
    });
  });

  onAuthStateChange(async () => {
    await loadFirestorePosts();
    renderPage();
  });

  loadPosts();
}
