# Panel — Ruta de Arranque

Documentación técnica de `ruta-de-arranque.html`: qué hace cada pantalla, qué
está conectado de verdad (Airtable/Stripe/n8n) y qué sigue siendo mockup, y la
lógica de negocio exacta que implementa cada parte. Para contexto de
decisiones y preguntas abiertas, ver `docs/plan-ruta-de-arranque.md` — este
documento describe el código tal como está, no el proceso de construirlo.

> **Nota de alcance**: este documento cubre solo `ruta-de-arranque.html`, el
> único panel presente en este repositorio. El panel de **Alta de Clientes**
> (`alta-cliente-nemetea.html`, mencionado en el plan como el paso previo a
> Onboarding) y cualquier panel de **Gestión de Cobros** aparte viven fuera de
> este repo — no hay código al que acceder para documentarlos todavía.

## 1. Qué es

Un panel de una sola página (HTML+CSS+JS, sin build ni framework) que Micaela
usa para llevar a un cliente desde que paga el Pago 1 hasta que se cierra su
primer mes de campaña. Es **un único registro por cliente**: el mismo cliente
cambia de pestaña según su campo `fase`, nunca se copian datos de una pantalla
a otra a mano.

4 pestañas, en orden de flujo:

1. **Onboarding** — plazo de documentación tras el Pago 1.
2. **Montaje de campaña** — a la espera de que el equipo de montaje (fuera
   del CRM) prepare la campaña.
3. **Cobro y activación** — Pago 2, confirmación por Stripe, activar campaña.
4. **Primer mes** — seguimiento/notas durante el primer mes tras activar.

Login propio delante de todo el panel (detalle en §6).

## 2. Qué está conectado de verdad y qué sigue siendo mockup

Esto es lo primero que hay que saber antes de tocar nada — **cada pestaña
tiene dos generaciones de código**: la original (datos de ejemplo en el array
JS `clientes`) y una posterior conectada a Airtable/n8n/Stripe de verdad. En
dos de las cuatro pestañas la versión vieja quedó como código muerto (nunca se
llama) cuando se construyó la versión real. Tabla resumen:

| Pestaña | Estado | Funciones activas (las que de verdad pinta la pantalla) | Código muerto que convive en el archivo |
|---|---|---|---|
| Onboarding | **Real** — Airtable + n8n | `cargarClientesOnboarding`, `renderObListReal`, `renderObDetailReal` | `renderObList`, `renderObDetail` (datos de ejemplo, nunca se invocan desde fuera de sí mismas) |
| Montaje de campaña | **Real, versión mínima** — Airtable + n8n | `cargarClientesMontaje`, `renderMtListReal`, `renderMtDetailReal` | `renderMtList`, `renderMtDetail` (ídem) |
| Cobro y activación | **Real** — Airtable + n8n + Stripe (modo TEST) | `cargarClientesReales`, `renderCbList`, `renderCbDetail` | `renderPago2Block`, `renderProximosCobros`, `renderCobroPago2Block`, `calcPago2` (ídem) |
| Primer mes | **Mockup** — datos de ejemplo en JS, sin backend | `renderPmList`, `renderPmDetail` sobre el array `clientes` | — (no tiene versión real todavía) |

El motivo de que exista el código muerto: cuando se conectó cada pestaña a
datos reales, la pantalla vieja se dejó de llamar pero no se borró del
archivo. No es peligroso (nunca se ejecuta), pero confunde si alguien busca
"¿dónde está la lógica de X?" y encuentra dos sitios — quedarse siempre con la
versión que termina en **Real** o que llama a `N8N_BASE`. Se puede borrar sin
riesgo cuando se retome el archivo (son ~250 líneas en total, ver §7).

Hay una frase suelta al final del HTML (`<p class="foot-note">`) que dice
"Simulador de diseño — sin conexión a Airtable todavía" — **desactualizada**,
quedó de antes de conectar Onboarding/Montaje/Cobro. No se ha corregido
porque no afecta a nada funcional, pero hay que saber que es ruido, no una
advertencia real.

## 3. Onboarding (real)

**Quién la usa**: Micaela. Lista los clientes con Pago 1 ya cobrado que
todavía no tienen el material completo.

**De dónde vienen los datos**: `GET {N8N_BASE}/lista-onboarding` al cargar la
pestaña (y tras cada acción, se vuelve a pedir — no hay actualización en
directo/push, todo es *pull* explícito). El historial de comentarios de cada
cliente se pide aparte, por cliente, al abrir su ficha: `GET
{N8N_BASE}/onboarding-historial?record_id=...`.

**Lógica de plazo** (todo client-side, sobre los datos que llegan del
webhook):
- Plazo formal: **21 días naturales** (`PLAZO_BASE`) desde que se marca la
  carpeta de Drive como enviada — no desde el Pago 1.
- Mientras no se ha marcado la carpeta enviada, el plazo no corre (estado
  "Carpeta sin enviar").
- **Regalo de 20 días de Contact Center**: califica si el material completo
  se entrega dentro de los primeros 7 días desde que se envió la carpeta
  (`calificaRegaloCCReal`). No es "primera semana de calendario", es una
  ventana de 7 días desde ese evento concreto.
- **Penalización por plazo vencido**: si pasan los 21 días sin material
  completo, aparece el aviso de penalización — **75 €** para entidades que no
  empiezan por "LLC", **100 $** para `LLC`/`LLC España`/`LLC Extranjero`
  (`esLLC()` comprueba el prefijo, no el valor exacto, para cubrir las tres
  variantes). Este importe no se cobra solo desde aquí — queda anotado, la
  prórroga/penalización real se gestiona aparte (ver plan, §6.4, todavía sin
  cerrar dónde vive el dato en Airtable).
- Checklist de material: 4 ítems (Formulario Primeros Pasos, Fotos, Vídeos,
  **Fanpage**). Cada checkbox dispara `POST
  {N8N_BASE}/onboarding-material` de inmediato (no hay botón "Guardar"
  aparte) y recarga toda la lista.
- Botón **"Marcar Material Completo"** solo se habilita cuando los 4 ítems
  están marcados. Dispara `POST {N8N_BASE}/onboarding-material-completo` y
  recarga tanto Onboarding como Montaje (el cliente cambia de fase y tiene
  que aparecer en la otra pestaña).
- Botón **"Marcar carpeta enviada hoy"** (solo visible si la carpeta aún no
  se marcó): `POST {N8N_BASE}/onboarding-marcar-carpeta`. Es un registro
  manual — el envío de la carpeta de Drive en sí es un paso fuera del
  sistema, este botón no envía nada, solo arranca el contador de 21 días.
- Caja de notas: cualquier texto se guarda con `POST
  {N8N_BASE}/onboarding-nota` contra el mismo comentario nativo de la ficha
  de Airtable — no es un campo de texto propio.

**Particularidad**: el calendario de cobro (§5) se muestra también aquí, no
solo en Cobro y activación — para que Micaela vea desde el principio cuánto
va a pagar el cliente en cada hito, aunque todavía no se pueda cobrar nada.

## 4. Montaje de campaña (real, versión mínima)

**Quién la usa**: Micaela. El equipo de montaje (edición, planillas, SAP,
landing, ads) **no abre este panel** — trabaja fuera y solo entra en escena
vía Slack.

**De dónde vienen los datos**: `GET {N8N_BASE}/lista-montaje` (clientes con
`fase = Montaje`), mismo patrón de historial compartido que Onboarding
(`onboarding-historial` / `onboarding-nota` — es el mismo comentario nativo de
la ficha, un único hilo por cliente en todo el CRM).

**Lo que de verdad hace hoy** (comentario explícito en el propio código, línea
~2280): es una **versión mínima**. Construido:
- Lista y ficha con los datos heredados de Onboarding (carpeta enviada →
  material completo, días que tardó, regalo CC, penalización) — de solo
  lectura, Micaela no reintroduce nada.
- Caja de notas (mismo hilo de comentarios).
- Botón **"Campaña lista →"**: `POST {N8N_BASE}/onboarding-campana-lista`,
  recarga Montaje y Cobro, y salta directamente a la pestaña "Cobro y
  activación".

**Lo que todavía NO está construido** (y el propio HTML lo dice en pantalla,
para que no se asuma que ya existe):
- El aviso automático a Slack a `#montaje-campañas` al marcar "Material
  Completo" — el texto en pantalla aclara que ese aviso **ya se envió** desde
  Onboarding (vía el webhook, no desde aquí); lo que falta es más bien el
  contador de los 10 días hábiles.
- El contador de los **10 días hábiles** de SLA de montaje — no hay fórmula
  de días hábiles implementada todavía, solo se muestra cuántos días
  naturales tardó la entrega pasada.
- El botón "Enviar por WhatsApp →" para landing + vídeos — en esta versión
  real **no existe**; el bloque de "Envío de contenido" dice literalmente
  "Pendiente de construir".

> Importante para quien retome esto: el plan (`docs/plan-ruta-de-arranque.md`,
> §0quater.2) describe un botón de envío por WhatsApp ya compuesto y
> funcionando en Montaje — eso existe en la versión **mockup vieja**
> (`renderMtDetail`, código muerto, §2), no en la versión real que de verdad
> se está mostrando hoy. Si alguien lee solo el plan puede creer que ya está
> hecho; no lo está en el código conectado.

## 5. Cobro y activación (real, Stripe modo TEST)

**Quién la usa**: Micaela. Lista los clientes con "Campaña lista" marcado,
antes de que se active la campaña en redes.

**De dónde vienen los datos**: `GET {N8N_BASE}/lista-cobro-activacion`.

**Flujo de Pago 2**:
1. Micaela fija los ajustes de la cuota: Contact Center (no / regalo 20 días
   50€ / completo 150€), montaje inicial (250€), penalización por entrega
   tardía, y un ajuste manual libre (puede ser negativo, con su propio
   concepto de texto).
2. Botón **"Enviar enlace de pago →"**: `POST
   {N8N_BASE}/enviar-enlace-pago-2` con `{ record_id, ajustes }`. El propio
   workflow de n8n calcula el importe real (aplica Factor Impuesto e IVA/IGIC
   según entidad, conversión de moneda, etc. — **no se recalcula nada de esto
   en el HTML**, a diferencia de la versión mockup vieja que sí traía
   constantes propias) y devuelve el enlace de Stripe Checkout.
3. El enlace aparece en una caja copiable para que Micaela lo reenvíe a mano
   por WhatsApp (además de que Stripe ya lo manda por email). **Caduca a las
   24 horas** — es el límite nativo de `expires_at` en Stripe, no se puede
   pedir más (se pidieron 48h, no es posible).
4. El estado pasa a "Enviado" y aparece un botón **"↻ Comprobar estado del
   pago"** (llamada manual a un endpoint de verificación — en esta demo el
   estado real solo avanza a "Cobrado" cuando llega el webhook de Stripe, no
   por pulsar este botón; el botón sirve para refrescar la pantalla con lo
   que ya haya en Airtable).
5. Cuando el webhook de Stripe confirma el cobro, el cliente pasa a
   "Cobrado" y aparece la tarjeta "✓ Cobro confirmado por Stripe". Solo
   entonces se habilita el botón **"Activar Campaña"**.
6. **"Activar Campaña"**: `POST
   {N8N_BASE}/onboarding-activar-campana`. Guarda la fecha de activación y
   marca al cliente como Activo en Airtable (`Campañas.Fecha de Activación`
   + `Campañas.Estado de la Campaña`). No hay vuelta atrás desde aquí (el
   botón queda deshabilitado una vez activado, con el texto "Campaña
   activada ✓").

**Burbuja de aviso ("Pago 2 confirmado, sin ver")**: ver §8 — es la que se
arregló en la última revisión del panel. Marca en verde (estilo WhatsApp,
`#25D366`) la pestaña y la ficha de cualquier cliente cuyo Pago 2 ya se
cobró y que Micaela todavía no ha abierto; se limpia al abrir esa ficha.

**Botón "↻ Refrescar"** en la cabecera de la pestaña: vuelve a pedir
`lista-cobro-activacion` entero, por si el webhook de Stripe confirmó algo
mientras Micaela estaba en otra pestaña.

## 6. Primer mes (mockup, sin backend)

**Quién la usa**: Micaela, durante el mes posterior a activar la campaña.

**Estado**: a diferencia de las otras tres, esta pestaña **sigue siendo
enteramente mockup** — trabaja sobre el array `clientes` definido en el JS
(datos de ejemplo), sin ningún `fetch` a `N8N_BASE`. No hay webhook de lectura
ni de escritura todavía; "Guardar nota" y "Cerrar seguimiento" solo modifican
el array en memoria del navegador, se pierden al recargar la página.

**Lo que hace** (pensado para construirse igual que las otras cuando llegue
el momento):
- Lista + ficha con el mismo patrón que el resto (tarjetas a la izquierda,
  detalle a la derecha).
- **Contador de días**: chip "Día X de seguimiento", calculado como
  `hoy − fecha de activación de campaña`. Pasa a estilo `warm` (aviso) cerca
  del día 28, para que Micaela sepa que el mes está por cumplirse.
- **Notas**: reutiliza el mismo patrón de nota + historial que Onboarding —
  conceptualmente es "un único registro por cliente", aunque hoy, al no
  estar conectado, ese historial vive solo en el array JS, no en el
  comentario nativo de Airtable como sí pasa en Onboarding/Montaje.
- **"Cerrar seguimiento"**: saca al cliente de la pestaña (pasa a
  `fase: "Graduado"`, que ninguna pestaña filtra — deja de aparecer en
  cualquier lista).

Cuando se conecte de verdad, el patrón a seguir es el mismo que ya existe en
Onboarding/Montaje: lista real vía `GET {N8N_BASE}/lista-primer-mes` (webhook
nuevo, no existe todavía), notas vía el mismo
`onboarding-nota`/`onboarding-historial` ya construido (no hace falta un
endpoint nuevo para eso), y el cierre de seguimiento como un nuevo webhook
tipo `onboarding-cerrar-seguimiento`.

## 7. Calendario de cobro (persistente, Onboarding/Montaje/Cobro)

`renderCalendarioCobroHTML(c)` es la única pieza de UI que se repite —
literalmente la misma tarjeta — en las tres pestañas reales. Muestra, para
un cliente, todos los hitos de cobro previstos: Pago 1, Pago 2 (resto de la
cuota del mes 1), mes 2 y 3 de permanencia, el prorrateo al cerrar el ciclo
puente, y los meses 4/5 en adelante por ciclo natural.

Detalles de la lógica:
- Lee `c.cuotaNemetea`, `c.factorImpuesto`, `c.totalConImpuestos`,
  `c.ccACobrar` y `c.formaPagoPlan` — todos campos que vienen ya calculados
  desde Airtable (no se reimplementa la fórmula de impuestos en el HTML).
- **Si `Cuota NEMETEA` todavía no está rellenada en Airtable** (`cuotaReal
  === 0`), el calendario no se deja en blanco (parecería un error) — muestra
  una cifra orientativa fija (**647€**, `CUOTA_ORIENTATIVA`) marcada
  explícitamente como "Estimado — falta Cuota NEMETEA en Airtable". Esta
  cifra **nunca se usa para cobrar de verdad**, es solo para que Micaela
  tenga una referencia visual mientras el dato real no está cargado.
- El ciclo de cobro recurrente es **día 27 del mes si el método es SEPA, día
  28 si es Tarjeta** (`c.formaPagoPlan`), igual que el mecanismo real de
  Stripe descrito en el plan (§7.1).
- El tipo de entrada "Formación" sin Contact Center se trata como cortesía
  completa (Pago 1 y Pago 2 en 0€, "Gratis — cortesía del tipo de entrada").
- El prorrateo del cierre de ciclo puente se muestra como "A calcular" — el
  propio código dice explícitamente que ese importe solo se puede calcular
  al fijar la fecha real de lanzamiento, no antes.

## 8. Burbuja de aviso de Pago 2 (estilo WhatsApp)

Implementada en `renderCbList()` (pestaña Cobro y activación), arreglada el
21/10 tras encontrarla rota en la revisión final (detalle completo en
`docs/plan-ruta-de-arranque.md`, §9bis):

- `cbSeenCobrado` (un `Set` en memoria) guarda los IDs de cliente cuyo Pago 2
  "Cobrado" ya abrió Micaela.
- Cualquier cliente con `pago2Estado === "Cobrado"` que no esté en ese Set
  cuenta como "sin ver": se le pinta una burbuja verde (`#25D366`, el verde
  de WhatsApp) en su tarjeta de la lista, y se suma al contador agregado que
  aparece junto al nombre de la pestaña.
- Al hacer clic en la tarjeta de ese cliente, se añade a `cbSeenCobrado` y la
  burbuja desaparece tanto de la ficha como del contador.
- Vive solo en memoria del navegador — si se recarga la página, todos los
  clientes "Cobrado" vuelven a contar como "sin ver" hasta que se abran de
  nuevo. No hay persistencia en Airtable de qué cliente ya se revisó (no se
  pidió, y añadir eso implicaría otro campo/endpoint).

## 9. Login

Puerta de entrada independiente del resto del panel — protege solo el acceso
a esta pantalla, no los webhooks de n8n (esos no tienen autenticación propia
en el front, confían en que la URL del panel no se filtra).

- Usuario fijo: `valdezmora.mmicaela@gmail.com` (hardcodeado en el HTML).
- Contraseña comprobada contra un hash SHA-256 fijo también hardcodeado
  (`AUTH_PASS_HASH`) — no hay backend de autenticación, el hash vive en el
  propio archivo fuente. Suficiente para que la contraseña no quede en texto
  plano visible en el código, pero **no** protege contra fuerza bruta ni
  rotación de credenciales — es un candado de mockup, no un sistema de login
  real.
- Sesión: se guarda `rutaArranqueAuth = "ok"` en `localStorage` del
  navegador. "Cerrar sesión" borra esa clave.

## 10. Referencia rápida de endpoints n8n

Todos bajo `N8N_BASE = https://n8n.nemetea.com/webhook`:

| Endpoint | Método | Usado por | Qué hace |
|---|---|---|---|
| `/lista-onboarding` | GET | Onboarding | Lista clientes con Pago 1 cobrado, sin material completo |
| `/onboarding-historial?record_id=` | GET | Onboarding, Montaje | Comentarios nativos de la ficha de Airtable de ese cliente |
| `/onboarding-material` | POST | Onboarding | Marca/desmarca un ítem del checklist (`{record_id, campo, valor}`) |
| `/onboarding-nota` | POST | Onboarding, Montaje | Añade un comentario al historial (`{record_id, texto}`) |
| `/onboarding-marcar-carpeta` | POST | Onboarding | Marca la carpeta de Drive como enviada hoy, arranca el plazo de 21 días |
| `/onboarding-material-completo` | POST | Onboarding | Pasa el cliente a fase Montaje |
| `/lista-montaje` | GET | Montaje | Lista clientes con fase Montaje |
| `/onboarding-campana-lista` | POST | Montaje | Pasa el cliente a fase Cobro |
| `/lista-cobro-activacion` | GET | Cobro y activación | Lista clientes listos para Pago 2 / en curso de cobro |
| `/enviar-enlace-pago-2` | POST | Cobro y activación | Calcula el importe con ajustes y crea el Stripe Checkout real (`{record_id, ajustes}`) |
| `/onboarding-activar-campana` | POST | Cobro y activación | Registra fecha de activación y marca Estado Cliente = Activo |

No existe todavía ningún endpoint de lectura/escritura para Primer mes (§6).

## 11. IDs de Airtable (de referencia, ver plan §11 para el detalle completo)

- Base: `appEZnB8ZDVAcBDAV`
- `Clientes`: `tbl6noqdseYfm4czi`
- `Cobros`: `tblpOwmanZUoUWcvH`
- `Pagos`: `tbl1wdaroBGCGCs30`
- `Actividades`: `tbliKYom7iqz7NfAX`
- `Campañas`: `tbleWdnYTdDph5cVQ`
