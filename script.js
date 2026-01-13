document.getElementById('year').textContent = new Date().getFullYear();

const firebaseConfig = window.firebaseConfig || {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

let auth = null;
if (window.firebase?.apps?.length === 0) {
  if (firebaseConfig?.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY') {
    window.firebase.initializeApp(firebaseConfig);
  } else {
    console.warn('Firebase config missing; auth is disabled.');
  }
}
if (window.firebase?.auth) {
  auth = window.firebase.auth();
}
let firestore = null;
if (window.firebase?.apps?.length && window.firebase?.firestore) {
  firestore = window.firebase.firestore();
}
const quotesDocRef = firestore ? firestore.collection('siteContent').doc('quotes') : null;

let isAdmin = false;
const adminEmail = 'jmjrice94@gmail.com';

function isAdminUser() {
  return isAdmin;
}

window.isAdminUser = isAdminUser;

function updateAdminUi() {
  const adminOnlyElements = document.querySelectorAll(
    '[data-admin-only], .editButton, .editPanel'
  );
  adminOnlyElements.forEach(el => {
    const shouldHide = !isAdmin;
    el.hidden = shouldHide;
    el.setAttribute('aria-hidden', String(shouldHide));
    el.classList.toggle('admin-hidden', shouldHide);
  });
}

function ensureAdmin(actionLabel = 'admin action') {
  if (isAdmin) return true;
  console.warn(`Blocked ${actionLabel}: not an admin user.`);
  return false;
}

if (auth?.onAuthStateChanged) {
  auth.onAuthStateChanged(user => {
    isAdmin = user?.email === adminEmail;
    updateAdminUi();
  });
} else {
  updateAdminUi();
}

document.addEventListener('click', event => {
  const adminTarget = event.target.closest('[data-admin-action], .editButton');
  if (!adminTarget) return;
  const label = adminTarget.dataset.adminAction || 'admin action';
  if (!ensureAdmin(label)) {
    event.preventDefault();
    event.stopPropagation();
  }
});

document.addEventListener('submit', event => {
  const adminTarget = event.target.closest('[data-admin-action]');
  if (!adminTarget) return;
  const label = adminTarget.dataset.adminAction || 'admin action';
  if (!ensureAdmin(label)) {
    event.preventDefault();
    event.stopPropagation();
  }
});

document.querySelectorAll('.editButton[data-panel-target]').forEach(button => {
  const panel = document.getElementById(button.dataset.panelTarget);
  if (panel) {
    button.setAttribute('aria-expanded', String(!panel.classList.contains('is-collapsed')));
  }
  button.addEventListener('click', () => {
    if (!ensureAdmin(button.dataset.adminAction || 'admin action')) return;
    if (!panel) return;
    const isCollapsed = panel.classList.toggle('is-collapsed');
    button.setAttribute('aria-expanded', String(!isCollapsed));
  });
});

function updateHeaderHeight() {
  const h = document.querySelector('.siteHeader').offsetHeight;
  document.documentElement.style.setProperty('--header-h', `${h}px`);
}

updateHeaderHeight();
window.addEventListener('resize', updateHeaderHeight);

let scrollY = 0;
function lockScroll() {
  scrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
}

function unlockScroll() {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  window.scrollTo(0, scrollY);
}

const menuToggle = document.querySelector('.menuToggle');
const mainNav = document.getElementById('mainNav');
menuToggle.addEventListener('click', () => mainNav.classList.toggle('open'));

const pinned = [];
const notes = [];
const pageSize = 10;
let page = 0;

const pinnedGrid = document.getElementById('pinnedGrid');
const entryGrid = document.getElementById('entryGrid');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const postView = document.getElementById('postView');
const postContentEl = document.getElementById('postContentInner');
const closePostBtn = document.getElementById('closePost');
const portfolioStatus = document.getElementById('portfolioStatus');

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

function renderPinned() {
  pinnedGrid.innerHTML = pinned
    .map(p => `<a class="entry" data-tags="${p.tags.join('|')}" data-url="${p.url}">${p.title}</a>`).join('');
  attachClickHandlers();
}

function renderPage() {
  const start = page * pageSize;
  const slice = notes.slice(start, start + pageSize);
  entryGrid.innerHTML = slice
    .map(n => `<a class="entry" data-tags="${n.tags.join('|')}" data-url="${n.url}">${n.title}</a>`).join('');
  prevBtn.disabled = page === 0;
  nextBtn.disabled = start + pageSize >= notes.length;
  attachClickHandlers();
}

function attachClickHandlers() {
  document.querySelectorAll('.entry').forEach(el => {
    el.addEventListener('click', async () => {
      document.querySelectorAll('.entry.active').forEach(a => a.classList.remove('active'));
      el.classList.add('active');
      await openPost(el.dataset.url);
    });
  });
}

async function openPost(url) {
  exitEditorMode();
  try {
    const raw = await fetch(url).then(r => r.text());
    const data = jsyaml.load(raw);
    const storedContent = getStoredPostContent(url);
    const content = storedContent ?? (data.content || '');
    currentPost = { url, data, content };
    renderPostContent(content);
  } catch {
    currentPost = { url, data: null, content: '' };
    postContentEl.innerHTML = '<p>Unable to load this post.</p>';
  }
  lockScroll();
  postView.classList.add('show');
  window.scrollTo(0, 0);
}

closePostBtn.addEventListener('click', () => {
  document.querySelectorAll('.entry.active').forEach(a => a.classList.remove('active'));
  postView.classList.remove('show');
  unlockScroll();
  exitEditorMode();
});

if (editPortfolioBtn && isAdmin) {
  editPortfolioBtn.hidden = false;
  editPortfolioBtn.addEventListener('click', async () => {
    let targetUrl = currentPost?.url;
    if (!targetUrl) {
      const activeEntry = document.querySelector('.entry.active');
      targetUrl = activeEntry?.dataset.url;
    }
    if (!targetUrl) return;
    if (!postView.classList.contains('show') || currentPost?.url !== targetUrl) {
      await openPost(targetUrl);
    }
    enterEditorMode();
  });
}

(async () => {
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
})();

document.getElementById('q').addEventListener('input', e => {
  const v = e.target.value.toLowerCase();
  document.querySelectorAll('.entry').forEach(el => {
    el.style.display = el.textContent.toLowerCase().includes(v) ? '' : 'none';
  });
});

const quoteBox = document.getElementById('quoteBox');
const quoteText = document.getElementById('quoteText');
const quoteCite = document.getElementById('quoteCite');
const progBar = document.getElementById('quoteProgress');
let quotes = [];
let idx = 0;
const slideMs = 7000;
let quoteInterval = null;
let editingQuoteIndex = null;

const quoteListItems = document.getElementById('quoteListItems');
const quoteEditorPane = document.getElementById('quoteEditorPane');
const quoteEditorText = document.getElementById('quoteEditorText');
const quoteEditorAuthor = document.getElementById('quoteEditorAuthor');
const quoteSaveButton = document.getElementById('quoteSaveButton');
const quoteAddButton = document.querySelector('.quoteAddButton');

function resetBar() {
  progBar.style.transition = 'none';
  progBar.style.width = '100%';
  void progBar.offsetWidth;
  progBar.style.transition = 'width linear 6.4s';
  progBar.style.width = '0%';
}

function showQuote(i) {
  const q = quotes[i];
  if (!q) return;
  quoteText.textContent = `“${q.text}”`;
  quoteCite.textContent = `— ${q.author || 'Unknown'}`;
  quoteBox.classList.add('active');
  resetBar();
}

async function loadQuotesFromYaml() {
  const qYaml = await fetch('quotes/quotes.yaml').then(r => r.text());
  return jsyaml.load(qYaml).quotes || [];
}

async function loadQuotes() {
  if (quotesDocRef) {
    try {
      const doc = await quotesDocRef.get();
      if (doc.exists) {
        return doc.data().quotes || [];
      }
    } catch (error) {
      console.warn('Unable to load quotes from Firestore, falling back to YAML.', error);
    }
  }
  return loadQuotesFromYaml();
}

function startQuoteCarousel() {
  if (!quotes.length) return;
  showQuote(0);
  if (quoteInterval) clearInterval(quoteInterval);
  quoteInterval = setInterval(() => {
    quoteBox.classList.remove('active');
    setTimeout(() => {
      idx = (idx + 1) % quotes.length;
      showQuote(idx);
    }, 600);
  }, slideMs);
}

function renderQuoteList(activeIndex = editingQuoteIndex) {
  if (!quoteListItems) return;
  quoteListItems.innerHTML = quotes.map((quote, index) => `
    <li>
      <button class="quoteListButton ${index === activeIndex ? 'active' : ''}" type="button" data-index="${index}">
        ${quote.text?.slice(0, 32) || 'Untitled'}${quote.text?.length > 32 ? '…' : ''}
      </button>
    </li>
  `).join('');
}

function openQuoteEditor({ index, text, author }) {
  editingQuoteIndex = index;
  if (quoteEditorPane) {
    quoteEditorPane.classList.add('is-active');
  }
  if (quoteEditorText) quoteEditorText.value = text || '';
  if (quoteEditorAuthor) quoteEditorAuthor.value = author || '';
  renderQuoteList(index);
}

async function saveQuotes() {
  if (!quotesDocRef) {
    console.warn('Firestore not configured; quote updates cannot be saved.');
    return;
  }
  await quotesDocRef.set({ quotes }, { merge: true });
}

(async () => {
  try {
    quotes = await loadQuotes();
    if (!quotes.length) return;
    startQuoteCarousel();
    renderQuoteList(idx);
  } catch {}
})();

if (quoteListItems) {
  quoteListItems.addEventListener('click', event => {
    const button = event.target.closest('[data-index]');
    if (!button) return;
    const index = Number(button.dataset.index);
    const quote = quotes[index];
    if (!quote) return;
    openQuoteEditor({ index, text: quote.text, author: quote.author });
  });
}

if (quoteAddButton) {
  quoteAddButton.addEventListener('click', () => {
    if (!ensureAdmin('add quote')) return;
    openQuoteEditor({ index: null, text: '', author: '' });
  });
}

if (quoteSaveButton) {
  quoteSaveButton.addEventListener('click', async () => {
    if (!ensureAdmin('save quote')) return;
    const text = quoteEditorText?.value.trim();
    const author = quoteEditorAuthor?.value.trim();
    if (!text) {
      alert('Please add a quote before saving.');
      return;
    }
    const updated = { text, author };
    if (editingQuoteIndex === null || Number.isNaN(editingQuoteIndex)) {
      quotes.push(updated);
      editingQuoteIndex = quotes.length - 1;
    } else {
      quotes[editingQuoteIndex] = updated;
    }
    try {
      await saveQuotes();
    } catch (error) {
      console.warn('Unable to save quotes.', error);
    }
    renderQuoteList(editingQuoteIndex);
    idx = editingQuoteIndex;
    showQuote(idx);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(() => document.body.classList.add('loaded'));
});

const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');

function openModal() {
  modal.classList.add('show');
}

function hideModal() {
  modal.classList.remove('show');
}

closeModal.addEventListener('click', hideModal);
modal.addEventListener('click', e => {
  if (e.target === modal) hideModal();
});

document.getElementById('contactForm').addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await fetch('https://formspree.io/f/xovqpvdv', {
      method: 'POST',
      body: fd,
      headers: { 'Accept': 'application/json' }
    });
  } catch {}
  e.target.reset();
  openModal();
});

const mobile = !matchMedia('(hover: hover)').matches;
if (mobile) {
  document.querySelectorAll('.galleryGrid img').forEach(img => {
    img.parentElement.addEventListener('click', e => {
      if (!img.classList.contains('tapped')) {
        e.preventDefault();
        document.querySelectorAll('.galleryGrid img').forEach(i => i.classList.remove('tapped'));
        img.classList.add('tapped');
      }
    });
  });
}

const colors = ['var(--blue)', 'var(--red)', 'var(--yellow)', 'var(--rose)', 'var(--green)', 'var(--purple)'];
document.querySelectorAll('.social a').forEach(a => {
  const tip = document.createElement('span');
  tip.className = 'tooltip';
  tip.textContent = a.dataset.tip;
  a.appendChild(tip);
  const show = () => {
    a.classList.add('showTip');
    const c = colors[Math.random() * colors.length | 0];
    a.style.color = c;
    tip.style.background = c;
  };
  const hide = () => {
    a.classList.remove('showTip');
    a.style.color = 'inherit';
    tip.style.background = 'var(--fg)';
  };
  if (!mobile) {
    a.addEventListener('mouseenter', show);
    a.addEventListener('mouseleave', hide);
  }
  a.addEventListener('click', e => {
    if (mobile && !a.classList.contains('showTip')) {
      e.preventDefault();
      document.querySelectorAll('.social a').forEach(l => {
        l.classList.remove('showTip');
        l.style.color = 'inherit';
      });
      show();
    }
  });
});

// --- Tag filter logic ---
const selectedTags = new Set();

function filterEntries() {
  document.querySelectorAll('.entry').forEach(el => {
    const tags = (el.dataset.tags || '').split('|');
    const hide = selectedTags.size &&
                 ![...selectedTags].some(t => tags.includes(t));
    el.style.display = hide ? 'none' : '';
  });
}

document.querySelectorAll('.filterBtn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tag = btn.dataset.tag;
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) selectedTags.add(tag);
    else selectedTags.delete(tag);
    filterEntries();
  });
});

const origRenderPage = renderPage;
renderPage = (...args) => {
  origRenderPage(...args);
  filterEntries();
};
