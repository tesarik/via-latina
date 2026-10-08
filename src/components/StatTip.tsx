import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  /** Explanation shown in the bubble under the top bar. */
  tip: string;
  children: ReactNode;
}

/** How long a tip stays up on its own. */
const HIDE_MS = 4000;

/** A header figure that explains itself when tapped (touch screens have no hover tooltips). */
export default function StatTip({ open, onToggle, onClose, tip, children }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onClose, HIDE_MS);
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open, onClose]);

  return (
    <span ref={ref} className="stat">
      <button type="button" className="stat-btn" aria-expanded={open} onClick={onToggle}>
        {children}
      </button>
      {open && (
        <span className="tip" role="status">
          {tip}
        </span>
      )}
    </span>
  );
}
