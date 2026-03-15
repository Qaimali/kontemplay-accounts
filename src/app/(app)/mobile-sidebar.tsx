"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { SignOutButton } from "./sign-out-button";

export function MobileSidebar({
  displayName,
  initials,
}: {
  displayName: string;
  initials: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Mobile header bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-sidebar-border bg-sidebar/95 backdrop-blur-md px-4 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent cursor-pointer"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
            <span className="text-sm font-bold text-primary">K</span>
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight text-sidebar-accent-foreground">
              Kontemplay
            </span>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-out sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-out md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
              <span className="text-sm font-bold text-primary">K</span>
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-sidebar-accent-foreground">
                Kontemplay
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/60">
                Finance
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex size-8 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Nav */}
        <SidebarNav />

        {/* User section */}
        <div className="border-t border-sidebar-border px-4 py-4">
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
        </div>
      </aside>
    </>
  );
}
