// dnd-app.js - jeu drag & drop nombres→mots + envoi de score au serveur
(() => {
  const LANGS = {
    en: ['one','two','three','four','five','six','seven','eight','nine','ten'],
    fr: ['un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix']
  };

  const numbersRow = document.getElementById('numbersRow');
  const targetsRow = document.getElementById('targetsRow');
  const langSelect = document.getElementById('langSelect');
  const restartBtn = document.getElementById('restartBtn');
  const newGridBtn = document.getElementById('newGridBtn');
  const studentNameInput = document.getElementById('studentName');
  const studentClassSelect = document.getElementById('studentClass');
  const studentNumberInput = document.getElementById('studentNumber');

  const errorsEl = document.getElementById('errors');
  const remainingEl = document.getElementById('remaining');
  const timeEl = document.getElementById('time');
  const messageEl = document.getElementById('message');

  let lang = langSelect.value || 'fr';
  let timerId = null;
  let elapsed = 0;
  let started = false;
  let errors = 0;
  let placedCount = 0;
  const TOTAL = 10;

  function fmtTime(s) { const m = Math.floor(s/60).toString().padStart(2,'0'); const sec = (s%60).toString().padStart(2,'0'); return `${m}:${sec}`; }
  function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } }

  function startTimer(){ if (started) return; started=true; elapsed=0; timeEl.textContent=fmtTime(elapsed); timerId = setInterval(()=>{ elapsed++; timeEl.textContent=fmtTime(elapsed); },1000); }
  function stopTimer(){ if(timerId) clearInterval(timerId); timerId=null; started=false; }

  function updateStatus(){ errorsEl.textContent = errors; remainingEl.textContent = TOTAL - placedCount; }

  function showMessage(html, timeout=1600){ messageEl.innerHTML = html; messageEl.classList.add('show'); if(timeout>0) setTimeout(()=>messageEl.classList.remove('show'), timeout); }

  function buildGrid(){
    stopTimer(); started=false; elapsed=0; timeEl.textContent=fmtTime(0); errors=0; placedCount=0; updateStatus(); messageEl.classList.remove('show');
    numbersRow.innerHTML=''; targetsRow.innerHTML='';
    const nums = Array.from({length:TOTAL},(_,i)=>i+1); shuffle(nums);
    nums.forEach(n=>{
      const div = document.createElement('div');
      div.className='number';
      div.draggable=true;
      div.id='num-'+n;
      div.textContent=n;
      div.dataset.value=String(n);
      div.addEventListener('dragstart', (e)=>{ startTimer(); e.dataTransfer.setData('text/plain', div.id); setTimeout(()=>div.classList.add('dragging'),0); });
      div.addEventListener('dragend', ()=>div.classList.remove('dragging'));
      numbersRow.appendChild(div);
    });

    const words = LANGS[langSelect.value || lang];
    for(let i=0;i<TOTAL;i++){
      const slot = document.createElement('div');
      slot.className='target';
      slot.dataset.value = String(i+1);
      slot.dataset.index = String(i);
      slot.innerHTML = `<div>${words[i]}</div>`;
      slot.addEventListener('dragover', e=>e.preventDefault());
      slot.addEventListener('dragenter', e=>{ e.preventDefault(); slot.classList.add('hover'); });
      slot.addEventListener('dragleave', ()=>slot.classList.remove('hover'));
      slot.addEventListener('drop', e=>{ e.preventDefault(); slot.classList.remove('hover'); const draggedId = e.dataTransfer.getData('text/plain'); if(!draggedId) return; const dragged = document.getElementById(draggedId); if(!dragged) return; handleDrop(dragged, slot); });
      targetsRow.appendChild(slot);
    }

    // restore saved student info
    if (localStorage.getItem('studentName')) studentNameInput.value = localStorage.getItem('studentName');
    if (localStorage.getItem('studentClass')) studentClassSelect.value = localStorage.getItem('studentClass');
    if (localStorage.getItem('studentNumber')) studentNumberInput.value = localStorage.getItem('studentNumber');

    updateStatus();
  }

  function handleDrop(dragged, slot){
    if (slot.classList.contains('occupied')) { slot.classList.add('wrong'); setTimeout(()=>slot.classList.remove('wrong'),300); return; }
    const expected = slot.dataset.value;
    const given = dragged.dataset.value;
    if (expected === given){
      const placed = document.createElement('div');
      placed.className='placed-number';
      placed.textContent = given;
      slot.appendChild(placed);
      slot.classList.add('occupied','correct');
      dragged.draggable = false;
      dragged.setAttribute('aria-hidden','true');
      dragged.style.opacity = '0.2';
      placedCount++; updateStatus(); showMessage('Correct !',900);
      if (placedCount === TOTAL){
        stopTimer();
        showMessage(`Bravo — toutes les cartes placées ! Temps : ${fmtTime(elapsed)} — Erreurs : ${errors}`, 6000);
        // submit
        const name = (studentNameInput && studentNameInput.value.trim()) || (localStorage.getItem('studentName')||'Anonyme');
        const classe = (studentClassSelect && studentClassSelect.value) || (localStorage.getItem('studentClass')||'');
        const number = (studentNumberInput && studentNumberInput.value.trim()) || (localStorage.getItem('studentNumber')||'');
        if (studentNameInput && name) localStorage.setItem('studentName', name);
        if (studentClassSelect && classe) localStorage.setItem('studentClass', classe);
        if (studentNumberInput && number) localStorage.setItem('studentNumber', number);
        submitScoreToServer(name, classe, number, elapsed, errors, 'dnd-numbers');
      }
    } else {
      slot.classList.add('wrong'); setTimeout(()=>slot.classList.remove('wrong'),450);
      dragged.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 350 });
      errors++; updateStatus(); showMessage('Mauvais emplacement',900);
    }
  }

  function submitScoreToServer(name, classe, student_number, seconds, errorsCount, game='dnd'){
    fetch('/submit', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name: name||'Anonyme', classe: classe||'', student_number: student_number||'', time_seconds: seconds, errors: errorsCount, game_type: game })
    }).then(r=>r.json()).then(d=>{ console.log('submit result', d); }).catch(err=>console.error('submit error', err));
  }

  // UI bindings
  langSelect.addEventListener('change', ()=> buildGrid());
  restartBtn.addEventListener('click', ()=> buildGrid());
  newGridBtn.addEventListener('click', ()=> buildGrid());

  // init
  buildGrid();

  // start button: ensure name present
  restartBtn.addEventListener('click', ()=>{
    if (!studentNameInput.value.trim()){
      alert('Entrez le nom de l\'élève avant de démarrer');
      studentNameInput.focus();
      return;
    }
    startTimer();
  });
})();