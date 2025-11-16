// app.js - grille fixe 7x7, timer montant et envoi du score au serveur
// Modifié pour inclure 'classe' et 'student_number' (N) lors de la soumission
(() => {
  const playground = document.getElementById('playground');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const messageEl = document.getElementById('message');
  const studentNameInput = document.getElementById('studentName');
  const studentClassSelect = document.getElementById('studentClass');
  const studentNumberInput = document.getElementById('studentNumber');

  const errorsEl = document.getElementById('errors');
  const remainingEl = document.getElementById('remaining');
  const timeEl = document.getElementById('time');
  const retryGridBtn = document.getElementById('retryGrid');
  const newGridBtn = document.getElementById('newGrid');

  const TYPES = ['left', 'right', 'double'];
  let running = false;
  let timerId = null;
  let elapsedTime = 0;
  let errors = 0;
  let done = 0;

  const GRID_COLS = 7, GRID_ROWS = 7, GRID_TOTAL = GRID_COLS * GRID_ROWS;

  function fmtTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function updateFooter() {
    errorsEl.textContent = errors;
    const remaining = playground.querySelectorAll('.cell:not(.removed)').length;
    remainingEl.textContent = remaining;
    timeEl.textContent = fmtTime(elapsedTime);
  }

  function showMessage(html) { messageEl.innerHTML = html; }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  function buildTypesArray(total) {
    const base = Math.floor(total / TYPES.length);
    const arr = [];
    TYPES.forEach(t => { for (let i = 0; i < base; i++) arr.push(t); });
    let rem = total - arr.length;
    while (rem > 0) {
      arr.push(TYPES[Math.floor(Math.random()*TYPES.length)]);
      rem--;
    }
    shuffle(arr);
    return arr;
  }

  function clearPlayground() { playground.innerHTML = ''; }

  function buildFixedGrid() {
    playground.style.gridTemplateColumns = `repeat(${GRID_COLS}, 1fr)`;
    playground.style.gridTemplateRows = `repeat(${GRID_ROWS}, 1fr)`;
    const types = buildTypesArray(GRID_TOTAL);
    clearPlayground();
    types.forEach((type) => {
      const btn = document.createElement('button');
      btn.className = `cell ${type}`;
      btn.setAttribute('data-type', type);
      btn.innerText = labelFor(type);
      btn.addEventListener('click', onClick);
      btn.addEventListener('dblclick', onDblClick);
      btn.addEventListener('contextmenu', onContextMenu);
      btn._clickTimer = null;
      playground.appendChild(btn);
    });
    errors = 0; done = 0;
    updateFooter();
    retryGridBtn.disabled = true;
  }

  function labelFor(t) {
    if (t === 'left') return 'Gauche';
    if (t === 'right') return 'Droit';
    if (t === 'double') return 'Double';
    return t;
  }

  function onClick(e) {
    if (!running) return;
    const el = e.currentTarget;
    const type = el.getAttribute('data-type');
    if (type === 'double') {
      if (el._clickTimer) return;
      el._clickTimer = setTimeout(() => {
        el._clickTimer = null;
        registerError(el, 'Un double-clic était attendu.');
      }, 300);
      return;
    }
    if (type === 'left') removeCell(el);
    else registerError(el, 'Clic gauche incorrect.');
  }

  function onDblClick(e) {
    if (!running) return;
    const el = e.currentTarget;
    const type = el.getAttribute('data-type');
    if (el._clickTimer) { clearTimeout(el._clickTimer); el._clickTimer = null; }
    if (type === 'double') removeCell(el);
    else registerError(el, 'Double-clic incorrect.');
  }

  function onContextMenu(e) {
    const el = e.currentTarget;
    if (!running) return;
    e.preventDefault();
    const type = el.getAttribute('data-type');
    if (type === 'right') removeCell(el);
    else registerError(el, 'Clic droit incorrect.');
  }

  // conserve la position (ne pas retirer du DOM)
  function removeCell(el) {
    if (!el || el.classList.contains('removed')) return;
    if (el._clickTimer) { clearTimeout(el._clickTimer); el._clickTimer = null; }
    el.classList.add('removed');
    el.style.pointerEvents = 'none';
    el.setAttribute('aria-hidden', 'true');
    el.dataset.origText = el.innerText;
    el.innerText = '';
    el.classList.add('empty');
    done++;
    updateFooter();
    checkWin();
  }

  function registerError(el, reason) {
    errors++;
    el.animate([{transform:'scale(1)'},{transform:'scale(1.04)'},{transform:'scale(1)'}],{duration:200});
    showMessage(`<h2>Erreur</h2><p class="small">${reason}</p>`);
    updateFooter();
    setTimeout(() => {
      showMessage('<h2>Consignes</h2><p class="small">Cliquez selon l\'instruction : "Gauche", "Droit", "Double".</p>');
    }, 1200);
  }

  function checkWin() {
    const remaining = playground.querySelectorAll('.cell:not(.removed)').length;
    if (remaining === 0) endGame(true);
  }

  function startTimer() {
    stopTimer();
    elapsedTime = 0;
    updateFooter();
    timerId = setInterval(() => { elapsedTime++; updateFooter(); }, 1000);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  // --- submit score to server (incl. classe et student_number) ---
  function submitScoreToServer(name, classe, student_number, seconds, errorsCount) {
    fetch('/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name || 'Anonyme',
        classe: classe || '',
        student_number: student_number || '',
        time_seconds: seconds,
        errors: errorsCount
      })
    })
    .then(r => r.json())
    .then(data => {
      if (!data.ok) console.warn('Soumission échouée', data);
      else console.log('Score soumis', data.row);
    })
    .catch(err => console.error('Erreur submit', err));
  }

  function endGame(win) {
    running = false;
    stopTimer();
    retryGridBtn.disabled = false;
    startBtn.disabled = false;
    restartBtn.disabled = false;

    const name = (studentNameInput && studentNameInput.value.trim()) || (localStorage.getItem('studentName') || 'Anonyme');
    const classe = (studentClassSelect && studentClassSelect.value) || (localStorage.getItem('studentClass') || '');
    const student_number = (studentNumberInput && studentNumberInput.value.trim()) || (localStorage.getItem('studentNumber') || '');

    if (studentNameInput && name) localStorage.setItem('studentName', name);
    if (studentClassSelect && classe) localStorage.setItem('studentClass', classe);
    if (studentNumberInput && student_number) localStorage.setItem('studentNumber', student_number);

    if (win) {
      showMessage(`<h2>Bravo !</h2><p class="small">Toutes les cases éliminées. Erreurs : ${errors}. Temps : ${fmtTime(elapsedTime)}</p>`);
      // envoyer le score au serveur
      submitScoreToServer(name, classe, student_number, elapsedTime, errors);
    } else {
      const remaining = playground.querySelectorAll('.cell:not(.removed)').length;
      showMessage(`<h2>Terminé</h2><p class="small">Éliminées : ${GRID_TOTAL - remaining} / ${GRID_TOTAL}. Erreurs : ${errors}. Temps écoulé : ${fmtTime(elapsedTime)}</p>`);
    }
  }

  // UI actions
  startBtn.addEventListener('click', () => {
    errors = 0; done = 0;
    if (playground.children.length === 0) buildFixedGrid();
    running = true;
    startBtn.disabled = true;
    restartBtn.disabled = true;
    retryGridBtn.disabled = true;
    showMessage('<h2>Jeu lancé</h2><p class="small">Cliquez sur les cases selon le type affiché.</p>');
    startTimer();
  });

  retryGridBtn.addEventListener('click', () => {
    errors = 0; done = 0;
    running = true;
    startBtn.disabled = true;
    restartBtn.disabled = true;
    buildFixedGrid();
    showMessage('<h2>Grille relancée</h2>');
    startTimer();
    retryGridBtn.disabled = true;
  });

  newGridBtn.addEventListener('click', () => {
    errors = 0; done = 0;
    buildFixedGrid();
    showMessage('<h2>Nouvelle grille (7×7)</h2><p class="small">Cliquez Démarrer pour lancer le chrono.</p>');
    startBtn.disabled = false;
    retryGridBtn.disabled = true;
    stopTimer();
    running = false;
    updateFooter();
  });

  restartBtn.addEventListener('click', () => {
    stopTimer();
    running = false;
    errors = 0; done = 0;
    clearPlayground();
    updateFooter();
    showMessage('<h2>Prêt</h2><p class="small">Cliquez "Une autre grille" ou "Démarrer".</p>');
    startBtn.disabled = false;
    restartBtn.disabled = true;
    retryGridBtn.disabled = true;
  });

  playground.addEventListener('contextmenu', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('cell')) {
      // cell handler will preventDefault when running
    }
  });

  // initial state: restore saved student info if any
  if (localStorage.getItem('studentName')) studentNameInput.value = localStorage.getItem('studentName');
  if (localStorage.getItem('studentClass')) studentClassSelect.value = localStorage.getItem('studentClass');
  if (localStorage.getItem('studentNumber')) studentNumberInput.value = localStorage.getItem('studentNumber');

  buildFixedGrid();
  showMessage('<h2>Consignes</h2><p class="small">Cliquez selon l\'instruction : "Gauche" (clic gauche), "Droit" (clic droit), "Double" (double-clic). Appuie Démarrer pour lancer le chrono.</p>');
  updateFooter();
})();