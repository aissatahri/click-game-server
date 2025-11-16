// app.js - logique principale en JS (français)
document.addEventListener('DOMContentLoaded', () => {

  // --- Zones du clavier (affiche question quand clique) ---
  const zoneQuestion = document.getElementById('zone-question');
  const zones = {
    'zone-fn': { q: "Comment s'appelle la zone en haut (orange) ?", choices: ["Le clavier alphanumérique","Les touches de fonction","Le pavé numérique","Les touches de mouvement"], correct: "Les touches de fonction" },
    'zone-alpha': { q: "Comment s'appelle la grande zone (rouge) ?", choices: ["Le clavier alphanumérique","Les touches de fonction","Le pavé numérique","Les touches de mouvement"], correct: "Le clavier alphanumérique" },
    'zone-navi': { q: "Comment s'appelle la zone bleue ?", choices: ["Le clavier alphanumérique","Les touches de fonction","Le pavé numérique","Les touches de mouvement"], correct: "Les touches de mouvement" },
    'zone-num': { q: "Comment s'appelle la zone violette/numérique ?", choices: ["Le clavier alphanumérique","Les touches de fonction","Le pavé numérique","Les touches de mouvement"], correct: "Le pavé numérique" }
  };

  Object.keys(zones).forEach(id => {
    const el = document.querySelector('.' + id);
    if(!el) return;
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => showZoneQuestion(id));
  });

  function showZoneQuestion(id){
    const data = zones[id];
    zoneQuestion.innerHTML = '';
    const p = document.createElement('p');
    p.textContent = data.q;
    zoneQuestion.appendChild(p);
    data.choices.forEach(ch => {
      const label = document.createElement('label');
      label.style.display = 'block';
      const r = document.createElement('input');
      r.type = 'radio';
      r.name = 'zq';
      r.value = ch;
      label.appendChild(r);
      label.appendChild(document.createTextNode(' ' + ch));
      zoneQuestion.appendChild(label);
    });
    const btn = document.createElement('button');
    btn.textContent = 'Vérifier';
    btn.addEventListener('click', () => {
      const sel = zoneQuestion.querySelector('input[name="zq"]:checked');
      if(!sel){ alert('Choisis une réponse.'); return; }
      if(sel.value === data.correct){
        alert('Bonne réponse !');
      } else {
        alert('Réponse incorrecte. Réponse correcte : ' + data.correct);
      }
    });
    zoneQuestion.appendChild(btn);
    zoneQuestion.classList.remove('hidden');
  }

  // --- Exercice 1: flèches gauche/droite (textarea) ---
  const ex1 = document.getElementById('ex1');
  const ex1Status = document.getElementById('ex1-status');
  const ex1Text = ex1.value;
  const targetWord = 'texte';
  const targetIndex = ex1Text.indexOf(targetWord); // index of t in 'texte'
  // We want caret at the first 'e' of 'texte' => offset targetIndex + 1
  const targetOffset = (targetIndex >= 0) ? targetIndex + 1 : -1;

  ex1.addEventListener('keydown', (ev) => {
    // after keydown, caret will move — use setTimeout to check after event processing
    setTimeout(() => {
      if (ex1.selectionStart === targetOffset) {
        ex1Status.textContent = 'Statut : Bravo, curseur à la lettre "e" du mot "texte" !';
        ex1Status.style.color = 'green';
      } else {
        ex1Status.textContent = 'Statut : position du curseur : ' + ex1.selectionStart;
        ex1Status.style.color = '';
      }
    }, 1);
  });

  document.querySelector('[data-reset="ex1"]').addEventListener('click', () => {
    ex1.value = ex1Text;
    ex1Status.textContent = 'Statut : en attente';
    ex1Status.style.color = '';
  });

  // --- Exercice 2: Backspace / Delete ---
  const ex2 = document.getElementById('ex2');
  const ex2Status = document.getElementById('ex2-status');
  const ex2Initial = ex2.value;

  ex2.addEventListener('keydown', (ev) => {
    setTimeout(() => {
      // If user deleted the initial 'I' at pos 0:
      if (!ex2.value.startsWith('I') && ex2Initial.startsWith('I')) {
        ex2Status.textContent = "Statut : Le 'I' a été supprimé (Retour arrière exécuté).";
        ex2Status.style.color = 'green';
      } else if (ex2.value !== ex2Initial) {
        ex2Status.textContent = "Statut : Le texte a été modifié (suppression détectée).";
        ex2Status.style.color = '';
      } else {
        ex2Status.textContent = "Statut : aucune modification détectée.";
        ex2Status.style.color = '';
      }
    }, 1);
  });

  document.querySelector('[data-reset="ex2"]').addEventListener('click', () => {
    ex2.value = ex2Initial;
    ex2Status.textContent = 'Statut : en attente';
    ex2Status.style.color = '';
  });


  // --- Exercice 3: Majuscules (vérifier premières lettres) ---
  const ex3 = document.getElementById('ex3');
  const ex3Status = document.getElementById('ex3-status');

  document.querySelector('[data-check="ex3"]').addEventListener('click', () => {
    const v = ex3.value.trim();
    if(!v){ ex3Status.textContent = 'Statut : saisis ton prénom et nom.'; return; }
    const parts = v.split(/\s+/);
    const ok = parts.every(p => p[0] && p[0] === p[0].toUpperCase());
    ex3Status.textContent = ok ? 'Statut : Bonne casse des premières lettres ✅' : "Statut : Vérifie que les premières lettres sont en majuscule ❌";
    ex3Status.style.color = ok ? 'green' : 'red';
  });
  document.querySelector('[data-reset="ex3"]').addEventListener('click', () => {
    ex3.value = '';
    ex3Status.textContent = 'Statut : en attente';
    ex3Status.style.color = '';
  });

  // --- Exercice 4: Tabulation (8 zones) ---
  const tabZones = document.querySelectorAll('#tab-zones input');
  const ex4Status = document.getElementById('ex4-status');
  let focusOrder = [];
  tabZones.forEach(el => {
    el.addEventListener('focus', (e) => {
      const n = e.target.getAttribute('data-zone');
      focusOrder.push(n);
      ex4Status.textContent = 'Ordre : ' + focusOrder.join(' → ');
    });
  });
  document.getElementById('ex4-reset').addEventListener('click', () => {
    focusOrder = [];
    ex4Status.textContent = 'Ordre : —';
    tabZones.forEach(i => i.value = '');
  });

  // --- QCM logique (quelques réponses prédéfinies) ---
  const qcmCheck = document.getElementById('qcm-check');
  const qcmReset = document.getElementById('qcm-reset');
  const qcmResult = document.getElementById('qcm-result');

  const qcmAnswers = {
    q1: "Le clavier alphanumérique", // rouge zone -> alphanumérique
    q2: "Les touches de mouvement", // blue -> mouvement
    q3: "Parce que les premières touches sont A Z E R T Y", // AZERTY
    q4: "Home"
  };

  qcmCheck.addEventListener('click', () => {
    const form = document.getElementById('qcm-form');
    const data = new FormData(form);
    let correct = 0, total = 0;
    Object.keys(qcmAnswers).forEach(k => {
      total++;
      const given = data.get(k);
      if(given === qcmAnswers[k]) correct++;
    });
    qcmResult.classList.remove('hidden');
    qcmResult.innerHTML = `<strong>Résultat :</strong> ${correct} / ${total} correct${correct !== 1 ? 's' : ''}.`;
  });

  qcmReset.addEventListener('click', () => {
    document.getElementById('qcm-form').reset();
    qcmResult.classList.add('hidden');
    qcmResult.innerHTML = '';
  });

  // --- Réinitialiser global (optionnel) ---
  // (géré par boutons de chaque exercice)
});