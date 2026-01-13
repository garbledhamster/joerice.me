import { ensureAdmin, isAdminUser } from './auth.js';
import { $, $$ } from './dom.js';
import { lockScroll, unlockScroll } from './ui/layout.js';

const pinned = [];
const notes = [];
const pageSize = 10;
const selectedTags = new Set();
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
let editPortfolioBtn = null;
let searchInput = null;

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
    .map(p => `<a class="entry" data-tags="${p.tags.join('|')}" data-url="${p.url}">${p.title}</a>`).join('');
  attachClickHandlers();
  filterEntries();
}

export function renderPage() {
  if (!entryGrid) return;
  const start = page * pageSize;
  const slice = notes.slice(start, start + pageSize);
  entryGrid.innerHTML = slice
    .map(n => `<a class="entry" data-tags="${n.tags.join('|')}" data-url="${n.url}">${n.title}</a>`).join('');
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
    const raw = await fetch(url).then(r => r.text());
    const data = jsyaml.load(raw);
    const storedContent = typeof window.getStoredPostContent === 'function'
      ? window.getStoredPostContent(url)
      : null;
    const content = storedContent ?? (data.content || '');
    currentPost = { url, data, content };
    if (typeof window.renderPostContent === 'function') {
      window.renderPostContent(content);
    } else if (postContentEl) {
      postContentEl.innerHTML = content;
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
    const loaderText = await fetch('posts/loader.yaml').then(r => r.text());
    const loaderData = jsyaml.load(loaderText);
    const count = Number(loaderData.posts) || 0;
    for (let i = 1; i <= count; i++) {
      const filePath = `posts/${String(i).padStart(4, '0')}.yaml`;
      try {
        const raw = await fetch(filePath).then(r => {
          if (!r.ok) throw new Error();
          return r.text();
        });
        const data = jsyaml.load(raw);
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
  editPortfolioBtn = $('#editPortfolioBtn');
  searchInput = $('#q');

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

  if (editPortfolioBtn) {
    editPortfolioBtn.hidden = !isAdminUser();
    editPortfolioBtn.addEventListener('click', async () => {
      if (!ensureAdmin('edit portfolio')) return;
      let targetUrl = currentPost?.url;
      if (!targetUrl) {
        const activeEntry = $('.entry.active');
        targetUrl = activeEntry?.dataset.url;
      }
      if (!targetUrl) return;
      if (postView && (!postView.classList.contains('show') || currentPost?.url !== targetUrl)) {
        await openPost(targetUrl);
      }
      if (typeof window.enterEditorMode === 'function') {
        window.enterEditorMode();
      }
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
      filterEntries();
    });
  });

  loadPosts();
}
