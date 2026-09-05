import Link from "next/link";

export function DashboardNav() {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <nav className="flex flex-wrap gap-2 text-sm">
        <Link href="/dashboard" className="rounded-full bg-white px-4 py-2 ring-1 ring-[#e6ddd0]">
          Pedidos
        </Link>
        <Link href="/dashboard/nuevo" className="rounded-full bg-[#1c1915] px-4 py-2 text-[#f6f1e7]">
          Nuevo pedido
        </Link>
      </nav>
      <a href="/api/auth/logout" className="text-sm text-[#7a7266] hover:text-[#1c1915]">
        Salir
      </a>
    </div>
  );
}
