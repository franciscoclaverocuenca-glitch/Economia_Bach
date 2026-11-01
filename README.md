# Economía · 1.º de Bachillerato

Doce situaciones de aprendizaje de Economía para 1.º de Bachillerato (IES · Málaga, curso 2027-2028),
ancladas en la realidad económica de Málaga y Andalucía.

Del mismo contenido salen dos cosas:

- **La web**, publicada en GitHub Pages. Incluye la vista docente con la guía de cada sesión.
- **Doce paquetes SCORM 1.2**, uno por unidad, para importarlos en **Moodle Centros**. No llevan la guía
  docente. Envían a Moodle la nota de los cuestionarios, el progreso y las respuestas de cada alumno o alumna.

Materiales elaborados por Francisco Clavero Cuenca · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.es).

---

## Qué ha cambiado respecto a la versión de eXeLearning

| Antes (eXeLearning en Netlify) | Ahora |
|---|---|
| 12 exportaciones con jQuery, Bootstrap y su propio tema repetidos en cada una (137 MB) | Una sola hoja de estilos y un solo script compartidos, sin dependencias (≈100 KB en total) |
| Diapositivas en PNG (≈7 MB por unidad) | WebP con miniaturas que se cargan solo al verlas (≈3,5 MB por unidad) |
| Fuentes cargadas desde Google | La tipografía del propio sistema (SF Pro en Apple, Segoe UI en Windows) alojada en el propio sitio: sin rastreo de terceros y funciona sin conexión |
| 57 Google Forms incrustados, **56 de ellos en una sesión o unidad que no era la suya** | Cuestionarios propios en su sitio correcto, con corrección inmediata y explicación de cada respuesta |
| Los cuestionarios no llegaban a Moodle | La nota y cada respuesta llegan al libro de calificaciones de Moodle |
| Autoevaluación en Google Forms con los descriptores recortados | Autoevaluación interactiva con la rúbrica completa, que se guarda y se puede imprimir |
| Vídeos de YouTube cargados siempre | El vídeo se carga solo al pulsarlo, desde youtube-nocookie |
| Editar exigía eXeLearning y volver a subir todo | Se edita un texto en GitHub y la web se publica sola en un par de minutos |

Además hay **actividades nuevas**: clasificar, relacionar, ordenar, completar huecos y tres simuladores
(mercado del aceite, multiplicador del gasto e interés compuesto). Están en las SdA 1, 2, 3, 4, 5, 7, 10, 11 y 12.

Los detalles de la migración están en [`INFORME-MIGRACION.md`](INFORME-MIGRACION.md).

> **Pendiente de revisión.** Google Forms no publica las respuestas correctas, así que las claves de los
> 32 cuestionarios se redactaron a partir del contenido de cada sesión. Están todas en
> [`REVISION-CLAVES.md`](REVISION-CLAVES.md). Mientras no se revisen, en la vista docente aparece un aviso «Pendiente»
> sobre cada cuestionario.

---

## Cómo está organizado

```
contenido/
  curso.yml                 textos de la portada, trimestres y pie
  sda01/
    unidad.yml              título, producto, criterios, saberes, rúbricas…
    00-presentacion.md      primera página de la unidad
    01-sesion-1-….md        una página por sesión, en orden alfabético
    img/                    imágenes de la unidad (webp, png o jpg)
  sda02/ …
materiales/                 anexos PDF y diapositivas .pptx (solo en la vista docente)
src/assets/                 estilos (app.css), comportamiento (app.js) y puente SCORM (scorm.js)
scripts/                    el generador
herramientas/migracion/     scripts que se usaron una vez para convertir desde eXeLearning
```

## Cómo editar el contenido

Puedes editar directamente en GitHub: abre el fichero `.md`, pulsa el lápiz, cambia el texto y pulsa
**Commit changes**. En unos dos minutos la web se actualiza sola. En la pestaña **Actions** verás si ha ido bien:
un aspa roja indica un error, y su mensaje dice en qué fichero está y qué falla.

### Páginas y bloques

Cada página empieza con su título y se divide en **bloques**. Cada bloque empieza con `## `:

```markdown
---
titulo: Sesión 3 · Conceptos básicos y Rally de Transferencia
---

## Guía docente · Sesión 3 {.docente .plegado}

Esto solo aparece en la vista docente y nunca entra en el SCORM.

## Para empezar

Texto normal con **negrita**, *cursiva* y [enlaces](https://www.ine.es).

### Un subtítulo dentro del bloque

- una lista
- de puntos
```

Marcas que puedes poner tras el título del bloque: `{.docente}` (solo profesorado) y `{.plegado}`
(aparece cerrado). Se pueden combinar: `{.docente .plegado}`.

### Recuadros

```markdown
::: nota 🎯 La idea clave
Texto del recuadro azul.
:::
```

Hay cuatro tipos: `nota` (azul), `aviso` (terracota), `idea` (crema) y `ejemplo` (verde).

### Diapositivas

Pon las imágenes en `img/` de la unidad y escribe una por línea, con el formato `fichero | título`:

````markdown
```diapositivas
sda1-s03-01.webp | Portada
sda1-s03-02.webp | Los conceptos básicos
```
````

Puedes subir PNG o JPG: el generador los convierte a WebP. Para exportar diapositivas desde PowerPoint, usa
**Archivo → Exportar → PNG**, a 1920 px de ancho.

### Vídeo, rúbrica y cuestionario anónimo

````markdown
```video
https://www.youtube.com/watch?v=iCgB4mzPnvI
```

```rubrica
4.1
```

```enlace-anonimo
url: https://docs.google.com/forms/d/e/…/viewform
texto: Abrir el cuestionario anónimo
nota: Este cuestionario es anónimo…
```
````

Las rúbricas se escriben una sola vez, en `unidad.yml`. Desde allí se muestran en la página y en la autoevaluación.

### Actividades

Cada actividad es un bloque `actividad` con un `id` único (minúsculas, números y guiones) y un `tipo`.
Con `puntua: true` la actividad cuenta para la nota que recibe Moodle. Con `intentos: 1` solo se puede
responder una vez; es el valor por defecto en las que puntúan. Si no se indica nada, los intentos son ilimitados.

<details>
<summary><b>Verdadero o falso</b></summary>

````markdown
```actividad
id: sda06-s06-repaso
tipo: verdadero-falso
puntua: true
instrucciones: Decide si cada afirmación es verdadera o falsa.
preguntas:
  - enunciado: Un bien público es no rival y no excluible.
    respuesta: verdadero
    explicacion: "**Verdadero.** De ahí el problema del polizón."
  - enunciado: La selección adversa se produce después de firmar el contrato.
    respuesta: falso
    explicacion: "**Falso.** Se produce antes."
```
````
</details>

<details>
<summary><b>Test (una o varias respuestas correctas)</b></summary>

````markdown
```actividad
id: sda03-s06-tipo-cambio
tipo: test
preguntas:
  - enunciado: Si el euro se aprecia, ¿qué le pasa a quien exporta aceite a EE. UU.?
    opciones:
      - Le beneficia
      - Le perjudica
      - No le afecta
    correcta: 2              # número de la opción buena (1, 2, 3…). Varias: correcta: [1, 3]
    explicacion: Su aceite resulta más caro en dólares.
```
````
</details>

<details>
<summary><b>Completar huecos</b></summary>

Los huecos van entre corchetes. Si hay varias respuestas válidas, sepáralas con `|`. Al corregir no se
tienen en cuenta las mayúsculas ni las tildes.

````markdown
```actividad
id: sda05-s03-huecos
tipo: rellenar
texto: Si sube el precio, la cantidad demandada [baja|disminuye]. Es la ley de la [demanda].
```
````
</details>

<details>
<summary><b>Relacionar</b></summary>

````markdown
```actividad
id: sda01-s03-conceptos
tipo: emparejar
pares:
  - Recursos = Los medios para satisfacer necesidades
  - Escasez = Recursos limitados frente a necesidades ilimitadas
```
````
</details>

<details>
<summary><b>Ordenar</b></summary>

Escribe los elementos **en el orden correcto**. La web los muestra desordenados.

````markdown
```actividad
id: sda11-s07-transmision
tipo: ordenar
elementos:
  - El BCE sube los tipos
  - Sube el euríbor
  - Cae la demanda agregada
```
````
</details>

<details>
<summary><b>Clasificar</b></summary>

````markdown
```actividad
id: sda04-s06-costes
tipo: clasificar
categorias:
  - nombre: Coste fijo
    elementos: [El alquiler de la nave, El seguro anual]
  - nombre: Coste variable
    elementos:
      - texto: La aceituna
        explicacion: Depende de cuánto aceite se produzca.
```
````
</details>

<details>
<summary><b>Respuesta abierta y autoevaluación</b></summary>

````markdown
```actividad
id: sda08-s05-reflexion
tipo: respuesta-abierta
pregunta: ¿Qué mide el IDH que no mide el PIB?
modelo: Una respuesta posible, que se muestra tras guardar.
```

```actividad
id: sda05-autoevaluacion
tipo: autoevaluacion
criterios: [2.2]
```
````
</details>

<details>
<summary><b>Simuladores</b></summary>

````markdown
```simulador
tipo: mercado            # mercado | multiplicador | interes
titulo: El mercado del aceite de oliva
escenarios:
  - nombre: Sequía en Jaén
    oferta: -28
    explicacion: La oferta se desplaza a la izquierda.
```
````
Mira los ejemplos de las SdA 5 (sesión 5), 10 (sesión 4) y 12 (sesión 6) para ver todas las opciones.
</details>

> **Comillas en el YAML.** Si un texto contiene `: ` (dos puntos y espacio) o empieza por `*`, ponlo entre
> comillas: `explicacion: "**Falso.** Lo que importa es esto: …"`. Si lo olvidas, el generador te avisa
> e indica la línea.

## Trabajar en tu ordenador (opcional)

Necesitas [Node.js](https://nodejs.org) 20 o posterior.

```bash
npm install
```

```bash
npm run dev
```

Abre http://localhost:8080. Cada vez que cambies algo, vuelve a ejecutar `npm run dev`; la compilación
rápida tarda menos de un segundo.

| Orden | Qué hace |
|---|---|
| `npm run build` | Genera la web y los 12 SCORM en `dist/` |
| `npm run dev` | Genera solo la web y abre la previsualización |
| `npm run comprobar` | Revisa el contenido sin generar nada |
| `npm run claves` | Actualiza `REVISION-CLAVES.md` |

## Publicación

- **Web.** Cada cambio en `main` se publica solo en GitHub Pages. La primera vez hay que activarlo en
  **Settings → Pages → Source: GitHub Actions**.
- **SCORM.** Los 12 `.zip` se descargan desde la vista docente de la web (enlace «Paquete SCORM» de cada
  unidad) o desde **Actions → la última ejecución → Artifacts → scorm**. Para fijar una versión estable,
  crea una etiqueta, por ejemplo `v1.0`: se publicará una *Release* con los 12 paquetes adjuntos.
- **Netlify** puede seguir funcionando en paralelo si lo conectas a este repositorio. `netlify.toml` ya
  tiene la configuración.

La importación en Moodle se explica en [`GUIA-MOODLE.md`](GUIA-MOODLE.md).

## Privacidad

En la web, el progreso y las respuestas se guardan **solo en el navegador** de cada estudiante (localStorage).
No se envía nada a ningún servidor. Dentro de Moodle se guardan en la plataforma del centro, como cualquier
actividad SCORM. Las encuestas de evaluación de la práctica docente siguen en Google Forms porque son
anónimas: se abren en otra pestaña y no reciben datos de Moodle.

Las respuestas correctas de los cuestionarios viajan dentro de la página, como en cualquier SCORM que se
corrige sin conexión. Para pruebas con valor de examen, usa el cuestionario de Moodle.
