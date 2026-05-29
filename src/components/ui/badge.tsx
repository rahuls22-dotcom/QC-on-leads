import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "destructive" | "outline" | "success";

const variantCls: Record<Variant, string> = {
  default: "bg-primary text-white border-transparent",
  secondary: "bg-secondary text-secondary-foreground border-transparent",
  destructive: "bg-destructive text-white border-transparent",
  outline: "bg-transparent text-foreground border-border",
  success: "bg-success-bg text-success border-transparent",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border rounded-md px-2.5 py-0.5 text-[11px] font-bold tracking-wide",
        variantCls[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
