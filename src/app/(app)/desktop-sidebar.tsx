"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebar } from "./sidebar-context";
import { SidebarNav } from "./sidebar-nav";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export function DesktopSidebar({
  displayName,
  initials,
}: {
  displayName: string;
  initials: string;
}) {
  const { collapsed, toggle } = useSidebar();

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Brand + Toggle */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border",
          collapsed ? "justify-center px-2" : "gap-3 px-6"
        )}
      >
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25 shrink-0">
          <span className="text-base font-bold text-primary">K</span>
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <span className="text-[15px] font-semibold tracking-tight text-sidebar-accent-foreground">
                Kontemplay
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/60">
                Finance
              </span>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="flex size-7 items-center justify-center rounded-md text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground cursor-pointer"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center pt-3 pb-1">
          <button
            type="button"
            onClick={toggle}
            className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground cursor-pointer"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <SidebarNav />

      {/* Theme + User section */}
      <div
        className={cn(
          "border-t border-sidebar-border py-4 space-y-3",
          collapsed ? "px-2" : "px-4"
        )}
      >
        {!collapsed && <ThemeToggle className="w-full justify-center" />}
        {collapsed ? (
          <div className="flex justify-center">
            <div
              className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-semibold text-primary ring-1 ring-primary/15"
              title={displayName}
            >
              {initials}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-semibold text-primary ring-1 ring-primary/15">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
                {displayName}
              </p>
              <SignOutButton />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
