#!/usr/bin/env node
// Servidor local para previsualizar dist/:  npm run servir  →  http://localhost:8080
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ } from './lib/contenido.mjs';

const DIST = path.join(RAIZ, 'dist');
const PUERTO = Number(process.env.PORT) || 8080;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.zip': 'application/zip', '.xml': 'application/xml', '.json': 'application/json' };

http
  .createServer((req, res) => {
    let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(DIST, path.normalize(ruta).replace(/^(\.\.[/\\])+/, ''));
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!f.startsWith(DIST) || !fs.existsSync(f)) {
      res.writeHead(404, { 'content-type': TIPOS['.html'] });
      return fs.createReadStream(path.join(DIST, '404.html')).pipe(res);
    }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  })
  .listen(PUERTO, () => console.log(`Previsualización en http://localhost:${PUERTO}  (Ctrl+C para salir)`));
