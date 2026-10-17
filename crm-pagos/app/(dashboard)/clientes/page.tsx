import { createClient } from "@/lib/supabase/server";
import { ClientesView } from "@/components/ClientesView";

export default async function ClientesPage() {
  const supabase = await createClient();
  const [{ data: clientes }, { data: cobros }, { data: pagos }] = await Promise.all([
    supabase.from("clientes").select("*"),
    supabase.from("cobros").select("*"),
    supabase.from("pagos_historial").select("*").order("fecha", { ascending: false }),
  ]);

  return (
    <ClientesView
      clientes={clientes ?? []}
      cobros={cobros ?? []}
      pagos={pagos ?? []}
    />
  );
}
