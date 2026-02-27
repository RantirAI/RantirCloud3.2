import React from "react";
import { Logo } from "@/components/Logo";

interface RantirLoaderProps {
  size?: "sm" | "md" | "lg";
  message?: string;
}

export function RantirLoader({ size = "md", message = "Loading..." }: RantirLoaderProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12", 
    lg: "h-16 w-16"
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-muted border-t-primary`}>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Logo className={`${size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8'} text-primary`} />
        </div>
      </div>
      {message && (
        <p className={`${textSizes[size]} text-muted-foreground font-medium`}>
          {message}
        </p>
      )}
    </div>
  );
}

interface PoweredByRantirProps {
  variant?: "light" | "dark";
}

export function PoweredByRantir({ variant = "light" }: PoweredByRantirProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4 px-6 border-t bg-background/80 backdrop-blur-sm">
      <span className="text-xs text-muted-foreground">Powered by</span>
      <div className="flex items-center gap-1">
        <Logo className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-foreground">Rantir</span>
      </div>
    </div>
  );
}