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

const CAJAS = ['nota', 'aviso', 'idea', 'ejemplo'];

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
          return renderVideo(contenido.trim());
        case 'enlace-anonimo':
          return renderEnlaceAnonimo(cargarYaml(contenido, 'enlace-anonimo'), ctx);
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
    `<dl class="rubrica-meta"><div><dt>Competencia específica</dt><dd>${esc(r.competencia)}</dd></div>` +
    `<div><dt>Saberes básicos</dt><dd>${esc(r.saberes)}</dd></div>` +
    `<div><dt>Descriptores operativos</dt><dd>${esc(String(r.descriptores).replace(/\//g, ' · '))}</dd></div></dl>` +
    `<ol class="rubrica-niveles">${niveles}</ol></section>\n`
  );
}

function idYoutube(url) {
  const m = url.match(/(?:embed\/|watch\?v=|youtu\.be\/)([\w-]{11})/);
  return m && m[1];
}

function renderVideo(url) {
  const id = idYoutube(url);
  if (!id) return `<p><a href="${esc(url)}" target="_blank" rel="noopener">Ver el vídeo</a></p>`;
  return (
    `<div class="video" data-youtube="${id}">` +
    `<button type="button" class="video-play" aria-label="Reproducir el vídeo (se carga desde YouTube)">` +
    `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" width="480" height="360" loading="lazy">` +
    `<span class="video-icono" aria-hidden="true"></span></button>` +
    `<p class="video-pie">El vídeo se carga desde YouTube al pulsar. <a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">Abrir en YouTube</a></p></div>\n`
  );
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
