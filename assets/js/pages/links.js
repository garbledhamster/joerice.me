/**
 * @file pages/links.js
 * @description Links page module
 *
 * Displays curated list of useful links
 */

import { $ } from '../core/dom.js';

/**
 * Links data configuration
 */
const links = [
  { title: 'Hacker News', url: 'https://news.ycombinator.com' },
  { title: 'Zettelkasten Method', url: 'https://zettelkasten.de' },
  { title: 'Replit', url: 'https://replit.com' },
  { title: 'Notion', url: 'https://www.notion.so' },
  { title: 'r/PersonalFinance Wiki', url: 'https://www.reddit.com/r/personalfinance/wiki/index' },
  { title: 'Khan Academy – Personal Finance', url: 'https://www.khanacademy.org/college-careers-more/personal-finance' },
  { title: 'NerdWallet', url: 'https://www.nerdwallet.com' },
  { title: 'Dave Ramsey Baby Steps', url: 'https://www.daveramsey.com/baby-steps' },
  { title: 'YC Startup Library', url: 'https://www.ycombinator.com/library' },
  { title: 'Indie Hackers', url: 'https://www.indiehackers.com' },
  { title: 'Daily Stoic', url: 'https://dailystoic.com' },
  { title: 'Product Hunt', url: 'https://www.producthunt.com' },
  { title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
  { title: 'OpenAI Cookbook', url: 'https://github.com/openai/openai-cookbook' },
  { title: 'Obsidian', url: 'https://obsidian.md' },
  { title: 'GitHub', url: 'https://github.com' },
];

/**
 * Get links page HTML template
 * @returns {string} Links page HTML
 */
export function getLinksTemplate() {
  const linksHtml = links
    .map(link => `<li><a href="${link.url}" target="_blank">${link.title}</a></li>`)
    .join('');

  return `
    <section class="links" id="linksSection">
      <h2>Useful Links</h2>
      <ol>
        ${linksHtml}
      </ol>
    </section>
  `;
}

/**
 * Render links page
 */
export function renderLinks() {
  const mainContent = $('#mainContent');
  if (!mainContent) return;

  mainContent.innerHTML = getLinksTemplate();
  initLinks();
}

/**
 * Initialize links page
 */
export function initLinks() {
  // Links page is static - no initialization needed
}

/**
 * Clean up links page
 */
export function destroyLinks() {
  // Nothing to clean up
}
