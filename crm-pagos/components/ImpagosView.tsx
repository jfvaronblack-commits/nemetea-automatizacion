"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ASIGNADOS, CURRENCY, ENTIDADES, ESTADOS, MOTIVOS } from "@/lib/config";
import { daysSince, fmtMoney, severity } from "@/lib/format";
import { Badge, ExampleFlag } from "@/components/Badge";
import type { Cobro, EstadoCobro, Nota } from "@/lib/types";

type CobroRow = Cobro & { clientes: { email: string; nombre: string | null } | null };

const ESTADO_OPTIONS = Object.entries(ESTADOS).filter(([k]) => k !== "recuperado") as [
  EstadoCobro,
  string,
][];

export function ImpagosView({ initialCobros }: { initialCobros: CobroRow[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [cobros, setCobros] = useState(initialCobros);
  const [entity, setEntity] = useState("all");
  const [estado, setEstado] = useState("all");
  const [asignado, setAsignado] = useState("all");
  const [sort, setSort] = useState("days-desc");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = cobros.filter((c) => {
      if (entity !== "all" && c.entidad !== entity) return false;
      if (estado !== "all" && c.estado !== estado) return false;
      if (asignado !== "all" && (c.asignado ?? "") !== asignado) return false;
      if (query) {
        const q = query.toLowerCase();
        const name = (c.clientes?.nombre || c.clientes?.email || "").toLowerCase();
        if (!name.includes(q) && !(c.stripe_invoice_id ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "days-desc") return daysSince(b.creado_stripe_en) - daysSince(a.creado_stripe_en);
      if (sort === "days-asc") return daysSince(a.creado_stripe_en) - daysSince(b.creado_stripe_en);
      if (sort === "amount-desc") return b.importe - a.importe;
      return 0;
    });
    return list;
  }, [cobros, entity, estado, asignado, query, sort]);

  async function updateField(id: string, field: "estado" | "asignado", value: string) {
    setCobros((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, [field]: value || null, last_moved: new Date().toISOString() } : c
      )
    );
    const patch: Record<string, string | null> = {
      [field]: value || null,
      last_moved: new Date().toISOString(),
    };
    await supabase.from("cobros").update(patch).eq("id", id);
  }

  const activeCobro = cobros.find((c) => c.id === openId) ?? null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={entity} onChange={(e) => setEntity(e.target.value)} className="select">
          <option value="all">Todas las entidades</option>
          <option value="slu">SLU</option>
          <option value="eur">en €</option>
          <option value="llc">LLC</option>
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className="select">
          <option value="all">Todos los estados</option>
          {ESTADO_OPTIONS.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select value={asignado} onChange={(e) => setAsignado(e.target.value)} className="select">
          <option value="all">Cualquier asignación</option>
          <option value="Tu">Asignado a mí</option>
          <option value="Eduardo">Asignado a Eduardo</option>
          <option value="">Sin asignar</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="select">
          <option value="days-desc">Más antiguo primero</option>
          <option value="days-asc">Más reciente primero</option>
          <option value="amount-desc">Mayor importe primero</option>
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cliente, email, factura…"
          className="select ml-auto min-w-[200px]"
        />
        <span className="text-xs text-[var(--fg-muted)]">
          {filtered.length} de {cobros.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-[var(--surface-2)] text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2.5">Cliente</th>
              <th className="px-3 py-2.5">Entidad</th>
              <th className="px-3 py-2.5 text-right">Importe</th>
              <th className="px-3 py-2.5 text-center">Días</th>
              <th className="px-3 py-2.5">Motivo</th>
              <th className="px-3 py-2.5">Estado</th>
              <th className="px-3 py-2.5">Asignado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const days = daysSince(c.creado_stripe_en);
              const sev = severity(days);
              const stale =
                c.last_moved && c.estado !== "pendiente"
                  ? daysSince(c.last_moved)
                  : 0;
              return (
                <tr key={c.id} className="border-t border-[var(--border)] hover:bg-[var(--surface-2)]">
                  <td className="cursor-pointer px-3 py-2.5 font-semibold" onClick={() => setOpenId(c.id)}>
                    {c.clientes?.nombre || c.clientes?.email || "—"}
                    <div className="text-[11.5px] font-normal text-[var(--fg-muted)]">
                      {c.clientes?.email}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {ENTIDADES[c.entidad]}
                    {c.example && <ExampleFlag />}
                  </td>
                  <td className="font-mono-data px-3 py-2.5 text-right">
                    {fmtMoney(c.importe, CURRENCY[c.entidad])}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge tone={sev} dot>
                      {days} días
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone="info">{c.motivo ? MOTIVOS[c.motivo] : "—"}</Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={c.estado}
                      onChange={(e) => updateField(c.id, "estado", e.target.value)}
                      className="select"
                    >
                      {ESTADO_OPTIONS.map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={c.asignado ?? ""}
                      onChange={(e) => updateField(c.id, "asignado", e.target.value)}
                      className="select"
                    >
                      <option value="">Sin asignar</option>
                      {ASIGNADOS.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                    {stale >= 3 && (
                      <div className="mt-1 text-[10px] font-bold text-[var(--bad)]">
                        ⚠ sin mover {stale}d
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeCobro && (
        <CobroDrawer cobro={activeCobro} onClose={() => setOpenId(null)} supabase={supabase} />
      )}
    </div>
  );
}

function CobroDrawer({
  cobro,
  onClose,
  supabase,
}: {
  cobro: CobroRow;
  onClose: () => void;
  supabase: ReturnType<typeof createClient>;
}) {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    let active = true;
    supabase
      .from("notas")
      .select("*")
      .eq("cobro_id", cobro.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active) setNotas((data as Nota[]) ?? []);
      });
    return () => {
      active = false;
    };
  }, [cobro.id, supabase]);

  async function addNote() {
    if (!text.trim()) return;
    const { data } = await supabase
      .from("notas")
      .insert({ cobro_id: cobro.id, autor: "Equipo", texto: text.trim() })
      .select()
      .single();
    if (data) setNotas((prev) => [data as Nota, ...prev]);
    setText("");
  }

  const days = daysSince(cobro.creado_stripe_en);

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/35" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-30 flex h-full w-full max-w-[420px] flex-col bg-[var(--surface)] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[var(--border)] p-4">
          <div>
            <h3 className="text-base font-bold">{cobro.clientes?.nombre || cobro.clientes?.email}</h3>
            <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
              {cobro.clientes?.email} · {ENTIDADES[cobro.entidad]}
            </p>
          </div>
          <button onClick={onClose} className="text-xl text-[var(--fg-muted)]">
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-[var(--fg-muted)]">Factura</dt>
            <dd className="font-mono-data">{cobro.stripe_invoice_id ?? "—"}</dd>
            <dt className="text-[var(--fg-muted)]">Importe</dt>
            <dd className="font-mono-data">{fmtMoney(cobro.importe, CURRENCY[cobro.entidad])}</dd>
            <dt className="text-[var(--fg-muted)]">Días abierta</dt>
            <dd className="font-mono-data">{days}</dd>
            <dt className="text-[var(--fg-muted)]">Motivo</dt>
            <dd>{cobro.motivo ? MOTIVOS[cobro.motivo] : "—"}</dd>
          </dl>
          <div className="rounded-xl border border-[var(--border)] p-3.5">
            <h4 className="mb-2 text-sm font-bold">Notas del equipo</h4>
            {notas.length === 0 && (
              <p className="mb-2 text-xs text-[var(--fg-muted)]">Sin notas todavía.</p>
            )}
            {notas.map((n) => (
              <div key={n.id} className="mb-2 rounded-lg bg-[var(--info-bg)] p-2 text-xs">
                <b>
                  {n.autor} · {new Date(n.created_at).toLocaleString("es-ES")}
                </b>
                <div>{n.texto}</div>
              </div>
            ))}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Añadir nota…"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-sm outline-none"
            />
            <button
              onClick={addNote}
              className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-bold"
            >
              Guardar nota
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
