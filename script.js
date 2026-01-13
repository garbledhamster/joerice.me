document.getElementById('year').textContent = new Date().getFullYear();

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
  try {
    const raw = await fetch(url).then(r => r.text());
    const data = jsyaml.load(raw);
    postContentEl.innerHTML = marked.parse(data.content || '');
  } catch {
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
});

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

function resetBar() {
  progBar.style.transition = 'none';
  progBar.style.width = '100%';
  void progBar.offsetWidth;
  progBar.style.transition = 'width linear 6.4s';
  progBar.style.width = '0%';
}

function showQuote(i) {
  const q = quotes[i];
  quoteText.textContent = `“${q.text}”`;
  quoteCite.textContent = `— ${q.author || 'Unknown'}`;
  quoteBox.classList.add('active');
  resetBar();
}

(async () => {
  try {
    const qYaml = await fetch('quotes/quotes.yaml').then(r => r.text());
    quotes = jsyaml.load(qYaml).quotes || [];
    if (!quotes.length) return;
    showQuote(0);
    setInterval(() => {
      quoteBox.classList.remove('active');
      setTimeout(() => {
        idx = (idx + 1) % quotes.length;
        showQuote(idx);
      }, 600);
    }, slideMs);
  } catch {}
})();

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
