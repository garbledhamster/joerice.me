/**
 * @file pages/gallery.js
 * @description Gallery page module
 *
 * Displays image gallery with slideshow and admin editor
 */

import { $, addListener } from '../core/dom.js';
import { isAdminUser, ensureAdmin, getFirestore, getStorage, getCurrentUserId } from '../services/auth.js';
import { sanitizeText, sanitizeUrl, validateLength } from '../services/sanitize.js';

// State
let images = [];
let currentSlideIndex = 0;
let isEditorMode = false;
let selectedImageDoc = null;
let selectedImageIndex = -1;

// DOM references
let slideImage = null;
let slideCaption = null;
let slideLink = null;
let slideshow = null;
let galleryEditorContainer = null;
let cleanupFns = [];

// Fallback slides
const fallbackSlides = [
  { img: 'https://picsum.photos/seed/family/1200/800', link: 'https://picsum.photos/seed/family/1200/1200', caption: 'Family: The people who keep me grounded.' },
  { img: 'https://picsum.photos/seed/coding/1200/800', link: 'https://picsum.photos/seed/coding/1200/1200', caption: 'Coding: Building the future one script at a time.' },
  { img: 'https://picsum.photos/seed/stoic/1200/800', link: 'https://picsum.photos/seed/stoic/1200/1200', caption: 'Stoic: Focus on what you can control.' },
];

/**
 * Get gallery page HTML template
 * @returns {string} Gallery page HTML
 */
export function getGalleryTemplate() {
  return `
    <section class="gallery" id="gallerySection">
      <div class="sectionHeader">
        <h2>Gallery</h2>
        <button class="editBtn" id="editGalleryBtn" type="button" data-admin-only>Edit</button>
      </div>
      <div class="slideshow" id="slideshow">
        <figure>
          <a id="slideLink" href="#" target="_blank">
            <img id="slideImage" src="" alt=""/>
            <figcaption id="slideCaption"></figcaption>
          </a>
        </figure>
        <button class="prev" id="prevSlide" aria-label="Previous">&#10094;</button>
        <button class="next" id="nextSlide" aria-label="Next">&#10095;</button>
      </div>
      <div class="galleryEditorContainer" id="galleryEditorContainer" data-admin-only data-skip-admin-ui hidden>
        <div class="galleryEditorPicker" id="galleryEditorPicker">
          <div class="galleryEditorUpload">
            <input type="file" id="galleryEditorFileInput" accept="image/*" aria-label="Select image"/>
            <button class="galleryEditorUploadButton" id="galleryEditorUploadButton" type="button">Upload</button>
          </div>
          <p class="galleryEditorStatus" id="galleryEditorStatus" role="status" aria-live="polite"></p>
          <div class="galleryEditorGrid" id="galleryEditorGrid"></div>
        </div>
        <div class="galleryEditorEdit" id="galleryEditorEdit" hidden>
          <div class="galleryEditorNav">
            <button class="galleryEditorNavBtn" id="galleryEditorPrevBtn" type="button">‹ Prev</button>
            <span class="galleryEditorNavInfo" id="galleryEditorNavInfo"></span>
            <button class="galleryEditorNavBtn" id="galleryEditorNextBtn" type="button">Next ›</button>
          </div>
          <div class="galleryEditorPreviewWrap">
            <img id="galleryEditorPreview" src="" alt="Preview"/>
          </div>
          <label class="galleryEditorLabel">
            Caption
            <textarea id="galleryEditorCaptionInput" rows="3" placeholder="Enter caption"></textarea>
          </label>
          <div class="galleryEditorActions">
            <button class="galleryEditorBackButton" id="galleryEditorBackButton" type="button">← Back</button>
            <button class="galleryEditorSaveButton" id="galleryEditorSaveButton" type="button">Save</button>
            <button class="galleryEditorDeleteButton" id="galleryEditorDeleteButton" type="button">Delete</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Load images from Firestore
 * @returns {Object[]} Array of image objects
 */
async function loadImagesFromFirestore() {
  const firestore = getFirestore();
  if (!firestore) return fallbackSlides;

  try {
    const imagesCollection = firestore.collection('Images');
    const snapshot = await imagesCollection.orderBy('createdAt', 'desc').get();

    if (snapshot.empty) return fallbackSlides;

    const storage = getStorage();
    const loadedImages = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let downloadURL = data.downloadURL;

      if (!downloadURL && data.storagePath && storage) {
        try {
          const storageRef = storage.ref(data.storagePath);
          downloadURL = await storageRef.getDownloadURL();
        } catch (error) {
          console.warn(`Failed to get URL for ${data.storagePath}`);
          continue;
        }
      }

      if (downloadURL) {
        loadedImages.push({
          id: doc.id,
          img: downloadURL,
          link: downloadURL,
          caption: data.quote || '',
          storagePath: data.storagePath,
          visible: data.visible !== false,
        });
      }
    }

    return loadedImages.length > 0 ? loadedImages : fallbackSlides;
  } catch (error) {
    console.warn('Error loading images:', error);
    return fallbackSlides;
  }
}

/**
 * Get visible images (admin sees all)
 * @returns {Object[]} Filtered image array
 */
function getVisibleImages() {
  return isAdminUser() ? images : images.filter(img => img.visible !== false);
}

/**
 * Show a slide by index
 * @param {number} index - Slide index
 */
function showSlide(index) {
  if (!images.length || !slideImage || !slideCaption || !slideLink) return;

  currentSlideIndex = (index + images.length) % images.length;
  const slide = images[currentSlideIndex];

  const safeImgUrl = sanitizeUrl(slide.img);
  const safeLinkUrl = sanitizeUrl(slide.link || slide.img);

  slideImage.src = safeImgUrl || '#';
  slideImage.alt = sanitizeText(slide.caption || '');
  slideLink.href = safeLinkUrl || '#';
  slideCaption.textContent = sanitizeText(slide.caption || '');
}

/**
 * Navigate slideshow
 * @param {string} direction - 'next' or 'prev'
 */
function navigateSlideshow(direction) {
  const visibleImages = getVisibleImages();
  if (!visibleImages.length) return;

  const currentVisibleIndex = visibleImages.findIndex(img => img.id === images[currentSlideIndex]?.id);
  let newVisibleIndex;

  if (direction === 'next') {
    newVisibleIndex = (currentVisibleIndex + 1) % visibleImages.length;
  } else {
    newVisibleIndex = (currentVisibleIndex - 1 + visibleImages.length) % visibleImages.length;
  }

  const newImage = visibleImages[newVisibleIndex];
  const newIndex = images.findIndex(img => img.id === newImage.id);

  if (newIndex !== -1) {
    showSlide(newIndex);
  }
}

/**
 * Show editor picker view
 */
function showEditorPicker() {
  isEditorMode = true;
  if (slideshow) slideshow.hidden = true;
  if (galleryEditorContainer) galleryEditorContainer.hidden = false;

  const picker = $('#galleryEditorPicker');
  const edit = $('#galleryEditorEdit');
  if (picker) picker.hidden = false;
  if (edit) edit.hidden = true;

  renderGalleryGrid();
}

/**
 * Hide editor
 */
function hideEditor() {
  isEditorMode = false;
  if (slideshow) slideshow.hidden = false;
  if (galleryEditorContainer) galleryEditorContainer.hidden = true;

  const editBtn = $('#editGalleryBtn');
  if (editBtn) editBtn.textContent = 'Edit';
}

/**
 * Render gallery grid in editor
 */
function renderGalleryGrid() {
  const grid = $('#galleryEditorGrid');
  if (!grid) return;

  grid.innerHTML = images.map((img, index) => {
    const safeImgUrl = sanitizeUrl(img.img);
    const safeCaption = sanitizeText(img.caption || '');
    const shortCaption = img.caption?.slice(0, 50) || 'No caption';
    const isVisible = img.visible !== false;
    const visibilityClass = !isVisible ? 'gallery-image-hidden' : '';

    return `
      <div class="galleryEditorGridItem ${visibilityClass}" data-doc-id="${sanitizeText(img.id)}" data-index="${index}">
        <img src="${safeImgUrl || '#'}" alt="${safeCaption}" loading="lazy"/>
        <div class="galleryEditorGridItemCaption">${sanitizeText(shortCaption)}</div>
        <button class="gallery-visibility-button" type="button" data-doc-id="${sanitizeText(img.id)}" title="${isVisible ? 'Hide' : 'Show'}">
          <i class="fas fa-eye${isVisible ? '' : '-slash'}"></i>
        </button>
      </div>
    `;
  }).join('');
}

/**
 * Render gallery page
 */
export function renderGallery() {
  const mainContent = $('#mainContent');
  if (!mainContent) return;

  mainContent.innerHTML = getGalleryTemplate();
  initGallery();
}

/**
 * Initialize gallery page
 */
export async function initGallery() {
  slideImage = $('#slideImage');
  slideCaption = $('#slideCaption');
  slideLink = $('#slideLink');
  slideshow = $('#slideshow');
  galleryEditorContainer = $('#galleryEditorContainer');

  if (!slideImage || !slideCaption || !slideLink) return;

  // Load images
  images = await loadImagesFromFirestore();

  // Show first visible image
  const visibleImages = getVisibleImages();
  if (visibleImages.length > 0) {
    const firstIndex = images.findIndex(img => img.id === visibleImages[0].id);
    showSlide(firstIndex !== -1 ? firstIndex : 0);
  }

  // Slideshow navigation
  const prevSlideBtn = $('#prevSlide');
  const nextSlideBtn = $('#nextSlide');

  if (prevSlideBtn) {
    cleanupFns.push(addListener(prevSlideBtn, 'click', () => navigateSlideshow('prev')));
  }
  if (nextSlideBtn) {
    cleanupFns.push(addListener(nextSlideBtn, 'click', () => navigateSlideshow('next')));
  }

  // Edit button
  const editGalleryBtn = $('#editGalleryBtn');
  if (editGalleryBtn) {
    cleanupFns.push(addListener(editGalleryBtn, 'click', () => {
      if (!ensureAdmin('edit gallery')) return;
      if (isEditorMode) {
        hideEditor();
      } else {
        showEditorPicker();
        editGalleryBtn.textContent = 'Close';
      }
    }));
  }

  // Back button
  const backButton = $('#galleryEditorBackButton');
  if (backButton) {
    cleanupFns.push(addListener(backButton, 'click', () => {
      const edit = $('#galleryEditorEdit');
      const picker = $('#galleryEditorPicker');
      if (edit && !edit.hidden) {
        if (picker) picker.hidden = false;
        edit.hidden = true;
      } else {
        hideEditor();
      }
    }));
  }
}

/**
 * Clean up gallery page
 */
export function destroyGallery() {
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];
  images = [];
  currentSlideIndex = 0;
  isEditorMode = false;
}
