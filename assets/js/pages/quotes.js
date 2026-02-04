/**
 * @file pages/quotes.js
 * @description Quotes page module
 *
 * Displays rotating quotes with carousel and admin editor
 */

import { $, addListener } from '../core/dom.js';
import { isAdminUser, ensureAdmin, getFirestore } from '../services/auth.js';
import { sanitizeText, validateLength } from '../services/sanitize.js';

// State
let quotes = [];
let idx = 0;
let quoteInterval = null;
let editingQuoteIndex = null;
let editingQuoteId = null;

// DOM references
let quoteBox = null;
let quoteText = null;
let quoteCite = null;
let progBar = null;
let quoteListItems = null;
let cleanupFns = [];

const slideMs = 7000;

/**
 * Get quotes page HTML template
 * @returns {string} Quotes page HTML
 */
export function getQuotesTemplate() {
  return `
    <section class="quotes" id="quotesSection">
      <div class="sectionHeader">
        <h2>Quotes</h2>
        <button class="editBtn" id="editQuotesBtn" type="button" data-admin-only>Edit</button>
      </div>
      <div class="quoteBox" id="quoteBox">
        <blockquote id="quoteText"></blockquote>
        <cite id="quoteCite"></cite>
      </div>
      <div class="progressWrap"><div class="progressBar" id="quoteProgress"></div></div>
      <div class="quoteEditor editPanel is-collapsed" id="quoteEditor" data-admin-only>
        <aside class="quoteList">
          <div class="quoteListHeader">
            <span>Quotes</span>
            <button class="quoteAddButton" type="button">Add</button>
          </div>
          <ul id="quoteListItems"></ul>
        </aside>
      </div>
    </section>
  `;
}

/**
 * Reset progress bar
 */
function resetBar() {
  if (!progBar) return;
  progBar.style.transition = 'none';
  progBar.style.width = '100%';
  void progBar.offsetWidth;
  progBar.style.transition = 'width linear 6.4s';
  progBar.style.width = '0%';
}

/**
 * Show a quote by index
 * @param {number} i - Quote index
 */
function showQuote(i) {
  const q = quotes[i];
  if (!q || !quoteText || !quoteCite || !quoteBox) return;
  quoteText.textContent = `"${q.text}"`;
  quoteCite.textContent = `— ${q.author || 'Unknown'}`;
  quoteBox.classList.add('active');
  resetBar();
}

/**
 * Load quotes from Firestore
 * @returns {Object[]} Array of quotes
 */
async function loadQuotes() {
  const firestore = getFirestore();
  if (!firestore) return [];

  try {
    const quotesRef = firestore.collection('Quotes');
    const snapshot = await quotesRef.orderBy('createdAt', 'desc').get();

    const loadedQuotes = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      loadedQuotes.push({
        id: doc.id,
        text: data.text || '',
        author: data.author || '',
        visible: data.visible !== false,
        source: 'firestore',
      });
    });

    return loadedQuotes;
  } catch (error) {
    console.warn('Unable to load quotes:', error);
    return [];
  }
}

/**
 * Start quote carousel
 */
function startQuoteCarousel() {
  if (!quotes.length) return;

  const visibleQuotes = isAdminUser() ? quotes : quotes.filter(q => q.visible !== false);
  if (!visibleQuotes.length) return;

  let carouselIdx = 0;

  const showCarouselQuote = i => {
    const q = visibleQuotes[i];
    if (!q || !quoteText || !quoteCite || !quoteBox) return;
    quoteText.textContent = `"${q.text}"`;
    quoteCite.textContent = `— ${q.author || 'Unknown'}`;
    quoteBox.classList.add('active');
    resetBar();
  };

  showCarouselQuote(0);

  if (quoteInterval) clearInterval(quoteInterval);
  quoteInterval = setInterval(() => {
    if (!quoteBox) return;
    quoteBox.classList.remove('active');
    setTimeout(() => {
      carouselIdx = (carouselIdx + 1) % visibleQuotes.length;
      showCarouselQuote(carouselIdx);
    }, 600);
  }, slideMs);
}

/**
 * Render quote list in editor
 */
function renderQuoteList() {
  if (!quoteListItems) return;

  quoteListItems.innerHTML = quotes.map((quote, index) => {
    const safeText = sanitizeText(quote.text?.slice(0, 32) || 'Untitled');
    const ellipsis = quote.text?.length > 32 ? '…' : '';
    const isEditing = index === editingQuoteIndex;
    const isVisible = quote.visible !== false;
    const visibilityClass = !isVisible ? 'quote-hidden' : '';

    if (isEditing) {
      return `
        <li class="quote-list-item editing">
          <div class="quote-inline-editor">
            <textarea class="quote-inline-text" rows="3" placeholder="Quote text">${sanitizeText(quote.text || '')}</textarea>
            <input class="quote-inline-author" type="text" placeholder="Author" value="${sanitizeText(quote.author || '')}"/>
            <div class="quote-inline-actions">
              <button class="quote-inline-save" type="button" data-index="${index}">Save</button>
              <button class="quote-inline-cancel" type="button" data-index="${index}">Cancel</button>
              ${quote.id ? `<button class="quote-inline-delete" type="button" data-index="${index}">Delete</button>` : ''}
            </div>
          </div>
        </li>
      `;
    }

    return `
      <li class="quote-list-item ${visibilityClass}">
        <button class="quoteListButton" type="button" data-index="${index}">${safeText}${ellipsis}</button>
        <button class="quote-visibility-button" type="button" data-index="${index}" title="${isVisible ? 'Hide' : 'Show'}">
          <i class="fas fa-eye${isVisible ? '' : '-slash'}"></i>
        </button>
        <button class="quote-edit-button" type="button" data-index="${index}" title="Edit">✎</button>
      </li>
    `;
  }).join('');
}

/**
 * Save a quote to Firestore
 * @param {Object} quoteData - Quote data
 * @returns {string|null} Saved quote ID
 */
async function saveQuote(quoteData) {
  const firestore = getFirestore();
  if (!firestore) return null;

  const { id, text, author, visible } = quoteData;
  const now = new Date().toISOString();

  if (id) {
    await firestore.collection('Quotes').doc(id).set({
      text,
      author,
      visible: visible !== false,
      updatedAt: now,
    }, { merge: true });
    return id;
  } else {
    const docRef = await firestore.collection('Quotes').add({
      text,
      author,
      visible: visible !== false,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  }
}

/**
 * Delete a quote from Firestore
 * @param {string} quoteId - Quote ID to delete
 */
async function deleteQuote(quoteId) {
  const firestore = getFirestore();
  if (!firestore || !quoteId) return;
  await firestore.collection('Quotes').doc(quoteId).delete();
}

/**
 * Render quotes page
 */
export function renderQuotes() {
  const mainContent = $('#mainContent');
  if (!mainContent) return;

  mainContent.innerHTML = getQuotesTemplate();
  initQuotes();
}

/**
 * Initialize quotes page
 */
export async function initQuotes() {
  quoteBox = $('#quoteBox');
  quoteText = $('#quoteText');
  quoteCite = $('#quoteCite');
  progBar = $('#quoteProgress');
  quoteListItems = $('#quoteListItems');

  if (!quoteBox) return;

  // Load and start carousel
  quotes = await loadQuotes();
  if (quotes.length) {
    startQuoteCarousel();
    renderQuoteList();
  }

  // Edit button
  const editQuotesBtn = $('#editQuotesBtn');
  const quoteEditor = $('#quoteEditor');
  if (editQuotesBtn && quoteEditor) {
    cleanupFns.push(addListener(editQuotesBtn, 'click', () => {
      if (!ensureAdmin('edit quotes')) return;
      const isCollapsed = quoteEditor.classList.contains('is-collapsed');
      if (isCollapsed) {
        quoteEditor.classList.remove('is-collapsed');
        editQuotesBtn.textContent = 'Close';
      } else {
        quoteEditor.classList.add('is-collapsed');
        editQuotesBtn.textContent = 'Edit';
        editingQuoteId = null;
        editingQuoteIndex = null;
        renderQuoteList();
      }
    }));
  }

  // Add button
  const quoteAddButton = $('.quoteAddButton');
  if (quoteAddButton) {
    cleanupFns.push(addListener(quoteAddButton, 'click', () => {
      if (!ensureAdmin('add quote')) return;
      quotes.unshift({ text: '', author: '' });
      editingQuoteIndex = 0;
      editingQuoteId = null;
      renderQuoteList();
    }));
  }

  // Quote list interactions
  if (quoteListItems) {
    cleanupFns.push(addListener(quoteListItems, 'click', async e => {
      // View quote
      const viewBtn = e.target.closest('.quoteListButton');
      if (viewBtn) {
        const index = Number(viewBtn.dataset.index);
        idx = index;
        showQuote(idx);
        return;
      }

      // Edit quote
      const editBtn = e.target.closest('.quote-edit-button');
      if (editBtn) {
        if (!ensureAdmin('edit quote')) return;
        editingQuoteIndex = Number(editBtn.dataset.index);
        editingQuoteId = quotes[editingQuoteIndex]?.id || null;
        renderQuoteList();
        return;
      }

      // Save quote
      const saveBtn = e.target.closest('.quote-inline-save');
      if (saveBtn) {
        if (!ensureAdmin('save quote')) return;
        const index = Number(saveBtn.dataset.index);
        const listItem = saveBtn.closest('.quote-list-item');
        const text = listItem.querySelector('.quote-inline-text')?.value.trim();
        const author = listItem.querySelector('.quote-inline-author')?.value.trim();

        if (!text) {
          alert('Quote text required');
          return;
        }

        if (!confirm('Save this quote?')) return;

        try {
          const savedId = await saveQuote({
            id: quotes[index]?.id,
            text: validateLength(text, 1000),
            author: validateLength(author, 200),
          });
          quotes = await loadQuotes();
          editingQuoteIndex = null;
          editingQuoteId = null;
          renderQuoteList();
          startQuoteCarousel();
        } catch (error) {
          alert('Unable to save quote');
        }
        return;
      }

      // Cancel edit
      const cancelBtn = e.target.closest('.quote-inline-cancel');
      if (cancelBtn) {
        const index = Number(cancelBtn.dataset.index);
        if (!quotes[index]?.id) {
          quotes.splice(index, 1);
        }
        editingQuoteIndex = null;
        editingQuoteId = null;
        renderQuoteList();
        return;
      }

      // Delete quote
      const deleteBtn = e.target.closest('.quote-inline-delete');
      if (deleteBtn) {
        if (!ensureAdmin('delete quote')) return;
        if (!confirm('Delete this quote?')) return;
        const index = Number(deleteBtn.dataset.index);
        const quote = quotes[index];
        if (!quote?.id) return;

        try {
          await deleteQuote(quote.id);
          quotes = await loadQuotes();
          editingQuoteIndex = null;
          editingQuoteId = null;
          renderQuoteList();
          startQuoteCarousel();
        } catch (error) {
          alert('Unable to delete quote');
        }
      }
    }));
  }
}

/**
 * Clean up quotes page
 */
export function destroyQuotes() {
  if (quoteInterval) {
    clearInterval(quoteInterval);
    quoteInterval = null;
  }
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];
  quotes = [];
  idx = 0;
}
