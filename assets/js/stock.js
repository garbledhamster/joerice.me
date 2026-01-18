import { $ } from './dom.js';

const stockContentStorageKey = 'showStockContent';

export function isStockContentEnabled() {
  const stored = window.localStorage.getItem(stockContentStorageKey);
  return stored !== 'false';
}

function setStockContentEnabled(enabled) {
  window.localStorage.setItem(stockContentStorageKey, enabled ? 'true' : 'false');
  window.dispatchEvent(
    new CustomEvent('stockcontentchange', {
      detail: { enabled },
    }),
  );
}

export function onStockContentChange(handler) {
  window.addEventListener('stockcontentchange', (event) => {
    const enabled = event.detail?.enabled ?? isStockContentEnabled();
    handler(enabled);
  });
}

export function initStockContentToggle() {
  const toggle = $('#stockContentToggle');
  if (!toggle) return;
  toggle.checked = isStockContentEnabled();
  toggle.addEventListener('change', (event) => {
    setStockContentEnabled(event.target.checked);
  });
}
