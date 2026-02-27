// Clipboard parser for Webflow, Figma, and Framer paste data

export type ClipboardSourceType = 'webflow' | 'figma' | 'framer' | 'html' | 'unknown';

export interface ParsedClipboardData {
  source: ClipboardSourceType;
  rawData: string;
  parsed: WebflowData | FigmaData | FramerData | HTMLData | null;
  isValid: boolean;
  error?: string;
}

// Webflow XscpData structure
export interface WebflowNode {
  _id: string;
  type: string;
  tag?: string;
  classes?: string[];
  children?: string[];
  data?: {
    text?: boolean | string;
    tag?: string;
    img?: { id: string };
    link?: { mode: string; url: string };
    attr?: Record<string, string>;
    style?: Record<string, any>;
    [key: string]: any;
  };
  text?: boolean;
  v?: string; // Text content
}

export interface WebflowStyle {
  _id: string;
  name: string;
  styleLess: string;
  variants?: Record<string, { styleLess: string }>;
  children?: string[];
  type?: string;
}

export interface WebflowData {
  type: '@webflow/XscpData';
  payload: {
    nodes: WebflowNode[];
    styles: WebflowStyle[];
  };
}

// Figma paste data structure (simplified)
export interface FigmaData {
  type: 'FIGMA_PASTE';
  nodes: FigmaNode[];
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  fills?: any[];
  strokes?: any[];
  effects?: any[];
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  characters?: string;
  style?: Record<string, any>;
}

// Framer paste data structure
export interface FramerData {
  type: 'FRAMER_PASTE';
  nodes: FramerNode[];
}

export interface FramerNode {
  id: string;
  name?: string;
  componentType?: string;
  props?: Record<string, any>;
  children?: FramerNode[];
  style?: Record<string, any>;
}

// HTML paste data
export interface HTMLData {
  type: 'HTML';
  html: string;
  text?: string;
}

/**
 * Detects the source type from clipboard content
 */
export function detectClipboardSource(content: string): ClipboardSourceType {
  const trimmed = content.trim();
  
  // Check for Webflow XscpData
  if (trimmed.startsWith('{"type":"@webflow/XscpData"') || 
      trimmed.includes('"type":"@webflow/XscpData"')) {
    return 'webflow';
  }
  
  // Check for Figma paste format
  if (trimmed.includes('"FIGMA_PASTE"') || 
      trimmed.includes('"figma:') ||
      (trimmed.startsWith('{') && trimmed.includes('"absoluteBoundingBox"'))) {
    return 'figma';
  }
  
  // Check for Framer paste format
  if (trimmed.includes('"FRAMER_PASTE"') || 
      trimmed.includes('"__framer') ||
      trimmed.includes('"componentType"')) {
    return 'framer';
  }
  
  // Check for HTML
  if (trimmed.startsWith('<') && (
    trimmed.includes('</div>') || 
    trimmed.includes('</section>') ||
    trimmed.includes('</html>') ||
    trimmed.includes('/>') ||
    /<[a-z][\s\S]*>/i.test(trimmed)
  )) {
    return 'html';
  }
  
  return 'unknown';
}

/**
 * Parse Webflow XscpData format
 */
export function parseWebflowData(content: string): WebflowData | null {
  try {
    const data = JSON.parse(content);
    if (data.type === '@webflow/XscpData' && data.payload) {
      return data as WebflowData;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse Figma paste data
 */
export function parseFigmaData(content: string): FigmaData | null {
  try {
    const data = JSON.parse(content);
    // Figma has various formats, try to normalize
    if (data.nodes || data.document || data.children) {
      return {
        type: 'FIGMA_PASTE',
        nodes: data.nodes || data.children || [data.document]
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse Framer paste data
 */
export function parseFramerData(content: string): FramerData | null {
  try {
    const data = JSON.parse(content);
    if (data.nodes || data.children || data.componentType) {
      return {
        type: 'FRAMER_PASTE',
        nodes: data.nodes || data.children || [data]
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse HTML content
 */
export function parseHTMLData(content: string): HTMLData {
  return {
    type: 'HTML',
    html: content,
    text: content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  };
}

/**
 * Main clipboard parser - detects format and parses accordingly
 */
export function parseClipboardContent(content: string): ParsedClipboardData {
  if (!content || !content.trim()) {
    return {
      source: 'unknown',
      rawData: content,
      parsed: null,
      isValid: false,
      error: 'Empty content'
    };
  }

  const source = detectClipboardSource(content);
  
  try {
    switch (source) {
      case 'webflow': {
        const parsed = parseWebflowData(content);
        return {
          source,
          rawData: content,
          parsed,
          isValid: !!parsed,
          error: parsed ? undefined : 'Failed to parse Webflow data'
        };
      }
      
      case 'figma': {
        const parsed = parseFigmaData(content);
        return {
          source,
          rawData: content,
          parsed,
          isValid: !!parsed,
          error: parsed ? undefined : 'Failed to parse Figma data'
        };
      }
      
      case 'framer': {
        const parsed = parseFramerData(content);
        return {
          source,
          rawData: content,
          parsed,
          isValid: !!parsed,
          error: parsed ? undefined : 'Failed to parse Framer data'
        };
      }
      
      case 'html': {
        const parsed = parseHTMLData(content);
        return {
          source,
          rawData: content,
          parsed,
          isValid: true
        };
      }
      
      default:
        return {
          source: 'unknown',
          rawData: content,
          parsed: null,
          isValid: false,
          error: 'Unknown clipboard format'
        };
    }
  } catch (error) {
    return {
      source,
      rawData: content,
      parsed: null,
      isValid: false,
      error: error instanceof Error ? error.message : 'Parse error'
    };
  }
}

/**
 * Read clipboard data with all available formats
 */
export async function readClipboardData(): Promise<{
  text: string | null;
  html: string | null;
  formats: string[];
}> {
  try {
    const clipboardItems = await navigator.clipboard.read();
    const formats: string[] = [];
    let text: string | null = null;
    let html: string | null = null;

    for (const item of clipboardItems) {
      formats.push(...item.types);
      
      if (item.types.includes('text/plain')) {
        const blob = await item.getType('text/plain');
        text = await blob.text();
      }
      
      if (item.types.includes('text/html')) {
        const blob = await item.getType('text/html');
        html = await blob.text();
      }
    }

    return { text, html, formats };
  } catch (error) {
    // Fallback to basic clipboard API
    try {
      const text = await navigator.clipboard.readText();
      return { text, html: null, formats: ['text/plain'] };
    } catch {
      return { text: null, html: null, formats: [] };
    }
  }
}

/**
 * Get summary info about parsed clipboard data
 */
export function getClipboardSummary(data: ParsedClipboardData): {
  nodeCount: number;
  styleCount: number;
  description: string;
} {
  if (!data.parsed || !data.isValid) {
    return { nodeCount: 0, styleCount: 0, description: 'Invalid or empty data' };
  }

  switch (data.source) {
    case 'webflow': {
      const webflow = data.parsed as WebflowData;
      const nodeCount = webflow.payload.nodes?.length || 0;
      const styleCount = webflow.payload.styles?.length || 0;
      return {
        nodeCount,
        styleCount,
        description: `${nodeCount} elements, ${styleCount} styles`
      };
    }
    
    case 'figma': {
      const figma = data.parsed as FigmaData;
      const countNodes = (nodes: FigmaNode[]): number => {
        return nodes.reduce((acc, node) => {
          return acc + 1 + (node.children ? countNodes(node.children) : 0);
        }, 0);
      };
      const nodeCount = countNodes(figma.nodes || []);
      return {
        nodeCount,
        styleCount: 0,
        description: `${nodeCount} layers`
      };
    }
    
    case 'framer': {
      const framer = data.parsed as FramerData;
      const countNodes = (nodes: FramerNode[]): number => {
        return nodes.reduce((acc, node) => {
          return acc + 1 + (node.children ? countNodes(node.children) : 0);
        }, 0);
      };
      const nodeCount = countNodes(framer.nodes || []);
      return {
        nodeCount,
        styleCount: 0,
        description: `${nodeCount} components`
      };
    }
    
    case 'html': {
      const html = data.parsed as HTMLData;
      const tagMatches = html.html.match(/<[a-z][^>]*>/gi) || [];
      return {
        nodeCount: tagMatches.length,
        styleCount: 0,
        description: `HTML with ~${tagMatches.length} elements`
      };
    }
    
    default:
      return { nodeCount: 0, styleCount: 0, description: 'Unknown format' };
  }
}
