"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h1 className="text-lg font-bold">Crear cuenta</h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Solo para el equipo de Nemetea (Juan Fra, Eduardo).
        </p>

        {done ? (
          <div className="mt-5 rounded-lg bg-[var(--good-bg)] px-3 py-3 text-sm text-[var(--good)]">
            Cuenta creada. Si Supabase pide confirmar el email, revisa tu bandeja y luego{" "}
            <Link href="/login" className="font-semibold underline">
              entra aquí
            </Link>
            .
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mt-4 rounded-lg bg-[var(--bad-bg)] px-3 py-2 text-sm text-[var(--bad)]">
                {error}
              </div>
            )}
            <div className="mt-6 flex flex-col gap-3">
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Contraseña (mín. 6 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--accent-fg)] disabled:opacity-60"
            >
              {loading ? "Creando…" : "Crear cuenta"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-xs text-[var(--fg-muted)]">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-[var(--accent)]">
            Entra
          </Link>
        </p>
      </div>
    </div>
  );
}
