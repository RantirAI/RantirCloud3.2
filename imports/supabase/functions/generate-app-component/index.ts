import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Complete component type reference
const COMPONENT_TYPES = `
AVAILABLE COMPONENT TYPES:
Layout: div, section, container, spacer, separator
Typography: text, heading, blockquote, code, codeblock, link, icon
Forms: button, input, password-input, textarea, select, checkbox, radio, radio-group, checkbox-group, switch, slider, form, form-wrapper, label, combobox, datepicker
Media: image, video
Data: datatable, list, badge, alert, progress, calendar
Navigation: nav-horizontal, nav-vertical, sidebar, dropdown-menu, tabs, accordion, carousel
`;

// Complete style structure reference
const STYLE_STRUCTURE = `
EXACT STYLE OBJECT STRUCTURE (use this format precisely):
{
  "layout": {
    "display": "flex" | "block" | "grid" | "inline" | "none",
    "flexDirection": "row" | "column",
    "justifyContent": "start" | "center" | "end" | "between" | "around" | "evenly",
    "alignItems": "start" | "center" | "end" | "stretch",
    "gap": 8 | 12 | 16 | 20 | 24 | 32 (number in pixels)
  },
  "spacing": {
    "padding": 16 | { "top": 16, "right": 24, "bottom": 16, "left": 24 },
    "margin": 0 | { "top": 0, "right": 0, "bottom": 16, "left": 0 }
  },
  "sizing": {
    "width": "100%" | "auto" | "320px" | 320,
    "height": "auto" | "100%" | "200px" | 200,
    "maxWidth": "1200px" | "400px" | "none",
    "minHeight": "100px" | "auto"
  },
  "typography": {
    "fontSize": "14px" | "16px" | "18px" | "24px" | "32px" | "48px",
    "fontWeight": "400" | "500" | "600" | "700" | "800",
    "textAlign": "left" | "center" | "right",
    "color": "hsl(var(--foreground))",
    "lineHeight": "1.5" | "1.6" | "1.75"
  },
  "background": {
    "color": "hsl(var(--card))" | "hsl(var(--primary))" | "transparent"
  },
  "border": {
    "width": 1,
    "style": "solid",
    "color": "hsl(var(--border))",
    "radius": 8 | 12 | 16 | 9999
  },
  "shadow": {
    "x": 0,
    "y": 4,
    "blur": 12,
    "spread": 0,
    "color": "rgba(0,0,0,0.1)"
  }
}
`;

// Semantic color tokens
const COLOR_TOKENS = `
SEMANTIC COLOR TOKENS (ALWAYS use these, never hardcode colors):
- Background: "hsl(var(--background))"
- Foreground (text): "hsl(var(--foreground))"
- Card background: "hsl(var(--card))"
- Card foreground: "hsl(var(--card-foreground))"
- Primary (brand): "hsl(var(--primary))"
- Primary foreground: "hsl(var(--primary-foreground))"
- Secondary: "hsl(var(--secondary))"
- Secondary foreground: "hsl(var(--secondary-foreground))"
- Muted (subtle bg): "hsl(var(--muted))"
- Muted foreground: "hsl(var(--muted-foreground))"
- Accent: "hsl(var(--accent))"
- Border: "hsl(var(--border))"
- Destructive: "hsl(var(--destructive))"
`;

// Component props reference
const COMPONENT_PROPS = `
COMPONENT PROPS BY TYPE:

text/heading:
- content: string (the text to display)
- tag: "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"

button:
- content: string (button label)
- variant: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
- size: "default" | "sm" | "lg" | "icon"

input:
- placeholder: string
- label: string
- type: "text" | "email" | "number" | "tel" | "url"
- required: boolean

textarea:
- placeholder: string
- label: string
- rows: number

select:
- placeholder: string
- options: [{ label: string, value: string }]

badge:
- content: string
- variant: "default" | "secondary" | "destructive" | "outline"

image:
- src: string (image URL)
- alt: string

icon:
- iconName: string (Lucide icon name like "Check", "Star", "ArrowRight")
- size: number (icon size in pixels)
`;

// Professional design patterns
const DESIGN_PATTERNS = `
PROFESSIONAL DESIGN PATTERNS:

1. PRICING CARDS:
- Use "container" for the wrapper with flex layout and gap
- Each tier is a "div" with card styling (background, border, shadow, radius)
- Include: badge for popular tier, heading for name, large text for price, text list for features, button CTA
- Apply proper padding (24-32px), border-radius (12-16px), shadow for depth
- Popular tier should have primary border color or primary background

2. HERO SECTIONS:
- Use "section" as container with center-aligned content
- Large heading (48px+), muted subtitle, and primary CTA button
- Generous padding (80-120px vertical)
- Optional: secondary text button next to primary

3. CONTACT FORMS:
- Use "form-wrapper" or "div" as container
- Include: input (name, email), textarea (message), button (submit)
- Labels should be muted-foreground color
- Inputs need border, border-radius, proper padding
- Button should be full-width or substantial size

4. CARDS:
- Background: card token, border: 1px solid border token
- Border radius: 12px, padding: 24px
- Shadow: subtle (y:4, blur:12, opacity:0.1)

5. BUTTONS:
- Primary: primary bg, primary-foreground text
- Secondary: secondary bg, secondary-foreground text
- Outline: transparent bg, border, foreground text
- Padding: 12px 24px minimum, border-radius: 8px
`;

// Class reuse patterns
const CLASS_PATTERNS = `
CLASS AND STYLE REUSE:

When creating multiple similar components, define a reusable class pattern:
1. Create consistent styling across similar elements
2. Use the same style object for elements that should match
3. For pricing tiers: base tier styling + variation for "popular" tier

Example - pricing tiers should all share:
- Same border-radius, padding, background
- Same typography hierarchy
- Same button styling (except popular tier uses primary bg)
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const { prompt, context } = await req.json();

    const availableTables = context?.availableTables || [];
    const selectedDatabase = context?.selectedDatabase || {};
    
    const systemPrompt = `You are an expert UI designer and component generator. You create BEAUTIFUL, PROFESSIONAL components with proper styling and structure.

${COMPONENT_TYPES}

${STYLE_STRUCTURE}

${COLOR_TOKENS}

${COMPONENT_PROPS}

${DESIGN_PATTERNS}

${CLASS_PATTERNS}

CRITICAL RULES:
1. ALWAYS use semantic color tokens (hsl(var(--xxx))) - NEVER hardcode colors
2. ALWAYS include proper spacing (padding, margin, gap)
3. ALWAYS use appropriate shadows for cards and elevated elements
4. ALWAYS use proper border-radius (8px for buttons, 12-16px for cards)
5. CREATE realistic, professional content - no "Lorem ipsum" or "Example"
6. STRUCTURE components properly with children nested correctly
7. USE proper typography hierarchy (larger for headings, regular for body)

RESPONSE FORMAT:
Return ONLY valid JSON. For multiple components, use:
{
  "components": [
    {
      "id": "unique-id",
      "type": "component-type",
      "props": { ... },
      "style": { ... },
      "children": [ ... ]
    }
  ]
}

For a single component, use the same structure but with just one item in components array.

EXAMPLE - Professional Pricing Section:
{
  "components": [
    {
      "id": "pricing-section",
      "type": "section",
      "props": {},
      "style": {
        "layout": { "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": 48 },
        "spacing": { "padding": { "top": 80, "right": 24, "bottom": 80, "left": 24 } },
        "background": { "color": "hsl(var(--background))" }
      },
      "children": [
        {
          "id": "pricing-header",
          "type": "div",
          "props": {},
          "style": {
            "layout": { "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": 16 },
            "typography": { "textAlign": "center" },
            "sizing": { "maxWidth": "600px" }
          },
          "children": [
            {
              "id": "pricing-title",
              "type": "heading",
              "props": { "content": "Choose Your Plan", "tag": "h2" },
              "style": {
                "typography": { "fontSize": "36px", "fontWeight": "700", "color": "hsl(var(--foreground))" }
              }
            },
            {
              "id": "pricing-subtitle",
              "type": "text",
              "props": { "content": "Select the perfect plan for your needs. All plans include a 14-day free trial." },
              "style": {
                "typography": { "fontSize": "18px", "color": "hsl(var(--muted-foreground))", "lineHeight": "1.6" }
              }
            }
          ]
        },
        {
          "id": "pricing-cards",
          "type": "div",
          "props": {},
          "style": {
            "layout": { "display": "flex", "flexDirection": "row", "gap": 24, "justifyContent": "center", "alignItems": "stretch" },
            "sizing": { "width": "100%", "maxWidth": "1000px" }
          },
          "children": [
            {
              "id": "basic-tier",
              "type": "div",
              "props": {},
              "style": {
                "layout": { "display": "flex", "flexDirection": "column", "gap": 24 },
                "spacing": { "padding": 32 },
                "sizing": { "width": "320px" },
                "background": { "color": "hsl(var(--card))" },
                "border": { "width": 1, "style": "solid", "color": "hsl(var(--border))", "radius": 16 }
              },
              "children": [
                {
                  "id": "basic-name",
                  "type": "heading",
                  "props": { "content": "Basic", "tag": "h3" },
                  "style": { "typography": { "fontSize": "24px", "fontWeight": "600", "color": "hsl(var(--foreground))" } }
                },
                {
                  "id": "basic-price",
                  "type": "text",
                  "props": { "content": "$9/month" },
                  "style": { "typography": { "fontSize": "48px", "fontWeight": "700", "color": "hsl(var(--foreground))" } }
                },
                {
                  "id": "basic-description",
                  "type": "text",
                  "props": { "content": "Perfect for individuals getting started" },
                  "style": { "typography": { "fontSize": "16px", "color": "hsl(var(--muted-foreground))" } }
                },
                {
                  "id": "basic-features",
                  "type": "div",
                  "props": {},
                  "style": { "layout": { "display": "flex", "flexDirection": "column", "gap": 12 } },
                  "children": [
                    { "id": "basic-f1", "type": "text", "props": { "content": "✓ Up to 5 projects" }, "style": { "typography": { "fontSize": "14px", "color": "hsl(var(--foreground))" } } },
                    { "id": "basic-f2", "type": "text", "props": { "content": "✓ Basic analytics" }, "style": { "typography": { "fontSize": "14px", "color": "hsl(var(--foreground))" } } },
                    { "id": "basic-f3", "type": "text", "props": { "content": "✓ Email support" }, "style": { "typography": { "fontSize": "14px", "color": "hsl(var(--foreground))" } } }
                  ]
                },
                {
                  "id": "basic-cta",
                  "type": "button",
                  "props": { "content": "Get Started", "variant": "outline" },
                  "style": {
                    "spacing": { "padding": { "top": 12, "right": 24, "bottom": 12, "left": 24 } },
                    "border": { "radius": 8 },
                    "sizing": { "width": "100%" }
                  }
                }
              ]
            },
            {
              "id": "pro-tier",
              "type": "div",
              "props": {},
              "style": {
                "layout": { "display": "flex", "flexDirection": "column", "gap": 24 },
                "spacing": { "padding": 32 },
                "sizing": { "width": "320px" },
                "background": { "color": "hsl(var(--card))" },
                "border": { "width": 2, "style": "solid", "color": "hsl(var(--primary))", "radius": 16 },
                "shadow": { "x": 0, "y": 8, "blur": 24, "spread": 0, "color": "rgba(0,0,0,0.15)" }
              },
              "children": [
                {
                  "id": "pro-badge",
                  "type": "badge",
                  "props": { "content": "Most Popular", "variant": "default" },
                  "style": { "sizing": { "width": "fit-content" } }
                },
                {
                  "id": "pro-name",
                  "type": "heading",
                  "props": { "content": "Pro", "tag": "h3" },
                  "style": { "typography": { "fontSize": "24px", "fontWeight": "600", "color": "hsl(var(--foreground))" } }
                },
                {
                  "id": "pro-price",
                  "type": "text",
                  "props": { "content": "$29/month" },
                  "style": { "typography": { "fontSize": "48px", "fontWeight": "700", "color": "hsl(var(--primary))" } }
                },
                {
                  "id": "pro-description",
                  "type": "text",
                  "props": { "content": "For growing teams and businesses" },
                  "style": { "typography": { "fontSize": "16px", "color": "hsl(var(--muted-foreground))" } }
                },
                {
                  "id": "pro-features",
                  "type": "div",
                  "props": {},
                  "style": { "layout": { "display": "flex", "flexDirection": "column", "gap": 12 } },
                  "children": [
                    { "id": "pro-f1", "type": "text", "props": { "content": "✓ Unlimited projects" }, "style": { "typography": { "fontSize": "14px", "color": "hsl(var(--foreground))" } } },
                    { "id": "pro-f2", "type": "text", "props": { "content": "✓ Advanced analytics" }, "style": { "typography": { "fontSize": "14px", "color": "hsl(var(--foreground))" } } },
                    { "id": "pro-f3", "type": "text", "props": { "content": "✓ Priority support" }, "style": { "typography": { "fontSize": "14px", "color": "hsl(var(--foreground))" } } },
                    { "id": "pro-f4", "type": "text", "props": { "content": "✓ Custom integrations" }, "style": { "typography": { "fontSize": "14px", "color": "hsl(var(--foreground))" } } }
                  ]
                },
                {
                  "id": "pro-cta",
                  "type": "button",
                  "props": { "content": "Start Free Trial", "variant": "default" },
                  "style": {
                    "spacing": { "padding": { "top": 12, "right": 24, "bottom": 12, "left": 24 } },
                    "border": { "radius": 8 },
                    "sizing": { "width": "100%" },
                    "background": { "color": "hsl(var(--primary))" },
                    "typography": { "color": "hsl(var(--primary-foreground))", "fontWeight": "600" }
                  }
                }
              ]
            },
            {
              "id": "enterprise-tier",
              "type": "div",
              "props": {},
              "style": {
                "layout": { "display": "flex", "flexDirection": "column", "gap": 24 },
                "spacing": { "padding": 32 },
                "sizing": { "width": "320px" },
                "background": { "color": "hsl(var(--card))" },
                "border": { "width": 1, "style": "solid", "color": "hsl(var(--border))", "radius": 16 }
              },
              "children": [
                {
                  "id": "ent-name",
                  "type": "heading",
                  "props": { "content": "Enterprise", "tag": "h3" },
                  "style": { "typography": { "fontSize": "24px", "fontWeight": "600", "color": "hsl(var(--foreground))" } }
                },
                {
                  "id": "ent-price",
                  "type": "text",
                  "props": { "content": "Custom" },
                  "style": { "typography": { "fontSize": "48px", "fontWeight": "700", "color": "hsl(var(--foreground))" } }
                },
                {
                  "id": "ent-description",
                  "type": "text",
                  "props": { "content": "For large organizations with custom needs" },
                  "style": { "typography": { "fontSize": "16px", "color": "hsl(var(--muted-foreground))" } }
                },
                {
                  "id": "ent-features",
                  "type": "div",
                  "props": {},
                  "style": { "layout": { "display": "flex", "flexDirection": "column", "gap": 12 } },
                  "children": [
                    { "id": "ent-f1", "type": "text", "props": { "content": "✓ Everything in Pro" }, "style": { "typography": { "fontSize": "14px", "color": "hsl(var(--foreground))" } } },
                    { "id": "ent-f2", "type": "text", "props": { "content": "✓ Dedicated support" }, "style": { "typography": { "fontSize": "14px", "color": "hsl(var(--foreground))" } } },
                    { "id": "ent-f3", "type": "text", "props": { "content": "✓ SLA guarantee" }, "style": { "typography": { "fontSize": "14px", "color": "hsl(var(--foreground))" } } },
                    { "id": "ent-f4", "type": "text", "props": { "content": "✓ Custom deployment" }, "style": { "typography": { "fontSize": "14px", "color": "hsl(var(--foreground))" } } }
                  ]
                },
                {
                  "id": "ent-cta",
                  "type": "button",
                  "props": { "content": "Contact Sales", "variant": "outline" },
                  "style": {
                    "spacing": { "padding": { "top": 12, "right": 24, "bottom": 12, "left": 24 } },
                    "border": { "radius": 8 },
                    "sizing": { "width": "100%" }
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

CONTEXT:
- Available Tables: ${availableTables.map((table: any) => `${table.name}`).join(', ') || 'None'}
- Selected Database: ${selectedDatabase.name || 'None'}

Now generate PROFESSIONAL, BEAUTIFUL components based on the user's request.
Return ONLY valid JSON - no explanations, no markdown, no code blocks.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: `${systemPrompt}\n\nUser request: ${prompt}`
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = await response.json();
    const generatedText = data.content[0].text;

    // Try to extract JSON from the response
    let responseData;
    try {
      // Clean up the response - remove any markdown code blocks
      let jsonText = generatedText.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      
      const parsedData = JSON.parse(jsonText.trim());
      
      // Handle components array format
      if (parsedData.components && Array.isArray(parsedData.components)) {
        responseData = {
          success: true,
          components: parsedData.components.map((comp: any, index: number) => ({
            ...comp,
            id: comp.id || `generated-${Date.now()}-${index}`
          }))
        };
      } else if (Array.isArray(parsedData)) {
        // Direct array of components
        responseData = {
          success: true,
          components: parsedData.map((comp: any, index: number) => ({
            ...comp,
            id: comp.id || `generated-${Date.now()}-${index}`
          }))
        };
      } else {
        // Single component wrapped in object
        responseData = {
          success: true,
          components: [{
            ...parsedData,
            id: parsedData.id || `generated-${Date.now()}`
          }]
        };
      }
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError, 'Raw text:', generatedText.substring(0, 500));
      // If JSON parsing fails, create a basic text component
      responseData = {
        success: true,
        components: [{
          id: `generated-${Date.now()}`,
          type: 'text',
          props: {
            content: 'Failed to generate component. Please try again with a different prompt.'
          },
          style: {
            typography: {
              fontSize: '14px',
              color: 'hsl(var(--muted-foreground))'
            }
          }
        }]
      };
    }

    return new Response(JSON.stringify({
      ...responseData,
      rawResponse: generatedText 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-app-component function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
