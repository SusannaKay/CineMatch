import { mountScreen } from '../utils/dom.js';

const SLIDES = [
  {
    icon: 'fa-film',
    title: 'Benvenuto su CineMatch',
    html: '<p>Basta litigare su cosa guardare stasera. Scorri, salva, trova qualcosa che vi piacerà davvero. 🍿</p>',
  },
  {
    icon: 'fa-shuffle',
    title: 'Tre modi per scegliere',
    html: `
      <div class="text-left space-y-4">
        <p><i class="fa-solid fa-user text-primary w-6 mr-1"></i><b>Solo</b> — configura i tuoi gusti e scorri un mazzo di titoli su misura.</p>
        <p><i class="fa-solid fa-wand-magic-sparkles text-primary w-6 mr-1"></i><b>Suggestion</b> — cerca un titolo che ami e trova quelli simili.</p>
        <p><i class="fa-solid fa-users text-primary w-6 mr-1"></i><b>Multiplayer</b> — crea una stanza, invita gli amici e trovate insieme il match perfetto.</p>
      </div>
    `,
  },
  {
    icon: 'fa-lightbulb',
    title: 'Qualche consiglio',
    html: `
      <div class="text-left space-y-4">
        <p><i class="fa-solid fa-heart text-primary w-6 mr-1"></i>Ogni "Mi piace" finisce nella tua <b>Watchlist</b>.</p>
        <p><i class="fa-solid fa-shuffle text-primary w-6 mr-1"></i>Non sai scegliere? Prova <b>Sorpresa</b> nella Watchlist.</p>
        <p><i class="fa-solid fa-mobile-screen text-primary w-6 mr-1"></i>Puoi installare CineMatch come app dal tuo browser.</p>
      </div>
    `,
  },
];

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
          <div class="text-slate-300 text-base leading-relaxed max-w-sm">${slide.html}</div>
        </div>
        <div class="flex-shrink-0 p-6 space-y-4">
          <div class="flex justify-center gap-2">
            ${SLIDES.map((_, i) => `<span class="w-2 h-2 rounded-full ${i === step ? 'bg-primary' : 'bg-slate-700'}"></span>`).join('')}
          </div>
          <button id="btn-onb-next" class="w-full bg-primary text-white font-bold py-4 rounded-full text-lg">${isLast ? 'Inizia' : 'Avanti'}</button>
          ${!isLast ? '<button id="btn-onb-skip" class="w-full text-sm text-slate-500 font-bold py-2">Salta</button>' : ''}
        </div>
      </div>
    `);

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
