import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const styles: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg hover:bg-primary/90",
  ghost: "bg-transparent text-fg hover:bg-fg/5",
  outline: "bg-surface text-fg shadow-[var(--shadow-border)] hover:bg-bg",
  danger: "bg-danger text-primary-fg hover:bg-danger/90",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium",
        "transition-[transform,background-color,box-shadow] duration-150 ease-out",
        "active:not-disabled:scale-[0.96] disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
});
