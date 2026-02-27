import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { workspaceService } from '@/services/workspaceService';

const THEME_COLORS: Record<string, { color: string; hsl: string }> = {
  'blue': { color: '#3B82F6', hsl: '217.2 91.2% 59.8%' },
  'red': { color: '#EF4444', hsl: '0 84.2% 60.2%' },
  'green': { color: '#22C55E', hsl: '142.1 76.2% 36.3%' },
  'orange': { color: '#F97316', hsl: '24.6 95% 53.1%' },
  'dark-blue': { color: '#1E3A8A', hsl: '224.3 76.3% 32.9%' },
  'purple': { color: '#8B5CF6', hsl: '262.1 83.3% 57.8%' },
  'pink': { color: '#EC4899', hsl: '330.4 81.2% 60.4%' },
  'teal': { color: '#14B8A6', hsl: '173.4 80.4% 40%' },
};

const TOPBAR_COLORS: Record<string, string> = {
  'default': '#27272a',
  'black': '#09090b',
  'slate': '#334155',
  'dark-blue': '#000124',
  'blue': '#1e40af',
  'indigo': '#3730a3',
  'purple': '#6b21a8',
  'teal': '#115e59',
  'emerald': '#065f46',
  'rose': '#9f1239',
  'orange': '#9a3412',
};

export function applyThemeColor(color: string) {
  const colorConfig = THEME_COLORS[color];
  if (colorConfig) {
    // Set workspace-specific primary color (used by workspace shell UI only)
    // DO NOT set --primary as that affects canvas and AI chat
    document.documentElement.style.setProperty('--workspace-primary', colorConfig.hsl);
    document.documentElement.style.setProperty('--workspace-primary-hex', colorConfig.color);
    
    // Create/update style tag for workspace-specific button styling
    let styleTag = document.getElementById('workspace-theme-style');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'workspace-theme-style';
      document.head.appendChild(styleTag);
    }
    
    // Apply workspace primary to shell UI buttons ONLY, exclude canvas and AI chat
    styleTag.textContent = `
      /* Workspace shell UI buttons - use workspace theme color */
      .workspace-themed-button,
      [data-workspace-themed="true"] {
        --button-bg: hsl(${colorConfig.hsl});
      }
      
      /* Sidebar navigation active states */
      .sidebar-nav-item[data-active="true"],
      .workspace-nav-active {
        background-color: hsl(${colorConfig.hsl} / 0.1);
        color: hsl(${colorConfig.hsl});
      }
      
      /* DO NOT affect: canvas elements, AI chat messages */
    `;
  }
}

// Google Fonts that need to be loaded dynamically
const GOOGLE_FONTS = [
  'Instrument Sans', 'Figtree', 'Inter', 'Raleway', 'Open Sans', 'Roboto', 
  'Lato', 'Montserrat', 'Source Sans 3', 'Nunito', 'Poppins', 'Work Sans', 
  'Fira Sans', 'DM Sans', 'Inconsolata', 'Space Grotesk', 'Plus Jakarta Sans', 
  'Manrope', 'Outfit', 'Sora', 'Playfair Display', 'Merriweather', 'Lora',
  'PT Sans', 'Ubuntu', 'JetBrains Mono', 'Fira Code', 'Source Code Pro'
];

function loadGoogleFont(fontName: string) {
  // Check if font link already exists
  const fontId = `google-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(fontId)) return;

  // Create link element to load the font
  const link = document.createElement('link');
  link.id = fontId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

export function applyThemeFont(font: string) {
  // Load the Google Font if it's in our list
  if (GOOGLE_FONTS.includes(font)) {
    loadGoogleFont(font);
  }

  // Set CSS variable - this is the primary mechanism
  document.documentElement.style.setProperty('--theme-font-family', `"${font}"`);

  // Create/update style tag with global font rules
  let styleTag = document.getElementById('theme-font-style');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'theme-font-style';
    document.head.appendChild(styleTag);
  }

  // Apply font globally with high specificity
  styleTag.textContent = `
    :root {
      --theme-font-family: "${font}";
    }
    
    /* Apply workspace font to shell UI, excluding the visual builder canvas */
    html, body, #root {
      font-family: "${font}", -apple-system, BlinkMacSystemFont, sans-serif !important;
    }
    
    /* Apply to common elements OUTSIDE the canvas */
    :not([data-canvas-content] *):not([data-app-content] *):is(button, input, select, textarea, a, p, span, div, label, li, td, th, h2, h3, h4, h5, h6) {
      font-family: "${font}", -apple-system, BlinkMacSystemFont, sans-serif !important;
    }

    /* Visual builder canvas - use design system font, NOT workspace theme */
    [data-canvas-content], [data-canvas-content] *,
    [data-app-content], [data-app-content] * {
      font-family: inherit;
    }

    /* Preserve special font classes */
    .font-inconsolata, [class*="font-inconsolata"] {
      font-family: "Inconsolata", monospace !important;
    }
    .font-tiempos, [class*="font-tiempos"], h1:not([data-canvas-content] *):not([data-app-content] *) {
      font-family: "TiemposHeadline", Georgia, serif !important;
    }
    
    /* Monaco editor should keep its own font */
    .monaco-editor, .monaco-editor * {
      font-family: "JetBrains Mono", "Fira Code", monospace !important;
    }
  `;
}

export function applyTopbarColor(color: string) {
  const colorValue = TOPBAR_COLORS[color] || TOPBAR_COLORS['default'];
  document.documentElement.style.setProperty('--topbar-bg-color', colorValue);
  window.dispatchEvent(new CustomEvent('topbar-color-change', { detail: colorValue }));
}

export function useWorkspaceTheme() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [themeSettings, setThemeSettings] = useState({
    theme_color: 'blue',
    theme_font: 'Instrument Sans',
    topbar_bg_color: 'default'
  });

  useEffect(() => {
    const loadThemeSettings = async () => {
      try {
        // Wait for auth to be ready
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsLoaded(true);
          return;
        }

        const workspace = await workspaceService.getCurrentWorkspace();
        if (!workspace) {
          setIsLoaded(true);
          return;
        }

        const { data, error } = await supabase
          .from('workspace_customization')
          .select('theme_color, theme_font, topbar_bg_color')
          .eq('workspace_id', workspace.id)
          .maybeSingle();

        if (data && !error) {
          const settings = {
            theme_color: data.theme_color || 'blue',
            theme_font: data.theme_font || 'Instrument Sans',
            topbar_bg_color: data.topbar_bg_color || 'default'
          };
          
          setThemeSettings(settings);
          
          // Apply all theme settings
          applyThemeColor(settings.theme_color);
          applyThemeFont(settings.theme_font);
          applyTopbarColor(settings.topbar_bg_color);
        }
      } catch (error) {
        console.error('Error loading workspace theme:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadThemeSettings();

    // Also listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadThemeSettings();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isLoaded, themeSettings };
}
