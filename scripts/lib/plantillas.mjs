// Plantillas HTML. Todo el HTML de las páginas sale de aquí.
import { esc } from './markdown.mjs';

const FUENTES = ['assets/fuentes/alegreya-latin-400-normal.woff2', 'assets/fuentes/alegreya-latin-700-normal.woff2', 'assets/fuentes/alegreya-sans-latin-400-normal.woff2'];

/** Título breve para índices: «Sesión 3 · Algo» → { num: 'S3', texto: 'Algo' } */
export function partesTitulo(pagina, i) {
  const m = pagina.titulo.match(/^Sesi[oó]n\s+(\d+)\s*[·:.-]\s*(.*)$/);
  if (pagina.tituloCorto) return { num: m ? `S${m[1]}` : '', texto: pagina.tituloCorto };
  if (i === 0) return { num: '', texto: 'Presentación' };
  if (m) return { num: `S${m[1]}`, texto: m[2] };
  return { num: '', texto: pagina.titulo };
}

// Oferta y demanda dibujadas a mano alzada en la cabecera de la portada
const GRAFICO = `<svg class="cabecera-grafico" viewBox="0 0 520 300" aria-hidden="true" fill="none" stroke-linecap="round">
  <path d="M40 20 V270 H500" stroke="#b9cdd8" stroke-width="1.5" opacity=".5"/>
  <path d="M70 50 C170 110 300 190 470 250" stroke="#F0C4AC" stroke-width="3"/>
  <path d="M70 250 C200 200 330 120 470 40" stroke="#C1694A" stroke-width="3"/>
  <path d="M268 148 V270 M268 148 H40" stroke="#FDF3EC" stroke-width="1.2" stroke-dasharray="4 6" opacity=".6"/>
  <circle cx="268" cy="148" r="6" fill="#FDF3EC" stroke="none"/>
  <text x="478" y="255" fill="#F0C4AC" font-family="Alegreya, serif" font-style="italic" font-size="20" stroke="none">D</text>
  <text x="478" y="44" fill="#C1694A" font-family="Alegreya, serif" font-style="italic" font-size="20" stroke="none">O</text>
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
<meta name="theme-color" content="#1B4B66">
${FUENTES.map((f) => `<link rel="preload" href="${base}${f}" as="font" type="font/woff2" crossorigin>`).join('\n')}
<link rel="stylesheet" href="${base}assets/app.css">
<link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
<script>document.documentElement.classList.add('js');try{if(localStorage.getItem('eb:docente')==='1')document.documentElement.classList.add('modo-docente')}catch(e){}</script>
<script defer src="${base}assets/app.js"></script>
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
<body data-modo="${modo}" data-unidad="${unidad.carpeta}" data-pagina="${pagina.id}" data-paginas="${esc(JSON.stringify(unidad.paginas.map((p) => p.id)))}" data-puntuables="${esc(JSON.stringify(indice.puntuables))}">
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

  const fila = (u) => `
        <li class="ud" id="ud${u.n}" data-unidad="${u.carpeta}" data-temas="${esc(`${u.temas} ${u.titulo}`.toLowerCase())}">
          <span class="ud-num">${u.n}</span>
          <div class="ud-cuerpo">
            <h3><a href="${u.carpeta}/index.html">${esc(u.titulo)}</a></h3>
            <p class="producto">${u.producto}</p>
            <p class="ud-datos">${u.sesiones} sesiones · ${esc(u.ce)}<span class="ud-progreso" hidden></span></p>
            <div class="docente">
              <p><b>Criterios:</b> ${esc(u.criterios)} · <b>Saberes:</b> ${esc(u.saberes)} ${u.referente ? ` · <b>Referente:</b> ${esc(u.referente)}` : ""}</p>
              <p><b>Interdisciplinar:</b> ${esc(u.interdisciplinar)}</p>
              <p class="materiales">
                ${[
                  u.materiales?.diapositivas ? `<a href="materiales/${u.materiales.diapositivas}">diapositivas (.pptx)</a>` : '',
                  u.materiales?.anexo ? `<a href="materiales/${u.materiales.anexo}">anexo imprimible (PDF)</a>` : '',
                  scormDisponible ? `<a href="scorm/${u.carpeta}.zip" download>paquete SCORM</a>` : '',
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        </li>`;

  const ordinal = { 1: '1.º', 2: '2.º', 3: '3.º' };
  const listado = tris
    .map(
      (t) => `
    <section class="trimestre" id="trimestre${t}" aria-labelledby="tri${t}">
      <div class="tri-cab">
        <span class="tri-num" aria-hidden="true">${t}</span>
        <h2 id="tri${t}">${esc(curso.trimestres[t].nombre)}</h2>
        <p class="tri-sub">${esc(curso.trimestres[t].sub)}. ${sesiones(t)} sesiones.</p>
      </div>
      <ol class="unidades">${curso.unidades.filter((u) => u.trimestre === t).map(fila).join('')}
      </ol>
    </section>`,
    )
    .join('');

  const resumen = tris
    .map((t) => `<a href="#trimestre${t}"><b>${curso.unidades.filter((u) => u.trimestre === t).length} unidades</b><span>${esc(curso.trimestres[t].nombre)}</span></a>`)
    .join('');

  const voces = (curso.voces || []).filter((v) => v.nombre);
  const bloqueVoces = voces.length
    ? `<div class="voces" data-voces>
        <h2>Las voces del curso</h2>
        <p class="voces-intro">Cada unidad mira la economía de la mano de alguien que la cambió. Pulsa un nombre.</p>
        <ul class="voces-lista">${voces.map((v, i) => `<li><button type="button" aria-pressed="${i === 0}" data-voz="${i}">${esc(v.nombre)}</button></li>`).join('')}</ul>
        ${voces.map((v, i) => {
          const u = curso.unidades.find((x) => x.n === v.sda);
          return `<div class="voz" data-voz-ficha="${i}"${i === 0 ? '' : ' hidden'}><p class="voz-nombre">${esc(v.nombre)}</p><p class="voz-dato">${esc(v.dato)}</p>${u ? `<p class="voz-ud"><a href="${u.carpeta}/index.html">La encontrarás en la unidad ${u.n}, ${esc(u.titulo)}</a></p>` : ''}</div>`;
        }).join('')}
      </div>`
    : '';

  const pie = (curso.pie || [])
    .map((c) => `<div><h2>${esc(c.titulo)}</h2>${(c.parrafos || []).map((p) => `<p>${esc(p)}</p>`).join('')}${c.lista ? `<ul>${c.lista.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}</div>`)
    .join('');

  return `${cabeza({ titulo: `${curso.titulo} · ${curso.centro}`, descripcion: curso.descripcion, base: '' })}
<body class="portada" data-modo="web">
<a class="saltar" href="#listado">Saltar al listado de unidades</a>
<header class="cabecera">
  <div class="pagina-ancho">
    <p class="cabecera-sup"><span>${esc(curso.centro)}</span>${botonDocente}</p>
    <div class="cabecera-txt">
      <p class="cabecera-etq">${esc(curso.portada.etiqueta || curso.titulo)}</p>
      <h1>${resaltar(curso.portada.titular)}</h1>
      <p class="lead">${esc(curso.portada.entradilla)}</p>
      <p class="cabecera-curso">${esc(curso.titulo)} · Curso ${esc(curso.curso_escolar)}</p>
    </div>
    <nav class="cabecera-pie" aria-label="Trimestres">${resumen}</nav>
  </div>
  ${GRAFICO}
</header>
<main id="listado" class="pagina-ancho" tabindex="-1">
  <p class="buscador">
    <label for="q">Buscar un tema</label>
    <input type="search" id="q" placeholder="elasticidad, aranceles, paro…" autocomplete="off">
    <span class="contador" id="contador" aria-live="polite">${curso.unidades.length} unidades</span>
  </p>
  ${listado}
  <div class="vacio"><p>No hay ninguna unidad con ese tema. <button type="button" id="limpiar">Ver todas</button></p></div>
</main>
<footer class="pie-portada">
  <div class="pagina-ancho">
    <div class="cols"><div class="pie-sobre">${pie}</div>${bloqueVoces}</div>
    <p class="legal">Materiales elaborados por ${esc(curso.autor)} · <a href="${esc(curso.licencia_url)}" target="_blank" rel="noopener">${esc(curso.licencia)}</a></p>
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
<script src="assets/scorm.js"></script>
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
