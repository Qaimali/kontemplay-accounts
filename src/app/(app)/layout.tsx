import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { query, queryOne, execute, uuid } from "@/lib/db";
import type { Owner } from "@/lib/types";
import { SignOutButton } from "./sign-out-button";
import { SidebarNav } from "./sidebar-nav";
import { MobileSidebar } from "./mobile-sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/login");
  }

  // Find or create owner record for this Clerk user
  let owner = await queryOne<Owner>(
    "SELECT * FROM owners WHERE clerk_id = ?",
    [user.id]
  );

  if (!owner) {
    const id = uuid();
    const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || (user.emailAddresses[0]?.emailAddress ?? "User");
    const email = user.emailAddresses[0]?.emailAddress ?? "";
    await execute(
      "INSERT OR IGNORE INTO owners (id, clerk_id, name, email) VALUES (?, ?, ?, ?)",
      [id, user.id, name, email]
    );
    owner = await queryOne<Owner>(
      "SELECT * FROM owners WHERE clerk_id = ?",
      [user.id]
    );
    if (!owner) {
      owner = { id, clerk_id: user.id, name, email, created_at: new Date().toISOString() };
    }
  }

  const displayName = owner.name ?? user.emailAddresses[0]?.emailAddress ?? "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
            <span className="text-base font-bold text-primary">K</span>
          </div>
          <div>
            <span className="text-[15px] font-semibold tracking-tight text-sidebar-accent-foreground">
              Kontemplay
            </span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/60">
              Finance
            </span>
          </div>
        </div>

        {/* Navigation */}
        <SidebarNav />

        {/* Theme + User section */}
        <div className="border-t border-sidebar-border px-4 py-4 space-y-3">
          <ThemeToggle className="w-full justify-center" />
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

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile sidebar */}
        <MobileSidebar displayName={displayName} initials={initials} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl p-4 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
