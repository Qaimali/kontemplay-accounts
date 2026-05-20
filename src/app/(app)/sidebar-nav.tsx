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
import { useSidebar } from "./sidebar-context";

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

export { navSections };

export function SidebarNav() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();

  return (
    <nav
      className={cn(
        "flex-1 overflow-y-auto py-4 space-y-6",
        collapsed ? "px-2" : "px-3"
      )}
    >
      {navSections.map((section) => (
        <div key={section.label}>
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/40">
              {section.label}
            </p>
          )}
          {collapsed && section !== navSections[0] && (
            <div className="mx-2 mb-3 border-t border-sidebar-border/30" />
          )}
          <div className="space-y-0.5">
            {section.links.map((link) => {
              const isActive =
                pathname === link.href ||
                pathname.startsWith(link.href + "/");
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "group relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-200",
                    collapsed
                      ? "justify-center p-2.5"
                      : "gap-3 px-3 py-2",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )}
                >
                  {isActive && !collapsed && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_6px_oklch(0.72_0.185_195/40%)]" />
                  )}
                  {isActive && collapsed && (
                    <span className="absolute left-0.5 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_6px_oklch(0.72_0.185_195/40%)]" />
                  )}
                  <Icon
                    className={cn(
                      "shrink-0 transition-colors duration-200",
                      collapsed ? "size-[18px]" : "size-4",
                      isActive
                        ? "text-primary"
                        : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
                    )}
                  />
                  {!collapsed && link.label}

                  {/* Tooltip for collapsed mode */}
                  {collapsed && (
                    <span className="pointer-events-none absolute left-full ml-2 hidden rounded-md bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-lg ring-1 ring-border/30 group-hover:block whitespace-nowrap z-50">
                      {link.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
