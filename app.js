import { router, preloadPages } from './router.js';

document.addEventListener('click', e => {
  const link = e.target.closest('[data-link]');
  if (!link) return;

  e.preventDefault();
  history.pushState(null, '', link.href);
  router();
});

window.addEventListener('popstate', router);

// preload páginas mais usadas
preloadPages(['pagina1', 'pagina2', 'pagina3']);

router();
