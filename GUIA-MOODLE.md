# Cómo poner una unidad en Moodle Centros

Cada unidad es un paquete SCORM 1.2 (`sda01.zip` … `sda12.zip`) de unos 4 MB. Funciona en el navegador
y en la app de Moodle, también sin conexión.

## 1. Descargar el paquete

Activa la **vista docente** en la web. Cada unidad tiene un enlace **Paquete SCORM**. También puedes
descargar los 12 juntos desde GitHub: **Actions → última ejecución → Artifacts → scorm**, o desde
**Releases** si has publicado una versión.

> No descomprimas el `.zip`: se sube tal cual.

## 2. Crear la actividad

En el curso, con la edición activada: **Añadir una actividad o un recurso → Paquete SCORM**.

| Ajuste | Valor recomendado | Por qué |
|---|---|---|
| Nombre | `SdA 5 · ¿Cuánto cuestan las cosas?` | |
| Paquete | arrastra `sda05.zip` | |
| **Apariencia → Mostrar el paquete** | *Ventana actual* | La unidad tiene su propia navegación |
| Mostrar la estructura del curso en el reproductor | *No* | La unidad ya tiene índice de sesiones |
| Ocultar los botones de navegación | *Sí* | |
| **Calificación → Método de calificación** | *Calificación más alta* | Es el % de aciertos de los cuestionarios |
| Calificación máxima | **100** | La unidad envía la nota sobre 100. El libro de calificaciones puede reescalarla a 10 |
| **Gestión de intentos → Número de intentos** | *Sin límite* | Cada estudiante continúa siempre su intento |
| Calificación de intentos | *Último intento* | |
| Forzar nuevo intento | *No* | Si no, se perdería el progreso al volver |
| **Compatibilidad → Forzar completado** | *No* | |
| Auto-continuar | *No* | |
| **Finalización de la actividad** | *Requiere estado: Completado* | Se completa al ver todas las páginas y hacer todos los cuestionarios que puntúan |

## 3. Qué ve el profesorado

- **Libro de calificaciones:** la nota de cada unidad (0-100). Es el porcentaje de aciertos sobre **todos**
  los ítems de los cuestionarios que puntúan (`puntua: true`). Un cuestionario sin hacer cuenta como 0.
- **Informes del SCORM → Interacciones:** cada respuesta de cada estudiante, con la hora y el resultado
  (correcta o incorrecta). Aparecen **todos** los cuestionarios: los que puntúan, con peso 1, y los formativos
  sin nota, con peso 0, que se ven pero no cambian la calificación. También aparecen las respuestas abiertas,
  el nivel elegido en cada criterio de la autoevaluación y la evidencia escrita (recortadas a 255 caracteres).
  Si alguien repite un cuestionario, quedan registrados todos los intentos.
- **Informes del SCORM → Intentos:** páginas vistas, estado y última página visitada de cada estudiante.
- **Estado:** *incompleto* hasta haber visto todas las páginas y hecho todos los cuestionarios que puntúan;
  después, *completado*. Si en `contenido/curso.yml` se indica `scorm: nota_minima: 50`, el estado pasa a
  ser *aprobado* o *suspenso*.
- **Informe de resultados:** dentro de la unidad, cada estudiante tiene el botón *Mi informe de resultados*
  en el índice lateral. Genera una hoja con todas sus actividades, aciertos e intentos, lista para imprimir o
  guardar en PDF. En Moodle no hace falta pedirla, porque los datos ya están en los informes.

## 4. Actualizar una unidad ya publicada

Edita la actividad y, en **Paquete**, sustituye el `.zip` por el nuevo. El progreso del alumnado se conserva
siempre que no cambien los `id` de las actividades (los que aparecen en cada bloque `actividad`).

## Qué no incluye el paquete

- La guía docente: queda en la web, en la vista docente.
- Los anexos PDF y las diapositivas `.pptx`: súbelos a Moodle como recursos aparte si quieres que el
  alumnado los tenga.
- Las encuestas de evaluación de la práctica docente: son un enlace a Google Forms que se abre en otra
  pestaña, para que sigan siendo anónimas.
