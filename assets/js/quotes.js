import { ensureAdmin, getFirestore } from './auth.js';
import { $ } from './dom.js';

let quoteBox = null;
let quoteText = null;
let quoteCite = null;
let progBar = null;
let quoteStatus = null;
let quotes = [];
let idx = 0;
let quoteInterval = null;
let editingQuoteIndex = null;
let quoteListItems = null;
let quoteEditorPane = null;
let quoteEditorText = null;
let quoteEditorAuthor = null;
let quoteSaveButton = null;
let quoteAddButton = null;
let quotesDocRef = null;

const slideMs = 7000;

function resetBar() {
  if (!progBar) return;
  progBar.style.transition = 'none';
  progBar.style.width = '100%';
  void progBar.offsetWidth;
  progBar.style.transition = 'width linear 6.4s';
  progBar.style.width = '0%';
}

function showQuote(i) {
  const q = quotes[i];
  if (!q || !quoteText || !quoteCite || !quoteBox) return;
  quoteText.textContent = `“${q.text}”`;
  quoteCite.textContent = `— ${q.author || 'Unknown'}`;
  quoteBox.classList.add('active');
  resetBar();
}

async function loadQuotesFromYaml() {
  const yamlUrl = new URL('../../quotes/quotes.yaml', import.meta.url);
  const response = await fetch(yamlUrl);
  if (!response.ok) {
    throw new Error(`Unable to load quotes YAML (${response.status}).`);
  }
  const qYaml = await response.text();
  if (!globalThis.jsyaml?.load) {
    throw new Error('YAML parser not available.');
  }
  return globalThis.jsyaml.load(qYaml)?.quotes || [];
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
    if (!quoteBox) return;
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

async function initQuoteData() {
  try {
    quotes = await loadQuotes();
    if (!quotes.length) return;
    startQuoteCarousel();
    renderQuoteList(idx);
  } catch (error) {
    console.warn('Unable to load quotes.', error);
  }
}

export function initQuotes() {
  quoteBox = $('#quoteBox');
  quoteText = $('#quoteText');
  quoteCite = $('#quoteCite');
  progBar = $('#quoteProgress');
  quoteStatus = $('#quoteStatus');
  quoteListItems = $('#quoteListItems');
  quoteEditorPane = $('#quoteEditorPane');
  quoteEditorText = $('#quoteEditorText');
  quoteEditorAuthor = $('#quoteEditorAuthor');
  quoteSaveButton = $('#quoteSaveButton');
  quoteAddButton = $('.quoteAddButton');

  const firestore = getFirestore();
  quotesDocRef = firestore ? firestore.collection('siteContent').doc('quotes') : null;

  if (!quoteBox) return;

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

  initQuoteData();
}
