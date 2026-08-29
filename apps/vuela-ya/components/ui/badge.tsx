import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#E01E26] text-white hover:bg-[#C0181E] dark:bg-[#E01E26] dark:text-white",
        secondary:
          "border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200",
        destructive:
          "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300",
        outline: "text-slate-700 border-slate-300 dark:text-slate-300 dark:border-slate-700",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
        warning:
          "border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
        business:
          "border-amber-400/40 bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-800 dark:text-amber-300 font-bold",
        economy:
          "border-red-200 bg-red-50 text-[#C0181E] dark:bg-red-950/50 dark:text-red-300 dark:border-red-900 font-medium",
        avianca:
          "border-transparent bg-[#E01E26] text-white font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
