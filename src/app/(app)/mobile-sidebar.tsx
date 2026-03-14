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
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary font-bold text-sidebar-primary-foreground text-xs">
            K
          </div>
          <span className="text-sm font-semibold tracking-tight text-sidebar-accent-foreground">
            Kontemplay
          </span>
        </div>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-out sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-out md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary font-bold text-sidebar-primary-foreground text-xs">
              K
            </div>
            <span className="text-sm font-semibold tracking-tight text-sidebar-accent-foreground">
              Kontemplay
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex size-8 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Nav */}
        <SidebarNav />

        {/* User section */}
        <div className="border-t border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-primary/15 text-xs font-semibold text-sidebar-primary ring-1 ring-sidebar-primary/20">
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
