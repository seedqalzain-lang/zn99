import { Link } from "@tanstack/react-router";
import { Home, Store, Wrench, ShoppingCart, User } from "lucide-react";

const items = [
  { to: "/" as const, label: "الرئيسية", icon: Home },
  { to: "/shop" as const, label: "المتجر", icon: Store },
  { to: "/services" as const, label: "الخدمات", icon: Wrench },
  { to: "/offers" as const, label: "العروض", icon: ShoppingCart },
  { to: "/admin" as const, label: "الحساب", icon: User },
];

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[var(--color-hairline)]">
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] text-[var(--color-ink-soft)] data-[status=active]:text-[var(--color-gold)]"
            >
              <Icon className="w-5 h-5" />
              <span className="font-semibold">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
