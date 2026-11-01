// Plantillas HTML. Todo el HTML de las páginas sale de aquí.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { esc } from './markdown.mjs';

// Huella del CSS y del JS: cambia en cada publicación con cambios y obliga al navegador a descargarlos de nuevo.
const huella = (f) => {
  try { return crypto.createHash('sha1').update(fs.readFileSync(new URL(`../../src/assets/${f}`, import.meta.url))).digest('hex').slice(0, 8); } catch (e) { return '1'; }
};
const V = { css: huella('app.css'), js: huella('app.js'), scorm: huella('scorm.js') };

const FUENTES = [];

/** Título breve para índices: «Sesión 3 · Algo» → { num: 'S3', texto: 'Algo' } */
export function partesTitulo(pagina, i) {
  const m = pagina.titulo.match(/^Sesi[oó]n\s+(\d+)\s*[·:.-]\s*(.*)$/);
  if (pagina.tituloCorto) return { num: m ? `S${m[1]}` : '', texto: pagina.tituloCorto };
  if (i === 0) return { num: '', texto: 'Presentación' };
  if (m) return { num: `S${m[1]}`, texto: m[2] };
  return { num: '', texto: pagina.titulo };
}

// Oferta y demanda de la portada. El punto está calculado en el cruce exacto de las dos curvas.
const GRAFICO = `<svg class="grafico-od" viewBox="0 0 520 280" role="img" aria-label="Gráfico de oferta y demanda con su punto de equilibrio" fill="none" stroke-linecap="round">
  <path d="M40 16 V256 H500" stroke="#c9c2bb" stroke-width="1.5"/>
  <path d="M251 162.1 V256 M251 162.1 H40" stroke="#1B4B66" stroke-width="1.3" stroke-dasharray="3 6" opacity=".55"/>
  <path d="M60 40 Q200 170 460 230" stroke="#1B4B66" stroke-width="4"/>
  <path d="M60 240 Q260 180 460 30" stroke="#C1694A" stroke-width="4"/>
  <circle cx="251" cy="162.1" r="8" fill="#fff" stroke="#1B4B66" stroke-width="3"/>
  <text x="470" y="236" fill="#1B4B66" font-size="18" font-weight="600" stroke="none">D</text>
  <text x="470" y="34" fill="#C1694A" font-size="18" font-weight="600" stroke="none">O</text>
  <text x="24" y="166" fill="#6e6a66" font-size="14" stroke="none">P*</text>
  <text x="243" y="274" fill="#6e6a66" font-size="14" stroke="none">Q*</text>
</svg>`;

const resaltar = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');

function cabeza({ titulo, descripcion, base, extra = '' }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
${descripcion ? `<meta name="description" content="${esc(descripcion)}">` : ''}
<meta name="theme-color" content="#f5f3f1">
${FUENTES.map((f) => `<link rel="preload" href="${base}${f}" as="font" type="font/woff2" crossorigin>`).join('\n')}
<link rel="stylesheet" href="${base}assets/app.css?v=${V.css}">
<link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
<script>document.documentElement.classList.add('js');try{if(localStorage.getItem('eb:docente')==='1')document.documentElement.classList.add('modo-docente')}catch(e){}</script>
<script defer src="${base}assets/app.js?v=${V.js}"></script>
${extra}
</head>`;
}

const botonDocente = '<button type="button" class="docente-btn" aria-pressed="false" data-docente>Vista docente</button>';

// ─────────────────────────── página de unidad ───────────────────────────

export function plantillaPagina({ curso, unidad, pagina, indice, html, modo }) {
  const web = modo === 'web';
  const i = unidad.paginas.indexOf(pagina);
  const prev = unidad.paginas[i - 1];
  const next = unidad.paginas[i + 1];
  const pt = partesTitulo(pagina, i);
  const tituloDoc = i === 0 ? `SdA ${unidad.n} · ${unidad.titulo} · ${curso.titulo}` : `${pagina.titulo} · SdA ${unidad.n} · ${curso.titulo}`;
  const lista = unidad.paginas
    .map((p, k) => {
      const t = partesTitulo(p, k);
      return `<li><a href="${p.salida}" data-pag="${p.id}"${p === pagina ? ' aria-current="page"' : ''}><span class="ind-num">${t.num ? `${t.num.slice(1)}.` : ''}</span><span class="ind-texto">${esc(t.texto)}</span><span class="ind-check" aria-hidden="true"></span></a></li>`;
    })
    .join('');
  const enlaceCurso = (p) => (p ? `<a href="${p.salida}" rel="${p === prev ? 'prev' : 'next'}"><span class="pag-dir">${p === prev ? 'Anterior' : 'Siguiente'}</span><span class="pag-tit">${esc(partesTitulo(p, unidad.paginas.indexOf(p)).texto)}</span></a>` : '<span></span>');

  return `${cabeza({ titulo: tituloDoc, descripcion: unidad.descripcion, base: '../' })}
<body data-modo="${modo}" data-unidad="${unidad.carpeta}" data-pagina="${pagina.id}" data-paginas="${esc(JSON.stringify(unidad.paginas.map((p) => p.id)))}" data-puntuables="${esc(JSON.stringify(indice.puntuables))}" data-actividades="${esc(JSON.stringify(indice.actividades))}">
<a class="saltar" href="#contenido">Saltar al contenido</a>
<header class="barra">
  <div class="barra-in">
    ${web ? `<a class="barra-curso" href="../index.html" title="Volver a las doce unidades"><span aria-hidden="true">←</span> <span class="barra-curso-txt">Todas las unidades</span></a>` : ''}
    <a class="barra-unidad" href="index.html">Unidad ${unidad.n}. ${esc(unidad.titulo)}</a>
    <button type="button" class="barra-indice" aria-expanded="false" aria-controls="indice">Sesiones</button>
    ${web ? botonDocente : ''}
  </div>
  <div class="progreso" role="progressbar" aria-label="Progreso en la unidad" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="progreso-barra"></div></div>
</header>
<div class="marco">
  <nav id="indice" class="indice" aria-label="Páginas de la unidad">
    <p class="indice-tit">En esta unidad</p>
    <ol>${lista}</ol>
    <div class="indice-estado" hidden>
      <p><span data-estado-visitadas>0</span> de ${unidad.paginas.length} páginas vistas</p>
      ${indice.totalPuntuable ? `<p>Cuestionarios: <strong data-estado-nota>–</strong></p>` : ''}
      <button type="button" class="informe-btn" data-informe>Mi informe de resultados</button>
    </div>
  </nav>
  <main id="contenido" class="contenido" tabindex="-1">
    <p class="migas">Unidad ${unidad.n}${pt.num ? `, sesión ${pt.num.slice(1)}` : ''}</p>
    <h1>${esc(i === 0 ? unidad.titulo : pt.texto)}</h1>
    ${i === 0 && unidad.producto ? `<p class="entradilla">${unidad.producto}</p>` : ''}
    ${html}
    <nav class="paginacion" aria-label="Pasar de página">${enlaceCurso(prev)}${enlaceCurso(next)}</nav>
  </main>
</div>
<footer class="pie-pagina"><p>${esc(curso.autor)} · <a href="${esc(curso.licencia_url)}" target="_blank" rel="noopener">${esc(curso.licencia)}</a></p></footer>
</body>
</html>
`;
}

export function plantillaBloque(b, cuerpo, idx) {
  const id = 'b' + (idx + 1);
  if (!b.titulo) return `<div class="bloque-intro">${cuerpo}</div>`;
  const clases = ['bloque', b.docente ? 'docente' : '', ...b.clases].filter(Boolean).join(' ');
  return (
    `<details class="${clases}" id="${id}"${b.plegado ? '' : ' open'}>` +
    `<summary><h2>${esc(b.titulo)}${b.docente ? ' <span class="marca-docente">docente</span>' : ''}</h2></summary>` +
    `<div class="bloque-cuerpo">${cuerpo}</div></details>`
  );
}

// ─────────────────────────── portada ───────────────────────────

export function plantillaPortada({ curso, scormDisponible }) {
  const tris = [...new Set(curso.unidades.map((u) => u.trimestre))].sort();
  const sesiones = (t) => curso.unidades.filter((u) => u.trimestre === t).reduce((a, u) => a + u.sesiones, 0);

  const tarjeta = (u) => `
        <li class="ud" id="ud${u.n}" data-unidad="${u.carpeta}" data-temas="${esc(`${u.temas} ${u.titulo}`.toLowerCase())}">
          <p class="ud-eyebrow">Unidad ${u.n} · ${u.sesiones} sesiones<span class="ud-progreso" hidden></span></p>
          <h3><a href="${u.carpeta}/index.html">${esc(u.titulo)}</a></h3>
          <p class="producto">${u.producto}</p>
          <p class="ud-mas" aria-hidden="true">Entrar <span>›</span></p>
          <div class="docente">
            <p><b>Criterios</b> ${esc(u.criterios)} · <b>Saberes</b> ${esc(u.saberes)} · ${esc(u.ce)}${u.referente ? ` · <b>Referente</b> ${esc(u.referente)}` : ''}</p>
            <p><b>Interdisciplinar</b> ${esc(u.interdisciplinar)}</p>
            <p class="materiales">
              ${[
                u.materiales?.diapositivas ? `<a href="materiales/${u.materiales.diapositivas}">diapositivas (.pptx)</a>` : '',
                u.materiales?.anexo ? `<a href="materiales/${u.materiales.anexo}">anexo imprimible (PDF)</a>` : '',
                scormDisponible ? `<a href="scorm/${u.carpeta}.zip" download>paquete SCORM</a>` : '',
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
        </li>`;

  const accesos = curso.unidades
    .map((u) => `<li><a href="${u.carpeta}/index.html" class="acceso t${u.trimestre}"><span class="acceso-num">${u.n}</span><span class="acceso-tit">${esc(u.titulo)}</span></a></li>`)
    .join('');

  const listado = tris
    .map(
      (t) => `
    <section class="trimestre t${t}" id="trimestre${t}" aria-labelledby="tri${t}">
      <div class="seccion-cab">
        <h2 id="tri${t}">${esc(curso.trimestres[t].nombre)}. <span>${esc(curso.trimestres[t].sub)}.</span></h2>
        <div class="carrusel-botones" aria-hidden="true"><button type="button" data-mover="-1" tabindex="-1">‹</button><button type="button" data-mover="1" tabindex="-1">›</button></div>
      </div>
      <p class="seccion-dato">${sesiones(t)} sesiones</p>
      <ol class="unidades carrusel">${curso.unidades.filter((u) => u.trimestre === t).map(tarjeta).join('')}
      </ol>
    </section>`,
    )
    .join('');

  const voces = (curso.voces || []).filter((v) => v.nombre);
  const bloqueVoces = voces.length
    ? `<div class="voces" data-voces>
        <h2>Las voces del curso</h2>
        <p class="voces-intro">Cada unidad mira la economía de la mano de alguien que la cambió. Pulsa un nombre.</p>
        <ul class="voces-lista">${voces.map((v, i) => `<li><button type="button" aria-pressed="${i === 0}" data-voz="${i}">${esc(v.nombre)}</button></li>`).join('')}</ul>
        ${voces.map((v, i) => {
          const u = curso.unidades.find((x) => x.n === v.sda);
          return `<div class="voz" data-voz-ficha="${i}"${i === 0 ? '' : ' hidden'}><p class="voz-nombre">${esc(v.nombre)}</p><p class="voz-dato">${esc(v.dato)}</p>${u ? `<p class="voz-ud"><a href="${u.carpeta}/index.html">La encontrarás en la unidad ${u.n}, ${esc(u.titulo)} ›</a></p>` : ''}</div>`;
        }).join('')}
      </div>`
    : '';

  const pie = (curso.pie || [])
    .map((c) => `<div><h2>${esc(c.titulo)}</h2>${(c.parrafos || []).map((p) => `<p>${esc(p)}</p>`).join('')}${c.lista ? `<ul>${c.lista.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}</div>`)
    .join('');

  const titular = esc(curso.portada.titular).replace(/\*([^*]+)\*/g, '$1');

  return `${cabeza({ titulo: `${curso.titulo} · ${curso.centro}`, descripcion: curso.descripcion, base: '' })}
<body class="portada" data-modo="web">
<a class="saltar" href="#listado">Saltar al listado de unidades</a>
<header class="nav">
  <div class="nav-in">
    <a class="nav-marca" href="index.html">Economía <span>1.º Bachillerato</span></a>
    <nav class="nav-enlaces" aria-label="Trimestres">${tris.map((t) => `<a href="#trimestre${t}">${esc(curso.trimestres[t].nombre)}</a>`).join('')}</nav>
    ${botonDocente}
  </div>
</header>
<main id="listado" tabindex="-1">
  <section class="heroe pagina-ancho">
    <div class="heroe-txt">
      <h1>Economía. <span>${titular}.</span></h1>
      <p class="heroe-lead">${esc(curso.portada.entradilla)}</p>
      <p class="buscador">
        <label for="q" class="visualmente-oculto">Buscar un tema</label>
        <input type="search" id="q" placeholder="Buscar un tema: elasticidad, aranceles, paro…" autocomplete="off">
        <span class="contador" id="contador" aria-live="polite">${curso.unidades.length} unidades</span>
      </p>
    </div>
    <figure class="heroe-graf">${GRAFICO}<figcaption>Donde se cruzan lo que unos quieren comprar y otros quieren vender. Así empieza todo.</figcaption></figure>
  </section>
  <nav class="accesos pagina-ancho" aria-label="Las doce unidades"><ol>${accesos}</ol></nav>
  <div class="pagina-ancho">
  ${listado}
  <div class="vacio"><p>No hay ninguna unidad con ese tema. <button type="button" id="limpiar">Ver todas</button></p></div>
  </div>
</main>
<footer class="pie-portada">
  <div class="pagina-ancho">
    <div class="cols"><div class="pie-sobre">${pie}</div>${bloqueVoces}</div>
    <p class="legal">${esc(curso.centro)} · Curso ${esc(curso.curso_escolar)} · Materiales elaborados por ${esc(curso.autor)} · <a href="${esc(curso.licencia_url)}" target="_blank" rel="noopener">${esc(curso.licencia)}</a></p>
  </div>
</footer>
</body>
</html>
`;
}

// ─────────────────────────── SCORM ───────────────────────────

export function plantillaScormInicio(unidad) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SdA ${unidad.n} · ${esc(unidad.titulo)}</title>
<style>html,body{margin:0;height:100%;background:#FDF3EC}iframe{display:block;border:0;width:100%;height:100%}</style>
<script src="assets/scorm.js?v=${V.scorm}"></script>
</head>
<body>
<iframe id="marco" title="SdA ${unidad.n} · ${esc(unidad.titulo)}" src="about:blank" allow="fullscreen"></iframe>
<script>CursoSCORM.arrancar(${JSON.stringify({ unidad: unidad.carpeta, inicio: `${unidad.carpeta}/index.html` })});</script>
</body>
</html>
`;
}

export function plantillaManifiesto({ curso, unidad, ficheros, notaMinima }) {
  const id = `economia-bach-${unidad.carpeta}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org-${unidad.carpeta}">
    <organization identifier="org-${unidad.carpeta}">
      <title>${esc(`SdA ${unidad.n} · ${unidad.titulo}`)}</title>
      <item identifier="item-${unidad.carpeta}" identifierref="res-${unidad.carpeta}" isvisible="true">
        <title>${esc(`SdA ${unidad.n} · ${unidad.titulo}`)}</title>
        ${notaMinima !== null && notaMinima !== undefined && notaMinima !== '' ? `<adlcp:masteryscore>${Number(notaMinima)}</adlcp:masteryscore>` : ''}
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res-${unidad.carpeta}" type="webcontent" adlcp:scormtype="sco" href="index.html">
${ficheros.map((f) => `      <file href="${esc(f)}"/>`).join('\n')}
    </resource>
  </resources>
</manifest>
`;
}
