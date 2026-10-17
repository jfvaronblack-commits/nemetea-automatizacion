import { createClient } from "@/lib/supabase/server";
import { ENTIDADES } from "@/lib/config";
import { Badge } from "@/components/Badge";
import type { Entidad, SyncLog } from "@/lib/types";

const ENT_KEYS: Entidad[] = ["slu", "eur", "llc"];

export default async function VigiaPage() {
  const supabase = await createClient();
  const { data: log } = await supabase
    .from("sync_log")
    .select("*")
    .order("ejecutado_en", { ascending: false })
    .limit(40);

  const rows: SyncLog[] = log ?? [];

  return (
    <div>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ENT_KEYS.map((k) => {
          const last = rows.find((r) => r.entidad === k);
          const ok = last?.resultado === "ok";
          return (
            <div key={k} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold">{ENTIDADES[k]}</h4>
                {last ? (
                  <Badge tone={ok ? "good" : "warn"} dot>
                    {ok ? "OK" : last.resultado}
                  </Badge>
                ) : (
                  <Badge tone="warn" dot>
                    Pendiente
                  </Badge>
                )}
              </div>
              <div className="mt-2 text-xs leading-relaxed text-[var(--fg-muted)]">
                {last ? (
                  <>
                    Último sync: {new Date(last.ejecutado_en).toLocaleString("es-ES")}
                    <br />
                    Facturas revisadas: {last.facturas_revisadas}
                    <br />
                    Nuevas alertas: {last.nuevas_alertas}
                  </>
                ) : (
                  "Todavía no hay ninguna ejecución registrada para esta entidad."
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-sm font-bold">Latido del vigía — últimas ejecuciones</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-[var(--surface-2)] text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
              <tr>
                <th className="px-2.5 py-2">Fecha</th>
                <th className="px-2.5 py-2">Entidad</th>
                <th className="px-2.5 py-2">Facturas revisadas</th>
                <th className="px-2.5 py-2">Nuevas alertas</th>
                <th className="px-2.5 py-2">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2.5 py-6 text-center text-[var(--fg-muted)]">
                    Sin ejecuciones todavía.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border)]">
                  <td className="font-mono-data px-2.5 py-2">
                    {new Date(r.ejecutado_en).toLocaleString("es-ES")}
                  </td>
                  <td className="px-2.5 py-2">{ENTIDADES[r.entidad]}</td>
                  <td className="font-mono-data px-2.5 py-2">{r.facturas_revisadas}</td>
                  <td className="font-mono-data px-2.5 py-2">{r.nuevas_alertas}</td>
                  <td className="px-2.5 py-2">
                    <Badge tone={r.resultado === "ok" ? "good" : "warn"}>{r.resultado}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
