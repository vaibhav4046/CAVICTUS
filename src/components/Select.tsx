import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

/**
 * Token-styled, accessible dropdown that replaces the native <select>.
 * Native selects render an un-styleable OS popup (huge + off-brand on Windows);
 * this is a button + popover listbox, fully controlled by our design tokens,
 * keyboard-operable, and reduced-motion safe.
 */

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  /** id of the visible <label> that names this control */
  ariaLabelledby?: string;
  className?: string;
}

export default function Select({
  id,
  value,
  options,
  onChange,
  disabled = false,
  ariaLabelledby,
  className = "",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value) ?? options[0];

  const close = (focusButton = false) => {
    setOpen(false);
    if (focusButton) btnRef.current?.focus();
  };

  // Close on outside pointer (mouse + touch).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // Keep the keyboard-active option scrolled into view.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  // When opening, point the active row at the current value.
  const openMenu = () => {
    if (disabled) return;
    const i = options.findIndex((o) => o.value === value);
    setActive(i < 0 ? 0 : i);
    setOpen(true);
  };

  const choose = (v: string) => {
    onChange(v);
    close(true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "Tab") {
      setOpen(false); // close, let focus move on (APG listbox pattern)
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[active];
      if (opt) choose(opt.value);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        ref={btnRef}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-opt-${active}` : undefined}
        aria-labelledby={ariaLabelledby}
        className="w-full flex items-center justify-between gap-2 text-sm font-medium text-ink bg-surface-2 border border-border-line rounded-xl px-3.5 py-2.5 text-left cursor-pointer transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={ariaLabelledby}
          tabIndex={-1}
          className="absolute z-50 mt-1.5 w-full max-h-64 overflow-auto rounded-xl border border-border-line bg-surface shadow-lg p-1.5 space-y-0.5"
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isActive = i === active;
            return (
              <li
                key={opt.value}
                id={`${listId}-opt-${i}`}
                data-idx={i}
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(opt.value)}
                onMouseEnter={() => setActive(i)}
                className={`flex items-center justify-between gap-2 text-sm rounded-lg px-2.5 py-2 cursor-pointer ${
                  isActive ? "bg-accent-soft text-ink" : "text-ink-soft"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-accent" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
