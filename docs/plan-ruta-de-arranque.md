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
1. ¿Dónde escribe hoy el flujo de Pago 1 y cuándo lo migra a `Pagos`? —
   **verificado en n8n, sigue sin resolver del todo**: hay dos
   implementaciones en paralelo. La legacy (`1. SLU Initial payment`, serie
   1–9) escribe en Google Sheets + Holded. La nueva en pruebas (`Stripe -
   Enviar Enlace de Pago (Pago 1) [TEST]`) escribe en los campos
   `[OBSOLETO]` de `Clientes` en Airtable (`Estado del Pago 1`, `Fecha de
   Pago 1`, `Stripe Checkout Session ID (Pago 1)`) — todavía no en `Pagos`.
   Falta saber cuál de las dos es la autoritativa hoy (ver §7.2).
2. ¿Quién crea el registro de `Cobros` por cliente — el flujo al firmar
   contrato, o el script de carga de Juan?
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
5. Los 4 ajustes del Pago 2 del mock (CC, penalización, montaje, manual)
   ¿pueden coexistir en una misma cuota, y si sí, cómo se modela con un único
   `Concepto de ajuste` por fila de `Pagos`?
6. ~~¿Quién genera las filas `Mensual` futuras de `Pagos`?~~ — **aclarado en
   parte**: Juanfra confirma que al generar el enlace de Pago 2 se crea una
   **suscripción de Stripe** de 3 meses (ver §7 nueva). Eso responde "cuándo
   y por qué mecanismo" existen mes 2 y mes 3 — pero sigue sin cerrar cómo
   esas cuotas (y las del ciclo natural después) llegan a filas de `Pagos`:
   ¿un webhook de `invoice.paid` de la suscripción crea cada fila al vuelo,
   o hace falta un paso adicional que las vuelque desde Stripe? Pregunta
   para Juan.
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
- El propio Pago 1 ya tiene **dos implementaciones en paralelo** ahora
  mismo: la legacy (`1. SLU Initial payment`, sobre Sheets+Holded) y la
  nueva en pruebas (`Stripe - Enviar Enlace de Pago (Pago 1) [TEST]`,
  sobre Airtable, §6.1). Sigue sin resolver cuál es la autoritativa hoy —
  pendiente de confirmar con Juanfra/Juan en el sync.

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
- No se construye el workflow de n8n para Pago 2 ni la integración de Slack.
- No se reescribe `ruta-de-arranque.html` para leer/escribir Airtable todavía.

## 9. Fases propuestas (para discutir, no para arrancar solas)

1. **Cerrar huecos de modelo** (§4) con Juan/Gonzalo/Micaela: dónde vive
   onboarding (carpeta/plazo/prórroga/checklist), SLA de montaje, contenido
   entregado, y el registro de los avisos de Slack. Más corto que en la
   primera pasada porque las tareas de montaje ya no necesitan modelo.
2. ~~Aplicar la validación pendiente de la compañera~~ — hecho, es esta v1.0.
3. **Conectar lectura** (mockup → Airtable real, solo lectura) para las
   partes que ya tienen campo: identidad del cliente, moneda, total a
   cobrar, estado de Pago 1/Pago 2 desde `Pagos`. Sin escritura todavía —
   sirve para validar que el mapeo de campos es correcto contra datos
   reales.
4. **Construir el workflow de n8n de Pago 2** (enlace Stripe con expiración
   de 24h → al pagar, crear la suscripción de permanencia de 3 meses, §7 →
   webhook → `Pagos.Estado = Pagado` → Slack "a lanzar" → Slack "activada"
   al pulsar el botón), una vez resueltas las preguntas 1–3 y 5–9 y el
   mecanismo de suscripción de §7.
5. **Conectar escritura** desde la interfaz para los campos que de verdad
   debe tocar un humano (checklist, contenido entregado, campaña lista,
   activar campaña) — el resto lo escribe n8n/Stripe, nunca la interfaz a
   mano.

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
