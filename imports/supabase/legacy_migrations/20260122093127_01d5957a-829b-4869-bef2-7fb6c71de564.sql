-- Create design system templates table with professional prebuilt templates
CREATE TABLE public.design_system_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  preview_color TEXT NOT NULL,
  tokens JSONB NOT NULL DEFAULT '{}',
  button_presets JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.design_system_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can read templates (they're public presets)
CREATE POLICY "Anyone can read design templates"
ON public.design_system_templates
FOR SELECT
USING (is_active = true);

-- Seed with 5 professional design system templates
INSERT INTO public.design_system_templates (name, description, category, preview_color, tokens, button_presets, sort_order) VALUES
-- Modern SaaS
('Modern SaaS', 'Clean, gradient-rich design for software products with teal-blue palette', 'modern', '#0d9488',
'{"colors": [{"name": "primary", "value": "#0d9488", "category": "color"}, {"name": "secondary", "value": "#3b82f6", "category": "color"}, {"name": "accent", "value": "#06b6d4", "category": "color"}, {"name": "background", "value": "#0f172a", "category": "color"}, {"name": "surface", "value": "#1e293b", "category": "color"}, {"name": "muted", "value": "#64748b", "category": "color"}], "fonts": [{"name": "heading", "value": "Inter", "category": "font"}, {"name": "body", "value": "Inter", "category": "font"}], "spacing": [{"name": "section-gap", "value": "80px", "category": "spacing"}], "shadows": [{"name": "card", "value": "0 4px 20px rgba(0,0,0,0.3)", "category": "shadow"}]}',
'[{"name": "Primary CTA", "variant": "default", "styles": {"background": {"gradient": {"type": "linear", "angle": 135, "stops": [{"color": "#0d9488", "position": 0}, {"color": "#3b82f6", "position": 100}]}}, "border": {"radius": 12}, "spacing": {"padding": {"top": 14, "right": 28, "bottom": 14, "left": 28}}, "typography": {"fontWeight": "600", "fontSize": "15px"}}, "states": {"hover": {"transform": "translateY(-2px)", "shadow": {"x": 0, "y": 8, "blur": 24, "color": "rgba(13, 148, 136, 0.4)"}}}}, {"name": "Secondary CTA", "variant": "outline", "styles": {"background": {"color": "transparent"}, "border": {"width": 2, "style": "solid", "color": "#0d9488", "radius": 12}, "spacing": {"padding": {"top": 14, "right": 28, "bottom": 14, "left": 28}}, "typography": {"fontWeight": "600", "fontSize": "15px", "color": "#0d9488"}}}]',
1),

-- Minimal Elegance
('Minimal Elegance', 'Ultra-clean, typography-focused design with black and white palette', 'minimal', '#18181b',
'{"colors": [{"name": "primary", "value": "#18181b", "category": "color"}, {"name": "secondary", "value": "#f4f4f5", "category": "color"}, {"name": "accent", "value": "#71717a", "category": "color"}, {"name": "background", "value": "#ffffff", "category": "color"}, {"name": "surface", "value": "#fafafa", "category": "color"}, {"name": "muted", "value": "#a1a1aa", "category": "color"}], "fonts": [{"name": "heading", "value": "Playfair Display", "category": "font"}, {"name": "body", "value": "Inter", "category": "font"}], "spacing": [{"name": "section-gap", "value": "120px", "category": "spacing"}], "shadows": [{"name": "card", "value": "0 1px 3px rgba(0,0,0,0.08)", "category": "shadow"}]}',
'[{"name": "Primary CTA", "variant": "default", "styles": {"background": {"color": "#18181b"}, "border": {"radius": 0}, "spacing": {"padding": {"top": 16, "right": 40, "bottom": 16, "left": 40}}, "typography": {"fontWeight": "500", "fontSize": "14px", "letterSpacing": "0.05em", "textTransform": "uppercase"}}, "states": {"hover": {"background": {"color": "#27272a"}}}}, {"name": "Secondary CTA", "variant": "ghost", "styles": {"background": {"color": "transparent"}, "border": {"width": 0}, "spacing": {"padding": {"top": 16, "right": 24, "bottom": 16, "left": 24}}, "typography": {"fontWeight": "500", "fontSize": "14px", "color": "#18181b", "textDecoration": "underline"}}}]',
2),

-- Bold Creative
('Bold Creative', 'Vibrant, energetic design for creative portfolios with purple-pink gradients', 'creative', '#8b5cf6',
'{"colors": [{"name": "primary", "value": "#8b5cf6", "category": "color"}, {"name": "secondary", "value": "#ec4899", "category": "color"}, {"name": "accent", "value": "#f97316", "category": "color"}, {"name": "background", "value": "#0c0a1d", "category": "color"}, {"name": "surface", "value": "#1a1730", "category": "color"}, {"name": "muted", "value": "#7c3aed", "category": "color"}], "fonts": [{"name": "heading", "value": "Space Grotesk", "category": "font"}, {"name": "body", "value": "DM Sans", "category": "font"}], "spacing": [{"name": "section-gap", "value": "100px", "category": "spacing"}], "shadows": [{"name": "card", "value": "0 8px 32px rgba(139, 92, 246, 0.25)", "category": "shadow"}]}',
'[{"name": "Primary CTA", "variant": "default", "styles": {"background": {"gradient": {"type": "linear", "angle": 135, "stops": [{"color": "#8b5cf6", "position": 0}, {"color": "#ec4899", "position": 100}]}}, "border": {"radius": 9999}, "spacing": {"padding": {"top": 16, "right": 36, "bottom": 16, "left": 36}}, "typography": {"fontWeight": "700", "fontSize": "16px"}}, "states": {"hover": {"transform": "scale(1.05)", "shadow": {"x": 0, "y": 12, "blur": 32, "color": "rgba(139, 92, 246, 0.5)"}}}}, {"name": "Glass Button", "variant": "secondary", "styles": {"background": {"color": "rgba(139, 92, 246, 0.15)"}, "border": {"width": 1, "style": "solid", "color": "rgba(139, 92, 246, 0.3)", "radius": 9999}, "spacing": {"padding": {"top": 16, "right": 36, "bottom": 16, "left": 36}}, "typography": {"fontWeight": "600", "fontSize": "16px", "color": "#a78bfa"}}}]',
3),

-- Corporate Trust
('Corporate Trust', 'Professional, trustworthy design for business with navy and gold accents', 'corporate', '#1e40af',
'{"colors": [{"name": "primary", "value": "#1e40af", "category": "color"}, {"name": "secondary", "value": "#ca8a04", "category": "color"}, {"name": "accent", "value": "#059669", "category": "color"}, {"name": "background", "value": "#f8fafc", "category": "color"}, {"name": "surface", "value": "#ffffff", "category": "color"}, {"name": "muted", "value": "#64748b", "category": "color"}], "fonts": [{"name": "heading", "value": "Merriweather", "category": "font"}, {"name": "body", "value": "Source Sans Pro", "category": "font"}], "spacing": [{"name": "section-gap", "value": "96px", "category": "spacing"}], "shadows": [{"name": "card", "value": "0 4px 16px rgba(30, 64, 175, 0.1)", "category": "shadow"}]}',
'[{"name": "Primary CTA", "variant": "default", "styles": {"background": {"color": "#1e40af"}, "border": {"radius": 8}, "spacing": {"padding": {"top": 14, "right": 32, "bottom": 14, "left": 32}}, "shadow": {"x": 0, "y": 4, "blur": 12, "color": "rgba(30, 64, 175, 0.3)"}, "typography": {"fontWeight": "600", "fontSize": "15px"}}, "states": {"hover": {"background": {"color": "#1e3a8a"}, "shadow": {"x": 0, "y": 6, "blur": 20, "color": "rgba(30, 64, 175, 0.4)"}}}}, {"name": "Gold Accent", "variant": "secondary", "styles": {"background": {"color": "#ca8a04"}, "border": {"radius": 8}, "spacing": {"padding": {"top": 14, "right": 32, "bottom": 14, "left": 32}}, "typography": {"fontWeight": "600", "fontSize": "15px", "color": "#ffffff"}}}]',
4),

-- Dark Mode Pro
('Dark Mode Pro', 'Sleek dark theme with neon green accents for tech-forward brands', 'modern', '#22c55e',
'{"colors": [{"name": "primary", "value": "#22c55e", "category": "color"}, {"name": "secondary", "value": "#0ea5e9", "category": "color"}, {"name": "accent", "value": "#a855f7", "category": "color"}, {"name": "background", "value": "#0a0a0a", "category": "color"}, {"name": "surface", "value": "#171717", "category": "color"}, {"name": "muted", "value": "#404040", "category": "color"}], "fonts": [{"name": "heading", "value": "Outfit", "category": "font"}, {"name": "body", "value": "Inter", "category": "font"}], "spacing": [{"name": "section-gap", "value": "80px", "category": "spacing"}], "shadows": [{"name": "card", "value": "0 0 1px rgba(255,255,255,0.1), 0 4px 16px rgba(0,0,0,0.5)", "category": "shadow"}, {"name": "glow", "value": "0 0 30px rgba(34, 197, 94, 0.3)", "category": "shadow"}]}',
'[{"name": "Neon CTA", "variant": "default", "styles": {"background": {"color": "#22c55e"}, "border": {"radius": 8}, "spacing": {"padding": {"top": 14, "right": 28, "bottom": 14, "left": 28}}, "shadow": {"x": 0, "y": 0, "blur": 20, "color": "rgba(34, 197, 94, 0.4)"}, "typography": {"fontWeight": "600", "fontSize": "15px", "color": "#0a0a0a"}}, "states": {"hover": {"shadow": {"x": 0, "y": 0, "blur": 30, "color": "rgba(34, 197, 94, 0.6)"}}}}, {"name": "Ghost Button", "variant": "ghost", "styles": {"background": {"color": "transparent"}, "border": {"width": 1, "style": "solid", "color": "rgba(34, 197, 94, 0.5)", "radius": 8}, "spacing": {"padding": {"top": 14, "right": 28, "bottom": 14, "left": 28}}, "typography": {"fontWeight": "500", "fontSize": "15px", "color": "#22c55e"}}}]',
5);