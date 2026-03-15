"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4">
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

      <div className="relative w-full max-w-[380px] animate-in fade-in slide-in-from-bottom-4 duration-700">
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

        <Card className="shadow-[0_0_0_1px_oklch(1_0_0/5%),0_8px_40px_oklch(0_0_0/30%)]">
          <CardContent className="pt-6 pb-6">
            <form onSubmit={handleSubmit} className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-[13px]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-[13px]">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive ring-1 ring-destructive/20">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" disabled={loading} className="mt-1 gap-2">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    Signing in...
                  </span>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground/40">
          Kontemplay Finance &middot; Partner Portal
        </p>
      </div>
    </div>
  );
}
