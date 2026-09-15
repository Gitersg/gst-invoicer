import {
  useEffect,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { money } from "@/lib/inr";
import { cn } from "@/lib/utils";

const box =
  "h-11 w-full min-w-0 rounded-lg bg-surface px-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none placeholder:text-muted/70 focus:shadow-[var(--shadow-border-hover)]";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block min-w-0 space-y-1.5", className)}>
      {label ? (
        <span className="text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      ) : (
        <span className="hidden text-xs sm:block sm:invisible sm:h-0">.</span>
      )}
      {children}
      {hint ? <span className="block text-xs leading-snug text-muted">{hint}</span> : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(box, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(box, "h-28 py-2 leading-relaxed", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(box, "pr-8", props.className)} />;
}

/** Text field for money/qty — empty when 0, no spinner, decimals not eaten. */
export function AmountInput({
  value,
  onCommit,
  placeholder = "0",
}: {
  value: number;
  onCommit: (n: number) => void;
  placeholder?: string;
}) {
  const shown = value === 0 ? "" : String(value);
  const [text, setText] = useState(shown);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(value === 0 ? "" : String(value));
  }, [value, focused]);

  function commit(raw: string) {
    const t = raw.trim();
    if (t === "" || t === ".") {
      onCommit(0);
      return;
    }
    const n = Number(t);
    if (Number.isFinite(n) && n >= 0) onCommit(money(n));
  }

  return (
    <Input
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      value={text}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onChange={(e) => {
        const v = e.target.value.replace(/[^\d.]/g, "");
        const first = v.indexOf(".");
        const next = first === -1 ? v : v.slice(0, first + 1) + v.slice(first + 1).replace(/\./g, "");
        setText(next);
      }}
      onBlur={() => {
        setFocused(false);
        commit(text);
      }}
    />
  );
}
