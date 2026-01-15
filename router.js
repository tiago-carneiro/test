import { PAGES, DEFAULT_PAGE, NOT_FOUND_PAGE } from './pages.config.js';

/**
 * Detecta a raiz do projeto (qualquer subpasta)
 * Se app.js estiver em /foo/bar/app.js, ROOT = /foo/bar/
 */
const ROOT = (() => {
  const scripts = document.getElementsByTagName('script');
  const thisScript = scripts[scripts.length - 1]?.src || location.pathname;
  const url = new URL(thisScript, location.href);
  return url.pathname.replace(/\/app\.js$/, '/');
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

  // pega rota ignorando ROOT detectado
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
 * Loader de página (lazy + cache)
 */
async function loadPage(page, preload = false, param = null) {
  const app = document.getElementById('app');

  // lifecycle destroy da página atual
  if (!preload && current.page && cache[current.page]?.js?.onDestroy) {
    try { cache[current.page].js.onDestroy(); } catch {}
  }

  // =========================
  // CACHE HIT
  // =========================
  if (cache[page]) {
    if (!preload) {
      app.innerHTML = cache[page].html;

      if (current.style) current.style.disabled = true;

      if (!document.head.contains(cache[page].style)) {
        document.head.appendChild(cache[page].style);
      }

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
  const basePath = `${ROOT}pages/${PAGES[page].component}`;

  try {
    const html = await fetch(`${basePath}/app.component.html`).then(r => {
      if (!r.ok) throw new Error(`Erro ao carregar HTML: ${r.status}`);
      return r.text();
    });

    const cssText = await fetch(`${basePath}/app.component.css`).then(r => {
      if (!r.ok) throw new Error(`Erro ao carregar CSS: ${r.status}`);
      return r.text();
    });

    const style = document.createElement('style');
    style.textContent = cssText;
    style.disabled = true;

    const js = await import(`${basePath}/app.component.js`);

    cache[page] = { html, style, js, scroll: 0 };

    if (preload) return;

    app.innerHTML = html;

    if (current.style) current.style.disabled = true;

    if (!document.head.contains(style)) {
      document.head.appendChild(style);
    }

    style.disabled = false;
    current.style = style;

    js.onInit?.(param, false);
    current.page = page;
  } catch (err) {
    console.error('Erro ao carregar página:', err);
    if (page !== NOT_FOUND_PAGE) await loadPage(NOT_FOUND_PAGE, false);
  }
}
