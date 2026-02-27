import { Input as ShadcnInput } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface CompactInputProps extends React.ComponentProps<typeof ShadcnInput> {}

export const Input = forwardRef<HTMLInputElement, CompactInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <ShadcnInput
        ref={ref}
        className={cn(
          "h-6 px-2 text-xs rounded-[6px] border-rc-border bg-muted/30",
          "focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "CompactInput";