import { initAuth } from './auth.js';
import { initContact } from './contact.js';
import { initLayout } from './ui/layout.js';
import { initPosts } from './posts.js';
import { initQuotes } from './quotes.js';
import { initTooltips } from './tooltips.js';

document.addEventListener('DOMContentLoaded', () => {
  initLayout();
  initAuth();
  initPosts();
  initQuotes();
  initContact();
  initTooltips();

  requestAnimationFrame(() => document.body.classList.add('loaded'));
});
