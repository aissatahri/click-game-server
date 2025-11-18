// app.js - logique des exercices clavier (ex1..ex6, QCM)
// Version révisée : journaux pour ex5/ex6 (Shift / AltGr), gestion des resets, améliorations accessibilité.

document.addEventListener('DOMContentLoaded', () => {

  // --- Zones / questions ---
  const zoneQuestion = document.getElementById('zone-question');
  const zones = {
    'zone-fn': { q: "Comment s'appelle la zone en haut (orange) ?", choices: ["Le clavier alphanumérique","Les touches de fonction","Le pavé numérique","Les touches de mouvement"], correct: "Les touches de fonction" },
    'zone-alpha': { q: "Comment s'appelle la grande zone (rouge) ?", choices: ["Le clavier alphanumérique","Les touches de fonction","Le pavé numérique","Les touches de mouvement"], correct: "Le clavier alphanumérique" },
    'zone-navi': { q: "Comment s'appelle la zone bleue ?", choices: ["Le clavier alphanumérique","Les touches de fonction","Le pavé numérique","Les touches de mouvement"], correct: "Les touches de mouvement" },
    'zone-num': { q: "Comment s'appelle la zone violette/numérique ?", choices: ["Le clavier alphanumérique","Les touches de fonction","Le pavé numérique","Les touches de mouvement"], correct: "Le pavé numérique" }
  };

  // Attacher click sur zones
  document.querySelectorAll('.overlay .zone').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-zone-id');
      const data = zones[id];
      if (!data) return;
      zoneQuestion.innerHTML = '';
      const p = document.createElement('p'); p.textContent = data.q; zoneQuestion.appendChild(p);
      data.choices.forEach(ch => {
        const label = document.createElement('label'); label.style.display='block';
        const r = document.createElement('input'); r.type='radio'; r.name='zq'; r.value=ch;
        label.appendChild(r); label.appendChild(document.createTextNode(' ' + ch)); zoneQuestion.appendChild(label);
      });
      const btn = document.createElement('button'); btn.textContent = 'Vérifier';
      btn.addEventListener('click', () => {
        const sel = zoneQuestion.querySelector('input[name="zq"]:checked'); if(!sel){ alert('Choisis une réponse.'); return; }
        if(sel.value === data.correct) alert('Bonne réponse !'); else alert('Réponse incorrecte. Réponse correcte : ' + data.correct);
      });
      zoneQuestion.appendChild(btn);
      zoneQuestion.classList.remove('hidden');
    });
  });

  // util insertion
  function insertAtCursor(el, text){
    const start = el.selectionStart, end = el.selectionEnd;
    const v = el.value; el.value = v.slice(0,start) + text + v.slice(end);
    const caret = start + text.length; el.setSelectionRange(caret, caret);
    el.dispatchEvent(new Event('input', {bubbles:true}));
  }

  function isAltGr(e){
    if (typeof e.getModifierState === 'function'){ try { if (e.getModifierState('AltGraph')) return true; } catch(e){} }
    return e.ctrlKey && e.altKey;
  }

  // --- Exercice 1 ---
  const ex1 = document.getElementById('ex1');
  const ex1Status = document.getElementById('ex1-status');
  document.querySelectorAll('[data-reset="ex1"]').forEach(b => b.addEventListener('click', () => {
    if (ex1) { ex1.value = 'Il est possible de faire bouger le curseur de texte'; ex1Status.textContent = 'Statut : en attente'; ex1Status.style.color=''; }
  }));
  // simple surveillance des flèches pour indiquer quand caret atteint la 1ère 'e' du mot 'texte'
  if (ex1) {
    const target = 'texte';
    function checkCaret(){
      const idx = ex1.value.indexOf(target);
      if (idx === -1) return;
      // caret should be at idx+1 (first 'e')
      if (ex1.selectionStart === idx + 1) { ex1Status.textContent = 'Statut : Position correcte ✅'; ex1Status.style.color='green'; }
    }
    ex1.addEventListener('keyup', checkCaret);
    ex1.addEventListener('click', checkCaret);
  }

  // --- Exercice 2 ---
  const ex2 = document.getElementById('ex2');
  const ex2Status = document.getElementById('ex2-status');
  document.querySelectorAll('[data-reset="ex2"]').forEach(b => b.addEventListener('click', () => {
    if (ex2) { ex2.value = "Il n y a vraiment rien de très intéressant sur cette ligne."; ex2Status.textContent = 'Statut : en attente'; ex2Status.style.color=''; }
  }));

  // --- Exercice 3 ---
  const ex3 = document.getElementById('ex3');
  const ex3Status = document.getElementById('ex3-status');
  document.querySelector('[data-check="ex3"]').addEventListener('click', () => {
    const v = (ex3.value || '').trim(); if(!v){ ex3Status.textContent='Statut : saisis ton prénom et nom.'; return; }
    const parts = v.split(/\s+/);
    const ok = parts.every(p => p[0] && p[0] === p[0].toUpperCase());
    ex3Status.textContent = ok ? 'Statut : Bonne casse des premières lettres ✅' : "Statut : Vérifie que les premières lettres sont en majuscule ❌";
    ex3Status.style.color = ok ? 'green' : 'red';
  });
  document.querySelector('[data-reset="ex3"]').addEventListener('click', () => { ex3.value=''; ex3Status.textContent='Statut : en attente'; ex3Status.style.color=''; });

  // --- Exercice 4 Tab ---
  const tabZones = document.querySelectorAll('#tab-zones input');
  const ex4Status = document.getElementById('ex4-status');
  let focusOrder = [];
  tabZones.forEach(el => {
    el.addEventListener('focus', (e) => {
      const n = e.target.getAttribute('data-zone'); focusOrder.push(n); ex4Status.textContent = 'Ordre : ' + focusOrder.join(' → ');
    });
  });
  document.getElementById('ex4-reset').addEventListener('click', () => { focusOrder=[]; ex4Status.textContent='Ordre : —'; tabZones.forEach(i=>i.value=''); });

  // --- Ex5 & Ex6: journaux pour Shift / AltGr ---
  const ex5 = document.getElementById('ex5');
  const ex5Status = document.getElementById('ex5-status');
  const ex5TargetEl = document.getElementById('ex5-target');
  const ex6 = document.getElementById('ex6');
  const ex6Status = document.getElementById('ex6-status');
  const ex6TargetEl = document.getElementById('ex6-target');

  const ex5Target = 'Bonjour, SOS! AZERTY?';
  const ex6Target = '@ #{ } \\ | ~ €';

  if (ex5TargetEl) ex5TargetEl.textContent = ex5Target;
  if (ex6TargetEl) ex6TargetEl.textContent = ex6Target;

  const keyLog = { ex5: [], ex6: [] };

  function bindLoggingForExercise(inputEl, logArray, mode){
    if (!inputEl) return;
    inputEl.addEventListener('keydown', (e) => {
      const rec = { key: e.key };
      if (mode === 'shift') { rec.shift = !!e.shiftKey; try { rec.caps = !!e.getModifierState && e.getModifierState('CapsLock'); } catch(e){} logArray.push(rec); }
      else if (mode === 'altgr') { rec.altgr = isAltGr(e); rec.shift = !!e.shiftKey; logArray.push(rec); }
      if (logArray.length > 500) logArray.shift();
    });
  }

  bindLoggingForExercise(ex5, keyLog.ex5, 'shift');
  bindLoggingForExercise(ex6, keyLog.ex6, 'altgr');

  document.querySelector('[data-check="ex5"]').addEventListener('click', () => {
    const v = ex5.value || ''; if (v !== ex5Target) { ex5Status.textContent = 'Statut : Chaîne différente de la cible ❌'; ex5Status.style.color='red'; return; }
    const logs = keyLog.ex5.slice(); let ok=true, msg=''; let li=0;
    for (let i=0;i<ex5Target.length;i++){
      const ch = ex5Target[i];
      if (ch === ' ') continue;
      while (li < logs.length && (typeof logs[li].key !== 'string' || logs[li].key.length !== 1)) li++;
      if (li >= logs.length){ ok=false; msg='Pas assez d\'événements clavier enregistrés.'; break; }
      const entry = logs[li];
      if (/[A-Z]/.test(ch)) {
        if (!entry.shift) { ok=false; msg='Majuscule produite sans Shift (CapsLock détecté ?).'; break; }
        if (entry.caps) { ok=false; msg='Caps Lock détecté — utilisez Shift.'; break; }
      }
      li++;
    }
    ex5Status.textContent = ok ? 'Statut : Exercice réussi ✅ — Shift utilisé correctement' : 'Statut : Échec ❌ — ' + msg;
    ex5Status.style.color = ok ? 'green' : 'red';
  });

  document.querySelector('[data-reset="ex5"]').addEventListener('click', ()=>{ if (ex5){ ex5.value=''; ex5Status.textContent='Statut : en attente'; ex5Status.style.color=''; keyLog.ex5=[]; } });

  document.querySelector('[data-check="ex6"]').addEventListener('click', () => {
    const v = ex6.value || ''; if (v !== ex6Target) { ex6Status.textContent = 'Statut : Chaîne différente de la cible ❌'; ex6Status.style.color='red'; return; }
    const logs = keyLog.ex6.slice(); let li=0;
    for (let i=0;i<ex6Target.length;i++){
      const ch = ex6Target[i];
      if (ch === ' ') continue;
      if (/[^A-Za-z0-9]/.test(ch)) {
        while (li < logs.length && (typeof logs[li].key !== 'string' || logs[li].key.length !== 1)) li++;
        if (li >= logs.length){ ex6Status.textContent = 'Statut : Pas assez d\'événements clavier enregistrés.'; ex6Status.style.color='red'; return; }
        const entry = logs[li];
        if (!entry.altgr) { ex6Status.textContent = `Statut : Le caractère "${ch}" n'a pas été saisi avec AltGr (ou Ctrl+Alt).`; ex6Status.style.color='red'; return; }
        li++;
      } else { while (li < logs.length && (typeof logs[li].key !== 'string' || logs[li].key.length !== 1)) li++; li++; }
    }
    ex6Status.textContent = 'Statut : Exercice réussi ✅ — AltGr utilisé correctement'; ex6Status.style.color='green';
  });

  document.querySelector('[data-reset="ex6"]').addEventListener('click', ()=>{ if (ex6){ ex6.value=''; ex6Status.textContent='Statut : en attente'; ex6Status.style.color=''; keyLog.ex6=[]; } });

  // --- QCM logique ---
  const qcmCheck = document.getElementById('qcm-check');
  const qcmReset = document.getElementById('qcm-reset');
  const qcmResult = document.getElementById('qcm-result');
  const qcmAnswers = { q1: "Le clavier alphanumérique", q2: "Les touches de mouvement", q3: "Parce que les premières touches sont A Z E R T Y", q4: "Home" };

  qcmCheck.addEventListener('click', () => {
    const form = document.getElementById('qcm-form'); const data = new FormData(form);
    let correct=0,total=0; Object.keys(qcmAnswers).forEach(k=>{ total++; const given=data.get(k); if(given===qcmAnswers[k]) correct++; });
    qcmResult.classList.remove('hidden'); qcmResult.innerHTML = `<strong>Résultat :</strong> ${correct} / ${total} correct${correct !== 1 ? 's' : ''}.`;
  });
  qcmReset.addEventListener('click', ()=>{ document.getElementById('qcm-form').reset(); qcmResult.classList.add('hidden'); });

});