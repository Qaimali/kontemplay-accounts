import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Owner } from "@/lib/types";
import { SignOutButton } from "./sign-out-button";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/distribute", label: "Distribute" },
  { href: "/transactions", label: "Transactions" },
  { href: "/employees", label: "Employees" },
  { href: "/owners", label: "Owners" },
];

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

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-muted/40">
        {/* Brand */}
        <div className="flex h-14 items-center border-b px-6">
          <span className="text-lg font-semibold tracking-tight">
            Kontemplay
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t px-4 py-4">
          <p className="truncate text-sm font-medium">
            {owner?.name ?? user.email}
          </p>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
