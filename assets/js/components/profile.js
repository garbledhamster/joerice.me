/**
 * @file components/profile.js
 * @description Professional profile section rendered at the top of the page.
 */

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

const professionalIntroduction =
	"I'm Joe Rice. I help individuals and small businesses build websites and apps, solve technology problems, organize information, and learn tools they can use in everyday work. You can bring a specific project or a problem you're still working out so we can figure out what's needed and get the work done.";

/**
 * Get social links for the page footer.
 * @returns {string} Social links HTML
 */
export function getSocialLinksTemplate() {
	const socialLinksHtml = socialLinks
		.map(
			(link) =>
				`<a href="${link.href}" target="_blank" rel="noopener noreferrer"><i class="${link.icon}" aria-hidden="true"></i><span>${link.label}</span></a>`,
		)
		.join("");

	return `<nav class="social footerSocial" aria-label="Find Joe elsewhere">${socialLinksHtml}</nav>`;
}

/**
 * Get profile section HTML template.
 * @returns {string} Profile section HTML
 */
export function getProfileTemplate() {
	return `
    <section class="hero max singlePageSection" id="about" data-section="about">
      <img class="pic" src="assets/images/pictures/profile.jpg" alt="Joe Rice"/>
      <h1 class="profileTitle">Tell me what you're trying to accomplish.</h1>
      <p class="profileDesc" id="profileDesc">${professionalIntroduction}</p>
      <details class="profileMore">
        <summary><span class="profileShowMore">Show more</span><span class="profileShowLess">Show less</span></summary>
        <p class="profileExperience">I'm a systems generalist with more than a decade of experience in IT support, engineering, and administration. I like understanding what is getting in someone's way, making a plan, and explaining the work so they can feel comfortable with the next step and develop the skills to help themselves.</p>
      </details>
      <div class="profileActions"><a class="quoteLink" href="#contact">Request a quote</a><a class="textLink" href="#services">See how I can help</a></div>
    </section>
  `;
}
