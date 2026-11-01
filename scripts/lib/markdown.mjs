import fs from 'node:fs';
// Markdown → HTML con los bloques especiales del curso:
//   ::: nota|aviso|idea|ejemplo Título   …   :::
//   ```actividad      (YAML)  actividades interactivas
//   ```diapositivas   (líneas «fichero | título»)
//   ```rubrica        (número de criterio, p. ej. 4.1)
//   ```video          (URL de YouTube)
//   ```enlace-anonimo (YAML: url, texto, nota)
//   ```simulador      (YAML: tipo: mercado | multiplicador | interes)
import MarkdownIt from 'markdown-it';
import container from 'markdown-it-container';
import yaml from 'js-yaml';
import { renderActividad } from './actividades.mjs';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const CAJAS = ['nota', 'aviso', 'idea', 'ejemplo', 'esquema'];

export function crearMarkdown(ctx) {
  const md = new MarkdownIt({ html: true, linkify: false, typographer: false, breaks: false });

  for (const tipo of CAJAS) {
    md.use(container, tipo, {
      render(tokens, idx) {
        const t = tokens[idx];
        if (t.nesting === 1) {
          const titulo = t.info.trim().slice(tipo.length).trim();
          return `<aside class="caja caja-${tipo}">` + (titulo ? `<p class="caja-titulo">${md.renderInline(titulo)}</p>` : '');
        }
        return '</aside>\n';
      },
    });
  }

  // Enlaces externos: siempre en pestaña nueva (imprescindible dentro de Moodle).
  const linkOpen = md.renderer.rules.link_open || ((tokens, idx, opts, env, self) => self.renderToken(tokens, idx, opts));
  md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
    const href = tokens[idx].attrGet('href') || '';
    if (/^https?:/.test(href)) {
      tokens[idx].attrSet('target', '_blank');
      tokens[idx].attrSet('rel', 'noopener');
    }
    return linkOpen(tokens, idx, opts, env, self);
  };

  const fenceDefault = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const t = tokens[idx];
    const tipo = t.info.trim().split(/\s+/)[0];
    const contenido = t.content;
    try {
      switch (tipo) {
        case 'actividad':
          return renderActividad(cargarYaml(contenido, 'actividad'), ctx, md);
        case 'diapositivas':
          return renderDiapositivas(contenido, ctx);
        case 'rubrica':
          return renderRubrica(contenido.trim(), ctx, md);
        case 'video':
          return renderVideo(contenido);
        case 'enlace-anonimo':
          return renderEnlaceAnonimo(cargarYaml(contenido, 'enlace-anonimo'), ctx);
        case 'descargas':
          return renderDescargas(contenido, ctx);
        case 'mapa-precios':
          return renderMapa(cargarYaml(contenido, 'mapa-precios'), ctx);
        case 'simulador':
          return renderSimulador(cargarYaml(contenido, 'simulador'), ctx, md);
        default:
          return fenceDefault(tokens, idx, opts, env, self);
      }
    } catch (e) {
      ctx.error(`${tipo}: ${e.message}`);
      return `<div class="caja caja-aviso"><p class="caja-titulo">Error en un bloque «${esc(tipo)}»</p><p>${esc(e.message)}</p></div>`;
    }
  };

  return md;
}

function cargarYaml(texto, tipo) {
  try {
    return yaml.load(texto) || {};
  } catch (e) {
    throw new Error(`el YAML del bloque ${tipo} no es válido (${e.reason || e.message}, línea ${(e.mark?.line ?? 0) + 1})`);
  }
}

/** Postproceso del HTML de un bloque: tablas desplazables y enlaces externos en HTML crudo. */
export function postproceso(html) {
  return html
    .replace(/<table>/g, '<div class="tabla" tabindex="0" role="region" aria-label="Tabla"><table>')
    .replace(/<\/table>/g, '</table></div>')
    .replace(/<a href="(https?:[^"]*)"(?![^>]*target=)/g, '<a href="$1" target="_blank" rel="noopener"');
}

function renderDiapositivas(texto, ctx) {
  const items = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [fich, ...resto] = l.split('|');
      return { fich: fich.trim(), titulo: resto.join('|').trim() };
    });
  const lista = items
    .map((it, i) => {
      const img = ctx.imagen(it.fich);
      if (!img) return '';
      const alt = it.titulo || `Diapositiva ${i + 1}`;
      return (
        `<li><a class="diapo" href="${img.src}" data-ancho="${img.ancho}" data-alto="${img.alto}" data-titulo="${esc(alt)}">` +
        `<img src="${img.mini}" width="${img.miniAncho}" height="${img.miniAlto}" alt="${esc(alt)}" loading="lazy" decoding="async">` +
        `<span class="diapo-num">${i + 1}</span><span class="diapo-titulo">${esc(it.titulo)}</span></a></li>`
      );
    })
    .join('');
  return `<ol class="diapositivas" aria-label="Diapositivas (${items.length})">${lista}</ol>\n`;
}

function renderRubrica(criterio, ctx, md) {
  const r = ctx.unidad.rubricas.find((x) => String(x.criterio) === String(criterio));
  if (!r) throw new Error(`no hay rúbrica para el criterio ${criterio} en unidad.yml`);
  const niveles = r.niveles
    .map(
      (n, i) =>
        `<li class="nivel nivel-${i + 1}"><p class="nivel-nombre">${esc(n.nivel)}${n.notas ? ` <span>${esc(n.notas)}</span>` : ''}</p><p>${md.renderInline(n.descriptor)}</p></li>`,
    )
    .join('');
  return (
    `<section class="rubrica" aria-label="Rúbrica del criterio ${esc(r.criterio)}">` +
    `<p class="rubrica-criterio"><strong>Criterio ${esc(r.criterio)}</strong></p>` +
    `<p class="rubrica-desc">${md.renderInline(r.descripcion)}</p>` +
    `<dl class="rubrica-meta solo-docente"><div><dt>Competencia específica</dt><dd>${esc(r.competencia)}</dd></div>` +
    `<div><dt>Saberes básicos</dt><dd>${esc(r.saberes)}</dd></div>` +
    `<div><dt>Descriptores operativos</dt><dd>${esc(String(r.descriptores).replace(/\//g, ' · '))}</dd></div></dl>` +
    `<ol class="rubrica-niveles">${niveles}</ol></section>\n`
  );
}

function idYoutube(url) {
  const m = url.match(/(?:embed\/|watch\?v=|youtu\.be\/)([\w-]{11})/);
  return m && m[1];
}

function tarjetaVideo(id, titulo, autor) {
  return (
    `<div class="video" data-youtube="${id}">` +
    `<button type="button" class="video-play" aria-label="Reproducir${titulo ? ` «${esc(titulo)}»` : ' el vídeo'} (se carga desde YouTube)">` +
    `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" width="480" height="360" loading="lazy">` +
    `<span class="video-icono" aria-hidden="true"></span></button>` +
    (titulo ? `<p class="video-titulo">${esc(titulo)}</p>` : '') +
    `<p class="video-pie">${autor ? `${esc(autor)} · ` : ''}<a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">Abrir en YouTube</a></p></div>`
  );
}

// Una línea por vídeo: «url» o «url | título | canal · duración»
function renderVideo(contenido) {
  const lineas = contenido.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items = lineas.map((l) => {
    const [url, titulo, autor] = l.split('|').map((x) => x.trim());
    const id = idYoutube(url);
    if (!id) return `<p><a href="${esc(url)}" target="_blank" rel="noopener">${esc(titulo || 'Ver el vídeo')}</a></p>`;
    return tarjetaVideo(id, titulo, autor);
  });
  return items.length > 1 ? `<div class="videos">${items.join('')}</div>\n` : `${items[0] || ''}\n`;
}

function renderEnlaceAnonimo(d, ctx) {
  if (!d.url) throw new Error('falta «url»');
  return (
    `<div class="enlace-anonimo"><p>${esc(d.nota || '')}</p>` +
    `<a class="boton" href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.texto || 'Abrir')} <span aria-hidden="true">↗</span></a></div>\n`
  );
}

function renderSimulador(d, ctx, md) {
  if (d.titulo) d.titulo = md.renderInline(String(d.titulo));
  if (d.instrucciones) d.instrucciones = md.renderInline(String(d.instrucciones));
  for (const e of d.escenarios || []) e.nombre = esc(e.nombre);
  const tipos = ['mercado', 'multiplicador', 'interes'];
  if (!tipos.includes(d.tipo)) throw new Error(`tipo de simulador desconocido «${d.tipo}» (usa: ${tipos.join(', ')})`);
  return (
    `<div class="simulador" data-simulador="${esc(d.tipo)}" data-config="${esc(JSON.stringify(d))}">` +
    `<p class="sin-js">Este simulador necesita JavaScript.</p></div>\n`
  );
}

// Mapa coroplético de los distritos de Málaga para recoger datos en clase
let GEO = null;
function geoMalaga() {
  if (!GEO) GEO = JSON.parse(fs.readFileSync(new URL('../datos/malaga-distritos.json', import.meta.url), 'utf8'));
  return GEO;
}
const VARIABLES_MAPA = [
  { clave: 'alquiler', nombre: 'Alquiler medio', unidad: '€/mes' },
  { clave: 'compra', nombre: 'Precio de compra', unidad: '€/m²' },
  { clave: 'anuncios', nombre: 'Anuncios disponibles', unidad: 'anuncios' },
  { clave: 'superficie', nombre: 'Superficie media', unidad: 'm²' },
];
function renderMapa(d, ctx) {
  if (!d.id || !/^[a-z0-9-]+$/.test(d.id)) throw new Error('falta «id» (minúsculas, números y guiones)');
  const g = geoMalaga();
  const vars = d.variables || VARIABLES_MAPA;
  ctx.registrarActividad({ id: d.id, tipo: 'mapa', titulo: d.titulo || 'Mapa de precios' });
  const conf = { id: d.id, vars, ref: d.referencia || null, distritos: g.distritos.map((x) => ({ n: x.n, nombre: x.nombre })) };
  const paths = g.distritos.map((x) => `<path d="${x.d}" data-n="${x.n}" tabindex="0" role="button" aria-label="${esc(x.nombre)}"><title>${esc(x.nombre)}</title></path>`).join('');
  const etiquetas = g.distritos.map((x) => `<text x="${x.cx}" y="${x.cy}" data-n="${x.n}">${x.n}</text>`).join('');
  const filas = g.distritos
    .map((x) => `<tr data-n="${x.n}"><th scope="row"><span class="mapa-num">${x.n}</span> ${esc(x.nombre)}</th>${vars.map((v) => `<td><input type="number" inputmode="decimal" min="0" step="any" data-n="${x.n}" data-v="${esc(v.clave)}" aria-label="${esc(v.nombre)} en ${esc(x.nombre)} (${esc(v.unidad)})"></td>`).join('')}</tr>`)
    .join('');
  return (
    `<div class="mapa" data-mapa="${esc(d.id)}" data-config="${esc(JSON.stringify(conf))}">` +
    `<p class="act-etiqueta">Mapa colectivo</p><p class="act-titulo">${esc(d.titulo || 'El mapa de precios de Málaga')}</p>` +
    (d.instrucciones ? `<div class="act-instr"><p>${esc(d.instrucciones)}</p></div>` : '') +
    `<div class="mapa-rejilla"><figure class="mapa-fig"><div class="mapa-controles"><label>Colorear por <select data-mapa-var>${vars.map((v) => `<option value="${esc(v.clave)}">${esc(v.nombre)} (${esc(v.unidad)})</option>`).join('')}</select></label></div>` +
    `<svg viewBox="0 0 ${g.ancho} ${g.alto}" class="mapa-svg" role="group" aria-label="Distritos de Málaga">${paths}<g class="mapa-etq" aria-hidden="true">${etiquetas}</g></svg>` +
    `<div class="mapa-leyenda" aria-hidden="true"><span data-min>–</span><i></i><span data-max>–</span></div>` +
    `<figcaption>Distritos municipales. Fuente de la cartografía: ${esc(g.fuente)}.</figcaption><p class="mapa-info" aria-live="polite">Pasa por encima de un distrito o selecciónalo para ver sus datos.</p></figure>` +
    `<div class="mapa-lado"><p class="mapa-sub">Ranking</p><ol class="mapa-ranking"></ol></div></div>` +
    `<details class="mapa-datos"><summary>Introducir o revisar los datos de cada distrito</summary><div class="tabla"><table><thead><tr><th>Distrito</th>${vars.map((v) => `<th>${esc(v.nombre)}<br><small>${esc(v.unidad)}</small></th>`).join('')}</tr></thead><tbody>${filas}</tbody></table></div>` +
    `<p class="act-pie"><button type="button" class="boton-sec" data-mapa-csv>Descargar los datos (CSV)</button> <button type="button" class="boton-sec" data-mapa-borrar>Vaciar el mapa</button> <span class="act-res" aria-live="polite"></span></p></details>` +
    `<noscript><p class="sin-js">El mapa necesita JavaScript.</p></noscript></div>\n`
  );
}

// Archivos descargables: una línea por archivo, «fichero | título | descripción»
function renderDescargas(contenido, ctx) {
  const kb = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  const items = contenido.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const [f, titulo, desc] = l.split('|').map((x) => x.trim());
    const a = ctx.archivo(f);
    if (!a) return '';
    const ext = f.split('.').pop().toUpperCase();
    return `<li><a class="descarga" href="archivos/${esc(f)}" download><span class="descarga-ext">${esc(ext)}</span><span class="descarga-txt"><b>${esc(titulo || f)}</b>${desc ? `<small>${esc(desc)}</small>` : ''}</span><span class="descarga-peso">${kb(a.bytes)}</span></a></li>`;
  });
  return `<ul class="descargas">${items.join('')}</ul>\n`;
}
