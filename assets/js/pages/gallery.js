/** Instagram gallery. Previously uploaded Firebase photos remain untouched. */
import { getInstagramGalleryTemplate } from "../components/instagram-gallery.js";

export const getGalleryTemplate = getInstagramGalleryTemplate;

let cleanup = () => {};

/** Load the official embed script once, including across gallery remounts. */
export function initGallery() {
	destroyGallery();
	const host = document.getElementById("instagramGalleryEmbed");
	if (!host) return;

	// Instagram creates its frame asynchronously without an accessible title.
	const labelFrame = () => {
		const frame = host.querySelector("iframe");
		if (frame) {
			frame.title = "Instagram photos from @garbledhamster";
			observer.disconnect();
		}
	};
	const observer = new MutationObserver(labelFrame);
	observer.observe(host, { childList: true });
	labelFrame();
	cleanup = () => observer.disconnect();

	if (window.instgrm?.Embeds) {
		window.instgrm.Embeds.process();
		return;
	}

	let script = document.getElementById("instagramEmbedScript");
	const isNew = !script;
	if (!script) {
		script = document.createElement("script");
		script.id = "instagramEmbedScript";
		script.src = "https://www.instagram.com/embed.js";
		script.async = true;
	}
	const onLoad = () => {
		if (host.isConnected) window.instgrm?.Embeds?.process();
	};
	const onError = () => {
		// Keep the profile link usable, and permit another load on a future mount.
		script.remove();
	};
	script.addEventListener("load", onLoad, { once: true });
	script.addEventListener("error", onError, { once: true });
	cleanup = () => {
		observer.disconnect();
		script.removeEventListener("load", onLoad);
		script.removeEventListener("error", onError);
	};
	if (isNew) document.head.append(script);
}

export function renderGallery() {
	const mainContent = document.getElementById("mainContent");
	if (!mainContent) return;
	mainContent.innerHTML = getGalleryTemplate();
	initGallery();
}

export function destroyGallery() {
	cleanup();
	cleanup = () => {};
}
