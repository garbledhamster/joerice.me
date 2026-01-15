import { ensureAdmin, getFirestore, getStorage, getCurrentUserId } from './auth.js';
import { $ } from './dom.js';
import { lockScroll, unlockScroll } from './ui/layout.js';

// DOM elements
let slideImage = null;
let slideCaption = null;
let slideLink = null;
let prevSlideBtn = null;
let nextSlideBtn = null;
let galleryModal = null;
let galleryModalCloseButton = null;
let galleryModalGrid = null;
let galleryModalFileInput = null;
let galleryModalUploadButton = null;
let galleryModalStatus = null;
let galleryModalEditor = null;
let galleryModalPreview = null;
let galleryModalCaptionInput = null;
let galleryModalSaveButton = null;
let galleryModalDeleteButton = null;
let galleryModalPrevBtn = null;
let galleryModalNextBtn = null;
let galleryModalNavInfo = null;

// State
let images = [];
let currentSlideIndex = 0;
let selectedImageDoc = null;
let selectedImageIndex = -1;

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
  if (!galleryModalStatus) return;
  galleryModalStatus.textContent = message || '';
}

function showSlide(index) {
  if (!images.length || !slideImage || !slideCaption || !slideLink) return;
  
  currentSlideIndex = (index + images.length) % images.length;
  const slide = images[currentSlideIndex];
  
  slideImage.src = slide.img;
  slideImage.alt = slide.caption || '';
  slideLink.href = slide.link || slide.img;
  slideCaption.textContent = slide.caption || '';
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
  if (galleryModalPreview) galleryModalPreview.src = '';
  if (galleryModalCaptionInput) galleryModalCaptionInput.value = '';
  if (galleryModalEditor) galleryModalEditor.style.display = 'none';
  updateNavButtons();
}

function updateNavButtons() {
  if (!galleryModalPrevBtn || !galleryModalNextBtn || !galleryModalNavInfo) return;
  
  if (selectedImageIndex === -1 || images.length === 0) {
    galleryModalPrevBtn.disabled = true;
    galleryModalNextBtn.disabled = true;
    galleryModalNavInfo.textContent = '';
  } else {
    galleryModalPrevBtn.disabled = selectedImageIndex === 0;
    galleryModalNextBtn.disabled = selectedImageIndex === images.length - 1;
    galleryModalNavInfo.textContent = `${selectedImageIndex + 1} of ${images.length}`;
  }
}

function selectImage(imageDoc, index) {
  selectedImageDoc = imageDoc;
  selectedImageIndex = index;
  
  if (galleryModalPreview) {
    galleryModalPreview.src = imageDoc.img;
  }
  
  if (galleryModalCaptionInput) {
    galleryModalCaptionInput.value = imageDoc.caption || '';
  }
  
  if (galleryModalEditor) {
    galleryModalEditor.style.display = 'flex';
  }

  updateNavButtons();

  // Update selected state in grid
  const gridItems = galleryModalGrid?.querySelectorAll('.galleryModalGridItem');
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
  if (!galleryModalGrid) return;
  
  galleryModalGrid.innerHTML = images.map((img, index) => `
    <div class="galleryModalGridItem" data-doc-id="${img.id}" data-index="${index}">
      <img src="${img.img}" alt="${img.caption || ''}" loading="lazy"/>
    </div>
  `).join('');

  // Add click handlers to grid items
  const gridItems = galleryModalGrid.querySelectorAll('.galleryModalGridItem');
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

  const file = galleryModalFileInput?.files?.[0];
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
      : `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const storagePath = `Images/${userId}/${imageId}`;
    
    // Upload to Storage
    const storageRef = storage.ref(storagePath);
    const uploadTask = await storageRef.put(file);
    const downloadURL = await uploadTask.ref.getDownloadURL();
    
    // Get caption from input
    const caption = galleryModalCaptionInput?.value?.trim() || '';
    
    // Create Firestore document
    const imagesCollection = firestore.collection('Images');
    const docRef = await imagesCollection.add({
      userId: userId,
      quote: caption,
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
    
    // Select the newly uploaded image
    const newImageIndex = images.findIndex(img => img.id === docRef.id);
    const newImage = images[newImageIndex];
    if (newImage && newImageIndex !== -1) {
      selectImage(newImage, newImageIndex);
    }
    
    // Clear file input
    if (galleryModalFileInput) galleryModalFileInput.value = '';
    
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
    
    const caption = galleryModalCaptionInput?.value?.trim() || '';
    const docRef = firestore.collection('Images').doc(selectedImageDoc.id);
    
    await docRef.update({
      quote: caption,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });

    setEditorStatus('Caption saved!');
    
    // Update local state
    selectedImageDoc.caption = caption;
    const imageIndex = images.findIndex(img => img.id === selectedImageDoc.id);
    if (imageIndex !== -1) {
      images[imageIndex].caption = caption;
      
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

function openGalleryModal() {
  if (!galleryModal) return;
  
  galleryModal.classList.add('show');
  galleryModal.setAttribute('aria-hidden', 'false');
  lockScroll();
  
  // Render the grid
  renderGalleryGrid();
  
  // Hide the editor initially
  if (galleryModalEditor) {
    galleryModalEditor.style.display = 'none';
  }
  
  // Clear any previous status
  setEditorStatus('');
}

function closeGalleryModal() {
  if (!galleryModal) return;
  
  galleryModal.classList.remove('show');
  galleryModal.setAttribute('aria-hidden', 'true');
  unlockScroll();
  
  // Clear selection
  clearSelection();
  setEditorStatus('');
  
  if (window.location.hash === '#galleryModal') {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

export async function initGallery() {
  // Get DOM elements
  slideImage = $('#slideImage');
  slideCaption = $('#slideCaption');
  slideLink = $('#slideLink');
  prevSlideBtn = $('#prevSlide');
  nextSlideBtn = $('#nextSlide');
  galleryModal = $('#galleryModal');
  galleryModalCloseButton = $('#galleryModalCloseButton');
  galleryModalGrid = $('#galleryModalGrid');
  galleryModalFileInput = $('#galleryModalFileInput');
  galleryModalUploadButton = $('#galleryModalUploadButton');
  galleryModalStatus = $('#galleryModalStatus');
  galleryModalEditor = $('#galleryModalEditor');
  galleryModalPreview = $('#galleryModalPreview');
  galleryModalCaptionInput = $('#galleryModalCaptionInput');
  galleryModalSaveButton = $('#galleryModalSaveButton');
  galleryModalDeleteButton = $('#galleryModalDeleteButton');
  galleryModalPrevBtn = $('#galleryModalPrevBtn');
  galleryModalNextBtn = $('#galleryModalNextBtn');
  galleryModalNavInfo = $('#galleryModalNavInfo');

  if (!slideImage || !slideCaption || !slideLink) {
    console.warn('Gallery elements not found.');
    return;
  }

  // Load images
  images = await loadImagesFromFirestore();
  
  // Initialize slideshow
  initSlideshow();

  // Initialize modal controls
  if (galleryModalUploadButton) {
    galleryModalUploadButton.addEventListener('click', handleUpload);
  }

  if (galleryModalSaveButton) {
    galleryModalSaveButton.addEventListener('click', handleSave);
  }

  if (galleryModalDeleteButton) {
    galleryModalDeleteButton.addEventListener('click', handleDelete);
  }

  if (galleryModalPrevBtn) {
    galleryModalPrevBtn.addEventListener('click', selectPreviousImage);
  }

  if (galleryModalNextBtn) {
    galleryModalNextBtn.addEventListener('click', selectNextImage);
  }

  if (galleryModalCloseButton) {
    galleryModalCloseButton.addEventListener('click', closeGalleryModal);
  }

  // Close modal when clicking outside
  if (galleryModal) {
    galleryModal.addEventListener('click', (event) => {
      if (event.target === galleryModal) {
        closeGalleryModal();
      }
    });
  }

  // Hide editor initially
  if (galleryModalEditor) {
    galleryModalEditor.style.display = 'none';
  }

  // Setup edit button to open modal
  const editGalleryBtn = $('#editGalleryBtn');
  if (editGalleryBtn) {
    editGalleryBtn.addEventListener('click', () => {
      if (!ensureAdmin('edit gallery')) return;
      openGalleryModal();
    });
  }
}
