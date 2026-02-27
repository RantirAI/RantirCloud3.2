import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type CanvasTheme = 'light' | 'dark' | 'system';

interface CanvasThemeContextType {
  theme: CanvasTheme;
  setTheme: (theme: CanvasTheme) => void;
  resolvedTheme: 'light' | 'dark';
}

const CanvasThemeContext = createContext<CanvasThemeContextType | undefined>(undefined);

interface CanvasThemeProviderProps {
  children: ReactNode;
}

export function CanvasThemeProvider({ children }: CanvasThemeProviderProps) {
  const [theme, setTheme] = useState<CanvasTheme>('light');
  
  const getResolvedTheme = (currentTheme: CanvasTheme): 'light' | 'dark' => {
    if (currentTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return currentTheme;
  };

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => getResolvedTheme(theme));

  useEffect(() => {
    setResolvedTheme(getResolvedTheme(theme));
    
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => setResolvedTheme(getResolvedTheme(theme));
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return (
    <CanvasThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </CanvasThemeContext.Provider>
  );
}

export function useCanvasTheme() {
  const context = useContext(CanvasThemeContext);
  if (context === undefined) {
    // Return a safe default when used outside provider
    return {
      theme: 'light' as CanvasTheme,
      setTheme: () => {},
      resolvedTheme: 'light' as const
    };
  }
  return context;
}