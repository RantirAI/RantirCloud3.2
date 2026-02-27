/**
 * AI Property Schema - Single Source of Truth
 * 
 * This file documents the EXACT property formats used by UI controls.
 * The AI system prompt should use these formats directly.
 * The published renderer should expect these formats.
 * 
 * NO TRANSLATION LAYERS NEEDED - AI outputs what the system expects.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SPACING CONTROL FORMAT
// Used by: VisualSpacingEditor.tsx
// ═══════════════════════════════════════════════════════════════════════════════
export interface SpacingValues {
  top: string;      // Numeric string, e.g., "16" (not "16px")
  right: string;
  bottom: string;
  left: string;
  unit: 'px' | 'rem' | 'em' | '%' | 'auto';
}

export interface SpacingControlFormat {
  margin?: SpacingValues;
  padding?: SpacingValues;
}

export const SPACING_SCHEMA = {
  description: "Controls padding and margin with individual side values",
  propertyName: "spacingControl",
  format: {
    padding: { top: "string", right: "string", bottom: "string", left: "string", unit: "px|rem|em|%|auto" },
    margin: { top: "string", right: "string", bottom: "string", left: "string", unit: "px|rem|em|%|auto" }
  },
  examples: [
    // Hero section padding
    { 
      padding: { top: "80", right: "24", bottom: "80", left: "24", unit: "px" },
      margin: { top: "0", right: "auto", bottom: "0", left: "auto", unit: "px" }
    },
    // Card padding
    {
      padding: { top: "24", right: "24", bottom: "24", left: "24", unit: "px" }
    },
    // Button padding
    {
      padding: { top: "12", right: "24", bottom: "12", left: "24", unit: "px" }
    }
  ],
  defaultValue: {
    margin: { top: "0", right: "0", bottom: "0", left: "0", unit: "px" },
    padding: { top: "0", right: "0", bottom: "0", left: "0", unit: "px" }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY FORMAT
// Used by: TypographyControl.tsx
// ═══════════════════════════════════════════════════════════════════════════════
export interface TypographyFormat {
  fontFamily?: string;        // Full font stack, e.g., "Inter, sans-serif"
  fontSize?: string;          // Numeric string without unit, e.g., "16"
  fontWeight?: string;        // String weight, e.g., "400", "600", "700"
  lineHeight?: string;        // Ratio string, e.g., "1.5"
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  letterSpacing?: string;     // Numeric string, e.g., "0", "-0.02"
  color?: string;             // Hex or semantic token, e.g., "#000000" or "hsl(var(--foreground))"
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  textTransform?: 'none' | 'uppercase' | 'capitalize' | 'lowercase';
}

export const TYPOGRAPHY_SCHEMA = {
  description: "Typography settings for text elements",
  propertyName: "typography",
  format: {
    fontFamily: "string (full stack)",
    fontSize: "string (numeric only, no px)",
    fontWeight: "string (100-900)",
    lineHeight: "string (ratio)",
    textAlign: "left|center|right|justify",
    letterSpacing: "string (numeric, can be negative)",
    color: "string (hex or hsl(var(--token)))"
  },
  examples: [
    // Hero heading
    {
      fontFamily: "Inter, sans-serif",
      fontSize: "48",
      fontWeight: "700",
      lineHeight: "1.1",
      textAlign: "center",
      letterSpacing: "-0.02",
      color: "hsl(var(--foreground))"
    },
    // Body text
    {
      fontFamily: "Inter, sans-serif",
      fontSize: "16",
      fontWeight: "400",
      lineHeight: "1.6",
      color: "hsl(var(--muted-foreground))"
    },
    // Button text
    {
      fontSize: "14",
      fontWeight: "500"
    }
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// BORDER FORMAT
// Used by: VisualBorderEditor.tsx
// ═══════════════════════════════════════════════════════════════════════════════
export interface BorderFormat {
  width: string;              // Numeric string, e.g., "1"
  style: 'none' | 'solid' | 'dashed' | 'dotted';
  color: string;              // Hex or semantic token
  unit: 'px' | 'rem' | 'em';
  sides: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
}

export interface BorderRadiusFormat {
  topLeft: string;            // Numeric string, e.g., "8"
  topRight: string;
  bottomRight: string;
  bottomLeft: string;
  unit: 'px' | 'rem' | 'em' | '%';
}

export const BORDER_SCHEMA = {
  description: "Border and border radius settings",
  propertyNames: ["border", "borderRadius"],
  format: {
    border: {
      width: "string (numeric)",
      style: "none|solid|dashed|dotted",
      color: "string (hex or token)",
      unit: "px|rem|em",
      sides: { top: "boolean", right: "boolean", bottom: "boolean", left: "boolean" }
    },
    borderRadius: {
      topLeft: "string (numeric)",
      topRight: "string (numeric)",
      bottomRight: "string (numeric)",
      bottomLeft: "string (numeric)",
      unit: "px|rem|em|%"
    }
  },
  examples: [
    // Card border
    {
      border: {
        width: "1",
        style: "solid",
        color: "hsl(var(--border))",
        unit: "px",
        sides: { top: true, right: true, bottom: true, left: true }
      },
      borderRadius: { topLeft: "12", topRight: "12", bottomRight: "12", bottomLeft: "12", unit: "px" }
    },
    // Button rounded
    {
      borderRadius: { topLeft: "8", topRight: "8", bottomRight: "8", bottomLeft: "8", unit: "px" }
    },
    // Pill shape
    {
      borderRadius: { topLeft: "9999", topRight: "9999", bottomRight: "9999", bottomLeft: "9999", unit: "px" }
    }
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// BACKGROUND COLOR FORMAT
// Used by: ColorAdvancedPicker.tsx
// ═══════════════════════════════════════════════════════════════════════════════
export interface BackgroundColorFormat {
  type: 'solid' | 'gradient';
  value: string;              // Hex for solid, gradient CSS string for gradient
  opacity?: number;           // 0-100
}

export const BACKGROUND_SCHEMA = {
  description: "Background color with solid or gradient support",
  propertyName: "backgroundColor",
  format: {
    type: "solid|gradient",
    value: "string (hex for solid, CSS gradient string for gradient)",
    opacity: "number (0-100, optional)"
  },
  examples: [
    // Solid color
    { type: "solid", value: "#ffffff", opacity: 100 },
    // Solid with transparency
    { type: "solid", value: "#000000", opacity: 50 },
    // Gradient
    { type: "gradient", value: "linear-gradient(135deg, #0d9488 0%, #3b82f6 100%)" }
  ],
  alternativeFormats: {
    // Direct gradient string property
    backgroundGradient: "string (CSS gradient)",
    backgroundLayerOrder: ["gradient", "fill"]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT FORMAT
// Flat properties on component props
// ═══════════════════════════════════════════════════════════════════════════════
export const LAYOUT_SCHEMA = {
  description: "Layout properties - stored FLAT on props (not nested)",
  propertyNames: ["display", "flexDirection", "justifyContent", "alignItems", "flexWrap", "gap", "gridTemplateColumns", "gridTemplateRows"],
  format: {
    display: "flex|grid|block|inline|none",
    flexDirection: "row|column|row-reverse|column-reverse",
    justifyContent: "flex-start|center|flex-end|space-between|space-around|space-evenly",
    alignItems: "flex-start|center|flex-end|stretch|baseline",
    flexWrap: "nowrap|wrap|wrap-reverse",
    gap: "string (with unit, e.g., '16px' or '24')",
    gridTemplateColumns: "string (e.g., 'repeat(3, 1fr)')",
    gridTemplateRows: "string"
  },
  examples: [
    // Flex column centered
    { display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "24" },
    // Grid 3 columns
    { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24" },
    // Flex row with gap
    { display: "flex", flexDirection: "row", alignItems: "center", gap: "16" }
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// SIZING FORMAT
// ═══════════════════════════════════════════════════════════════════════════════
export const SIZING_SCHEMA = {
  description: "Width, height, min/max constraints",
  propertyNames: ["width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight"],
  format: {
    width: "string (e.g., '100%', 'auto', '300px', 'fit-content')",
    height: "string",
    minWidth: "string",
    minHeight: "string (e.g., '70vh')",
    maxWidth: "string (e.g., '1200px')",
    maxHeight: "string"
  },
  examples: [
    // Full width with max
    { width: "100%", maxWidth: "1200px" },
    // Hero section
    { width: "100%", minHeight: "70vh" },
    // Fixed size image
    { width: "200px", height: "200px" }
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOX SHADOW FORMAT
// Used by: effects/BoxShadowEditor.tsx
// ═══════════════════════════════════════════════════════════════════════════════
export interface BoxShadowItem {
  enabled: boolean;
  type?: 'outer' | 'inner';   // inner = inset
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;              // rgba format for transparency
}

export const BOX_SHADOW_SCHEMA = {
  description: "Multiple box shadows",
  propertyName: "boxShadows",
  format: {
    enabled: "boolean",
    type: "outer|inner",
    x: "number (px)",
    y: "number (px)",
    blur: "number (px)",
    spread: "number (px)",
    color: "string (rgba for transparency)"
  },
  examples: [
    // Subtle elevation
    [{ enabled: true, type: "outer", x: 0, y: 4, blur: 24, spread: -4, color: "rgba(0,0,0,0.1)" }],
    // Strong shadow
    [{ enabled: true, type: "outer", x: 0, y: 8, blur: 32, spread: 0, color: "rgba(0,0,0,0.15)" }]
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSIVE OVERRIDES FORMAT
// ═══════════════════════════════════════════════════════════════════════════════
export const RESPONSIVE_SCHEMA = {
  description: "Breakpoint-specific style overrides",
  propertyNames: ["tabletStyles", "mobileStyles"],
  breakpoints: {
    tablet: "max-width: 991px",
    mobile: "max-width: 767px"
  },
  format: {
    tabletStyles: "object (same structure as props)",
    mobileStyles: "object (same structure as props)"
  },
  examples: [
    // Responsive grid
    {
      gridTemplateColumns: "repeat(3, 1fr)",
      tabletStyles: { gridTemplateColumns: "repeat(2, 1fr)" },
      mobileStyles: { gridTemplateColumns: "1fr" }
    },
    // Responsive typography
    {
      typography: { fontSize: "48" },
      tabletStyles: { typography: { fontSize: "36" } },
      mobileStyles: { typography: { fontSize: "28" } }
    }
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE COMPONENT PROPS TEMPLATE
// This is what AI should output for each component
// ═══════════════════════════════════════════════════════════════════════════════
export const COMPONENT_PROPS_TEMPLATE = `
COMPONENT STRUCTURE - USE THIS EXACT FORMAT:

{
  "id": "semantic-id-name",          // Descriptive ID like "hero-section", "nav-logo", "cta-button"
  "type": "section",                  // Valid component type
  "props": {
    // === LAYOUT (flat on props) ===
    "display": "flex",
    "flexDirection": "column",
    "justifyContent": "center",
    "alignItems": "center",
    "gap": "24",
    
    // === SPACING (spacingControl object) ===
    "spacingControl": {
      "padding": { "top": "80", "right": "24", "bottom": "80", "left": "24", "unit": "px" },
      "margin": { "top": "0", "right": "auto", "bottom": "0", "left": "auto", "unit": "px" }
    },
    
    // === SIZING (flat on props) ===
    "width": "100%",
    "maxWidth": "1200px",
    "minHeight": "70vh",
    
    // === TYPOGRAPHY (typography object) ===
    "typography": {
      "fontFamily": "Inter, sans-serif",
      "fontSize": "48",
      "fontWeight": "700",
      "lineHeight": "1.1",
      "textAlign": "center",
      "letterSpacing": "-0.02",
      "color": "hsl(var(--foreground))"
    },
    
    // === BACKGROUND COLOR (backgroundColor object) ===
    "backgroundColor": {
      "type": "solid",
      "value": "#1a1a2e",
      "opacity": 100
    },
    // OR for gradients:
    "backgroundGradient": "linear-gradient(135deg, #0d9488 0%, #3b82f6 100%)",
    "backgroundLayerOrder": ["gradient", "fill"],
    
    // === BORDER (border object) ===
    "border": {
      "width": "1",
      "style": "solid",
      "color": "hsl(var(--border))",
      "unit": "px",
      "sides": { "top": true, "right": true, "bottom": true, "left": true }
    },
    "borderRadius": {
      "topLeft": "16",
      "topRight": "16",
      "bottomRight": "16",
      "bottomLeft": "16",
      "unit": "px"
    },
    
    // === BOX SHADOW (array) ===
    "boxShadows": [
      {
        "enabled": true,
        "type": "outer",
        "x": 0,
        "y": 4,
        "blur": 24,
        "spread": -4,
        "color": "rgba(0,0,0,0.1)"
      }
    ],
    
    // === RESPONSIVE OVERRIDES ===
    "tabletStyles": {
      "typography": { "fontSize": "36" },
      "spacingControl": {
        "padding": { "top": "48", "right": "16", "bottom": "48", "left": "16", "unit": "px" }
      }
    },
    "mobileStyles": {
      "typography": { "fontSize": "28" },
      "spacingControl": {
        "padding": { "top": "32", "right": "12", "bottom": "32", "left": "12", "unit": "px" }
      }
    },
    
    // === CLASS ASSIGNMENT ===
    "appliedClasses": ["hero-section"]
  },
  "children": []
}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Generate AI System Prompt Section
// ═══════════════════════════════════════════════════════════════════════════════
export function generatePropertySchemaForAI(): string {
  return `
═══════════════════════════════════════════════════════════════════════════════
CRITICAL: COMPONENT PROPS FORMAT - USE EXACTLY AS SHOWN
═══════════════════════════════════════════════════════════════════════════════

The App Builder uses a SPECIFIC property format. You MUST output components in this exact structure.
DO NOT invent your own format. DO NOT nest styles differently. Use this EXACTLY.

${COMPONENT_PROPS_TEMPLATE}

═══════════════════════════════════════════════════════════════════════════════
PROPERTY REFERENCE
═══════════════════════════════════════════════════════════════════════════════

SPACING (spacingControl):
- Values are STRINGS without units (unit is separate field)
- Example: { "top": "80", "right": "24", "bottom": "80", "left": "24", "unit": "px" }
- NOT: { "top": 80, "right": 24 } ← WRONG (missing unit, wrong type)
- NOT: { "top": "80px" } ← WRONG (unit in value)

TYPOGRAPHY (typography object):
- fontSize is STRING without 'px': "48" not "48px" and not 48
- fontWeight is STRING: "700" not 700
- lineHeight is STRING ratio: "1.5" not 1.5
- color uses semantic tokens: "hsl(var(--foreground))" or hex "#000000"

LAYOUT (flat on props, not nested):
- display, flexDirection, justifyContent, alignItems, gap are FLAT on props
- NOT nested in a "layout" object
- CORRECT: "props": { "display": "flex", "gap": "24" }
- WRONG: "props": { "layout": { "display": "flex" } }

SIZING (flat on props):
- width, height, minWidth, maxWidth etc. are FLAT on props
- Values include units: "100%", "1200px", "70vh"
- NOT nested in a "sizing" object

BACKGROUND (backgroundColor object):
- Use { "type": "solid", "value": "#hex", "opacity": 100 } for solid colors
- Use "backgroundGradient": "linear-gradient(...)" for gradients
- NOT: "background": { "color": "#hex" } ← WRONG format

BORDER (border object):
- width is STRING: "1" not 1
- Includes sides object for which sides have border
- borderRadius is SEPARATE object with topLeft, topRight, bottomRight, bottomLeft

RESPONSIVE (tabletStyles, mobileStyles):
- Use same property structure inside these objects
- Include typography, spacingControl as needed
- Breakpoints: tablet < 992px, mobile < 768px
`;
}
