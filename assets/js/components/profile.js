/**
 * @file components/profile.js
 * @description Persistent profile section rendered once in the app shell.
 *
 * Contains the profile photo, social links, and a description paragraph
 * whose text updates automatically whenever the active route changes.
 */

import { $ } from "../core/dom.js";

const socialLinks = [
	{
		href: "https://pin.it/7ikA1HZ4o",
		icon: "fab fa-pinterest",
		label: "Pinterest",
	},
	{
		href: "https://www.instagram.com/garbledhamster/",
		icon: "fab fa-instagram",
		label: "Instagram",
	},
	{
		href: "https://www.facebook.com/garbledhamster/",
		icon: "fab fa-facebook",
		label: "Facebook",
	},
	{
		href: "https://buymeacoffee.com/garbledhamster",
		icon: "fas fa-mug-hot",
		label: "Buy Me A Coffee",
	},
	{
		href: "https://github.com/garbledhamster",
		icon: "fab fa-github",
		label: "GitHub",
	},
	{
		href: "https://www.upwork.com/freelancers/~016021fb4f5ed4ff13?mp_source=share",
		icon: "fab fa-upwork",
		label: "Upwork",
	},
	{ href: "https://fiverr.com/", icon: "fab fa-fiverr", label: "Fiverr" },
	{
		href: "https://www.etsy.com/shop/zettelkastenshop",
		icon: "fab fa-etsy",
		label: "Etsy",
	},
];

const pageDescriptions = {
	"/home":
		"I'm a husband, father, IT generalist, and entrepreneur at heart. I love sharing knowledge and have over a decade of experience in IT. If you're looking to connect with someone who's down to earth, open minded yet skeptical, and passionate about self improvement — use the nav to explore or get in touch.",
	"/portfolio":
		"A collection of my posts, notes, and projects. Browse through my work or search for something specific.",
	"/gallery":
		"Photos and images I've collected. Flip through the slideshow to see what catches your eye.",
	"/hire":
		"I help individuals and small teams ship clean, thoughtful digital experiences. Tap any card below to see what each service includes.",
	"/quotes":
		"Quotes that have shaped how I think and work. A new one rotates in every few seconds.",
	"/contact":
		"Have a question or want to work together? Fill out the form below and I'll get back to you within 24 hours.",
	"/links":
		"A curated collection of resources I return to regularly — bookmarked for a reason.",
};

/**
 * Get profile section HTML template.
 * The description paragraph starts empty; updateProfileDescription sets it
 * on the first route notification before the browser paints.
 * @returns {string} Profile section HTML
 */
export function getProfileTemplate() {
	const socialLinksHtml = socialLinks
		.map(
			(link) =>
				`<a href="${link.href}" target="_blank" aria-label="${link.label}"><i class="${link.icon}"></i></a>`,
		)
		.join("");

	return `
    <section class="hero max">
      <img class="pic" src="assets/images/pictures/profile.jpg" alt="Joe Rice"/>
      <div class="social">
        ${socialLinksHtml}
      </div>
      <p class="profileDesc" id="profileDesc"></p>
    </section>
  `;
}

/**
 * Swap the profile description text for the given route.
 * Falls back to the home description if the route has no entry.
 * @param {string} route - Current route path (e.g. '/portfolio')
 */
export function updateProfileDescription(route) {
	const desc = $("#profileDesc");
	if (!desc) return;
	desc.textContent = pageDescriptions[route] || pageDescriptions["/home"];
}
