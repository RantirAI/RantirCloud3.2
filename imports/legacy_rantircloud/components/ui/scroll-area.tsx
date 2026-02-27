
import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

interface ScrollAreaProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  scrollbarVariant?: 'default' | 'hover-show';
}

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(({ className, children, scrollbarVariant = 'default', ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport 
      className={cn(
        "h-full w-full rounded-[inherit] [&>div]:!block [&>div]:!min-w-0",
        scrollbarVariant === 'hover-show' && "scrollbar-hover-show"
      )}
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar variant={scrollbarVariant} />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

interface ScrollBarProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> {
  variant?: 'default' | 'hover-show';
}

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  ScrollBarProps
>(({ className, orientation = "vertical", variant = 'default', ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      variant === 'hover-show' && "opacity-0 hover:opacity-100 transition-opacity duration-200",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb 
      className={cn(
        "relative flex-1 rounded-full",
        variant === 'hover-show' ? "bg-primary/40 hover:bg-primary/60" : "bg-border"
      )} 
    />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
