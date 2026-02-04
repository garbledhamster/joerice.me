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
 * Get hire page HTML template
 * @returns {string} Hire page HTML
 */
export function getHireTemplate() {
  const serviceCardsHtml = services.map(service => createServiceCard(service)).join('');

  return `
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
