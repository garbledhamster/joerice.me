const colors = ['var(--blue)', 'var(--red)', 'var(--yellow)', 'var(--rose)', 'var(--green)', 'var(--purple)'];

export function initTooltips() {
  const mobile = !matchMedia('(hover: hover)').matches;

  if (mobile) {
    document.querySelectorAll('.galleryGrid img').forEach(img => {
      img.parentElement?.addEventListener('click', e => {
        if (!img.classList.contains('tapped')) {
          e.preventDefault();
          document.querySelectorAll('.galleryGrid img').forEach(i => i.classList.remove('tapped'));
          img.classList.add('tapped');
        }
      });
    });
  }

  document.querySelectorAll('.social a').forEach(a => {
    const tip = document.createElement('span');
    tip.className = 'tooltip';
    tip.textContent = a.dataset.tip;
    a.appendChild(tip);
    const show = () => {
      a.classList.add('showTip');
      const c = colors[Math.random() * colors.length | 0];
      a.style.color = c;
      tip.style.background = c;
    };
    const hide = () => {
      a.classList.remove('showTip');
      a.style.color = 'inherit';
      tip.style.background = 'var(--fg)';
    };
    if (!mobile) {
      a.addEventListener('mouseenter', show);
      a.addEventListener('mouseleave', hide);
    }
    a.addEventListener('click', e => {
      if (mobile && !a.classList.contains('showTip')) {
        e.preventDefault();
        document.querySelectorAll('.social a').forEach(l => {
          l.classList.remove('showTip');
          l.style.color = 'inherit';
        });
        show();
      }
    });
  });
}
