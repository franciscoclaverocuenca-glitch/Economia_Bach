#!/usr/bin/env node
// Genera REVISION-CLAVES.md con todas las actividades marcadas «revisar: true»
// (las claves propuestas al migrar los Google Forms).   npm run claves
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { cargarCurso, RAIZ } from './lib/contenido.mjs';

const curso = cargarCurso();
const lineas = [
  '# Claves pendientes de revisión',
  '',
  'Google Forms no publica la respuesta correcta de sus cuestionarios, así que las claves y explicaciones de estos',
  'cuestionarios se redactaron durante la migración a partir del contenido de cada sesión.',
  '',
  'Para dar una por buena: abre el fichero indicado, corrige lo que haga falta y **borra la línea `revisar: true`**.',
  'Vuelve a generar esta lista con `npm run claves`.',
  '',
];
let total = 0;
for (const u of curso.unidades) {
  for (const p of u.paginas) {
    for (const b of p.bloques) {
      for (const m of b.md.matchAll(/```actividad\n([\s\S]*?)```/g)) {
        const d = yaml.load(m[1]);
        if (!d?.revisar) continue;
        total++;
        lineas.push(`## SdA ${u.n} · ${p.titulo}`, '', `Fichero: \`${p.fichero}\` · actividad \`${d.id}\``, '');
        lineas.push('| # | Afirmación | Clave | Explicación |', '|---|---|---|---|');
        (d.preguntas || []).forEach((q, i) => {
          const c = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
          lineas.push(`| ${i + 1} | ${c(q.enunciado)} | **${q.respuesta === 'verdadero' ? 'V' : q.respuesta === 'falso' ? 'F' : c(q.correcta)}** | ${c(q.explicacion)} |`);
        });
        lineas.push('');
      }
    }
  }
}
lineas.splice(8, 0, `**${total} cuestionarios pendientes.**`, '');
fs.writeFileSync(path.join(RAIZ, 'REVISION-CLAVES.md'), lineas.join('\n'));
console.log(`REVISION-CLAVES.md: ${total} cuestionarios pendientes de revisión.`);
