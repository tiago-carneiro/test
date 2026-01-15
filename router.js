import { PAGES, DEFAULT_PAGE, NOT_FOUND_PAGE } from './pages.config.js';

/**
 * Base path absoluto do script atual (funciona em qualquer subpasta)
 */
const scriptUrl = document.currentScript?.src || location.href;

const url = new URL(scriptUrl, location.href);

const scriptPath = url.pathname.substring(0, url.pathname.lastIndexOf('/') + 1);

// normaliza hash na primeira carga
if (!location.hash.startsWith('#/')) {
  location.hash = '#/' + DEFAULT_PAGE;
} else {
  // remove barras duplicadas
  location.hash = location.hash.replace(/^#\/+/, '#/');
}


/**
 * Cache em memória (HTML + CSS + JS)
 */
const cache = {};
let current = { page: null, style: null, scroll: 0 };

/**
 * Router principal usando hash
 */
export async function router() {
  const app = document.getElementById('app');
  if (!app) return;

  // salva scroll da página atual
  if (current.page && cache[current.page]) cache[current.page].scroll = window.scrollY;

  // lê rota pelo hash
  const hash = location.hash || '#/' + DEFAULT_PAGE;
  const path = hash.slice(1).split('/').filter(Boolean);
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
    if (PAGES[p] && !cache[p]) loadPage(p, true);
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

  // CACHE HIT
  if (cache[page]) {
    if (!preload) {
      app.innerHTML = cache[page].html;

      if (current.style) current.style.disabled = true;
      if (!document.head.contains(cache[page].style)) document.head.appendChild(cache[page].style);

      cache[page].style.disabled = false;
      current.style = cache[page].style;

      cache[page].js.onInit?.(param, true);
      current.page = page;
    }
    return;
  }

  // LOAD FROM SERVER (1x)
  const basePath = `${window.location.origin}${scriptPath}pages/${PAGES[page].component}`;

  try {
    // HTML
    const html = await fetch(`${basePath}/app.component.html`).then(r => {
      if (!r.ok) throw new Error(`Erro ao carregar HTML: ${r.status}`);
      return r.text();
    });

    // CSS
    const cssText = await fetch(`${basePath}/app.component.css`).then(r => {
      if (!r.ok) throw new Error(`Erro ao carregar CSS: ${r.status}`);
      return r.text();
    });
    const style = document.createElement('style');
    style.textContent = cssText;
    style.disabled = true;

    // JS
    const js = await import(`${basePath}/app.component.js`);

    // salva no cache
    cache[page] = { html, style, js, scroll: 0 };
    if (preload) return;

    // APPLY TO DOM
    app.innerHTML = html;

    if (current.style) current.style.disabled = true;
    if (!document.head.contains(style)) document.head.appendChild(style);

    style.disabled = false;
    current.style = style;

    js.onInit?.(param, false);
    current.page = page;
  } catch (err) {
    console.error('Erro ao carregar página:', err);
    if (page !== NOT_FOUND_PAGE) await loadPage(NOT_FOUND_PAGE, false);
  }
}

// intercepta clicks nos links internos
document.body.addEventListener('click', e => {
  const link = e.target.closest('[data-link]');
  if (!link) return;
  e.preventDefault();

  // remove qualquer # do começo e garante apenas uma barra
  const href = link.getAttribute('href').replace(/^#+/, '');
  location.hash = '#/' + href.replace(/^\/+/, ''); // remove barras extras
});


// escuta mudanças de hash
window.addEventListener('hashchange', router);

// preload páginas mais usadas
preloadPages(Object.keys(PAGES));

// normaliza hash na primeira carga
if (!location.hash) {
  // se não houver hash, define DEFAULT_PAGE
  location.hash = '#/' + DEFAULT_PAGE;
} else {
  location.hash = location.hash.replace(/^#\/+/, '#/');
}

// inicializa router após DOM estar pronto
window.addEventListener('DOMContentLoaded', () => {
  router();
});
