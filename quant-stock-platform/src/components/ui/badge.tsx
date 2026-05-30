import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default:
          "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
        secondary:
          "border-border bg-secondary text-secondary-foreground",
        success:
          "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
        warning:
          "border-amber-400/30 bg-amber-400/10 text-amber-200",
        danger:
          "border-rose-400/30 bg-rose-400/10 text-rose-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
