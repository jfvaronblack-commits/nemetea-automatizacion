"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/", label: "Resumen" },
  { href: "/clientes", label: "Clientes" },
  { href: "/impagos", label: "Impagos" },
  { href: "/vigia", label: "Vigía" },
];

export function Shell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen">
      <nav className="flex w-[200px] flex-shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="px-2 py-3 text-[15px] font-extrabold">
          Nemetea <span className="text-[var(--accent)]">· Cobros</span>
        </div>
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-2.5 py-2 text-[13.5px] font-semibold ${
                active
                  ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                  : "text-[var(--fg-muted)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <div className="mt-auto border-t border-[var(--border)] pt-3 text-[11.5px] text-[var(--fg-muted)]">
          <div className="truncate">{email}</div>
          <button onClick={signOut} className="mt-1 font-semibold text-[var(--accent)]">
            Cerrar sesión
          </button>
        </div>
      </nav>
      <main className="flex-1 overflow-auto p-5">{children}</main>
    </div>
  );
}
