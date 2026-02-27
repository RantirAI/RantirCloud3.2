
-- Insert 10 diverse industry-specific design system templates
INSERT INTO design_system_templates (name, description, category, preview_color, sort_order, is_active, tokens, button_presets) VALUES

-- 1. Fashion & Luxury
('Fashion Luxe', 'Editorial luxury fashion aesthetic with serif typography and gold accents', 'fashion', '#c9a96e', 6, true,
'{
  "colors": [
    {"name": "primary", "value": "#1a1a1a", "category": "color"},
    {"name": "secondary", "value": "#c9a96e", "category": "color"},
    {"name": "accent", "value": "#8b7355", "category": "color"},
    {"name": "background", "value": "#faf8f5", "category": "color"},
    {"name": "surface", "value": "#ffffff", "category": "color"},
    {"name": "muted", "value": "#6b6b6b", "category": "color"}
  ],
  "fonts": [
    {"name": "heading", "value": "Cormorant Garamond", "category": "font"},
    {"name": "body", "value": "Montserrat", "category": "font"}
  ],
  "shadows": [
    {"name": "card", "value": "0 2px 8px rgba(0,0,0,0.06)", "category": "shadow"}
  ],
  "spacing": [
    {"name": "section-gap", "value": "100px", "category": "spacing"}
  ]
}'::jsonb,
'[
  {
    "name": "Primary CTA",
    "variant": "default",
    "styles": {
      "background": {"color": "#1a1a1a"},
      "typography": {"fontSize": "13px", "fontWeight": "500", "letterSpacing": "0.1em", "textTransform": "uppercase"},
      "spacing": {"padding": {"top": 16, "right": 40, "bottom": 16, "left": 40}},
      "border": {"radius": 0}
    },
    "states": {"hover": {"background": {"color": "#333333"}}}
  },
  {
    "name": "Gold Accent",
    "variant": "secondary",
    "styles": {
      "background": {"color": "#c9a96e"},
      "typography": {"fontSize": "13px", "fontWeight": "500", "letterSpacing": "0.1em", "textTransform": "uppercase", "color": "#ffffff"},
      "spacing": {"padding": {"top": 16, "right": 40, "bottom": 16, "left": 40}},
      "border": {"radius": 0}
    }
  }
]'::jsonb),

-- 2. Tech Startup
('Tech Startup', 'Modern tech aesthetic with vibrant gradients and geometric shapes', 'tech', '#6366f1', 7, true,
'{
  "colors": [
    {"name": "primary", "value": "#6366f1", "category": "color"},
    {"name": "secondary", "value": "#8b5cf6", "category": "color"},
    {"name": "accent", "value": "#06b6d4", "category": "color"},
    {"name": "background", "value": "#fafbfc", "category": "color"},
    {"name": "surface", "value": "#ffffff", "category": "color"},
    {"name": "muted", "value": "#64748b", "category": "color"}
  ],
  "fonts": [
    {"name": "heading", "value": "Plus Jakarta Sans", "category": "font"},
    {"name": "body", "value": "Inter", "category": "font"}
  ],
  "shadows": [
    {"name": "card", "value": "0 4px 24px rgba(99, 102, 241, 0.12)", "category": "shadow"}
  ],
  "spacing": [
    {"name": "section-gap", "value": "80px", "category": "spacing"}
  ]
}'::jsonb,
'[
  {
    "name": "Primary CTA",
    "variant": "default",
    "styles": {
      "background": {"gradient": {"type": "linear", "angle": 135, "stops": [{"color": "#6366f1", "position": 0}, {"color": "#8b5cf6", "position": 100}]}},
      "typography": {"fontSize": "15px", "fontWeight": "600"},
      "spacing": {"padding": {"top": 14, "right": 28, "bottom": 14, "left": 28}},
      "border": {"radius": 12}
    },
    "states": {"hover": {"transform": "translateY(-2px)", "shadow": {"x": 0, "y": 8, "blur": 24, "color": "rgba(99, 102, 241, 0.4)"}}}
  },
  {
    "name": "Glass Button",
    "variant": "secondary",
    "styles": {
      "background": {"color": "rgba(99, 102, 241, 0.1)"},
      "typography": {"fontSize": "15px", "fontWeight": "600", "color": "#6366f1"},
      "spacing": {"padding": {"top": 14, "right": 28, "bottom": 14, "left": 28}},
      "border": {"radius": 12, "width": 1, "style": "solid", "color": "rgba(99, 102, 241, 0.2)"}
    }
  }
]'::jsonb),

-- 3. Wellness & Spa
('Wellness Calm', 'Serene wellness aesthetic with soft greens and organic shapes', 'wellness', '#84cc16', 8, true,
'{
  "colors": [
    {"name": "primary", "value": "#65a30d", "category": "color"},
    {"name": "secondary", "value": "#84cc16", "category": "color"},
    {"name": "accent", "value": "#a3e635", "category": "color"},
    {"name": "background", "value": "#f7faf4", "category": "color"},
    {"name": "surface", "value": "#ffffff", "category": "color"},
    {"name": "muted", "value": "#78866b", "category": "color"}
  ],
  "fonts": [
    {"name": "heading", "value": "Fraunces", "category": "font"},
    {"name": "body", "value": "Nunito Sans", "category": "font"}
  ],
  "shadows": [
    {"name": "card", "value": "0 4px 16px rgba(101, 163, 13, 0.1)", "category": "shadow"}
  ],
  "spacing": [
    {"name": "section-gap", "value": "100px", "category": "spacing"}
  ]
}'::jsonb,
'[
  {
    "name": "Primary CTA",
    "variant": "default",
    "styles": {
      "background": {"color": "#65a30d"},
      "typography": {"fontSize": "15px", "fontWeight": "600"},
      "spacing": {"padding": {"top": 16, "right": 32, "bottom": 16, "left": 32}},
      "border": {"radius": 9999}
    },
    "states": {"hover": {"background": {"color": "#4d7c0f"}}}
  },
  {
    "name": "Soft Outline",
    "variant": "outline",
    "styles": {
      "background": {"color": "transparent"},
      "typography": {"fontSize": "15px", "fontWeight": "600", "color": "#65a30d"},
      "spacing": {"padding": {"top": 16, "right": 32, "bottom": 16, "left": 32}},
      "border": {"radius": 9999, "width": 2, "style": "solid", "color": "#65a30d"}
    }
  }
]'::jsonb),

-- 4. Food & Restaurant
('Artisan Food', 'Warm, appetizing design for restaurants with earthy tones', 'food', '#ea580c', 9, true,
'{
  "colors": [
    {"name": "primary", "value": "#ea580c", "category": "color"},
    {"name": "secondary", "value": "#dc2626", "category": "color"},
    {"name": "accent", "value": "#f59e0b", "category": "color"},
    {"name": "background", "value": "#fffbeb", "category": "color"},
    {"name": "surface", "value": "#ffffff", "category": "color"},
    {"name": "muted", "value": "#92400e", "category": "color"}
  ],
  "fonts": [
    {"name": "heading", "value": "Libre Baskerville", "category": "font"},
    {"name": "body", "value": "Source Sans Pro", "category": "font"}
  ],
  "shadows": [
    {"name": "card", "value": "0 4px 20px rgba(234, 88, 12, 0.12)", "category": "shadow"}
  ],
  "spacing": [
    {"name": "section-gap", "value": "80px", "category": "spacing"}
  ]
}'::jsonb,
'[
  {
    "name": "Primary CTA",
    "variant": "default",
    "styles": {
      "background": {"color": "#ea580c"},
      "typography": {"fontSize": "15px", "fontWeight": "700"},
      "spacing": {"padding": {"top": 14, "right": 28, "bottom": 14, "left": 28}},
      "border": {"radius": 8}
    },
    "states": {"hover": {"background": {"color": "#c2410c"}}}
  },
  {
    "name": "Warm Secondary",
    "variant": "secondary",
    "styles": {
      "background": {"color": "#fef3c7"},
      "typography": {"fontSize": "15px", "fontWeight": "600", "color": "#92400e"},
      "spacing": {"padding": {"top": 14, "right": 28, "bottom": 14, "left": 28}},
      "border": {"radius": 8}
    }
  }
]'::jsonb),

-- 5. Healthcare & Medical
('Healthcare Trust', 'Clean, trustworthy design for healthcare with calming blues', 'healthcare', '#0284c7', 10, true,
'{
  "colors": [
    {"name": "primary", "value": "#0284c7", "category": "color"},
    {"name": "secondary", "value": "#0ea5e9", "category": "color"},
    {"name": "accent", "value": "#14b8a6", "category": "color"},
    {"name": "background", "value": "#f0f9ff", "category": "color"},
    {"name": "surface", "value": "#ffffff", "category": "color"},
    {"name": "muted", "value": "#64748b", "category": "color"}
  ],
  "fonts": [
    {"name": "heading", "value": "Poppins", "category": "font"},
    {"name": "body", "value": "Open Sans", "category": "font"}
  ],
  "shadows": [
    {"name": "card", "value": "0 2px 12px rgba(2, 132, 199, 0.1)", "category": "shadow"}
  ],
  "spacing": [
    {"name": "section-gap", "value": "80px", "category": "spacing"}
  ]
}'::jsonb,
'[
  {
    "name": "Primary CTA",
    "variant": "default",
    "styles": {
      "background": {"color": "#0284c7"},
      "typography": {"fontSize": "15px", "fontWeight": "600"},
      "spacing": {"padding": {"top": 14, "right": 32, "bottom": 14, "left": 32}},
      "border": {"radius": 8}
    },
    "states": {"hover": {"background": {"color": "#0369a1"}}}
  },
  {
    "name": "Outline Professional",
    "variant": "outline",
    "styles": {
      "background": {"color": "transparent"},
      "typography": {"fontSize": "15px", "fontWeight": "600", "color": "#0284c7"},
      "spacing": {"padding": {"top": 14, "right": 32, "bottom": 14, "left": 32}},
      "border": {"radius": 8, "width": 2, "style": "solid", "color": "#0284c7"}
    }
  }
]'::jsonb),

-- 6. Real Estate
('Real Estate Pro', 'Sophisticated design for real estate with navy and gold accents', 'realestate', '#1e3a5f', 11, true,
'{
  "colors": [
    {"name": "primary", "value": "#1e3a5f", "category": "color"},
    {"name": "secondary", "value": "#c9a227", "category": "color"},
    {"name": "accent", "value": "#2563eb", "category": "color"},
    {"name": "background", "value": "#f8fafc", "category": "color"},
    {"name": "surface", "value": "#ffffff", "category": "color"},
    {"name": "muted", "value": "#64748b", "category": "color"}
  ],
  "fonts": [
    {"name": "heading", "value": "Playfair Display", "category": "font"},
    {"name": "body", "value": "Lato", "category": "font"}
  ],
  "shadows": [
    {"name": "card", "value": "0 4px 24px rgba(30, 58, 95, 0.12)", "category": "shadow"}
  ],
  "spacing": [
    {"name": "section-gap", "value": "100px", "category": "spacing"}
  ]
}'::jsonb,
'[
  {
    "name": "Primary CTA",
    "variant": "default",
    "styles": {
      "background": {"color": "#1e3a5f"},
      "typography": {"fontSize": "14px", "fontWeight": "600", "letterSpacing": "0.02em"},
      "spacing": {"padding": {"top": 16, "right": 36, "bottom": 16, "left": 36}},
      "border": {"radius": 4}
    },
    "states": {"hover": {"background": {"color": "#15304d"}}}
  },
  {
    "name": "Gold Accent",
    "variant": "secondary",
    "styles": {
      "background": {"color": "#c9a227"},
      "typography": {"fontSize": "14px", "fontWeight": "600", "color": "#ffffff"},
      "spacing": {"padding": {"top": 16, "right": 36, "bottom": 16, "left": 36}},
      "border": {"radius": 4}
    }
  }
]'::jsonb),

-- 7. Fitness & Sports
('Fitness Energy', 'High-energy design for fitness with bold contrast and dynamic feel', 'fitness', '#ef4444', 12, true,
'{
  "colors": [
    {"name": "primary", "value": "#ef4444", "category": "color"},
    {"name": "secondary", "value": "#f97316", "category": "color"},
    {"name": "accent", "value": "#fbbf24", "category": "color"},
    {"name": "background", "value": "#0a0a0a", "category": "color"},
    {"name": "surface", "value": "#171717", "category": "color"},
    {"name": "muted", "value": "#a3a3a3", "category": "color"}
  ],
  "fonts": [
    {"name": "heading", "value": "Bebas Neue", "category": "font"},
    {"name": "body", "value": "Roboto", "category": "font"}
  ],
  "shadows": [
    {"name": "card", "value": "0 4px 24px rgba(239, 68, 68, 0.2)", "category": "shadow"}
  ],
  "spacing": [
    {"name": "section-gap", "value": "80px", "category": "spacing"}
  ]
}'::jsonb,
'[
  {
    "name": "Primary CTA",
    "variant": "default",
    "styles": {
      "background": {"gradient": {"type": "linear", "angle": 90, "stops": [{"color": "#ef4444", "position": 0}, {"color": "#f97316", "position": 100}]}},
      "typography": {"fontSize": "16px", "fontWeight": "700", "letterSpacing": "0.05em", "textTransform": "uppercase"},
      "spacing": {"padding": {"top": 16, "right": 32, "bottom": 16, "left": 32}},
      "border": {"radius": 4}
    },
    "states": {"hover": {"transform": "scale(1.05)"}}
  },
  {
    "name": "Dark Outline",
    "variant": "outline",
    "styles": {
      "background": {"color": "transparent"},
      "typography": {"fontSize": "16px", "fontWeight": "700", "color": "#ef4444", "letterSpacing": "0.05em", "textTransform": "uppercase"},
      "spacing": {"padding": {"top": 16, "right": 32, "bottom": 16, "left": 32}},
      "border": {"radius": 4, "width": 2, "style": "solid", "color": "#ef4444"}
    }
  }
]'::jsonb),

-- 8. Education & Learning
('Education Bright', 'Friendly, accessible design for education with playful accents', 'education', '#7c3aed', 13, true,
'{
  "colors": [
    {"name": "primary", "value": "#7c3aed", "category": "color"},
    {"name": "secondary", "value": "#06b6d4", "category": "color"},
    {"name": "accent", "value": "#f59e0b", "category": "color"},
    {"name": "background", "value": "#faf5ff", "category": "color"},
    {"name": "surface", "value": "#ffffff", "category": "color"},
    {"name": "muted", "value": "#6b7280", "category": "color"}
  ],
  "fonts": [
    {"name": "heading", "value": "Quicksand", "category": "font"},
    {"name": "body", "value": "Nunito", "category": "font"}
  ],
  "shadows": [
    {"name": "card", "value": "0 4px 20px rgba(124, 58, 237, 0.12)", "category": "shadow"}
  ],
  "spacing": [
    {"name": "section-gap", "value": "80px", "category": "spacing"}
  ]
}'::jsonb,
'[
  {
    "name": "Primary CTA",
    "variant": "default",
    "styles": {
      "background": {"color": "#7c3aed"},
      "typography": {"fontSize": "16px", "fontWeight": "700"},
      "spacing": {"padding": {"top": 14, "right": 28, "bottom": 14, "left": 28}},
      "border": {"radius": 16}
    },
    "states": {"hover": {"background": {"color": "#6d28d9"}, "shadow": {"x": 0, "y": 6, "blur": 20, "color": "rgba(124, 58, 237, 0.4)"}}}
  },
  {
    "name": "Playful Accent",
    "variant": "secondary",
    "styles": {
      "background": {"color": "#06b6d4"},
      "typography": {"fontSize": "16px", "fontWeight": "700"},
      "spacing": {"padding": {"top": 14, "right": 28, "bottom": 14, "left": 28}},
      "border": {"radius": 16}
    }
  }
]'::jsonb),

-- 9. Finance & Fintech
('Fintech Modern', 'Secure, modern design for fintech with deep blues and greens', 'finance', '#059669', 14, true,
'{
  "colors": [
    {"name": "primary", "value": "#059669", "category": "color"},
    {"name": "secondary", "value": "#0f766e", "category": "color"},
    {"name": "accent", "value": "#2563eb", "category": "color"},
    {"name": "background", "value": "#f8fafc", "category": "color"},
    {"name": "surface", "value": "#ffffff", "category": "color"},
    {"name": "muted", "value": "#475569", "category": "color"}
  ],
  "fonts": [
    {"name": "heading", "value": "DM Sans", "category": "font"},
    {"name": "body", "value": "Inter", "category": "font"}
  ],
  "shadows": [
    {"name": "card", "value": "0 4px 16px rgba(5, 150, 105, 0.1)", "category": "shadow"}
  ],
  "spacing": [
    {"name": "section-gap", "value": "80px", "category": "spacing"}
  ]
}'::jsonb,
'[
  {
    "name": "Primary CTA",
    "variant": "default",
    "styles": {
      "background": {"color": "#059669"},
      "typography": {"fontSize": "15px", "fontWeight": "600"},
      "spacing": {"padding": {"top": 14, "right": 32, "bottom": 14, "left": 32}},
      "border": {"radius": 10}
    },
    "states": {"hover": {"background": {"color": "#047857"}}}
  },
  {
    "name": "Secure Outline",
    "variant": "outline",
    "styles": {
      "background": {"color": "transparent"},
      "typography": {"fontSize": "15px", "fontWeight": "600", "color": "#059669"},
      "spacing": {"padding": {"top": 14, "right": 32, "bottom": 14, "left": 32}},
      "border": {"radius": 10, "width": 2, "style": "solid", "color": "#059669"}
    }
  }
]'::jsonb),

-- 10. Travel & Hospitality
('Travel Adventure', 'Wanderlust-inspired design with warm sunset gradients', 'travel', '#f472b6', 15, true,
'{
  "colors": [
    {"name": "primary", "value": "#f472b6", "category": "color"},
    {"name": "secondary", "value": "#fb923c", "category": "color"},
    {"name": "accent", "value": "#fbbf24", "category": "color"},
    {"name": "background", "value": "#fffbf5", "category": "color"},
    {"name": "surface", "value": "#ffffff", "category": "color"},
    {"name": "muted", "value": "#78716c", "category": "color"}
  ],
  "fonts": [
    {"name": "heading", "value": "Josefin Sans", "category": "font"},
    {"name": "body", "value": "Karla", "category": "font"}
  ],
  "shadows": [
    {"name": "card", "value": "0 8px 32px rgba(244, 114, 182, 0.15)", "category": "shadow"}
  ],
  "spacing": [
    {"name": "section-gap", "value": "100px", "category": "spacing"}
  ]
}'::jsonb,
'[
  {
    "name": "Primary CTA",
    "variant": "default",
    "styles": {
      "background": {"gradient": {"type": "linear", "angle": 135, "stops": [{"color": "#f472b6", "position": 0}, {"color": "#fb923c", "position": 100}]}},
      "typography": {"fontSize": "15px", "fontWeight": "700"},
      "spacing": {"padding": {"top": 16, "right": 36, "bottom": 16, "left": 36}},
      "border": {"radius": 9999}
    },
    "states": {"hover": {"transform": "translateY(-2px)", "shadow": {"x": 0, "y": 8, "blur": 24, "color": "rgba(244, 114, 182, 0.4)"}}}
  },
  {
    "name": "Warm Ghost",
    "variant": "ghost",
    "styles": {
      "background": {"color": "transparent"},
      "typography": {"fontSize": "15px", "fontWeight": "600", "color": "#f472b6", "textDecoration": "underline"},
      "spacing": {"padding": {"top": 16, "right": 24, "bottom": 16, "left": 24}},
      "border": {"width": 0}
    }
  }
]'::jsonb);
