import { mountScreen } from '../utils/dom.js';
import { appState, setRegion } from '../state.js';
import { REGIONS } from '../data/regions.js';

const SLIDES = [
  {
    icon: 'fa-film',
    title: 'Welcome to CineMatch',
    html: '<p>Stop arguing about what to watch tonight. Swipe, save, and find something you\'ll actually want to watch. 🍿</p>',
  },
  {
    icon: 'fa-shuffle',
    title: 'Three ways to choose',
    html: `
      <div class="text-left space-y-4">
        <p><i class="fa-solid fa-user text-primary w-6 mr-1"></i><b>Solo</b> — set your tastes and swipe through a deck built just for you.</p>
        <p><i class="fa-solid fa-wand-magic-sparkles text-primary w-6 mr-1"></i><b>Suggestion</b> — search for a title you love and find similar ones.</p>
        <p><i class="fa-solid fa-users text-primary w-6 mr-1"></i><b>Multiplayer</b> — create a room, invite friends, and find the perfect match together.</p>
      </div>
    `,
  },
  {
    icon: 'fa-earth-americas',
    title: 'Where are you watching from?',
    type: 'region',
  },
  {
    icon: 'fa-lightbulb',
    title: 'A few tips',
    html: `
      <div class="text-left space-y-4">
        <p><i class="fa-solid fa-heart text-primary w-6 mr-1"></i>Every "Like" ends up in your <b>Watchlist</b>.</p>
        <p><i class="fa-solid fa-shuffle text-primary w-6 mr-1"></i>Can't decide? Try <b>Surprise me</b> in the Watchlist.</p>
        <p><i class="fa-solid fa-mobile-screen text-primary w-6 mr-1"></i>You can install CineMatch as an app from your browser.</p>
      </div>
    `,
  },
];

function regionSlideHTML() {
  return `
    <p class="text-slate-400 text-sm mb-4 -mt-2">Used to match streaming availability and content language. You can change this anytime in Settings.</p>
    <div class="grid grid-cols-2 gap-2.5 text-left">
      ${REGIONS.map((r) => `
        <button data-region="${r.code}" class="region-btn option-btn py-3 ${appState.region === r.code ? 'selected' : ''}">
          <span class="text-xl w-8 text-center mr-2 flex-shrink-0">${r.flag}</span>
          <span class="font-semibold text-sm flex-grow">${r.label}</span>
        </button>
      `).join('')}
    </div>
  `;
}

export function renderOnboarding(onDone) {
  let step = 0;

  function render() {
    const slide = SLIDES[step];
    const isLast = step === SLIDES.length - 1;
    const screen = mountScreen('screen-onboarding', `
      <div class="flex-grow flex flex-col overflow-hidden">
        <div class="flex-grow flex flex-col justify-center items-center p-8 text-center overflow-y-auto">
          <i class="fa-solid ${slide.icon} text-6xl text-primary mb-6"></i>
          <h1 class="text-2xl font-extrabold mb-5">${slide.title}</h1>
          <div class="text-slate-300 text-base leading-relaxed max-w-sm w-full">${slide.type === 'region' ? regionSlideHTML() : slide.html}</div>
        </div>
        <div class="flex-shrink-0 p-6 space-y-4">
          <div class="flex justify-center gap-2">
            ${SLIDES.map((_, i) => `<span class="w-2 h-2 rounded-full ${i === step ? 'bg-primary' : 'bg-slate-700'}"></span>`).join('')}
          </div>
          <button id="btn-onb-next" class="w-full bg-primary text-white font-bold py-4 rounded-full text-lg">${isLast ? 'Get started' : 'Next'}</button>
          ${!isLast ? '<button id="btn-onb-skip" class="w-full text-sm text-slate-500 font-bold py-2">Skip</button>' : ''}
        </div>
      </div>
    `);

    if (slide.type === 'region') {
      screen.querySelectorAll('[data-region]').forEach((btn) => {
        btn.onclick = () => { setRegion(btn.dataset.region); render(); };
      });
    }

    screen.querySelector('#btn-onb-next').onclick = () => {
      if (isLast) { onDone(); return; }
      step++;
      render();
    };
    const skipBtn = screen.querySelector('#btn-onb-skip');
    if (skipBtn) skipBtn.onclick = () => onDone();
  }

  render();
}
