"use client";

import { useMemo, useState } from "react";
import { ENTIDADES, REVENUE_EUR } from "@/lib/config";
import { ageBucket, fmtMoney, toEUR } from "@/lib/format";
import { ExampleFlag } from "@/components/Badge";
import type { Cobro, Entidad, SyncLog } from "@/lib/types";

const ENT_KEYS: Entidad[] = ["slu", "eur", "llc"];
const BUCKET_ORDER = ["0-3d", "4-7d", "8-15d", "15d+"] as const;

function daysAgo(dateStr: string) {
  return Math.max(0, Math.round((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
}

export function DashboardView({ cobros, syncLog }: { cobros: Cobro[]; syncLog: SyncLog[] }) {
  const [entity, setEntity] = useState<"all" | Entidad>("all");

  const scoped = useMemo(
    () => cobros.filter((c) => entity === "all" || c.entidad === entity),
    [cobros, entity]
  );
  const open = useMemo(() => scoped.filter((c) => c.estado !== "recuperado"), [scoped]);
  const recovered = useMemo(() => scoped.filter((c) => c.estado === "recuperado"), [scoped]);

  const totalEUR = open.reduce((a, c) => a + toEUR(c.importe, c.entidad), 0);
  const revenueEUR = (entity === "all" ? ENT_KEYS : [entity]).reduce(
    (a, k) => a + REVENUE_EUR[k],
    0
  );
  const pct = revenueEUR ? (totalEUR / revenueEUR) * 100 : 0;
  const recoveryRate = open.length + recovered.length ? recovered.length / (open.length + recovered.length) : 0;
  const perdidaEsperada = totalEUR * (1 - recoveryRate);
  const enRiesgo = open.filter((c) => c.estado === "no_recuperable" || daysAgo(c.creado_stripe_en) > 30).length;
  const oldest = open.reduce((m, c) => Math.max(m, daysAgo(c.creado_stripe_en)), 0);
  const avg = open.length
    ? open.reduce((a, c) => a + daysAgo(c.creado_stripe_en), 0) / open.length
    : 0;
  const critico = open.filter((c) => daysAgo(c.creado_stripe_en) > 15).length;

  // Trend: last 6 months, total abierto hoy agrupado por el mes en que se creó en Stripe.
  const trend = useMemo(() => {
    const months: { label: string; key: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: monthLabel(d), key: `${d.getFullYear()}-${d.getMonth()}` });
    }
    const totals = months.map(({ key }) => {
      const [y, m] = key.split("-").map(Number);
      return open
        .filter((c) => {
          const d = new Date(c.creado_stripe_en);
          return d.getFullYear() === y && d.getMonth() === m;
        })
        .reduce((a, c) => a + toEUR(c.importe, c.entidad), 0);
    });
    return { labels: months.map((m) => m.label), values: totals };
  }, [open]);

  const delta =
    trend.values.length >= 2 && trend.values[trend.values.length - 2]
      ? ((totalEUR - trend.values[trend.values.length - 2]) / trend.values[trend.values.length - 2]) * 100
      : 0;

  const buckets: Record<(typeof BUCKET_ORDER)[number], { n: number; total: number }> = {
    "0-3d": { n: 0, total: 0 },
    "4-7d": { n: 0, total: 0 },
    "8-15d": { n: 0, total: 0 },
    "15d+": { n: 0, total: 0 },
  };
  open.forEach((c) => {
    const b = ageBucket(daysAgo(c.creado_stripe_en)) as (typeof BUCKET_ORDER)[number];
    buckets[b].n += 1;
    buckets[b].total += toEUR(c.importe, c.entidad);
  });
  const maxBucket = Math.max(...BUCKET_ORDER.map((k) => buckets[k].total), 1);

  const sev = pct > 15 ? "bad" : pct > 7 ? "warn" : "good";
  const sevText = pct > 15 ? "Crítico" : pct > 7 ? "Atención" : "Controlado";
  const sevStyles: Record<string, string> = {
    bad: "bg-[var(--bad-bg)] text-[var(--bad)]",
    warn: "bg-[var(--warn-bg)] text-[var(--warn)]",
    good: "bg-[var(--good-bg)] text-[var(--good)]",
  };

  const maxTrend = Math.max(...trend.values, 1);
  const w = 560,
    h = 120,
    pad = 28;
  const step = (w - pad * 2) / (trend.values.length - 1 || 1);
  const points = trend.values.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - (v / maxTrend) * (h - pad * 2 - 14);
    return [x, y] as const;
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1][0].toFixed(1)},${h - pad} L${points[0][0].toFixed(1)},${h - pad} Z`
      : "";

  return (
    <div>
      <div className="mb-4 rounded-xl bg-[var(--info-bg)] px-4 py-3 text-sm">
        Los importes se consolidan en € con un tipo de cambio orientativo. La facturación mensual
        por entidad es una cifra de referencia — sustitúyela en <code>lib/config.ts</code> cuando
        tengas la real.
      </div>

      <div className="mb-5 flex gap-2">
        {(["all", ...ENT_KEYS] as const).map((k) => (
          <button
            key={k}
            onClick={() => setEntity(k)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              entity === k
                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)]"
            }`}
          >
            {k === "all" ? "Todas" : ENTIDADES[k]}
          </button>
        ))}
      </div>

      <div
        className={`mb-5 flex flex-wrap items-center gap-6 rounded-2xl border border-[var(--border)] p-5 ${sevStyles[sev]}`}
      >
        <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide">
          {sevText}
        </span>
        <div className="min-w-[200px] flex-1">
          <div className="font-mono-data text-3xl font-bold">
            {pct.toFixed(1)}
            <span className="ml-1.5 font-sans text-xs font-semibold text-[var(--fg-muted)]">
              % de la facturación
            </span>
          </div>
          <div className="mt-0.5 text-[12.5px] text-[var(--fg-muted)]">
            {fmtMoney(totalEUR, "EUR")} colgado sobre ~{fmtMoney(revenueEUR, "EUR")} facturados
          </div>
        </div>
        <Stat label="Tendencia vs. mes anterior" value={`${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(0)}%`} />
        <Stat label="Pérdida esperada" value={fmtMoney(perdidaEsperada, "EUR")} />
        <Stat label="Clientes en riesgo real" value={String(enRiesgo)} />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Total colgado" value={fmtMoney(totalEUR, "EUR")} sub={`${open.length} facturas abiertas`} />
        <Tile label="Más antigua" value={`${oldest} días`} sub="desde la creación" />
        <Tile label="Antigüedad media" value={`${avg.toFixed(0)} días`} sub="de las abiertas" />
        <Tile label="Críticas (15d+)" value={String(critico)} sub="requieren seguimiento" />
        <Tile
          label="Tasa de recuperación"
          value={`${Math.round(recoveryRate * 100)}%`}
          sub={`${recovered.length} recuperadas`}
        />
        <Tile label="Clientes en riesgo" value={String(enRiesgo)} sub="no recuperable o 30d+" />
      </div>

      <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-sm font-bold">Tendencia del impago consolidado (6 meses)</h2>
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="xMidYMid meet">
          <path d={areaPath} fill="var(--accent)" opacity={0.12} />
          <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} />
          {points.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i === points.length - 1 ? 4.5 : 3}
              fill={i === points.length - 1 ? "var(--accent)" : "var(--fg-muted)"}
            />
          ))}
          {trend.labels.map((label, i) => (
            <text
              key={label + i}
              x={points[i]?.[0] ?? 0}
              y={h - 6}
              fontSize={10}
              fill="var(--fg-muted)"
              textAnchor="middle"
            >
              {label}
            </text>
          ))}
        </svg>
      </div>

      <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-sm font-bold">Antigüedad del impago</h2>
        <div className="flex h-36 items-end gap-4 px-1">
          {BUCKET_ORDER.map((k) => {
            const v = buckets[k];
            const height = Math.max(4, Math.round((v.total / maxBucket) * 110));
            const color = k === "15d+" ? "var(--bad)" : k === "8-15d" ? "var(--warn)" : "var(--good)";
            return (
              <div key={k} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <div className="font-mono-data text-[11.5px] font-bold">{fmtMoney(v.total, "EUR")}</div>
                <div className="w-full max-w-[46px] rounded-t" style={{ height, background: color }} />
                <div className="font-mono-data text-[11px] text-[var(--fg-muted)]">{v.n} fact.</div>
                <div className="font-mono-data text-[11px] text-[var(--fg-muted)]">{k}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-sm font-bold">Por entidad</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[11.5px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
                <th className="py-1.5 pr-2">Entidad</th>
                <th className="py-1.5 pr-2">Facturas</th>
                <th className="py-1.5 pr-2 text-right">Colgado</th>
                <th className="py-1.5 pr-2">Más antigua</th>
                <th className="py-1.5 pr-2">Último sync</th>
              </tr>
            </thead>
            <tbody>
              {ENT_KEYS.map((k) => {
                const list = cobros.filter((c) => c.entidad === k && c.estado !== "recuperado");
                const total = list.reduce((a, c) => a + c.importe, 0);
                const oldestEnt = list.reduce((m, c) => Math.max(m, daysAgo(c.creado_stripe_en)), 0);
                const lastSync = syncLog.find((s) => s.entidad === k);
                const isExample = list.length > 0 && list.every((c) => c.example);
                return (
                  <tr key={k} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 pr-2">
                      {ENTIDADES[k]}
                      {isExample && <ExampleFlag />}
                    </td>
                    <td className="py-2 pr-2">{list.length}</td>
                    <td className="font-mono-data py-2 pr-2 text-right">
                      {fmtMoney(total, k === "llc" ? "USD" : "EUR")}
                    </td>
                    <td className="py-2 pr-2">{oldestEnt} días</td>
                    <td className="py-2 pr-2">
                      {lastSync ? (
                        <span className="text-[var(--good)]">
                          {new Date(lastSync.ejecutado_en).toLocaleString("es-ES")}
                        </span>
                      ) : (
                        <span className="text-[var(--warn)]">sin registros aún</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">{label}</div>
      <div className="font-mono-data mt-1.5 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-[var(--fg-muted)]">{sub}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-[10.5px] uppercase tracking-wide text-[var(--fg-muted)]">{label}</div>
      <div className="font-mono-data mt-0.5 text-lg font-bold">{value}</div>
    </div>
  );
}
