// click-app.js - jeu des types de clics (grille 7x7) + soumission au serveur
(() => {
  const playground = document.getElementById('playground');
  const startBtn = document.getElementById('startBtn');
  const newGridBtn = document.getElementById('newGrid');
  const studentNameInput = document.getElementById('studentName');
  const studentClassSelect = document.getElementById('studentClass');
  const studentNumberInput = document.getElementById('studentNumber');

  const timeEl = document.getElementById('time');
  const errorsEl = document.getElementById('errors');
  const remainingEl = document.getElementById('remaining');
  const messageEl = document.getElementById('message');

  const TYPES = ['left','right','double'];
  const GRID_COLS = 7, GRID_ROWS = 7, GRID_TOTAL = GRID_COLS*GRID_ROWS;
  let timerId = null, elapsedTime = 0, running = false, errors = 0, done = 0;

  // util
  function fmtTime(sec){ const m = Math.floor(sec/60).toString().padStart(2,'0'); const s = (sec%60).toString().padStart(2,'0'); return `${m}:${s}`; }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }

  function updateFooter(){
    errorsEl.textContent = errors;
    remainingEl.textContent = playground.querySelectorAll('.cell:not(.removed)').length;
    timeEl.textContent = fmtTime(elapsedTime);
  }

  function showMessage(html, timeout=1200){
    messageEl.innerHTML = html;
    messageEl.classList.add('show');
    if (timeout>0) setTimeout(()=>messageEl.classList.remove('show'), timeout);
  }

  function clearPlayground(){ playground.innerHTML = ''; }

  function buildGrid(){
    clearPlayground();
    playground.style.gridTemplateColumns = `repeat(${GRID_COLS},1fr)`;
    playground.style.gridTemplateRows = `repeat(${GRID_ROWS},1fr)`;
    // prepare distribution balanced
    const typesArr = [];
    const base = Math.floor(GRID_TOTAL / TYPES.length);
    TYPES.forEach(t=>{ for(let i=0;i<base;i++) typesArr.push(t); });
    let rem = GRID_TOTAL - typesArr.length;
    while(rem>0){ typesArr.push(TYPES[Math.floor(Math.random()*TYPES.length)]); rem--; }
    shuffle(typesArr);
    typesArr.forEach((type,i)=>{
      const btn = document.createElement('button');
      btn.className = `cell ${type}`;
      btn.setAttribute('data-type', type);
      btn.innerText = type === 'left' ? 'Gauche' : type === 'right' ? 'Droit' : 'Double';
      btn.addEventListener('click', onClick);
      btn.addEventListener('dblclick', onDblClick);
      btn.addEventListener('contextmenu', onContextMenu);
      btn._clickTimer = null;
      playground.appendChild(btn);
    });
    errors=0; done=0; elapsedTime=0; running=false; updateFooter();
    showMessage('<strong>Prêt</strong> — configurez les infos et appuyez sur Démarrer.', 2200);
  }

  function startTimer(){
    if (timerId) clearInterval(timerId);
    elapsedTime = 0;
    updateFooter();
    timerId = setInterval(()=>{ elapsedTime++; updateFooter(); }, 1000);
  }
  function stopTimer(){ if(timerId) clearInterval(timerId); timerId=null; }

  function removeCell(el){
    if (!el || el.classList.contains('removed')) return;
    if (el._clickTimer){ clearTimeout(el._clickTimer); el._clickTimer = null; }
    el.classList.add('removed','empty');
    el.style.pointerEvents='none';
    // keep visual placeholder
    el.innerText = '';
    done++;
    updateFooter();
    if (playground.querySelectorAll('.cell:not(.removed)').length === 0) {
      endGame(true);
    }
  }

  function registerError(el, reason){
    errors++;
    el.animate([{transform:'scale(1)'},{transform:'scale(1.04)'},{transform:'scale(1)'}],{duration:200});
    showMessage(`<strong>Erreur</strong> — ${reason}`,900);
    updateFooter();
  }

  // handlers
  function onClick(e){
    if (!running) return;
    const el = e.currentTarget;
    const type = el.getAttribute('data-type');
    if (type === 'double'){
      if (el._clickTimer) return;
      el._clickTimer = setTimeout(()=>{ el._clickTimer=null; registerError(el,'Double-clic attendu'); }, 300);
      return;
    }
    if (type === 'left') removeCell(el);
    else registerError(el,'Clic gauche incorrect');
  }
  function onDblClick(e){
    if (!running) return;
    const el = e.currentTarget;
    const type = el.getAttribute('data-type');
    if (el._clickTimer){ clearTimeout(el._clickTimer); el._clickTimer=null; }
    if (type === 'double') removeCell(el);
    else registerError(el,'Double-clic incorrect');
  }
  function onContextMenu(e){
    if (!running) return;
    e.preventDefault();
    const el = e.currentTarget;
    const type = el.getAttribute('data-type');
    if (type === 'right') removeCell(el);
    else registerError(el,'Clic droit incorrect');
  }

  function endGame(win){
    running=false;
    stopTimer();
    updateFooter();
    // enable buttons
    showMessage(win ? `<strong>Bravo!</strong> Temps: ${fmtTime(elapsedTime)} — Erreurs: ${errors}` : 'Terminé');
    // submit if win
    if (win){
      const name = (studentNameInput && studentNameInput.value.trim()) || (localStorage.getItem('studentName')||'Anonyme');
      const classe = (studentClassSelect && studentClassSelect.value) || (localStorage.getItem('studentClass')||'');
      const number = (studentNumberInput && studentNumberInput.value.trim()) || (localStorage.getItem('studentNumber')||'');
      if (studentNameInput && name) localStorage.setItem('studentName', name);
      if (studentClassSelect && classe) localStorage.setItem('studentClass', classe);
      if (studentNumberInput && number) localStorage.setItem('studentNumber', number);
      submitScoreToServer(name, classe, number, elapsedTime, errors, 'clicks-7x7');
    }
  }

  // submit helper
  function submitScoreToServer(name, classe, student_number, seconds, errorsCount, game='click'){
    fetch('/submit', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name: name||'Anonyme', classe: classe||'', student_number: student_number||'', time_seconds: seconds, errors: errorsCount, game_type: game })
    }).then(r=>r.json()).then(d=>{ console.log('submit result', d); }).catch(err=>console.error('submit error', err));
  }

  // UI buttons
  startBtn.addEventListener('click', ()=>{
    if (!studentNameInput.value.trim()){
      alert('Entrez le nom de l\'élève avant de démarrer');
      studentNameInput.focus();
      return;
    }
    running = true;
    errors = 0;
    done = 0;
    startTimer();
    updateFooter();
    showMessage('Jeu lancé',900);
  });

  newGridBtn.addEventListener('click', ()=>{ buildGrid(); });

  // init
  buildGrid();
  // restore saved names if present
  if (localStorage.getItem('studentName')) studentNameInput.value = localStorage.getItem('studentName');
  if (localStorage.getItem('studentClass')) studentClassSelect.value = localStorage.getItem('studentClass');
  if (localStorage.getItem('studentNumber')) studentNumberInput.value = localStorage.getItem('studentNumber');
})();