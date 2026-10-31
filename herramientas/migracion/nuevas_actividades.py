#!/usr/bin/env python3
"""Inserta las actividades nuevas creadas tras la migración (se ejecutó una vez).
Cada entrada: (unidad, prefijo de fichero, bloque tras el que se inserta, markdown)."""
import glob
import os
import sys

RAIZ = sys.argv[1] if len(sys.argv) > 1 else '.'

NUEVOS = [
    ('sda01', '03-', '## Rally de Transferencia', '''## Practica · Relaciona cada concepto

```actividad
id: sda01-s03-conceptos
tipo: emparejar
instrucciones: Antes del rally, comprueba que tienes claros los conceptos de hoy. Elige para cada concepto lo que le corresponde **en el caso de la vivienda**.
pares:
  - a: "**Recursos**"
    b: Suelo, materiales, mano de obra… y también el tiempo de quien busca piso
  - a: "**Bien**"
    b: La vivienda en sí, los metros cuadrados construidos
  - a: "**Servicio**"
    b: La gestión de una inmobiliaria o una tasación
  - a: "**Necesidad**"
    b: Un techo, y además en un barrio concreto y con ciertas condiciones
  - a: "**Escasez**"
    b: Hay más personas queriendo vivir en el centro que pisos disponibles
  - a: "**Coste de oportunidad**"
    b: Lo que deja de ganar un propietario al alquilar a residentes en vez de a turistas
explicacion: Fíjate en que el **coste de oportunidad** no es lo que pagas, sino lo mejor a lo que renuncias al elegir.
```'''),

    ('sda02', '03-', '## Detective Económico', '''## Practica · ¿Positivo o normativo?

```actividad
id: sda02-s03-detective
tipo: clasificar
instrucciones: Clasifica cada titular. Busca las palabras que delatan un juicio de valor («debería», «es injusto», «hay que»…).
categorias:
  - nombre: Positivo
    elementos:
      - texto: «La tasa de paro juvenil en Andalucía superó el 30 % el último trimestre»
        explicacion: Es un dato que se puede comprobar en la EPA.
      - texto: «El precio del alquiler en Málaga ha subido más que los salarios en los últimos cinco años»
        explicacion: Se puede verificar comparando dos series de datos.
      - texto: «Si sube el precio del aceite, se compra menos aceite»
        explicacion: Es una relación causa-efecto que se puede contrastar con datos, aunque resulte ser falsa en algún caso.
      - texto: «España recibió más de 90 millones de turistas internacionales el año pasado»
        explicacion: Es un dato verificable en las estadísticas oficiales.
  - nombre: Normativo
    elementos:
      - texto: «El Gobierno debería limitar el precio del alquiler»
        explicacion: «Debería» delata una valoración.
      - texto: «Es injusto que los jóvenes dediquen la mitad del sueldo a la vivienda»
        explicacion: «Es injusto» es un juicio de valor, aunque detrás haya un dato.
      - texto: «Hay que proteger a los agricultores andaluces frente a las importaciones»
        explicacion: «Hay que» indica lo que alguien cree que debe hacerse.
      - texto: «Lo mejor sería bajar el IVA de los alimentos básicos»
        explicacion: «Lo mejor sería» expresa una preferencia.
```'''),

    ('sda03', '06-', '## ¿A qué balanza pertenece?', '''## Practica · Clasifica las seis transacciones

```actividad
id: sda03-s06-balanzas
tipo: clasificar
instrucciones: Decide en qué gran bloque de la balanza de pagos se anota cada transacción. Después corrige y lee las explicaciones.
categorias:
  - nombre: Cuenta corriente
    elementos:
      - texto: Una empresa malagueña de software cobra por un servicio prestado a un cliente alemán
        explicacion: Es una **exportación de servicios**. Entra dinero, pero no es una inversión.
      - texto: Una persona migrante envía dinero a su familia en otro país
        explicacion: Es una **transferencia** (remesa).
      - texto: Un turista francés paga un hotel en la Costa del Sol
        explicacion: El turismo de extranjeros en España es una **exportación de servicios**.
      - texto: España recibe fondos europeos de cohesión
        explicacion: Se anota como **transferencia** recibida del exterior.
      - texto: Una empresa andaluza cobra dividendos de una filial en Portugal
        explicacion: Es una **renta** de la inversión que tiene fuera.
  - nombre: Balanza financiera
    elementos:
      - texto: Google invierte en construir una nueva sede en el Málaga TechPark
        explicacion: 'Es una **inversión extranjera directa**: un movimiento de capital.'
```

```actividad
id: sda03-s06-tipo-cambio
tipo: test
preguntas:
  - enunciado: Si el euro se **aprecia** frente al dólar, ¿qué le ocurre a una empresa malagueña que exporta aceite a Estados Unidos?
    opciones:
      - Le beneficia, porque cobra en una moneda más fuerte
      - Le perjudica, porque su aceite resulta más caro en dólares
      - No le afecta, porque el precio en euros no cambia
    correcta: 2
    explicacion: El comprador estadounidense necesita más dólares para pagar el mismo precio en euros, y la empresa pierde competitividad.
  - enunciado: ¿Y a una familia malagueña que viaja de vacaciones a Nueva York?
    opciones:
      - Le beneficia, porque con sus euros consigue más dólares
      - Le perjudica, porque el viaje le sale más caro
      - No le afecta
    correcta: 1
    explicacion: Una moneda fuerte abarata lo que se compra fuera, incluidos los viajes.
```'''),

    ('sda04', '06-', '## Costes, ingresos y beneficio', '''## Practica · ¿Coste fijo o variable?

```actividad
id: sda04-s06-costes
tipo: clasificar
instrucciones: Piensa en una pequeña almazara. ¿Cada coste cambia con la cantidad de aceite que produce, o se paga igual produzca lo que produzca?
categorias:
  - nombre: Coste fijo
    elementos:
      - texto: El alquiler de la nave
      - texto: El seguro anual de la maquinaria
      - texto: El sueldo mensual de la persona que lleva la contabilidad
      - texto: La cuota del préstamo con el que compró la prensa
  - nombre: Coste variable
    elementos:
      - texto: La aceituna que compra a los agricultores
      - texto: Las botellas y etiquetas
      - texto: Las horas extra que solo se pagan cuando hay pedidos
      - texto: El transporte de cada envío a los clientes
explicacion: 'La pregunta clave es siempre la misma: **si mañana produce el doble, ¿este coste cambia?** Si cambia, es variable.'
```

```actividad
id: sda04-s06-calculo
tipo: rellenar
instrucciones: Completa el cálculo. Escribe solo el número, sin el símbolo €.
texto: |
  La almazara vende 2.000 botellas a 8 € cada una. Su **ingreso total** es [16000|16.000] €.
  Sus costes fijos son 5.000 € al mes y el coste variable es de 3 € por botella, así que el **coste variable total** es [6000|6.000] € y el **coste total**, [11000|11.000] €.
  El **beneficio** es, por tanto, [5000|5.000] €.
explicacion: Ingreso total = 8 × 2.000 = 16.000 €. Coste variable total = 3 × 2.000 = 6.000 €. Coste total = 5.000 + 6.000 = 11.000 €. Beneficio = 16.000 − 11.000 = 5.000 €.
```'''),

    ('sda05', '05-', '## Práctica «El reloj del mercado»', '''## Laboratorio · Mueve el mercado del aceite

```simulador
tipo: mercado
titulo: El mercado del aceite de oliva
instrucciones: Desplaza las curvas y observa qué les pasa al precio y a la cantidad de equilibrio. Prueba también a fijar un precio máximo o mínimo. Antes de pulsar cada escenario, **escribe en tu Cornell qué crees que va a pasar**.
producto: aceite de oliva
unidad_precio: €/l
unidad_cantidad: millones de litros
precio_max: 10
cantidad_max: 100
demanda: { a: 80, b: 8 }
oferta: { c: 10, d: 6 }
escenarios:
  - nombre: Sequía en Jaén
    oferta: -28
    explicacion: La sequía reduce la cosecha y la oferta se desplaza a la izquierda.
  - nombre: Moda del aceite en EE. UU.
    demanda: 20
    explicacion: 'Más compradores a cualquier precio: la demanda se desplaza a la derecha.'
  - nombre: Sequía y demanda poco sensible
    oferta: -28
    sensibilidad: 3
    explicacion: Si la demanda es inelástica, la misma caída de la oferta dispara mucho más el precio. Esto pasó con el aceite.
  - nombre: Precio máximo de 4 €/l
    precio_fijado: 4
    explicacion: El Estado prohíbe vender por encima de 4 €/l.
```'''),

    ('sda07', '03-', '## El censo humano', '''## Practica · Ocupado, parado o inactivo

```actividad
id: sda07-s03-censo
tipo: clasificar
instrucciones: Aplica las tres condiciones del paro estadístico (no tener empleo, buscarlo activamente y estar disponible). Si falla alguna, no es parado.
categorias:
  - nombre: Ocupado
    elementos:
      - texto: Trabaja 8 horas a la semana en un supermercado y querría una jornada completa
        explicacion: Tiene empleo, aunque sea a tiempo parcial. Es **subempleo**, pero cuenta como ocupado.
      - texto: Tiene un contrato temporal de tres meses como camarera en Marbella
        explicacion: 'Está trabajando: ocupada, sea temporal o indefinido.'
  - nombre: Parado
    elementos:
      - texto: Tiene 19 años, estudia un grado y busca activamente un trabajo de fin de semana
        explicacion: No tiene empleo, lo busca y está disponible. Estudiar no le excluye.
      - texto: Le despidieron hace un mes, envía currículos cada semana y podría empezar mañana
        explicacion: Cumple las tres condiciones a la vez.
  - nombre: Inactivo
    elementos:
      - texto: Tiene 52 años, perdió su empleo hace 3 años y ha dejado de buscar porque cree que no le contratarán
        explicacion: Sin búsqueda activa no hay paro estadístico. Es el **efecto desánimo**.
      - texto: Está jubilado desde el año pasado
        explicacion: 'No busca empleo: es población inactiva.'
      - texto: Estudia 2.º de Bachillerato y no busca trabajo
        explicacion: 'No busca empleo: es inactiva, no parada.'
```'''),

    ('sda10', '04-', '## Taller · Hoja de cálculo', '''## Laboratorio · El poder del interés compuesto

```simulador
tipo: interes
titulo: ¿Cuánto crece tu ahorro?
instrucciones: 'Cambia el capital, la aportación, el interés y los años. Fíjate en la distancia entre las dos líneas: son los intereses que generan los intereses. Después sube la inflación por encima del interés y observa qué pasa con el valor real.'
capital: 1000
mensual: 50
tae: 3
anos: 10
inflacion: 2
```'''),

    ('sda11', '07-', '## Ensayo · Vuestra primera decisión como Consejo', '''## Practica · Ordena la cadena de transmisión

```actividad
id: sda11-s07-transmision
tipo: ordenar
instrucciones: El BCE quiere frenar la inflación. Ordena los pasos desde su decisión hasta su efecto sobre los precios (arrastra o usa las flechas).
elementos:
  - El Consejo de Gobierno del BCE sube los tipos de interés oficiales
  - Los bancos encarecen el dinero que se prestan entre ellos y sube el euríbor
  - Las hipotecas y los préstamos a familias y empresas se encarecen
  - Las familias consumen menos y las empresas invierten menos
  - Cae la demanda agregada
  - Los precios crecen más despacio y la inflación se modera
explicacion: Es el **mecanismo de transmisión** de la política monetaria. Tarda meses en completarse, y por eso el BCE decide mirando la inflación prevista, no solo la actual.
```'''),

    ('sda12', '06-', '## Actividad · Simulación del multiplicador', '''## Laboratorio · El multiplicador, ronda a ronda

```simulador
tipo: multiplicador
titulo: ¿Cuánto rinde cada euro de gasto público?
instrucciones: Reproduce la tabla de rondas de la actividad (1.000 millones con c = 0,8) y después prueba con el valor de c de tu grupo. ¿Qué ocurre con el multiplicador cuando las familias ahorran más?
gasto: 500
pmc: 0.8
```'''),
]


def insertar(fichero, despues_de, bloque):
    texto = open(fichero, encoding='utf-8').read()
    if bloque.split('\n', 1)[0] in texto:
        return False
    i = texto.index(despues_de)
    j = texto.find('\n## ', i + len(despues_de))
    j = len(texto) if j < 0 else j + 1
    texto = texto[:j].rstrip('\n') + '\n\n' + bloque.strip() + '\n\n' + texto[j:]
    open(fichero, 'w', encoding='utf-8').write(texto.rstrip('\n') + '\n')
    return True


for unidad, pref, tras, md in NUEVOS:
    f = glob.glob(os.path.join(RAIZ, 'contenido', unidad, pref + '*.md'))[0]
    print(('+ ' if insertar(f, tras, md) else '= ') + os.path.relpath(f, RAIZ))
