import { PAGES, DEFAULT_PAGE, NOT_FOUND_PAGE } from './pages.config.js';

/**
 * Detecta a raiz do projeto automaticamente (Rider / subpasta)
 */
const ROOT = (() => {
  const parts = location.pathname.split('/').filter(Boolean);
  return parts.length > 1 ? `/${parts[0]}` : '';
})();

/**
 * Cache em memória (HTML + CSS + JS)
 */
const cache = {};
let current = {
  page: null,
  style: null,
  scroll: 0
};

/**
 * Router principal
 */
export async function router() {
  const app = document.getElementById('app');
  if (!app) return;

  // salva scroll da página atual
  if (current.page && cache[current.page]) {
    cache[current.page].scroll = window.scrollY;
  }

  const path = location.pathname.replace(ROOT, '').split('/').filter(Boolean);
  const route = path[0] || DEFAULT_PAGE;
  const param = path[1];

  const page = PAGES[route] ? route : NOT_FOUND_PAGE;

  await loadPage(page, false, param);

  // restaura scroll
  window.scrollTo(0, cache[page]?.scroll || 0);
}

/**
 * Preload opcional
 */
export function preloadPages(pages = []) {
  pages.forEach(p => {
    if (PAGES[p] && !cache[p]) {
      loadPage(p, true);
    }
  });
}

/**
 * Loader de página (lazy + cache REAL)
 */
async function loadPage(page, preload = false, param = null) {
  const app = document.getElementById('app');

  // lifecycle destroy da página atual
  if (!preload && current.page && cache[current.page]?.js?.onDestroy) {
    cache[current.page].js.onDestroy();
  }

  // =========================
  // CACHE HIT
  // =========================
  if (cache[page]) {
    if (!preload) {
      app.innerHTML = cache[page].html;

      // desabilita style atual
      if (current.style) current.style.disabled = true;

      // adiciona style no DOM se ainda não estiver
      if (!document.head.contains(cache[page].style)) {
        document.head.appendChild(cache[page].style);
      }

      // habilita novo style
      cache[page].style.disabled = false;
      current.style = cache[page].style;

      cache[page].js.onInit?.(param, true);
      current.page = page;
    }
    return;
  }

  // =========================
  // LOAD FROM SERVER (1x)
  // =========================
  const basePath = `${ROOT}/pages/${PAGES[page].component}`;

  // HTML
  const html = await fetch(`${basePath}/app.component.html`).then(r => r.text());

  // CSS
  const cssText = await fetch(`${basePath}/app.component.css`).then(r => r.text());
  const style = document.createElement('style');
  style.textContent = cssText;
  style.disabled = true; // inicialmente desabilitado

  // JS
  const js = await import(`${basePath}/app.component.js`);

  // salva no cache
  cache[page] = {
    html,
    style,
    js,
    scroll: 0
  };

  // preload NÃO aplica no DOM
  if (preload) return;

  // =========================
  // APPLY TO DOM
  // =========================
  app.innerHTML = html;

  // desabilita style atual
  if (current.style) current.style.disabled = true;

  // adiciona style ao DOM
  if (!document.head.contains(style)) {
    document.head.appendChild(style);
  }

  // habilita style da página
  style.disabled = false;
  current.style = style;

  // lifecycle init
  js.onInit?.(param, false);
  current.page = page;
}
