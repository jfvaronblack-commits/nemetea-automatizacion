# Plan — Ruta de Arranque conectada a Airtable

Borrador de planificación, no de implementación. Objetivo: antes de tocar código
o el esquema de Airtable, dejar por escrito dónde encajan el mockup
(`ruta-de-arranque.html`), el contexto de Juanfra, y el estado real de Airtable
que describe Juan Cantele (`cobros_pagos_estado_actual_v2.md`, 07/10/2026).

## 0. Para el sync de mañana (08/10) con Juan

Punch list, de más a menos bloqueante. Cada uno enlaza a su detalle más
abajo:

1. **¿Cuál Pago 1 es el autoritativo hoy?** — hay dos implementaciones en
   paralelo: la legacy (sobre Google Sheets + Holded) y la nueva en
   pruebas (sobre Airtable, pero escribiendo en campos `[OBSOLETO]` de
   `Clientes`, no en `Pagos`). (§6.1, §7.2)
2. **¿Se retiran los workflows legacy 1–9** una vez se porte su lógica
   (prorrateo, suscripción bridge, facturación Stripe+Holded) a workflows
   nuevos sobre Airtable, o conviven un tiempo? (§7.2, decidido: se
   construye nuevo portando la lógica, no reutilizando los workflows)
3. **¿Quién crea el registro de `Cobros`** por cliente — el flujo al
   firmar contrato, o el script de carga de Juan? (§6.2, pregunta de Juan)
4. **¿Cómo llegan a filas de `Pagos`** cada cobro de la suscripción (mes 2,
   mes 3, prorrateo, ciclo natural) — ¿un webhook de Stripe crea la fila al
   vuelo, o hace falta un paso intermedio? (§6.6)
5. **Modelo de datos de Onboarding/SLA** (carpeta enviada, plazo 21 días,
   prórroga, checklist, SLA de montaje) — sigue sin campo en Airtable; falta
   decidir dónde vive y quién es el dueño de esa decisión. (§4, §6.4)
6. **Canal de Slack**: ¿se reutiliza `#activación-de-campaña` (ya existe y
   ya lo usa el pipeline legacy) o se crea uno nuevo para Ruta de Arranque?
   ¿Lo dispara n8n o la interfaz? (§7.3, §6.7)
7. ~~Carga histórica de pagos~~ — **resuelto** (maestro de Notion, M20): la
   carga la hace Juanfra directo en Airtable al conectar Stripe. No hace
   falta CSV de Juan. (§6.3)
8. Los 4 ajustes del Pago 2 del mock (CC, penalización, montaje, manual)
   — ¿pueden coexistir en una misma cuota con un único `Concepto de
   ajuste` por fila? (§6.5)
9. **Nuevo**: la regla de gobierno de la migración dice "no cortar Sheets
   hasta dos semanas de operación paralela sin incidencias" — ¿aplica
   también a los workflows de n8n de Stripe (seguir dejando correr los 1–9
   legacy en paralelo mientras se prueban los nuevos sobre Airtable), o es
   solo para las tablas base de Airtable/Sheets? (§10.2)
10. **Nuevo**: el aviso de WhatsApp al cliente al activar la campaña (§2.4)
    choca potencialmente con el alcance ya decidido en el maestro de Juan:
    "WhatsApp Business API queda por presupuesto separado, no entra en
    scope hasta aprobación". ¿Hay ya una vía para enviar WhatsApp (otra
    integración, o un número ya aprobado) o este aviso queda bloqueado
    hasta que se apruebe presupuesto?

## 0bis. Paso 0 — validación de lectura contra Airtable real (hecho)

Se consultaron registros reales de `Clientes` (118 en total) y el esquema
completo de la tabla para contrastar los supuestos del mockup. Resultado:
las fórmulas de dinero están bien entendidas, pero el mockup usa etiquetas
de entidad/moneda/tipo de entrada que **no existen** en Airtable.

**Correcciones aplicadas al mockup** (hecho, commiteado):

1. ~~`Entidad Contratante` no tiene "SLU".~~ — **corregido**. Las 7 opciones
   reales (`SL`, `SL Canarias`, `Autónomo Eduardo`, `LLC`, `LLC España`,
   `LLC Extranjero`, `Pendiente de Confirmar`) existían en Airtable, el
   mockup usaba `"SLU"` que no es una de ellas. Cambiado a `"SL"` en los 7
   clientes de ejemplo que lo usaban. Donde el código comparaba
   `entidad === "LLC"` (penalización, IVA) ahora usa un helper `esLLC()`
   por prefijo, para cubrir también `LLC España`/`LLC Extranjero` — antes
   solo reconocía el valor exacto `"LLC"`. El Factor Impuesto real completo
   (1.21/1.07/1.06/1 según las 4 familias) sigue sin implementarse del todo
   en el mockup — eso espera a la conexión real con los campos `(calc)` de
   Airtable (§5), no tiene sentido reimplementar la fórmula completa en JS
   dos veces.
2. ~~`Moneda` tiene 3 opciones, no 2.~~ — **corregido**. Se añadió un campo
   `moneda` (EUR/USD/MXN) independiente de `entidad` a cada cliente de
   ejemplo, y `fmtMonto`/`moneda()` ahora leen ese campo en vez de inferir
   € o $ de la entidad. USD y MXN se muestran por código (no por símbolo
   `$`, ambiguo entre los dos) para no confundirlos.
3. `Tipo de Entrada` tiene una 3ª opción (`Primer mes gratis`) que el
   mockup no contempla — **no se tocó**: ningún cliente de ejemplo la usa
   hoy y su efecto en el cálculo del Pago 2 no está definido (¿se trata
   igual que "Formación", o solo afecta al Pago 1?). Añadir un cliente de
   ejemplo con esa entrada sin saber su lógica de cobro sería inventar
   comportamiento — queda para cuando se sepa.
4. **`Método de Cobro Recurrente`**: `SEPA` / `Tarjeta` — coincide
   exactamente con el mockup, sin cambios.
5. Las fórmulas de `Total a Cobrar (EUR) (calc)` se verificaron a mano
   contra 3 clientes LLC (Tasa Aplicada 0,859 en todos) y coinciden con la
   documentación de Juan: `(Cuota NEMETEA + Contact Center) × (1 −
   Descuento Referidos) × Factor Impuesto`.

**Hallazgo importante, no esperado**: el campo `[OBSOLETO] Estado del
Pago 1` **ya tiene datos reales** — 2 clientes (`Terapias Holísticas
Verónica`, `Naiara Masajes y Bienestar`) marcados `Cobrado` el 05/10/2026,
hace 2 días. El flujo `Stripe - Enviar Enlace de Pago (Pago 1) [TEST]`
(§6.1) **ya está en uso real**, a pesar del sufijo `[TEST]` en su nombre —
no es un sandbox sin tocar. Esto refuerza la pregunta §0.1: si ya hay
clientes reales cobrados por ahí, probablemente esa es hoy la
implementación autoritativa de Pago 1, no la legacy de Sheets — a
confirmar con Juanfra/Juan, no asumirlo.

`Cobros` sigue vacía (confirmado, ningún cliente de la muestra tiene el
link poblado) — coincide con lo que dice el maestro de Notion.

**Changelog**: v1.0 del mockup ya incorpora los cambios que pidió la
compañera que lo validó. Este documento queda actualizado contra esa versión
(commiteada en `ruta-de-arranque.html`); las secciones de abajo reflejan el
estado actual, no el borrador inicial.

**Segunda ronda de cambios de la compañera** (ya aplicados en el mockup):
1. Checklist de "Material recibido" en Onboarding: se suma un 4º ítem,
   **Fanpage**.
2. El enlace de pago del Pago 2 ahora se muestra en el CRM (caja copiable)
   en cuanto se envía, para poder reenviarlo a mano por WhatsApp — y caduca
   a las **24 horas** del envío (se ve la fecha límite). Se pidieron 48h,
   pero el límite nativo de Stripe para `expires_at` es 24h — ver §6.9.
3. Tres avisos de Slack distintos a `#montaje-campañas`, no dos:
   material completo (ya existía) → Pago 2 cobrado, "a lanzar" (ya existía)
   → **nuevo**: confirmación de que Micaela activó la campaña, al pulsar
   "Activar Campaña". Este tercer aviso es nuevo en esta ronda.

**Tercera ronda de cambios** (de Juanfra, ya aplicada en el mockup):
4. Al pulsar "Activar Campaña" también sale un **cuarto aviso**, distinto
   de los tres de Slack: un **WhatsApp al cliente** (no al equipo) diciendo
   que su campaña ya está activa. Es el único de los cuatro que sale fuera
   de Nemetea. Se añadió un campo `whatsapp` (número) a cada cliente de
   ejemplo del mockup — en Airtable ya existe `Clientes.WhatsApp`, así que
   no hace falta campo nuevo cuando se conecte de verdad.
   **Pregunta nueva para el sync**: ¿quién tiene o monta la integración de
   WhatsApp para enviar este mensaje — API de WhatsApp Business vía n8n, o
   algo manual? El maestro de Notion de Juan dice explícitamente que
   "WhatsApp Business API queda por presupuesto separado, no entra en
   scope hasta aprobación" — este aviso puede chocar con esa decisión de
   alcance y hay que aclararlo, no asumir que ya está disponible.

## 0ter. Flujo completo, confirmado por Juanfra (08/10)

Juanfra describió el flujo de punta a punta con el detalle que faltaba.
Queda aquí como referencia — corrige algunas suposiciones del mockup y deja
claro qué falta por construir en cada pestaña.

**Onboarding**: los clientes que entran aquí son los que el closer acaba de
cerrar en el **panel de alta de cliente** (`alta-cliente-nemetea.html`) —
Onboarding es la continuación de ese flujo, no un punto de entrada aparte.
Micaela necesita ver **nombre, tipo de entrada y entidad** de un vistazo en
la lista — ya aplicado (§0quater.1). Enviar la carpeta de Drive es manual
fuera del sistema en esta primera versión (el botón de "marcar enviada"
sigue siendo solo eso, un registro, no un envío automático); la automatización
real del envío es una fase posterior. Marcar la carpeta enviada arranca el
contador de 21 días; cuando el cliente entrega todo y Micaela da el visto
bueno, marca "Material Completo" — ahí se para el contador y el cliente
pasa a "Montaje de campaña".

**Montaje de campaña**: pantalla mayormente informativa — Micaela ve de un
vistazo las campañas en montaje con Contact Center/bonificación/penalización
(ya estaba). Cuando el equipo avisa (fuera del CRM) de que todo está listo,
Micaela **le envía ella misma al cliente, por WhatsApp, la landing y el
material** — esto antes era un toggle pasivo, ahora es una acción real que
compone y muestra el mensaje de WhatsApp enviado (§0quater.2). Al marcar
"Campaña lista →" pasa a la siguiente pestaña.

**Cobro y activación**: Micaela tiene que ver **arriba, bien distinguible**,
si el cliente tiene bonificación de Contact Center o alguna penalización —
antes solo aparecía en Montaje, ahora también aquí (§0quater.3). Marca los
toggles correspondientes, el sistema suma el total y prepara el enlace de
Stripe — el enlace se envía al cliente por email automáticamente, y **además
aparece en el CRM para que Micaela lo copie y lo reenvíe ella misma por
WhatsApp** (ya estaba, §2.2). Cuando el cliente paga, el sistema tiene que:
1. Dejar una **señal visible si Micaela no está en esa pestaña/cliente** —
   como una notificación de WhatsApp sin leer. Era el hueco más grande:
   antes el "Cobrado" solo se veía si ya estabas mirando esa ficha. Ahora
   hay una burbuja numerada en la pestaña y en la ficha del cliente, que se
   borra al abrir esa ficha (§0quater.4).
2. Mostrar la confirmación de pago en la ficha del cliente al entrar (ya
   estaba: la tarjeta "✓ Cobro confirmado por Stripe").
3. Avisar por Slack al equipo de montaje (ya estaba: `slackLanzamientoEnviado`,
   "Pago 2 confirmado, a lanzar").

Con el pago confirmado, Micaela marca "Activar Campaña" y el equipo de
montaje activa la campaña en redes — eso dispara los avisos 3 y 4 ya
documentados (§2.3, §0quater).

## 0quater. Segunda vuelta de correcciones de interfaz (08/10, ya aplicadas)

1. **Onboarding**: la ficha de la lista ahora muestra `Tipo de entrada ·
   Entidad` como línea propia, destacada, justo bajo el nombre — antes el
   tipo de entrada estaba mezclado con el chip de Contact Center y la
   entidad no aparecía en absoluto en la lista (solo en el detalle).
2. **Montaje**: "Envío de contenido" deja de ser un toggle manual y pasa a
   ser una acción real — botón "Enviar por WhatsApp →" que compone y
   muestra el mensaje (landing + vídeos) enviado al número de WhatsApp del
   cliente, igual que ya hacía el aviso de activación. El botón "Campaña
   lista →" sigue bloqueado hasta que se envíe.
3. **Cobro y activación**: los chips de bonificación de Contact Center y
   penalización ahora se ven también arriba del todo (antes solo en
   Montaje) — era un pedido explícito, "que se distinga bien".
4. **Burbuja de notificación de pago confirmado** (nuevo, no existía en
   ningún punto anterior del mockup): cuando se confirma el Pago 2 por
   webhook, el cliente queda marcado como "sin ver" — aparece una burbuja
   verde numerada en la pestaña "Cobro y activación" y en la ficha del
   cliente en la lista, hasta que Micaela abre esa ficha (clic en la
   tarjeta). Antes no había ninguna señal si ella no estaba ya mirando
   justo esa ficha cuando llegaba la confirmación.
5. **Botón y mensaje de activación corregidos**: el botón seguía diciendo
   "Campaña activa ✓" una vez pulsado, y el texto de ayuda daba a entender
   que el equipo confirmaba primero y Micaela solo lo registraba después —
   al revés de cómo es en realidad. Ahora el botón sigue diciendo "Activar
   Campaña" (con un ✓ una vez hecho) y el texto dice "Pulsa para avisar al
   equipo de que ya pueden activarla". El mensaje de Slack que dispara pasa
   de una frase en pasado ("Campaña activada... ya está en marcha") a una
   instrucción ("Activa Campaña... ya podéis activarla en redes") — es
   Micaela quien dispara el aviso, el equipo activa después, no al revés.

## 0quinquies. Nueva 4ª pestaña: "Primer mes" (08/10, ya aplicada)

Tras pulsar "Activar Campaña" el cliente ya no sale del flujo — pasa a una
**4ª pestaña nueva, "Primer mes"**, donde vive mientras dura su primer mes
de campaña. Durante ese mes, cualquier duda o consulta del cliente la
gestiona Micaela desde ahí, no por fuera.

Misma estructura que el resto (tarjetas a la izquierda, detalle a la
derecha), pero el detalle es casi solo un cuaderno de notas: reutiliza el
mismo patrón de nota + historial que ya existía en Onboarding (mismo
`c.historial` del cliente, no uno aparte — sigue siendo "un único registro
por cliente"). Cada ficha muestra un contador de días en seguimiento (chip
`Día X de seguimiento`, pasa a `warm` cerca del día 28). Cuando se cumple
el mes, un botón "Cerrar seguimiento" saca al cliente de la pestaña (pasa a
`fase: "Graduado"`, que ninguna pestaña del CRM filtra — deja de aparecer
en cualquier lista, consistente con "lo quite de esa pestaña").

No hay automatización ni integración nueva en este añadido — es una
pestaña más de gestión manual, igual que Onboarding lo era en su momento.
## 1. Fuentes

- **Mockup v1.0** (`ruta-de-arranque.html`, en este repo): **3 pestañas** —
  Onboarding, Montaje de campaña, Cobro y activación (antes Cobro vivía
  dentro de Montaje; ahora es su propia fase y pantalla). Datos de ejemplo en
  JS, sin backend.
- **Contexto Juanfra** (PDF, 07/10): backend de Pago 1 ya probado, Pago 2 sin
  workflow de n8n, esquema de Cobros/Pagos nuevo propuesto por Juan.
- **Juan Cantele v2**: esquema real de `Clientes` / `Cobros` / `Pagos` en la
  base `appEZnB8ZDVAcBDAV`, con reglas de moneda, campos obsoletos marcados
  (no borrados) y una lista propia de pendientes de cerrar con Juanfra.

## 2. Qué cambió entre la v1 del mockup y esta v1.0 (cambios de la compañera)

Esto importa porque varios de los huecos que habíamos detectado en la
primera pasada **desaparecieron** con estos cambios, y aparecieron otros
nuevos:

1. **3 pestañas en vez de 2.** "Cobro y activación" se separa de Montaje en
   su propia fase (`fase: "Cobro"`) y pantalla. El cliente pasa de Montaje a
   Cobro cuando Micaela marca "Campaña lista →", no cuando se cobra el Pago 2.
2. **Se elimina el split Equipo 1 / Equipo 2.** Todas las pestañas muestran
   "Micaela" como responsable — ya no hay noción de equipo asignado en esta
   interfaz.
3. **Se elimina la lista de 5 tareas de montaje** (Edición de vídeo,
   Planillas, SAP, Landing, Anuncios) con responsable/estado/link. El panel
   de Montaje ahora es mucho más ligero: un toggle de "Contenido entregado"
   + un botón "Campaña lista →". El equipo de montaje **no usa este panel en
   absoluto** — trabaja fuera, en sus propias herramientas, y solo entra en
   escena vía Slack.
4. **Dos avisos de Slack, no uno genérico:**
   - Al marcar "Material Completo" (Onboarding → Montaje): mensaje a
     `#montaje-campañas` con cliente, contacto, tipo de entrada, si califica
     regalo CC, entidad y plazo de 10 días hábiles. Confirma lo que decía el
     PDF: un único disparo en este punto.
   - Al confirmar el cobro del Pago 2 (webhook Stripe, dentro de "Cobro y
     activación"): **nuevo** mensaje a `#montaje-campañas` avisando que
     pueden lanzar. Este es el que faltaba por construir según el PDF.
5. **Día de cobro con Tarjeta ya corregido a 28** en el código
   (`diaCobro = SEPA ? 27 : 28`). Ya no es una discrepancia pendiente.
6. **Método de cobro**: el texto ahora es explícito — "se eligió ya en el
   Alta y rige desde el Pago 2 en adelante (mes 2, mes 3, prorrateo, ciclo
   natural)". Coincide con lo que pedía el PDF y con
   `Clientes.Método de Cobro Recurrente`.
7. **Activar Campaña** ya no es un `alert()`: ahora marca `c.activada = true`
   y registra una nota de historial ("se registra Fecha de Activación y pasa
   a «Activa» en Campañas") — y esos dos campos **ya existen** en
   `Campañas` (`Fecha de Activación`, `Estado de la Campaña`).

Nota técnica aparte: el HTML subido traía una envoltura duplicada
(`<!doctype html><html>…</html>` de una vista previa, antes y después del
documento real). La versión que copié al repo ya viene limpia — un solo
documento.

## 3. Lo que ya existe en Airtable y cubre al mockup

| Concepto del mockup | Campo/tabla real | Nota |
|---|---|---|
| Entidad (SLU/LLC) → moneda | `Clientes.Moneda` + `Clientes.Tasa Aplicada` | El mock decide USD por `entidad`; Juan dice que lo correcto es `Moneda`, no la entidad. Sigue pendiente de cambiar el criterio en el mock. |
| Método de cobro (SEPA/Tarjeta) | `Clientes.Método de Cobro Recurrente` | Ya a nivel cliente, y el mock v1.0 ya lo trata como fijado desde el Alta — coincide. |
| Pago 1 | `Pagos` con `Tipo = Pago 1`, `Nº de cuota = 1` | Backend ya probado según el PDF — falta confirmar si ya escribe en `Pagos` o todavía en los campos `[OBSOLETO]` de `Clientes` (pregunta abierta de Juan, ver §5). |
| Pago 2 | `Pagos` con `Tipo = Segundo pago`, `Nº de cuota = 2` | Sin workflow n8n todavía. El webhook debe: marcar esta fila `Pagado` + disparar el Slack de "a lanzar" (nuevo en v1.0) + habilitar el botón "Activar Campaña". |
| Enlace de pago copiable (Pago 2) | `Pagos.Enlace de pago` (`fld64ioSvid9yoLur`, url) | Ya existe en el esquema de Juan, descrito literalmente como "fallback para copiar y mandar a mano" — encaja con el pedido de la compañera. Caducidad decidida en 24h (§6.9), sin campo propio todavía (§4.6). |
| Activar Campaña | `Campañas.Fecha de Activación` + `Campañas.Estado de la Campaña` | Ya existen — no hace falta modelar nada nuevo para esto. |
| Ajustes del Pago 2 (regalo CC, penalización, montaje, ajuste manual) | `Pagos.Concepto de ajuste` (select: Beneficio contact center / Penalización ampliación de plazo / Descuento comercial / Descuento referidos / Otro) + `Pagos.Importe ajuste` | El mock tiene 4 toggles independientes; Airtable modela **un** concepto de ajuste por fila. Si Pago 2 necesita varios ajustes a la vez (CC + penalización, p.ej.) hace falta más de una fila de `Pagos` tipo `Extra`, o ampliar el select. Pendiente de decidir (§5.6). |
| Checklist "Primeros Pasos" | `Clientes.Primeros Pasos` / `Respuestas Primeros Pasos` | Existe tabla de respuestas — falta ver si cubre fotos/vídeos o solo el formulario. |
| Total a cobrar, IVA, descuento referidos | `Clientes.Total a Cobrar (EUR) (calc)` / `...(Moneda de Cobro) (calc)` | Fórmula ya corregida por Juan el 07/10. El mock sigue calculando esto a mano con constantes propias (`PAGO2_BASE`, `CC_CHARGE_REGALO`, etc.) — hay que sustituirlo por estos campos, no reimplementar la fórmula en JS. |

## 4. Lo que el mockup rastrea y **no existe** todavía en Airtable

Con la simplificación de montaje (§2.3), esta lista se acorta bastante
respecto a la primera pasada:

1. **Carpeta de Drive enviada (fecha) + plazo de 21 días naturales +
   prórroga.** Sigue sin campo en `Clientes`. Candidatos: campos nuevos en
   `Clientes`, o eventos en `Actividades` (ya existe, con
   `Fecha de Ejecución`, `Resultado de la Actividad`, `Tipo de Actividad`).
   `Actividades` parece más coherente con el resto del esquema.
2. **Checklist de material** (fotos / vídeos / formulario / **Fanpage**, 4
   ítems ahora) con estado por ítem — a confirmar si `Respuestas Primeros
   Pasos` ya lo cubre.
3. **SLA de 10 días hábiles de montaje** (día X/10, calculado desde
   "material completo"). Depende del punto 1 (fecha de origen) más lógica de
   días hábiles — no existe como fórmula hoy.
4. **Contenido entregado + canal de entrega** (el toggle y el `canal` del
   panel de Montaje). No hay campo hoy para esto.
5. **Registro de los tres avisos de Slack** (mensaje + fecha de envío:
   `slackMontajeEnviado` al marcar material completo,
   `slackLanzamientoEnviado` al confirmarse el Pago 2, y el nuevo
   `slackActivacionEnviada` al pulsar "Activar Campaña"). Puede bastar con
   loguearlo como nota/comentario o como fila en `Actividades`
   (`Tipo de Actividad` = "Aviso Slack montaje" / "...lanzamiento" /
   "...activación") — no necesita campos nuevos si se modela como actividad.
6. **Caducidad del enlace de pago** — `Pagos.Enlace de pago` ya existe (§3).
   Decidido (§6.9): 24h, el límite nativo de `expires_at` en Stripe, ya
   aplicado en el mockup. Para que el CRM muestre la fecha límite sigue
   haciendo falta guardar esa fecha en algún sitio —
   `Pagos.Fecha último proceso` + el plazo calculado al vuelo, o un campo
   nuevo si el cálculo no es trivial en Airtable.
7. **Historial de comunicación por cliente** (notas tipo comentario). Puede
   mapear a comentarios nativos de Airtable sobre el registro de `Clientes`.

Ya **no** hace falta modelar (resuelto por el cambio de la compañera,
ver §2.3): tareas de montaje con responsable/estado/link, ni tabla de
"Equipo 1/Equipo 2".

## 5. Discrepancias a corregir antes de construir

- **Entidad vs. Moneda** para decidir USD: el mock usa `entidad === "LLC"`
  (función `moneda(c)`), Juan dice que el campo correcto es `Clientes.Moneda`
  (puede haber excepciones no ligadas 1:1 a la entidad). Sigue sin corregir.
- **Fórmula de Total a Cobrar**: el mock reimplementa el cálculo con
  constantes locales en vez de leer los campos `(calc)` de `Clientes`. Una
  vez conectado, estas constantes deberían desaparecer del HTML.
- ~~Día de cobro con Tarjeta~~ — corregido en v1.0 (28).
- ~~Interfaz sin validar~~ — resuelto: esta v1.0 ya incorpora los cambios de
  la compañera.

## 6. Preguntas abiertas (combinando las de Juan + nuevas del cruce)

De Juan (su doc, §11, sin resolver aún):
1. ~~¿Dónde escribe hoy el flujo de Pago 1 y cuándo lo migra a `Pagos`?~~ —
   **decidido por Juanfra (08/10)**: el nuevo flujo `[TEST]` sobre Airtable
   es el autoritativo (ya tiene 2 clientes reales cobrados) — el legacy
   sobre Sheets se da por reemplazado. Falta migrar ese flujo para que
   escriba en `Pagos`/`Cobros` en vez de los campos `[OBSOLETO]` de
   `Clientes` — es la primera pieza de construcción (§9bis).
2. ~~¿Quién crea el registro de `Cobros` por cliente?~~ — **decidido por
   Juanfra (08/10)**: en un paso aparte, al dar de alta al cliente — no
   como parte del flujo de Pago 1. Hoy ese paso no existe todavía (el panel
   de alta no crea `Cobros`), hay que construirlo.
3. ~~¿La carga histórica la hace Juanfra directo en Airtable, o Juan prepara
   un CSV con el formato de `Pagos`?~~ — **resuelto** (maestro de Notion,
   M20, 7 oct): "Sin datos de pagos cargados: la carga la hace Juanfra al
   conectar Stripe." La hace Juanfra directo, no hace falta CSV de Juan.

Nuevas, de este cruce (actualizadas tras v1.0):
4. Onboarding (carpeta enviada / plazo / prórroga / checklist) y SLA de
   montaje: ¿viven en `Actividades`, en campos nuevos de `Clientes`, o se
   necesita algo más? Quién es el dueño de esa decisión de modelado (¿Juan,
   Juanfra, o se decide junto con Gonzalo/Micaela que son quienes operan
   estas pantallas)?
5. ~~Los 4 ajustes del Pago 2 ¿pueden coexistir en una misma cuota?~~ —
   **decidido por Juanfra (08/10)**: sí, coexisten — una fila de `Pagos`
   por cada ajuste aplicado (`Tipo = Extra`, cada una con su propio
   `Concepto de ajuste`), separada de la fila del propio Segundo pago.
6. ~~¿Quién genera las filas `Mensual` futuras de `Pagos`?~~ — **resuelto
   (08/10)**: un webhook de Stripe (`invoice.paid`) crea cada fila al vuelo
   cuando se cobra — no se precrean filas "Previsto" de antemano.
7. Los tres avisos de Slack (mockup: `#montaje-campañas` — material
   completo, Pago 2 confirmado, campaña activada) — **parcialmente
   verificado** (§7.3): ya existe un canal real `#activación-de-campaña`
   que n8n usa hoy al confirmarse el Pago 2 en el pipeline legacy. Falta
   decidir si el mockup reutiliza ese canal o usa uno nuevo, y si lo
   dispara n8n (más consistente con cómo ya funciona) o esta interfaz
   directamente. ¿Hace falta guardar el mensaje enviado en Airtable (como
   actividad) o basta con que quede en Slack?
8. **Nuevo**: con el panel de Montaje reducido a "Contenido entregado" +
   "Campaña lista →", ¿quién marca ese botón en la práctica — Micaela
   esperando el aviso del equipo por Slack (como dice el mock), o hace falta
   que el propio equipo de montaje tenga algún disparador (p. ej. reaccionar
   al mensaje de Slack) en vez de depender de que Micaela lo traduzca a mano?
9. ~~Caducidad del enlace de pago~~ — **decidido**: opción (a). Stripe solo
   admite 24h en `expires_at` para un Checkout Session, así que la validez
   del enlace de Pago 2 es **24 horas**, no 48 — ya aplicado en el mockup
   (`ruta-de-arranque.html`). Se descartan la opción (b) (regenerar el
   enlace a medio camino) y la (c) (otro objeto de Stripe) por complejidad
   innecesaria.

## 7. Modelo de suscripción: Pago 2 → permanencia → ciclo natural

### 7.1 Mecanismo verificado contra n8n (no es una suposición)

Juanfra confirma que **ya existe en n8n** un pipeline de producción maduro
(series numeradas `1.` a `9.`, separado en SLU/LLC, con copias `[TEST]` y
`[PROD]`) que ya implementa suscripción + prorrateo. Se leyeron directamente
los workflows `2. SLU Handle Stripe checkout payments` [PROD] y
`4. SLU Handle canceled Stripe bridge and permanent subscriptions` [PROD]
para entender el mecanismo real, en vez de suponerlo. Esto **reemplaza** la
hipótesis anterior de este documento (Stripe Subscription Schedules) — el
mecanismo real es otro:

1. **Al confirmarse el checkout de Pago 2** ("campaign activation" en el
   nombre de los nodos), el workflow `2.` crea directamente una
   **suscripción "bridge" de Stripe** (`POST /v1/subscriptions`) con:
   - `billing_cycle_anchor` = dentro de ~1 mes desde la confirmación (hora
     aleatoria entre la 1am y las 7am, para no agrupar cobros).
   - `cancel_at` = exactamente 2 meses después del anchor (así que la
     suscripción cubre mes 2 y mes 3; el propio Pago 2 ya se cobró aparte,
     en el checkout).
   - `proration_behavior: none`, `payment_behavior: default_incomplete`.
   - `metadata.bridge_phase = "true"` — así es como se identifica luego.
   - Admite `card` y `sepa_debit` como métodos de pago.
2. **Cuando la suscripción bridge llega a su `cancel_at`** (automático, lo
   dispara Stripe), llega un webhook `customer.subscription.deleted`. El
   workflow `4.` comprueba `metadata.bridge_phase === "true"` y si es así:
   - Calcula el **prorrateo** ("gap") hasta fin de mes natural, por línea de
     producto, aplicando IVA 21% y retención 15% (caso autónomo) y el cupón
     de descuento por referido si aplica.
   - Si el importe del gap es mayor que cero: crea una factura en **Holded**
     (no solo Stripe) para el prorrateo, la marca pagada y la envía — y crea
     también el invoice item + invoice correspondiente en **Stripe** para
     cobrar ese importe.
   - Crea la **suscripción "permanent"** (`metadata.permanent_phase =
     "true"`), con `billing_cycle_anchor` alineado al **día 27 (SEPA) / 28
     (Tarjeta)** — confirma exactamente lo que dijo Juanfra, línea de código
     real: `const targetDay = pmType === 'sepa_debit' ? 27 : 28;`.

### 7.2 Hallazgo importante: este pipeline no usa Airtable

Los workflows `1.`/`2.`/`4.` (y el resto de la serie) escriben en **Google
Sheets** (`Clientes sheet`, `Modificar Suscripciones sheet`, `Reuniones
Calendly sheet`) y en **Holded** (facturación), no en Airtable. Es decir:
el mecanismo de suscripción/prorrateo que pidió la compañera y confirma
Juanfra **ya existe y funciona en producción**, pero sobre un sistema
distinto al que se está construyendo con `Ruta de Arranque` + Airtable +
el esquema de Juan. Esto es una pregunta de arquitectura real para el sync
del jueves, no algo que yo deba decidir:

- **Decidido con Juanfra**: no se reutilizan los workflows 1–9 tal cual (
  arrastran Google Sheets, Calendly, la duplicación SLU/LLC y TEST/PROD, y
  mezclan Pago 1 con Pago 2 en el mismo flujo). Se construyen workflows
  **nuevos, sobre Airtable**, **portando** (copiando y adaptando, no
  reinventando) las tres piezas de lógica ya resueltas y probadas:
  1. El cálculo del gap/prorrateo (IVA 21%, retención 15% autónomo,
     redondeo en céntimos, cupón de descuento por referido).
  2. Los parámetros exactos de creación de la suscripción bridge
     (`billing_cycle_anchor` con tope de seguridad + hora aleatoria,
     `cancel_at` a 2 meses del anchor, `metadata.bridge_phase`).
  3. La doble facturación Stripe + Holded (factura en Holded, marcarla
     pagada, enviarla; invoice item + invoice en Stripe).
- El propio Pago 1 tenía **dos implementaciones en paralelo**: la legacy
  (`1. SLU Initial payment`, sobre Sheets+Holded) y la nueva en pruebas
  (`Stripe - Enviar Enlace de Pago (Pago 1) [TEST]`, sobre Airtable).
  **Resuelto (§6.1)**: la nueva es la autoritativa — hay que migrarla para
  que escriba en `Pagos`/`Cobros` en vez de los campos `[OBSOLETO]` de
  `Clientes`.

### 7.3 Otro hallazgo: el canal de Slack ya existe, y no es el que inventé

El workflow `2.` ya envía una notificación de Slack al confirmarse el Pago 2
("Pago activación de campaña completado") al canal real
**`#activación-de-campaña`** (`C0BP5KCEFD5`) — no a `#montaje-campañas`,
que fue un nombre que yo me inventé al construir la sección de avisos en el
mockup sin tener este dato. Hay un canal `#comercial` (`C0B5ZAEH127`)
aparte para el aviso de Pago 1. **Pendiente de decidir con Juanfra**: ¿el
nuevo mockup reutiliza `#activación-de-campaña`, o es un canal nuevo porque
el flujo de "Ruta de Arranque" tiene pasos distintos (material completo,
campaña lista, activación) a los de este pipeline legacy? El mockup sigue
diciendo `#montaje-campañas` hasta que se confirme.

### 7.4 Nota de seguridad (no es parte del encargo, solo queda anotada)

El nodo `Validate the incoming data` del workflow `4.` verifica la firma de
Stripe con un `endpointSecret` **hardcodeado en el código** del nodo
(`whsec_...`), en vez de usar una credencial de n8n. Es una práctica
delicada (el secreto queda visible a cualquiera con acceso de lectura al
workflow) — se deja anotado para quien revise seguridad, no se ha tocado.

## 8. Qué no se toca todavía

- Nada en Airtable: no se crean campos, no se borran los `[OBSOLETO]`, no se
  cargan pagos de prueba en `Pagos`/`Cobros` (ambas están vacías en
  producción).
- ~~No se construye el workflow de n8n para Pago 2 ni la integración de
  Slack.~~ — **hecho (08/10)**, ver §9 Paso 4.
- La transición suscripción puente → permanente (cancelación a los 3 meses,
  prorrateo, facturación Holded, día 27 SEPA/28 Tarjeta) sigue **sin
  construir** — decisión explícita de Juanfra de dejarla fuera del alcance
  de hoy, porque ese evento no dispara hasta meses después y no hace falta
  para la prueba end-to-end de un cliente de prueba.
- El endpoint de n8n para "Activar Campaña" y la creación del registro de
  `Campañas` siguen **sin construir** — se espera a que la interfaz real
  esté conectada a Airtable.
- No se reescribe `ruta-de-arranque.html` para leer/escribir Airtable todavía.

## 9. Paso a paso (orden de dependencias, no una lista de deseos)

Cada paso solo arranca cuando el anterior está cerrado — no se trabaja en
paralelo en pasos que dependen uno del otro, para no construir sobre una
decisión que puede cambiar al día siguiente.

**Paso 0 — hoy, sin bloqueos.**
Validación de lectura: conectar el mockup en modo solo lectura contra
Airtable real (identidad del cliente, `Moneda`, `Total a Cobrar (EUR)
(calc)`, `Estado del Pago 1`) para confirmar que el mapeo de campos que
hemos supuesto es correcto contra clientes reales. Sin escribir nada. Sirve
también para traer al sync cualquier sorpresa de última hora. (Antes era
"fase 3" — se adelanta porque no depende de nada que falte por decidir.)

**Paso 1 — decisiones cerradas directamente con Juanfra (08/10), sin
esperar al sync formal con Juan.** Resueltas: Pago 1 autoritativo = el
nuevo `[TEST]` sobre Airtable (§6.1); `Cobros` se crea al dar de alta al
cliente, no en el flujo de Pago 1 (§6.2); los 4 ajustes del Pago 2 coexisten
como filas `Tipo=Extra` separadas (§6.5); las cuotas recurrentes de la
suscripción (mes 2, mes 3, ciclo natural) las crea un webhook de Stripe al
vuelo (§6.6). Sigue pendiente de Juan/Gonzalo/Micaela: dónde vive el
modelo de onboarding/SLA (§6.4) y el canal de Slack (§6.7) — no bloquean
empezar el backend de Pago 1/Pago 2, que es independiente de esas dos.

**Paso 2 — cerrar el modelo de datos que falta (onboarding/SLA, §6.4).**
Puede avanzar en paralelo al Paso 3, no lo bloquea — afecta a Onboarding/
Montaje, no a Pago 1/Pago 2.

**Paso 3 — construir la base sobre la que escribe Pago 2.**
3a. ~~Añadir a "Alta Cliente - Guardar Datos" la creación del registro de
    `Cobros` del cliente~~ — **hecho y publicado (08/10)**. Nodo nuevo
    `HTTP Crear Cobros Airtable` en paralelo (fan-out) tras crear el
    Cliente — no toca ni altera la respuesta existente, que ya procesó
    clientes reales. Crea el `Cobros` enlazado por `Cliente`. Si falla,
    avisa por Slack (`Slack - Aviso Error Crear Cobros`, canal `systems`)
    con la empresa y el `record_id`, para crearlo a mano. Juanfra asignó la
    credencial de Airtable a mano (no se podía por API en este tipo de
    nodo) y publicó el cambio — confirmado en vivo (`versionId` =
    `activeVersionId`). Primer cliente nuevo que entre por este flujo
    servirá de prueba real.
3b. ~~Migrar `Stripe - Enviar Enlace de Pago (Pago 1) [TEST]` y
    `Stripe - Confirmación de Pago (Webhook) [TEST]` para que escriban en
    `Pagos`~~ — **hecho (08/10)**. Ambos workflows crean/actualizan filas en
    `Pagos` (`Tipo = Pago 1`), localizando la fila a parchear por
    `filterByFormula` sobre `Stripe Checkout Session ID` (Airtable no tiene
    "update por filtro"). Es la plantilla que reutiliza Pago 2.

**Paso 4 — construir el workflow nuevo de n8n para Pago 2.** — **hecho
(08/10)**, alcance acordado con Juanfra: hasta "Pago 2 confirmado +
suscripción puente creada", sin tocar la transición puente→permanente ni
el endpoint de Activar Campaña (ver §8). Dos workflows nuevos, en
`Nemetea / JUANFRA NUEVOS FLUJOS`:

- **`Stripe - Enviar Enlace de Pago (Pago 2) [TEST]`**
  (`nDTuFSHGiFbGoBOp`, webhook `POST /enviar-enlace-pago-2`). Recibe
  `{record_id, ajustes:{cc, montaje, penalizacion, ajusteManual,
  ajusteManualConcepto, ajusteManualConceptoSelect}}`. Reutiliza
  directamente el `ID Cliente Stripe` ya guardado en el `Cliente` por Pago
  1 (responde con error si no existe — no vuelve a llamar al sub-flujo
  `crear-cliente-stripe`, sería una llamada de red innecesaria). Calcula
  cada línea (base 248,50€ + ajustes) aplicando el `Factor Impuesto` real
  por entidad/Canarias y conversión EUR→USD vía `Tasa Aplicada` (mismo
  criterio que Pago 1). Decisión de Juanfra: **`price_data` dinámico por
  cliente**, no los Price ID fijos que usa el pipeline legacy. Como Stripe
  no acepta líneas con importe negativo, un descuento se resta de las
  líneas positivas antes de construir el checkout, y se crea **una sola
  línea de Stripe** con el importe neto total (no una línea por ajuste);
  la contabilidad fina sí queda itemizada en Airtable: una fila en `Pagos`
  por concepto (`Tipo=Segundo pago` para la base, `Tipo=Extra` por cada
  ajuste, con `Concepto de ajuste` y `Importe ajuste` con signo), todas
  compartiendo el mismo `Stripe Checkout Session ID`. Caso "sin cobro" (neto
  ≤ 0 tras descuentos): se salta Stripe y las filas quedan `Estado=Anulado`.
- **`Stripe - Confirmación de Pago 2 (Webhook) [TEST]`**
  (`Cla0BPONZfdsnKb3`, webhook `POST /stripe-pago2-confirmado`, endpoint de
  Stripe nuevo creado en modo TEST, evento `checkout.session.completed`,
  estilo de carga **snapshot** no thin — hace falta el objeto completo
  dentro del evento). Verifica la firma (HMAC, credencial dedicada nueva
  `TEST Stripe Webhook Secret Pago2`, **no reutilizar** la de SLU). Marca
  `Estado=Pagado` en **todas** las filas de `Pagos` que comparten el
  `Stripe Checkout Session ID` (puede haber varias, una por concepto).
  Crea la **suscripción puente** (3 meses) portando el algoritmo real de
  producción (`billing_cycle_anchor` ≈1 mes vista con hora aleatoria 1–6h
  y capping de seguridad, `cancel_at` = ancla + 2 meses,
  `metadata.bridge_phase=true`, `proration_behavior=none`,
  `payment_behavior=default_incomplete`, método de pago por defecto tomado
  del `payment_intent` del checkout). Importe de la cuota puente: en vez
  de recalcular IVA/Contact Center/descuento por referido a mano, **lee
  directamente el campo ya calculado por Airtable** `Total a Cobrar en
  Moneda de Cobro (calc)` del `Cliente` — ese campo ya aplica todo. Avisa
  por Slack en `#activación-de-campaña` (mismo canal que usa el pipeline
  legacy para este evento).

Pendiente de probar de principio a fin con un cliente de prueba real.
Sigue abierto, explícitamente fuera de alcance por ahora: el webhook de
`invoice.paid` que crea cada cuota recurrente al vuelo (§6.6) y la
transición puente→permanente (§8).

**Paso 5 — conectar escritura desde la interfaz.**
Solo para lo que de verdad debe tocar un humano: checklist, contenido
entregado, "Campaña lista →", "Activar Campaña". Todo lo demás (estado de
pago, fechas de cobro, suscripciones) lo escribe n8n/Stripe, nunca la
interfaz a mano. Este paso va último porque necesita que los pasos 2–4 ya
estén escribiendo datos reales para conectar contra algo.

**Paso 6 — periodo de prueba en paralelo.**
Mínimo dos semanas de Ruta de Arranque + Pago 2 nuevo corriendo sin
incidencias junto al sistema legacy, antes de plantear retirar los
workflows 1–9 (regla de gobierno de Juan, §10.2).

## 10. Lo relevante del documento maestro de Notion (Juan)

Juan lleva un documento maestro en Notion ("NEMETEA CRM — Migración
Airtable") que registra todo el proyecto de migración de Airtable, no solo
Cobros/Pagos — Prospectos, Leads, Campañas, KPIs, etc. La mayoría no afecta
a Ruta de Arranque. Lo que sí:

### 11.1 Resuelve preguntas que teníamos abiertas

- **Carga histórica de pagos** (§6.3): confirmado, la hace Juanfra al
  conectar Stripe — ya no es pregunta.
- **M20 (7 oct, mismo día que el doc de Juan que ya teníamos)**: confirma
  la misma reestructuración Cobros/Pagos que ya documentamos en §3 — mismo
  modelo, sin contradicciones. `Pagos` es la tabla 17, `Cobros` la 16.
- **Actividades es polimórfica de verdad** (COR-002): cuelga de Lead,
  Campaña **o Cliente**. Esto respalda la recomendación de §4 de modelar
  ahí la carpeta enviada / plazo / material completo / avisos de Slack, en
  vez de inventar campos nuevos en `Clientes` — es exactamente el patrón
  para el que está pensada esa tabla. Para usarla hace falta dar de alta
  nuevos `Tipos de Actividad` (ej. "Carpeta enviada", "Material completo",
  "Aviso Slack montaje") en su catálogo (`tblDimCZYGQ0Z3wcu`, 13 tipos
  cargados hoy).

### 11.2 Afecta a una decisión que ya habíamos tomado

**Regla de gobierno de la migración**: "Construir en Airtable en paralelo
con Sheets activo. No cortar Sheets hasta dos semanas de operación paralela
sin incidencias." Esto no contradice la decisión de construir workflows
nuevos sobre Airtable portando la lógica (no reutilizar los 1–9), pero sí
implica que **los workflows legacy sobre Sheets probablemente siguen vivos
un tiempo** en paralelo con los nuevos, no se apagan el mismo día. Pregunta
nueva en §0.9.

### 11.3 Contexto de equipo (puede explicar quién es "la compañera")

Corrección de personas del 15 sept: **Tamara es UI developer y trabaja en
la interfaz** — es la candidata más probable a ser "la compañera" que pidió
matizar `ruta-de-arranque.html` (sin confirmar, pero encaja). También:
Ani es Head of Performance, y **Juanfra reemplaza a Diego en
automatizaciones** — las referencias a "coordinación con Diego" en
documentación más antigua (incluida dentro de este mismo maestro, sección
de restricciones técnicas) están desactualizadas.

### 11.4 Restricciones operativas a tener en cuenta al construir el workflow de Pago 2

- Rate limit de Airtable: **5 peticiones por segundo por base**, en todos
  los planes — el workflow nuevo de n8n tiene que respetarlo.
- Plan de Airtable actual es de arranque (Free/Team); Business/Enterprise
  se decide más adelante — no es bloqueante hoy, pero a 120+ clientes con
  filas de `Pagos` por cuota puede acercarse a límites de registros antes
  de lo esperado.

### 11.5 No es parte de ningún milestone todavía

El plan de milestones del maestro (M0–M20) cubre la construcción de las
tablas base de Airtable, no construye Ruta de Arranque ni el workflow de
Pago 2 — eso vive hoy solo en este documento. Si se quiere que conste en
el maestro de Juan (para que el resto del equipo lo vea), probablemente le
corresponda su propio milestone (M21 o similar) una vez el sync de mañana
resuelva el punch list de §0 — decisión de Juan, no algo que yo deba
proponerle sin que me lo pidan.

## 11. Referencia rápida de IDs (de Juan)

- Base: `appEZnB8ZDVAcBDAV`
- `Clientes`: `tbl6noqdseYfm4czi`
- `Cobros`: `tblpOwmanZUoUWcvH`
- `Pagos`: `tbl1wdaroBGCGCs30`
- `Actividades`: `tbliKYom7iqz7NfAX`
- `Campañas`: `tbleWdnYTdDph5cVQ`
- `Tipos de Actividad`: `tblDimCZYGQ0Z3wcu`
