#!/usr/bin/env node
// Genera la web (dist/) y un paquete SCORM 1.2 por unidad (dist/scorm/sdaXX.zip).
//
//   npm run build            todo
//   npm run build -- --rapido        solo la web (sin SCORM), para previsualizar
//   npm run comprobar        valida el contenido sin escribir nada
import fs from 'node:fs';
import path from 'node:path';
import { zipSync } from 'fflate';
import { cargarCurso, RAIZ } from './lib/contenido.mjs';
import { crearMarkdown, postproceso } from './lib/markdown.mjs';
import { prepararImagenes, copiarImagenes } from './lib/imagenes.mjs';
import { plantillaPagina, plantillaBloque, plantillaPortada, plantillaScormInicio, plantillaManifiesto } from './lib/plantillas.mjs';

const args = new Set(process.argv.slice(2));
const RAPIDO = args.has('--rapido');
const SOLO_COMPROBAR = args.has('--solo-comprobar');
const DIST = path.join(RAIZ, 'dist');
const TMP = path.join(RAIZ, '.cache', 'scorm');
const ASSETS = path.join(RAIZ, 'src', 'assets');
const FUENTES = [
  ['@fontsource/alegreya/files', 'alegreya-latin-400-normal.woff2'],
  ['@fontsource/alegreya/files', 'alegreya-latin-400-italic.woff2'],
  ['@fontsource/alegreya/files', 'alegreya-latin-700-normal.woff2'],
  ['@fontsource/alegreya/files', 'alegreya-latin-800-normal.woff2'],
  ['@fontsource/alegreya-sans/files', 'alegreya-sans-latin-400-normal.woff2'],
  ['@fontsource/alegreya-sans/files', 'alegreya-sans-latin-500-normal.woff2'],
  ['@fontsource/alegreya-sans/files', 'alegreya-sans-latin-700-normal.woff2'],
];

const errores = [];
const avisos = [];
const t0 = Date.now();

function vaciar(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function escribir(fichero, contenido) {
  if (SOLO_COMPROBAR) return;
  fs.mkdirSync(path.dirname(fichero), { recursive: true });
  fs.writeFileSync(fichero, contenido);
}

function copiarAssets(destino, { scorm }) {
  for (const f of fs.readdirSync(ASSETS)) {
    if (!scorm && f === 'scorm.js') continue;
    fs.cpSync(path.join(ASSETS, f), path.join(destino, 'assets', f), { recursive: true });
  }
  const dirF = path.join(destino, 'assets', 'fuentes');
  fs.mkdirSync(dirF, { recursive: true });
  for (const [paquete, fich] of FUENTES) {
    fs.copyFileSync(path.join(RAIZ, 'node_modules', paquete, fich), path.join(dirF, fich));
  }
}

function listarFicheros(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listarFicheros(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}

/** Renderiza todas las páginas de una unidad en un modo («web» o «scorm»). */
function renderUnidad(curso, unidad, imagenes, modo) {
  const usadas = new Set();
  const ids = new Map();
  const indice = { puntuables: {}, totalPuntuable: 0, revisar: 0 };
  let paginaActual = null;
  const ctx = {
    unidad,
    modo,
    imagen(nombre) {
      const img = imagenes.get(nombre) || imagenes.get(nombre.replace(/\.\w+$/, ''));
      if (!img) {
        errores.push(`${paginaActual.fichero}: no existe la imagen «${nombre}» en ${unidad.carpeta}/img/`);
        return null;
      }
      usadas.add(img.nombre);
      return img;
    },
    registrarActividad(d) {
      if (ids.has(d.id)) errores.push(`${paginaActual.fichero}: el id de actividad «${d.id}» ya se usa en ${ids.get(d.id)}`);
      ids.set(d.id, paginaActual.fichero);
      if (d.revisar) indice.revisar++;
    },
    registrarPuntuable(id, total) {
      indice.puntuables[id] = total;
      indice.totalPuntuable += total;
    },
    error(msg) {
      errores.push(`${paginaActual.fichero}: ${msg}`);
    },
  };
  const md = crearMarkdown(ctx);
  const cuerpos = unidad.paginas.map((pagina) => {
    paginaActual = pagina;
    return pagina.bloques
      .filter((b) => modo === 'web' || !b.docente)
      .map((b, i) => plantillaBloque(b, postproceso(md.render(b.md)), i))
      .join('\n');
  });
  const paginas = unidad.paginas.map((pagina, i) => ({
    salida: pagina.salida,
    html: plantillaPagina({ curso, unidad, pagina, indice, html: cuerpos[i], modo }),
  }));
  return { paginas, usadas, indice };
}

function zip(dir, destino) {
  const entradas = {};
  for (const f of listarFicheros(dir)) {
    const datos = fs.readFileSync(path.join(dir, f));
    entradas[f] = /\.(webp|png|jpe?g|woff2|zip|pdf)$/i.test(f) ? [datos, { level: 0 }] : [datos, { level: 9 }];
  }
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, zipSync(entradas, { mtime: new Date('2026-09-01T00:00:00Z') }));
}

async function main() {
  const curso = cargarCurso();
  const conScorm = !RAPIDO;
  if (!SOLO_COMPROBAR) {
    vaciar(DIST);
    copiarAssets(DIST, { scorm: false });
  }
  const resumen = [];

  for (const unidad of curso.unidades) {
    // materiales del docente: materiales/sdaXX_anexo.pdf y materiales/sdaXX_diapositivas.zip
    const mat = (suf) => (fs.existsSync(path.join(RAIZ, 'materiales', `${unidad.carpeta}${suf}`)) ? `${unidad.carpeta}${suf}` : null);
    unidad.materiales = { anexo: mat('_anexo.pdf'), diapositivas: mat('_diapositivas.zip') };

    const imagenes = await prepararImagenes(unidad);

    // web (con guía docente)
    const web = renderUnidad(curso, unidad, imagenes, 'web');
    const dirWeb = path.join(DIST, unidad.carpeta);
    for (const p of web.paginas) escribir(path.join(dirWeb, p.salida), p.html);
    if (!SOLO_COMPROBAR) copiarImagenes(unidad, web.usadas, dirWeb);
    if (web.indice.revisar) avisos.push(`${unidad.carpeta}: ${web.indice.revisar} actividades con «revisar: true» (claves pendientes de revisión)`);

    // SCORM (sin guía docente)
    if (conScorm) {
      const sc = renderUnidad(curso, unidad, imagenes, 'scorm');
      if (!SOLO_COMPROBAR) {
        const raiz = path.join(TMP, unidad.carpeta);
        vaciar(raiz);
        const dirU = path.join(raiz, unidad.carpeta);
        for (const p of sc.paginas) escribir(path.join(dirU, p.salida), p.html);
        copiarImagenes(unidad, sc.usadas, dirU);
        copiarAssets(raiz, { scorm: true });
        escribir(path.join(raiz, 'index.html'), plantillaScormInicio(unidad));
        const ficheros = listarFicheros(raiz);
        escribir(path.join(raiz, 'imsmanifest.xml'), plantillaManifiesto({ curso, unidad, ficheros, notaMinima: curso.scorm?.nota_minima }));
        zip(raiz, path.join(DIST, 'scorm', `${unidad.carpeta}.zip`));
      }
      resumen.push(`  ${unidad.carpeta}  ${String(unidad.paginas.length).padStart(2)} páginas · ${String(Object.keys(sc.indice.puntuables).length).padStart(2)} cuestionarios puntuables (${sc.indice.totalPuntuable} ítems)`);
    } else {
      resumen.push(`  ${unidad.carpeta}  ${String(unidad.paginas.length).padStart(2)} páginas`);
    }
  }

  if (!SOLO_COMPROBAR) {
    escribir(path.join(DIST, 'index.html'), plantillaPortada({ curso, scormDisponible: conScorm }));
    escribir(path.join(DIST, '404.html'), fs.readFileSync(path.join(RAIZ, 'src', '404.html'), 'utf8'));
    escribir(path.join(DIST, '.nojekyll'), '');
    if (fs.existsSync(path.join(RAIZ, 'materiales'))) fs.cpSync(path.join(RAIZ, 'materiales'), path.join(DIST, 'materiales'), { recursive: true });
  }

  console.log(`\n${curso.unidades.length} unidades${conScorm ? ' (web + SCORM)' : ' (solo web)'}:`);
  console.log(resumen.join('\n'));
  if (avisos.length) console.log('\nAvisos:\n' + avisos.map((a) => '  · ' + a).join('\n'));
  if (errores.length) {
    console.error('\n✗ Errores:\n' + errores.map((e) => '  · ' + e).join('\n'));
    process.exit(1);
  }
  console.log(`\n✓ ${SOLO_COMPROBAR ? 'Contenido válido' : 'Generado en dist/'} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
