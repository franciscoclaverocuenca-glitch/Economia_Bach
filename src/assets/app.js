/* Economía · 1.º Bachillerato — comportamiento de la web y de los paquetes SCORM.
   Sin dependencias. Funciona igual en la web (guarda en este navegador) y dentro de
   Moodle (guarda en la plataforma a través de assets/scorm.js). */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const html = document.documentElement;
  const body = document.body;

  /* ───────────────────────── Vista docente ───────────────────────── */
  function vistaDocente() {
    const botones = $$('[data-docente]');
    const pintar = () => {
      const on = html.classList.contains('modo-docente');
      botones.forEach((b) => {
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.textContent = on ? 'Vista alumnado' : 'Vista docente';
      });
    };
    botones.forEach((b) =>
      b.addEventListener('click', () => {
        const on = html.classList.toggle('modo-docente');
        try { localStorage.setItem('eb:docente', on ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
        pintar();
      }),
    );
    pintar();
  }

  /* ───────────────────────── Almacén de progreso ───────────────────────── */
  // Estado por unidad: { v: [páginas vistas], a: { idActividad: { r, c, t, n, h } }, s: resumen }
  function crearAlmacen(unidad) {
    let host = null;
    try {
      const p = window.parent !== window && window.parent.CursoSCORM;
      if (p && p.conectado()) host = p;
    } catch (e) { /* otro origen */ }
    const clave = 'eb:' + unidad;
    let estado;
    if (host) estado = host.leer();
    else {
      try { estado = JSON.parse(localStorage.getItem(clave) || 'null'); } catch (e) { estado = null; }
    }
    estado = estado && typeof estado === 'object' ? estado : {};
    estado.v = Array.isArray(estado.v) ? estado.v : [];
    estado.a = estado.a && typeof estado.a === 'object' ? estado.a : {};
    const paginas = JSON.parse(body.dataset.paginas || '[]');
    const puntuables = JSON.parse(body.dataset.puntuables || '{}');

    function resumen() {
      let c = 0, t = 0, hechos = 0;
      const ids = Object.keys(puntuables);
      for (const id of ids) {
        t += puntuables[id];
        const a = estado.a[id];
        if (a && a.h) { c += a.c; hechos++; }
      }
      const vistas = estado.v.filter((p) => paginas.includes(p)).length;
      return {
        vistas, paginas: paginas.length,
        nota: t ? Math.round((100 * c) / t) : null,
        aciertos: c, total: t,
        cuestionarios: ids.length, hechos,
        completado: vistas >= paginas.length && hechos >= ids.length,
      };
    }
    function guardar() {
      const s = resumen();
      estado.s = { p: s.vistas, P: s.paginas, n: s.nota, c: s.completado ? 1 : 0 };
      if (host) host.escribir(estado, s);
      else try { localStorage.setItem(clave, JSON.stringify(estado)); } catch (e) { /* lleno o bloqueado */ }
      document.dispatchEvent(new CustomEvent('eb:progreso', { detail: s }));
    }
    return {
      enScorm: !!host,
      act: (id) => estado.a[id],
      guardarAct(id, datos) { estado.a[id] = datos; guardar(); },
      visitar(pagina) {
        if (!estado.v.includes(pagina)) estado.v.push(pagina);
        if (host) host.ubicacion(pagina);
        guardar();
      },
      visitadas: () => estado.v.slice(),
      resumen,
      interaccion: (d) => host && host.interaccion(d),
    };
  }

  /* ───────────────────────── Página de unidad ───────────────────────── */
  function paginaUnidad() {
    const almacen = crearAlmacen(body.dataset.unidad);
    const pagina = body.dataset.pagina;

    // índice lateral (móvil)
    const btn = $('.barra-indice');
    const indice = $('#indice');
    if (btn && indice) {
      const cerrar = () => { indice.classList.remove('abierto'); btn.setAttribute('aria-expanded', 'false'); };
      btn.addEventListener('click', () => {
        const ab = indice.classList.toggle('abierto');
        btn.setAttribute('aria-expanded', ab ? 'true' : 'false');
        if (ab) ($('[aria-current]', indice) || $('a', indice)).focus();
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && indice.classList.contains('abierto')) { cerrar(); btn.focus(); } });
      document.addEventListener('click', (e) => { if (indice.classList.contains('abierto') && !indice.contains(e.target) && e.target !== btn) cerrar(); });
    }

    const pintarProgreso = () => {
      const s = almacen.resumen();
      const vis = almacen.visitadas();
      $$('#indice a[data-pag]').forEach((a) => a.parentElement.classList.toggle('visitada', vis.includes(a.dataset.pag)));
      const pct = Math.round((100 * s.vistas) / Math.max(1, s.paginas));
      const barra = $('.progreso');
      if (barra) { barra.setAttribute('aria-valuenow', pct); $('.progreso-barra', barra).style.width = pct + '%'; }
      const est = $('.indice-estado');
      if (est) {
        est.hidden = false;
        $('[data-estado-visitadas]', est).textContent = s.vistas;
        const n = $('[data-estado-nota]', est);
        if (n) n.textContent = s.hechos ? `${s.aciertos}/${s.total} · ${s.hechos} de ${s.cuestionarios} hechos` : `0 de ${s.cuestionarios} hechos`;
      }
    };
    document.addEventListener('eb:progreso', pintarProgreso);
    almacen.visitar(pagina);
    pintarProgreso();

    // abrir el bloque al que apunte el ancla
    const abrirAncla = () => {
      if (!location.hash) return;
      const el = document.getElementById(location.hash.slice(1));
      const det = el && el.closest('details');
      if (det) det.open = true;
    };
    window.addEventListener('hashchange', abrirAncla);
    abrirAncla();

    $$('.act').forEach((el) => { try { iniciarActividad(el, almacen); } catch (e) { console.error(e); } });
    $$('.diapositivas').forEach(iniciarDiapositivas);
    $$('.video[data-youtube]').forEach(iniciarVideo);
    $$('.simulador').forEach((el) => { try { SIMULADORES[el.dataset.simulador]?.(el, JSON.parse(el.dataset.config || '{}')); } catch (e) { console.error(e); } });
  }

  /* ───────────────────────── Actividades ───────────────────────── */
  const normalizar = (s) => String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.,;:¡!¿?"«»()]/g, '').replace(/\s+/g, ' ');
  const textoPlano = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const marcado = (el) => { const i = $('input:checked', el); return i ? i.value : ''; };

  // Cada tipo: leer(el) → respuesta · escribir(el, r) · corregir(r, datos) → [bool por ítem]
  const TIPOS = {
    'verdadero-falso': {
      leer: (el) => $$('.act-item', el).map((it) => marcado(it) || '-').join(''),
      escribir: (el, r) => $$('.act-item', el).forEach((it, i) => { const inp = $(`input[value="${r[i]}"]`, it); if (inp) inp.checked = true; }),
      corregir: (r, d) => d.sol.map((s, i) => r[i] === s),
      vacios: (r) => (r.match(/-/g) || []).length,
      interaccion: { tipo: 'true-false', resp: (r, i) => (r[i] === 'v' ? 't' : r[i] === 'f' ? 'f' : ''), sol: (d, i) => (d.sol[i] === 'v' ? 't' : 'f') },
    },
    test: {
      leer: (el) => $$('.act-item', el).map((it) => $$('input:checked', it).map((i) => i.value).join(',')),
      escribir: (el, r) => $$('.act-item', el).forEach((it, i) => String(r[i] || '').split(',').forEach((v) => { const inp = $(`input[value="${v}"]`, it); if (inp) inp.checked = true; })),
      corregir: (r, d) => d.sol.map((s, i) => String(r[i] || '') === s.join(',')),
      vacios: (r) => r.filter((x) => !x).length,
      interaccion: { tipo: 'choice', resp: (r, i) => String(r[i] || '').split(',').filter(Boolean).map((n) => 'abcdefghij'[n]).join(','), sol: (d, i) => d.sol[i].map((n) => 'abcdefghij'[n]).join(',') },
    },
    rellenar: {
      leer: (el) => $$('.hueco input', el).map((i) => i.value),
      escribir: (el, r) => $$('.hueco input', el).forEach((i, k) => { i.value = r[k] || ''; }),
      corregir: (r, d) => d.sol.map((alts, i) => alts.some((a) => normalizar(a) === normalizar(r[i]))),
      vacios: (r) => r.filter((x) => !String(x).trim()).length,
      items: (el) => $$('.hueco', el),
      interaccion: { tipo: 'fill-in', resp: (r, i) => r[i] || '', sol: (d, i) => d.sol[i][0] },
    },
    emparejar: {
      leer: (el) => $$('.act-item select', el).map((s) => s.value),
      escribir: (el, r) => $$('.act-item select', el).forEach((s, i) => { s.value = r[i] || ''; }),
      corregir: (r, d) => d.sol.map((s, i) => r[i] === s),
      vacios: (r) => r.filter((x) => !x).length,
      interaccion: { tipo: 'matching', resp: (r, i) => `${i}.${r[i]}`, sol: (d, i) => `${i}.${d.sol[i]}` },
    },
    ordenar: {
      leer: (el) => $$('.act-orden .act-item', el).map((li) => li.dataset.v),
      escribir: (el, r) => { const ol = $('.act-orden', el); r.forEach((v) => { const li = $(`.act-item[data-v="${v}"]`, ol); if (li) ol.appendChild(li); }); },
      corregir: (r, d) => r.map((v, i) => v === d.sol[i]),
      vacios: () => 0,
      items: (el) => $$('.act-orden .act-item', el),
      interaccion: { tipo: 'sequencing', resp: (r) => r.join(','), sol: (d) => d.sol.join(','), unica: true },
    },
    clasificar: {
      leer: (el) => $$('.act-item', el).map((it) => marcado(it)),
      escribir: (el, r) => $$('.act-item', el).forEach((it, i) => { const inp = $(`input[value="${r[i]}"]`, it); if (inp) inp.checked = true; }),
      corregir: (r, d) => d.sol.map((s, i) => r[i] === s),
      vacios: (r) => r.filter((x) => !x).length,
      interaccion: { tipo: 'choice', resp: (r, i) => r[i] || '', sol: (d, i) => d.sol[i] },
    },
  };

  function iniciarActividad(el, almacen) {
    const id = el.dataset.act;
    const datos = JSON.parse($('.act-datos', el).textContent);
    if (datos.tipo === 'respuesta-abierta' || datos.tipo === 'autoevaluacion') return iniciarAbierta(el, id, datos, almacen);
    const T = TIPOS[datos.tipo];
    const form = $('.act-form', el);
    const res = $('.act-res', el);
    const bC = $('.act-corregir', el);
    const bR = $('.act-reiniciar', el);
    const items = () => (T.items ? T.items(el) : $$('.act-items > .act-item', el));
    let avisoVacios = false;

    if (datos.tipo === 'ordenar') iniciarOrdenar(el);
    form.addEventListener('submit', (e) => e.preventDefault());
    form.addEventListener('input', () => { avisoVacios = false; });
    form.addEventListener('change', () => { avisoVacios = false; });

    function limpiar() {
      el.classList.remove('bloqueada');
      items().forEach((it) => it.classList.remove('ok', 'mal'));
      $$('.es-correcta,.es-incorrecta', el).forEach((l) => l.classList.remove('es-correcta', 'es-incorrecta'));
      $$('.act-exp', el).forEach((x) => { x.hidden = true; });
      $$('.hueco-sol', el).forEach((x) => { x.hidden = true; x.textContent = ''; });
      $$('input,select', form).forEach((i) => { i.disabled = false; });
    }

    function mostrar(r, aciertos, guardado) {
      items().forEach((it, i) => {
        const ok = datos.tipo === 'ordenar' ? aciertos[i] : aciertos[+(it.dataset.i ?? i)] ?? aciertos[i];
        it.classList.add(ok ? 'ok' : 'mal');
      });
      // opciones: marcar la correcta y la elegida incorrecta
      if (['verdadero-falso', 'test', 'clasificar'].includes(datos.tipo)) {
        $$('.act-item', el).forEach((it, i) => {
          const sol = datos.tipo === 'test' ? datos.sol[i].map(String) : [datos.sol[i]];
          $$('input', it).forEach((inp) => {
            const lab = inp.closest('label');
            if (sol.includes(inp.value)) lab.classList.add('es-correcta');
            else if (inp.checked) lab.classList.add('es-incorrecta');
          });
        });
      }
      if (datos.tipo === 'rellenar') {
        $$('.hueco', el).forEach((h, i) => {
          if (!aciertos[i]) { const s = $('.hueco-sol', h); s.textContent = datos.sol[i][0]; s.hidden = false; }
        });
      }
      $$('.act-exp', el).forEach((x) => { x.hidden = false; });
      const c = aciertos.filter(Boolean).length;
      const t = aciertos.length;
      const n = (guardado && guardado.n) || 1;
      const quedan = datos.intentos ? datos.intentos - n : Infinity;
      res.innerHTML = `<span class="nota-grande">${c}/${t}</span> ` +
        (c === t ? '¡Todo correcto!' : c >= t / 2 ? 'Bien. Revisa las explicaciones de las que has fallado.' : 'Lee con calma las explicaciones.') +
        (datos.puntua ? ' <span class="act-nota">Guardado para la nota.</span>' : '');
      const bloquear = quedan <= 0;
      if (bloquear) {
        el.classList.add('bloqueada');
        $$('input,select', form).forEach((i) => { i.disabled = true; });
      }
      bR.hidden = bloquear;
      bC.hidden = true;
    }

    bC.addEventListener('click', () => {
      const r = T.leer(el);
      const v = T.vacios(r);
      if (v && !avisoVacios) {
        avisoVacios = true;
        res.textContent = `Te ${v === 1 ? 'falta 1 respuesta' : `faltan ${v} respuestas`}. Pulsa «Corregir» otra vez si quieres corregir igualmente.`;
        return;
      }
      const prev = almacen.act(id) || {};
      const aciertos = T.corregir(r, datos);
      const reg = { r, c: aciertos.filter(Boolean).length, t: aciertos.length, n: (prev.n || 0) + 1, h: 1 };
      almacen.guardarAct(id, reg);
      if (datos.puntua) {
        const I = T.interaccion;
        const filas = I.unica ? [0] : aciertos.map((_, i) => i);
        filas.forEach((i) => almacen.interaccion({
          id: `${id}-${i + 1}`, tipo: I.tipo, respuesta: I.resp(r, i), correcta: I.sol(datos, i),
          resultado: I.unica ? (aciertos.every(Boolean) ? 'correct' : 'wrong') : aciertos[i] ? 'correct' : 'wrong',
        }));
      }
      mostrar(r, aciertos, reg);
    });

    bR.addEventListener('click', () => {
      limpiar();
      if (!datos.puntua) {
        form.reset();
        if (datos.tipo === 'ordenar') items().sort(() => Math.random() - 0.5).forEach((li) => li.parentNode.appendChild(li));
      }
      res.textContent = '';
      bC.hidden = false;
      bR.hidden = true;
      ($('input:not([type=hidden]),select', form) || bC).focus();
    });

    const g = almacen.act(id);
    if (g && g.r) {
      T.escribir(el, g.r, datos);
      if (g.h) mostrar(g.r, T.corregir(g.r, datos), g);
    }
  }

  function iniciarOrdenar(el) {
    const ol = $('.act-orden', el);
    ol.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || el.classList.contains('bloqueada')) return;
      const li = b.closest('li');
      if (b.classList.contains('ord-subir') && li.previousElementSibling) ol.insertBefore(li, li.previousElementSibling);
      if (b.classList.contains('ord-bajar') && li.nextElementSibling) ol.insertBefore(li.nextElementSibling, li);
      b.focus();
    });
    let arr = null;
    ol.addEventListener('dragstart', (e) => {
      if (el.classList.contains('bloqueada')) return e.preventDefault();
      arr = e.target.closest('li');
      arr.classList.add('arrastrando');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
    });
    ol.addEventListener('dragend', () => { arr && arr.classList.remove('arrastrando'); arr = null; });
    ol.addEventListener('dragover', (e) => {
      if (!arr) return;
      e.preventDefault();
      const tras = $$('li:not(.arrastrando)', ol).find((li) => e.clientY < li.getBoundingClientRect().top + li.offsetHeight / 2);
      ol.insertBefore(arr, tras || null);
    });
  }

  function iniciarAbierta(el, id, datos, almacen) {
    const res = $('.act-res', el);
    const areas = $$('textarea', el);
    const g = almacen.act(id);
    const auto = datos.tipo === 'autoevaluacion';
    if (g && g.r) {
      areas.forEach((t, i) => { t.value = (g.r.t || [])[i] || ''; });
      (g.r.l || []).forEach((v, i) => { const inp = $(`input[name="${id}-${i}"][value="${v}"]`, el); if (inp) inp.checked = true; });
      if (g.h) { $$('.act-exp', el).forEach((x) => { x.hidden = false; }); res.textContent = 'Guardado.'; }
    }
    $('.act-form', el).addEventListener('submit', (e) => e.preventDefault());
    el.addEventListener('input', () => { res.textContent = ''; });
    $('.act-guardar', el).addEventListener('click', () => {
      const r = { t: areas.map((t) => t.value) };
      if (auto) r.l = datos.criterios.map((_, i) => marcado($(`.act-item[data-i="${i}"]`, el)));
      if (!r.t.some((x) => x.trim()) && !(r.l || []).some(Boolean)) { res.textContent = 'Escribe algo antes de guardar.'; return; }
      almacen.guardarAct(id, { r, h: 1 });
      if (auto) {
        datos.criterios.forEach((c, i) => {
          const nivel = r.l[i] !== '' ? c.niveles[+r.l[i]] : '—';
          almacen.interaccion({ id: `${id}-${c.c}`, tipo: 'likert', respuesta: `${nivel}: ${r.t[i] || ''}`, resultado: 'neutral' });
        });
        if (r.t[datos.criterios.length]) almacen.interaccion({ id: `${id}-mejora`, tipo: 'fill-in', respuesta: r.t[datos.criterios.length], resultado: 'neutral' });
      } else {
        r.t.forEach((t, i) => t && almacen.interaccion({ id: `${id}-${i + 1}`, tipo: 'fill-in', respuesta: t, resultado: 'neutral' }));
      }
      $$('.act-exp', el).forEach((x) => { x.hidden = false; });
      res.textContent = almacen.enScorm ? 'Guardado en la plataforma.' : 'Guardado en este navegador.';
    });
    const bP = $('.act-imprimir', el);
    if (bP) bP.addEventListener('click', () => imprimirAutoevaluacion(el, id, datos));
  }

  function imprimirAutoevaluacion(el, id, datos) {
    const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
    const filas = datos.criterios.map((c, i) => {
      const v = marcado($(`.act-item[data-i="${i}"]`, el));
      return `<h2>Criterio ${esc(c.c)}: ${v !== '' ? esc(c.niveles[+v]) : '(sin nivel)'}</h2><p>${esc($$('textarea', el)[i].value || '—')}</p>`;
    }).join('');
    const mejora = $(`#${id}-mejora`);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html lang="es"><meta charset="utf-8"><title>Autoevaluación</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:720px;margin:30px auto;padding:0 20px}h1{font-size:22px}h2{font-size:17px;margin-top:22px}</style>` +
      `<h1>${esc(document.querySelector('.barra-unidad')?.textContent || '')} · Autoevaluación de cierre</h1><p>Nombre: ______________________ Grupo: ______ Fecha: ${new Date().toLocaleDateString('es-ES')}</p>${filas}` +
      (mejora ? `<h2>Aspecto concreto de mejora</h2><p>${esc(mejora.value || '—')}</p>` : '') + '<script>print()<\/script></html>');
    w.document.close();
  }

  /* ───────────────────────── Diapositivas ───────────────────────── */
  function iniciarDiapositivas(lista) {
    const enlaces = $$('a.diapo', lista);
    enlaces.forEach((a, i) => a.addEventListener('click', (e) => { e.preventDefault(); abrirVisor(enlaces, i, a); }));
  }

  function abrirVisor(enlaces, inicio, origen) {
    let i = inicio;
    const v = document.createElement('div');
    v.className = 'visor';
    v.setAttribute('role', 'dialog');
    v.setAttribute('aria-modal', 'true');
    v.setAttribute('aria-label', 'Diapositivas');
    v.innerHTML = '<div class="visor-cab"><p aria-live="polite"></p><button type="button" data-a="pant" aria-label="Pantalla completa">⛶</button><button type="button" data-a="cerrar" aria-label="Cerrar">✕</button></div>' +
      '<div class="visor-escena"><button type="button" data-a="prev" aria-label="Anterior">‹</button><figure><img alt=""></figure><button type="button" data-a="next" aria-label="Siguiente">›</button></div>';
    document.body.appendChild(v);
    document.body.style.overflow = 'hidden';
    const img = $('img', v);
    const pie = $('p', v);
    const precargar = (k) => { if (enlaces[k]) { const im = new Image(); im.src = enlaces[k].href; } };
    const ir = (k) => {
      i = (k + enlaces.length) % enlaces.length;
      const a = enlaces[i];
      img.src = a.href;
      img.alt = a.dataset.titulo;
      pie.innerHTML = `<b>${i + 1}/${enlaces.length}</b>`;
      pie.appendChild(document.createTextNode(a.dataset.titulo));
      precargar(i + 1); precargar(i - 1);
    };
    const cerrar = () => {
      if (document.fullscreenElement) document.exitFullscreen?.();
      v.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', teclas);
      origen.focus();
    };
    const teclas = (e) => {
      if (e.key === 'Escape') cerrar();
      else if (e.key === 'ArrowRight' || e.key === 'PageDown') ir(i + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') ir(i - 1);
      else if (e.key === 'Tab') { // foco atrapado
        const f = $$('button', v);
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    v.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) { if (e.target === v || e.target.classList.contains('visor-escena')) cerrar(); return; }
      const acc = b.dataset.a;
      if (acc === 'cerrar') cerrar();
      if (acc === 'prev') ir(i - 1);
      if (acc === 'next') ir(i + 1);
      if (acc === 'pant') document.fullscreenElement ? document.exitFullscreen() : v.requestFullscreen?.();
    });
    let x0 = null;
    v.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    v.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) ir(dx < 0 ? i + 1 : i - 1);
      x0 = null;
    });
    document.addEventListener('keydown', teclas);
    ir(inicio);
    $('[data-a="cerrar"]', v).focus();
  }

  /* ───────────────────────── Vídeo (carga al pulsar) ───────────────────────── */
  function iniciarVideo(el) {
    $('.video-play', el).addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${el.dataset.youtube}?autoplay=1&rel=0`;
      f.title = 'Vídeo de YouTube';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen = true;
      $('.video-play', el).replaceWith(f);
      f.focus();
    });
  }

  /* ───────────────────────── Simuladores ───────────────────────── */
  const fmt = (n, d = 2) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
  const SVG = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}, padre) => {
    const e = document.createElementNS(SVG, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (padre) padre.appendChild(e);
    return e;
  };
  const control = (id, etiqueta, min, max, paso, valor, sufijo = '') =>
    `<label for="${id}">${etiqueta} <span class="sim-valor" data-valor="${id}"></span></label><input type="range" id="${id}" min="${min}" max="${max}" step="${paso}" value="${valor}" data-sufijo="${sufijo}">`;

  const SIMULADORES = {
    // Oferta y demanda lineales: Qd = a − b·P ; Qs = c + d·P
    mercado(el, cfg) {
      const prod = cfg.producto || 'el bien';
      const u = cfg.unidad_precio || '€';
      const uq = cfg.unidad_cantidad || 'unidades';
      const PMAX = cfg.precio_max || 10;
      const QMAX = cfg.cantidad_max || 100;
      const base = { a: cfg.demanda?.a ?? 80, b: cfg.demanda?.b ?? 8, c: cfg.oferta?.c ?? 10, d: cfg.oferta?.d ?? 6 };
      const uid = 'sim' + Math.random().toString(36).slice(2, 7);
      el.innerHTML = `<p class="sim-cab">Simulador</p><h3 class="act-titulo">${cfg.titulo || 'Mueve el mercado'}</h3>
        ${cfg.instrucciones ? `<p>${cfg.instrucciones}</p>` : ''}
        <div class="sim-rejilla"><div><svg class="sim-grafico" viewBox="0 0 420 320" role="img" aria-labelledby="${uid}-desc"><desc id="${uid}-desc">Gráfico de oferta y demanda de ${prod}</desc></svg>
        <div class="sim-datos"><div class="sim-dato"><span>Precio de equilibrio</span><strong data-o="p"></strong></div><div class="sim-dato"><span>Cantidad de equilibrio</span><strong data-o="q"></strong></div>
        <div class="sim-dato"><span>Gasto total (P × Q)</span><strong data-o="g"></strong></div><div class="sim-dato"><span>Elasticidad de la demanda</span><strong data-o="e"></strong></div></div></div>
        <div class="sim-controles">
          ${control(uid + '-dd', 'Desplazar la demanda', -40, 40, 1, 0)}
          ${control(uid + '-do', 'Desplazar la oferta', -40, 40, 1, 0)}
          ${control(uid + '-pend', 'Sensibilidad de la demanda al precio', 2, 16, 1, base.b)}
          ${control(uid + '-tope', 'Precio fijado por el Estado (0 = libre)', 0, PMAX, 0.25, 0, ' ' + u)}
          <div class="sim-botones">${(cfg.escenarios || []).map((s, k) => `<button type="button" data-esc="${k}">${s.nombre}</button>`).join('')}<button type="button" data-esc="reset">Volver al inicio</button></div>
          <p class="sim-lectura" aria-live="polite"></p>
        </div></div>`;
      const svg = $('svg', el);
      const W = 420, H = 320, m = { l: 46, r: 14, t: 14, b: 40 };
      const X = (q) => m.l + (q / QMAX) * (W - m.l - m.r);
      const Y = (p) => H - m.b - (p / PMAX) * (H - m.t - m.b);
      const g = svgEl('g', {}, svg);
      const inputs = $$('input[type=range]', el);
      const [iDd, iDo, iPend, iTope] = inputs;
      const linea = (pts, attrs) => svgEl('polyline', { points: pts.map(([q, p]) => `${X(q)},${Y(p)}`).join(' '), fill: 'none', ...attrs }, g);
      const texto = (x, y, t, attrs = {}) => { const e = svgEl('text', { x, y, 'font-size': 12, 'font-family': 'system-ui, sans-serif', ...attrs }, g); e.textContent = t; return e; };
      const curva = (fQ) => { const pts = []; for (let p = 0; p <= PMAX; p += PMAX / 40) { const q = fQ(p); if (q >= 0 && q <= QMAX) pts.push([q, p]); } return pts; };
      function equilibrio(a, b, c, d) { const p = (a - c) / (b + d); return { p, q: a - b * p }; }
      const e0 = equilibrio(base.a, base.b, base.c, base.d);
      function pintar() {
        // la demanda gira sobre el equilibrio inicial al cambiar su sensibilidad al precio
        const b = +iPend.value, d = base.d;
        const a = e0.q + b * e0.p + +iDd.value, c = base.c + +iDo.value;
        const tope = +iTope.value;
        inputs.forEach((i) => { $(`[data-valor="${i.id}"]`, el).textContent = (i === iTope && tope === 0 ? 'libre' : (+i.value > 0 && i !== iPend && i !== iTope ? '+' : '') + i.value + (i.dataset.sufijo || '')); });
        g.innerHTML = '';
        // ejes
        linea([[0, 0], [QMAX, 0]], { stroke: '#6B6257' });
        linea([[0, 0], [0, PMAX]], { stroke: '#6B6257' });
        for (let k = 0; k <= 4; k++) {
          const p = (PMAX * k) / 4, q = (QMAX * k) / 4;
          texto(m.l - 6, Y(p) + 4, fmt(p, PMAX < 20 ? 1 : 0), { 'text-anchor': 'end', fill: '#6B6257' });
          texto(X(q), H - m.b + 16, fmt(q, 0), { 'text-anchor': 'middle', fill: '#6B6257' });
        }
        texto(m.l, m.t + 2, `Precio (${u})`, { fill: '#0F2C3D', 'font-weight': 600, dx: 4 });
        texto(W - m.r, H - 6, `Cantidad (${uq})`, { fill: '#0F2C3D', 'font-weight': 600, 'text-anchor': 'end' });
        // curvas iniciales (tenues) y actuales
        if (+iDd.value || +iPend.value !== base.b) linea(curva((p) => base.a - base.b * p), { stroke: '#1B4B66', 'stroke-width': 2, 'stroke-dasharray': '4 4', opacity: 0.35 });
        if (+iDo.value) linea(curva((p) => base.c + base.d * p), { stroke: '#C1694A', 'stroke-width': 2, 'stroke-dasharray': '4 4', opacity: 0.35 });
        linea(curva((p) => a - b * p), { stroke: '#1B4B66', 'stroke-width': 3 });
        linea(curva((p) => c + d * p), { stroke: '#C1694A', 'stroke-width': 3 });
        const e = equilibrio(a, b, c, d);
        const etD = curva((p) => a - b * p).at(-1) || [0, 0];
        texto(X(Math.max(0, a - b * PMAX * 0.9)) + 4, Y(PMAX * 0.9), 'D', { fill: '#1B4B66', 'font-weight': 700, 'font-size': 15 });
        texto(X(Math.min(QMAX, c + d * PMAX * 0.9)) + 4, Y(PMAX * 0.9), 'O', { fill: '#C1694A', 'font-weight': 700, 'font-size': 15 });
        void etD;
        const lect = [];
        const valido = e.p > 0 && e.q > 0 && e.p <= PMAX && e.q <= QMAX;
        if (valido) {
          linea([[0, e.p], [e.q, e.p], [e.q, 0]], { stroke: '#0F2C3D', 'stroke-dasharray': '3 3' });
          svgEl('circle', { cx: X(e.q), cy: Y(e.p), r: 6, fill: '#0F2C3D' }, g);
          $('[data-o="p"]', el).textContent = `${fmt(e.p)} ${u}`;
          $('[data-o="q"]', el).textContent = `${fmt(e.q, 1)}`;
          $('[data-o="g"]', el).textContent = `${fmt(e.p * e.q, 0)}${cfg.unidad_gasto ? ' ' + cfg.unidad_gasto : ''}`;
          const elas = (b * e.p) / e.q;
          $('[data-o="e"]', el).textContent = `${fmt(elas)} · ${elas > 1 ? 'elástica' : elas < 1 ? 'inelástica' : 'unitaria'}`;
          const dp = e.p - e0.p, dq = e.q - e0.q;
          if (Math.abs(dp) > 0.005 || Math.abs(dq) > 0.05) {
            lect.push(`Respecto al inicio, el precio ${dp > 0 ? 'sube' : 'baja'} de ${fmt(e0.p)} a ${fmt(e.p)} ${u} (${dp > 0 ? '+' : ''}${fmt((100 * dp) / e0.p, 0)} %) y la cantidad ${dq > 0 ? 'aumenta' : 'disminuye'} de ${fmt(e0.q, 1)} a ${fmt(e.q, 1)}.`);
          } else lect.push('El mercado está en su equilibrio inicial. Mueve las curvas para ver qué ocurre.');
        } else {
          ['p', 'q', 'g', 'e'].forEach((k) => { $(`[data-o="${k}"]`, el).textContent = '—'; });
          lect.push('Con estos valores las curvas no se cortan dentro del gráfico.');
        }
        if (tope > 0 && valido) {
          const qd = a - b * tope, qs = c + d * tope;
          linea([[0, tope], [QMAX, tope]], { stroke: '#B3261E', 'stroke-width': 2 });
          texto(W - m.r, Y(tope) - 5, tope < e.p ? 'Precio máximo' : 'Precio mínimo', { fill: '#B3261E', 'text-anchor': 'end', 'font-weight': 600 });
          if (tope < e.p) lect.push(`Con un precio máximo de ${fmt(tope)} ${u}, se demandan ${fmt(Math.max(qd, 0), 1)} pero solo se ofrecen ${fmt(Math.max(qs, 0), 1)}: hay una escasez de ${fmt(Math.max(qd - qs, 0), 1)}.`);
          else if (tope > e.p) lect.push(`Con un precio mínimo de ${fmt(tope)} ${u}, se ofrecen ${fmt(qs, 1)} pero solo se demandan ${fmt(Math.max(qd, 0), 1)}: hay un excedente de ${fmt(Math.max(qs - qd, 0), 1)}.`);
        }
        $('.sim-lectura', el).textContent = lect.join(' ');
      }
      el.addEventListener('input', pintar);
      $('.sim-botones', el).addEventListener('click', (ev) => {
        const b = ev.target.closest('button');
        if (!b) return;
        if (b.dataset.esc === 'reset') { iDd.value = 0; iDo.value = 0; iPend.value = base.b; iTope.value = 0; }
        else {
          const s = cfg.escenarios[+b.dataset.esc];
          iDd.value = s.demanda ?? 0; iDo.value = s.oferta ?? 0; iPend.value = s.sensibilidad ?? base.b; iTope.value = s.precio_fijado ?? 0;
          if (s.explicacion) { pintar(); $('.sim-lectura', el).textContent = s.explicacion + ' ' + $('.sim-lectura', el).textContent; return; }
        }
        pintar();
      });
      pintar();
    },

    // Multiplicador del gasto: ΔY = ΔG / (1 − PMC), ronda a ronda
    multiplicador(el, cfg) {
      const uid = 'sim' + Math.random().toString(36).slice(2, 7);
      el.innerHTML = `<p class="sim-cab">Simulador</p><h3 class="act-titulo">${cfg.titulo || 'El multiplicador, ronda a ronda'}</h3>
        ${cfg.instrucciones ? `<p>${cfg.instrucciones}</p>` : ''}
        <div class="sim-rejilla"><div><svg class="sim-grafico" viewBox="0 0 420 260" role="img" aria-label="Gasto generado en cada ronda"></svg>
        <div class="sim-datos"><div class="sim-dato"><span>Multiplicador</span><strong data-o="k"></strong></div><div class="sim-dato"><span>Efecto total sobre la renta</span><strong data-o="t"></strong></div></div></div>
        <div class="sim-controles">${control(uid + '-g', 'Gasto público inicial (millones €)', 10, 500, 10, cfg.gasto ?? 100)}
        ${control(uid + '-c', 'Propensión marginal al consumo (PMC)', 0.1, 0.95, 0.05, cfg.pmc ?? 0.8)}
        <p class="sim-lectura" aria-live="polite"></p></div></div>`;
      const svg = $('svg', el);
      const [iG, iC] = $$('input', el);
      function pintar() {
        const G = +iG.value, c = +iC.value, k = 1 / (1 - c);
        $(`[data-valor="${iG.id}"]`, el).textContent = G;
        $(`[data-valor="${iC.id}"]`, el).textContent = fmt(c);
        $('[data-o="k"]', el).textContent = fmt(k);
        $('[data-o="t"]', el).textContent = `${fmt(G * k, 0)} M€`;
        svg.innerHTML = '';
        const n = 12, W = 420, H = 260, bw = (W - 40) / n;
        let acum = 0;
        for (let r = 0; r < n; r++) {
          const v = G * c ** r;
          acum += v;
          const h = (v / G) * (H - 50);
          svgEl('rect', { x: 30 + r * bw + 3, y: H - 30 - h, width: bw - 6, height: h, rx: 3, fill: r === 0 ? '#C1694A' : '#1B4B66', opacity: r === 0 ? 1 : 0.85 }, svg);
          const t = svgEl('text', { x: 30 + r * bw + bw / 2, y: H - 12, 'text-anchor': 'middle', 'font-size': 11, fill: '#6B6257' }, svg);
          t.textContent = r + 1;
        }
        const t = svgEl('text', { x: 30, y: 16, 'font-size': 12, fill: '#0F2C3D', 'font-weight': 600 }, svg);
        t.textContent = 'Gasto nuevo en cada ronda';
        $('.sim-lectura', el).textContent = `Cada ronda, las familias gastan el ${fmt(c * 100, 0)} % de la renta nueva que reciben y ahorran el resto. Tras 12 rondas ya se han generado ${fmt(acum, 0)} M€ de los ${fmt(G * k, 0)} M€ totales: el multiplicador vale 1 / (1 − ${fmt(c)}) = ${fmt(k)}.`;
      }
      el.addEventListener('input', pintar);
      pintar();
    },

    // Interés compuesto y efecto de la inflación
    interes(el, cfg) {
      const uid = 'sim' + Math.random().toString(36).slice(2, 7);
      el.innerHTML = `<p class="sim-cab">Simulador</p><h3 class="act-titulo">${cfg.titulo || 'El poder del interés compuesto'}</h3>
        ${cfg.instrucciones ? `<p>${cfg.instrucciones}</p>` : ''}
        <div class="sim-rejilla"><div><svg class="sim-grafico" viewBox="0 0 420 280" role="img" aria-label="Evolución del ahorro"></svg>
        <div class="sim-datos"><div class="sim-dato"><span>Has aportado</span><strong data-o="a"></strong></div><div class="sim-dato"><span>Tendrás</span><strong data-o="f"></strong></div>
        <div class="sim-dato"><span>Intereses ganados</span><strong data-o="i"></strong></div><div class="sim-dato"><span>En euros de hoy</span><strong data-o="r"></strong></div></div></div>
        <div class="sim-controles">${control(uid + '-c', 'Capital inicial (€)', 0, 10000, 100, cfg.capital ?? 1000)}
        ${control(uid + '-m', 'Aportación mensual (€)', 0, 300, 5, cfg.mensual ?? 50)}
        ${control(uid + '-t', 'Interés anual (TAE)', 0, 10, 0.25, cfg.tae ?? 3, ' %')}
        ${control(uid + '-n', 'Años', 1, 40, 1, cfg.anos ?? 10)}
        ${control(uid + '-p', 'Inflación anual', 0, 8, 0.25, cfg.inflacion ?? 2, ' %')}
        <p class="sim-lectura" aria-live="polite"></p></div></div>`;
      const svg = $('svg', el);
      const ins = $$('input', el);
      function pintar() {
        const [C, M, T, N, P] = ins.map((i) => +i.value);
        ins.forEach((i) => { $(`[data-valor="${i.id}"]`, el).textContent = i.value + (i.dataset.sufijo || ''); });
        const rm = (1 + T / 100) ** (1 / 12) - 1;
        const serie = [];
        let s = C, aport = C;
        serie.push([0, s, aport]);
        for (let mes = 1; mes <= N * 12; mes++) { s = s * (1 + rm) + M; aport += M; if (mes % 12 === 0) serie.push([mes / 12, s, aport]); }
        const real = s / (1 + P / 100) ** N;
        $('[data-o="a"]', el).textContent = `${fmt(aport, 0)} €`;
        $('[data-o="f"]', el).textContent = `${fmt(s, 0)} €`;
        $('[data-o="i"]', el).textContent = `${fmt(s - aport, 0)} €`;
        $('[data-o="r"]', el).textContent = `${fmt(real, 0)} €`;
        svg.innerHTML = '';
        const W = 420, H = 280, m = { l: 54, r: 12, t: 16, b: 30 };
        const max = Math.max(...serie.map((x) => x[1]), 1);
        const X = (a) => m.l + (a / N) * (W - m.l - m.r), Y = (v) => H - m.b - (v / max) * (H - m.t - m.b);
        const poly = (k, color, dash) => svgEl('polyline', { points: serie.map((x) => `${X(x[0])},${Y(x[k])}`).join(' '), fill: 'none', stroke: color, 'stroke-width': 3, 'stroke-dasharray': dash || '' }, svg);
        svgEl('line', { x1: m.l, y1: H - m.b, x2: W - m.r, y2: H - m.b, stroke: '#6B6257' }, svg);
        for (let k = 0; k <= 4; k++) { const t = svgEl('text', { x: m.l - 6, y: Y((max * k) / 4) + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#6B6257' }, svg); t.textContent = fmt((max * k) / 4, 0); }
        const tx = svgEl('text', { x: W - m.r, y: H - 8, 'text-anchor': 'end', 'font-size': 11, fill: '#6B6257' }, svg); tx.textContent = `${N} años`;
        poly(2, '#C1694A', '5 4');
        poly(1, '#1B4B66');
        const l1 = svgEl('text', { x: m.l + 6, y: m.t + 4, 'font-size': 12, fill: '#1B4B66', 'font-weight': 600 }, svg); l1.textContent = '— Ahorro con intereses';
        const l2 = svgEl('text', { x: m.l + 6, y: m.t + 20, 'font-size': 12, fill: '#C1694A', 'font-weight': 600 }, svg); l2.textContent = '- - Lo que has aportado';
        $('.sim-lectura', el).textContent = T <= P
          ? `Con un interés del ${fmt(T)} % y una inflación del ${fmt(P)} %, el tipo real es ${fmt(T - P)} %: tu dinero pierde poder de compra aunque el saldo crezca.`
          : `El tipo real es aproximadamente ${fmt(T - P)} % (interés − inflación). Los ${fmt(s, 0)} € de dentro de ${N} años comprarán lo mismo que ${fmt(real, 0)} € hoy.`;
      }
      el.addEventListener('input', pintar);
      pintar();
    },
  };

  /* ───────────────────────── Portada ───────────────────────── */
  function portada() {
    const q = $('#q');
    const contador = $('#contador');
    const tarjetas = $$('.ud');
    const total = tarjetas.length;
    const filtrar = () => {
      const t = normalizar(q.value);
      let n = 0;
      tarjetas.forEach((el) => {
        const ok = !t || normalizar(el.dataset.temas).includes(t);
        el.classList.toggle('oculta', !ok);
        if (ok) n++;
      });
      $$('.trimestre').forEach((s) => { s.hidden = !$$('.ud:not(.oculta)', s).length; });
      contador.textContent = n === total ? `${total} unidades` : `${n} ${n === 1 ? 'unidad' : 'unidades'}`;
      body.classList.toggle('sin-resultados', n === 0);
    };
    q.addEventListener('input', filtrar);
    $('#limpiar').addEventListener('click', () => { q.value = ''; filtrar(); q.focus(); });
    $$('.seg').forEach((a) => {
      const ud = document.getElementById('ud' + a.dataset.ud);
      const on = (v) => ud && ud.classList.toggle('resaltada', v);
      a.addEventListener('mouseenter', () => on(true));
      a.addEventListener('mouseleave', () => on(false));
      a.addEventListener('focus', () => on(true));
      a.addEventListener('blur', () => on(false));
    });
    // progreso guardado en este navegador
    tarjetas.forEach((el) => {
      let e = null;
      try { e = JSON.parse(localStorage.getItem('eb:' + el.dataset.unidad) || 'null'); } catch (err) { /* nada */ }
      if (!e || !e.s || !e.s.p) return;
      const p = $('.ud-progreso', el);
      p.hidden = false;
      p.textContent = e.s.c ? '✓ Completada' : `${e.s.p}/${e.s.P} vistas`;
      if (e.s.c) $(`.seg[data-ud="${el.id.slice(2)}"]`)?.classList.add('hecha');
    });
  }

  /* ───────────────────────── Arranque ───────────────────────── */
  vistaDocente();
  if (body.classList.contains('portada')) portada();
  else if (body.dataset.unidad) paginaUnidad();
})();
