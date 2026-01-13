let scrollY = 0;

export function lockScroll() {
  scrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
}

export function unlockScroll() {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  window.scrollTo(0, scrollY);
}

function updateHeaderHeight() {
  const header = document.querySelector('.siteHeader');
  if (!header) return;
  const height = header.offsetHeight;
  document.documentElement.style.setProperty('--header-h', `${height}px`);
}

export function initLayout() {
  updateHeaderHeight();
  window.addEventListener('resize', updateHeaderHeight);

  const menuToggle = document.querySelector('.menuToggle');
  const mainNav = document.getElementById('mainNav');
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => mainNav.classList.toggle('open'));
  }
}
