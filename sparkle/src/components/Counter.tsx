import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@sparkle/lib/utils";

export const COUNTER_SIZES = ["xs", "sm", "md"] as const;

const counterVariants = cva(
  "s-inline-flex s-items-center s-justify-center s-rounded-full",
  {
    variants: {
      size: {
        xs: "s-h-5 s-min-w-[20px] s-px-1 s-text-xs",
        sm: "s-h-6 s-min-w-[24px] s-px-1.5 s-text-sm",
        md: "s-h-7 s-min-w-[28px] s-px-2 s-text-base",
      },
      variant: {
        primary: "",
        highlight: "",
        warning: "",
        outline: "",
        ghost: "",
        "ghost-secondary": "",
      },
      isInButton: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        isInButton: false,
        variant: "primary",
        className:
          "s-bg-primary dark:s-bg-primary-night s-text-primary-50 dark:s-text-primary-800 s-font-medium",
      },
      {
        isInButton: false,
        variant: "highlight",
        className: "s-bg-highlight s-text-white s-font-medium",
      },
      {
        isInButton: false,
        variant: "warning",
        className: "s-bg-warning s-text-white s-font-medium",
      },
      {
        isInButton: false,
        variant: "outline",
        className: "s-bg-primary-200 s-text-primary-900 s-font-medium",
      },
      {
        isInButton: false,
        variant: ["ghost", "ghost-secondary"],
        className: "s-text-primary dark:s-text-primary-night s-font-medium",
      },
      {
        isInButton: true,
        variant: "primary",
        className:
          "s-bg-primary-600 dark:s-bg-primary-400 s-text-white dark:s-text-primary-900 s-font-semibold",
      },
      {
        isInButton: true,
        variant: "highlight",
        className: "s-bg-highlight-400 s-text-white s-font-semibold",
      },
      {
        isInButton: true,
        variant: "warning",
        className: "s-bg-warning-400 s-text-white s-font-semibold",
      },
      {
        isInButton: true,
        variant: "outline",
        className:
          "s-bg-primary-200 dark:s-bg-primary-700 s-text-primary-700 dark:s-text-primary-300 s-font-semibold",
      },
      {
        isInButton: true,
        variant: ["ghost", "ghost-secondary"],
        className:
          "s-bg-primary-200 dark:s-bg-primary-700 s-text-primary-700 dark:s-text-primary-300 s-font-semibold",
      },
    ],
    defaultVariants: {
      size: "sm",
      variant: "primary",
      isInButton: false,
    },
  }
);

export interface CounterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof counterVariants> {
  value: number;
}

export const Counter = React.forwardRef<HTMLDivElement, CounterProps>(
  (
    {
      value,
      className,
      size = "sm",
      variant = "primary",
      isInButton = false,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          counterVariants({ size, variant, isInButton }),
          className
        )}
        {...props}
      >
        {value}
      </div>
    );
  }
);

Counter.displayName = "Counter";
