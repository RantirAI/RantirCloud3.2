
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-button text-xs font-medium transition-all duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 gap-1 active:translate-y-[1px]",
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground",
          "shadow-[var(--button-shadow),var(--button-shadow-inner)]",
          "hover:bg-primary-hover hover:shadow-md",
          "active:bg-primary-active active:shadow-sm",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
          "border border-primary/10"
        ],
        secondary: [
          "bg-secondary text-secondary-foreground border border-border",
          "shadow-[var(--button-shadow),var(--button-shadow-inner)]",
          "hover:bg-secondary-hover hover:shadow-md",
          "active:bg-secondary-active active:shadow-sm",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
        ],
        dark: [
          "bg-dark text-dark-foreground",
          "shadow-[var(--button-shadow),var(--button-shadow-inner)]",
          "hover:bg-dark-hover hover:shadow-md",
          "active:bg-dark-active active:shadow-sm",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
          "border border-dark/10"
        ],
        destructive: [
          "bg-destructive text-destructive-foreground",
          "shadow-[var(--button-shadow),var(--button-shadow-inner)]",
          "hover:bg-destructive/90 hover:shadow-md",
          "active:shadow-sm",
          "focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-0",
          "border border-destructive/10"
        ],
        outline: [
          "border border-zinc-200 dark:border-zinc-700 bg-background",
          "shadow-[var(--button-shadow),var(--button-shadow-inner)]",
          "hover:bg-accent hover:text-accent-foreground hover:shadow-md",
          "active:shadow-sm",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
        ],
        ghost: [
          "bg-transparent text-foreground border border-zinc-200 dark:border-zinc-700",
          "hover:bg-muted/50 hover:text-foreground hover:border-border",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
        ],
        link: [
          "text-primary underline-offset-4 hover:underline",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
        ],
      },
      size: {
        default: "h-7 px-2 py-1",
        xs: "h-6 px-2 text-[10px]",
        sm: "h-8 px-2 py-1.5",
        lg: "h-10 px-2 py-2",
        icon: "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
