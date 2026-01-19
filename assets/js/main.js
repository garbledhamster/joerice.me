import { initAuth } from './auth.js';
import { initContact } from './contact.js';
import { initGallery } from './gallery.js';
import { initGithubContentToggle } from './github-content.js';
import { initPosts } from './posts.js';
import { initQuotes } from './quotes.js';
import { initTooltips } from './tooltips.js';
import { initLayout } from './ui/layout.js';

document.addEventListener('DOMContentLoaded', () => {
  initLayout();
  initAuth();
  initGithubContentToggle();
  initPosts();
  initQuotes();
  initGallery();
  initContact();
  initTooltips();

  requestAnimationFrame(() => document.body.classList.add('loaded'));
});
