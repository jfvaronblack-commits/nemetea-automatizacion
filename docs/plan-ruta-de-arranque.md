# Plan — Ruta de Arranque conectada a Airtable

Borrador de planificación, no de implementación. Objetivo: antes de tocar código
o el esquema de Airtable, dejar por escrito dónde encajan el mockup
(`ruta-de-arranque.html`), el contexto de Juanfra, y el estado real de Airtable
que describe Juan Cantele (`cobros_pagos_estado_actual_v2.md`, 07/10/2026).

**Changelog**: v1.0 del mockup ya incorpora los cambios que pidió la
compañera que lo validó. Este documento queda actualizado contra esa versión
(commiteada en `ruta-de-arranque.html`); las secciones de abajo reflejan el
estado actual, no el borrador inicial.

**Segunda ronda de cambios de la compañera** (ya aplicados en el mockup):
1. Checklist de "Material recibido" en Onboarding: se suma un 4º ítem,
   **Fanpage**.
2. El enlace de pago del Pago 2 ahora se muestra en el CRM (caja copiable)
   en cuanto se envía, para poder reenviarlo a mano por WhatsApp — y caduca
   a las **48 horas** del envío (se ve la fecha límite).
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
| Enlace de pago copiable (Pago 2) | `Pagos.Enlace de pago` (`fld64ioSvid9yoLur`, url) | Ya existe en el esquema de Juan, descrito literalmente como "fallback para copiar y mandar a mano" — encaja con el pedido de la compañera. Falta la **caducidad de 48h**, que no tiene campo propio (§4). |
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
6. **Caducidad de 48h del enlace de pago** — `Pagos.Enlace de pago` ya
   existe (§3), pero no hay campo que marque cuándo caduca. Puede resolverse
   sin campo nuevo si se calcula desde `Fecha último proceso` + 48h en n8n o
   en una fórmula, pero conviene decidirlo explícitamente.
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
1. ¿Dónde escribe hoy el flujo de Pago 1 y cuándo lo migra a `Pagos`?
2. ¿Quién crea el registro de `Cobros` por cliente — el flujo al firmar
   contrato, o el script de carga de Juan?
3. ¿La carga histórica la hace Juanfra directo en Airtable, o Juan prepara un
   CSV con el formato de `Pagos`?

Nuevas, de este cruce (actualizadas tras v1.0):
4. Onboarding (carpeta enviada / plazo / prórroga / checklist) y SLA de
   montaje: ¿viven en `Actividades`, en campos nuevos de `Clientes`, o se
   necesita algo más? Quién es el dueño de esa decisión de modelado (¿Juan,
   Juanfra, o se decide junto con Gonzalo/Micaela que son quienes operan
   estas pantallas)?
5. Los 4 ajustes del Pago 2 del mock (CC, penalización, montaje, manual)
   ¿pueden coexistir en una misma cuota, y si sí, cómo se modela con un único
   `Concepto de ajuste` por fila de `Pagos`?
6. ¿Quién genera las filas `Mensual` futuras de `Pagos` (cuota 3, 4, 5...) y
   en qué día del mes — n8n con un cron, o se generan todas de una vez al
   confirmar Pago 2?
7. **Nuevo**: los tres avisos de Slack (`#montaje-campañas`: material
   completo, Pago 2 confirmado, campaña activada) — ¿quién tiene (o crea) el
   webhook/app de Slack para ese canal, y lo dispara n8n o lo dispara esta
   interfaz directamente? ¿Hace falta guardar el mensaje enviado en Airtable
   (como actividad) o basta con que quede en Slack?
8. **Nuevo**: con el panel de Montaje reducido a "Contenido entregado" +
   "Campaña lista →", ¿quién marca ese botón en la práctica — Micaela
   esperando el aviso del equipo por Slack (como dice el mock), o hace falta
   que el propio equipo de montaje tenga algún disparador (p. ej. reaccionar
   al mensaje de Slack) en vez de depender de que Micaela lo traduzca a mano?
9. **Nuevo**: la caducidad de 48h del enlace de pago — ¿la hace cumplir
   Stripe (configurando el Checkout Session con expiración) o solo es una
   referencia visual en el CRM? Si es Stripe quien expira el enlace, hay que
   generar uno nuevo automáticamente o avisar a Micaela para que lo reenvíe.

## 7. Qué no se toca todavía

- Nada en Airtable: no se crean campos, no se borran los `[OBSOLETO]`, no se
  cargan pagos de prueba en `Pagos`/`Cobros` (ambas están vacías en
  producción).
- No se construye el workflow de n8n para Pago 2 ni la integración de Slack.
- No se reescribe `ruta-de-arranque.html` para leer/escribir Airtable todavía.

## 8. Fases propuestas (para discutir, no para arrancar solas)

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
4. **Construir el workflow de n8n de Pago 2 + los tres avisos de Slack**
   (enlace Stripe con expiración de 48h → webhook → `Pagos.Estado = Pagado`
   → Slack "a lanzar" → Slack "activada" al pulsar el botón), una vez
   resueltas las preguntas 1–3 y 5–9.
5. **Conectar escritura** desde la interfaz para los campos que de verdad
   debe tocar un humano (checklist, contenido entregado, campaña lista,
   activar campaña) — el resto lo escribe n8n/Stripe, nunca la interfaz a
   mano.

## 9. Referencia rápida de IDs (de Juan)

- Base: `appEZnB8ZDVAcBDAV`
- `Clientes`: `tbl6noqdseYfm4czi`
- `Cobros`: `tblpOwmanZUoUWcvH`
- `Pagos`: `tbl1wdaroBGCGCs30`
- `Actividades`: `tbliKYom7iqz7NfAX`
- `Campañas`: `tbleWdnYTdDph5cVQ`
