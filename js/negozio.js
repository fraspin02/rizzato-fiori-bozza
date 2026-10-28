/* Rizzato Fiori, bozza: carrello in localStorage, filtri del catalogo, scheda prodotto. Niente pagamenti veri. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var RF = window.RF || {};
  var CHIAVE = 'rizzato-carrello';
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var euro = function (n) { return n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €'; };

  function leggi() { try { return JSON.parse(localStorage.getItem(CHIAVE)) || { righe: [], loc: 0 }; } catch (e) { return { righe: [], loc: 0 }; } }
  function salva(c) { try { localStorage.setItem(CHIAVE, JSON.stringify(c)); } catch (e) {} aggiornaConta(c); }
  function aggiornaConta(c) {
    var n = (c || leggi()).righe.reduce(function (a, r) { return a + r.q; }, 0);
    $$('[data-conta]').forEach(function (el) { el.textContent = n; el.hidden = n === 0; });
  }
  function avviso(t) {
    var el = $('.avviso'); if (!el) return;
    el.innerHTML = t; el.hidden = false;
    clearTimeout(avviso.t); avviso.t = setTimeout(function () { el.hidden = true; }, 3200);
  }
  function aggiungi(id, v, q, biglietto) {
    var c = leggi(), p = RF.p[id];
    var r = c.righe.filter(function (x) { return x.id === id && x.v === v && !biglietto; })[0];
    if (r) r.q += q; else c.righe.push({ id: id, v: v, q: q, b: biglietto || '' });
    salva(c);
    avviso('<b>' + p.n + '</b> è nel carrello · <a href="carrello.html">Vai al carrello</a>');
  }
  function srcset(id) { return (RF.img['p' + id] || []).map(function (w) { return 'img/p' + id + '-' + w + '.webp ' + w + 'w'; }).join(', '); }
  // località servite per CAP esatto (5 cifre) o per nome (almeno 2 lettere); restituisce gli indici in RF.loc
  function trovaLocalita(q) {
    q = (q || '').trim().toLowerCase();
    if (!RF.loc || !q) return [];
    var cap = /^\d{5}$/.test(q);
    if (/^\d+$/.test(q) && !cap) return [];
    if (!cap && q.length < 2) return [];
    return RF.loc.map(function (l, i) { return i; }).filter(function (i) {
      var l = RF.loc[i];
      return cap ? l[1] === q : l[0].toLowerCase().indexOf(q) > -1;
    });
  }
  function wa(t) { return 'https://wa.me/' + RF.wa + '?text=' + encodeURIComponent(t); }

  aggiornaConta();

  // pulsanti "Aggiungi" delle card: misura base, quantità 1
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.aggiungi'); if (!b || !RF.p) return;
    aggiungi(b.dataset.id, 0, 1);
  });

  // catalogo: filtri per occasione e ordinamento
  var griglia = $('[data-griglia]');
  if (griglia) {
    var cards = $$('.prodotto', griglia), filtro = new URLSearchParams(location.search).get('occ') || '';
    var applica = function () {
      var n = 0;
      cards.forEach(function (c) { var ok = !filtro || c.dataset.occ === filtro; c.hidden = !ok; if (ok) n++; });
      $$('.chip').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.filtro === filtro)); });
      $('[data-quanti]').textContent = n + (n === 1 ? ' prodotto' : ' prodotti');
      $('[data-nota-cordoglio]').hidden = filtro !== 'cordoglio';
      var u = filtro ? '?occ=' + filtro : location.pathname.split('/').pop();
      history.replaceState(null, '', u);
    };
    $$('.chip').forEach(function (b) { b.addEventListener('click', function () { filtro = b.dataset.filtro; applica(); }); });
    $('[data-ordina]').addEventListener('change', function (e) {
      var v = e.target.value, ord = cards.slice();
      if (v) ord.sort(function (a, b) { return (a.dataset.prezzo - b.dataset.prezzo) * (v === 'su' ? 1 : -1); });
      ord.forEach(function (c) { griglia.appendChild(c); });
    });
    applica();
  }

  // scheda prodotto
  var scheda = $('[data-scheda]');
  if (scheda && RF.p) {
    var id = new URLSearchParams(location.search).get('id');
    var p = RF.p[id];
    if (!p) { id = Object.keys(RF.p)[0]; p = RF.p[id]; }
    var cordoglio = p.o === 'cordoglio', c = leggi();
    document.title = p.n + ' | Rizzato Fiori, Lecce';
    if (cordoglio) document.body.classList.add('scheda-sobria');
    var foto = $('[data-foto]');
    foto.src = 'img/p' + id + '-465.webp'; foto.srcset = srcset(id);
    foto.sizes = '(min-width:960px) 520px, 92vw'; foto.alt = p.n;
    if (!p.f) foto.parentNode.classList.add('serie');
    $('[data-briciola]').textContent = p.n;
    $('[data-occasione]').textContent = RF.occ[p.o];
    $('[data-nome]').textContent = p.n;
    $('[data-desc]').innerHTML = p.d.map(function (d) { return '<p>' + d + '</p>'; }).join('');
    var nastro = $('[data-nastro]');
    if (cordoglio) nastro.remove(); else nastro.innerHTML = (p.da ? '<small>da</small>' : '') + p.p + ' €';
    var misure = $('[data-misure]');
    if (p.v.length < 2) misure.hidden = true;
    misure.insertAdjacentHTML('beforeend', p.v.map(function (v, i) {
      return '<label class="misura"><input type="radio" name="misura" value="' + i + '"' + (i ? '' : ' checked') + '><span><b>' + v[0] + '</b>' + v[1] + ' €</span></label>';
    }).join(''));
    var qta = $('#qta');
    var misuraScelta = function () { var r = $('input[name=misura]:checked'); return r ? +r.value : 0; };
    var aggiornaPrezzo = function () {
      var v = p.v[misuraScelta()];
      $('[data-prezzo]').textContent = euro(v[1] * Math.max(1, +qta.value || 1));
      var testo = 'Buongiorno, vorrei ordinare «' + p.n + '» (' + v[0] + ', ' + v[1] + ' €) x' + (qta.value || 1) + '. Consegna a: … il giorno: … Biglietto: ' + ($('#biglietto').value || '…');
      $('[data-wa]').href = wa(testo);
      $('[data-wa-cordoglio]').href = wa('Buongiorno, vorrei «' + p.n + '» (' + v[0] + ', ' + v[1] + ' €). Testo della fascia: ' + ($('#fascia').value || '…') + '. Chiesa o casa funeraria: … Giorno e ora: …');
    };
    $$('[data-solo-negozio]').forEach(function (el) { el.hidden = cordoglio; });
    $$('[data-solo-cordoglio]').forEach(function (el) { el.hidden = !cordoglio; });
    $('[data-form]').addEventListener('input', aggiornaPrezzo);
    $('[data-meno]').addEventListener('click', function () { qta.value = Math.max(1, (+qta.value || 1) - 1); aggiornaPrezzo(); });
    $('[data-piu]').addEventListener('click', function () { qta.value = Math.min(20, (+qta.value || 1) + 1); aggiornaPrezzo(); });
    $('[data-form]').addEventListener('submit', function (e) {
      e.preventDefault();
      aggiungi(id, misuraScelta(), Math.max(1, +qta.value || 1), $('#biglietto').value.trim());
    });
    aggiornaPrezzo();
    // correlati: stessa occasione
    var altri = Object.keys(RF.p).filter(function (k) { return k !== id && RF.p[k].o === p.o; }).slice(0, 4);
    $('[data-correlati]').innerHTML = altri.map(function (k) {
      var x = RF.p[k];
      return '<li class="prodotto' + (x.f ? '' : ' serie') + (cordoglio ? ' sobrio' : '') + '"><a class="foto" href="prodotto.html?id=' + k + '"><img src="img/p' + k + '-240.webp" srcset="' + srcset(k) + '" sizes="(min-width:960px) 260px, 46vw" width="240" height="310" alt="' + x.n + '" loading="lazy">' +
        (cordoglio ? '' : '<span class="nastro">' + (x.da ? '<small>da</small>' : '') + x.p + ' €</span>') + '</a><h3><a href="prodotto.html?id=' + k + '">' + x.n + '</a></h3></li>';
    }).join('');
  }

  // carrello
  var carrello = $('[data-carrello]');
  if (carrello && RF.p) {
    var form = $('[data-ordine]'), capIn = $('[data-cap]'), locSel = $('[data-localita-cap]'), esito = $('[data-esito]');
    var data = $('#c-data'); var oggi = new Date(); data.min = oggi.toISOString().slice(0, 10); data.value = data.min;
    var stato = leggi();
    if (stato.modo === 'ritiro') form.modo.value = 'ritiro';
    if (stato.cap) capIn.value = stato.cap;
    // dal CAP alle località: se il CAP ne ha una sola si sceglie da sola
    var aggiornaCap = function () {
      var cap = capIn.value.replace(/\D/g, '').slice(0, 5); capIn.value = cap;
      var trovate = /^\d{5}$/.test(cap) ? trovaLocalita(cap) : [];
      var prima = leggi().loc;
      if (!trovate.length) {
        locSel.innerHTML = '<option value="">' + (cap.length === 5 ? 'Nessuna località' : 'Prima il CAP') + '</option>';
        locSel.disabled = true;
        esito.className = 'esito-cap' + (cap.length === 5 ? ' no' : '');
        esito.innerHTML = cap.length === 5 ? 'Non consegniamo ancora a questo CAP. <a href="' + wa('Buongiorno, consegnate anche al CAP ' + cap + '?') + '">Chiedici su WhatsApp</a>: vediamo cosa si può fare.' : '';
        return;
      }
      locSel.disabled = false;
      locSel.innerHTML = (trovate.length > 1 ? '<option value="">Scegli il paese (' + trovate.length + ')</option>' : '') +
        trovate.map(function (i) { var l = RF.loc[i]; return '<option value="' + i + '">' + l[0] + ' · ' + l[2] + ' €</option>'; }).join('');
      if (trovate.indexOf(prima) > -1) locSel.value = prima;
      else if (trovate.length === 1) locSel.value = trovate[0];
    };
    var localitaScelta = function () { return locSel.value === '' ? null : RF.loc[+locSel.value]; };
    var disegna = function () {
      var c = leggi(), vuoto = !c.righe.length;
      $('[data-vuoto]').hidden = !vuoto; form.hidden = vuoto; $('[data-riepilogo]').hidden = vuoto;
      $('[data-righe]').innerHTML = c.righe.map(function (r, i) {
        var p = RF.p[r.id], v = p.v[r.v] || p.v[0];
        return '<li class="riga-carrello"><img src="img/p' + r.id + '-240.webp" width="96" height="124" alt="">' +
          '<div><h3><a href="prodotto.html?id=' + r.id + '">' + p.n + '</a></h3><p>' + v[0] + (r.b ? ' · Biglietto: «' + esc(r.b) + '»' : '') + '</p>' +
          '<div class="qta piccola"><button type="button" data-q="-1" data-i="' + i + '" aria-label="Una in meno">−</button><span>' + r.q + '</span><button type="button" data-q="1" data-i="' + i + '" aria-label="Una in più">+</button></div></div>' +
          '<div class="riga-prezzo"><b>' + euro(v[1] * r.q) + '</b><button type="button" class="togli" data-togli="' + i + '">Rimuovi</button></div></li>';
      }).join('');
      var sub = c.righe.reduce(function (a, r) { var p = RF.p[r.id]; return a + (p.v[r.v] || p.v[0])[1] * r.q; }, 0);
      var ritiro = form.modo.value === 'ritiro', l = localitaScelta();
      var dom = $('[data-domicilio]');
      dom.hidden = ritiro; dom.disabled = ritiro;
      $('[data-etichetta-data]').textContent = ritiro ? 'Giorno del ritiro' : 'Giorno di consegna';
      var cons = ritiro || !l ? 0 : l[2];
      if (!ritiro && l) { esito.className = 'esito-cap si'; esito.textContent = 'Consegna a ' + l[0] + ': ' + euro(l[2]); }
      else if (!ritiro && trovaLocalita(capIn.value).length > 1 && !l) { esito.className = 'esito-cap'; esito.textContent = 'Questo CAP comprende più paesi: scegli il tuo per vedere il costo.'; }
      $('[data-subtotale]').textContent = euro(sub);
      $('[data-consegna]').textContent = ritiro ? 'Ritiro in negozio' : (l ? euro(cons) + ' · ' + l[0] : (locSel.disabled ? 'Inserisci il CAP' : 'Scegli il paese'));
      $('[data-totale]').textContent = euro(sub + cons);
      return { c: c, sub: sub, cons: cons, l: l, ritiro: ritiro };
    };
    carrello.addEventListener('click', function (e) {
      var t = e.target, c = leggi();
      if (t.dataset.q) { var r = c.righe[+t.dataset.i]; r.q = Math.max(1, r.q + (+t.dataset.q)); salva(c); disegna(); }
      if (t.dataset.togli) { c.righe.splice(+t.dataset.togli, 1); salva(c); disegna(); }
    });
    var ricorda = function () { var c = leggi(); c.cap = capIn.value; c.modo = form.modo.value; if (locSel.value !== '') c.loc = +locSel.value; salva(c); };
    capIn.addEventListener('input', function () { aggiornaCap(); ricorda(); disegna(); });
    form.addEventListener('change', function () { ricorda(); disegna(); });
    aggiornaCap();
    $('[data-paga]').addEventListener('click', function () {
      if (!form.reportValidity()) return;
      $('[data-nota-paga]').hidden = false;
    });
    $('[data-invia-wa]').addEventListener('click', function () {
      if (!form.reportValidity()) return;
      var s = disegna(), f = form;
      var righe = s.c.righe.map(function (r) { var p = RF.p[r.id], v = p.v[r.v] || p.v[0]; return '• ' + r.q + ' x ' + p.n + ' (' + v[0] + ') ' + euro(v[1] * r.q) + (r.b ? ' – biglietto: «' + r.b + '»' : ''); }).join('\n');
      var t = 'Buongiorno, vorrei ordinare:\n' + righe + '\n' + (s.ritiro ? 'Ritiro in negozio il ' + f.data.value : 'Consegna a ' + f.indirizzo.value + ', ' + f.cap.value + ' ' + s.l[0] + ' (' + euro(s.cons) + ')' +
        '\nGiorno: ' + f.data.value + ', ' + f.fascia.value + '\nDestinatario: ' + f.destinatario.value + ' ' + f.tel_dest.value) +
        (f.note.value ? '\nNote: ' + f.note.value : '') + '\nTotale: ' + euro(s.sub + s.cons) + '\nDa: ' + f.nome.value + ' ' + f.tel.value;
      window.open(wa(t), '_blank', 'noopener');
    });
    disegna();
  }

  // consegna: calcolo del costo da CAP o nome del paese
  var calcola = $('[data-calcola]');
  if (calcola && RF.loc) {
    var risultati = $('[data-risultati]');
    calcola.addEventListener('input', function () {
      var q = calcola.value.trim(), trovate = trovaLocalita(q);
      if (!q || (/^\d+$/.test(q) && q.length < 5)) { risultati.innerHTML = ''; return; }
      if (!trovate.length) {
        risultati.innerHTML = '<li class="nessuno">Non la troviamo tra le località servite. <a href="' + wa('Buongiorno, consegnate anche a ' + q + '?') + '">Chiedici su WhatsApp</a>.</li>';
        return;
      }
      risultati.innerHTML = trovate.slice(0, 8).map(function (i) {
        var l = RF.loc[i];
        return '<li><span><b>' + l[0] + '</b>CAP ' + l[1] + '</span><strong>' + l[2] + ' €</strong></li>';
      }).join('') + (trovate.length > 8 ? '<li class="nessuno">e altre ' + (trovate.length - 8) + ': scrivi qualche lettera in più.</li>' : '');
    });
  }
})();
