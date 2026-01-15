export function onInit(param, fromCache) {
  const el = document.getElementById('status');
  const time = new Date().toLocaleTimeString();
  el.textContent = 'Pagina 22 carregada às ' + time +
    (param ? ' | parâmetro: ' + param : '') +
    (fromCache ? ' (cache)' : '');
}