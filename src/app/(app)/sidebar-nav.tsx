"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Receipt,
  Users,
  Crown,
  History,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/distribute", label: "Distribute", icon: ArrowLeftRight },
  { href: "/distributions", label: "Distributions", icon: History },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/owners", label: "Owners", icon: Crown },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navLinks.map((link) => {
        const isActive =
          pathname === link.href || pathname.startsWith(link.href + "/");
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-sidebar-primary/10 text-sidebar-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-sidebar-primary" />
            )}
            <Icon className="size-4 shrink-0" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
