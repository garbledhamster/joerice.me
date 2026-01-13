import { ensureAdmin, isAdminUser } from './auth.js';
import { $, $$ } from './dom.js';
import { lockScroll, unlockScroll } from './ui/layout.js';

const pinned = [];
const notes = [];
const pageSize = 10;
const selectedTags = new Set();
const localPosts = [];
const localPostsStorageKey = 'portfolioLocalPosts';
let page = 0;
let currentPost = null;

let pinnedGrid = null;
let entryGrid = null;
let prevBtn = null;
let nextBtn = null;
let postView = null;
let postContentEl = null;
let closePostBtn = null;
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
let editingLocalPostId = null;

function renderPostContent(content) {
  if (!postContentEl) return;
  if (typeof window.marked?.parse === 'function') {
    postContentEl.innerHTML = window.marked.parse(content);
    return;
  }
  postContentEl.innerHTML = content;
}

function getYamlParser() {
  return globalThis.jsyaml;
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
      id: post.id
    });
  });
  notes.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getLocalPostById(id) {
  return localPosts.find(post => post.id === id) || null;
}

function openPortfolioEditor(post = null) {
  if (!portfolioModal) return;
  editingLocalPostId = post?.id ?? null;
  if (portfolioModalTitle) {
    portfolioModalTitle.textContent = editingLocalPostId
      ? 'Edit portfolio post'
      : 'Add portfolio post';
  }
  if (portfolioPostTitle) {
    portfolioPostTitle.value = post?.title || '';
  }
  if (portfolioPostBody) {
    portfolioPostBody.value = post?.content || '';
  }
  if (portfolioDeleteButton) {
    portfolioDeleteButton.disabled = !editingLocalPostId;
  }
  setEditorStatus('');
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
  unlockScroll();
  if (window.location.hash === '#portfolioModal') {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

function attachClickHandlers() {
  $$('.entry').forEach(el => {
    el.addEventListener('click', async () => {
      $$('.entry.active').forEach(a => a.classList.remove('active'));
      el.classList.add('active');
      if (el.dataset.source === 'local' && isAdminUser()) {
        const localPost = getLocalPostById(el.dataset.id);
        if (localPost) {
          openPortfolioEditor(localPost);
        } else {
          setPortfolioStatus('Unable to load that draft.');
        }
        return;
      }
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
    .map(p => `<a class="entry" data-tags="${p.tags.join('|')}" data-url="${p.url}">${p.title}</a>`).join('');
  attachClickHandlers();
  filterEntries();
}

export function renderPage() {
  if (!entryGrid) return;
  const start = page * pageSize;
  const slice = notes.slice(start, start + pageSize);
  entryGrid.innerHTML = slice
    .map(n => {
      const sourceAttr = n.local ? ' data-source="local"' : '';
      const idAttr = n.local ? ` data-id="${n.id}"` : '';
      return `<a class="entry" data-tags="${n.tags.join('|')}" data-url="${n.url}"${sourceAttr}${idAttr}>${n.title}</a>`;
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
  try {
    const yaml = getYamlParser();
    if (!yaml) {
      throw new Error('YAML parser unavailable');
    }
    if (url.startsWith('local:')) {
      const localId = url.replace('local:', '');
      const localPost = getLocalPostById(localId);
      if (!localPost) throw new Error('Local post unavailable');
      const content = localPost.content || '';
      currentPost = { url, data: { title: localPost.title }, content, local: true };
      renderPostContent(content);
    } else {
      const raw = await fetch(url).then(r => r.text());
      const data = yaml.load(raw);
      const storedContent = typeof window.getStoredPostContent === 'function'
        ? window.getStoredPostContent(url)
        : null;
      const content = storedContent ?? (data.content || '');
      currentPost = { url, data, content };
      renderPostContent(content);
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

async function loadPosts() {
  try {
    setPortfolioStatus('Loading posts...');
    const yaml = getYamlParser();
    if (!yaml) {
      setPortfolioStatus('Unable to load posts right now.');
      return;
    }
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
          tags: data.tags || []
        };
        if (entry.pinned) pinned.push(entry);
        else notes.push(entry);
      } catch {}
    }
    loadLocalPosts();
    syncLocalPostsToNotes();
    notes.sort((a, b) => new Date(b.date) - new Date(a.date));
    renderPinned();
    renderPage();
    if (!pinned.length && !notes.length) {
      setPortfolioStatus('No posts are available yet.');
    } else {
      setPortfolioStatus('');
    }
  } catch {
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

  if (!pinnedGrid || !entryGrid) return;

  if (closePostBtn) {
    closePostBtn.addEventListener('click', () => {
      $$('.entry.active').forEach(a => a.classList.remove('active'));
      if (postView) postView.classList.remove('show');
      unlockScroll();
      if (typeof window.exitEditorMode === 'function') {
        window.exitEditorMode();
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
    portfolioSaveButton.addEventListener('click', () => {
      if (!ensureAdmin('save portfolio post')) return;
      const title = portfolioPostTitle?.value.trim();
      const content = portfolioPostBody?.value.trim();
      if (!title || !content) {
        setEditorStatus('Title and post content are required.');
        return;
      }
      const now = new Date().toISOString();
      if (editingLocalPostId) {
        const existing = getLocalPostById(editingLocalPostId);
        if (!existing) {
          setEditorStatus('Unable to find that post.');
          return;
        }
        existing.title = title;
        existing.content = content;
        existing.date = now;
      } else {
        const newId = window.crypto?.randomUUID?.() ?? `local-${Date.now()}`;
        localPosts.unshift({
          id: newId,
          title,
          content,
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
    portfolioDeleteButton.addEventListener('click', () => {
      if (!ensureAdmin('delete portfolio post')) return;
      if (!editingLocalPostId) {
        setEditorStatus('There is no post to delete.');
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

  loadPosts();
}
