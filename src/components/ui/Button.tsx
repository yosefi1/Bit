"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500",
        secondary:
          "bg-slate-200 text-slate-900 hover:bg-slate-300 focus:ring-slate-400",
        outline:
          "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-300",
        ghost:
          "text-slate-700 hover:bg-slate-100 focus:ring-slate-300",
        danger:
          "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
        success:
          "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "min-h-12 h-auto px-5 py-3 text-sm sm:text-base leading-normal",
      },
      fullWidth: { true: "w-full" },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(button({ variant, size, fullWidth }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";
