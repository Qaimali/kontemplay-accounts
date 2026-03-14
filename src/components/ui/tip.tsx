"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

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
      className="cursor-help ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-muted-foreground text-[10px] font-bold border border-border/50"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      ?
      {show &&
        mounted &&
        createPortal(
          <div
            className="fixed z-[9999] w-80 p-3 rounded-lg bg-zinc-900 text-white text-xs leading-relaxed shadow-xl whitespace-pre-line"
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
