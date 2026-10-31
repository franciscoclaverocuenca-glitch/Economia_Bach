// Lectura del contenido: curso.yml, unidad.yml y páginas .md de cada unidad.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
export const CONTENIDO = path.join(RAIZ, 'contenido');

export function leerYaml(fichero) {
  return yaml.load(fs.readFileSync(fichero, 'utf8'));
}

/** Separa el front matter (--- yaml ---) del cuerpo. */
function frontMatter(texto, fichero) {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { datos: {}, cuerpo: texto };
  let datos;
  try {
    datos = yaml.load(m[1]) || {};
  } catch (e) {
    throw new Error(`${fichero}: cabecera YAML no válida — ${e.message}`);
  }
  return { datos, cuerpo: texto.slice(m[0].length) };
}

/**
 * Divide una página en bloques. Cada bloque empieza con «## Título {.clase .clase}».
 * Clases reconocidas: .docente (solo profesorado), .plegado (aparece cerrado).
 */
function dividirBloques(cuerpo) {
  const lineas = cuerpo.split(/\r?\n/);
  const bloques = [];
  let actual = null;
  let enValla = false;
  const previo = [];
  for (const linea of lineas) {
    if (/^(```|~~~)/.test(linea.trim())) enValla = !enValla;
    const m = !enValla && linea.match(/^##\s+(.+?)\s*(?:\{([^}]*)\})?\s*$/);
    if (m) {
      actual = { titulo: m[1].trim(), clases: (m[2] || '').split(/\s+/).filter(Boolean).map((c) => c.replace(/^\./, '')), lineas: [] };
      bloques.push(actual);
      continue;
    }
    (actual ? actual.lineas : previo).push(linea);
  }
  const res = bloques.map((b) => ({
    titulo: b.titulo,
    docente: b.clases.includes('docente'),
    plegado: b.clases.includes('plegado'),
    clases: b.clases.filter((c) => !['docente', 'plegado'].includes(c)),
    md: b.lineas.join('\n').trim(),
  }));
  const intro = previo.join('\n').trim();
  if (intro) res.unshift({ titulo: '', docente: false, plegado: false, clases: ['intro'], md: intro });
  return res;
}

export function cargarCurso() {
  const curso = leerYaml(path.join(CONTENIDO, 'curso.yml'));
  const carpetas = fs
    .readdirSync(CONTENIDO, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(CONTENIDO, d.name, 'unidad.yml')))
    .map((d) => d.name)
    .sort();
  curso.unidades = carpetas.map(cargarUnidad).sort((a, b) => a.n - b.n);
  return curso;
}

export function cargarUnidad(carpeta) {
  const dir = path.join(CONTENIDO, carpeta);
  const unidad = leerYaml(path.join(dir, 'unidad.yml'));
  unidad.carpeta = carpeta;
  unidad.dir = dir;
  unidad.rubricas = unidad.rubricas || [];
  const ficheros = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
  unidad.paginas = ficheros.map((f, i) => {
    const ruta = path.join(dir, f);
    const { datos, cuerpo } = frontMatter(fs.readFileSync(ruta, 'utf8'), ruta);
    const base = f.replace(/\.md$/, '').replace(/^\d+-/, '');
    return {
      fichero: path.relative(RAIZ, ruta),
      id: i === 0 ? 'index' : base,
      salida: i === 0 ? 'index.html' : `${base}.html`,
      titulo: datos.titulo || base,
      tituloCorto: datos.titulo_corto || null,
      datos,
      bloques: dividirBloques(cuerpo),
    };
  });
  return unidad;
}
