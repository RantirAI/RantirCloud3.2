import React from "react";
import { Logo } from "@/components/Logo";

interface WhirlpoolLoaderProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  icon?: React.ReactNode;
}

export function WhirlpoolLoader({ size = "md", message, icon }: WhirlpoolLoaderProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-12 w-12", 
    lg: "h-16 w-16"
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  const containerSizes = {
    sm: "h-6 w-6",
    md: "h-12 w-12",
    lg: "h-16 w-16"
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="cssload-container relative" style={{ 
        height: containerSizes[size].split(' ')[0].replace('h-', '').replace('[', '').replace(']', '') + 'px',
        width: containerSizes[size].split(' ')[1].replace('w-', '').replace('[', '').replace(']', '') + 'px'
      }}>
        <div className={`cssload-whirlpool ${sizeClasses[size]}`}></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-5 w-5' : 'h-7 w-7'} flex items-center justify-center`}>
            {icon || <Logo className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-5 w-5' : 'h-7 w-7'} text-foreground dark:invert`} />}
          </div>
        </div>
      </div>
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
        <span className="text-xs font-semibold text-foreground">Rantir</span>
      </div>
    </div>
  );
}