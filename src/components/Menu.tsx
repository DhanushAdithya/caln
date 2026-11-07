import { useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";

/** Minimal dropdown: outside-click + Escape dismissal, no deps. */
export function Dropdown(props: {
  label: ComponentChildren;
  align?: "left" | "right";
  menuClass?: string;
  children: ComponentChildren;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <div class={`dd${props.align === "right" ? " dd-r" : ""}`} ref={root}>
      <button
        type="button"
        class="dd-btn"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {props.label}
        <svg
          class="chev"
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div class={`dd-menu${props.menuClass ? ` ${props.menuClass}` : ""}`}>
          {props.children}
        </div>
      )}
    </div>
  );
}
