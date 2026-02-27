import { useEffect } from 'react';
import { useDesignTokenStore } from '@/stores/designTokenStore';

// Keep this list aligned with the font options we expose in the UI.
const GOOGLE_FONTS = [
  'Instrument Sans', 'Figtree', 'Inter', 'Raleway', 'Open Sans', 'Roboto',
  'Lato', 'Montserrat', 'Source Sans 3', 'Nunito', 'Poppins', 'Work Sans',
  'Fira Sans', 'DM Sans', 'Inconsolata', 'Space Grotesk', 'Plus Jakarta Sans',
  'Manrope', 'Outfit', 'Sora', 'Playfair Display', 'Merriweather', 'Lora',
  'PT Sans', 'Ubuntu', 'JetBrains Mono', 'Fira Code', 'Source Code Pro',
];

function extractPrimaryFontName(fontFamily: string): string {
  return String(fontFamily || '')
    .split(',')[0]
    .replace(/["']/g, '')
    .trim();
}

function loadGoogleFont(fontName: string) {
  const fontId = `google-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(fontId)) return;

  const link = document.createElement('link');
  link.id = fontId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

/**
 * Ensures that fonts referenced by typography design tokens are actually loaded in the browser.
 * Without this, canvas can show the token selection in UI but render with fallback fonts.
 */
export function useDesignTokenFonts() {
  const { activeTokens } = useDesignTokenStore();

  useEffect(() => {
    const tokenKeys = ['font-heading', 'font-body', 'font-mono'] as const;

    for (const key of tokenKeys) {
      const raw = activeTokens.get(key)?.value;
      if (!raw) continue;

      const primary = extractPrimaryFontName(raw);
      if (!primary) continue;

      // Avoid trying to load system fonts.
      if (primary === 'system-ui' || primary === 'sans-serif' || primary === 'serif' || primary === 'monospace') continue;

      // Load if known Google font; if unknown, we leave it to the environment (local font).
      if (GOOGLE_FONTS.includes(primary)) {
        loadGoogleFont(primary);
      }
    }
  }, [activeTokens]);
}
