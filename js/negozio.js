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
  function opzioniLocalita(sel, scelta) {
    if (!sel || !RF.loc) return;
    sel.innerHTML = RF.loc.map(function (l, i) { return '<option value="' + i + '">' + l[0] + ' (' + l[1] + ') · ' + l[2] + ' €</option>'; }).join('');
    sel.value = scelta || 0;
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
    var qta = $('#qta'), loc = $('[data-localita]');
    opzioniLocalita(loc, c.loc);
    var misuraScelta = function () { var r = $('input[name=misura]:checked'); return r ? +r.value : 0; };
    var aggiornaPrezzo = function () {
      var v = p.v[misuraScelta()], l = RF.loc[+loc.value];
      $('[data-prezzo]').textContent = euro(v[1] * Math.max(1, +qta.value || 1));
      $('[data-costo]').textContent = 'Consegna ' + l[2] + ' € · si paga una volta per ordine';
      var testo = 'Buongiorno, vorrei ordinare «' + p.n + '» (' + v[0] + ', ' + v[1] + ' €) x' + (qta.value || 1) + '. Consegna a: ' + l[0] + ', il giorno: … Biglietto: ' + ($('#biglietto').value || '…');
      $('[data-wa]').href = wa(testo);
      $('[data-wa-cordoglio]').href = wa('Buongiorno, vorrei «' + p.n + '» (' + v[0] + ', ' + v[1] + ' €). Testo della fascia: ' + ($('#fascia').value || '…') + '. Chiesa o casa funeraria: … Giorno e ora: …');
    };
    $$('[data-solo-negozio]').forEach(function (el) { el.hidden = cordoglio; });
    $$('[data-solo-cordoglio]').forEach(function (el) { el.hidden = !cordoglio; });
    $('[data-form]').addEventListener('input', aggiornaPrezzo);
    $('[data-meno]').addEventListener('click', function () { qta.value = Math.max(1, (+qta.value || 1) - 1); aggiornaPrezzo(); });
    $('[data-piu]').addEventListener('click', function () { qta.value = Math.min(20, (+qta.value || 1) + 1); aggiornaPrezzo(); });
    loc.addEventListener('change', function () { var cc = leggi(); cc.loc = +loc.value; salva(cc); });
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
    var form = $('[data-ordine]'), locSel = $('[data-localita]', form);
    opzioniLocalita(locSel, leggi().loc);
    var data = $('#c-data'); var oggi = new Date(); data.min = oggi.toISOString().slice(0, 10); data.value = data.min;
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
      var ritiro = form.fascia.value === 'ritiro', l = RF.loc[+locSel.value];
      var cons = ritiro ? 0 : l[2];
      $('[data-subtotale]').textContent = euro(sub);
      $('[data-consegna]').textContent = ritiro ? 'Ritiro in negozio' : euro(cons) + ' · ' + l[0];
      $('[data-totale]').textContent = euro(sub + cons);
      return { c: c, sub: sub, cons: cons, l: l, ritiro: ritiro };
    };
    carrello.addEventListener('click', function (e) {
      var t = e.target, c = leggi();
      if (t.dataset.q) { var r = c.righe[+t.dataset.i]; r.q = Math.max(1, r.q + (+t.dataset.q)); salva(c); disegna(); }
      if (t.dataset.togli) { c.righe.splice(+t.dataset.togli, 1); salva(c); disegna(); }
    });
    form.addEventListener('change', function () { var c = leggi(); c.loc = +locSel.value; salva(c); disegna(); });
    $('[data-paga]').addEventListener('click', function () {
      if (!form.reportValidity()) return;
      $('[data-nota-paga]').hidden = false;
    });
    $('[data-invia-wa]').addEventListener('click', function () {
      if (!form.reportValidity()) return;
      var s = disegna(), f = form;
      var righe = s.c.righe.map(function (r) { var p = RF.p[r.id], v = p.v[r.v] || p.v[0]; return '• ' + r.q + ' x ' + p.n + ' (' + v[0] + ') ' + euro(v[1] * r.q) + (r.b ? ' – biglietto: «' + r.b + '»' : ''); }).join('\n');
      var t = 'Buongiorno, vorrei ordinare:\n' + righe + '\n' + (s.ritiro ? 'Ritiro in negozio' : 'Consegna a ' + f.indirizzo.value + ', ' + s.l[0] + ' (' + euro(s.cons) + ')') +
        '\nGiorno: ' + f.data.value + ', ' + f.fascia.value + '\nDestinatario: ' + f.destinatario.value + ' ' + f.tel_dest.value +
        (f.note.value ? '\nNote: ' + f.note.value : '') + '\nTotale: ' + euro(s.sub + s.cons) + '\nDa: ' + f.nome.value + ' ' + f.tel.value;
      window.open(wa(t), '_blank', 'noopener');
    });
    disegna();
  }

  // consegna: ricerca nella tabella delle località
  var cerca = $('[data-cerca]');
  if (cerca) {
    var righe = $$('[data-tabella] tbody tr');
    cerca.addEventListener('input', function () {
      var q = cerca.value.trim().toLowerCase(), n = 0;
      righe.forEach(function (r) { var ok = !q || r.textContent.toLowerCase().indexOf(q) > -1; r.hidden = !ok; if (ok) n++; });
      $('[data-nessuna]').hidden = n > 0;
    });
  }
})();
