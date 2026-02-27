import React from 'react';
import loaderRLogo from '@/assets/loader-r-logo.png';

interface LottieLoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
}

export function LottieLoader({ 
  size = "md", 
  className = "",
  loop = true,
  autoplay = true
}: LottieLoaderProps) {
  const sizeClasses = {
    sm: "h-5 w-5",
    md: "h-8 w-8", 
    lg: "h-12 w-12",
    xl: "h-24 w-24"
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <img 
        src={loaderRLogo}
        alt="Loading..."
        className={`w-full h-full ${autoplay && loop ? 'animate-spin' : ''}`}
      />
    </div>
  );
}