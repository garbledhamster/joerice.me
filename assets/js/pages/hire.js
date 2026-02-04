/**
 * @file pages/hire.js
 * @description Hire/Services page module
 *
 * Displays service cards with flip animation
 */

import { $ } from '../core/dom.js';
import { createServiceCard } from '../components/card.js';

/**
 * Services data configuration
 */
const services = [
  {
    title: 'Web Site',
    description: 'Marketing sites, portfolios, and landing pages that load fast and look sharp.',
    highlights: ['Discovery + sitemap', 'Responsive layout', 'Performance + SEO basics'],
    ariaLabel: 'Flip Web Site card',
  },
  {
    title: 'Web App',
    description: 'Interactive products with clean UI, scalable structure, and thoughtful UX.',
    highlights: ['Product planning', 'UI/UX flows', 'Deployment guidance'],
    ariaLabel: 'Flip Web App card',
  },
  {
    title: 'IT Services',
    description: 'Troubleshooting, device setup, and small-business tech support.',
    highlights: ['Home/office networks', 'Hardware diagnostics', 'Security checkups'],
    ariaLabel: 'Flip IT Services card',
  },
  {
    title: 'Knowledge Mgmt',
    description: 'Note systems and workflows to capture, organize, and retrieve ideas.',
    highlights: ['Zettelkasten setup', 'Searchable structure', 'Training + habits'],
    ariaLabel: 'Flip Knowledge Mgmt card',
  },
  {
    title: 'Logo Design',
    description: 'Simple, bold marks with usable brand assets for print and digital.',
    highlights: ['Concept sketches', 'Vector delivery', 'Usage guidance'],
    ariaLabel: 'Flip Logo Design card',
  },
  {
    title: 'Resume Writing',
    description: 'Recruiter-ready resumes tuned for clarity, impact, and outcomes.',
    highlights: ['Story arc', 'ATS-friendly format', 'LinkedIn polish'],
    ariaLabel: 'Flip Resume Writing card',
  },
  {
    title: 'AI Coaching',
    description: 'Hands-on coaching to use AI tools for real work and daily workflows.',
    highlights: ['Prompt patterns', 'Workflow automation', 'Ethics + guardrails'],
    ariaLabel: 'Flip AI Coaching card',
  },
];

/**
 * Social media links
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
 * Get hire page HTML template
 * @returns {string} Hire page HTML
 */
export function getHireTemplate() {
  const socialLinksHtml = socialLinks
    .map(link => `<a href="${link.href}" target="_blank" aria-label="${link.label}"><i class="${link.icon}"></i></a>`)
    .join('');

  const serviceCardsHtml = services.map(service => createServiceCard(service)).join('');

  return `
    <section class="hero">
      <img class="pic" src="assets/images/pictures/profile.jpg" alt="Joe Rice"/>
      <div class="intro">
        <h1>Hire Joe</h1>
        <p>I help individuals and small teams ship clean, thoughtful digital experiences. Tap any card to flip it and see what each service includes.</p>
        <div class="social">
          ${socialLinksHtml}
        </div>
      </div>
    </section>
    <section class="services" id="servicesSection">
      <div class="sectionHeader">
        <h2>Services</h2>
        <span class="servicesNote">Tap or click a card to flip it.</span>
      </div>
      <div class="serviceGrid">
        ${serviceCardsHtml}
      </div>
    </section>
  `;
}

/**
 * Render hire page
 */
export function renderHire() {
  const mainContent = $('#mainContent');
  if (!mainContent) return;

  mainContent.innerHTML = getHireTemplate();
  initHire();
}

/**
 * Initialize hire page
 * Service cards are CSS-only, no JS needed for flip
 */
export function initHire() {
  // Service cards use CSS :checked for flip - no JS needed
}

/**
 * Clean up hire page
 */
export function destroyHire() {
  // Nothing to clean up
}
