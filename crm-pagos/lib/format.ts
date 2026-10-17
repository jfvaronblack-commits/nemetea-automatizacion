import { CURRENCY, FX_USD_EUR } from "@/lib/config";
import type { Entidad } from "@/lib/types";

export function fmtMoney(n: number, cur: "EUR" | "USD" = "EUR") {
  const s = n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return cur === "USD" ? `$${s}` : `${s} €`;
}

export function toEUR(n: number, ent: Entidad) {
  return CURRENCY[ent] === "USD" ? n * FX_USD_EUR : n;
}

export function daysSince(dateStr: string) {
  const d = (Date.now() - new Date(dateStr).getTime()) / 86400000;
  return Math.max(0, Math.round(d));
}

export function ageBucket(days: number) {
  if (days <= 3) return "0-3d";
  if (days <= 7) return "4-7d";
  if (days <= 15) return "8-15d";
  return "15d+";
}

export function severity(days: number): "good" | "warn" | "bad" {
  if (days > 15) return "bad";
  if (days >= 4) return "warn";
  return "good";
}

export function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
