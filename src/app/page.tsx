"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Shield,
  Zap,
  Receipt,
  Users,
  TrendingUp,
  ArrowLeftRight,
  FileText,
  ChevronRight,
  Check,
  Globe,
  Lock,
  Sparkles,
} from "lucide-react";

/* ─── Intersection Observer Hook ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── Reveal wrapper (staggered fade-up) ─── */
function Reveal({
  children,
  delay = 0,
  className = "",
  visible,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  visible: boolean;
}) {
  return (
    <div
      className={`transition-all duration-700 ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
      }}
    >
      {children}
    </div>
  );
}

/* ─── Animated counter ─── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useInView();
  useEffect(() => {
    if (!visible) return;
    const duration = 2000;
    const start = performance.now();
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [visible, target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─── Data ─── */
const features = [
  {
    icon: ArrowLeftRight,
    title: "Smart Distribution",
    desc: "Automatically calculate USD to PKR salary distributions with real-time exchange rate management and threshold controls.",
    size: "lg" as const,
  },
  {
    icon: Receipt,
    title: "Invoice Generation",
    desc: "Generate professional PDF invoices for employees and clients with detailed tax breakdowns.",
    size: "sm" as const,
  },
  {
    icon: Shield,
    title: "Tax Compliance",
    desc: "Built-in FBR contractor tax and bank remittance tax calculations for accurate deductions.",
    size: "sm" as const,
  },
  {
    icon: BarChart3,
    title: "P&L Reports",
    desc: "Monthly profit & loss reports with revenue tracking, operating costs, and company margin analysis.",
    size: "sm" as const,
  },
  {
    icon: Users,
    title: "Team Management",
    desc: "Manage employees with salary configs, CNIC records, tax rates, and complete invoice history.",
    size: "sm" as const,
  },
  {
    icon: TrendingUp,
    title: "Owner Tracking",
    desc: "Track partner investments and repayments with full transaction history. Always know who is owed what.",
    size: "lg" as const,
  },
];

const steps = [
  {
    num: "01",
    title: "Configure Payment",
    desc: "Enter the PKR amount received, USD total, exchange rates, and tax parameters for the month.",
    icon: FileText,
  },
  {
    num: "02",
    title: "Distribute to Team",
    desc: "Select employees, adjust individual thresholds and tax rates. Preview the full breakdown before saving.",
    icon: ArrowLeftRight,
  },
  {
    num: "03",
    title: "Generate & Track",
    desc: "Invoices are auto-generated, transactions logged, and P&L updated instantly. Download PDFs anytime.",
    icon: Sparkles,
  },
];

const stats = [
  { value: 100, suffix: "%", label: "Automated" },
  { value: 6, suffix: "+", label: "Transaction types" },
  { value: 30, suffix: "s", label: "Per distribution" },
  { value: 0, suffix: "", label: "Manual errors", display: "Zero" },
];

const trustPoints = [
  { icon: Lock, text: "Bank-grade security with Supabase" },
  { icon: Globe, text: "Accessible from anywhere, any device" },
  { icon: Shield, text: "FBR tax compliant calculations" },
];

/* ─── Page ─── */
export default function LandingPage() {
  const hero = useInView(0.05);
  const bento = useInView(0.08);
  const howSection = useInView(0.1);
  const statsSection = useInView(0.1);
  const ctaSection = useInView(0.1);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background text-foreground">
      {/* ── Ambient blobs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-[25%] -top-[25%] h-[900px] w-[900px] rounded-full bg-primary/[0.035] blur-[200px] animate-[pulse_9s_ease-in-out_infinite]" />
        <div className="absolute -right-[20%] top-[15%] h-[700px] w-[700px] rounded-full bg-chart-2/[0.025] blur-[180px] animate-[pulse_11s_ease-in-out_infinite_3s]" />
        <div className="absolute left-[25%] bottom-[5%] h-[600px] w-[600px] rounded-full bg-chart-5/[0.02] blur-[160px] animate-[pulse_13s_ease-in-out_infinite_6s]" />
      </div>

      {/* ── Grid texture ── */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.012]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* ── Sticky Nav ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          navScrolled
            ? "bg-background/70 backdrop-blur-xl border-b border-border/10 shadow-[0_1px_3px_oklch(0_0_0/15%)]"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/20 transition-all duration-300 group-hover:bg-primary/18 group-hover:shadow-[0_0_16px_oklch(0.72_0.185_195/20%)]">
              <span className="text-base font-bold text-primary">K</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-semibold tracking-tight">Kontemplay</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/60">Finance</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex h-8 items-center px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[0_1px_2px_oklch(0_0_0/30%)] transition-all duration-200 hover:bg-primary/85 active:scale-[0.97]"
            >
              Get Started
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section
        ref={hero.ref}
        className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pt-28 pb-16 text-center sm:pt-36 md:pt-44 md:pb-20"
      >
        {/* Pill badge */}
        <Reveal visible={hero.visible} delay={0}>
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-1.5 text-[13px] font-medium text-primary backdrop-blur-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            Built for Pakistani remote teams
          </div>
        </Reveal>

        {/* Headline */}
        <Reveal visible={hero.visible} delay={80}>
          <h1 className="max-w-4xl text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold leading-[1.08] tracking-tight">
            Payroll distribution,
            <br className="hidden sm:block" />
            <span
              className="bg-[length:200%_200%] bg-clip-text text-transparent animate-[gradient_6s_ease_infinite]"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, oklch(0.72 0.185 195), oklch(0.68 0.14 225), oklch(0.76 0.15 85), oklch(0.72 0.185 195))",
              }}
            >
              simplified.
            </span>
          </h1>
        </Reveal>

        {/* Subtitle */}
        <Reveal visible={hero.visible} delay={160}>
          <p className="mt-6 max-w-[540px] text-[17px] leading-relaxed text-muted-foreground md:text-lg">
            Manage USD&nbsp;to&nbsp;PKR salary distributions, tax calculations,
            invoices, and financial reporting&nbsp;&mdash;&nbsp;all in one premium
            dashboard.
          </p>
        </Reveal>

        {/* CTA Row */}
        <Reveal visible={hero.visible} delay={240} className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="group inline-flex h-12 items-center gap-2.5 rounded-xl bg-primary px-7 text-[15px] font-semibold text-primary-foreground shadow-[0_1px_2px_oklch(0_0_0/25%),0_0_20px_oklch(0.72_0.185_195/20%)] transition-all duration-300 hover:shadow-[0_1px_2px_oklch(0_0_0/25%),0_0_32px_oklch(0.72_0.185_195/30%)] hover:bg-primary/90 active:scale-[0.97]"
          >
            Start Managing
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#features"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-border/40 bg-card/40 px-7 text-[15px] font-medium text-foreground/80 backdrop-blur-sm transition-all duration-300 hover:bg-card/70 hover:border-border/60 active:scale-[0.97]"
          >
            See Features
            <ChevronRight className="size-4" />
          </a>
        </Reveal>

        {/* Trust strip */}
        <Reveal visible={hero.visible} delay={320} className="mt-12">
          <div className="flex flex-wrap items-center justify-center gap-6 text-[13px] text-muted-foreground/50">
            {trustPoints.map((tp) => (
              <span key={tp.text} className="flex items-center gap-1.5">
                <tp.icon className="size-3.5" />
                {tp.text}
              </span>
            ))}
          </div>
        </Reveal>

        {/* ── Dashboard Preview ── */}
        <Reveal visible={hero.visible} delay={450} className="mt-16 w-full max-w-[900px]">
          <div className="group relative rounded-2xl border border-border/20 bg-card/50 p-1 shadow-[0_16px_80px_oklch(0_0_0/35%),0_0_0_1px_oklch(1_0_0/4%)] backdrop-blur-md transition-shadow duration-700 hover:shadow-[0_16px_80px_oklch(0_0_0/45%),0_0_40px_oklch(0.72_0.185_195/5%)]">
            {/* Glow edge */}
            <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-60" />

            {/* Browser chrome */}
            <div className="relative flex items-center gap-1.5 rounded-t-xl bg-muted/25 px-4 py-2.5">
              <div className="size-2.5 rounded-full bg-foreground/15" />
              <div className="size-2.5 rounded-full bg-foreground/15" />
              <div className="size-2.5 rounded-full bg-foreground/15" />
              <div className="mx-auto h-5 w-48 rounded-md bg-muted/30" />
            </div>

            {/* Dashboard body */}
            <div className="relative rounded-b-xl bg-background/90 p-5 md:p-7">
              {/* Metric cards */}
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
                {[
                  { label: "Revenue", value: "PKR 2.4M", color: "text-emerald-400", border: "border-emerald-500/15", glow: "from-emerald-500/20" },
                  { label: "Operating", value: "PKR 1.8M", color: "text-red-400", border: "border-red-500/15", glow: "from-red-500/20" },
                  { label: "Cash Position", value: "PKR 580K", color: "text-primary", border: "border-primary/15", glow: "from-primary/20" },
                  { label: "Liabilities", value: "PKR 120K", color: "text-amber-400", border: "border-amber-500/15", glow: "from-amber-500/20" },
                ].map((m) => (
                  <div key={m.label} className={`relative overflow-hidden rounded-xl bg-card/70 p-3.5 border ${m.border}`}>
                    <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${m.glow} to-transparent`} />
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">{m.label}</p>
                    <p className={`mt-1 font-mono text-base font-bold tabular-nums md:text-lg ${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Skeleton table */}
              <div className="mt-5 space-y-1.5">
                {[1, 0.7, 0.45, 0.25].map((o, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/10 px-3.5 py-2" style={{ opacity: o }}>
                    <div className="h-1.5 w-16 rounded-full bg-muted/30" />
                    <div className="h-4 w-14 rounded-md bg-primary/10" />
                    <div className="flex-1" />
                    <div className="h-1.5 w-20 rounded-full bg-muted/20" />
                    <div className="h-1.5 w-14 rounded-full bg-emerald-500/15" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═══════════════════ STATS ═══════════════════ */}
      <section ref={statsSection.ref} className="relative z-10 border-y border-border/10">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-6 py-16 sm:grid-cols-4 md:py-20">
          {stats.map((s, i) => (
            <Reveal key={s.label} visible={statsSection.visible} delay={i * 70} className="text-center">
              <p className="text-3xl font-bold font-mono tracking-tight text-foreground tabular-nums md:text-4xl">
                {s.display ?? <Counter target={s.value} suffix={s.suffix} />}
              </p>
              <p className="mt-1 text-sm text-muted-foreground/60">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════════════════ BENTO FEATURES ═══════════════════ */}
      <section
        ref={bento.ref}
        id="features"
        className="relative z-10 mx-auto max-w-6xl px-6 py-24 md:py-32"
      >
        {/* Section heading */}
        <Reveal visible={bento.visible} delay={0} className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Features
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem]">
            Everything you need,<br className="hidden sm:block" /> nothing you don&apos;t
          </h2>
          <p className="mt-4 max-w-lg mx-auto text-muted-foreground">
            A focused toolkit for Pakistani remote teams managing international payments.
          </p>
        </Reveal>

        {/* Bento grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
          {features.map((f, i) => {
            const Icon = f.icon;
            const isLg = f.size === "lg";
            return (
              <Reveal
                key={f.title}
                visible={bento.visible}
                delay={120 + i * 60}
                className={isLg ? "lg:row-span-2" : ""}
              >
                <div
                  className={`group relative h-full overflow-hidden rounded-2xl border border-border/15 bg-card/40 backdrop-blur-sm transition-all duration-500 hover:border-primary/20 hover:bg-card/60 hover:shadow-[0_8px_40px_oklch(0_0_0/18%)] ${
                    isLg ? "p-8 flex flex-col justify-between" : "p-6"
                  }`}
                >
                  {/* Hover glow blob */}
                  <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-primary/[0.02] blur-3xl transition-all duration-700 group-hover:bg-primary/[0.06] group-hover:scale-150" />

                  {/* Animated border shimmer on hover */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{
                    background: "linear-gradient(135deg, oklch(0.72 0.185 195 / 8%) 0%, transparent 50%, oklch(0.68 0.14 225 / 6%) 100%)",
                  }} />

                  <div className="relative">
                    <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/8 ring-1 ring-primary/12 transition-all duration-300 group-hover:bg-primary/14 group-hover:ring-primary/25 group-hover:shadow-[0_0_20px_oklch(0.72_0.185_195/12%)]">
                      <Icon className="size-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <h3 className={`mb-2 font-semibold tracking-tight ${isLg ? "text-lg" : "text-[15px]"}`}>
                      {f.title}
                    </h3>
                    <p className={`leading-relaxed text-muted-foreground ${isLg ? "text-[15px]" : "text-sm"}`}>
                      {f.desc}
                    </p>
                  </div>

                  {/* Large card extra visual */}
                  {isLg && (
                    <div className="mt-6 flex items-center gap-2 text-xs font-medium text-primary/70">
                      <span>Learn more</span>
                      <ArrowRight className="size-3 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section ref={howSection.ref} className="relative z-10 mx-auto max-w-5xl px-6 py-24 md:py-32">
        <Reveal visible={howSection.visible} delay={0} className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            How it works
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps. That&apos;s it.
          </h2>
        </Reveal>

        <div className="relative grid gap-6 md:grid-cols-3 md:gap-0">
          {/* Connecting line (desktop) */}
          <div className="pointer-events-none absolute top-[52px] left-[16.7%] right-[16.7%] hidden h-px bg-gradient-to-r from-transparent via-border/40 to-transparent md:block" />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.num} visible={howSection.visible} delay={120 + i * 120} className="relative text-center">
                <div className="mx-auto mb-6 flex size-[104px] items-center justify-center">
                  {/* Outer ring */}
                  <div className="absolute size-[104px] rounded-full border border-border/20" />
                  {/* Inner circle */}
                  <div className="relative flex size-16 items-center justify-center rounded-full bg-card border border-border/30 shadow-[0_4px_20px_oklch(0_0_0/20%)]">
                    <Icon className="size-6 text-primary" />
                  </div>
                </div>
                <div className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-primary/60">
                  Step {step.num}
                </div>
                <h3 className="mb-2 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="mx-auto max-w-[280px] text-sm leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════ FEATURE HIGHLIGHT ═══════════════════ */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="grid gap-8 rounded-3xl border border-border/15 bg-card/30 p-8 backdrop-blur-sm md:grid-cols-3 md:p-12">
          {[
            { icon: FileText, title: "PDF Invoices", desc: "Generate and download professional invoices for employees and clients with one click." },
            { icon: Globe, title: "Multi-Currency", desc: "Handle USD to PKR conversions with dynamic exchange rates and threshold management." },
            { icon: Lock, title: "Secure & Private", desc: "Built on Supabase with row-level security. Your financial data stays yours." },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/8 ring-1 ring-primary/12">
                <item.icon className="size-5 text-primary" />
              </div>
              <div>
                <h4 className="mb-1 text-[15px] font-semibold tracking-tight">{item.title}</h4>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section ref={ctaSection.ref} className="relative z-10 mx-auto max-w-6xl px-6 py-16 md:py-24">
        <Reveal visible={ctaSection.visible} delay={0}>
          <div className="relative overflow-hidden rounded-3xl border border-border/15 p-12 text-center md:p-20">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-card to-chart-2/[0.04]" />

            {/* Ambient glow */}
            <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/[0.06] blur-[100px]" />
            <div className="pointer-events-none absolute -left-24 -bottom-24 size-56 rounded-full bg-chart-2/[0.04] blur-[80px]" />

            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Ready to simplify
                <br className="hidden sm:block" />
                your finances?
              </h2>
              <p className="mt-5 max-w-md mx-auto text-muted-foreground">
                Stop wrestling with spreadsheets. Start managing distributions,
                invoices, and reporting in minutes.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/login"
                  className="group inline-flex h-13 items-center gap-2.5 rounded-xl bg-primary px-8 text-[15px] font-semibold text-primary-foreground shadow-[0_2px_4px_oklch(0_0_0/20%),0_0_24px_oklch(0.72_0.185_195/20%)] transition-all duration-300 hover:shadow-[0_2px_4px_oklch(0_0_0/20%),0_0_40px_oklch(0.72_0.185_195/30%)] hover:bg-primary/90 active:scale-[0.97]"
                >
                  Get Started Free
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </div>

              {/* Bottom trust */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-[13px] text-muted-foreground/40">
                {["No credit card required", "Set up in 2 minutes", "Free for small teams"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-emerald-400/50" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="relative z-10 border-t border-border/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
              <span className="text-xs font-bold text-primary">K</span>
            </div>
            <span className="text-sm font-medium text-muted-foreground/70">Kontemplay Finance</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground/30">
            <span>&copy; {new Date().getFullYear()} Kontemplay (Pvt) Ltd</span>
          </div>
        </div>
      </footer>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
