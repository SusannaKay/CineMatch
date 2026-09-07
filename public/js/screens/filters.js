import { mountScreen, optionIconHTML } from '../utils/dom.js';
import { appState } from '../state.js';
import { setFilters, showToast } from '../socket.js';
import { buildQuestionnaire } from '../data/questionnaire.js';

let lastRenderedStep = -1;

export function renderFilters(onNavigate) {
  const { filtersDraft: answers, filterStep, showAllGenres } = appState;
  const qList = buildQuestionnaire(answers, showAllGenres);
  const q = qList[filterStep];
  const screen = mountScreen('screen-filters', `
    <div class="flex-grow flex flex-col overflow-hidden">
      <div class="flex-grow flex flex-col p-6 overflow-hidden">
        <div class="flex justify-between items-center mb-4">
          <button id="btn-back-f" class="text-slate-400 p-2"><i class="fa-solid fa-arrow-left text-xl"></i></button>
          <div class="text-xs font-bold text-slate-500 tracking-widest uppercase">Passo ${filterStep + 1}/${qList.length}</div>
          <button id="btn-exclude" class="hidden text-xs font-bold px-3 py-1.5 rounded-full border border-slate-600"></button>
        </div>
        <h2 id="q-text" class="text-2xl font-extrabold mb-6"></h2>
        <div id="q-options" class="flex flex-col gap-3 overflow-y-auto pb-6 flex-grow"></div>
      </div>
      <nav id="mode-nav" class="mode-nav flex-shrink-0 h-16 border-t border-slate-800 bg-slate-900/95"></nav>
    </div>
  `);

  const qText = screen.querySelector('#q-text');
  const optionsEl = screen.querySelector('#q-options');
  const excludeBtn = screen.querySelector('#btn-exclude');
  qText.textContent = q.text;

  renderNav(screen, onNavigate, appState.mode || 'solo');

  if (q.isGenreStep && q.excludable) {
    excludeBtn.classList.remove('hidden');
    const excl = answers.genreMode === 'exclude';
    excludeBtn.innerHTML = `<i class="fa-solid fa-filter-circle-xmark mr-1"></i>Escludi${excl ? ' (On)' : ''}`;
    excludeBtn.classList.toggle('text-rose-500', excl);
    excludeBtn.onclick = () => {
      answers.genreMode = excl ? 'include' : 'exclude';
      renderFilters(onNavigate);
    };
  }

  if (lastRenderedStep !== filterStep) {
    appState.tempSelections = q.multiSelect ? [...(answers[q.id] || [])] : [];
    lastRenderedStep = filterStep;
  } else if (!q.multiSelect) {
    appState.tempSelections = [];
  }

  q.options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    const selected = q.multiSelect && appState.tempSelections.includes(opt.value);
    if (selected) btn.classList.add('selected');
    btn.innerHTML = `${optionIconHTML(opt)}<span class="font-semibold text-lg flex-grow">${opt.label}</span>${q.multiSelect ? `<i class="fa-regular ${selected ? 'fa-square-check text-primary' : 'fa-square text-slate-600'} text-xl"></i>` : ''}`;
    if (q.multiSelect) {
      btn.onclick = () => {
        const i = appState.tempSelections.indexOf(opt.value);
        if (i > -1) appState.tempSelections.splice(i, 1);
        else appState.tempSelections.push(opt.value);
        renderFilters(onNavigate);
      };
    } else {
      btn.onclick = () => handleAnswer(q.id, opt.value, qList, onNavigate);
    }
    optionsEl.appendChild(btn);
  });

  if (q.isGenreStep && q.excludable) {
    const t = document.createElement('button');
    t.className = 'w-full py-3 text-sm font-bold text-slate-400 border border-dashed border-slate-700 rounded-xl';
    t.textContent = showAllGenres ? 'Categorie rapide' : 'Mostra tutti i generi';
    t.onclick = () => {
      appState.showAllGenres = !appState.showAllGenres;
      renderFilters(onNavigate);
    };
    optionsEl.appendChild(t);
  }

  if (q.multiSelect) {
    const actions = document.createElement('div');
    actions.className = 'flex gap-4 mt-4 flex-shrink-0';
    actions.innerHTML = '<button id="btn-skip" class="w-1/3 bg-slate-800 text-slate-300 font-bold py-4 rounded-full">Salta</button><button id="btn-confirm" class="w-2/3 bg-primary text-white font-bold py-4 rounded-full">Conferma</button>';
    optionsEl.appendChild(actions);
    actions.querySelector('#btn-skip').onclick = () => handleAnswer(q.id, [], qList, onNavigate);
    actions.querySelector('#btn-confirm').onclick = () => handleAnswer(q.id, [...appState.tempSelections], qList, onNavigate);
  }

  screen.querySelector('#btn-back-f').onclick = () => {
    if (filterStep > 0) {
      appState.filterStep--;
      renderFilters(onNavigate);
    } else {
      onNavigate(appState.mode === 'multiplayer' ? 'lobby' : 'welcome');
    }
  };
}

async function handleAnswer(qId, value, qList, onNavigate) {
  const answers = appState.filtersDraft;
  answers[qId] = value;
  if (qId === 'type') {
    answers.genre = [];
    answers.era = '';
    answers.length = '';
    answers.genreMode = 'include';
    appState.showAllGenres = false;
  }
  if (appState.filterStep < qList.length - 1) {
    appState.filterStep++;
    renderFilters(onNavigate);
    return;
  }
  if (appState.mode === 'solo') {
    try {
      const r = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...answers })
      });
      if (!r.ok) throw new Error();
      appState.soloMovies = await r.json();
      if (!appState.soloMovies.length) throw new Error('empty');
      onNavigate('solo');
    } catch (err) {
      showToast(err.message === 'empty' ? 'Nessun titolo trovato.' : 'Errore nel caricamento dei titoli.');
    }
    return;
  }
  setFilters({ ...answers });
  onNavigate('lobby');
}

function renderNav(screen, onNavigate, active) {
  const nav = screen.querySelector('#mode-nav');
  const items = [
    ['solo', 'Solo', 'fa-user'],
    ['suggestion', 'Suggestion', 'fa-wand-magic-sparkles'],
    ['multiplayer', 'Multiplayer', 'fa-users'],
    ['watchlist', 'Watchlist', 'fa-bookmark']
  ];
  nav.innerHTML = items.map(([id, label, icon]) => `<button data-mode="${id}" class="flex-1 flex flex-col items-center justify-center gap-1 ${active === id ? 'text-primary' : 'text-slate-500'}"><i class="fa-solid ${icon}"></i><span class="text-[10px] font-bold">${label}</span></button>`).join('');
  nav.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.onclick = () => {
      const mode = btn.dataset.mode;
      if (mode === active) return;
      onNavigate(mode);
    };
  });
}
