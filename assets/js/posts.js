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

// Source type definitions with emoji and fields
const SOURCE_TYPES = {
  unknown: {
    emoji: '❓',
    label: 'Unknown',
    fields: [
      { key: 'title', label: 'Title', type: 'text', placeholder: 'Source title or description' }
    ]
  },
  web: {
    emoji: '🌐',
    label: 'Web Link',
    fields: [
      { key: 'title', label: 'Title', type: 'text', placeholder: 'Page title' },
      { key: 'url', label: 'URL', type: 'text', placeholder: 'https://example.com' },
      { key: 'author', label: 'Author', type: 'text', placeholder: 'Author name (optional)' },
      { key: 'accessedDate', label: 'Accessed', type: 'text', placeholder: 'Date accessed (optional)' }
    ]
  },
  book: {
    emoji: '📚',
    label: 'Book',
    fields: [
      { key: 'title', label: 'Title', type: 'text', placeholder: 'Book title' },
      { key: 'author', label: 'Author', type: 'text', placeholder: 'Author name' },
      { key: 'publisher', label: 'Publisher', type: 'text', placeholder: 'Publisher (optional)' },
      { key: 'year', label: 'Year', type: 'text', placeholder: 'Publication year' },
      { key: 'pages', label: 'Pages', type: 'text', placeholder: 'Page numbers (optional)' }
    ]
  },
  essay: {
    emoji: '📝',
    label: 'Essay',
    fields: [
      { key: 'title', label: 'Title', type: 'text', placeholder: 'Essay title' },
      { key: 'author', label: 'Author', type: 'text', placeholder: 'Author name' },
      { key: 'publication', label: 'Publication', type: 'text', placeholder: 'Where published (optional)' },
      { key: 'year', label: 'Year', type: 'text', placeholder: 'Year (optional)' }
    ]
  },
  person: {
    emoji: '👤',
    label: 'Person',
    fields: [
      { key: 'name', label: 'Name', type: 'text', placeholder: 'Person\'s name' },
      { key: 'role', label: 'Role/Title', type: 'text', placeholder: 'Role or title (optional)' },
      { key: 'context', label: 'Context', type: 'text', placeholder: 'How they contributed (optional)' }
    ]
  },
  video: {
    emoji: '🎬',
    label: 'Video',
    fields: [
      { key: 'title', label: 'Title', type: 'text', placeholder: 'Video title' },
      { key: 'url', label: 'URL', type: 'text', placeholder: 'https://youtube.com/...' },
      { key: 'creator', label: 'Creator', type: 'text', placeholder: 'Channel or creator name' },
      { key: 'year', label: 'Year', type: 'text', placeholder: 'Year (optional)' }
    ]
  },
  podcast: {
    emoji: '🎙️',
    label: 'Podcast',
    fields: [
      { key: 'title', label: 'Episode Title', type: 'text', placeholder: 'Episode title' },
      { key: 'show', label: 'Show Name', type: 'text', placeholder: 'Podcast name' },
      { key: 'url', label: 'URL', type: 'text', placeholder: 'Episode link (optional)' },
      { key: 'date', label: 'Date', type: 'text', placeholder: 'Episode date (optional)' }
    ]
  }
};

const UNTITLED_SOURCE = 'Untitled';

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
let portfolioSourcesList = null;
let portfolioAddSourceBtn = null;
let currentSources = [];
let editingSourceIndex = null;

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
  const safeTags = (post.tags || []).map(t => sanitizeText(t)).join('|');
  const safeUrl = sanitizeText(post.url);
  const sourceAttr = post.source ? ` data-source="${sanitizeText(post.source)}"` : '';
  const idAttr = post.id ? ` data-id="${sanitizeText(post.id)}"` : '';
  const publishedAttr = post.published !== undefined ? ` data-published="${post.published}"` : '';
  // Add visual indicator for unpublished posts (only visible to admins)
  const unpublishedIndicator = (post.published === false && isAdminUser()) ? ' [DRAFT]' : '';
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
  const filtered = array.filter(item => item.source !== source);
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
  if (portfolioAddSourceBtn) {
    portfolioAddSourceBtn.disabled = isReadOnly;
  }
  if (isReadOnly) {
    setEditorStatus('Preloaded posts are read-only.');
  } else {
    setEditorStatus('');
  }
}

// Get source type info, defaulting to unknown
function getSourceType(typeKey) {
  return SOURCE_TYPES[typeKey] || SOURCE_TYPES.unknown;
}

// Get display title for a source
function getSourceDisplayTitle(source) {
  if (!source) return UNTITLED_SOURCE;
  // Try different title-like fields based on type
  return source.title || source.name || source.show || UNTITLED_SOURCE;
}

// Render source pills in the list
function renderSourcePills() {
  if (!portfolioSourcesList) return;
  
  if (currentSources.length === 0) {
    portfolioSourcesList.innerHTML = '<span class="portfolioSourcesEmpty">No sources added yet</span>';
    return;
  }
  
  portfolioSourcesList.innerHTML = currentSources.map((source, index) => {
    const typeInfo = getSourceType(source.type);
    const displayTitle = sanitizeText(getSourceDisplayTitle(source));
    const isEditing = editingSourceIndex === index;
    
    if (isEditing) {
      return renderSourcePillEditor(source, index);
    }
    
    return `
      <div class="sourcePill" data-index="${index}" tabindex="0" role="button" aria-label="Edit source: ${displayTitle}">
        <span class="sourcePillEmoji">${typeInfo.emoji}</span>
        <span class="sourcePillTitle">${displayTitle}</span>
      </div>
    `;
  }).join('');
}

// Render the inline editor for a source pill
function renderSourcePillEditor(source, index) {
  const typeInfo = getSourceType(source.type);
  const typeOptions = Object.entries(SOURCE_TYPES).map(([key, info]) => {
    const selected = key === (source.type || 'unknown') ? 'selected' : '';
    return `<option value="${key}" ${selected}>${info.emoji} ${info.label}</option>`;
  }).join('');
  
  const fieldInputs = typeInfo.fields.map(field => {
    const value = sanitizeText(source[field.key] || '');
    return `
      <div class="sourcePillEditorField">
        <label class="sourcePillEditorLabel">${field.label}</label>
        <input class="sourcePillEditorInput" type="${field.type}" 
               data-field="${field.key}" 
               placeholder="${field.placeholder}"
               value="${value}"/>
      </div>
    `;
  }).join('');
  
  return `
    <div class="sourcePill editing" data-index="${index}">
      <div class="sourcePillEditor">
        <div class="sourcePillEditorRow type-row">
          <span class="sourcePillTypeEmoji">${typeInfo.emoji}</span>
          <div class="sourcePillEditorField">
            <label class="sourcePillEditorLabel">Type</label>
            <select class="sourcePillEditorSelect" data-field="type">
              ${typeOptions}
            </select>
          </div>
        </div>
        <div class="sourcePillTypeFields">
          ${fieldInputs}
        </div>
        <div class="sourcePillEditorActions">
          <button class="sourcePillDeleteBtn" type="button" data-index="${index}">Delete</button>
          <button class="sourcePillCancelBtn" type="button" data-index="${index}">Cancel</button>
          <button class="sourcePillSaveBtn" type="button" data-index="${index}">Done</button>
        </div>
      </div>
    </div>
  `;
}

// Handle source type change - re-render with new fields
function handleSourceTypeChange(index, newType) {
  if (index < 0 || index >= currentSources.length) return;
  
  const source = currentSources[index];
  // Preserve common fields when switching types to avoid data loss.
  // These are the most commonly shared fields across source types:
  // - title: used by Web, Book, Essay, Video, Podcast
  // - author: used by Web, Book, Essay
  // - url: used by Web, Video, Podcast
  // - name: used by Person
  const preservedData = {
    title: source.title,
    author: source.author,
    url: source.url,
    name: source.name
  };
  
  // Reset source with new type, keeping preserved fields
  currentSources[index] = {
    type: newType,
    ...preservedData
  };
  
  renderSourcePills();
  
  // Focus on first input after re-render
  setTimeout(() => {
    const firstInput = portfolioSourcesList?.querySelector('.sourcePill.editing .sourcePillEditorInput');
    firstInput?.focus();
  }, 0);
}

// Save data from the currently editing source pill
function saveEditingSourceData() {
  if (editingSourceIndex === null || editingSourceIndex < 0 || editingSourceIndex >= currentSources.length) return;
  
  const pillEl = portfolioSourcesList?.querySelector(`.sourcePill.editing[data-index="${editingSourceIndex}"]`);
  if (!pillEl) return;
  
  const source = currentSources[editingSourceIndex];
  const inputs = pillEl.querySelectorAll('.sourcePillEditorInput');
  
  inputs.forEach(input => {
    const fieldKey = input.dataset.field;
    if (fieldKey) {
      source[fieldKey] = input.value.trim();
    }
  });
}

// Close the currently editing source pill
function closeEditingSource() {
  if (editingSourceIndex !== null) {
    saveEditingSourceData();
  }
  editingSourceIndex = null;
  renderSourcePills();
}

// Open a source pill for editing
function openSourceForEditing(index) {
  // If already editing another pill, save it first
  if (editingSourceIndex !== null && editingSourceIndex !== index) {
    saveEditingSourceData();
  }
  
  editingSourceIndex = index;
  renderSourcePills();
  
  // Focus on type dropdown after render
  setTimeout(() => {
    const typeSelect = portfolioSourcesList?.querySelector('.sourcePill.editing .sourcePillEditorSelect');
    typeSelect?.focus();
  }, 0);
}

// Add a new source
function addNewSource() {
  // Close any currently editing source
  if (editingSourceIndex !== null) {
    saveEditingSourceData();
  }
  
  // Add new source with unknown type
  currentSources.push({
    type: 'unknown',
    title: ''
  });
  
  // Open the new source for editing
  editingSourceIndex = currentSources.length - 1;
  renderSourcePills();
  
  // Focus on first input
  setTimeout(() => {
    const firstInput = portfolioSourcesList?.querySelector('.sourcePill.editing .sourcePillEditorInput');
    firstInput?.focus();
  }, 0);
}

// Delete a source
function deleteSource(index) {
  if (index < 0 || index >= currentSources.length) return;
  
  currentSources.splice(index, 1);
  
  // Adjust editing index if needed
  if (editingSourceIndex === index) {
    editingSourceIndex = null;
  } else if (editingSourceIndex !== null && editingSourceIndex > index) {
    editingSourceIndex--;
  }
  
  renderSourcePills();
}

// Setup event listeners for source pills container
function setupSourcePillsEventListeners() {
  if (!portfolioSourcesList) return;
  
  portfolioSourcesList.addEventListener('click', (event) => {
    const target = event.target;
    
    // Handle clicking on a pill to edit
    const pill = target.closest('.sourcePill:not(.editing)');
    if (pill) {
      const index = Number(pill.dataset.index);
      if (!Number.isNaN(index)) {
        openSourceForEditing(index);
      }
      return;
    }
    
    // Handle type dropdown change
    const typeSelect = target.closest('.sourcePillEditorSelect');
    if (typeSelect) {
      return; // Let the change event handle this
    }
    
    // Handle save button
    const saveBtn = target.closest('.sourcePillSaveBtn');
    if (saveBtn) {
      const index = Number(saveBtn.dataset.index);
      if (!Number.isNaN(index)) {
        saveEditingSourceData();
        editingSourceIndex = null;
        renderSourcePills();
      }
      return;
    }
    
    // Handle cancel button
    const cancelBtn = target.closest('.sourcePillCancelBtn');
    if (cancelBtn) {
      const index = Number(cancelBtn.dataset.index);
      if (!Number.isNaN(index)) {
        // If it's a new empty source, remove it
        const source = currentSources[index];
        const displayTitle = getSourceDisplayTitle(source);
        if (!displayTitle || displayTitle === UNTITLED_SOURCE) {
          deleteSource(index);
        } else {
          editingSourceIndex = null;
          renderSourcePills();
        }
      }
      return;
    }
    
    // Handle delete button
    const deleteBtn = target.closest('.sourcePillDeleteBtn');
    if (deleteBtn) {
      const index = Number(deleteBtn.dataset.index);
      if (!Number.isNaN(index)) {
        deleteSource(index);
      }
      return;
    }
  });
  
  // Handle type select change
  portfolioSourcesList.addEventListener('change', (event) => {
    const typeSelect = event.target.closest('.sourcePillEditorSelect');
    if (typeSelect) {
      const pill = typeSelect.closest('.sourcePill');
      if (pill) {
        const index = Number(pill.dataset.index);
        const newType = typeSelect.value;
        if (!Number.isNaN(index)) {
          // Save current values before changing type
          saveEditingSourceData();
          handleSourceTypeChange(index, newType);
        }
      }
    }
  });
  
  // Handle keyboard navigation for pills
  portfolioSourcesList.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      const pill = event.target.closest('.sourcePill:not(.editing)');
      if (pill) {
        event.preventDefault();
        const index = Number(pill.dataset.index);
        if (!Number.isNaN(index)) {
          openSourceForEditing(index);
        }
      }
    }
    
    // Escape to cancel editing
    if (event.key === 'Escape' && editingSourceIndex !== null) {
      editingSourceIndex = null;
      renderSourcePills();
    }
  });
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
    
    snapshot.forEach(doc => {
      const data = doc.data() || {};
      const isPublished = isPostPublished(data);
      const isPinned = data['pinned'] === true;
      
      entries.push({
        title: data['Title'] || data['title'] || 'Untitled',
        date: data['Created Date'] || data['createdDate'] || new Date().toISOString(),
        lastEdited: data['Last Edited Date'] || data['lastEditedDate'] || data['Created Date'] || data['createdDate'] || null,
        url: `firestore:${doc.id}`,
        pinned: isPinned,
        tags: [],
        id: doc.id,
        source: 'firestore',
        published: isPublished
      });
    });
    
    // Clean up existing Firestore and local entries before adding new ones
    removeNotesBySource('firestore');
    removePinnedBySource('firestore');
    removeNotesBySource('local');
    
    // Separate entries into pinned and notes arrays
    const pinnedEntries = entries.filter(entry => entry.pinned);
    const regularEntries = entries.filter(entry => !entry.pinned);
    
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
  if (portfolioPostPinned) {
    // Default to unchecked (not pinned) for new posts, use existing value for edits
    portfolioPostPinned.checked = post?.pinned === true;
  }
  if (portfolioDeleteButton) {
    portfolioDeleteButton.disabled = !editingPostId;
  }
  
  // Initialize sources
  currentSources = Array.isArray(post?.sources) ? [...post.sources] : [];
  editingSourceIndex = null;
  renderSourcePills();
  
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
  currentSources = [];
  editingSourceIndex = null;
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
  pinnedGrid.innerHTML = pinned.map(p => formatPostEntry(p)).join('');
  attachClickHandlers();
  filterEntries();
}

export function renderPage() {
  if (!entryGrid) return;
  const start = page * pageSize;
  const slice = notes.slice(start, start + pageSize);
  entryGrid.innerHTML = slice.map(n => formatPostEntry(n)).join('');
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
      const isPublished = isPostPublished(data);
      const isPinned = data['pinned'] === true;
      const sources = Array.isArray(data['sources']) ? data['sources'] : [];
      currentPost = { 
        url, 
        data, 
        content, 
        firestore: true, 
        id: postId, 
        source: 'firestore',
        createdDate: data['Created Date'] || data['createdDate'],
        published: isPublished,
        pinned: isPinned,
        sources: sources
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
  portfolioSourcesList = $('#portfolioSourcesList');
  portfolioAddSourceBtn = $('#portfolioAddSourceBtn');

  if (!pinnedGrid || !entryGrid) return;
  
  // Setup source pills event listeners
  setupSourcePillsEventListeners();
  
  // Setup add source button
  if (portfolioAddSourceBtn) {
    portfolioAddSourceBtn.addEventListener('click', () => {
      if (isPortfolioEditorReadOnly) return;
      addNewSource();
    });
  }

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
          published: currentPost.published !== false, // Default to true if not set
          pinned: currentPost.pinned === true, // Default to false if not set
          sources: currentPost.sources || []
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
      
      // Save any editing source data before saving
      if (editingSourceIndex !== null) {
        saveEditingSourceData();
        editingSourceIndex = null;
      }
      
      // Filter out empty sources
      const sourcesToSave = currentSources.filter(source => {
        const displayTitle = getSourceDisplayTitle(source);
        return displayTitle && displayTitle !== UNTITLED_SOURCE;
      });
      
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
            'published': published,
            'pinned': pinned,
            'sources': sourcesToSave
          }, { merge: true });
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
