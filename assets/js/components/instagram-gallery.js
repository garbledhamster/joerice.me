/**
 * Instagram profile embed supplied by the profile owner.
 * Instagram controls the photos displayed inside the embedded profile.
 */
export function getInstagramGalleryTemplate() {
	return `
    <section class="gallery instagramGallery" id="gallerySection" aria-labelledby="galleryHeading">
      <div class="sectionHeader"><h2 id="galleryHeading">Gallery</h2></div>
      <div class="instagramGalleryBody">
        <div class="instagramGalleryIntro">
          <h3>Photos from everyday life</h3>
          <p>A look at what catches my eye, shared on Instagram.</p>
          <a class="instagramGalleryProfile" href="https://www.instagram.com/garbledhamster/" target="_blank" rel="noopener noreferrer">
            <i class="fa-brands fa-instagram" aria-hidden="true"></i>
            <span>@garbledhamster<span class="sr-only"> on Instagram (opens in a new tab)</span></span>
          </a>
        </div>
        <div class="instagramGalleryContent">
          <div class="instagramGalleryEmbed" id="instagramGalleryEmbed" aria-label="Instagram photos from garbledhamster">
            <blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/garbledhamster/?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14">
              <a href="https://www.instagram.com/garbledhamster/" target="_blank" rel="noopener noreferrer">View @garbledhamster's photos on Instagram<span class="sr-only"> (opens in a new tab)</span></a>
            </blockquote>
          </div>
          <p class="instagramGalleryHelp">If Instagram doesn't load here, <a href="https://www.instagram.com/garbledhamster/" target="_blank" rel="noopener noreferrer">view the photos on Instagram<span class="sr-only"> (opens in a new tab)</span></a>.</p>
        </div>
      </div>
    </section>`;
}
