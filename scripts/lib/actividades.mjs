// Actividades interactivas: validación del YAML y HTML de partida.
// El comportamiento (corregir, guardar, puntuar) está en src/assets/app.js.
//
// Tipos: verdadero-falso · test · rellenar · emparejar · ordenar · clasificar
//        respuesta-abierta · autoevaluacion

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const TIPOS = {
  'verdadero-falso': 'Verdadero o falso',
  test: 'Test',
  rellenar: 'Completa los huecos',
  emparejar: 'Relaciona',
  ordenar: 'Ordena',
  clasificar: 'Clasifica',
  'respuesta-abierta': 'Reflexiona',
  autoevaluacion: 'Autoevaluación',
};

const PUNTUABLES = ['verdadero-falso', 'test', 'rellenar', 'emparejar', 'ordenar', 'clasificar'];

/** Barajado estable (mismo orden en cada compilación) a partir del id. */
function barajar(arr, semilla) {
  let h = 2166136261;
  for (const c of semilla) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  // si queda igual que el original, rota uno
  if (a.length > 1 && a.every((x, i) => x === arr[i])) a.push(a.shift());
  return a;
}

function req(cond, msg) {
  if (!cond) throw new Error(msg);
}

export function renderActividad(d, ctx, md) {
  req(d && typeof d === 'object', 'la actividad está vacía');
  req(d.id && /^[a-z0-9-]+$/.test(d.id), `falta «id» o contiene caracteres no válidos (solo minúsculas, números y guiones): «${d.id ?? ''}»`);
  req(TIPOS[d.tipo], `tipo «${d.tipo}» desconocido. Tipos válidos: ${Object.keys(TIPOS).join(', ')}`);
  ctx.registrarActividad(d);

  const il = (s) => md.renderInline(String(s ?? ''));
  const bl = (s) => (s ? md.render(String(s)) : '');
  const puntua = !!d.puntua && PUNTUABLES.includes(d.tipo);
  const intentos = Number.isInteger(d.intentos) ? d.intentos : puntua ? 1 : 0;
  const datos = { tipo: d.tipo, puntua, intentos };
  let cuerpo = '';
  let total = 0;

  switch (d.tipo) {
    case 'verdadero-falso': {
      req(Array.isArray(d.preguntas) && d.preguntas.length, 'faltan «preguntas»');
      datos.sol = d.preguntas.map((p, i) => {
        const r = String(p.respuesta ?? '').toLowerCase();
        req(['verdadero', 'falso', 'v', 'f', 'true', 'false'].includes(r), `pregunta ${i + 1}: «respuesta» debe ser verdadero o falso`);
        return ['verdadero', 'v', 'true'].includes(r) ? 'v' : 'f';
      });
      total = d.preguntas.length;
      cuerpo =
        '<ol class="act-items">' +
        d.preguntas
          .map(
            (p, i) =>
              `<li class="act-item" data-i="${i}"><fieldset><legend>${il(p.enunciado)}</legend><div class="act-opciones act-vf">` +
              `<label><input type="radio" name="${d.id}-${i}" value="v"><span>Verdadero</span></label>` +
              `<label><input type="radio" name="${d.id}-${i}" value="f"><span>Falso</span></label>` +
              `</div></fieldset>${p.explicacion ? `<div class="act-exp" hidden>${il(p.explicacion)}</div>` : ''}</li>`,
          )
          .join('') +
        '</ol>';
      break;
    }
    case 'test': {
      req(Array.isArray(d.preguntas) && d.preguntas.length, 'faltan «preguntas»');
      datos.sol = d.preguntas.map((p, i) => {
        req(Array.isArray(p.opciones) && p.opciones.length >= 2, `pregunta ${i + 1}: necesita al menos dos «opciones»`);
        const c = [].concat(p.correcta ?? p.correctas ?? []);
        req(c.length && c.every((x) => Number.isInteger(x) && x >= 1 && x <= p.opciones.length), `pregunta ${i + 1}: «correcta» debe ser el número (1, 2, 3…) de la opción buena`);
        return c.map((x) => x - 1).sort();
      });
      total = d.preguntas.length;
      cuerpo =
        '<ol class="act-items">' +
        d.preguntas
          .map((p, i) => {
            const multiple = datos.sol[i].length > 1;
            return (
              `<li class="act-item" data-i="${i}"><fieldset><legend>${il(p.enunciado)}${multiple ? ' <span class="act-nota">(varias respuestas)</span>' : ''}</legend><div class="act-opciones">` +
              p.opciones
                .map((o, j) => `<label><input type="${multiple ? 'checkbox' : 'radio'}" name="${d.id}-${i}" value="${j}"><span>${il(o)}</span></label>`)
                .join('') +
              `</div></fieldset>${p.explicacion ? `<div class="act-exp" hidden>${il(p.explicacion)}</div>` : ''}</li>`
            );
          })
          .join('') +
        '</ol>';
      break;
    }
    case 'rellenar': {
      req(typeof d.texto === 'string' && /\[[^\]]+\]/.test(d.texto), '«texto» debe contener huecos entre corchetes, p. ej. «la [demanda] baja»');
      const sol = [];
      let n = 0;
      // [respuesta|alternativa] → hueco
      const conHuecos = d.texto.replace(/\[([^\]]+)\]/g, (_, alt) => {
        const alts = alt.split('|').map((x) => x.trim());
        sol.push(alts);
        const ancho = Math.max(...alts.map((x) => x.length), 4) + 2;
        return `@@HUECO${n++}:${ancho}@@`;
      });
      datos.sol = sol;
      total = sol.length;
      let html = md.render(conHuecos);
      html = html.replace(/@@HUECO(\d+):(\d+)@@/g, (_, i, w) =>
        `<span class="hueco" data-i="${i}"><input type="text" size="${w}" autocomplete="off" spellcheck="false" aria-label="Hueco ${+i + 1}"><span class="hueco-sol" hidden></span></span>`,
      );
      cuerpo = `<div class="act-texto">${html}</div>${d.explicacion ? `<div class="act-exp" hidden>${bl(d.explicacion)}</div>` : ''}`;
      break;
    }
    case 'emparejar': {
      const pares = (d.pares || []).map((p, i) => {
        if (typeof p === 'string') {
          const [a, ...b] = p.split('=');
          req(b.length, `par ${i + 1}: usa el formato «concepto = definición»`);
          return { a: a.trim(), b: b.join('=').trim() };
        }
        req(p.a != null && p.b != null, `par ${i + 1}: necesita «a» y «b»`);
        return { a: String(p.a), b: String(p.b) };
      });
      req(pares.length >= 2, 'necesita al menos dos «pares»');
      const opciones = barajar(pares.map((_, i) => i), d.id);
      datos.sol = pares.map((_, i) => String(i));
      total = pares.length;
      const sel = (i) =>
        `<select name="${d.id}-${i}" aria-label="Relación para: ${esc(pares[i].a.replace(/\*/g, ''))}"><option value="">Elige…</option>` +
        opciones.map((j) => `<option value="${j}">${esc(pares[j].b.replace(/\*/g, ''))}</option>`).join('') +
        '</select>';
      cuerpo =
        '<ol class="act-items act-emparejar">' +
        pares.map((p, i) => `<li class="act-item" data-i="${i}"><span class="emp-a">${il(p.a)}</span><span class="emp-b">${sel(i)}</span></li>`).join('') +
        `</ol>${d.explicacion ? `<div class="act-exp" hidden>${bl(d.explicacion)}</div>` : ''}`;
      break;
    }
    case 'ordenar': {
      req(Array.isArray(d.elementos) && d.elementos.length >= 2, 'necesita al menos dos «elementos» (en el orden correcto)');
      const orden = barajar(d.elementos.map((_, i) => i), d.id);
      datos.sol = d.elementos.map((_, i) => String(i));
      total = d.elementos.length;
      cuerpo =
        '<ol class="act-orden">' +
        orden
          .map(
            (i) =>
              `<li class="act-item" data-v="${i}" draggable="true"><span class="ord-asa" aria-hidden="true">⠿</span><span class="ord-texto">${il(d.elementos[i])}</span>` +
              `<span class="ord-botones"><button type="button" class="ord-subir" aria-label="Subir">↑</button><button type="button" class="ord-bajar" aria-label="Bajar">↓</button></span></li>`,
          )
          .join('') +
        `</ol>${d.explicacion ? `<div class="act-exp" hidden>${bl(d.explicacion)}</div>` : ''}`;
      break;
    }
    case 'clasificar': {
      req(Array.isArray(d.categorias) && d.categorias.length >= 2, 'necesita al menos dos «categorias» con sus «elementos»');
      const items = [];
      d.categorias.forEach((c, ci) => {
        req(c.nombre && Array.isArray(c.elementos), `categoría ${ci + 1}: necesita «nombre» y «elementos»`);
        c.elementos.forEach((e) => items.push({ texto: typeof e === 'object' ? e.texto : String(e), exp: typeof e === 'object' ? e.explicacion : '', cat: ci }));
      });
      const orden = barajar(items.map((_, i) => i), d.id);
      datos.sol = orden.map((i) => String(items[i].cat));
      total = items.length;
      cuerpo =
        '<ol class="act-items act-clasificar">' +
        orden
          .map(
            (i, k) =>
              `<li class="act-item" data-i="${k}"><fieldset><legend>${il(items[i].texto)}</legend><div class="act-opciones act-cats">` +
              d.categorias.map((c, ci) => `<label><input type="radio" name="${d.id}-${k}" value="${ci}"><span>${il(c.nombre)}</span></label>`).join('') +
              `</div></fieldset>${items[i].exp ? `<div class="act-exp" hidden>${il(items[i].exp)}</div>` : ''}</li>`,
          )
          .join('') +
        `</ol>${d.explicacion ? `<div class="act-exp act-exp-final" hidden>${bl(d.explicacion)}</div>` : ''}`;
      break;
    }
    case 'respuesta-abierta': {
      const preguntas = d.preguntas || (d.pregunta ? [{ pregunta: d.pregunta, modelo: d.modelo, ayuda: d.ayuda }] : []);
      req(preguntas.length, 'falta «pregunta» (o una lista de «preguntas»)');
      cuerpo =
        '<ol class="act-items act-abierta">' +
        preguntas
          .map(
            (p, i) =>
              `<li class="act-item" data-i="${i}"><label for="${d.id}-${i}" class="abierta-preg">${il(p.pregunta)}</label>` +
              (p.ayuda ? `<p class="act-nota">${il(p.ayuda)}</p>` : '') +
              `<textarea id="${d.id}-${i}" rows="4"></textarea>` +
              (p.modelo ? `<div class="act-exp" hidden><p class="act-exp-tit">Una respuesta posible</p>${bl(p.modelo)}</div>` : '') +
              '</li>',
          )
          .join('') +
        '</ol>';
      break;
    }
    case 'autoevaluacion': {
      const crits = (d.criterios || []).map(String);
      req(crits.length, 'falta la lista de «criterios» (p. ej. [4.1, 4.2])');
      const rubs = crits.map((c) => {
        const r = ctx.unidad.rubricas.find((x) => String(x.criterio) === c);
        req(r, `no hay rúbrica para el criterio ${c} en unidad.yml`);
        return r;
      });
      cuerpo =
        '<ol class="act-items act-auto">' +
        rubs
          .map(
            (r, i) =>
              `<li class="act-item" data-i="${i}"><fieldset><legend><strong>Criterio ${esc(r.criterio)}</strong> · ¿en qué nivel te sitúas?</legend>` +
              `<p class="act-nota">${il(r.descripcion)}</p><div class="auto-niveles">` +
              r.niveles
                .map(
                  (n, j) =>
                    `<label class="auto-nivel nivel-${j + 1}"><input type="radio" name="${d.id}-${i}" value="${j}"><span class="auto-nom">${esc(n.nivel)}${n.notas ? ` <small>${esc(n.notas)}</small>` : ''}</span><span class="auto-desc">${il(n.descriptor)}</span></label>`,
                )
                .join('') +
              `</div></fieldset><label class="auto-ev" for="${d.id}-${i}-ev">Evidencia concreta de tu propio trabajo</label>` +
              `<textarea id="${d.id}-${i}-ev" rows="3" placeholder="Una producción tuya de esta unidad que justifique ese nivel."></textarea></li>`,
          )
          .join('') +
        (d.mejora !== false
          ? `<li class="act-item act-mejora" data-i="mejora"><label for="${d.id}-mejora" class="abierta-preg"><strong>Un aspecto concreto de mejora</strong></label>` +
            `<p class="act-nota">Concreto: “estudiar más” no vale. Di qué vas a hacer distinto y cuándo.</p><textarea id="${d.id}-mejora" rows="3"></textarea></li>`
          : '') +
        '</ol>';
      datos.criterios = rubs.map((r) => ({ c: String(r.criterio), niveles: r.niveles.map((n) => n.nivel) }));
      break;
    }
  }

  datos.total = total;
  if (puntua) ctx.registrarPuntuable(d.id, total);
  const etiqueta = TIPOS[d.tipo] + (puntua ? ' · cuenta para la nota' : '');
  const abierta = ['respuesta-abierta', 'autoevaluacion'].includes(d.tipo);
  const botones = abierta
    ? `<button type="button" class="boton act-guardar">Guardar</button>` +
      (d.tipo === 'autoevaluacion' ? `<button type="button" class="boton-sec act-imprimir">Descargar o imprimir</button>` : '')
    : `<button type="button" class="boton act-corregir">Corregir</button><button type="button" class="boton-sec act-reiniciar" hidden>Volver a intentarlo</button>`;

  const aviso = d.revisar && ctx.modo !== 'scorm'
    ? '<p class="act-revisar solo-docente">Pendiente: clave de respuestas propuesta en la migración: revísala y quita <code>revisar: true</code>.</p>'
    : '';

  return (
    `<div class="act" id="act-${d.id}" data-act="${d.id}">` +
    `<p class="act-etiqueta">${etiqueta}</p>` +
    (d.titulo ? `<h3 class="act-titulo">${il(d.titulo)}</h3>` : '') +
    aviso +
    (d.instrucciones ? `<div class="act-instr">${bl(d.instrucciones)}</div>` : '') +
    `<form class="act-form" novalidate>${cuerpo}` +
    `<div class="act-pie">${botones}<p class="act-res" role="status" aria-live="polite"></p></div></form>` +
    `<script type="application/json" class="act-datos">${JSON.stringify(datos).replace(/</g, '\\u003c')}</script>` +
    '</div>\n'
  );
}
