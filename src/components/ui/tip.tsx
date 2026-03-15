"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

export function Tip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleEnter() {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        left: Math.max(160, Math.min(rect.left, window.innerWidth - 180)),
      });
    }
    setShow(true);
  }

  return (
    <span
      ref={ref}
      className="cursor-help ml-1.5 inline-flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-200"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      <Info className="size-3.5" />
      {show &&
        mounted &&
        createPortal(
          <div
            className="fixed z-[9999] w-80 p-3.5 rounded-xl bg-popover/95 text-popover-foreground text-xs font-sans leading-relaxed shadow-[0_4px_24px_oklch(0_0_0/40%)] ring-1 ring-border/30 whitespace-pre-line backdrop-blur-xl"
            style={{
              top: pos.top,
              left: pos.left,
              transform: "translateX(-50%)",
            }}
          >
            {text}
          </div>,
          document.body
        )}
    </span>
  );
}
