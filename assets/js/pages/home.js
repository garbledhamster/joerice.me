/**
 * @file pages/home.js
 * @description Home page module
 *
 * Renders the home page with profile photo and intro text
 * This is the landing page - simple and focused
 */

import { $ } from '../core/dom.js';

/**
 * Social media links configuration
 */
const socialLinks = [
  { href: 'https://pin.it/7ikA1HZ4o', icon: 'fab fa-pinterest', label: 'Pinterest' },
  { href: 'https://www.instagram.com/garbledhamster/', icon: 'fab fa-instagram', label: 'Instagram' },
  { href: 'https://www.facebook.com/garbledhamster/', icon: 'fab fa-facebook', label: 'Facebook' },
  { href: 'https://buymeacoffee.com/garbledhamster', icon: 'fas fa-mug-hot', label: 'Buy Me A Coffee' },
  { href: 'https://github.com/garbledhamster', icon: 'fab fa-github', label: 'GitHub' },
  { href: 'https://www.upwork.com/freelancers/~016021fb4f5ed4ff13?mp_source=share', icon: 'fab fa-upwork', label: 'Upwork' },
  { href: 'https://fiverr.com/', icon: 'fab fa-fiverr', label: 'Fiverr' },
  { href: 'https://www.etsy.com/shop/zettelkastenshop', icon: 'fab fa-etsy', label: 'Etsy' },
];

/**
 * Get home page HTML template
 * @returns {string} Home page HTML
 */
export function getHomeTemplate() {
  const socialLinksHtml = socialLinks
    .map(link => `<a href="${link.href}" target="_blank" aria-label="${link.label}"><i class="${link.icon}"></i></a>`)
    .join('');

  return `
    <section class="hero">
      <img class="pic" src="assets/images/pictures/profile.jpg" alt="Joe Rice"/>
      <div class="intro">
        <p>I'm a husband, father, IT generalist, and entrepreneur at heart. I love sharing knowledge and have over a decade of experience in IT. If you're looking to connect with someone who's down to earth, open minded yet skeptical, and passionate about self improvement, I'd love to hear from you. To hire me for freelance or full-time work, just fill out the contact form below. I'll respond within 24 hours.</p>
        <div class="social">
          ${socialLinksHtml}
        </div>
      </div>
    </section>
  `;
}

/**
 * Render home page content
 */
export function renderHome() {
  const mainContent = $('#mainContent');
  if (!mainContent) {
    console.warn('Main content container not found');
    return;
  }

  mainContent.innerHTML = getHomeTemplate();
}

/**
 * Initialize home page
 */
export function initHome() {
  // Home page has no interactive elements to initialize
  // Just static content rendered by renderHome()
}

/**
 * Clean up home page
 */
export function destroyHome() {
  // Nothing to clean up for home page
}
