import { createClient } from "@/lib/supabase/server";
import { ImpagosView } from "@/components/ImpagosView";
import type { Cobro } from "@/lib/types";

type CobroRow = Cobro & { clientes: { email: string; nombre: string | null } | null };

export default async function ImpagosPage() {
  const supabase = await createClient();
  const { data: cobros } = await supabase
    .from("cobros")
    .select("*, clientes(email, nombre)")
    .neq("estado", "recuperado")
    .order("creado_stripe_en", { ascending: true });

  return <ImpagosView initialCobros={(cobros as unknown as CobroRow[]) ?? []} />;
}
