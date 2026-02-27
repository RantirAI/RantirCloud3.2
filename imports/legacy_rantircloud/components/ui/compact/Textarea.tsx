import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface CompactTextareaProps extends React.ComponentProps<typeof ShadcnTextarea> {}

export const Textarea = forwardRef<HTMLTextAreaElement, CompactTextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <ShadcnTextarea
        ref={ref}
        className={cn(
          "min-h-[60px] px-2 py-1 text-xs rounded-[6px] border-rc-border bg-muted/30",
          "focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "CompactTextarea";