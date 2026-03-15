"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className={cn("flex h-8 items-center gap-0.5 rounded-lg bg-muted/50 p-0.5", className)}>
        <div className="size-7 rounded-md" />
        <div className="size-7 rounded-md" />
        <div className="size-7 rounded-md" />
      </div>
    );
  }

  const options = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "system", icon: Monitor, label: "System" },
    { value: "dark", icon: Moon, label: "Dark" },
  ] as const;

  return (
    <div className={cn("flex h-8 items-center gap-0.5 rounded-lg bg-muted/50 p-0.5", className)}>
      {options.map((opt) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={cn(
              "flex size-7 cursor-pointer items-center justify-center rounded-md transition-all duration-200",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            title={opt.label}
          >
            <opt.icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
