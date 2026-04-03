"use client";

import { SignIn } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4">
      {/* Theme toggle */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      {/* Gradient mesh background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[20%] -top-[20%] h-[700px] w-[700px] rounded-full bg-primary/[0.06] blur-[150px]" />
        <div className="absolute -right-[15%] bottom-[5%] h-[600px] w-[600px] rounded-full bg-chart-4/[0.05] blur-[140px]" />
        <div className="absolute left-[40%] top-[60%] h-[500px] w-[500px] rounded-full bg-chart-5/[0.03] blur-[120px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Brand */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary/12 ring-1 ring-primary/20 shadow-[0_0_24px_oklch(0.72_0.185_195/15%)]">
            <span className="text-2xl font-bold text-primary">K</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Kontemplay Finance
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your partner account
          </p>
        </div>

        <SignIn
          routing="hash"
          forceRedirectUrl="/dashboard"
        />

        <p className="mt-8 text-center text-xs text-muted-foreground/40">
          Kontemplay Finance &middot; Partner Portal
        </p>
      </div>
    </div>
  );
}
