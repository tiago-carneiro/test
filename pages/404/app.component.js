export function onInit(param, fromCache) {
  const el = document.getElementById('status');
  const time = new Date().toLocaleTimeString();
  el.textContent = '404 - Página não encontrada carregada às ' + time +
    (param ? ' | parâmetro: ' + param : '') +
    (fromCache ? ' (cache)' : '');
}