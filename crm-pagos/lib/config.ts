import type { Entidad, EstadoCobro, Motivo } from "@/lib/types";

export const ENTIDADES: Record<Entidad, string> = {
  slu: "SLU",
  eur: "en €",
  llc: "LLC",
};

export const CURRENCY: Record<Entidad, "EUR" | "USD"> = {
  slu: "EUR",
  eur: "EUR",
  llc: "USD",
};

export const FX_USD_EUR = 0.92;

// Facturación mensual aproximada por entidad — sustituir por la cifra real cuando se tenga.
export const REVENUE_EUR: Record<Entidad, number> = {
  slu: 42000,
  eur: 9500,
  llc: 6200,
};

export const ESTADOS: Record<EstadoCobro, string> = {
  pendiente: "Pendiente",
  esperando: "Esperando respuesta",
  promesa: "Promesa de pago",
  no_recuperable: "No recuperable",
  recuperado: "Recuperado",
};

export const MOTIVOS: Record<Motivo, string> = {
  tarjeta_caducada: "Tarjeta caducada",
  fondos_insuficientes: "Fondos insuficientes",
  "3ds": "3D Secure no completado",
  bloqueada: "Tarjeta bloqueada",
};

export const ASIGNADOS: { value: "Tu" | "Eduardo"; label: string }[] = [
  { value: "Tu", label: "Tú" },
  { value: "Eduardo", label: "Eduardo" },
];
