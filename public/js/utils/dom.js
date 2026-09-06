export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function mountScreen(id, html) {
  const main = document.getElementById('main');
  main.innerHTML = '';
  const screen = el(`<div id="${id}" class="screen">${html}</div>`);
  main.appendChild(screen);
  return screen;
}

export function setHeaderBadge(text) {
  const badge = document.getElementById('header-badge');
  if (text) {
    badge.textContent = text;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

export function optionIconHTML(opt, colorClass = 'text-primary') {
  if (opt.emoji) return `<span class="text-2xl w-10 text-center mr-3 flex-shrink-0">${opt.emoji}</span>`;
  return `<i class="fa-solid ${opt.icon} text-2xl ${colorClass} w-10 text-center mr-3 flex-shrink-0"></i>`;
}
