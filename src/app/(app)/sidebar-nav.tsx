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
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "Overview",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Operations",
    links: [
      { href: "/distribute", label: "Distribute", icon: ArrowLeftRight },
      { href: "/distributions", label: "History", icon: History },
      { href: "/transactions", label: "Transactions", icon: Receipt },
    ],
  },
  {
    label: "Management",
    links: [
      { href: "/employees", label: "Employees", icon: Users },
      { href: "/owners", label: "Owners", icon: Crown },
      { href: "/client-invoices", label: "Client Invoices", icon: FileText },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      {navSections.map((section) => (
        <div key={section.label}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/40">
            {section.label}
          </p>
          <div className="space-y-0.5">
            {section.links.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(link.href + "/");
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_6px_oklch(0.72_0.185_195/40%)]" />
                  )}
                  <Icon className={cn(
                    "size-4 shrink-0 transition-colors duration-200",
                    isActive ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
                  )} />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
