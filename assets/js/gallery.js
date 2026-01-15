import { ensureAdmin, getFirestore, getStorage, getCurrentUserId } from './auth.js';
import { $ } from './dom.js';
import { sanitizeText, sanitizeUrl, validateLength } from './sanitize.js';

// DOM elements
let slideImage = null;
let slideCaption = null;
let slideLink = null;
let prevSlideBtn = null;
let nextSlideBtn = null;
let galleryEditor = null;
let galleryGrid = null;
let galleryFileInput = null;
let galleryUploadButton = null;
let galleryEditorStatus = null;
let gallerySelectedEditor = null;
let gallerySelectedPreview = null;
let galleryCaptionInput = null;
let gallerySaveButton = null;
let galleryDeleteButton = null;

// State
let images = [];
let currentSlideIndex = 0;
let selectedImageDoc = null;

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
  if (gallerySelectedPreview) gallerySelectedPreview.src = '';
  if (galleryCaptionInput) galleryCaptionInput.value = '';
  if (gallerySelectedEditor) gallerySelectedEditor.style.display = 'none';
}

function selectImage(imageDoc) {
  selectedImageDoc = imageDoc;
  
  if (gallerySelectedPreview) {
    gallerySelectedPreview.src = imageDoc.img;
  }
  
  if (galleryCaptionInput) {
    galleryCaptionInput.value = imageDoc.caption || '';
  }
  
  if (gallerySelectedEditor) {
    gallerySelectedEditor.style.display = 'block';
  }

  // Update selected state in grid
  const gridItems = galleryGrid?.querySelectorAll('.galleryGridItem');
  gridItems?.forEach(item => {
    if (item.dataset.docId === imageDoc.id) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

function renderGalleryGrid() {
  if (!galleryGrid) return;
  
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
  const gridItems = galleryGrid.querySelectorAll('.galleryGridItem');
  gridItems.forEach(item => {
    item.addEventListener('click', () => {
      const docId = item.dataset.docId;
      const imageDoc = images.find(img => img.id === docId);
      if (imageDoc) {
        selectImage(imageDoc);
      }
    });
  });
}

async function handleUpload() {
  if (!ensureAdmin('upload gallery image')) return;

  const file = galleryFileInput?.files?.[0];
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
    
    // Select the newly uploaded image
    const newImage = images.find(img => img.id === docRef.id);
    if (newImage) {
      selectImage(newImage);
    }
    
    // Clear file input
    if (galleryFileInput) galleryFileInput.value = '';
    
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

export async function initGallery() {
  // Get DOM elements
  slideImage = $('#slideImage');
  slideCaption = $('#slideCaption');
  slideLink = $('#slideLink');
  prevSlideBtn = $('#prevSlide');
  nextSlideBtn = $('#nextSlide');
  galleryEditor = $('#galleryEditor');
  galleryGrid = $('#galleryGrid');
  galleryFileInput = $('#galleryFileInput');
  galleryUploadButton = $('#galleryUploadButton');
  galleryEditorStatus = $('#galleryEditorStatus');
  gallerySelectedEditor = $('#gallerySelectedEditor');
  gallerySelectedPreview = $('#gallerySelectedPreview');
  galleryCaptionInput = $('#galleryCaptionInput');
  gallerySaveButton = $('#gallerySaveButton');
  galleryDeleteButton = $('#galleryDeleteButton');

  if (!slideImage || !slideCaption || !slideLink) {
    console.warn('Gallery elements not found.');
    return;
  }

  // Load images
  images = await loadImagesFromFirestore();
  
  // Initialize slideshow
  initSlideshow();

  // Initialize editor if available
  if (galleryUploadButton) {
    galleryUploadButton.addEventListener('click', handleUpload);
  }

  if (gallerySaveButton) {
    gallerySaveButton.addEventListener('click', handleSave);
  }

  if (galleryDeleteButton) {
    galleryDeleteButton.addEventListener('click', handleDelete);
  }

  // Hide selected editor initially
  if (gallerySelectedEditor) {
    gallerySelectedEditor.style.display = 'none';
  }

  // When editor panel opens, render the grid
  const editGalleryBtn = $('#editGalleryBtn');
  if (editGalleryBtn && galleryEditor) {
    editGalleryBtn.addEventListener('click', () => {
      // Small delay to ensure panel is visible
      setTimeout(() => {
        if (!galleryEditor.classList.contains('is-collapsed')) {
          renderGalleryGrid();
        }
      }, 50);
    });
  }
}
