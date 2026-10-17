## Nemetea Cobros — CRM de pagos

App Next.js (App Router + TypeScript + Tailwind) que sustituye al prototipo HTML. Lee y escribe
directamente en el proyecto Supabase `nemetea-cobros`, alimentado por el flujo de n8n "Vigía de
Cobros - Sync Stripe a Supabase".

### Desarrollo local

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

### Autenticación

Usa Supabase Auth (email + contraseña). No hay usuarios precreados: entra en `/signup` para crear
tu cuenta la primera vez (Juan Fra y Eduardo), luego entra normalmente en `/login`. Si el proyecto
Supabase tiene activada la confirmación por email, confirma el correo antes de poder entrar.

### Secciones

- **Resumen**: semáforo de % de impago sobre facturación, tendencia, pérdida esperada, antigüedad
  por tramos y desglose por entidad.
- **Clientes**: búsqueda + ficha con impagos abiertos, recuperaciones, LTV estimado e historial de
  pagos con enlace a la factura de Holded (cuando `pagos_historial.holded_url` esté informado).
- **Impagos**: listado editable (estado, asignado), con aviso de "sin mover Xd" y notas por cobro.
- **Vigía**: salud de la sincronización por entidad y log de `sync_log`.

### Pendiente de configurar (fuera de este código)

- **Vercel**: conectar este repo/rama al proyecto de Vercel y añadir las dos variables de entorno
  de `.env.local.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- **Facturación mensual real** por entidad: está en `lib/config.ts` (`REVENUE_EUR`) con cifras de
  referencia — sustituir cuando se tenga el dato real.
- El **enlace a Holded** por pago depende de que `pagos_historial` se rellene con `holded_url`;
  ahora mismo esa tabla está vacía salvo que se cargue manualmente o se añada al flujo de n8n.
