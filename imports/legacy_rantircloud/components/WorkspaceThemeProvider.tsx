import React, { useEffect } from 'react';
import { useWorkspaceTheme } from '@/hooks/useWorkspaceTheme';

interface WorkspaceThemeProviderProps {
  children: React.ReactNode;
}

export function WorkspaceThemeProvider({ children }: WorkspaceThemeProviderProps) {
  // This hook loads and applies the theme settings on mount
  useWorkspaceTheme();
  
  return <>{children}</>;
}
