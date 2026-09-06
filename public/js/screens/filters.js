import { mountScreen, optionIconHTML } from '../utils/dom.js';
import { appState } from '../state.js';
import { setFilters } from '../socket.js';
import { buildQuestionnaire } from '../data/questionnaire.js';

export function renderFilters(onNavigate) {
  const { filtersDraft: answers, filterStep, showAllGenres } = appState;
  const qList = buildQuestionnaire(answers, showAllGenres);
  const q = qList[filterStep];

  const screen = mountScreen('screen-filters', `
    <div class="flex-grow flex flex-col p-6 overflow-hidden">
      <div class="flex justify-between items-center mb-4">
        <button id="btn-back-f" class="text-slate-400 hover:text-white p-2">
          <i class="fa-solid fa-arrow-left text-xl"></i>
        </button>
        <div class="text-xs font-bold text-slate-500 tracking-widest uppercase">Passo ${filterStep + 1}/${qList.length}</div>
        <button id="btn-exclude" class="hidden text-xs font-bold px-3 py-1.5 rounded-full border border-slate-600 text-slate-400"></button>
      </div>
      <h2 id="q-text" class="text-2xl font-extrabold mb-6 leading-tight flex-shrink-0"></h2>
      <div id="q-options" class="flex flex-col gap-3 overflow-y-auto pb-6 flex-grow"></div>
    </div>
  `);

  const qText = screen.querySelector('#q-text');
  const optionsEl = screen.querySelector('#q-options');
  const excludeBtn = screen.querySelector('#btn-exclude');

  qText.textContent = q.text;
  qText.classList.toggle('text-rose-400', q.isGenreStep && answers.genreMode === 'exclude');

  if (q.isGenreStep && q.excludable) {
    excludeBtn.classList.remove('hidden');
    const isExcl = answers.genreMode === 'exclude';
    excludeBtn.innerHTML = `<i class="fa-solid fa-filter-circle-xmark mr-1"></i>Escludi${isExcl ? ' (On)' : ''}`;
    excludeBtn.classList.toggle('text-rose-500', isExcl);
    excludeBtn.classList.toggle('border-rose-500', isExcl);
    excludeBtn.onclick = () => {
      answers.genreMode = answers.genreMode === 'exclude' ? 'include' : 'exclude';
      renderFilters(onNavigate);
    };
  }

  appState.tempSelections = q.multiSelect ? [...(answers[q.id] || [])] : [];

  q.options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    const isSelected = q.multiSelect && appState.tempSelections.includes(opt.value);
    if (isSelected) btn.classList.add('selected');
    btn.innerHTML = `${optionIconHTML(opt)}<span class="font-semibold text-lg flex-grow">${opt.label}</span>${
      q.multiSelect ? `<i class="fa-regular ${isSelected ? 'fa-square-check text-primary' : 'fa-square text-slate-600'} text-xl"></i>` : ''
    }`;

    if (q.multiSelect) {
      btn.onclick = () => {
        const idx = appState.tempSelections.indexOf(opt.value);
        if (idx > -1) appState.tempSelections.splice(idx, 1);
        else appState.tempSelections.push(opt.value);
        renderFilters(onNavigate);
      };
    } else {
      btn.onclick = () => handleAnswer(q.id, opt.value, qList, onNavigate);
    }
    optionsEl.appendChild(btn);
  });

  if (q.isGenreStep && q.excludable) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'w-full py-3 text-sm font-bold text-slate-400 border border-dashed border-slate-700 rounded-xl hover:bg-slate-800';
    toggleBtn.innerHTML = showAllGenres
      ? '<i class="fa-solid fa-arrow-rotate-left mr-2"></i>Categorie rapide'
      : '<i class="fa-solid fa-list-ul mr-2"></i>Mostra tutti i generi';
    toggleBtn.onclick = () => {
      appState.showAllGenres = !appState.showAllGenres;
      renderFilters(onNavigate);
    };
    optionsEl.appendChild(toggleBtn);
  }

  if (q.multiSelect) {
    const actions = document.createElement('div');
    actions.className = 'flex gap-4 mt-4 flex-shrink-0';
    actions.innerHTML = `
      <button id="btn-skip" class="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-full text-sm">Salta</button>
      <button id="btn-confirm" class="w-2/3 bg-primary hover:bg-rose-700 text-white font-bold py-4 rounded-full text-sm shadow-lg shadow-primary/30">Conferma</button>
    `;
    optionsEl.appendChild(actions);
    actions.querySelector('#btn-skip').onclick = () => handleAnswer(q.id, [], qList, onNavigate);
    actions.querySelector('#btn-confirm').onclick = () => handleAnswer(q.id, [...appState.tempSelections], qList, onNavigate);
  }

  screen.querySelector('#btn-back-f').onclick = () => {
    if (filterStep > 0) {
      appState.filterStep--;
      if (buildQuestionnaire(answers, showAllGenres)[appState.filterStep].id !== 'genre') {
        appState.showAllGenres = false;
      }
      renderFilters(onNavigate);
    } else {
      onNavigate('lobby');
    }
  };
}

function handleAnswer(qId, value, qList, onNavigate) {
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
  } else {
    setFilters({ ...answers });
    onNavigate('lobby');
  }
}
