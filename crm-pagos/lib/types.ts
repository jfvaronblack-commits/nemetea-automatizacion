export type Entidad = "slu" | "eur" | "llc";
export type Moneda = "EUR" | "USD";
export type EstadoCobro =
  | "pendiente"
  | "esperando"
  | "promesa"
  | "no_recuperable"
  | "recuperado";
export type Motivo = "tarjeta_caducada" | "fondos_insuficientes" | "3ds" | "bloqueada";
export type Asignado = "Tu" | "Eduardo";

export interface Cliente {
  id: string;
  email: string;
  nombre: string | null;
  entidad: Entidad;
  telefono: string | null;
  cliente_desde: string | null;
  cuota_mensual: number | null;
  moneda: Moneda;
  stripe_customer_id: string | null;
  holded_contact_id: string | null;
  example: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cobro {
  id: string;
  cliente_id: string;
  stripe_invoice_id: string | null;
  stripe_subscription_id: string | null;
  entidad: Entidad;
  importe: number;
  moneda: Moneda;
  estado: EstadoCobro;
  motivo: Motivo | null;
  asignado: Asignado | null;
  fecha_promesa: string | null;
  last_moved: string;
  creado_stripe_en: string;
  resuelto_en: string | null;
  example: boolean;
  created_at: string;
  updated_at: string;
}

export interface Nota {
  id: string;
  cobro_id: string;
  autor: string;
  texto: string;
  created_at: string;
}

export interface PagoHistorial {
  id: string;
  cliente_id: string;
  stripe_invoice_id: string | null;
  importe: number;
  moneda: Moneda;
  fecha: string;
  holded_invoice_id: string | null;
  holded_url: string | null;
  example: boolean;
  created_at: string;
}

export interface SyncLog {
  id: string;
  entidad: Entidad;
  ejecutado_en: string;
  facturas_revisadas: number;
  nuevas_alertas: number;
  resultado: string;
  detalle: string | null;
}

// Minimal Database type for the Supabase client generics — not a full generated schema.
export type Database = {
  public: {
    Tables: {
      clientes: { Row: Cliente; Insert: Partial<Cliente>; Update: Partial<Cliente> };
      cobros: { Row: Cobro; Insert: Partial<Cobro>; Update: Partial<Cobro> };
      notas: { Row: Nota; Insert: Partial<Nota>; Update: Partial<Nota> };
      pagos_historial: {
        Row: PagoHistorial;
        Insert: Partial<PagoHistorial>;
        Update: Partial<PagoHistorial>;
      };
      sync_log: { Row: SyncLog; Insert: Partial<SyncLog>; Update: Partial<SyncLog> };
    };
  };
};
