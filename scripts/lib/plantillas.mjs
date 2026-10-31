// Plantillas HTML. Todo el HTML de las páginas sale de aquí.
import { esc } from './markdown.mjs';

const FUENTES = [
  'assets/fuentes/bricolage-grotesque-latin-wght-normal.woff2',
  'assets/fuentes/source-sans-3-latin-400-normal.woff2',
];

/** Título breve para índices: «Sesión 3 · Algo» → { num: 'S3', texto: 'Algo' } */
export function partesTitulo(pagina, i) {
  const m = pagina.titulo.match(/^Sesi[oó]n\s+(\d+)\s*[·:.-]\s*(.*)$/);
  if (pagina.tituloCorto) return { num: m ? `S${m[1]}` : '', texto: pagina.tituloCorto };
  if (i === 0) return { num: '', texto: 'Presentación' };
  if (m) return { num: `S${m[1]}`, texto: m[2] };
  return { num: '', texto: pagina.titulo };
}

const resaltar = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');

function cabeza({ titulo, descripcion, base, extra = '' }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
${descripcion ? `<meta name="description" content="${esc(descripcion)}">` : ''}
<meta name="theme-color" content="#0F2C3D">
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
      return `<li><a href="${p.salida}" data-pag="${p.id}"${p === pagina ? ' aria-current="page"' : ''}>${t.num ? `<span class="ind-num">${t.num}</span>` : '<span class="ind-num ind-num-pres" aria-hidden="true">◆</span>'}<span class="ind-texto">${esc(t.texto)}</span><span class="ind-check" aria-hidden="true"></span></a></li>`;
    })
    .join('');
  const enlaceCurso = (p) => (p ? `<a href="${p.salida}" rel="${p === prev ? 'prev' : 'next'}"><span class="pag-dir">${p === prev ? '← Anterior' : 'Siguiente →'}</span><span class="pag-tit">${esc(partesTitulo(p, unidad.paginas.indexOf(p)).texto)}</span></a>` : '<span></span>');

  return `${cabeza({ titulo: tituloDoc, descripcion: unidad.descripcion, base: '../' })}
<body data-modo="${modo}" data-unidad="${unidad.carpeta}" data-pagina="${pagina.id}" data-paginas="${esc(JSON.stringify(unidad.paginas.map((p) => p.id)))}" data-puntuables="${esc(JSON.stringify(indice.puntuables))}">
<a class="saltar" href="#contenido">Saltar al contenido</a>
<header class="barra">
  <div class="barra-in">
    ${web ? `<a class="barra-curso" href="../index.html" title="Volver a las doce unidades"><span aria-hidden="true">←</span> <span class="barra-curso-txt">Economía 1.º Bach</span></a>` : ''}
    <a class="barra-unidad" href="index.html"><span class="barra-sda">SdA ${unidad.n}</span> ${esc(unidad.titulo)}</a>
    <button type="button" class="barra-indice" aria-expanded="false" aria-controls="indice">Sesiones</button>
    ${web ? botonDocente : ''}
  </div>
  <div class="progreso" role="progressbar" aria-label="Progreso en la unidad" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="progreso-barra"></div></div>
</header>
<div class="marco">
  <nav id="indice" class="indice" aria-label="Páginas de la unidad">
    <p class="indice-tit">SdA ${unidad.n} · ${unidad.paginas.length} páginas</p>
    <ol>${lista}</ol>
    <div class="indice-estado" hidden>
      <p><span data-estado-visitadas>0</span> de ${unidad.paginas.length} páginas vistas</p>
      ${indice.totalPuntuable ? `<p>Cuestionarios: <strong data-estado-nota>—</strong></p>` : ''}
    </div>
  </nav>
  <main id="contenido" class="contenido" tabindex="-1">
    <p class="migas">SdA ${unidad.n} · ${esc(unidad.titulo)}${pt.num ? ` · Sesión ${pt.num.slice(1)}` : ''}</p>
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
    `<summary><h2>${esc(b.titulo)}${b.docente ? ' <span class="marca-docente">Docente</span>' : ''}</h2></summary>` +
    `<div class="bloque-cuerpo">${cuerpo}</div></details>`
  );
}

// ─────────────────────────── portada ───────────────────────────

export function plantillaPortada({ curso, scormDisponible }) {
  const totalPorTri = {};
  for (const u of curso.unidades) totalPorTri[u.trimestre] = (totalPorTri[u.trimestre] || 0) + u.sesiones;
  const tris = [...new Set(curso.unidades.map((u) => u.trimestre))].sort();

  const cinta = tris
    .map(
      (t) =>
        `<div class="tri-grupo t${t}" style="flex:${totalPorTri[t]}">` +
        curso.unidades
          .filter((u) => u.trimestre === t)
          .map((u) => `<a class="seg" href="#ud${u.n}" style="flex:${u.sesiones}" data-ud="${u.n}" aria-label="Unidad ${u.n}: ${esc(u.titulo)}. ${u.sesiones} sesiones."><span class="seg-num">${u.n}</span></a>`)
          .join('') +
        '</div>',
    )
    .join('');

  const pies = tris
    .map((t) => `<div class="pie t${t}"><b>${esc(curso.trimestres[t].nombre)}</b> <span>· ${totalPorTri[t]} sesiones</span></div>`)
    .join('');

  const tarjeta = (u) => `
      <article class="ud" id="ud${u.n}" data-unidad="${u.carpeta}" data-temas="${esc(`${u.temas} ${u.titulo}`.toLowerCase())}">
        <p class="ud-num">Unidad ${String(u.n).padStart(2, '0')}</p>
        <h3><a href="${u.carpeta}/index.html">${esc(u.titulo)}</a></h3>
        <p class="producto">${u.producto}</p>
        <div class="ud-datos"><span class="ce">${esc(u.ce)}</span><span>${u.sesiones} sesiones</span><span class="ud-progreso" hidden></span></div>
        <div class="docente">
          <dl>
            <dt>Criterios</dt><dd>${esc(u.criterios)}</dd>
            <dt>Saberes</dt><dd>${esc(u.saberes)}</dd>
            <dt>Referente</dt><dd>${esc(u.referente)}</dd>
            <dt>Interdisc.</dt><dd>${esc(u.interdisciplinar)}</dd>
          </dl>
          <div class="materiales">
            ${u.materiales?.diapositivas ? `<a href="materiales/${u.materiales.diapositivas}">Diapositivas .pptx</a>` : ''}
            ${u.materiales?.anexo ? `<a href="materiales/${u.materiales.anexo}">Anexo imprimible</a>` : ''}
            ${scormDisponible ? `<a href="scorm/${u.carpeta}.zip" download>Paquete SCORM</a>` : ''}
          </div>
        </div>
      </article>`;

  const listado = tris
    .map((t) => {
      const uds = curso.unidades.filter((u) => u.trimestre === t);
      return `
  <section class="trimestre" data-tri="${t}" aria-labelledby="tri${t}">
    <div class="wrap">
      <div class="tri-head"><h2 id="tri${t}">${esc(curso.trimestres[t].nombre)}</h2><span class="meta">${uds.length} unidades · ${totalPorTri[t]} sesiones</span></div>
      <p class="tri-sub">${esc(curso.trimestres[t].sub)}</p>
      <div class="rejilla">${uds.map(tarjeta).join('')}</div>
    </div>
  </section>`;
    })
    .join('');

  const pie = (curso.pie || [])
    .map(
      (c) =>
        `<div><h2>${esc(c.titulo)}</h2>${(c.parrafos || []).map((p) => `<p>${esc(p)}</p>`).join('')}${c.lista ? `<ul>${c.lista.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}</div>`,
    )
    .join('');

  return `${cabeza({ titulo: `${curso.titulo} · ${curso.centro}`, descripcion: curso.descripcion, base: '' })}
<body class="portada" data-modo="web">
<a class="saltar" href="#listado">Saltar al listado de unidades</a>
<div class="topbar">
  <div class="wrap">
    <span>${esc(curso.titulo)}</span>
    <span class="sede">${esc(curso.centro)} · Curso ${esc(curso.curso_escolar)}</span>
    ${botonDocente}
  </div>
</div>
<header class="hero">
  <div class="wrap">
    <p class="eyebrow">${esc(curso.portada.etiqueta)}</p>
    <h1>${resaltar(curso.portada.titular)}</h1>
    <p class="lead">${esc(curso.portada.entradilla)}</p>
  </div>
</header>
<section class="cinta-bloque" aria-labelledby="cinta-t">
  <div class="wrap">
    <div class="cinta-cabecera"><h2 class="cinta-titulo" id="cinta-t">El curso completo</h2><span class="cinta-nota">El ancho de cada bloque es su número de sesiones</span></div>
    <div class="cinta">${cinta}</div>
    <div class="cinta-pies">${pies}</div>
  </div>
</section>
<div class="buscador">
  <div class="wrap">
    <div class="campo">
      <span class="lupa" aria-hidden="true">⌕</span>
      <label for="q" class="visualmente-oculto">Buscar un tema o concepto</label>
      <input type="search" id="q" placeholder="Busca un tema: elasticidad, aranceles, paro, inflación…" autocomplete="off">
    </div>
    <span class="contador" id="contador" aria-live="polite">${curso.unidades.length} unidades</span>
  </div>
</div>
<main id="listado" tabindex="-1">${listado}
  <div class="vacio"><div class="wrap"><p>No hay ninguna unidad con ese tema.</p><button type="button" id="limpiar">Ver las ${curso.unidades.length} unidades</button></div></div>
</main>
<footer class="pie-portada">
  <div class="wrap">
    <div class="cols">${pie}</div>
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
