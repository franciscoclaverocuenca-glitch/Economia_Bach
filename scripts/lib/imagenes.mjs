// Imágenes: cada unidad guarda las suyas en contenido/sdaXX/img/ (webp, png o jpg).
// Se publican en WebP (máx. 1600 px) con una miniatura de 480 px para las rejillas.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { RAIZ } from './contenido.mjs';

const CACHE = path.join(RAIZ, '.cache', 'img');
const ANCHO = 1600;
const MINI = 480;
const EXT = /\.(webp|png|jpe?g)$/i;

async function procesar(origen, destino, ancho, calidad) {
  const st = fs.statSync(origen);
  const marca = `${destino}.json`;
  if (fs.existsSync(destino) && fs.existsSync(marca)) {
    const m = JSON.parse(fs.readFileSync(marca, 'utf8'));
    if (m.mtime === st.mtimeMs && m.size === st.size) return m;
  }
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const img = sharp(origen);
  const meta = await img.metadata();
  const info = await img
    .resize({ width: Math.min(ancho, meta.width), withoutEnlargement: true })
    .webp({ quality: calidad, effort: 5 })
    .toFile(destino);
  const m = { mtime: st.mtimeMs, size: st.size, ancho: info.width, alto: info.height };
  fs.writeFileSync(marca, JSON.stringify(m));
  return m;
}

/** Prepara las imágenes de una unidad en la caché y devuelve su índice. */
export async function prepararImagenes(unidad) {
  const dir = path.join(unidad.dir, 'img');
  const indice = new Map();
  if (!fs.existsSync(dir)) return indice;
  const ficheros = fs.readdirSync(dir).filter((f) => EXT.test(f));
  const cola = [...ficheros];
  const trabajar = async () => {
    while (cola.length) {
      const f = cola.shift();
      const base = f.replace(EXT, '');
      const origen = path.join(dir, f);
      const grande = await procesar(origen, path.join(CACHE, unidad.carpeta, `${base}.webp`), ANCHO, 80);
      const mini = await procesar(origen, path.join(CACHE, unidad.carpeta, 'mini', `${base}.webp`), MINI, 70);
      const datos = {
        nombre: `${base}.webp`,
        src: `img/${base}.webp`,
        mini: `img/mini/${base}.webp`,
        ancho: grande.ancho,
        alto: grande.alto,
        miniAncho: mini.ancho,
        miniAlto: mini.alto,
      };
      indice.set(f, datos);
      indice.set(`${base}.webp`, datos);
      indice.set(base, datos);
    }
  };
  await Promise.all(Array.from({ length: 4 }, trabajar));
  return indice;
}

/** Copia a la salida solo las imágenes que se usan. */
export function copiarImagenes(unidad, usadas, destinoUnidad) {
  for (const nombre of usadas) {
    for (const sub of ['', 'mini']) {
      const o = path.join(CACHE, unidad.carpeta, sub, nombre);
      const d = path.join(destinoUnidad, 'img', sub, nombre);
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(o, d);
    }
  }
}
