import { Button as ShadcnButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface CompactButtonProps extends React.ComponentProps<typeof ShadcnButton> {
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = forwardRef<HTMLButtonElement, CompactButtonProps>(
  ({ className, size = "sm", ...props }, ref) => {
    return (
      <ShadcnButton
        ref={ref}
        size={size}
        className={cn(
          "h-9 rounded-[6px] px-2.5 py-1.5 text-sm-compact shadow-subtle",
          "data-[state=open]:shadow-none",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "CompactButton";