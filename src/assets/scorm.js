/* Puente SCORM 1.2 — solo se incluye en los paquetes para Moodle.
   index.html (este envoltorio) mantiene la conexión con la plataforma mientras
   las páginas de la unidad se cargan dentro de un iframe. Las páginas llaman a
   window.parent.CursoSCORM para leer y guardar el progreso.

   Qué se envía a Moodle:
   · cmi.core.lesson_status   incomplete → completed (o passed/failed si hay nota mínima)
   · cmi.core.score.raw       % de aciertos en los cuestionarios que cuentan para la nota
   · cmi.core.lesson_location última página vista (para continuar donde se dejó)
   · cmi.suspend_data         progreso y respuestas (máx. 4096 caracteres)
   · cmi.interactions.n.*     cada respuesta de los cuestionarios y de la autoevaluación
   · cmi.core.session_time    tiempo de la sesión */
(function () {
  'use strict';
  var API = null;
  var conectado = false;
  var terminado = false;
  var estado = {};
  var inicio = Date.now();
  var unidad = '';
  var maestria = null;
  var temporizador = null;

  function buscar(win) {
    var n = 0;
    try {
      while (win && !win.API && win.parent && win.parent !== win && n < 12) { n++; win = win.parent; }
      return win && win.API ? win.API : null;
    } catch (e) { return null; }
  }
  function get(k) { try { return String(API.LMSGetValue(k)); } catch (e) { return ''; } }
  function set(k, v) {
    try {
      var ok = API.LMSSetValue(k, String(v));
      if (ok !== 'true' && ok !== true && window.console) console.warn('SCORM', k, API.LMSGetLastError(), API.LMSGetErrorString(API.LMSGetLastError()));
    } catch (e) { /* nada */ }
  }
  function confirmar() {
    clearTimeout(temporizador);
    temporizador = setTimeout(function () { try { API.LMSCommit(''); } catch (e) { /* nada */ } }, 800);
  }
  function tiempo(ms) {
    var s = Math.round(ms / 1000);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    s = s % 60;
    return ('000' + h).slice(-4) + ':' + ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2);
  }
  function hora() {
    var d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
  }

  // suspend_data en SCORM 1.2 admite como mucho 4096 caracteres: si no cabe,
  // se recortan los textos largos (las respuestas completas quedan en interactions).
  function compactar(obj) {
    var json = JSON.stringify(obj);
    var limites = [600, 300, 150, 60, 0];
    for (var i = 0; json.length > 4000 && i < limites.length; i++) {
      json = JSON.stringify(obj, function (k, v) { return typeof v === 'string' && v.length > limites[i] ? v.slice(0, limites[i]) : v; });
    }
    if (json.length > 4000) {
      var copia = JSON.parse(json);
      for (var id in copia.a) if (copia.a[id] && copia.a[id].h) delete copia.a[id].r;
      json = JSON.stringify(copia);
    }
    return json;
  }

  function terminar() {
    if (!conectado || terminado) return;
    terminado = true;
    set('cmi.core.session_time', tiempo(Date.now() - inicio));
    set('cmi.core.exit', 'suspend');
    try { API.LMSCommit(''); API.LMSFinish(''); } catch (e) { /* nada */ }
  }

  window.CursoSCORM = {
    arrancar: function (cfg) {
      unidad = cfg.unidad;
      API = buscar(window) || (window.opener ? buscar(window.opener) : null);
      var destino = cfg.inicio;
      if (API) {
        try { conectado = String(API.LMSInitialize('')) === 'true'; } catch (e) { conectado = false; }
      }
      if (conectado) {
        try { estado = JSON.parse(get('cmi.suspend_data') || '{}') || {}; } catch (e) { estado = {}; }
        var st = get('cmi.core.lesson_status');
        if (!st || st === 'not attempted') set('cmi.core.lesson_status', 'incomplete');
        var m = parseFloat(get('cmi.student_data.mastery_score'));
        maestria = isNaN(m) ? null : m;
        var loc = get('cmi.core.lesson_location');
        if (/^[a-z0-9-]+$/.test(loc)) destino = unidad + '/' + (loc === 'index' ? 'index' : loc) + '.html';
        confirmar();
      } else if (window.console) {
        console.info('SCORM: no se ha encontrado la plataforma; el progreso se guardará en este navegador.');
      }
      document.getElementById('marco').src = destino;
      window.addEventListener('pagehide', terminar);
      window.addEventListener('beforeunload', terminar);
    },
    conectado: function () { return conectado && !terminado; },
    leer: function () { return JSON.parse(JSON.stringify(estado)); },
    escribir: function (nuevo, r) {
      if (!conectado) return;
      estado = nuevo;
      set('cmi.suspend_data', compactar(estado));
      if (r.total) {
        set('cmi.core.score.min', 0);
        set('cmi.core.score.max', 100);
        set('cmi.core.score.raw', r.nota);
      }
      var st = 'incomplete';
      if (r.completado) st = maestria !== null && r.total ? (r.nota >= maestria ? 'passed' : 'failed') : 'completed';
      set('cmi.core.lesson_status', st);
      confirmar();
    },
    ubicacion: function (pagina) {
      if (!conectado) return;
      set('cmi.core.lesson_location', pagina);
      confirmar();
    },
    interaccion: function (d) {
      if (!conectado) return;
      var n = parseInt(get('cmi.interactions._count'), 10) || 0;
      var p = 'cmi.interactions.' + n + '.';
      set(p + 'id', String(d.id).replace(/[^\w.-]/g, '_').slice(0, 255));
      set(p + 'type', d.tipo);
      set(p + 'time', hora());
      if (d.correcta !== undefined) set(p + 'correct_responses.0.pattern', String(d.correcta).slice(0, 255));
      set(p + 'student_response', String(d.respuesta || '').replace(/\s+/g, ' ').slice(0, 255));
      set(p + 'result', d.resultado);
      set(p + 'weighting', d.peso !== undefined ? d.peso : d.resultado === 'neutral' ? 0 : 1);
      confirmar();
    },
  };
})();
