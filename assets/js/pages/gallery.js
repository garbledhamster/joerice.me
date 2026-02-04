/**
 * @file pages/gallery.js
 * @description Gallery page module
 *
 * Displays image gallery with slideshow and admin editor
 */

import { $, addListener } from "../core/dom.js";
import {
	ensureAdmin,
	getCurrentUserId,
	getFirestore,
	getStorage,
	isAdminUser,
} from "../services/auth.js";
import {
	sanitizeText,
	sanitizeUrl,
	validateLength,
} from "../services/sanitize.js";

// State
let images = [];
let currentSlideIndex = 0;
let isEditorMode = false;
let selectedImageDoc = null;
let selectedImageIndex = -1;

// Constants
const MAX_CAPTION_DISPLAY_LENGTH = 50;

// DOM references
let slideImage = null;
let slideCaption = null;
let slideLink = null;
let slideshow = null;
let galleryEditorContainer = null;
let cleanupFns = [];

// Fallback slides
const fallbackSlides = [
	{
		img: "https://picsum.photos/seed/family/1200/800",
		link: "https://picsum.photos/seed/family/1200/1200",
		caption: "Family: The people who keep me grounded.",
	},
	{
		img: "https://picsum.photos/seed/coding/1200/800",
		link: "https://picsum.photos/seed/coding/1200/1200",
		caption: "Coding: Building the future one script at a time.",
	},
	{
		img: "https://picsum.photos/seed/stoic/1200/800",
		link: "https://picsum.photos/seed/stoic/1200/1200",
		caption: "Stoic: Focus on what you can control.",
	},
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
		const imagesCollection = firestore.collection("Images");
		const snapshot = await imagesCollection.orderBy("createdAt", "desc").get();

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
				} catch (_error) {
					console.warn(`Failed to get URL for ${data.storagePath}`);
					continue;
				}
			}

			if (downloadURL) {
				loadedImages.push({
					id: doc.id,
					img: downloadURL,
					link: downloadURL,
					caption: data.quote || "",
					storagePath: data.storagePath,
					visible: data.visible !== false,
				});
			}
		}

		return loadedImages.length > 0 ? loadedImages : fallbackSlides;
	} catch (error) {
		console.warn("Error loading images:", error);
		return fallbackSlides;
	}
}

/**
 * Get visible images (admin sees all)
 * @returns {Object[]} Filtered image array
 */
function getVisibleImages() {
	return isAdminUser() ? images : images.filter((img) => img.visible !== false);
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

	slideImage.src = safeImgUrl || "#";
	slideImage.alt = sanitizeText(slide.caption || "");
	slideLink.href = safeLinkUrl || "#";
	slideCaption.textContent = sanitizeText(slide.caption || "");
}

/**
 * Navigate slideshow
 * @param {string} direction - 'next' or 'prev'
 */
function navigateSlideshow(direction) {
	const visibleImages = getVisibleImages();
	if (!visibleImages.length) return;

	const currentVisibleIndex = visibleImages.findIndex(
		(img) => img.id === images[currentSlideIndex]?.id,
	);
	let newVisibleIndex;

	if (direction === "next") {
		newVisibleIndex = (currentVisibleIndex + 1) % visibleImages.length;
	} else {
		newVisibleIndex =
			(currentVisibleIndex - 1 + visibleImages.length) % visibleImages.length;
	}

	const newImage = visibleImages[newVisibleIndex];
	const newIndex = images.findIndex((img) => img.id === newImage.id);

	if (newIndex !== -1) {
		showSlide(newIndex);
	}
}

/**
 * Set editor status message
 * @param {string} message - Status message to display
 */
function setEditorStatus(message) {
	const status = $("#galleryEditorStatus");
	if (status) status.textContent = message || "";
}

/**
 * Clear selected image
 */
function clearSelection() {
	selectedImageDoc = null;
	selectedImageIndex = -1;
	const preview = $("#galleryEditorPreview");
	const captionInput = $("#galleryEditorCaptionInput");
	if (preview) preview.src = "";
	if (captionInput) captionInput.value = "";
	updateNavButtons();
}

/**
 * Update navigation buttons state
 */
function updateNavButtons() {
	const prevBtn = $("#galleryEditorPrevBtn");
	const nextBtn = $("#galleryEditorNextBtn");
	const navInfo = $("#galleryEditorNavInfo");

	if (!prevBtn || !nextBtn || !navInfo) return;

	if (selectedImageIndex === -1 || images.length === 0) {
		prevBtn.disabled = true;
		nextBtn.disabled = true;
		navInfo.textContent = "";
	} else {
		prevBtn.disabled = selectedImageIndex === 0;
		nextBtn.disabled = selectedImageIndex === images.length - 1;
		navInfo.textContent = `${selectedImageIndex + 1} of ${images.length}`;
	}
}

/**
 * Select an image for editing
 * @param {Object} imageDoc - Image document to select
 * @param {number} index - Image index in array
 */
function selectImage(imageDoc, index) {
	selectedImageDoc = imageDoc;
	selectedImageIndex = index;

	const preview = $("#galleryEditorPreview");
	const captionInput = $("#galleryEditorCaptionInput");
	const picker = $("#galleryEditorPicker");
	const edit = $("#galleryEditorEdit");
	const grid = $("#galleryEditorGrid");

	if (preview) {
		preview.src = imageDoc.img;
	}

	if (captionInput) {
		captionInput.value = imageDoc.caption || "";
	}

	updateNavButtons();

	// Show edit view, hide picker
	if (picker) picker.hidden = true;
	if (edit) edit.hidden = false;

	// Update selected state in grid
	const gridItems = grid?.querySelectorAll(".galleryEditorGridItem");
	gridItems?.forEach((item) => {
		if (item.dataset.docId === imageDoc.id) {
			item.classList.add("selected");
		} else {
			item.classList.remove("selected");
		}
	});
}

/**
 * Select previous image in edit view
 */
function selectPreviousImage() {
	if (selectedImageIndex > 0) {
		const prevIndex = selectedImageIndex - 1;
		const prevImage = images[prevIndex];
		if (prevImage) {
			selectImage(prevImage, prevIndex);
		}
	}
}

/**
 * Select next image in edit view
 */
function selectNextImage() {
	if (selectedImageIndex < images.length - 1) {
		const nextIndex = selectedImageIndex + 1;
		const nextImage = images[nextIndex];
		if (nextImage) {
			selectImage(nextImage, nextIndex);
		}
	}
}

/**
 * Show editor picker view
 */
function showEditorPicker() {
	isEditorMode = true;
	if (slideshow) slideshow.hidden = true;
	if (galleryEditorContainer) galleryEditorContainer.hidden = false;

	const picker = $("#galleryEditorPicker");
	const edit = $("#galleryEditorEdit");
	if (picker) picker.hidden = false;
	if (edit) edit.hidden = true;

	renderGalleryGrid();
	setEditorStatus("");
	clearSelection();
}

/**
 * Handle image upload
 */
async function handleUpload() {
	if (!ensureAdmin("upload gallery image")) return;

	const fileInput = $("#galleryEditorFileInput");
	const file = fileInput?.files?.[0];
	if (!file) {
		setEditorStatus("Please select an image file first.");
		return;
	}

	const storage = getStorage();
	const firestore = getFirestore();
	const userId = getCurrentUserId();

	if (!storage || !firestore || !userId) {
		setEditorStatus("Firebase not configured or not signed in.");
		return;
	}

	try {
		setEditorStatus("Uploading...");

		// Generate unique image ID
		const imageId =
			typeof crypto?.randomUUID === "function"
				? crypto.randomUUID()
				: `img_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
		const storagePath = `Images/${userId}/${imageId}`;

		// Upload to Storage
		const storageRef = storage.ref(storagePath);
		const uploadTask = await storageRef.put(file);
		const downloadURL = await uploadTask.ref.getDownloadURL();

		// Get caption from input and validate
		const captionInput = $("#galleryEditorCaptionInput");
		const caption = captionInput?.value?.trim() || "";
		const validatedCaption = validateLength(caption, 500);

		// Create Firestore document
		// Note: Field is named 'quote' in Firestore for historical reasons
		const imagesCollection = firestore.collection("Images");
		const docRef = await imagesCollection.add({
			userId: userId,
			quote: validatedCaption,
			storagePath: storagePath,
			downloadURL: downloadURL,
			visible: true,
			createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
			updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
		});

		setEditorStatus("Image uploaded successfully!");

		// Reload images and update UI
		images = await loadImagesFromFirestore();
		renderGalleryGrid();
		showSlide(0);

		// Select the newly uploaded image and switch to edit view
		const newImageIndex = images.findIndex((img) => img.id === docRef.id);
		const newImage = images[newImageIndex];
		if (newImage && newImageIndex !== -1) {
			selectImage(newImage, newImageIndex);
		}

		// Clear file input
		if (fileInput) fileInput.value = "";
	} catch (error) {
		console.error("Error uploading image:", error);
		setEditorStatus(`Upload failed: ${error.message || "Unknown error"}`);
	}
}

/**
 * Handle save caption
 */
async function handleSave() {
	if (!ensureAdmin("save gallery image")) return;
	if (!selectedImageDoc) {
		setEditorStatus("No image selected.");
		return;
	}

	if (
		!confirm("Are you sure you want to save changes to this image caption?")
	) {
		return;
	}

	const firestore = getFirestore();
	if (!firestore) {
		setEditorStatus("Firestore not configured.");
		return;
	}

	try {
		setEditorStatus("Saving...");

		const captionInput = $("#galleryEditorCaptionInput");
		const caption = captionInput?.value?.trim() || "";
		const validatedCaption = validateLength(caption, 500);
		const docRef = firestore.collection("Images").doc(selectedImageDoc.id);

		// Note: Field is named 'quote' in Firestore for historical reasons
		await docRef.update({
			quote: validatedCaption,
			updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
		});

		setEditorStatus("Caption saved!");

		// Update local state with validated caption
		selectedImageDoc.caption = validatedCaption;
		const imageIndex = images.findIndex(
			(img) => img.id === selectedImageDoc.id,
		);
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
		console.error("Error saving caption:", error);
		setEditorStatus(`Save failed: ${error.message || "Unknown error"}`);
	}
}

/**
 * Handle delete image
 */
async function handleDelete() {
	if (!ensureAdmin("delete gallery image")) return;

	if (!selectedImageDoc) {
		setEditorStatus("No image selected.");
		return;
	}

	if (
		!confirm(
			"Are you sure you want to delete this image? This cannot be undone.",
		)
	) {
		return;
	}

	const firestore = getFirestore();
	const storage = getStorage();

	if (!firestore || !storage) {
		setEditorStatus("Firebase not configured.");
		return;
	}

	try {
		setEditorStatus("Deleting...");

		// Delete from Storage
		if (selectedImageDoc.storagePath) {
			try {
				const storageRef = storage.ref(selectedImageDoc.storagePath);
				await storageRef.delete();
			} catch (error) {
				console.warn("Error deleting from storage:", error);
			}
		}

		// Delete from Firestore
		const docRef = firestore.collection("Images").doc(selectedImageDoc.id);
		await docRef.delete();

		setEditorStatus("Image deleted successfully!");

		// Remove from local state
		images = images.filter((img) => img.id !== selectedImageDoc.id);

		// Clear selection
		clearSelection();

		// Update UI
		renderGalleryGrid();

		// Update slideshow
		if (images.length > 0) {
			currentSlideIndex = Math.min(currentSlideIndex, images.length - 1);
			showSlide(currentSlideIndex);
		}

		// Return to picker view after deletion
		const picker = $("#galleryEditorPicker");
		const edit = $("#galleryEditorEdit");
		if (picker) picker.hidden = false;
		if (edit) edit.hidden = true;

		// Clear status after a short delay
		setTimeout(() => setEditorStatus(""), 2000);
	} catch (error) {
		console.error("Error deleting image:", error);
		setEditorStatus(`Delete failed: ${error.message || "Unknown error"}`);
	}
}

/**
 * Toggle image visibility
 * @param {string} imageId - Image document ID
 * @param {boolean} currentVisibility - Current visibility state
 * @returns {boolean} New visibility state
 */
async function toggleImageVisibility(imageId, currentVisibility) {
	const firestore = getFirestore();
	if (!firestore || !imageId) {
		console.warn("Cannot toggle visibility: Firestore not configured.");
		return currentVisibility;
	}

	const newVisibility = !currentVisibility;
	const docRef = firestore.collection("Images").doc(imageId);
	await docRef.update({
		visible: newVisibility,
		updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
	});

	return newVisibility;
}

/**
 * Hide editor
 */
function hideEditor() {
	isEditorMode = false;
	if (slideshow) slideshow.hidden = false;
	if (galleryEditorContainer) galleryEditorContainer.hidden = true;

	const editBtn = $("#editGalleryBtn");
	if (editBtn) editBtn.textContent = "Edit";
}

/**
 * Render gallery grid in editor
 */
function renderGalleryGrid() {
	const grid = $("#galleryEditorGrid");
	if (!grid) return;

	grid.innerHTML = images
		.map((img, index) => {
			const safeImgUrl = sanitizeUrl(img.img);
			const safeCaption = sanitizeText(img.caption || "");
			// Truncate caption if too long, or use default text if no caption
			let shortCaption = "No caption";
			if (img.caption) {
				shortCaption =
					img.caption.length > MAX_CAPTION_DISPLAY_LENGTH
						? `${img.caption.slice(0, MAX_CAPTION_DISPLAY_LENGTH)}…`
						: img.caption;
			}
			const safeShortCaption = sanitizeText(shortCaption);
			const isVisible = img.visible !== false;
			const visibilityClass = !isVisible ? "gallery-image-hidden" : "";

			return `
      <div class="galleryEditorGridItem ${visibilityClass}" data-doc-id="${sanitizeText(img.id)}" data-index="${index}">
        <img src="${safeImgUrl || "#"}" alt="${safeCaption}" loading="lazy"/>
        <div class="galleryEditorGridItemCaption">${safeShortCaption}</div>
        <button class="gallery-visibility-button" type="button" data-doc-id="${sanitizeText(img.id)}" title="${isVisible ? "Hide" : "Show"}">
          <i class="fas fa-eye${isVisible ? "" : "-slash"}"></i>
        </button>
      </div>
    `;
		})
		.join("");
}

/**
 * Render gallery page
 */
export function renderGallery() {
	const mainContent = $("#mainContent");
	if (!mainContent) return;

	mainContent.innerHTML = getGalleryTemplate();
	initGallery();
}

/**
 * Initialize gallery page
 */
export async function initGallery() {
	slideImage = $("#slideImage");
	slideCaption = $("#slideCaption");
	slideLink = $("#slideLink");
	slideshow = $("#slideshow");
	galleryEditorContainer = $("#galleryEditorContainer");

	if (!slideImage || !slideCaption || !slideLink) return;

	// Load images
	images = await loadImagesFromFirestore();

	// Show first visible image
	const visibleImages = getVisibleImages();
	if (visibleImages.length > 0) {
		const firstIndex = images.findIndex(
			(img) => img.id === visibleImages[0].id,
		);
		showSlide(firstIndex !== -1 ? firstIndex : 0);
	}

	// Slideshow navigation
	const prevSlideBtn = $("#prevSlide");
	const nextSlideBtn = $("#nextSlide");

	if (prevSlideBtn) {
		cleanupFns.push(
			addListener(prevSlideBtn, "click", () => navigateSlideshow("prev")),
		);
	}
	if (nextSlideBtn) {
		cleanupFns.push(
			addListener(nextSlideBtn, "click", () => navigateSlideshow("next")),
		);
	}

	// Edit button
	const editGalleryBtn = $("#editGalleryBtn");
	if (editGalleryBtn) {
		cleanupFns.push(
			addListener(editGalleryBtn, "click", () => {
				if (!ensureAdmin("edit gallery")) return;
				if (isEditorMode) {
					hideEditor();
				} else {
					showEditorPicker();
					editGalleryBtn.textContent = "Close";
				}
			}),
		);
	}

	// Back button
	const backButton = $("#galleryEditorBackButton");
	if (backButton) {
		cleanupFns.push(
			addListener(backButton, "click", () => {
				const edit = $("#galleryEditorEdit");
				const picker = $("#galleryEditorPicker");
				if (edit && !edit.hidden) {
					if (picker) picker.hidden = false;
					edit.hidden = true;
					clearSelection();
					setEditorStatus("");
				} else {
					hideEditor();
				}
			}),
		);
	}

	// Upload button
	const uploadButton = $("#galleryEditorUploadButton");
	if (uploadButton) {
		cleanupFns.push(addListener(uploadButton, "click", handleUpload));
	}

	// Save button
	const saveButton = $("#galleryEditorSaveButton");
	if (saveButton) {
		cleanupFns.push(addListener(saveButton, "click", handleSave));
	}

	// Delete button
	const deleteButton = $("#galleryEditorDeleteButton");
	if (deleteButton) {
		cleanupFns.push(addListener(deleteButton, "click", handleDelete));
	}

	// Previous image button in edit view
	const prevImageBtn = $("#galleryEditorPrevBtn");
	if (prevImageBtn) {
		cleanupFns.push(addListener(prevImageBtn, "click", selectPreviousImage));
	}

	// Next image button in edit view
	const nextImageBtn = $("#galleryEditorNextBtn");
	if (nextImageBtn) {
		cleanupFns.push(addListener(nextImageBtn, "click", selectNextImage));
	}

	// Event delegation for gallery grid items and visibility buttons
	const galleryGrid = $("#galleryEditorGrid");
	if (galleryGrid) {
		const gridClickHandler = async (e) => {
			const gridItem = e.target.closest(".galleryEditorGridItem");
			const visibilityButton = e.target.closest(".gallery-visibility-button");

			// Handle visibility button click
			if (visibilityButton) {
				e.stopPropagation();
				if (!ensureAdmin("toggle image visibility")) return;

				const docId = visibilityButton.dataset.docId;
				const imageDoc = images.find((img) => img.id === docId);

				if (!imageDoc?.id) {
					alert("Cannot toggle visibility: Image not found or has invalid ID.");
					return;
				}

				const currentVisibility = imageDoc.visible !== false;

				try {
					const newVisibility = await toggleImageVisibility(
						imageDoc.id,
						currentVisibility,
					);
					imageDoc.visible = newVisibility;
					renderGalleryGrid();

					// Update slideshow if needed
					const imageIndex = images.findIndex((img) => img.id === docId);
					if (currentSlideIndex === imageIndex) {
						showSlide(currentSlideIndex);
					}
				} catch (error) {
					console.warn("Unable to toggle image visibility.", error);
					alert(
						`Unable to toggle visibility: ${error.message || "Unknown error"}. Please try again.`,
					);
				}
				return;
			}

			// Handle grid item click
			if (gridItem) {
				const docId = gridItem.dataset.docId;
				const index = parseInt(gridItem.dataset.index, 10);
				const imageDoc = images.find((img) => img.id === docId);
				if (imageDoc) {
					selectImage(imageDoc, index);
				}
			}
		};

		cleanupFns.push(addListener(galleryGrid, "click", gridClickHandler));
	}
}

/**
 * Clean up gallery page
 */
export function destroyGallery() {
	cleanupFns.forEach((fn) => {
		fn();
	});
	cleanupFns = [];
	images = [];
	currentSlideIndex = 0;
	isEditorMode = false;
	selectedImageDoc = null;
	selectedImageIndex = -1;
}
