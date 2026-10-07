# Plan — Ruta de Arranque conectada a Airtable

Borrador de planificación, no de implementación. Objetivo: antes de tocar código
o el esquema de Airtable, dejar por escrito dónde encajan el mockup
(`ruta-de-arranque.html`), el contexto de Juanfra, y el estado real de Airtable
que describe Juan Cantele (`cobros_pagos_estado_actual_v2.md`, 07/10/2026).

## 1. Fuentes

- **Mockup** (`ruta-de-arranque.html`): 2 pestañas — Onboarding, Montaje de
  campaña (Cobro y activación vive dentro de Montaje). Datos de ejemplo en JS,
  sin backend.
- **Contexto Juanfra** (PDF): interfaz construida pero **sin validar por una
  compañera** (pidió matizarla), día de cobro Tarjeta corregido a 28 (el
  mockup actual todavía tiene 30 en el código), Pago 2 sin workflow de n8n,
  backend de Pago 1 ya probado.
- **Juan Cantele v2**: esquema real de `Clientes` / `Cobros` / `Pagos` en la
  base `appEZnB8ZDVAcBDAV`, con reglas de moneda, campos obsoletos marcados
  (no borrados) y una lista propia de pendientes de cerrar con Juanfra.

## 2. Lo que ya existe en Airtable y cubre al mockup

| Concepto del mockup | Campo/tabla real | Nota |
|---|---|---|
| Entidad (SLU/LLC) → moneda | `Clientes.Moneda` + `Clientes.Tasa Aplicada` | El mock decide USD por `entidad`; Juan dice que lo correcto es `Moneda`, no la entidad. Hay que cambiar el criterio. |
| Método de cobro (SEPA/Tarjeta) | `Clientes.Método de Cobro Recurrente` | Existe ya a nivel cliente — coincide con lo que pide el PDF ("se elige desde el alta, aplica desde Pago 1"). |
| Pago 1 | `Pagos` con `Tipo = Pago 1`, `Nº de cuota = 1` | Backend ya probado según el PDF — falta confirmar si ya escribe en `Pagos` o todavía en los campos `[OBSOLETO]` de `Clientes` (pregunta abierta de Juan, ver §5). |
| Pago 2 / activación | `Pagos` con `Tipo = Segundo pago`, `Nº de cuota = 2` | Sin workflow n8n todavía. El disparo a Gonzalo que hoy es un `alert()` en el mock debe ser: esta fila pasa a `Pagado`. |
| Ajustes del Pago 2 (regalo CC, penalización, montaje, ajuste manual) | `Pagos.Concepto de ajuste` (select: Beneficio contact center / Penalización ampliación de plazo / Descuento comercial / Descuento referidos / Otro) + `Pagos.Importe ajuste` | El mock tiene 4 toggles independientes; Airtable modela **un** concepto de ajuste por fila. Si Pago 2 necesita varios ajustes a la vez (CC + penalización, p.ej.) hace falta más de una fila de `Pagos` tipo `Extra`, o ampliar el select. Pendiente de decidir. |
| Checklist "Primeros Pasos" | `Clientes.Primeros Pasos` / `Respuestas Primeros Pasos` | Existe tabla de respuestas — falta ver si cubre fotos/vídeos o solo el formulario. |
| Total a cobrar, IVA, descuento referidos | `Clientes.Total a Cobrar (EUR) (calc)` / `...(Moneda de Cobro) (calc)` | Fórmula ya corregida por Juan el 07/10 (antes no sumaba Contact Center en SL). El mock calcula esto a mano con constantes propias — hay que sustituirlo por estos campos, no reimplementar la fórmula en JS. |

## 3. Lo que el mockup rastrea y **no existe** todavía en Airtable

Esto es nuevo trabajo de modelado, no solo de conexión:

1. **Carpeta de Drive enviada (fecha) + plazo de 21 días naturales + prórroga.**
   No hay campo en `Clientes` para esto. Candidatos: nuevos campos en
   `Clientes`, o eventos en `Actividades` (ya existe la tabla, con
   `Fecha de Ejecución`, `Resultado de la Actividad`, `Tipo de Actividad`).
   Actividades parece más coherente con el resto del esquema que añadir más
   campos sueltos a `Clientes`.
2. **Checklist de material (fotos / vídeos / formulario) con estado por ítem.**
   Puede vivir en `Respuestas Primeros Pasos` si ese modelo ya es extensible,
   o necesitar su propio tracking.
3. **Tareas de montaje** (Edición de vídeo, Planillas, SAP, Landing, Anuncios)
   con responsable, estado (Pendiente/En curso/Completado) y link de entrega.
   No hay tabla para esto hoy. Opciones: reusar `Actividades` con
   `Tipo de Actividad` = cada una de las 5 tareas, o crear tabla nueva
   `Tareas de Montaje`. Afecta a n8n (quién dispara cada tarea) y a quién la
   marca completada (¿Airtable directo, o esta interfaz?).
4. **SLA de 10 días hábiles de montaje** (día X/10, calculado desde
   "material completo"). Necesita el campo de origen (ver punto 1, el
   antecesor) más lógica de días hábiles — no existe como fórmula hoy.
5. **Historial de comunicación por cliente** (notas tipo comentario). El mock
   usa un campo de comentarios nativo simulado — puede mapear a comentarios
   nativos de Airtable sobre el registro de `Clientes`, en vez de un campo de
   texto largo.

## 4. Discrepancias a corregir antes de construir

- **Día de cobro con Tarjeta**: el código del mock todavía tiene `30`
  (`const diaCobro = ... === "SEPA" ? 27 : 30`); el PDF dice que el valor
  correcto es **28**. Falta aplicarlo.
- **Entidad vs. Moneda** para decidir USD: el mock usa `entidad === "LLC"`,
  Juan dice que el campo correcto es `Clientes.Moneda` (puede haber
  excepciones no ligadas 1:1 a la entidad).
- **Fórmula de Total a Cobrar**: el mock reimplementa el cálculo con
  constantes locales (`PAGO2_BASE`, `CC_CHARGE`, etc.) en vez de leer
  `Clientes.Total a Cobrar (EUR) (calc)` / `...(Moneda de Cobro) (calc)`.
  Una vez conectado, estas constantes deberían desaparecer del HTML.
- **Interfaz sin validar**: el PDF dice explícitamente que una compañera pidió
  matizar la interfaz y que sus cambios **no se han aplicado todavía**. Antes
  de invertir en conectar backend, conviene saber qué pidió — si afecta al
  flujo (pestañas, pasos, textos) es más barato cambiarlo ahora que después
  de cablear Airtable.

## 5. Preguntas abiertas (combinando las de Juan + nuevas del cruce)

De Juan (su doc, §11, sin resolver aún):
1. ¿Dónde escribe hoy el flujo de Pago 1 y cuándo lo migra a `Pagos`?
2. ¿Quién crea el registro de `Cobros` por cliente — el flujo al firmar
   contrato, o el script de carga de Juan?
3. ¿La carga histórica la hace Juanfra directo en Airtable, o Juan prepara un
   CSV con el formato de `Pagos`?

Nuevas, de este cruce:
4. ¿Qué pidió matizar la compañera que validó la interfaz? (bloqueante para
   no reconstruir dos veces)
5. Onboarding (carpeta enviada / plazo / prórroga / checklist) y Tareas de
   montaje: ¿viven en `Actividades`, en campos nuevos de `Clientes`, o en
   tablas nuevas? Quién es el dueño de esa decisión de modelado (¿Juan,
   Juanfra, o se decide junto con Gonzalo/Micaela que son quienes operan
   estas pantallas)?
6. Los 4 ajustes del Pago 2 del mock (CC, penalización, montaje, manual)
   ¿pueden coexistir en una misma cuota, y si sí, cómo se modela con un único
   `Concepto de ajuste` por fila de `Pagos`?
7. ¿Quién genera las filas `Mensual` futuras de `Pagos` (cuota 3, 4, 5...) y
   en qué día del mes — n8n con un cron, o se generan todas de una vez al
   confirmar Pago 2?
8. Confirmar que el disparo único de Slack al marcar "Material Completo" (que
   menciona el PDF) sigue siendo el único aviso, y que el nuevo aviso de
   Pago 2 cobrado (→ Gonzalo) es un disparo aparte, no el mismo.

## 6. Qué no se toca todavía

- Nada en Airtable: no se crean campos, no se borran los `[OBSOLETO]`, no se
  cargan pagos de prueba en `Pagos`/`Cobros` (ambas están vacías en
  producción).
- No se construye el workflow de n8n para Pago 2.
- No se reescribe `ruta-de-arranque.html` para leer/escribir Airtable todavía.

## 7. Fases propuestas (para discutir, no para arrancar solas)

1. **Cerrar huecos de modelo** (§3) con Juan/Gonzalo/Micaela: decidir dónde
   vive onboarding (carpeta/plazo/prórroga/checklist) y montaje (tareas).
   Sin esto, conectar el frontend deja la mitad de la pantalla sin dónde
   escribir.
2. **Aplicar la validación pendiente de la compañera** sobre la interfaz
   (pregunta 4) antes de cablear nada, para no reconstruir dos veces.
3. **Conectar lectura** (mockup → Airtable real, solo lectura) para las partes
   que ya tienen campo: identidad del cliente, moneda, total a cobrar, estado
   de Pago 1/Pago 2 desde `Pagos`. Sin escritura todavía — sirve para validar
   que el mapeo de campos es correcto contra datos reales.
4. **Construir el workflow de n8n de Pago 2** (enlace Stripe → webhook →
   `Pagos.Estado = Pagado` → aviso a Gonzalo), una vez resueltas las
   preguntas 1–3 y 6–8.
5. **Conectar escritura** desde la interfaz para los campos que de verdad debe
   tocar un humano (marcar checklist, marcar tareas de montaje, activar
   campaña) — el resto lo escribe n8n/Stripe, nunca la interfaz a mano.

## 8. Referencia rápida de IDs (de Juan)

- Base: `appEZnB8ZDVAcBDAV`
- `Clientes`: `tbl6noqdseYfm4czi`
- `Cobros`: `tblpOwmanZUoUWcvH`
- `Pagos`: `tbl1wdaroBGCGCs30`
- `Actividades`: `tbliKYom7iqz7NfAX`
