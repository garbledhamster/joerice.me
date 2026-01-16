import { ensureAdmin, getFirestore, isAdminUser } from './auth.js';
import { $ } from './dom.js';
import { sanitizeText, validateLength } from './sanitize.js';

let quoteBox = null;
let quoteText = null;
let quoteCite = null;
let progBar = null;
let quoteStatus = null;
let quotes = [];
let idx = 0;
let quoteInterval = null;
let editingQuoteId = null;
let editingQuoteIndex = null;
let quoteListItems = null;
let quoteEditorPane = null;
let quoteEditorText = null;
let quoteEditorAuthor = null;
let quoteSaveButton = null;
let quoteAddButton = null;
let quotesCollectionRef = null;

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
  // Load quotes from YAML (GitHub)
  let yamlQuotes = [];
  try {
    yamlQuotes = await loadQuotesFromYaml();
  } catch (error) {
    console.warn('Unable to load quotes from YAML.', error);
  }
  
  // Load quotes from Firebase if available
  let firebaseQuotes = [];
  if (quotesCollectionRef) {
    try {
      const snapshot = await quotesCollectionRef.orderBy('createdAt', 'desc').get();
      snapshot.forEach(doc => {
        const data = doc.data();
        firebaseQuotes.push({
          id: doc.id,
          text: data.text || '',
          author: data.author || '',
          createdAt: data.createdAt,
          visible: data.visible !== false // Default to true if not set
        });
      });
    } catch (error) {
      console.warn('Unable to load quotes from Firestore.', error);
    }
  }
  
  // Combine both sources: Firebase quotes first (with id), then YAML quotes (without id)
  return [...firebaseQuotes, ...yamlQuotes];
}

function startQuoteCarousel() {
  if (!quotes.length) return;
  
  // Filter quotes for public users (admin sees all)
  const visibleQuotes = isAdminUser() 
    ? quotes 
    : quotes.filter(q => q.visible !== false);
  
  if (!visibleQuotes.length) return;
  
  // Update quotes array reference for carousel
  const carouselQuotes = visibleQuotes;
  let carouselIdx = 0;
  
  const showCarouselQuote = (i) => {
    const q = carouselQuotes[i];
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
      carouselIdx = (carouselIdx + 1) % carouselQuotes.length;
      showCarouselQuote(carouselIdx);
    }, 600);
  }, slideMs);
}

function renderQuoteList(activeIndex = editingQuoteIndex) {
  if (!quoteListItems) return;
  quoteListItems.innerHTML = quotes.map((quote, index) => {
    const safeText = sanitizeText(quote.text?.slice(0, 32) || 'Untitled');
    const ellipsis = quote.text?.length > 32 ? '…' : '';
    const isEditing = index === editingQuoteIndex;
    const activeClass = index === activeIndex && !isEditing ? 'active' : '';
    const isVisible = quote.visible !== false;
    const visibilityClass = !isVisible ? 'quote-hidden' : '';
    
    // Show inline editor if this quote is being edited
    if (isEditing) {
      const safeQuoteText = sanitizeText(quote.text || '');
      const safeQuoteAuthor = sanitizeText(quote.author || '');
      return `
      <li class="quote-list-item editing">
        <div class="quote-inline-editor">
          <textarea class="quote-inline-text" rows="3" placeholder="Write the quote here">${safeQuoteText}</textarea>
          <input class="quote-inline-author" type="text" placeholder="Quote author" value="${safeQuoteAuthor}"/>
          <div class="quote-inline-actions">
            <button class="quote-inline-save" type="button" data-index="${index}">Save</button>
            <button class="quote-inline-cancel" type="button" data-index="${index}">Cancel</button>
            ${quote.id ? `<button class="quote-inline-delete" type="button" data-index="${index}">Delete</button>` : ''}
          </div>
        </div>
      </li>
    `;
    }
    
    // Show regular quote button with edit and visibility buttons
    return `
    <li class="quote-list-item ${activeClass} ${visibilityClass}">
      <button class="quoteListButton" type="button" data-index="${index}">
        ${safeText}${ellipsis}
      </button>
      <button class="quote-visibility-button" type="button" data-index="${index}" title="${isVisible ? 'Hide from public' : 'Show to public'}" aria-label="${isVisible ? 'Hide from public' : 'Show to public'}">
        <i class="fas fa-eye${isVisible ? '' : '-slash'}"></i>
      </button>
      <button class="quote-edit-button" type="button" data-index="${index}" title="Edit">✎</button>
    </li>
  `;
  }).join('');
}

function openQuoteEditor({ index, text, author }) {
  editingQuoteIndex = index;
  editingQuoteId = index !== null && quotes[index] ? quotes[index].id : null;
  if (quoteEditorPane) {
    quoteEditorPane.classList.add('is-active');
  }
  if (quoteEditorText) quoteEditorText.value = text || '';
  if (quoteEditorAuthor) quoteEditorAuthor.value = author || '';
  renderQuoteList(index);
}

async function saveQuote(quoteData) {
  if (!quotesCollectionRef) {
    console.warn('Firestore not configured; quote updates cannot be saved.');
    return null;
  }
  
  const { id, text, author, visible } = quoteData;
  const now = new Date().toISOString();
  
  if (id) {
    // Update existing quote
    await quotesCollectionRef.doc(id).set({
      text,
      author,
      visible: visible !== false, // Default to true
      updatedAt: now
    }, { merge: true });
    return id;
  } else {
    // Create new quote
    const docRef = await quotesCollectionRef.add({
      text,
      author,
      visible: visible !== false, // Default to true
      createdAt: now,
      updatedAt: now
    });
    return docRef.id;
  }
}

async function deleteQuote(quoteId) {
  if (!quotesCollectionRef || !quoteId) {
    console.warn('Cannot delete quote: Firestore not configured or no ID provided.');
    return;
  }
  await quotesCollectionRef.doc(quoteId).delete();
}

async function toggleQuoteVisibility(quoteId, currentVisibility) {
  if (!quotesCollectionRef || !quoteId) {
    console.warn('Cannot toggle visibility: Firestore not configured or no ID provided.');
    return;
  }
  const newVisibility = !currentVisibility;
  await quotesCollectionRef.doc(quoteId).update({
    visible: newVisibility,
    updatedAt: new Date().toISOString()
  });
  return newVisibility;
}

async function reloadQuotes() {
  try {
    quotes = await loadQuotes();
    renderQuoteList();
  } catch (error) {
    console.warn('Unable to reload quotes.', error);
  }
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
  quotesCollectionRef = firestore ? firestore.collection('Quotes') : null;

  if (!quoteBox) return;

  if (quoteListItems) {
    quoteListItems.addEventListener('click', event => {
      // Handle quote selection (view quote in carousel)
      const viewButton = event.target.closest('.quoteListButton');
      if (viewButton) {
        const index = Number(viewButton.dataset.index);
        const quote = quotes[index];
        if (!quote) return;
        idx = index;
        showQuote(idx);
        renderQuoteList(index);
        return;
      }
      
      // Handle visibility toggle button
      const visibilityButton = event.target.closest('.quote-visibility-button');
      if (visibilityButton) {
        if (!ensureAdmin('toggle quote visibility')) return;
        const index = Number(visibilityButton.dataset.index);
        const quote = quotes[index];
        if (!quote?.id) {
          alert('Cannot toggle visibility for quotes not yet saved.');
          return;
        }
        
        (async () => {
          try {
            const newVisibility = await toggleQuoteVisibility(quote.id, quote.visible !== false);
            quote.visible = newVisibility;
            renderQuoteList();
            startQuoteCarousel(); // Restart carousel with updated visibility
          } catch (error) {
            console.warn('Unable to toggle quote visibility.', error);
            alert('Unable to toggle visibility. Please try again.');
          }
        })();
        return;
      }
      
      // Handle inline edit button
      const editButton = event.target.closest('.quote-edit-button');
      if (editButton) {
        if (!ensureAdmin('edit quote')) return;
        const index = Number(editButton.dataset.index);
        const quote = quotes[index];
        if (!quote) return;
        editingQuoteIndex = index;
        editingQuoteId = quote.id || null;
        renderQuoteList(index);
        return;
      }
      
      // Handle inline save button
      const saveButton = event.target.closest('.quote-inline-save');
      if (saveButton) {
        if (!ensureAdmin('save quote')) return;
        const index = Number(saveButton.dataset.index);
        const listItem = saveButton.closest('.quote-list-item');
        const textArea = listItem.querySelector('.quote-inline-text');
        const authorInput = listItem.querySelector('.quote-inline-author');
        const text = textArea?.value.trim();
        const author = authorInput?.value.trim();
        
        if (!text) {
          alert('Please add quote text before saving.');
          return;
        }
        
        if (!confirm('Are you sure you want to save this quote?')) {
          return;
        }
        
        const quote = quotes[index];
        (async () => {
          try {
            const savedId = await saveQuote({ id: quote?.id, text, author });
            editingQuoteId = null;
            editingQuoteIndex = null;
            await reloadQuotes();
            // Find the saved quote's new index
            const savedIndex = quotes.findIndex(q => q.id === savedId);
            if (savedIndex !== -1) {
              idx = savedIndex;
              showQuote(idx);
            }
          } catch (error) {
            console.warn('Unable to save quote.', error);
            alert('Unable to save quote. Please try again.');
          }
        })();
        return;
      }
      
      // Handle inline cancel button
      const cancelButton = event.target.closest('.quote-inline-cancel');
      if (cancelButton) {
        const index = Number(cancelButton.dataset.index);
        const quote = quotes[index];
        
        // If canceling a new quote (no ID), remove it from the array
        if (!quote?.id) {
          quotes.splice(index, 1);
        }
        
        editingQuoteId = null;
        editingQuoteIndex = null;
        renderQuoteList();
        return;
      }
      
      // Handle inline delete button
      const deleteButton = event.target.closest('.quote-inline-delete');
      if (deleteButton) {
        if (!ensureAdmin('delete quote')) return;
        if (!confirm('Are you sure you want to delete this quote?')) return;
        const index = Number(deleteButton.dataset.index);
        const quote = quotes[index];
        if (!quote?.id) return;
        
        (async () => {
          try {
            await deleteQuote(quote.id);
            editingQuoteId = null;
            editingQuoteIndex = null;
            await reloadQuotes();
            if (idx >= quotes.length) {
              idx = Math.max(0, quotes.length - 1);
            }
            if (quotes.length > 0) {
              showQuote(idx);
            }
          } catch (error) {
            console.warn('Unable to delete quote.', error);
            alert('Unable to delete quote. Please try again.');
          }
        })();
        return;
      }
    });
  }

  if (quoteAddButton) {
    quoteAddButton.addEventListener('click', () => {
      if (!ensureAdmin('add quote')) return;
      // Add a temporary quote to the array for inline editing
      quotes.unshift({ text: '', author: '' });
      editingQuoteIndex = 0;
      editingQuoteId = null;
      renderQuoteList(0);
      // Scroll to top of list and focus on text field
      setTimeout(() => {
        quoteListItems?.scrollTo({ top: 0, behavior: 'smooth' });
        const textArea = quoteListItems?.querySelector('.quote-inline-text');
        textArea?.focus();
      }, 0);
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
      // Validate input lengths
      const validatedText = validateLength(text, 1000);
      const validatedAuthor = validateLength(author, 200);
      
      const updated = { text: validatedText, author: validatedAuthor };
      if (editingQuoteIndex === null || Number.isNaN(editingQuoteIndex)) {
        quotes.push(updated);
        editingQuoteIndex = quotes.length - 1;
      } else {
        quotes[editingQuoteIndex] = updated;
      }
      try {
        const quoteId = editingQuoteId;
        const savedId = await saveQuote({ id: quoteId, text, author });
        
        if (editingQuoteIndex !== null && editingQuoteIndex < quotes.length) {
          quotes[editingQuoteIndex] = { id: savedId, text, author };
        } else {
          quotes.push({ id: savedId, text, author });
          editingQuoteIndex = quotes.length - 1;
        }
        
        await reloadQuotes();
        idx = editingQuoteIndex;
        showQuote(idx);
        
        if (quoteEditorPane) {
          quoteEditorPane.classList.remove('is-active');
        }
        editingQuoteId = null;
        editingQuoteIndex = null;
      } catch (error) {
        console.warn('Unable to save quote.', error);
        alert('Unable to save quote. Please try again.');
      }
    });
  }

  // Setup edit quotes button
  const editQuotesBtn = $('#editQuotesBtn');
  const quoteEditor = $('#quoteEditor');
  if (editQuotesBtn && quoteEditor) {
    editQuotesBtn.addEventListener('click', () => {
      // Check if user is admin before allowing edit
      if (!ensureAdmin('edit quotes')) return;
      
      // Toggle the editor visibility
      const isCollapsed = quoteEditor.classList.contains('is-collapsed');
      if (isCollapsed) {
        quoteEditor.classList.remove('is-collapsed');
        editQuotesBtn.textContent = 'Close';
      } else {
        quoteEditor.classList.add('is-collapsed');
        editQuotesBtn.textContent = 'Edit';
        // Clear editing state when closing
        editingQuoteId = null;
        editingQuoteIndex = null;
        renderQuoteList();
      }
    });
  }

  initQuoteData();
}
