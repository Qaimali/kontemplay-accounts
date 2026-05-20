import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { query, queryOne, execute, uuid } from "@/lib/db";
import type { Owner } from "@/lib/types";
import { SidebarProvider } from "./sidebar-context";
import { DesktopSidebar } from "./desktop-sidebar";
import { MobileSidebar } from "./mobile-sidebar";

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
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <DesktopSidebar displayName={displayName} initials={initials} />

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile sidebar */}
          <MobileSidebar displayName={displayName} initials={initials} />

          <main className="flex-1 overflow-y-auto">
            <div className="p-4 md:px-8 md:py-8">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
