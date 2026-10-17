import { createClient } from "@/lib/supabase/server";
import { DashboardView } from "@/components/DashboardView";

export default async function ResumenPage() {
  const supabase = await createClient();

  const [{ data: cobros }, { data: syncLog }] = await Promise.all([
    supabase.from("cobros").select("*"),
    supabase.from("sync_log").select("*").order("ejecutado_en", { ascending: false }).limit(60),
  ]);

  return <DashboardView cobros={cobros ?? []} syncLog={syncLog ?? []} />;
}
