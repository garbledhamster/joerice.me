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
	"My career has taken me through IT operations, project delivery, client support, and hands-on problem solving. Over more than a decade in IT, I have learned that the best systems make difficult work easier to understand and repeat. My own journey led me to build this portfolio as more than a record of past work: it is a place where people can use my services, notes, and practical resources to help themselves.";

/**
 * Get profile section HTML template.
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
    <section class="hero max singlePageSection" id="about" data-section="about">
      <img class="pic" src="assets/images/pictures/profile.jpg" alt="Joe Rice"/>
      <div class="social">
        ${socialLinksHtml}
      </div>
      <h1 class="profileTitle">Systems, service, and practical technology.</h1>
      <p class="profileDesc" id="profileDesc">${professionalIntroduction}</p>
    </section>
  `;
}
