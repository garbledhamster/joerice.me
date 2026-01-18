import { initAuth } from './auth.js';
import { initContact } from './contact.js';
import { initGallery } from './gallery.js';
import { initPosts } from './posts.js';
import { initQuotes } from './quotes.js';
import { initStockContentToggle } from './stock.js';
import { initTooltips } from './tooltips.js';
import { initLayout } from './ui/layout.js';

document.addEventListener('DOMContentLoaded', () => {
  initLayout();
  initAuth();
  initStockContentToggle();
  initPosts();
  initQuotes();
  initGallery();
  initContact();
  initTooltips();

  requestAnimationFrame(() => document.body.classList.add('loaded'));
});
