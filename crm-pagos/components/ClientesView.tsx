"use client";

import { useMemo, useState } from "react";
import { CURRENCY, ENTIDADES, ESTADOS, MOTIVOS } from "@/lib/config";
import { daysSince, fmtDate, fmtMoney, severity, toEUR } from "@/lib/format";
import { Badge, ExampleFlag } from "@/components/Badge";
import type { Cliente, Cobro, PagoHistorial } from "@/lib/types";

export function ClientesView({
  clientes,
  cobros,
  pagos,
}: {
  clientes: Cliente[];
  cobros: Cobro[];
  pagos: PagoHistorial[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(clientes[0]?.id ?? null);

  const openByClient = (id: string) =>
    cobros.filter((c) => c.cliente_id === id && c.estado !== "recuperado");
  const recoveredByClient = (id: string) =>
    cobros.filter((c) => c.cliente_id === id && c.estado === "recuperado");
  const pagosByClient = (id: string) => pagos.filter((p) => p.cliente_id === id);

  const list = useMemo(() => {
    let items = clientes;
    if (query) {
      const q = query.toLowerCase();
      items = items.filter(
        (c) => (c.nombre ?? "").toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      );
    }
    return [...items].sort((a, b) => {
      const ta = openByClient(a.id).reduce((s, c) => s + toEUR(c.importe, c.entidad), 0);
      const tb = openByClient(b.id).reduce((s, c) => s + toEUR(c.importe, c.entidad), 0);
      return tb - ta;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes, cobros, query]);

  const client = clientes.find((c) => c.id === selected) ?? null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex w-full flex-col gap-2 lg:w-[300px] lg:flex-shrink-0">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente o email…"
          className="select"
        />
        {list.length === 0 && (
          <div className="rounded-xl border border-[var(--border)] p-6 text-center text-sm text-[var(--fg-muted)]">
            Sin clientes para este filtro.
          </div>
        )}
        {list.map((c) => {
          const open = openByClient(c.id);
          const total = open.reduce((s, x) => s + toEUR(x.importe, x.entidad), 0);
          const worst = open.reduce((m, x) => Math.max(m, daysSince(x.creado_stripe_en)), 0);
          return (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`rounded-xl border p-3 text-left ${
                selected === c.id ? "border-[var(--accent)] bg-[var(--info-bg)]" : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              <div className="text-sm font-bold">{c.nombre || c.email}</div>
              <div className="mt-0.5 text-[11.5px] text-[var(--fg-muted)]">
                {ENTIDADES[c.entidad]} · {c.email}
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                {open.length > 0 ? (
                  <Badge tone={severity(worst)}>{open.length} abiertos</Badge>
                ) : (
                  <Badge tone="good">Al día</Badge>
                )}
                <span className="font-mono-data text-xs">
                  {total ? fmtMoney(total, "EUR") : "—"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="min-w-0 flex-1">
        {!client ? (
          <div className="rounded-xl border border-[var(--border)] p-10 text-center text-sm text-[var(--fg-muted)]">
            Selecciona un cliente de la lista.
          </div>
        ) : (
          <ClienteFicha
            client={client}
            open={openByClient(client.id)}
            recovered={recoveredByClient(client.id)}
            pagos={pagosByClient(client.id)}
          />
        )}
      </div>
    </div>
  );
}

function ClienteFicha({
  client,
  open,
  recovered,
  pagos,
}: {
  client: Cliente;
  open: Cobro[];
  recovered: Cobro[];
  pagos: PagoHistorial[];
}) {
  const totalOpen = open.reduce((s, c) => s + toEUR(c.importe, c.entidad), 0);
  const months = client.cliente_desde
    ? Math.max(1, Math.round((Date.now() - new Date(client.cliente_desde).getTime()) / (1000 * 3600 * 24 * 30)))
    : 1;
  const ltv = (client.cuota_mensual ?? 0) * months;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold">
          {client.nombre || client.email}
          {client.example && <ExampleFlag />}
        </h2>
        <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
          {client.email}
          {client.telefono ? ` · ${client.telefono}` : ""}
          {client.cliente_desde ? ` · Cliente desde ${fmtDate(client.cliente_desde)}` : ""} ·{" "}
          {ENTIDADES[client.entidad]}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniTile label="Impagos abiertos" value={String(open.length)} sub={totalOpen ? fmtMoney(totalOpen, "EUR") : "nada pendiente"} />
        <MiniTile label="Recuperados" value={String(recovered.length)} sub="histórico" />
        <MiniTile label="LTV estimado" value={fmtMoney(ltv, "EUR")} sub={`${months} meses activo`} />
        <MiniTile
          label="Cuota mensual"
          value={client.cuota_mensual ? fmtMoney(client.cuota_mensual, CURRENCY[client.entidad]) : "—"}
          sub="próximo cobro previsto"
        />
      </div>

      <Section title="Impagos abiertos">
        {open.length === 0 && <Empty>Sin impagos abiertos ahora mismo.</Empty>}
        {open.map((c) => (
          <Row key={c.id}>
            Hace {daysSince(c.creado_stripe_en)} días · {fmtMoney(c.importe, CURRENCY[c.entidad])} ·{" "}
            {c.motivo ? MOTIVOS[c.motivo] : "—"} · <Badge tone="info">{ESTADOS[c.estado]}</Badge>
          </Row>
        ))}
      </Section>

      <Section title="Historial de recuperaciones">
        {recovered.length === 0 && <Empty>Sin recuperaciones registradas.</Empty>}
        {recovered.map((c) => (
          <Row key={c.id}>
            {fmtMoney(c.importe, CURRENCY[c.entidad])} · recuperada
            {c.resuelto_en ? ` el ${fmtDate(c.resuelto_en)}` : ""}
            {c.example && <ExampleFlag />}
          </Row>
        ))}
      </Section>

      <Section title="Historial de pagos">
        {pagos.length === 0 && <Empty>Sin pagos registrados todavía.</Empty>}
        {pagos.map((p) => (
          <div key={p.id} className="flex items-center gap-3 border-t border-[var(--border)] py-2.5 first:border-0 text-sm">
            <span className="font-mono-data w-[88px] flex-shrink-0 text-[11.5px] text-[var(--fg-muted)]">
              {fmtDate(p.fecha)}
            </span>
            <span className="font-mono-data w-[90px] flex-shrink-0 font-semibold">
              {fmtMoney(p.importe, p.moneda)}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono-data text-[11px] text-[var(--fg-muted)]">
              {p.stripe_invoice_id ?? p.holded_invoice_id ?? "—"}
            </span>
            {p.holded_url ? (
              <a
                href={p.holded_url}
                target="_blank"
                rel="noopener"
                className="flex-shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11.5px] font-bold hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                ⬇ Factura Holded
              </a>
            ) : (
              <span className="flex-shrink-0 text-[11px] text-[var(--fg-muted)]">sin factura enlazada</span>
            )}
          </div>
        ))}
      </Section>
    </div>
  );
}

function MiniTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">{label}</div>
      <div className="font-mono-data mt-1 text-lg font-semibold">{value}</div>
      <div className="mt-0.5 text-[11px] text-[var(--fg-muted)]">{sub}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-[var(--border)] py-2 text-sm first:border-0">{children}</div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--fg-muted)]">{children}</p>;
}
