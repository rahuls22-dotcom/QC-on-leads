"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

type Size = "default" | "sm" | "lg" | "icon" | "pill";

const variantCls: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground hover:brightness-110",
  destructive: "bg-destructive text-white hover:brightness-110",
  outline:
    "bg-transparent border border-border text-foreground hover:bg-secondary",
  secondary: "bg-secondary text-secondary-foreground hover:brightness-95",
  ghost: "bg-transparent text-foreground hover:bg-secondary",
  link: "bg-transparent text-primary underline underline-offset-[3px] hover:opacity-80",
};

const sizeCls: Record<Size, string> = {
  default: "h-9 px-4 text-[13px]",
  sm: "h-[30px] px-3 text-xs",
  lg: "h-[42px] px-7 text-sm",
  icon: "h-9 w-9 p-0 text-[13px]",
  pill: "h-auto px-3.5 py-[5px] text-[13px] font-light rounded-full",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "default", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-[background,filter,color] duration-150",
        "disabled:opacity-50 disabled:pointer-events-none",
        "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
        variantCls[variant],
        sizeCls[size],
        className,
      )}
    />
  );
});
