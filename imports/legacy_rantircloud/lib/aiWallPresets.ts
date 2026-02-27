/**
 * AI Wall Design Presets
 * Template-driven presets that enforce consistent design themes
 */

export interface AIWallPreset {
  id: string;
  name: string;
  description: string;
  category: 'professional' | 'creative' | 'minimal' | 'bold';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    headingWeight: string;
    bodyWeight: string;
  };
  borderRadius: 'none' | 'small' | 'medium' | 'large' | 'full';
  shadows: 'none' | 'subtle' | 'medium' | 'dramatic';
  previewGradient: string;
}

export const AI_WALL_PRESETS: AIWallPreset[] = [
  {
    id: 'modern-saas',
    name: 'Modern SaaS',
    description: 'Clean gradients, professional feel',
    category: 'professional',
    colors: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      accent: '#06b6d4',
      background: '#ffffff',
      foreground: '#0f172a',
      muted: '#64748b',
    },
    typography: {
      headingFont: 'Inter, sans-serif',
      bodyFont: 'Inter, sans-serif',
      headingWeight: '700',
      bodyWeight: '400',
    },
    borderRadius: 'medium',
    shadows: 'subtle',
    previewGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
  },
  {
    id: 'minimal-elegance',
    name: 'Minimal Elegance',
    description: 'Ultra-clean, typography-focused',
    category: 'minimal',
    colors: {
      primary: '#18181b',
      secondary: '#3f3f46',
      accent: '#71717a',
      background: '#fafafa',
      foreground: '#09090b',
      muted: '#a1a1aa',
    },
    typography: {
      headingFont: 'Playfair Display, serif',
      bodyFont: 'Inter, sans-serif',
      headingWeight: '600',
      bodyWeight: '400',
    },
    borderRadius: 'none',
    shadows: 'none',
    previewGradient: 'linear-gradient(180deg, #fafafa 0%, #e4e4e7 100%)',
  },
  {
    id: 'bold-creative',
    name: 'Bold Creative',
    description: 'Vibrant colors, energetic feel',
    category: 'bold',
    colors: {
      primary: '#f97316',
      secondary: '#ec4899',
      accent: '#8b5cf6',
      background: '#0f0f23',
      foreground: '#ffffff',
      muted: '#94a3b8',
    },
    typography: {
      headingFont: 'Space Grotesk, sans-serif',
      bodyFont: 'Inter, sans-serif',
      headingWeight: '700',
      bodyWeight: '400',
    },
    borderRadius: 'large',
    shadows: 'dramatic',
    previewGradient: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)',
  },
  {
    id: 'corporate-trust',
    name: 'Corporate Trust',
    description: 'Professional, trustworthy',
    category: 'professional',
    colors: {
      primary: '#1e40af',
      secondary: '#1d4ed8',
      accent: '#0ea5e9',
      background: '#f8fafc',
      foreground: '#0f172a',
      muted: '#64748b',
    },
    typography: {
      headingFont: 'Inter, sans-serif',
      bodyFont: 'Inter, sans-serif',
      headingWeight: '600',
      bodyWeight: '400',
    },
    borderRadius: 'small',
    shadows: 'subtle',
    previewGradient: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 50%, #0ea5e9 100%)',
  },
  {
    id: 'dark-mode-pro',
    name: 'Dark Mode Pro',
    description: 'Sleek dark with neon accents',
    category: 'creative',
    colors: {
      primary: '#22d3ee',
      secondary: '#a855f7',
      accent: '#f472b6',
      background: '#030712',
      foreground: '#f9fafb',
      muted: '#6b7280',
    },
    typography: {
      headingFont: 'Space Grotesk, sans-serif',
      bodyFont: 'Inter, sans-serif',
      headingWeight: '700',
      bodyWeight: '400',
    },
    borderRadius: 'medium',
    shadows: 'dramatic',
    previewGradient: 'linear-gradient(135deg, #030712 0%, #1f2937 50%, #22d3ee 100%)',
  },
  {
    id: 'fashion-luxe',
    name: 'Fashion Luxe',
    description: 'Editorial luxury aesthetic',
    category: 'creative',
    colors: {
      primary: '#a16207',
      secondary: '#854d0e',
      accent: '#ca8a04',
      background: '#1c1917',
      foreground: '#fafaf9',
      muted: '#a8a29e',
    },
    typography: {
      headingFont: 'Playfair Display, serif',
      bodyFont: 'Inter, sans-serif',
      headingWeight: '500',
      bodyWeight: '300',
    },
    borderRadius: 'none',
    shadows: 'none',
    previewGradient: 'linear-gradient(135deg, #1c1917 0%, #292524 50%, #a16207 100%)',
  },
  {
    id: 'tech-startup',
    name: 'Tech Startup',
    description: 'Modern tech aesthetic',
    category: 'professional',
    colors: {
      primary: '#10b981',
      secondary: '#059669',
      accent: '#34d399',
      background: '#0a0a0a',
      foreground: '#fafafa',
      muted: '#71717a',
    },
    typography: {
      headingFont: 'Inter, sans-serif',
      bodyFont: 'Inter, sans-serif',
      headingWeight: '700',
      bodyWeight: '400',
    },
    borderRadius: 'medium',
    shadows: 'medium',
    previewGradient: 'linear-gradient(135deg, #0a0a0a 0%, #10b981 50%, #34d399 100%)',
  },
  {
    id: 'wellness-calm',
    name: 'Wellness Calm',
    description: 'Serene, balanced wellness',
    category: 'minimal',
    colors: {
      primary: '#0d9488',
      secondary: '#14b8a6',
      accent: '#5eead4',
      background: '#f0fdfa',
      foreground: '#134e4a',
      muted: '#5f9ea0',
    },
    typography: {
      headingFont: 'Lora, serif',
      bodyFont: 'Inter, sans-serif',
      headingWeight: '500',
      bodyWeight: '400',
    },
    borderRadius: 'large',
    shadows: 'subtle',
    previewGradient: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 50%, #0d9488 100%)',
  },
];

export function getPresetById(id: string): AIWallPreset | undefined {
  return AI_WALL_PRESETS.find(preset => preset.id === id);
}

export function formatPresetForAIPrompt(preset: AIWallPreset): string {
  const borderRadiusValue = preset.borderRadius === 'none' ? '0' 
    : preset.borderRadius === 'small' ? '4' 
    : preset.borderRadius === 'medium' ? '12' 
    : preset.borderRadius === 'large' ? '20' 
    : '9999';

  return `
═══════════════════════════════════════════════════════════════════════════════
DESIGN PRESET: ${preset.name.toUpperCase()}
═══════════════════════════════════════════════════════════════════════════════

Style Direction: ${preset.description}
Category: ${preset.category.toUpperCase()}

MANDATORY COLOR PALETTE - Use these EXACT values:
┌─────────────────────────────────────────────────────────────────────────────┐
│ PRIMARY:      ${preset.colors.primary.padEnd(20)} │ Use for CTAs, links, key elements       │
│ SECONDARY:    ${preset.colors.secondary.padEnd(20)} │ Use for secondary buttons, accents      │
│ ACCENT:       ${preset.colors.accent.padEnd(20)} │ Use for highlights, badges               │
│ BACKGROUND:   ${preset.colors.background.padEnd(20)} │ Use for page/section backgrounds        │
│ FOREGROUND:   ${preset.colors.foreground.padEnd(20)} │ Use for headings, primary text          │
│ MUTED:        ${preset.colors.muted.padEnd(20)} │ Use for secondary text, captions        │
└─────────────────────────────────────────────────────────────────────────────┘

TYPOGRAPHY CONFIGURATION:
- Heading Font: "${preset.typography.headingFont}" (weight: ${preset.typography.headingWeight})
- Body Font: "${preset.typography.bodyFont}" (weight: ${preset.typography.bodyWeight})
- Apply these fonts CONSISTENTLY across all text elements

VISUAL EFFECTS:
- Border Radius: ${borderRadiusValue}px (apply to cards, buttons, inputs)
- Shadows: ${preset.shadows} (${
    preset.shadows === 'none' ? 'no shadows' 
    : preset.shadows === 'subtle' ? 'soft, minimal shadows' 
    : preset.shadows === 'medium' ? 'balanced shadow depth' 
    : 'bold, dramatic shadows'
  })

CRITICAL: Do NOT deviate from this palette. Every color in the output must come from these 6 values.
`;
}
