/**
 * @file pages/home.js
 * @description Home page module
 *
 * The profile photo, social links, and landing description are rendered
 * by the persistent profile component in the app shell.  This page has
 * no additional content to render.
 */

import { $ } from '../core/dom.js';

/**
 * Render home page content
 */
export function renderHome() {
  const mainContent = $('#mainContent');
  if (mainContent) mainContent.innerHTML = '';
}

/**
 * Initialize home page
 */
export function initHome() {}

/**
 * Clean up home page
 */
export function destroyHome() {}
