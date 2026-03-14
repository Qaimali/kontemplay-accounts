import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Owner } from "@/lib/types";
import { SignOutButton } from "./sign-out-button";
import { SidebarNav } from "./sidebar-nav";
import { MobileSidebar } from "./mobile-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: owner } = await supabase
    .from("owners")
    .select("*")
    .eq("auth_id", user.id)
    .single<Owner>();

  const displayName = owner?.name ?? user.email ?? "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary font-bold text-sidebar-primary-foreground text-sm">
            K
          </div>
          <span className="text-base font-semibold tracking-tight text-sidebar-accent-foreground">
            Kontemplay
          </span>
        </div>

        {/* Navigation */}
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

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile sidebar */}
        <MobileSidebar displayName={displayName} initials={initials} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
