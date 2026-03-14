"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";

export function Tip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);

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
      className="cursor-help ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-muted-foreground text-[10px] font-bold border border-border/50"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      ?
      {show &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[9999] w-80 p-3 rounded-lg bg-popover text-popover-foreground text-xs leading-relaxed shadow-xl ring-1 ring-border whitespace-pre-line"
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
