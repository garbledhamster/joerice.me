import { ensureAdmin, getFirestore, getStorage, getCurrentUserId } from './auth.js';
import { $ } from './dom.js';
import { sanitizeText, sanitizeUrl, validateLength } from './sanitize.js';

// DOM elements
let slideImage = null;
let slideCaption = null;
let slideLink = null;
let prevSlideBtn = null;
let nextSlideBtn = null;
let slideshow = null;
let galleryEditorContainer = null;
let galleryEditorPicker = null;
let galleryEditorEdit = null;
let galleryEditorGrid = null;
let galleryEditorFileInput = null;
let galleryEditorUploadButton = null;
let galleryEditorStatus = null;
let galleryEditorPreview = null;
let galleryEditorCaptionInput = null;
let galleryEditorSaveButton = null;
let galleryEditorDeleteButton = null;
let galleryEditorBackButton = null;
let galleryEditorPrevBtn = null;
let galleryEditorNextBtn = null;
let galleryEditorNavInfo = null;

// State
let images = [];
let currentSlideIndex = 0;
let selectedImageDoc = null;
let selectedImageIndex = -1;
let isEditorMode = false;

// Fallback hardcoded slides for when Firebase images aren't available
const fallbackSlides = [
  {img:"https://picsum.photos/seed/family/1200/800", link:"https://picsum.photos/seed/family/1200/1200", caption:"Family: The people who keep me grounded and give purpose to every project, every late night, and every new adventure."},
  {img:"https://picsum.photos/seed/market/1200/800", link:"https://picsum.photos/seed/market/1200/1200", caption:"Marketplace: Where ideas meet reality—sometimes you win, sometimes you learn, but you always grow."},
  {img:"https://picsum.photos/seed/coding/1200/800", link:"https://picsum.photos/seed/coding/1200/1200", caption:"Coding: My workshop for building the future and tinkering with possibility, one script at a time."},
  {img:"https://picsum.photos/seed/stoic/1200/800", link:"https://picsum.photos/seed/stoic/1200/1200", caption:"Stoic: A daily reminder to focus on what I can control and let go of what I can't."},
  {img:"https://picsum.photos/seed/city/1200/800", link:"https://picsum.photos/seed/city/1200/1200", caption:"City: The buzz of opportunity, the challenge of keeping your head while everyone else is losing theirs."},
  {img:"https://picsum.photos/seed/sunrise/1200/800", link:"https://picsum.photos/seed/sunrise/1200/1200", caption:"Sunrise: New beginnings, every day—reset, reflect, and restart stronger than before."}
];

function setEditorStatus(message) {
  if (!galleryEditorStatus) return;
  galleryEditorStatus.textContent = message || '';
}

function showSlide(index) {
  if (!images.length || !slideImage || !slideCaption || !slideLink) return;
  
  currentSlideIndex = (index + images.length) % images.length;
  const slide = images[currentSlideIndex];
  
  const safeImgUrl = sanitizeUrl(slide.img);
  const safeLinkUrl = sanitizeUrl(slide.link || slide.img);
  
  // Use safe defaults if sanitization blocks the URL
  slideImage.src = safeImgUrl || '#';
  slideImage.alt = sanitizeText(slide.caption || '');
  slideLink.href = safeLinkUrl || '#';
  // Note: textContent automatically escapes HTML, but we use sanitizeText for consistency
  slideCaption.textContent = sanitizeText(slide.caption || '');
}

async function loadImagesFromFirestore() {
  const firestore = getFirestore();
  if (!firestore) {
    console.warn('Firestore not available, using fallback slides.');
    return fallbackSlides;
  }

  try {
    const imagesCollection = firestore.collection('Images');
    const snapshot = await imagesCollection.orderBy('createdAt', 'desc').get();
    
    if (snapshot.empty) {
      console.log('No images in Firestore, using fallback slides.');
      return fallbackSlides;
    }

    const storage = getStorage();
    const loadedImages = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let downloadURL = data.downloadURL;

      // If no downloadURL, try to get it from storage
      if (!downloadURL && data.storagePath && storage) {
        try {
          const storageRef = storage.ref(data.storagePath);
          downloadURL = await storageRef.getDownloadURL();
        } catch (error) {
          console.warn(`Failed to get download URL for ${data.storagePath}:`, error);
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
          userId: data.userId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      }
    }

    return loadedImages.length > 0 ? loadedImages : fallbackSlides;
  } catch (error) {
    console.warn('Error loading images from Firestore:', error);
    return fallbackSlides;
  }
}

function initSlideshow() {
  if (!slideImage || !slideCaption || !slideLink) return;

  if (prevSlideBtn) {
    prevSlideBtn.addEventListener('click', () => showSlide(currentSlideIndex - 1));
  }

  if (nextSlideBtn) {
    nextSlideBtn.addEventListener('click', () => showSlide(currentSlideIndex + 1));
  }

  if (images.length > 0) {
    showSlide(0);
  }
}

function clearSelection() {
  selectedImageDoc = null;
  selectedImageIndex = -1;
  if (galleryEditorPreview) galleryEditorPreview.src = '';
  if (galleryEditorCaptionInput) galleryEditorCaptionInput.value = '';
  updateNavButtons();
}

function updateNavButtons() {
  if (!galleryEditorPrevBtn || !galleryEditorNextBtn || !galleryEditorNavInfo) return;
  
  if (selectedImageIndex === -1 || images.length === 0) {
    galleryEditorPrevBtn.disabled = true;
    galleryEditorNextBtn.disabled = true;
    galleryEditorNavInfo.textContent = '';
  } else {
    galleryEditorPrevBtn.disabled = selectedImageIndex === 0;
    galleryEditorNextBtn.disabled = selectedImageIndex === images.length - 1;
    galleryEditorNavInfo.textContent = `${selectedImageIndex + 1} of ${images.length}`;
  }
}

function selectImage(imageDoc, index) {
  selectedImageDoc = imageDoc;
  selectedImageIndex = index;
  
  if (galleryEditorPreview) {
    galleryEditorPreview.src = imageDoc.img;
  }
  
  if (galleryEditorCaptionInput) {
    galleryEditorCaptionInput.value = imageDoc.caption || '';
  }

  updateNavButtons();

  // Show edit view, hide picker
  if (galleryEditorPicker) galleryEditorPicker.hidden = true;
  if (galleryEditorEdit) galleryEditorEdit.hidden = false;

  // Update selected state in grid
  const gridItems = galleryEditorGrid?.querySelectorAll('.galleryEditorGridItem');
  gridItems?.forEach(item => {
    if (item.dataset.docId === imageDoc.id) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

function selectPreviousImage() {
  if (selectedImageIndex > 0) {
    const prevIndex = selectedImageIndex - 1;
    const prevImage = images[prevIndex];
    if (prevImage) {
      selectImage(prevImage, prevIndex);
    }
  }
}

function selectNextImage() {
  if (selectedImageIndex < images.length - 1) {
    const nextIndex = selectedImageIndex + 1;
    const nextImage = images[nextIndex];
    if (nextImage) {
      selectImage(nextImage, nextIndex);
    }
  }
}

function renderGalleryGrid() {
  if (!galleryEditorGrid) return;
  
  galleryGrid.innerHTML = images.map(img => {
    const safeImgUrl = sanitizeUrl(img.img);
    const safeCaption = sanitizeText(img.caption || '');
    const shortCaption = img.caption?.slice(0, 50) || 'No caption';
    const ellipsis = img.caption?.length > 50 ? '…' : '';
    const safeShortCaption = sanitizeText(shortCaption + ellipsis);
    const safeId = sanitizeText(img.id);
    
    return `
    <div class="galleryGridItem" data-doc-id="${safeId}">
      <img src="${safeImgUrl || '#'}" alt="${safeCaption}" loading="lazy"/>
      <div class="galleryGridItemCaption">${safeShortCaption}</div>
    </div>
  `;
  }).join('');

  // Add click handlers to grid items
  const gridItems = galleryEditorGrid.querySelectorAll('.galleryEditorGridItem');
  gridItems.forEach(item => {
    item.addEventListener('click', () => {
      const docId = item.dataset.docId;
      const index = parseInt(item.dataset.index, 10);
      const imageDoc = images.find(img => img.id === docId);
      if (imageDoc) {
        selectImage(imageDoc, index);
      }
    });
  });
}

async function handleUpload() {
  if (!ensureAdmin('upload gallery image')) return;

  const file = galleryEditorFileInput?.files?.[0];
  if (!file) {
    setEditorStatus('Please select an image file first.');
    return;
  }

  const storage = getStorage();
  const firestore = getFirestore();
  const userId = getCurrentUserId();

  if (!storage || !firestore || !userId) {
    setEditorStatus('Firebase not configured or not signed in.');
    return;
  }

  try {
    setEditorStatus('Uploading...');
    
    // Generate unique image ID
    const imageId = crypto?.randomUUID 
      ? crypto.randomUUID() 
      : `img_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const storagePath = `Images/${userId}/${imageId}`;
    
    // Upload to Storage
    const storageRef = storage.ref(storagePath);
    const uploadTask = await storageRef.put(file);
    const downloadURL = await uploadTask.ref.getDownloadURL();
    
    // Get caption from input and validate
    const caption = galleryCaptionInput?.value?.trim() || '';
    const validatedCaption = validateLength(caption, 500);
    
    // Create Firestore document
    const imagesCollection = firestore.collection('Images');
    const docRef = await imagesCollection.add({
      userId: userId,
      quote: validatedCaption,
      storagePath: storagePath,
      downloadURL: downloadURL,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });

    setEditorStatus('Image uploaded successfully!');
    
    // Reload images and update UI
    images = await loadImagesFromFirestore();
    renderGalleryGrid();
    showSlide(0); // Show the newly uploaded image
    
    // Select the newly uploaded image and switch to edit view
    const newImageIndex = images.findIndex(img => img.id === docRef.id);
    const newImage = images[newImageIndex];
    if (newImage && newImageIndex !== -1) {
      selectImage(newImage, newImageIndex);
    }
    
    // Clear file input
    if (galleryEditorFileInput) galleryEditorFileInput.value = '';
    
  } catch (error) {
    console.error('Error uploading image:', error);
    setEditorStatus(`Upload failed: ${error.message || 'Unknown error'}`);
  }
}

async function handleSave() {
  if (!ensureAdmin('save gallery image')) return;
  if (!selectedImageDoc) {
    setEditorStatus('No image selected.');
    return;
  }

  const firestore = getFirestore();
  if (!firestore) {
    setEditorStatus('Firestore not configured.');
    return;
  }

  try {
    setEditorStatus('Saving...');
    
    const caption = galleryCaptionInput?.value?.trim() || '';
    const validatedCaption = validateLength(caption, 500);
    const docRef = firestore.collection('Images').doc(selectedImageDoc.id);
    
    await docRef.update({
      quote: validatedCaption,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });

    setEditorStatus('Caption saved!');
    
    // Update local state with validated caption
    selectedImageDoc.caption = validatedCaption;
    const imageIndex = images.findIndex(img => img.id === selectedImageDoc.id);
    if (imageIndex !== -1) {
      images[imageIndex].caption = validatedCaption;
      
      // Update slideshow if this is the current slide
      if (currentSlideIndex === imageIndex) {
        showSlide(currentSlideIndex);
      }
    }
    
    // Re-render grid to show updated caption
    renderGalleryGrid();
    
  } catch (error) {
    console.error('Error saving caption:', error);
    setEditorStatus(`Save failed: ${error.message || 'Unknown error'}`);
  }
}

async function handleDelete() {
  if (!ensureAdmin('delete gallery image')) return;
  if (!selectedImageDoc) {
    setEditorStatus('No image selected.');
    return;
  }

  if (!confirm('Are you sure you want to delete this image? This cannot be undone.')) {
    return;
  }

  const firestore = getFirestore();
  const storage = getStorage();

  if (!firestore || !storage) {
    setEditorStatus('Firebase not configured.');
    return;
  }

  try {
    setEditorStatus('Deleting...');
    
    // Delete from Storage
    if (selectedImageDoc.storagePath) {
      try {
        const storageRef = storage.ref(selectedImageDoc.storagePath);
        await storageRef.delete();
      } catch (error) {
        console.warn('Error deleting from storage:', error);
        // Continue with Firestore deletion even if storage delete fails
      }
    }
    
    // Delete from Firestore
    const docRef = firestore.collection('Images').doc(selectedImageDoc.id);
    await docRef.delete();

    setEditorStatus('Image deleted!');
    
    // Remove from local state
    images = images.filter(img => img.id !== selectedImageDoc.id);
    
    // Clear selection
    clearSelection();
    
    // Update UI
    renderGalleryGrid();
    
    // Update slideshow
    if (images.length > 0) {
      currentSlideIndex = Math.min(currentSlideIndex, images.length - 1);
      showSlide(currentSlideIndex);
    }
    
  } catch (error) {
    console.error('Error deleting image:', error);
    setEditorStatus(`Delete failed: ${error.message || 'Unknown error'}`);
  }
}

function showEditorPicker() {
  if (!galleryEditorContainer || !slideshow) return;
  
  isEditorMode = true;
  
  // Hide slideshow, show editor container
  slideshow.hidden = true;
  galleryEditorContainer.hidden = false;
  
  // Show picker, hide edit view
  if (galleryEditorPicker) galleryEditorPicker.hidden = false;
  if (galleryEditorEdit) galleryEditorEdit.hidden = true;
  
  // Render the grid
  renderGalleryGrid();
  
  // Clear any previous status and selection
  setEditorStatus('');
  clearSelection();
}

function showEditorEdit() {
  if (!galleryEditorPicker || !galleryEditorEdit) return;
  
  // Hide picker, show edit view
  galleryEditorPicker.hidden = true;
  galleryEditorEdit.hidden = false;
}

function hideEditor() {
  if (!galleryEditorContainer || !slideshow) return;
  
  isEditorMode = false;
  
  // Show slideshow, hide editor
  slideshow.hidden = false;
  galleryEditorContainer.hidden = true;
  
  // Clear selection and status
  clearSelection();
  setEditorStatus('');
}

export async function initGallery() {
  // Get DOM elements
  slideImage = $('#slideImage');
  slideCaption = $('#slideCaption');
  slideLink = $('#slideLink');
  prevSlideBtn = $('#prevSlide');
  nextSlideBtn = $('#nextSlide');
  slideshow = $('#slideshow');
  galleryEditorContainer = $('#galleryEditorContainer');
  galleryEditorPicker = $('#galleryEditorPicker');
  galleryEditorEdit = $('#galleryEditorEdit');
  galleryEditorGrid = $('#galleryEditorGrid');
  galleryEditorFileInput = $('#galleryEditorFileInput');
  galleryEditorUploadButton = $('#galleryEditorUploadButton');
  galleryEditorStatus = $('#galleryEditorStatus');
  galleryEditorPreview = $('#galleryEditorPreview');
  galleryEditorCaptionInput = $('#galleryEditorCaptionInput');
  galleryEditorSaveButton = $('#galleryEditorSaveButton');
  galleryEditorDeleteButton = $('#galleryEditorDeleteButton');
  galleryEditorBackButton = $('#galleryEditorBackButton');
  galleryEditorPrevBtn = $('#galleryEditorPrevBtn');
  galleryEditorNextBtn = $('#galleryEditorNextBtn');
  galleryEditorNavInfo = $('#galleryEditorNavInfo');

  if (!slideImage || !slideCaption || !slideLink) {
    console.warn('Gallery elements not found.');
    return;
  }

  // Load images
  images = await loadImagesFromFirestore();
  
  // Initialize slideshow
  initSlideshow();

  // Initialize editor controls
  if (galleryEditorUploadButton) {
    galleryEditorUploadButton.addEventListener('click', handleUpload);
  }

  if (galleryEditorSaveButton) {
    galleryEditorSaveButton.addEventListener('click', handleSave);
  }

  if (galleryEditorDeleteButton) {
    galleryEditorDeleteButton.addEventListener('click', handleDelete);
  }

  if (galleryEditorPrevBtn) {
    galleryEditorPrevBtn.addEventListener('click', selectPreviousImage);
  }

  if (galleryEditorNextBtn) {
    galleryEditorNextBtn.addEventListener('click', selectNextImage);
  }

  if (galleryEditorBackButton) {
    galleryEditorBackButton.addEventListener('click', () => {
      // If in edit view, go back to picker
      if (galleryEditorEdit && !galleryEditorEdit.hidden) {
        if (galleryEditorPicker) galleryEditorPicker.hidden = false;
        galleryEditorEdit.hidden = true;
        clearSelection();
        setEditorStatus('');
      } else {
        // If in picker view, close editor and show slideshow
        hideEditor();
      }
    });
  }

  // Setup edit button to show editor
  const editGalleryBtn = $('#editGalleryBtn');
  if (editGalleryBtn) {
    editGalleryBtn.addEventListener('click', () => {
      if (!ensureAdmin('edit gallery')) return;
      showEditorPicker();
    });
  }
}
