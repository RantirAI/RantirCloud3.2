import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useVariableStore } from '@/stores/variableStore';
import { useClassStore } from '@/stores/classStore';
import { useAISidebarStore } from '@/stores/aiSidebarStore';
import { AppComponent, ComponentType } from '@/types/appBuilder';
import { toast } from 'sonner';
import { designTokenService, DesignToken, ButtonPreset } from '@/services/designTokenService';
import { 
  repairFeatureCardsInTree, 
  repairProductCardsInTree, 
  resetFeatureIndices, 
  resetProductIndices,
  repairFooterInTree,
  resetFooterIndices,
  repairNavbarInTree,
  resetNavbarIndices
} from '@/lib/layoutRepairs';
import { generateStyleHash } from '@/lib/autoClassSystem';
import { setIsAIBuilding, setAIBuildStep, addAICompletedStep, clearAIBuildProgress, setAITotalSections, setAINextSectionName } from '@/lib/aiBuildState';

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC CLASS NAME NORMALIZATION (matches edge function)
// ═══════════════════════════════════════════════════════════════════════════════

// Semantic names that should be PRESERVED (not over-normalized)
const PRESERVE_SEMANTIC_NAMES = new Set([
  // Text variants
  'body-text', 'hero-text', 'card-description', 'footer-text', 'nav-text',
  'testimonial-text', 'feature-text', 'section-text',
  // Heading variants  
  'card-title', 'hero-title', 'section-title', 'feature-title', 'footer-title',
  'nav-title', 'testimonial-title', 'pricing-title',
  // Button variants
  'hero-button', 'cta-button', 'nav-button', 'footer-button', 'primary-button',
  // Card variants
  'feature-card', 'testimonial-card', 'pricing-card', 'product-card', 'team-card',
  // Link variants
  'footer-link', 'nav-link', 'card-link',
  // Container variants
  'hero-container', 'card-container', 'grid-container', 'nav-container',
]);

const CLASS_NAME_MAPPINGS: Record<string, string> = {
  // Typography - normalize to size-based names
  'page-title': 'heading-xl',
  'hero-headline': 'heading-xl',
  'main-title': 'heading-xl',
  'features-title': 'heading-lg',
  'testimonials-title': 'heading-lg',
  'about-title': 'heading-lg',
  'faq-title': 'heading-lg',
  'contact-title': 'heading-lg',
  'product-title': 'heading-md',
  'team-title': 'heading-md',
  'section-subtitle': 'body-lg',
  'hero-subtitle': 'body-lg',
  'card-text': 'body-base',
  'description-text': 'body-base',
  'small-text': 'body-sm',
  'caption-text': 'body-sm',
  'badge-text': 'label',
  
  // Buttons
  'main-button': 'btn-primary',
  'secondary-button': 'btn-secondary',
  'outline-button': 'btn-secondary',
  'ghost-button': 'btn-ghost',
  'link-button': 'btn-link',
  
  // Cards
  'card-base': 'card',
  'card-primary': 'card',
  'content-card': 'card',
  'project-card': 'card',
  
  // Layout
  'card-grid': 'flex-row',
  'features-grid': 'flex-row',
  'products-grid': 'flex-row',
  'testimonials-grid': 'flex-row',
  
  // Fallback/sanitized bare words - CRITICAL for catching stripped IDs
  'sanitized': 'element',
  'fallback': 'element',
  'element': 'element',
  'text': 'body-text',
  'heading': 'heading',
  'div': 'container',
  'section': 'section',
  'container': 'container',
  'button': 'primary-button',
  'image': 'img',
  'link': 'link',
  'icon': 'icon',
};

/**
 * Derive a semantic class name based on component type and parent context
 * This ensures we get meaningful names like "hero-text" instead of "sanitized"
 */
function deriveSemanticClassName(
  componentId: string,
  componentType: string,
  parentId?: string
): string {
  // Extract context from parent ID (hero, features, testimonials, footer, nav, card, cta)
  const parentContext = parentId?.match(/(hero|features|testimonials|footer|nav|card|cta|pricing|about|contact|faq|trust|team|stats|blog|gallery|badge|partner|accordion)/i)?.[1]?.toLowerCase();
  
  // Type-specific derivation with context awareness
  switch (componentType) {
    case 'text':
      if (parentContext === 'hero') return 'hero-text';
      if (parentContext === 'card') return 'card-description';
      if (parentContext === 'testimonials') return 'testimonial-text';
      if (parentContext === 'footer') return 'footer-text';
      if (parentContext === 'features') return 'feature-text';
      if (parentContext === 'nav') return 'nav-text';
      return 'body-text';
      
    case 'heading':
      if (parentContext === 'hero') return 'hero-title';
      if (parentContext === 'card') return 'card-title';
      if (parentContext === 'features') return 'section-title';
      if (parentContext === 'testimonials') return 'section-title';
      if (parentContext === 'pricing') return 'pricing-title';
      if (parentContext === 'footer') return 'footer-title';
      if (parentContext === 'nav') return 'nav-title';
      return 'heading';
      
    case 'button':
      if (parentContext === 'hero') return 'hero-button';
      if (parentContext === 'cta') return 'cta-button';
      if (parentContext === 'nav') return 'nav-button';
      if (parentContext === 'footer') return 'footer-button';
      return 'primary-button';
      
    case 'container':
    case 'div':
      if (componentId.includes('card')) return 'card';
      if (componentId.includes('grid')) return 'grid-container';
      if (parentContext === 'hero') return 'hero-container';
      if (parentContext === 'nav') return 'nav-container';
      if (parentContext === 'faq') return 'faq-container';
      if (parentContext === 'trust') return 'trust-container';
      if (parentContext === 'team') return 'team-container';
      if (parentContext === 'stats') return 'stats-container';
      if (parentContext === 'footer') return 'footer-container';
      if (parentContext === 'pricing') return 'pricing-container';
      if (parentContext === 'testimonials') return 'testimonial-container';
      if (parentContext === 'blog') return 'blog-container';
      if (parentContext === 'gallery') return 'gallery-container';
      if (parentContext === 'features') return 'features-container';
      if (parentContext === 'about') return 'about-container';
      if (parentContext === 'contact') return 'contact-container';
      return 'container';
      
    case 'link':
      if (parentContext === 'footer') return 'footer-link';
      if (parentContext === 'nav') return 'nav-link';
      if (parentContext === 'card') return 'card-link';
      return 'link';
      
    case 'section':
      return 'section';
      
    case 'image':
      return 'img';
      
    case 'icon':
      return 'icon';
      
    default:
      return componentType || 'element';
  }
}

/**
 * Build a lightweight neighbor context from the page's existing sections (excluding the one being edited).
 * This gives the AI enough style information to match colors/typography without sending full trees.
 */
function buildNeighborContext(components: AppComponent[], targetIndex: number) {
  return components
    .filter((_, i) => i !== targetIndex)
    .slice(0, 4) // max 4 neighbors to keep payload small
    .map(c => ({
      id: c.id,
      type: c.type,
      backgroundColor: c.props?.backgroundColor,
      backgroundGradient: c.props?.backgroundGradient,
      primaryColor: c.props?.color,
      fontFamily: c.props?.fontFamily,
      appliedClasses: (c.props?.appliedClasses || []).slice(0, 3),
    }));
}

function normalizeClassName(className: string): string {
  if (!className) return className;
  
  // FIRST: Check if it's already a good semantic name - preserve it!
  if (PRESERVE_SEMANTIC_NAMES.has(className)) {
    return className;
  }
  
  // CRITICAL: Catch sanitized-* and fallback patterns with alphanumeric UUID suffixes
  // The UUID generator uses 8-char alphanumeric slices, NOT 10+ digits
  // Pattern matches: sanitized-a1b2c3d4, element-b2c3d4e5, text-xxxx, heading-xxxx, fallback-xxxx
  const sanitizedPattern = /^(sanitized|fallback|element|text|heading|div|section|container|button|image|link|icon)[-_]?[a-z0-9]{6,}/i;
  const timestampSuffixPattern = /[-_]\d{10,}[-_]?[a-z0-9]*$/i;
  const randomSuffixPattern = /[-_][a-z0-9]{6,}$/;
  
  if (sanitizedPattern.test(className)) {
    // Extract component type and return semantic name
    // Handle patterns like: sanitized-xxxx, fallback-xxxx, element-xxxx, text-xxxx, heading-xxxx
    const typeMatch = className.match(/^(sanitized[-_]?)?(fallback[-_]?)?(element[-_]?)?(text|heading|div|section|container|button|image|link|icon)/i);
    if (typeMatch) {
      const componentType = (typeMatch[4] || '').toLowerCase();
      switch (componentType) {
        case 'heading': return 'heading';
        case 'text': return 'body-text';
        case 'button': return 'primary-button';
        case 'container':
        case 'div': return 'container';
        case 'section': return 'section';
        case 'image': return 'img';
        case 'link': return 'link';
        case 'icon': return 'icon';
        default: return 'element';
      }
    }
    // If pattern matched but no component type extracted, return 'element'
    return 'element';
  }
  
  // Clean up timestamp-based suffixes from any class name
  if (timestampSuffixPattern.test(className)) {
    const cleanedName = className.replace(timestampSuffixPattern, '');
    // Check if cleaned name is semantic before recursing
    if (PRESERVE_SEMANTIC_NAMES.has(cleanedName)) {
      return cleanedName;
    }
    // Recurse to apply further normalization
    return normalizeClassName(cleanedName);
  }
  
  // Clean up random hash suffixes - but check PRESERVE first, then CLASS_NAME_MAPPINGS
  if (randomSuffixPattern.test(className) && className.length > 15) {
    const cleanedName = className.replace(randomSuffixPattern, '');
    // Check if cleaned name is semantic
    if (PRESERVE_SEMANTIC_NAMES.has(cleanedName)) {
      return cleanedName;
    }
    // Check if the cleaned name has a direct mapping before recursing
    if (CLASS_NAME_MAPPINGS[cleanedName]) {
      return CLASS_NAME_MAPPINGS[cleanedName];
    }
    return normalizeClassName(cleanedName);
  }
  
  // Check direct mapping
  if (CLASS_NAME_MAPPINGS[className]) {
    return CLASS_NAME_MAPPINGS[className];
  }
  
  // Strip numeric suffixes and check again
  const baseNameMatch = className.match(/^(.+?)-?\d+$/);
  if (baseNameMatch) {
    const baseName = baseNameMatch[1];
    if (PRESERVE_SEMANTIC_NAMES.has(baseName)) {
      return baseName;
    }
    if (CLASS_NAME_MAPPINGS[baseName]) {
      return CLASS_NAME_MAPPINGS[baseName];
    }
  }
  
  // Pattern-based normalization - but return semantic names, not generic ones
  const patterns: Array<{pattern: RegExp, replacement: string}> = [
    { pattern: /^(hero|page|main)[-_]?(title|heading|headline)[-_]?\d*$/i, replacement: 'hero-title' },
    { pattern: /^(section|features|about|testimonials|pricing|cta|faq|contact)[-_]?(title|heading)[-_]?\d*$/i, replacement: 'section-title' },
    { pattern: /^(card|feature|product|team|testimonial|project)[-_]?(title|heading)[-_]?\d*$/i, replacement: 'card-title' },
    { pattern: /^(hero|section)[-_]?(subtitle|description|text)[-_]?\d*$/i, replacement: 'hero-text' },
    { pattern: /^(card|feature|product|testimonial|body)[-_]?(text|description|content)[-_]?\d*$/i, replacement: 'card-description' },
    { pattern: /^(primary|main|cta|hero)[-_]?(button|btn)[-_]?\d*$/i, replacement: 'hero-button' },
    { pattern: /^(secondary|outline)[-_]?(button|btn)[-_]?\d*$/i, replacement: 'nav-button' },
    { pattern: /^(feature|testimonial|pricing|team|product|project|content)[-_]?(card)[-_]?\d*$/i, replacement: 'feature-card' },
    { pattern: /^(card|feature|product|testimonial|team)[-_]?(grid|row|container)[-_]?\d*$/i, replacement: 'grid-container' },
  ];
  
  for (const {pattern, replacement} of patterns) {
    if (pattern.test(className)) {
      return replacement;
    }
  }
  
  return className;
}

export interface BuildStep {
  type: 'progress' | 'variable' | 'component' | 'flow' | 'binding' | 'class';
  status: 'pending' | 'building' | 'complete' | 'error';
  message: string;
  data?: any;
}

interface AIBuildResponse {
  success: boolean;
  steps?: Array<{
    type: string;
    message?: string;
    data?: any;
  }>;
  summary?: string;
  error?: string;
  action?: string;
  message?: string;
}

// Valid component types from ComponentPalette
const VALID_COMPONENT_TYPES = new Set([
  'div', 'section', 'container', 'spacer', 'separator',
  'text', 'heading', 'blockquote', 'code', 'codeblock', 'link', 'icon',
  'form-wrapper', 'form-wizard', 'button', 'input', 'password-input', 'textarea',
  'select', 'checkbox', 'checkbox-group', 'radio', 'radio-group', 'switch',
  'slider', 'form', 'label', 'combobox', 'input-otp', 'datepicker',
  'image', 'video',
  'datatable', 'list', 'data-display', 'chart', 'badge', 'alert', 'progress', 'calendar',
  'nav-horizontal', 'nav-vertical', 'sidebar', 'dropdown-menu', 'tabs', 'accordion',
  'theme-toggle', 'carousel'
]);

export function useAIAppBuildStream() {
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildSteps, setBuildSteps] = useState<BuildStep[]>([]);
  const [currentStep, setCurrentStep] = useState<BuildStep | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const usedIdsRef = useRef<Set<string>>(new Set());
  const canvasWidthRef = useRef<number>(1140);

  const { addComponent, currentProject, currentPage, updateComponent } = useAppBuilderStore();
  const { createVariable, setVariable, currentProjectId } = useVariableStore();

  // Generate unique ID - SEMANTIC naming when possible
  const generateId = (prefix: string) => {
    // Use short sequential counter instead of timestamps for cleaner IDs
    const counter = Math.floor(Math.random() * 999) + 1;
    return `${prefix}-${counter}`;
  };
  
  // Check if an ID is semantic (meaningful) vs generic (random/timestamped)
  const isSemanticId = (id: string): boolean => {
    if (!id) return false;
    
    // Generic patterns to reject
    const genericPatterns = [
      /^div-\d+$/,           // div-1, div-123
      /^section-\d+$/,       // section-1, section-2
      /^heading-\d+$/,       // heading-66
      /^text-\d+$/,          // text-145
      /^button-\d+$/,        // button-59
      /^container-\d+$/,     // container-123
      /^component-\d+$/,     // component-456
      /-\d{10,}$/,           // ends with timestamp like -1737123456789
      /-[a-z0-9]{8,}$/,      // ends with random hash like -x8f9k2abc
    ];
    
    for (const pattern of genericPatterns) {
      if (pattern.test(id)) return false;
    }
    
    // Semantic patterns to accept
    const semanticPatterns = [
      /^(nav|hero|about|skills|projects|testimonials|contact|footer|features|pricing|cta|faq)-section$/,
      /^(nav|hero|about|skills|projects|testimonials|footer|feature|pricing|stats|social)-.*$/,
      /^(project|skill|testimonial|feature|stat|team|pricing)-card-\d+$/,
      /^(project|skill|testimonial|feature|team)-\d+-(title|description|thumbnail|avatar|icon|content|link|quote|author|role|name)$/,
      /^(cta|nav|contact|hero)-\w+$/,
      /^social-(github|linkedin|twitter|dribbble|instagram|youtube)$/,
    ];
    
    // If it matches any semantic pattern, it's semantic
    for (const pattern of semanticPatterns) {
      if (pattern.test(id)) return true;
    }
    
    // If it contains meaningful words and doesn't match generic, consider it semantic
    const meaningfulWords = ['nav', 'hero', 'about', 'skills', 'projects', 'testimonial', 
      'contact', 'footer', 'header', 'content', 'grid', 'row', 'card', 'title', 
      'description', 'link', 'button', 'cta', 'social', 'avatar', 'logo', 'brand'];
    
    const hasSemanticWord = meaningfulWords.some(word => id.toLowerCase().includes(word));
    return hasSemanticWord;
  };
  
  // Validate and return semantic ID, logging if generic was detected
  const validateSemanticId = (id: string, type: string): string => {
    if (!isSemanticId(id)) {
      console.warn(`[AI Build] Generic ID detected: "${id}" (type: ${type}). AI should provide semantic IDs.`);
    }
    return id;
  };

  const collectComponentIds = (components: any[], target: Set<string>) => {
    if (!Array.isArray(components)) return;
    for (const comp of components) {
      if (comp?.id) target.add(String(comp.id));
      if (Array.isArray(comp?.children)) collectComponentIds(comp.children, target);
    }
  };

  const ensureUniqueId = (candidateId: string): string => {
    const used = usedIdsRef.current;
    if (!used.has(candidateId)) {
      used.add(candidateId);
      return candidateId;
    }

    let i = 2;
    let next = `${candidateId}-${i}`;
    while (used.has(next)) {
      i += 1;
      next = `${candidateId}-${i}`;
    }
    used.add(next);
    console.warn(`[AI Build] Duplicate ID "${candidateId}" detected. Renamed to "${next}".`);
    return next;
  };

  // Ensure class names are unique by checking against existing classes AND used IDs
  const ensureUniqueClassName = (candidateName: string): string => {
    const { classes } = useClassStore.getState();
    const existingNames = new Set(classes.map(c => c.name));
    const usedIds = usedIdsRef.current;
    
    // Check both ID registry and class store
    if (!usedIds.has(candidateName) && !existingNames.has(candidateName)) {
      usedIds.add(candidateName);
      return candidateName;
    }

    let i = 2;
    let next = `${candidateName}-${i}`;
    while (usedIds.has(next) || existingNames.has(next)) {
      i += 1;
      next = `${candidateName}-${i}`;
    }
    usedIds.add(next);
    console.warn(`[AI Build] Class name conflict: "${candidateName}" → "${next}"`);
    return next;
  };

  // Style hash registry for class deduplication during AI build
  // Uses semantic keys: "category::styleHash" to prevent cross-type deduplication
  const styleHashToClassRef = useRef<Map<string, string>>(new Map());

  // Map component types to semantic categories for type-aware deduplication
  const getSemanticCategory = (componentType: string): string => {
    switch (componentType) {
      case 'heading': return 'heading';
      case 'text': return 'text';
      case 'button': return 'button';
      case 'link': return 'link';
      case 'image': return 'image';
      case 'avatar': return 'image';
      case 'container':
      case 'div':
      case 'section': return 'container';
      case 'icon': return 'icon';
      case 'input':
      case 'textarea':
      case 'select': return 'form';
      default: return 'element';
    }
  };

  // Detect semantic category from existing class name patterns
  const getClassSemanticCategory = (className: string): string => {
    // Text-type classes (order matters - check 'text' before 'title')
    if (/description|body|caption|subtitle|paragraph|text(?!-)|\.text/i.test(className) && 
        !/title|heading|headline/i.test(className)) {
      return 'text';
    }
    // Heading-type classes
    if (/title|heading|headline/i.test(className)) {
      return 'heading';
    }
    // Button-type classes
    if (/button|btn|cta/i.test(className)) {
      return 'button';
    }
    // Link-type classes
    if (/link/i.test(className) && !/button|btn/i.test(className)) {
      return 'link';
    }
    // Image-type classes
    if (/img|image|avatar|logo|icon/i.test(className)) {
      return 'image';
    }
    // Container-type classes
    if (/card|container|section|grid|row|col|wrapper|box/i.test(className)) {
      return 'container';
    }
    // Form-type classes
    if (/input|field|form/i.test(className)) {
      return 'form';
    }
    return 'element';
  };

  // Find existing class with identical styles AND matching semantic category (for class reuse)
  const findClassWithIdenticalStyles = (
    styles: Record<string, any>,
    componentType: string  // Required for semantic matching
  ): string | null => {
    const { classes } = useClassStore.getState();
    const semanticCategory = getSemanticCategory(componentType);
    const styleHash = generateStyleHash(styles);
    const semanticHash = `${semanticCategory}::${styleHash}`;
    
    // Check our local cache first (for classes created in this build session)
    if (styleHashToClassRef.current.has(semanticHash)) {
      const cachedClassName = styleHashToClassRef.current.get(semanticHash)!;
      console.log(`[AI Build] Style hash match (cached): ${cachedClassName} for ${componentType}`);
      return cachedClassName;
    }
    
    // Check existing classes in store - ONLY match same semantic category
    for (const cls of classes) {
      if (!cls.isAutoClass) continue; // Only match auto-generated classes
      
      // Extract category from the existing class name
      const classCategory = getClassSemanticCategory(cls.name);
      if (classCategory !== semanticCategory) {
        continue; // Skip classes from different semantic categories
      }
      
      const clsHash = generateStyleHash(cls.styles);
      if (clsHash === styleHash) {
        console.log(`[AI Build] Style hash match (store): ${cls.name} for ${componentType} (both ${semanticCategory})`);
        styleHashToClassRef.current.set(semanticHash, cls.name);
        return cls.name;
      }
    }
    
    return null;
  };

  // Extract style-related properties from component props for class creation
  const extractStylePropsFromComponent = (props: Record<string, any>): Record<string, any> => {
    if (!props) return {};
    
    const styleKeys = [
      // Layout
      'display', 'flexDirection', 'justifyContent', 'alignItems', 'flexWrap', 'gap',
      'gridTemplateColumns', 'gridTemplateRows', 'gridGap', 'gridColumn', 'gridRow',
      // Sizing
      'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
      // Spacing
      'spacingControl', 'padding', 'margin',
      // Typography (flat AND nested object — renderer reads both paths)
      'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing',
      'textAlign', 'color', 'textTransform', 'typography',
      // Background
      'backgroundColor', 'backgroundGradient', 'background',
      // Border
      'border', 'borderRadius', 'borderWidth', 'borderStyle', 'borderColor',
      // Effects
      'boxShadow', 'opacity', 'backdropFilter', 'overflow',
      // Positioning (limited)
      'position', 'zIndex',
      // Responsive
      'tabletStyles', 'mobileStyles'
    ];
    
    const result: Record<string, any> = {};
    
    for (const key of styleKeys) {
      if (props[key] !== undefined && props[key] !== null && props[key] !== '') {
        result[key] = props[key];
      }
    }
    
    return result;
  };

  // Sync a component's styles to the class store with context-aware naming
  const syncComponentToClass = async (
    component: AppComponent, 
    enableDedup: boolean = true,
    parentId?: string  // Parent context for semantic naming
  ): Promise<void> => {
    const { addClass, classes } = useClassStore.getState();
    
    // Get the primary class name - prioritize explicit appliedClasses
    let rawClassName = component.props?.appliedClasses?.[0] || 
                       (component.classNames && component.classNames[0]);
    
    // Check if we need to derive a semantic name (no class or generic fallback class)
    const needsSemanticDerivation = !rawClassName || 
      /^(sanitized|element|fallback)[-_]/i.test(rawClassName) ||
      rawClassName === component.id;
    
    if (needsSemanticDerivation) {
      // Derive semantic class name from component type + parent context
      rawClassName = deriveSemanticClassName(component.id, component.type, parentId);
      console.log(`[AI Build] Derived semantic class: "${rawClassName}" for ${component.type} (parent: ${parentId || 'none'})`);
    }
    
    if (!rawClassName) return;
    
    // Normalize the class name (will preserve good semantic names)
    let primaryClassName = normalizeClassName(rawClassName);
    
    // Update the component's appliedClasses if we changed the name
    if (primaryClassName !== (component.props?.appliedClasses?.[0] || component.id) && component.props) {
      component.props.appliedClasses = [primaryClassName];
      console.log(`[AI Build] Applied class name: "${primaryClassName}" to component ${component.id}`);
    }
    
    // Check if class already exists - compare styles before reusing
    const existingClass = classes.find(c => c.name === primaryClassName);
    if (existingClass) {
      const styleProps = extractStylePropsFromComponent(component.props || {});
      const existingHash = generateStyleHash(existingClass.styles);
      const newHash = generateStyleHash(styleProps);
      
      if (existingHash === newHash || Object.keys(styleProps).length === 0) {
        // Styles match or no styles - safe to reuse
        console.log(`[AI Build] Class "${primaryClassName}" exists with matching styles, reusing`);
        if (component.props) {
          component.props.appliedClasses = [primaryClassName];
        }
        return;
      }
      
      // Styles differ - find next available numbered name or matching variant
      let suffix = 2;
      let uniqueName = `${primaryClassName}-${suffix}`;
      while (classes.find(c => c.name === uniqueName)) {
        const variant = classes.find(c => c.name === uniqueName);
        if (variant && generateStyleHash(variant.styles) === newHash) {
          console.log(`[AI Build] Found existing variant "${uniqueName}" with matching styles, reusing`);
          if (component.props) {
            component.props.appliedClasses = [uniqueName];
          }
          return;
        }
        suffix++;
        uniqueName = `${primaryClassName}-${suffix}`;
      }
      console.log(`[AI Build] Class "${primaryClassName}" exists with DIFFERENT styles, creating unique "${uniqueName}"`);
      primaryClassName = uniqueName;
      if (component.props) {
        component.props.appliedClasses = [primaryClassName];
      }
      // Fall through to class creation below
    }
    
    // Extract style properties from component props
    const styleProps = extractStylePropsFromComponent(component.props || {});
    
    // Only create class if there are actual styles
    if (Object.keys(styleProps).length > 0) {
      // Check for duplicate styles - reuse existing class if found (TYPE-AWARE)
      if (enableDedup) {
        const existingClassWithSameStyles = findClassWithIdenticalStyles(styleProps, component.type);
        if (existingClassWithSameStyles && existingClassWithSameStyles !== primaryClassName) {
          // Double-check semantic categories match before reusing
          const existingCategory = getClassSemanticCategory(existingClassWithSameStyles);
          const componentCategory = getSemanticCategory(component.type);
          
          if (existingCategory === componentCategory) {
            // Safe to reuse - same semantic category
            console.log(`[AI Build] Deduplicating: "${primaryClassName}" → reusing "${existingClassWithSameStyles}" (both ${componentCategory})`);
            if (component.props) {
              component.props.appliedClasses = [existingClassWithSameStyles];
            }
            // Don't create new class - we're reusing an existing one
            return;
          } else {
            console.log(`[AI Build] Skipping dedup: "${existingClassWithSameStyles}" is ${existingCategory}, need ${componentCategory}`);
          }
        }
      }
      
      try {
        await addClass(primaryClassName, styleProps, true); // true = isAutoClass
        console.log(`[AI Build] Created class from component: ${primaryClassName}`);
        
        // Cache the hash with semantic key for future dedup
        const semanticCategory = getSemanticCategory(component.type);
        const semanticHash = `${semanticCategory}::${generateStyleHash(styleProps)}`;
        styleHashToClassRef.current.set(semanticHash, primaryClassName);
      } catch (err) {
        console.warn(`[AI Build] Failed to create class "${primaryClassName}":`, err);
      }
    } else {
      // Even without styles, update the component to use the semantic class name
      if (component.props) {
        component.props.appliedClasses = [primaryClassName];
      }
    }
  };

  // Recursively sync all components and their children to classes, passing parent context
  const syncAllComponentClasses = async (
    components: AppComponent[],
    parentId?: string  // Parent context for semantic class derivation
  ): Promise<void> => {
    for (const component of components) {
      await syncComponentToClass(component, true, parentId);
      if (component.children?.length) {
        // Pass current component's ID as parent context for children
        await syncAllComponentClasses(component.children, component.id);
      }
    }
  };

  // Process image prompts in components - generate AI images
  const processImagePrompts = async (component: AppComponent): Promise<void> => {
    // Debug logging for all image components
    if (component.type === 'image') {
      console.log(`[Image Generation] Image component found:`, {
        id: component.id,
        hasImagePrompt: !!component.props?.imagePrompt,
        hasSrc: !!component.props?.src,
        imagePrompt: component.props?.imagePrompt,
        src: component.props?.src
      });
    }
    
    // Check if this is an image component with an imagePrompt
    if (component.type === 'image' && component.props?.imagePrompt && !component.props?.src) {
      try {
        console.log('[Image Generation] Generating AI image for prompt:', component.props.imagePrompt);
        
        // Get current user for storage upload
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data, error } = await supabase.functions.invoke('generate-document-image', {
          body: { 
            prompt: component.props.imagePrompt,
            userId: user?.id,           // Enable storage upload
            databaseId: 'app-builder'   // Use app-assets bucket
          }
        });
        
        if (data?.imageUrl && !error) {
          component.props.src = data.imageUrl;
          console.log('[Image Generation] AI image generated and stored:', data.imageUrl);
        } else {
          console.error('[Image Generation] Image generation failed:', error, data);
          component.props.src = '/placeholder.svg';
        }
      } catch (err) {
        console.error('[Image Generation] Error generating image:', err);
        component.props.src = '/placeholder.svg';
      }
    }
    
    // Process children recursively
    if (component.children && Array.isArray(component.children)) {
      for (const child of component.children) {
        await processImagePrompts(child);
      }
    }
  };

  // Validate and normalize component type
  const normalizeComponentType = (type: string): ComponentType => {
    const normalized = type.toLowerCase().replace(/_/g, '-');
    if (VALID_COMPONENT_TYPES.has(normalized)) {
      return normalized as ComponentType;
    }
    // Fallback mappings
    const mappings: Record<string, ComponentType> = {
      'row': 'div',
      'column': 'div',
      'box': 'div',
      'card': 'container',
      'modal': 'container',
      'dialog': 'container',
      'header': 'container',
      'footer': 'container',
      'h1': 'heading',
      'h2': 'heading',
      'h3': 'heading',
      'paragraph': 'text',
      'p': 'text',
      'span': 'text',
      'img': 'image',
      'btn': 'button',
    };
    return mappings[normalized] || 'container';
  };

  // Process responsive overrides from AI styles
  const processResponsiveOverrides = (style: any): Record<string, any> => {
    if (!style?.responsiveOverrides) return {};
    
    const overrides: Record<string, any> = {};
    
    // Process tablet overrides
    if (style.responsiveOverrides.tablet) {
      overrides.tabletStyles = flattenStyleToPropsInternal(style.responsiveOverrides.tablet);
    }
    
    // Process mobile overrides
    if (style.responsiveOverrides.mobile) {
      overrides.mobileStyles = flattenStyleToPropsInternal(style.responsiveOverrides.mobile);
    }
    
    return overrides;
  };
  
  // Internal function to flatten style without responsive processing (prevents recursion)
  const flattenStyleToPropsInternal = (style: any): Record<string, any> => {
    if (!style || typeof style !== 'object') return {};
    
    const flat: Record<string, any> = {};
    
    // Layout properties
    if (style.layout) {
      if (style.layout.display) flat.display = style.layout.display;
      if (style.layout.flexDirection) flat.flexDirection = style.layout.flexDirection;
      if (style.layout.justifyContent) flat.justifyContent = style.layout.justifyContent;
      if (style.layout.alignItems) flat.alignItems = style.layout.alignItems;
      if (style.layout.flexWrap) flat.flexWrap = style.layout.flexWrap;
      if (style.layout.gap !== undefined) flat.gap = style.layout.gap;
      if (style.layout.gridTemplateColumns) flat.gridTemplateColumns = style.layout.gridTemplateColumns;
      if (style.layout.gridTemplateRows) flat.gridTemplateRows = style.layout.gridTemplateRows;
    }
    
    // Direct grid properties
    if (style.gridTemplateColumns) flat.gridTemplateColumns = style.gridTemplateColumns;
    if (style.gridTemplateRows) flat.gridTemplateRows = style.gridTemplateRows;
    
    // Sizing
    if (style.sizing) {
      if (style.sizing.width) flat.width = style.sizing.width;
      if (style.sizing.height) flat.height = style.sizing.height;
      if (style.sizing.maxWidth) flat.maxWidth = style.sizing.maxWidth;
    }
    
    // Spacing (simplified for responsive)
    if (style.spacing?.padding) {
      const p = style.spacing.padding;
      if (typeof p === 'object') {
        flat.spacingControl = { padding: { top: p.top || 0, right: p.right || 0, bottom: p.bottom || 0, left: p.left || 0, unit: 'px' } };
      } else if (typeof p === 'number') {
        flat.spacingControl = { padding: { top: p, right: p, bottom: p, left: p, unit: 'px' } };
      }
    }
    
    // Typography - CRITICAL: Include fontFamily for responsive breakpoints
    if (style.typography) {
      if (style.typography.fontSize) flat.fontSize = style.typography.fontSize;
      if (style.typography.fontWeight) flat.fontWeight = style.typography.fontWeight;
      if (style.typography.textAlign) flat.textAlign = style.typography.textAlign;
      if (style.typography.fontFamily) flat.fontFamily = style.typography.fontFamily;
      if (style.typography.lineHeight) flat.lineHeight = style.typography.lineHeight;
      if (style.typography.letterSpacing) flat.letterSpacing = style.typography.letterSpacing;
      if (style.typography.color) flat.color = style.typography.color;
    }
    
    // Preserve stateStyles in responsive overrides
    if (style.stateStyles) flat.stateStyles = style.stateStyles;
    
    return flat;
  };

  // Helper to normalize semantic color tokens
  // CRITICAL FIX: Preserve semantic tokens for theme compatibility - DON'T flatten to hex
  const normalizeColorValue = (color: string): string => {
    if (!color) return 'hsl(var(--foreground))';
    
    // If already hex or rgb, return as-is
    if (color.startsWith('#') || color.startsWith('rgb')) return color;
    
    // PRESERVE semantic tokens - they work with light/dark themes
    if (color.includes('var(--')) return color;
    
    // Map keyword colors to semantic tokens (better theme support)
    const keywordMap: Record<string, string> = {
      'white': 'hsl(var(--background))',
      'black': 'hsl(var(--foreground))',
      'transparent': 'transparent',
    };
    
    return keywordMap[color.toLowerCase()] || color;
  };

  // Convert AI gradient object to CSS string
  const convertGradientToCSS = (gradient: any): string => {
    // Already a CSS string - return as-is
    if (!gradient || typeof gradient === 'string') {
      return gradient || '';
    }
    
    // Not an object - invalid
    if (typeof gradient !== 'object') return '';
    
    const { type, stops, angle = 180 } = gradient;
    
    // Validate required properties
    if (!type || !Array.isArray(stops) || stops.length === 0) return '';
    
    // Sort stops by position and build CSS string
    const sortedStops = [...stops].sort((a, b) => (a.position || 0) - (b.position || 0));
    const stopsStr = sortedStops
      .map(s => `${s.color} ${s.position}%`)
      .join(', ');
    
    switch (type) {
      case 'linear':
        return `linear-gradient(${angle}deg, ${stopsStr})`;
      case 'radial':
        return `radial-gradient(circle, ${stopsStr})`;
      case 'conic':
        return `conic-gradient(from ${angle}deg, ${stopsStr})`;
      default:
        return '';
    }
  };

  // Flatten nested AI style object to props in formats ComponentRenderer expects
  // ALSO handles the NEW correct format where AI outputs props directly
  const flattenStyleToProps = (style: any): Record<string, any> => {
    if (!style || typeof style !== 'object') return {};
    
    const flat: Record<string, any> = {};
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // NEW: If AI outputs props in the CORRECT format, pass them through directly
    // This avoids lossy translation when AI already knows the right format
    // ═══════════════════════════════════════════════════════════════════════════════
    
    // Direct passthrough for correctly formatted props
    if (style.spacingControl) flat.spacingControl = style.spacingControl;
    if (style.typography && !style.typography.fontSize?.includes?.('px')) {
      // Typography in correct format (fontSize as string without px)
      flat.typography = style.typography;
    }
    if (style.border?.sides) flat.border = style.border; // Correct format has sides
    if (style.borderRadius?.topLeft !== undefined) flat.borderRadius = style.borderRadius; // Correct format
    if (style.boxShadows && Array.isArray(style.boxShadows)) flat.boxShadows = style.boxShadows;
    if (style.backgroundColor?.type) flat.backgroundColor = style.backgroundColor; // Correct format has type
    if (style.backgroundGradient && typeof style.backgroundGradient === 'string') {
      flat.backgroundGradient = style.backgroundGradient;
      flat.backgroundLayerOrder = style.backgroundLayerOrder || ['gradient', 'fill'];
    }
    if (style.tabletStyles) flat.tabletStyles = style.tabletStyles;
    if (style.mobileStyles) flat.mobileStyles = style.mobileStyles;
    
    // Direct flat layout props (these work in both old and new format)
    if (style.display) flat.display = style.display;
    if (style.flexDirection) flat.flexDirection = style.flexDirection;
    if (style.justifyContent) flat.justifyContent = style.justifyContent;
    if (style.alignItems) flat.alignItems = style.alignItems;
    if (style.flexWrap) flat.flexWrap = style.flexWrap;
    if (style.gap !== undefined) flat.gap = String(style.gap);
    if (style.gridTemplateColumns) flat.gridTemplateColumns = style.gridTemplateColumns;
    if (style.gridTemplateRows) flat.gridTemplateRows = style.gridTemplateRows;
    
    // Direct flat sizing props
    if (style.width) flat.width = style.width;
    if (style.height) flat.height = style.height;
    if (style.minWidth) flat.minWidth = style.minWidth;
    if (style.minHeight) flat.minHeight = style.minHeight;
    if (style.maxWidth) flat.maxWidth = style.maxWidth;
    if (style.maxHeight) flat.maxHeight = style.maxHeight;
    
    // Process responsive overrides first
    const responsiveOverrides = processResponsiveOverrides(style);
    if (responsiveOverrides.tabletStyles) flat.tabletStyles = responsiveOverrides.tabletStyles;
    if (responsiveOverrides.mobileStyles) flat.mobileStyles = responsiveOverrides.mobileStyles;
    
    // Layout properties - flat props work directly
    if (style.layout) {
      if (style.layout.display) flat.display = style.layout.display;
      if (style.layout.flexDirection) flat.flexDirection = style.layout.flexDirection;
      if (style.layout.justifyContent) flat.justifyContent = style.layout.justifyContent;
      if (style.layout.alignItems) flat.alignItems = style.layout.alignItems;
      if (style.layout.flexWrap) flat.flexWrap = style.layout.flexWrap;
      // Normalize gap to string for panel compatibility
      if (style.layout.gap !== undefined) flat.gap = String(style.layout.gap);
      // Grid properties
      if (style.layout.gridTemplateColumns) flat.gridTemplateColumns = style.layout.gridTemplateColumns;
      if (style.layout.gridTemplateRows) flat.gridTemplateRows = style.layout.gridTemplateRows;
      if (style.layout.gridColumn) flat.gridColumn = style.layout.gridColumn;
      if (style.layout.gridRow) flat.gridRow = style.layout.gridRow;
    }
    
    // Root-level grid properties (if not nested under layout)
    if (style.gridTemplateColumns) flat.gridTemplateColumns = style.gridTemplateColumns;
    if (style.gridTemplateRows) flat.gridTemplateRows = style.gridTemplateRows;
    
    // Sizing properties - flat props work directly
    if (style.sizing) {
      if (style.sizing.width) flat.width = style.sizing.width;
      if (style.sizing.height) flat.height = style.sizing.height;
      if (style.sizing.minWidth) flat.minWidth = style.sizing.minWidth;
      if (style.sizing.minHeight) flat.minHeight = style.sizing.minHeight;
      if (style.sizing.maxWidth) flat.maxWidth = style.sizing.maxWidth;
      if (style.sizing.maxHeight) flat.maxHeight = style.sizing.maxHeight;
    }
    
    // SPACING - Convert to spacingControl format expected by getSpacingStyles()
    if (style.spacing) {
      const spacing = style.spacing;
      const spacingControl: any = {};
      
      // Handle padding
      if (spacing.padding !== undefined) {
        if (typeof spacing.padding === 'number' || typeof spacing.padding === 'string') {
          const val = typeof spacing.padding === 'string' ? parseInt(spacing.padding) || 0 : spacing.padding;
          spacingControl.padding = { top: val, right: val, bottom: val, left: val, unit: 'px' };
        } else if (typeof spacing.padding === 'object') {
          spacingControl.padding = {
            top: spacing.padding.top || 0,
            right: spacing.padding.right || 0,
            bottom: spacing.padding.bottom || 0,
            left: spacing.padding.left || 0,
            unit: spacing.padding.unit || 'px'
          };
        }
      }
      
      // Handle margin
      if (spacing.margin !== undefined) {
        if (spacing.margin === 'auto') {
          spacingControl.margin = { top: 'auto', right: 'auto', bottom: 'auto', left: 'auto', unit: 'px' };
        } else if (typeof spacing.margin === 'number' || typeof spacing.margin === 'string') {
          const val = typeof spacing.margin === 'string' ? parseInt(spacing.margin) || 0 : spacing.margin;
          spacingControl.margin = { top: val, right: val, bottom: val, left: val, unit: 'px' };
        } else if (typeof spacing.margin === 'object') {
          spacingControl.margin = {
            top: spacing.margin.top || 0,
            right: spacing.margin.right || 0,
            bottom: spacing.margin.bottom || 0,
            left: spacing.margin.left || 0,
            unit: spacing.margin.unit || 'px'
          };
        }
      }
      
      if (Object.keys(spacingControl).length > 0) {
        flat.spacingControl = spacingControl;
      }
    }
    
    // Typography properties - NORMALIZED for panel compatibility
    if (style.typography) {
      // Strip 'px' from fontSize (panel expects number string like "36" not "36px")
      if (style.typography.fontSize) {
        const size = String(style.typography.fontSize).replace('px', '');
        flat.fontSize = size;
      }
      if (style.typography.fontWeight) flat.fontWeight = String(style.typography.fontWeight);
      if (style.typography.fontFamily) flat.fontFamily = style.typography.fontFamily;
      if (style.typography.textAlign) flat.textAlign = style.typography.textAlign;
      // Normalize color from semantic tokens to hex
      if (style.typography.color) flat.color = normalizeColorValue(style.typography.color);
      if (style.typography.lineHeight) flat.lineHeight = String(style.typography.lineHeight);
      // Strip 'px' from letterSpacing
      if (style.typography.letterSpacing) {
        const spacing = String(style.typography.letterSpacing).replace('px', '');
        flat.letterSpacing = spacing;
      }
    }
    
    // Background properties - flat backgroundColor works directly
    if (style.background) {
      if (style.background.color) flat.backgroundColor = style.background.color;
      if (style.background.image) flat.backgroundImage = style.background.image;
      // Support gradient backgrounds from AI - CONVERT TO CSS STRING
      if (style.background.gradient) {
        const cssGradient = convertGradientToCSS(style.background.gradient);
        if (cssGradient) {
          flat.backgroundGradient = cssGradient;
          flat.backgroundLayerOrder = ['gradient', 'fill'];
        }
      }
    }
    
    // Root-level background properties (direct)
    if (style.backgroundColor) flat.backgroundColor = style.backgroundColor;
    if (style.backgroundGradient) {
      const cssGradient = convertGradientToCSS(style.backgroundGradient);
      if (cssGradient) {
        flat.backgroundGradient = cssGradient;
        flat.backgroundLayerOrder = ['gradient', 'fill'];
      }
    }
    if (style.backgroundImage) flat.backgroundImage = style.backgroundImage;
    
    // BORDER - Convert to structured format expected by getNewBorderStyles()
    if (style.border) {
      const b = style.border;
      // Only apply border if width is explicitly set and > 0
      const borderWidth = b.width ?? 1;
      flat.border = {
        width: borderWidth,
        style: b.style || 'solid',
        color: b.color || 'hsl(var(--border))',
        unit: 'px',
        // IMPORTANT: sides must be true for borders to render
        sides: { top: true, right: true, bottom: true, left: true }
      };
      
      // Border radius as separate structured object
      if (b.radius !== undefined) {
        const radius = typeof b.radius === 'number' ? b.radius : parseInt(b.radius) || 0;
        flat.borderRadius = {
          topLeft: radius,
          topRight: radius,
          bottomRight: radius,
          bottomLeft: radius,
          unit: 'px'
        };
      }
    }
    
    // Handle standalone borderRadius (when not part of border object)
    if (style.borderRadius !== undefined && !flat.borderRadius) {
      // GAP 2 FIX: Skip if already a structured object (server already normalized it)
      if (typeof style.borderRadius === 'object' && style.borderRadius !== null && 'topLeft' in style.borderRadius) {
        flat.borderRadius = style.borderRadius;
      } else {
        const radius = typeof style.borderRadius === 'number' ? style.borderRadius : parseInt(style.borderRadius) || 0;
        flat.borderRadius = {
          topLeft: radius,
          topRight: radius,
          bottomRight: radius,
          bottomLeft: radius,
          unit: 'px'
        };
      }
    }
    
    // SHADOW - Convert to boxShadows array format expected by getEffectsStyles()
    if (style.shadow) {
      const s = style.shadow;
      flat.boxShadows = [{
        id: 'shadow-1',
        enabled: true,
        type: 'drop-shadow',
        x: s.x || s.offsetX || 0,
        y: s.y || s.offsetY || 0,
        blur: s.blur || 0,
        spread: s.spread || 0,
        color: s.color || 'rgba(0,0,0,0.1)'
      }];
    }
    
    // Backdrop filter (glass-morphism effects)
    if (style.backdropFilter) flat.backdropFilter = style.backdropFilter;
    
    // Full effects object support (filter, blur, etc.)
    if (style.effects) {
      if (style.effects.filter) flat.filter = style.effects.filter;
      if (style.effects.backdropFilter) flat.backdropFilter = style.effects.backdropFilter;
      if (style.effects.opacity !== undefined) flat.opacity = style.effects.opacity;
    }
    if (style.filter) flat.filter = style.filter;
    
    // Position properties - handle both nested and flat formats
    if (style.position) {
      if (typeof style.position === 'object') {
        // Nested format: { position: 'absolute', top: '10px', ... }
        if (style.position.position) flat.position = style.position.position;
        if (style.position.top !== undefined) flat.top = style.position.top;
        if (style.position.right !== undefined) flat.right = style.position.right;
        if (style.position.bottom !== undefined) flat.bottom = style.position.bottom;
        if (style.position.left !== undefined) flat.left = style.position.left;
        if (style.position.zIndex !== undefined) flat.zIndex = style.position.zIndex;
      } else {
        // Flat format: position: 'absolute'
        flat.position = style.position;
      }
    }
    // Also check root-level position props (fallback)
    if (style.top !== undefined && flat.top === undefined) flat.top = style.top;
    if (style.right !== undefined && flat.right === undefined) flat.right = style.right;
    if (style.bottom !== undefined && flat.bottom === undefined) flat.bottom = style.bottom;
    if (style.left !== undefined && flat.left === undefined) flat.left = style.left;
    if (style.zIndex !== undefined && flat.zIndex === undefined) flat.zIndex = style.zIndex;
    
    // Opacity
    if (style.opacity !== undefined) flat.opacity = style.opacity;
    
    // Overflow
    if (style.overflow) flat.overflow = style.overflow;
    
    // Hover states - pass through for ComponentRenderer to inject as CSS
    if (style.transition) flat.transition = style.transition;
    if (style.hoverTransform) flat.hoverTransform = style.hoverTransform;
    if (style.hoverShadow) flat.hoverShadow = style.hoverShadow;
    if (style.cursor) flat.cursor = style.cursor;
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // CRITICAL FIX: Process stateStyles (hover, pressed, focused) - MUST NOT BE STRIPPED
    // These enable buttons to lift, cards to elevate, inputs to show focus rings
    // ═══════════════════════════════════════════════════════════════════════════════
    if (style.stateStyles) {
      flat.stateStyles = style.stateStyles;
    }
    
    // Transform (direct)
    if (style.transform) flat.transform = style.transform;
    
    // Pointer events (for decorative elements that shouldn't capture clicks)
    if (style.effects?.pointerEvents) flat.pointerEvents = style.effects.pointerEvents;
    if (style.pointerEvents) flat.pointerEvents = style.pointerEvents;
    
    return flat;
  };

  // Validate and sanitize section styles to prevent overlap
  // Helper function to check if a background is dark
  // Enhanced color detection for better contrast validation
  const isDarkBackground = (bgValue: string | object | undefined): boolean => {
    if (!bgValue) return false;
    
    // Handle gradient object - convert to CSS string for analysis
    if (typeof bgValue === 'object') {
      const gradientStr = convertGradientToCSS(bgValue);
      if (!gradientStr) return false;
      return isDarkBackground(gradientStr); // Recurse with string
    }
    
    if (typeof bgValue !== 'string') return false;
    
    const bg = bgValue.toLowerCase();
    
    // Check for dark gradients (most gradients in hero sections are dark)
    if (bg.includes('linear-gradient')) {
      // Check if gradient contains dark colors
      const hasDarkColors = /#[0-3][0-9a-f]{5}/i.test(bg) || 
        /rgb\s*\(\s*[0-9]{1,2}\s*,/i.test(bg) ||
        bg.includes('slate') || bg.includes('gray') || bg.includes('zinc') ||
        bg.includes('dark') || bg.includes('navy') || bg.includes('black');
      if (hasDarkColors) return true;
    }
    
    // Hex colors - check if first digit is 0-4 (dark range)
    const hexMatch = bg.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16);
      const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16);
      const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance < 0.5;
    }
    
    // RGB/RGBA - check luminance
    const rgbMatch = bg.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance < 0.5;
    }
    
    // HSL - check lightness percentage (< 50% is dark)
    const hslMatch = bg.match(/hsl\s*\([^)]*,\s*[^,]+,\s*(\d+)%/i);
    if (hslMatch) {
      const lightness = parseInt(hslMatch[1]);
      return lightness < 50;
    }
    
    // Semantic token checks - assume dark for certain tokens
    if (bg.includes('var(--background)') || bg.includes('var(--card)')) {
      // These could be light or dark depending on theme, assume light for safety
      return false;
    }
    if (bg.includes('var(--primary)') || bg.includes('var(--secondary)')) {
      // Primary colors are often darker, treat as dark
      return true;
    }
    
    // Keyword checks
    return bg.includes('slate') || bg.includes('gray-9') || bg.includes('zinc-9') ||
      bg.includes('gray-8') || bg.includes('zinc-8') ||
      bg.includes('navy') || bg.includes('dark') || bg.includes('black') ||
      bg.includes('#1') || bg.includes('#2') || bg.includes('#0');
  };

  // Helper function to check if a color is light/white
  const isLightColor = (colorValue: string | undefined): boolean => {
    if (!colorValue) return false;
    const c = colorValue.toLowerCase();
    
    // Direct light color checks
    if (c.includes('white') || c === '#fff' || c === '#ffffff') return true;
    
    // Hex check for light colors
    const hexMatch = c.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16);
      const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16);
      const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.7;
    }
    
    // RGB check for light colors
    const rgbMatch = c.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.7;
    }
    
    // HSL check for light colors (lightness > 70%)
    const hslMatch = c.match(/hsl\s*\([^)]*,\s*[^,]+,\s*(\d+)%/i);
    if (hslMatch) {
      const lightness = parseInt(hslMatch[1]);
      return lightness > 70;
    }
    
    // rgba with high alpha and white
    if (c.includes('rgba(255') || c.includes('rgb(255')) return true;
    if (c.includes('100%)') && c.includes('hsl(')) return true;
    
    return false;
  };

  // NEW: Check if text color is dark
  const isDarkColor = (colorValue: string | undefined): boolean => {
    if (!colorValue) return false;
    const c = colorValue.toLowerCase();
    
    // Direct dark color checks
    if (c.includes('black') || c === '#000' || c === '#000000') return true;
    if (c.includes('var(--foreground)')) return true; // Foreground is typically dark in light mode
    
    // Hex check for dark colors
    const hexMatch = c.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16);
      const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16);
      const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance < 0.3;
    }
    
    // RGB check for dark colors
    const rgbMatch = c.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance < 0.3;
    }
    
    // HSL check for dark colors (lightness < 30%)
    const hslMatch = c.match(/hsl\s*\([^)]*,\s*[^,]+,\s*(\d+)%/i);
    if (hslMatch) {
      const lightness = parseInt(hslMatch[1]);
      return lightness < 30;
    }
    
    return false;
  };

  // Helper to check if background is light
  const isLightBackground = (bgValue: string | object | undefined): boolean => {
    if (!bgValue) return true; // Assume light if no background
    
    // Handle gradient object - convert to CSS string for analysis
    if (typeof bgValue === 'object') {
      const gradientStr = convertGradientToCSS(bgValue);
      if (!gradientStr) return true;
      return isLightBackground(gradientStr); // Recurse with string
    }
    
    if (typeof bgValue !== 'string') return true;
    
    const bg = bgValue.toLowerCase();
    
    // Semantic tokens that are typically light
    if (bg.includes('var(--background)') || bg.includes('var(--card)') || 
        bg.includes('var(--muted)')) {
      return true;
    }
    
    // Hex check
    const hexMatch = bg.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16);
      const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16);
      const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.7;
    }
    
    // HSL check
    const hslMatch = bg.match(/hsl\s*\([^)]*,\s*[^,]+,\s*(\d+)%/i);
    if (hslMatch) {
      const lightness = parseInt(hslMatch[1]);
      return lightness > 70;
    }
    
    if (bg.includes('white') || bg.includes('#fff')) return true;
    
    return false;
  };

  // NEW: Check if color is a mid-tone semantic token that needs contrast validation
  const isMutedOrGrayText = (colorValue: string | undefined): boolean => {
    if (!colorValue) return false;
    const c = colorValue.toLowerCase();
    
    // Semantic tokens that are mid-gray (problematic on dark backgrounds)
    if (c.includes('muted-foreground') || c.includes('muted)')) return true;
    if (c.includes('secondary-foreground')) return true;
    
    // Hex mid-gray range
    const hexMatch = c.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16);
      const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16);
      const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.3 && luminance < 0.7; // Mid-range
    }
    
    return false;
  };

  const parseSizeToPx = (value: any): number | null => {
    if (value == null) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed === 'auto') return null;
    const match = trimmed.match(/(-?\d+(?:\.\d+)?)/);
    if (!match) return null;
    const n = Number(match[1]);
    return Number.isFinite(n) ? n : null;
  };

  const validateSectionStyles = (compData: any, parentHasDarkBg: boolean = false, parentHasLightBg: boolean = true): any => {
    // CRITICAL GUARD: Prevent crash if compData is a primitive (string, number, etc.)
    // This is the root cause of "Cannot create property 'props' on string" errors
    if (!compData || typeof compData !== 'object') {
      console.warn('[AI Build] validateSectionStyles received primitive:', typeof compData, String(compData).slice(0, 50));
      // Convert primitive to a text component to preserve content
      if (typeof compData === 'string' || typeof compData === 'number' || typeof compData === 'boolean') {
        const textValue = String(compData).trim();
        if (!textValue) return null;
        return {
          id: `sanitized-text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'text',
          props: { content: textValue },
          style: {},
          children: []
        };
      }
      return null;
    }
    
    // Ensure props is an object before any mutation
    if (typeof compData.props !== 'object' || compData.props === null) {
      const oldProps = compData.props;
      compData.props = {};
      // If props was a string, try to preserve it as content
      if (typeof oldProps === 'string') {
        if (['heading', 'text', 'label', 'paragraph', 'span'].includes(compData.type)) {
          compData.props.content = oldProps;
        } else if (['button', 'link'].includes(compData.type)) {
          compData.props.text = oldProps;
        }
        console.warn(`[AI Build] Fixed non-object props for ${compData.id || compData.type}`);
      }
    }
    
    // Ensure children is an array
    if (compData.children !== undefined && !Array.isArray(compData.children)) {
      const oldChildren = compData.children;
      if (typeof oldChildren === 'string' || typeof oldChildren === 'number') {
        // For text-like components, merge into props.content
        if (['heading', 'text', 'label', 'paragraph', 'span'].includes(compData.type) && !compData.props.content) {
          compData.props.content = String(oldChildren);
          compData.children = [];
        } else if (['button', 'link'].includes(compData.type) && !compData.props.text) {
          compData.props.text = String(oldChildren);
          compData.children = [];
        } else {
          // Convert to text child
          compData.children = [{
            id: `text-child-${Date.now()}`,
            type: 'text',
            props: { content: String(oldChildren) },
            style: {},
            children: []
          }];
        }
        console.warn(`[AI Build] Fixed non-array children for ${compData.id || compData.type}`);
      } else {
        compData.children = [];
      }
    }
    
    // Pre-sanitize children array to filter out primitives before any iteration
    if (Array.isArray(compData.children)) {
      compData.children = compData.children
        .map((child: any) => {
          if (child && typeof child === 'object') return child;
          // Convert primitive children to text components
          if (typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean') {
            const textValue = String(child).trim();
            if (!textValue) return null;
            console.warn(`[AI Build] Converting primitive child to text: "${textValue.slice(0, 30)}..."`);
            return {
              id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: 'text',
              props: { content: textValue },
              style: {},
              children: []
            };
          }
          return null;
        })
        .filter(Boolean);
    }
    
    const isSection = compData.type === 'section' || (compData.type === 'div' && compData.id?.includes('section'));

    const props = compData.props;

    const removePositioning = (target: Record<string, any> | undefined) => {
      if (!target) return;
      delete target.position;
      delete target.top;
      delete target.left;
      delete target.right;
      delete target.bottom;
      delete target.zIndex;
    };
    
    // Get background info for this element
    const elementBg = compData.style?.background?.value || 
                      compData.style?.background?.color ||
                      compData.style?.background?.gradient ||
                      compData.props?.backgroundColor || 
                      compData.props?.background;
    
    // Determine background type
    const hasDarkBg = isDarkBackground(elementBg) || (parentHasDarkBg && !isLightBackground(elementBg));
    const hasLightBg = isLightBackground(elementBg) || (parentHasLightBg && !isDarkBackground(elementBg));
    
    if (isSection) {
      const style = compData.style || {};

      // RULE 1: Remove absolute/fixed positioning from sections (style + props)
      if (style.position === 'absolute' || style.position === 'fixed') {
        console.warn(`[AI Build] Removing ${style.position} positioning from section ${compData.id}`);
        removePositioning(style as any);
      }
      if (props.position === 'absolute' || props.position === 'fixed') {
        console.warn(`[AI Build] Removing ${props.position} positioning from section ${compData.id} (props)`);
        removePositioning(props);
      }
      
      // RULE 2: Ensure sections use document flow
      style.sizing = style.sizing || {};
      style.layout = style.layout || {};
      
      // RULE: Sections MUST be full-width (force override any constrained widths)
      style.sizing.width = '100%';
      props.width = '100%';
      
      // Remove any maxWidth constraints from sections (they should span full page)
      delete style.sizing.maxWidth;
      delete props.maxWidth;
      
      // RULE 3: Sections use content-driven height, EXCEPT hero sections which can have minHeight
      const isHeroSection = compData.id?.includes('hero');
      
      if (isHeroSection) {
        // Hero sections can have minHeight for landing page layouts (capped at 70vh)
        if (style.sizing?.minHeight && typeof style.sizing.minHeight === 'string') {
          const vhMatch = style.sizing.minHeight.match(/(\d+)vh/);
          if (vhMatch) {
            const vh = parseInt(vhMatch[1]);
            style.sizing.minHeight = vh > 70 ? '70vh' : style.sizing.minHeight;
            props.minHeight = style.sizing.minHeight;
            console.log(`[AI Build] Preserving hero minHeight: ${style.sizing.minHeight}`);
          }
        }
        // Remove fixed height - let content + minHeight determine actual height
        delete style.sizing.height;
        delete props.height;
        if (props.maxHeight) delete props.maxHeight;
      } else {
        // Non-hero sections: force content-driven height
        if (style.sizing?.minHeight) {
          console.warn(`[AI Build] Removing minHeight from non-hero section ${compData.id}`);
          delete style.sizing.minHeight;
        }
        if (props.minHeight) delete props.minHeight;
        if (props.maxHeight) delete props.maxHeight;
        
        // Force height: auto for non-hero sections
        style.sizing.height = 'auto';
        props.height = 'auto';
      }
      
      // Ensure proper vertical padding - REDUCED to prevent excessive empty space
      if (!style.spacing?.padding) {
        style.spacing = style.spacing || {};
        style.spacing.padding = { top: 60, right: 24, bottom: 60, left: 24 };
      } else if (style.spacing.padding) {
        const padding = style.spacing.padding;
        if (typeof padding === 'object') {
          // Only enforce minimum 40px - allow AI's smaller padding choices
          if ((padding.top || 0) < 40) padding.top = 40;
          if ((padding.bottom || 0) < 40) padding.bottom = 40;
        }
      }

      // Mirror padding into props.spacingControl if missing (renderer reads props)
      const paddingObj = style.spacing?.padding;
      if (paddingObj) {
        const pad = typeof paddingObj === 'object'
          ? {
              top: paddingObj.top || 0,
              right: paddingObj.right || 0,
              bottom: paddingObj.bottom || 0,
              left: paddingObj.left || 0,
              unit: paddingObj.unit || 'px',
            }
          : {
              top: Number(paddingObj) || 0,
              right: Number(paddingObj) || 0,
              bottom: Number(paddingObj) || 0,
              left: Number(paddingObj) || 0,
              unit: 'px',
            };

        props.spacingControl = props.spacingControl || {};
        if (!props.spacingControl.padding) {
          props.spacingControl.padding = pad;
        }
      }
      
      // Hero sections - CONDITIONAL centering (only as fallback if AI didn't specify)
      if (isHeroSection) {
        // GAP 3 FIX: Only enforce split-screen when BOTH children already have explicit width/flexBasis from the AI
        const children = compData.children || [];
        const majorChildren = children.filter((c: any) => c.type === 'div' || c.type === 'image');
        
        if (majorChildren.length === 2) {
          // Check if AI already set explicit widths on children
          const bothHaveWidths = majorChildren.every((child: any) => {
            const childWidth = child.props?.width || child.props?.flexBasis || child.style?.sizing?.width || child.style?.sizing?.flexBasis;
            return childWidth && childWidth !== '100%' && childWidth !== 'auto';
          });
          
          if (bothHaveWidths) {
            // AI intended a split layout — just ensure row direction
            style.layout.display = 'flex';
            style.layout.flexDirection = 'row';
            style.layout.alignItems = style.layout.alignItems || 'stretch';
            props.display = 'flex';
            props.flexDirection = 'row';
            props.alignItems = props.alignItems || 'stretch';
            console.log(`[AI Build] Preserved AI split-screen layout on hero: ${compData.id}`);
          } else {
            // AI didn't set explicit widths — DON'T force 50/50 split, just ensure flex column
            if (!style.layout.display) {
              style.layout.display = 'flex';
              props.display = 'flex';
            }
            if (!style.layout.flexDirection && !compData.props?.flexDirection) {
              style.layout.flexDirection = 'column';
              props.flexDirection = 'column';
            }
            console.log(`[AI Build] Preserved AI hero layout (no forced split): ${compData.id}`);
          }
        } else {
          // Non-split hero: apply centering fallback only if AI didn't specify
          if (!style.layout.justifyContent && !compData.props?.justifyContent) {
            style.layout.justifyContent = 'center';
            props.justifyContent = 'center';
          }
          if (!style.layout.alignItems && !compData.props?.alignItems) {
            style.layout.alignItems = 'center';
            props.alignItems = 'center';
          }
        }
      }
      
      compData.style = style;
    }
    
    // RULE 4: Fix text visibility - ensure proper contrast (BIDIRECTIONAL)
    const isTextElement = ['text', 'heading', 'label', 'paragraph'].includes(compData.type);
    if (isTextElement) {
      // GAP 1 FIX: Also check props.typography.color (flattened location)
      const textColor = compData.style?.typography?.color || compData.props?.typography?.color || compData.props?.color;
      
      // Case 1: Light text on light background → change to dark text
      if (isLightColor(textColor) && hasLightBg && !hasDarkBg) {
        console.warn(`[AI Build] Fixing contrast: ${compData.id} - light text on light bg → dark text`);
        compData.style = compData.style || {};
        compData.style.typography = compData.style.typography || {};
        // GAP 7 FIX: Use concrete dark color instead of platform token
        compData.style.typography.color = '#1a1a2e';
        if (compData.props) {
          compData.props.color = '#1a1a2e';
          if (compData.props.typography) compData.props.typography.color = '#1a1a2e';
        }
      }
      
      // Case 2: Dark text on dark background → change to light text
      if (isDarkColor(textColor) && hasDarkBg && !hasLightBg) {
        console.warn(`[AI Build] Fixing contrast: ${compData.id} - dark text on dark bg → light text`);
        compData.style = compData.style || {};
        compData.style.typography = compData.style.typography || {};
        compData.style.typography.color = 'rgba(255,255,255,0.95)';
        if (compData.props) {
          compData.props.color = 'rgba(255,255,255,0.95)';
        }
      }
      
      // Case 3: No text color specified - apply appropriate default based on background
      if (!textColor) {
        compData.style = compData.style || {};
        compData.style.typography = compData.style.typography || {};
        if (hasDarkBg) {
          compData.style.typography.color = 'rgba(255,255,255,0.95)';
          if (compData.props) { compData.props.color = 'rgba(255,255,255,0.95)'; }
        } else {
          // GAP 7 FIX: Use concrete color instead of platform token
          compData.style.typography.color = '#1a1a2e';
          if (compData.props) { compData.props.color = '#1a1a2e'; }
        }
      }
      
      // Case 4: Muted/gray text on dark background → change to light text
      if (isMutedOrGrayText(textColor) && hasDarkBg) {
        console.warn(`[AI Build] Fixing contrast: ${compData.id} - muted text on dark bg → light text`);
        compData.style = compData.style || {};
        compData.style.typography = compData.style.typography || {};
        compData.style.typography.color = 'rgba(255,255,255,0.85)';
        if (compData.props) {
          compData.props.color = 'rgba(255,255,255,0.85)';
        }
      }

      // Case 5: Muted/gray text on certain problematic light backgrounds → ensure visible
      if (isMutedOrGrayText(textColor) && hasLightBg && !hasDarkBg) {
        const bgStr = String(elementBg || '').toLowerCase();
        const isWarmLightBg = bgStr.includes('f5') || bgStr.includes('f8') || 
                               bgStr.includes('faf') || bgStr.includes('fdf') ||
                               bgStr.includes('cream') || bgStr.includes('beige') ||
                               bgStr.includes('warm') || bgStr.includes('stone');
        if (isWarmLightBg) {
          compData.style = compData.style || {};
          compData.style.typography = compData.style.typography || {};
          compData.style.typography.color = 'hsl(var(--foreground))';
          if (compData.props) {
            compData.props.color = 'hsl(var(--foreground))';
          }
        }
      }
    }
    
    // RULE: Contact Section Text Visibility
    const isContactSection = compData.id && (
      compData.id.includes('contact-section') ||
      compData.id.includes('contact-container') ||
      compData.id.includes('contact-content')
    );

    if (isContactSection && (compData.type === 'section' || compData.type === 'div')) {
      const ensureContactTextVisibility = (child: any) => {
        if (['text', 'heading', 'paragraph', 'label'].includes(child.type)) {
          const childTextColor = child.style?.typography?.color || child.props?.color;
          if (isMutedOrGrayText(childTextColor) || !childTextColor) {
            child.style = child.style || {};
            child.style.typography = child.style.typography || {};
            child.style.typography.color = hasDarkBg 
              ? 'rgba(255,255,255,0.95)' 
              : 'hsl(var(--foreground))';
            child.props = child.props || {};
            child.props.color = child.style.typography.color;
          }
        }
        if (Array.isArray(child.children)) {
          child.children.forEach(ensureContactTextVisibility);
        }
      };
      if (Array.isArray(compData.children)) {
        compData.children.forEach(ensureContactTextVisibility);
      }
      console.log(`[AI Build] Enforced contact section text visibility: ${compData.id}`);
    }

    // RULE 5: Navigation sections MUST be full-width
    const isNavSection = compData.id?.includes('nav-section') || compData.id?.includes('nav-header');
    if (isNavSection) {
      const style = compData.style || {};
      style.sizing = style.sizing || {};
      style.sizing.width = '100%';
      style.layout = style.layout || {};
      style.layout.display = 'flex';
      style.layout.justifyContent = 'center'; // Center the nav-container
      compData.props = compData.props || {};
      compData.props.width = '100%';
      compData.style = style;
      console.log(`[AI Build] Enforced full-width on nav section: ${compData.id}`);
    }
    
    // RULE 5b: nav-horizontal components MUST be full-width with space-between
    if (compData.type === 'nav-horizontal') {
      const style = compData.style || {};
      style.sizing = style.sizing || {};
      style.sizing.width = '100%';
      style.layout = style.layout || {};
      style.layout.display = 'flex';
      style.layout.justifyContent = style.layout.justifyContent || 'space-between';
      style.layout.alignItems = style.layout.alignItems || 'center';
      compData.props = compData.props || {};
      compData.props.width = '100%';
      compData.props.justifyContent = style.layout.justifyContent;
      compData.props.alignItems = style.layout.alignItems;
      compData.style = style;
      console.log(`[AI Build] Enforced full-width layout on nav-horizontal: ${compData.id}`);
    }
    
    // RULE 5c: Fix navigation container horizontal layout with width constraints
    const isNavContainer = compData.id && 
      (compData.id.includes('nav-container') || compData.id.includes('nav-inner') || 
       compData.id.includes('nav-links') ||
       (compData.id.includes('nav') && !compData.id.includes('section') && !compData.id.includes('nav-horizontal')));
    
    if (isNavContainer && compData.type === 'div') {
      const style = compData.style || {};
      style.layout = style.layout || {};
      style.sizing = style.sizing || {};
      
      // Force horizontal layout for nav containers with proper gap
      style.layout.display = 'flex';
      style.layout.flexDirection = 'row';
      style.layout.justifyContent = 'space-between';
      style.layout.alignItems = 'center';
      style.layout.gap = style.layout.gap || 48; // Use 48px gap for nav spacing consistency
      
      // Ensure nav-container takes full width with max constraint
      style.sizing.width = '100%';
      style.sizing.maxWidth = style.sizing.maxWidth || '1200px';
      
      // Prevent nav links from growing/shrinking unevenly
      if (compData.id.includes('nav-links')) {
        style.layout.flexGrow = 0;
        style.layout.flexShrink = 0;
        style.layout.gap = style.layout.gap || 32; // Specific gap for links
      }
      
      compData.style = style;
      compData.props.display = 'flex';
      compData.props.flexDirection = 'row';
      compData.props.justifyContent = 'space-between';
      compData.props.alignItems = 'center';
      compData.props.width = '100%';
      compData.props.maxWidth = style.sizing.maxWidth;
      if (!compData.props.gap) compData.props.gap = '48';
      console.log(`[AI Build] Enforced horizontal layout on nav container: ${compData.id}`);
    }
    
    // RULE 5d: nav-logo must have distinctive styling and right margin for separation
    if (compData.id?.includes('nav-logo')) {
      const style = compData.style || {};
      style.spacing = style.spacing || {};
      style.spacing.marginRight = style.spacing.marginRight || 48;
      style.typography = style.typography || {};
      style.typography.fontWeight = style.typography.fontWeight || '800';
      style.typography.letterSpacing = style.typography.letterSpacing || '0.05em';
      style.typography.textTransform = style.typography.textTransform || 'uppercase';
      compData.style = style;
      compData.props = compData.props || {};
      compData.props.marginRight = style.spacing.marginRight;
      console.log(`[AI Build] Enforced distinctive styling on nav-logo: ${compData.id}`);
    }
    
    // RULE 5b: Navigation action containers (icons, CTAs, right-side elements) must use row layout
    const isNavActionsContainer = compData.id && compData.type === 'div' && (
      compData.id.includes('nav-icons') || 
      compData.id.includes('nav-actions') ||
      compData.id.includes('nav-cta-group') ||
      compData.id.includes('nav-right')
    );

    if (isNavActionsContainer) {
      const style = compData.style || {};
      style.layout = style.layout || {};
      style.layout.display = 'flex';
      style.layout.flexDirection = 'row';
      style.layout.alignItems = 'center';
      style.layout.gap = style.layout.gap || 16; // Tighter gap for icon buttons
      
      compData.style = style;
      compData.props = compData.props || {};
      compData.props.display = 'flex';
      compData.props.flexDirection = 'row';
      compData.props.alignItems = 'center';
      compData.props.gap = style.layout.gap;
      console.log(`[AI Build] Enforced row layout on nav actions container: ${compData.id}`);
    }
    
    // RULE 6: CTA Section Content Centering
    const isCtaSection = compData.id && (
      compData.id.includes('cta-section') ||
      compData.id.includes('newsletter-section') ||
      compData.id.includes('signup-section') ||
      compData.id.includes('subscribe-section')
    );

    if (isCtaSection && compData.type === 'section') {
      const style = compData.style || {};
      style.layout = style.layout || {};
      style.layout.display = 'flex';
      style.layout.flexDirection = 'column';
      style.layout.alignItems = 'center';
      style.layout.justifyContent = 'center';
      compData.style = style;
      
      // Also propagate to props for ComponentRenderer
      compData.props = compData.props || {};
      compData.props.display = 'flex';
      compData.props.flexDirection = 'column';
      compData.props.alignItems = 'center';
      compData.props.justifyContent = 'center';
      
      console.log(`[AI Build] Enforced CTA section layout: ${compData.id}`);
    }
    
    // RULE 7: CTA Content Container Centering
    const isCtaContent = compData.id && (
      compData.id.includes('cta-content') ||
      compData.id.includes('cta-wrapper') ||
      compData.id.includes('cta-inner') ||
      compData.id.includes('newsletter-content') ||
      compData.id.includes('subscribe-content')
    );
    
    if (isCtaContent && compData.type === 'div') {
      const style = compData.style || {};
      style.layout = style.layout || {};
      style.layout.display = 'flex';
      style.layout.flexDirection = 'column';
      style.layout.alignItems = 'center';
      style.layout.justifyContent = 'center';
      style.layout.gap = style.layout.gap || 24;
      style.typography = style.typography || {};
      style.typography.textAlign = 'center';
      compData.style = style;
      
      compData.props = compData.props || {};
      compData.props.display = 'flex';
      compData.props.flexDirection = 'column';
      compData.props.alignItems = 'center';
      compData.props.justifyContent = 'center';
      compData.props.textAlign = 'center';
      
      console.log(`[AI Build] Enforced CTA content centering: ${compData.id}`);
    }
    
    // RULE 8: Form Row / Email Signup Row - Horizontal Layout (ID-based + smart detection)
    const isFormRowById = compData.id && (
      compData.id.includes('form-row') ||
      compData.id.includes('signup-row') ||
      compData.id.includes('newsletter-row') ||
      compData.id.includes('email-row') ||
      compData.id.includes('input-row') ||
      compData.id.includes('subscribe-row') ||
      compData.id.includes('cta-row') ||
      compData.id.includes('cta-inputs') ||
      compData.id.includes('cta-form') ||
      compData.id.includes('email-form') ||
      compData.id.includes('signup-form') ||
      compData.id.includes('newsletter-form') ||
      compData.id.includes('input-group') ||
      compData.id.includes('form-group') ||
      compData.id.includes('action-row')
    );
    
    // SMART DETECTION: Any div containing BOTH input AND button as children
    const hasInputChild = compData.children?.some(
      (child: any) => child.type === 'input' || child.type === 'textarea'
    );
    const hasButtonChild = compData.children?.some(
      (child: any) => child.type === 'button'
    );
    const isSmartFormRow = compData.type === 'div' && hasInputChild && hasButtonChild;
    
    const isFormRow = isFormRowById || isSmartFormRow;
    
    if (isFormRow && compData.type === 'div') {
      const style = compData.style || {};
      style.layout = style.layout || {};
      style.layout.display = 'flex';
      style.layout.flexDirection = 'row'; // FORCE horizontal
      style.layout.alignItems = 'center';
      style.layout.justifyContent = 'center';
      style.layout.gap = style.layout.gap || 12;
      style.layout.flexWrap = 'wrap';
      compData.style = style;
      
      compData.props = compData.props || {};
      compData.props.display = 'flex';
      compData.props.flexDirection = 'row';
      compData.props.alignItems = 'center';
      compData.props.justifyContent = 'center';
      compData.props.gap = compData.props.gap || '12';
      compData.props.flexWrap = 'wrap';
      
      console.log(`[AI Build] Enforced form row horizontal layout: ${compData.id} (smart=${isSmartFormRow})`);
    }
    
    // RULE 9: Hero Content Container Centering (split-screen fallback)
    const isHeroContentContainer = compData.id && (
      compData.id.includes('hero-content') ||
      compData.id.includes('hero-text') ||
      compData.id.includes('hero-left') ||
      compData.id.includes('hero-info') ||
      compData.id.includes('hero-main')
    );
    
    const hasHeroPartialWidth = compData.style?.sizing?.width && 
                            compData.style.sizing.width !== '100%' &&
                            !String(compData.style.sizing.width).includes('100');
    
    if (isHeroContentContainer && compData.type === 'div' && !hasHeroPartialWidth) {
      const style = compData.style || {};
      style.layout = style.layout || {};
      style.layout.alignItems = 'center';
      style.layout.justifyContent = 'center';
      style.typography = style.typography || {};
      style.typography.textAlign = 'center';
      compData.style = style;
      
      compData.props = compData.props || {};
      compData.props.alignItems = 'center';
      compData.props.justifyContent = 'center';
      compData.props.textAlign = 'center';
      
      console.log(`[AI Build] Hero content centered (fallback to single-column): ${compData.id}`);
    }
    
    // PHASE B: Enhanced project card detection (no text overlay on images)
    // Check for image children using multiple detection methods
    const hasImageChild = compData.children?.some((child: any) => {
      if (child.type === 'image') return true;
      if (child.props?.src) return true; // Has image source
      if (child.props?.backgroundImage) return true; // Background image
      // Check for image inside wrapper div
      if (child.type === 'div' && child.children?.some((c: any) => 
        c.type === 'image' || c.props?.src
      )) return true;
      return false;
    });
    
    const hasTextAfterImage = compData.children?.some(
      (child: any, index: number) => 
        index > 0 && ['heading', 'text', 'div'].includes(child.type)
    );
    
    const idLower = String(compData.id || '').toLowerCase();
    
    // Expanded card detection patterns
    const isProjectCard =
      compData.type === 'div' &&
      hasImageChild &&
      hasTextAfterImage &&
      (
        idLower.includes('project-card') ||
        idLower.includes('projects-card') ||
        (idLower.includes('project') && (idLower.includes('card') || idLower.includes('item') || idLower.includes('tile'))) ||
        idLower.includes('portfolio-card') ||
        idLower.includes('portfolio-item') ||
        idLower.includes('work-card') ||
        idLower.includes('work-item') ||
        idLower.includes('feature-card') ||
        idLower.includes('testimonial-card') ||
        // Fallback: typical card structure with overflow + radius
        (compData.style?.overflow === 'hidden' && compData.style?.border?.radius) ||
        (compData.props?.overflow === 'hidden' && compData.props?.borderRadius)
      );
    
    if (isProjectCard && compData.type === 'div') {
      const style = compData.style || {};
      style.layout = style.layout || {};

      // Force props-based layout (renderer consumes props)
      compData.props.display = 'flex';
      compData.props.flexDirection = 'column';
      
      // Force column layout for proper stacking (image above, content below)
      style.layout.display = 'flex';
      style.layout.flexDirection = 'column';
      
      // Remove any absolute positioning from the card itself
      removePositioning(style as any);
      removePositioning(compData.props);

      // If the card has a fixed height, remove it (prevents clipping/overlap)
      const cardHeightPx = parseSizeToPx(compData.props.height) ?? 
                           parseSizeToPx(style.sizing?.height) ??
                           parseSizeToPx(style.height);
      
      // Process ALL children to fix overlapping issues (not just first child)
      if (Array.isArray(compData.children)) {
        compData.children = compData.children.map((child: any, index: number) => {
          const childStyle = child.style || {};
          child.props = child.props || {};
          
          // Remove absolute positioning from ALL children (critical for overlap fix)
          removePositioning(childStyle as any);
          removePositioning(child.props);
          
          // Remove transforms that commonly cause overlap in cards
          if (child.props.transform && String(child.props.transform).includes('translate')) {
            delete child.props.transform;
          }
          if (childStyle.transform && String(childStyle.transform).includes('translate')) {
            delete childStyle.transform;
          }
          
          // First child (usually image) - ensure proper sizing
          if (index === 0) {
            child.props.flexShrink = 0;
            
            // Ensure images have proper sizing
            if (child.type === 'image' || child.props?.src) {
              // Default reasonable height if none specified
              if (!child.props.height && !childStyle.sizing?.height) {
                child.props.height = '240px';
              }
              child.props.width = '100%';
              child.props.objectFit = 'cover';

              // If the card is shorter than the image, remove card height
              const imageHeightPx = parseSizeToPx(child.props.height) ?? parseSizeToPx(childStyle.sizing?.height);
              if (cardHeightPx != null && imageHeightPx != null && imageHeightPx > cardHeightPx) {
                delete compData.props.height;
                if (style.sizing?.height) delete style.sizing.height;
                console.warn(`[AI Build] Removed fixed card height on ${compData.id} (card ${cardHeightPx}px < image ${imageHeightPx}px)`);
              }
            } else if (child.type === 'div') {
              // Image wrapper div - ensure proper sizing
              if (!child.props.height) child.props.height = '240px';
              child.props.width = '100%';
              child.props.overflow = 'hidden';
              
              // Also fix nested images inside wrapper
              if (Array.isArray(child.children)) {
                child.children = child.children.map((nested: any) => {
                  if (nested.type === 'image' || nested.props?.src) {
                    nested.props = nested.props || {};
                    nested.props.width = '100%';
                    nested.props.height = '100%';
                    nested.props.objectFit = 'cover';
                    removePositioning(nested.props);
                  }
                  return nested;
                });
              }
            }
          }
          
          // Content containers (after image) should have proper padding
          if (index > 0 && (child.type === 'div' || child.type === 'heading' || child.type === 'text')) {
            if (child.type === 'div') {
              child.props.spacingControl = child.props.spacingControl || {};
              if (!child.props.spacingControl.padding) {
                child.props.spacingControl.padding = { top: 16, right: 16, bottom: 16, left: 16, unit: 'px' };
              }
            }
          }
          
          child.style = childStyle;
          return child;
        });
      }
      
      compData.style = style;
      console.log(`[AI Build] Enforced column layout on project card: ${compData.id}`);
    }

    // RULE 5B: Feature cards must be flex columns, NOT grids (prevents text overlap)
    // This rule MUST run BEFORE the grid enforcement rule below
    const isFeatureCardById = compData.id && (
      compData.id.includes('feature-card') ||
      compData.id.includes('capability-card') ||
      compData.id.includes('benefit-card') ||
      compData.id.includes('service-card') ||
      compData.id.includes('testimonial-card') ||
      compData.id.includes('team-card') ||
      compData.id.includes('stat-card')
    );
    
    // Heuristic: div with icon + heading + text children (typical feature card structure)
    const hasIconChild = compData.children?.some((c: any) => c.type === 'icon');
    const hasHeadingChild = compData.children?.some((c: any) => c.type === 'heading');
    const hasTextChild = compData.children?.some((c: any) => c.type === 'text');
    const isFeatureCardByStructure = compData.type === 'div' && 
      hasIconChild && hasHeadingChild && 
      compData.children?.length >= 2 && compData.children?.length <= 5 &&
      !String(compData.id || '').includes('-grid') &&
      !String(compData.id || '').includes('grid-');
    
    const isFeatureCard = isFeatureCardById || isFeatureCardByStructure;
    
    if (isFeatureCard && compData.type === 'div') {
      // Force flex column layout (NOT grid)
      compData.props.display = 'flex';
      compData.props.flexDirection = 'column';
      compData.props.gap = compData.props.gap || '12';
      
      // Remove any grid properties that would cause overlap
      delete compData.props.gridTemplateColumns;
      delete compData.props.gridTemplateRows;
      delete compData.props.gridAutoFlow;
      delete compData.props.justifyItems;
      
      // Clean up responsive grid overrides
      if (compData.props.tabletStyles?.gridTemplateColumns) {
        delete compData.props.tabletStyles.gridTemplateColumns;
      }
      if (compData.props.mobileStyles?.gridTemplateColumns) {
        delete compData.props.mobileStyles.gridTemplateColumns;
      }
      
      // Remove style-based grid properties
      if (compData.style?.layout?.gridTemplateColumns) {
        delete compData.style.layout.gridTemplateColumns;
      }
      if (compData.style?.gridTemplateColumns) {
        delete compData.style.gridTemplateColumns;
      }
      
      // Card should have minWidth for proper sizing in parent grid
      compData.props.minWidth = compData.props.minWidth || '200px';
      
      // Fix children: remove minWidth from leaf nodes (icon, heading, text)
      if (Array.isArray(compData.children)) {
        compData.children = compData.children.map((child: any) => {
          if (['icon', 'heading', 'text', 'button', 'link'].includes(child.type)) {
            child.props = child.props || {};
            // Remove minWidth from leaf nodes (causes overflow in tight grids)
            if (child.props.minWidth === '200px' || child.props.minWidth === '200') {
              delete child.props.minWidth;
            }
            // Remove container-like maxWidth from leaf nodes
            if (['1200px', '1140px', '1280px'].includes(child.props.maxWidth)) {
              delete child.props.maxWidth;
            }
          }
          return child;
        });
      }
      
      console.log(`[AI Build] Enforced flex column on feature card: ${compData.id}`);
    }

    // RULE 6: Fix grid intent containers that accidentally render as flex
    // CRITICAL: Extract gridTemplateColumns from style object if present but not in props
    // NOTE: This rule is SKIPPED for feature cards (handled above)
    if (!isFeatureCard) {
      const styleGridColumns = 
        compData.style?.gridTemplateColumns || 
        compData.style?.layout?.gridTemplateColumns;
      
      if (styleGridColumns && !compData.props?.gridTemplateColumns) {
        compData.props.gridTemplateColumns = styleGridColumns;
        console.log(`[AI Build] Extracted gridTemplateColumns from style: ${compData.id}`);
      }
      
      // CRITICAL: Auto-set display: grid when gridTemplateColumns exists
      // This ensures grids render correctly even if AI forgot to set display
      if (compData.props?.gridTemplateColumns && compData.props?.display !== 'grid') {
        compData.props.display = 'grid';
        console.log(`[AI Build] Auto-set display: grid for ${compData.id} (had gridTemplateColumns)`);
      }
      
      const gridTemplateColumns =
        compData.props?.gridTemplateColumns ||
        compData.style?.layout?.gridTemplateColumns ||
        compData.style?.gridTemplateColumns;
        
      if (gridTemplateColumns && (compData.type === 'div' || compData.type === 'container' || compData.type === 'section')) {
        compData.props.display = 'grid';
        compData.props.gridTemplateColumns = gridTemplateColumns; // Ensure it's in props
        delete compData.props.flexDirection;
        // Ensure gap is present (renderer expects string in many cases)
        if (compData.props.gap == null) compData.props.gap = '24';
        
        // Parse grid column count for smart responsive scaling
        const colCount = parseGridColumns(gridTemplateColumns);
        
        // Tablet: 2 columns (unless already 2 or less)
        compData.props.tabletStyles = compData.props.tabletStyles || {};
        if (!compData.props.tabletStyles.gridTemplateColumns && colCount > 2) {
          compData.props.tabletStyles.gridTemplateColumns = 'repeat(2, 1fr)';
        }
        
        // Mobile: 1 column - always enforce for consistent responsive behavior
        compData.props.mobileStyles = compData.props.mobileStyles || {};
        if (!compData.props.mobileStyles.gridTemplateColumns) {
          compData.props.mobileStyles.gridTemplateColumns = '1fr';
        }
        
        console.log(`[AI Build] Grid container configured: ${compData.id} (${colCount} cols → 2 tablet → 1 mobile)`);
      }
    }
    
    // RULE 6: Ensure buttons have content text (prevent "Button" fallback)
    if (compData.type === 'button') {
      const props = compData.props || {};
      compData.props = compData.props || {};
      
      // RULE 6A: Normalize iconName to icon for ComponentRenderer compatibility
      if (props.iconName && !props.icon) {
        compData.props.icon = props.iconName;
        delete compData.props.iconName;
        console.log(`[AI Build] Normalized iconName to icon: ${compData.id}`);
      }
      
      const hasContent = props.content || props.text;
      const hasBrandIcon = props.brandIcon;
      const hasIcon = compData.props.icon || props.icon; // After normalization
      
      // RULE 6B: Social icon buttons should have NO text content - icon only
      if (hasBrandIcon) {
        // Social icon buttons (github, linkedin, twitter, etc.) should be icon-only
        // Set to empty string instead of deleting - this overrides the default "Button" text
        compData.props.content = '';
        compData.props.text = '';
        console.log(`[AI Build] Cleared text from social icon button: ${compData.id}`);
      }
      // RULE 6C: Icon-only buttons (Lucide icons) should have empty content
      else if (hasIcon && !hasContent) {
        // Ensure content is empty string so button doesn't show "Button" fallback
        compData.props.content = '';
        console.log(`[AI Build] Set empty content for icon-only button: ${compData.id}`);
      }
      // If button has no content and no icon, provide meaningful fallback
      else if (!hasContent && !hasIcon && !hasBrandIcon) {
        // Detect if this is a CTA based on ID
        const isCtaButton = compData.id?.includes('cta') || 
                            compData.id?.includes('primary') ||
                            compData.id?.includes('secondary') ||
                            compData.id?.includes('get-started') ||
                            compData.id?.includes('learn-more');
        
        compData.props.content = isCtaButton ? 'Get Started' : 'Click Here';
        console.warn(`[AI Build] Added fallback content to empty button: ${compData.id}`);
      }
      
      // RULE 6D: Fix button visibility on light/dark backgrounds
      const btnBg = compData.style?.background?.color || props.backgroundColor;
      const btnText = props.textColor || props.color;
      
      // If button on dark background with no explicit styling, ensure visibility
      if (hasDarkBg && !btnBg) {
        // Ghost buttons need light text
        if (props.variant === 'ghost' || props.variant === 'outline') {
          compData.props.textColor = 'rgba(255,255,255,0.95)';
        }
      }
      
      // If button on light background ensure text is visible
      if (hasLightBg && !hasDarkBg && isLightColor(btnText)) {
        compData.props.textColor = 'hsl(var(--foreground))';
      }
    }
    
    // RULE 7: Hero content wrapper needs centering - MORE FLEXIBLE ID matching
    const isHeroContent = compData.id && (
      compData.id.includes('hero-content') || 
      compData.id.includes('hero-inner') ||
      compData.id.includes('hero-wrapper') ||
      compData.id.includes('hero-text') ||
      // Detect hero sections with column layout containing text
      (compData.id.includes('hero') && compData.type === 'div' && 
       compData.style?.layout?.flexDirection === 'column')
    );
    
    if (isHeroContent && compData.type === 'div') {
      const style = compData.style || {};
      style.layout = style.layout || {};
      style.layout.display = 'flex';
      style.layout.flexDirection = 'column';
      style.layout.alignItems = 'center';
      style.layout.textAlign = 'center';
      compData.style = style;
      console.log(`[AI Build] Enforced centering on hero content: ${compData.id}`);
      
      // RULE 7B: Propagate centering to direct children of hero content
      if (Array.isArray(compData.children)) {
        compData.children = compData.children.map((child: any) => {
          if (child.type === 'div' || child.type === 'heading' || child.type === 'text') {
            child.style = child.style || {};
            child.style.typography = child.style.typography || {};
            child.style.typography.textAlign = 'center';
            if (child.type === 'div') {
              child.style.layout = child.style.layout || {};
              child.style.layout.alignItems = 'center';
            }
          }
          return child;
        });
      }
    }
    
    // RULE 8: CTA button rows need centering - MORE FLEXIBLE ID matching
    const isCtaRow = compData.id && (
      compData.id.includes('cta-row') || 
      compData.id.includes('cta-buttons') ||
      compData.id.includes('cta-wrapper') ||
      compData.id.includes('button-row') ||
      compData.id.includes('buttons-row') ||
      compData.id.includes('hero-buttons') ||
      compData.id.includes('hero-cta')
    );
    
    if (isCtaRow && compData.type === 'div') {
      const style = compData.style || {};
      style.layout = style.layout || {};
      style.layout.display = 'flex';
      style.layout.flexDirection = 'row';
      style.layout.alignItems = 'center';
      style.layout.justifyContent = 'center'; // Add center justification for CTA rows
      style.layout.gap = style.layout.gap || 16;
      compData.style = style;
      console.log(`[AI Build] Enforced row layout on CTA row: ${compData.id}`);
    }
    
    // RULE 9: Social links row needs centering - MORE FLEXIBLE ID matching
    const isSocialRow = compData.id && (
      compData.id.includes('social-links') || 
      compData.id.includes('social-row') ||
      compData.id.includes('social-icons') ||
      compData.id.includes('social-buttons')
    );
    
    if (isSocialRow && compData.type === 'div') {
      const style = compData.style || {};
      style.layout = style.layout || {};
      style.layout.display = 'flex';
      style.layout.flexDirection = 'row';
      style.layout.alignItems = 'center';
      style.layout.justifyContent = 'center'; // Add center justification for social rows
      style.layout.gap = style.layout.gap || 12;
      compData.style = style;
      console.log(`[AI Build] Enforced row layout on social links: ${compData.id}`);
    }
    
    // RULE 10: Footer SECTION wrapper needs proper flex layout (prevent overlap)
    // IMPORTANT: Only target the outermost footer section, NOT internal grid/content containers
    const isFooterSection = compData.id && (
      compData.id === 'footer-section' ||
      compData.id === 'footer' ||
      (compData.id.endsWith('-section') && compData.id.includes('footer'))
    ) && (compData.type === 'section' || compData.type === 'div');

    // Detect internal footer containers that need HORIZONTAL layout
    const isFooterInternalContainer = compData.id && (
      compData.id.includes('footer-content') ||
      compData.id.includes('footer-grid') ||
      compData.id.includes('footer-columns') ||
      compData.id.includes('footer-links') ||
      compData.id.includes('footer-brand') ||
      compData.id.includes('footer-inner') ||
      compData.id.includes('footer-container')
    );
    
    if (isFooterSection && !isFooterInternalContainer) {
      const style = compData.style || {};
      style.layout = style.layout || {};
      
      // Footer section wrapper: vertical centering column
      if (!style.layout.display) style.layout.display = 'flex';
      if (!style.layout.flexDirection) style.layout.flexDirection = 'column';
      if (!style.layout.alignItems) style.layout.alignItems = 'center';
      style.layout.flexWrap = 'wrap';
      if (!style.layout.gap) style.layout.gap = 24;
      
      // Remove any absolute positioning
      delete compData.props.position;
      delete compData.props.top;
      delete compData.props.left;
      delete compData.props.right;
      delete compData.props.bottom;
      
      compData.style = style;
      compData.props.display = style.layout.display;
      compData.props.flexDirection = style.layout.flexDirection;
      compData.props.alignItems = style.layout.alignItems;
      compData.props.flexWrap = 'wrap';
      if (!compData.props.gap) compData.props.gap = '24px';
      
      console.log(`[AI Build] Enforced footer SECTION layout: ${compData.id}`);
    }

    // RULE 10c: Footer CONTENT containers must keep HORIZONTAL layout (grid or flex-row)
    if (isFooterInternalContainer && (compData.type === 'div' || compData.type === 'section')) {
      if (compData.children && compData.children.length >= 3) {
        compData.props.display = compData.props.display || 'flex';
        compData.props.flexDirection = 'row';
        compData.props.flexWrap = 'wrap';
        compData.props.gap = compData.props.gap || '48px';
        compData.props.width = '100%';
        compData.props.maxWidth = compData.props.maxWidth || '1200px';
        console.log(`[AI Build] Enforced footer CONTENT horizontal layout: ${compData.id}`);
      }
    }

    // RULE 11: Hero images — prevent oversized images but allow variety
    const isHeroImage = compData.id && compData.id.includes('hero') && compData.type === 'image';
    if (isHeroImage) {
      compData.props.objectFit = compData.props.objectFit || 'cover';
      compData.props.borderRadius = compData.props.borderRadius || '12';
      // Only cap if no maxHeight set at all (prevent full-page takeover)
      if (!compData.props.maxHeight && !compData.props.height) {
        compData.props.maxHeight = '500px';
      }
    }

    // RULE 11b: Hero image containers — style but don't force width constraints
    const isHeroImageContainer = compData.id && compData.id.includes('hero') && 
      compData.type === 'div' && compData.children?.some((c: any) => c.type === 'image');
    if (isHeroImageContainer) {
      compData.props.borderRadius = compData.props.borderRadius || '16';
      compData.props.overflow = 'hidden';
      // Don't force maxWidth — let the AI's chosen layout control sizing
    }

    // RULE 11c REMOVED: No longer force split layout on heroes — AI chooses the layout

    const isFooter = isFooterSection || isFooterInternalContainer;
    if (isFooter) {
      
      // RULE 10b: Ensure footer text is always visible
      const footerBg = compData.style?.background?.color || 
                       compData.style?.background?.value ||
                       compData.props?.backgroundColor;
      
      if (isDarkBackground(footerBg)) {
        // GAP 9 FIX: Use differentiated text hierarchy for footer
        const enforceFooterTextVisibility = (child: any) => {
          if (child.type === 'heading') {
            child.style = child.style || {};
            child.style.typography = child.style.typography || {};
            child.style.typography.color = '#ffffff';
            child.props = child.props || {};
            child.props.color = '#ffffff';
          } else if (['text', 'label', 'paragraph'].includes(child.type)) {
            child.style = child.style || {};
            child.style.typography = child.style.typography || {};
            // Use slightly muted white for body text, brighter for headings
            const childId = String(child.id || '').toLowerCase();
            const isCopyright = childId.includes('copyright') || childId.includes('copy');
            child.style.typography.color = isCopyright ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.85)';
            child.props = child.props || {};
            child.props.color = child.style.typography.color;
          }
          if (Array.isArray(child.children)) {
            child.children.forEach(enforceFooterTextVisibility);
          }
        };
        if (Array.isArray(compData.children)) {
          compData.children.forEach(enforceFooterTextVisibility);
        }
        console.log(`[AI Build] Enforced footer text visibility: ${compData.id}`);
      }
    }
    
    // Recursively validate children, passing background state
    if (Array.isArray(compData.children)) {
      compData.children = compData.children.map((child: any) => 
        validateSectionStyles(child, hasDarkBg, hasLightBg)
      );
    }
    
    return compData;
  };

  // PHASE D: Final Layout QA Pass - sanitizes components AFTER all processing
  const finalLayoutQAPass = (components: AppComponent[]): AppComponent[] => {
    const canvasWidth = canvasWidthRef.current || 1140;
    
    const sanitizeComponent = (comp: AppComponent): AppComponent => {
      const props = comp.props || {};
      const idLower = String(comp.id || '').toLowerCase();
      
      // Check if this is a decorative element that needs absolute positioning
      // These are gradient orbs, blur backgrounds, and other visual overlays
      const isDecorativeElement = 
        idLower.includes('gradient-orb') ||
        idLower.includes('blur-orb') ||
        idLower.includes('decorative') ||
        idLower.includes('background-blob') ||
        idLower.includes('bg-orb') ||
        idLower.includes('glow-orb') ||
        idLower.includes('accent-orb') ||
        idLower.includes('-orb') ||
        idLower.includes('orb-') ||
        props.pointerEvents === 'none' ||
        (props.filter && typeof props.filter === 'string' && props.filter.includes('blur'));
      
      // 1. Remove absolute/fixed positioning (unless explicitly allowed or decorative)
      const positioningAllowList = ['sticky', 'relative'];
      if (props.position && !positioningAllowList.includes(props.position) && !isDecorativeElement) {
        console.warn(`[QA Pass] Removing ${props.position} from ${comp.id}`);
        delete props.position;
        delete props.top;
        delete props.left;
        delete props.right;
        delete props.bottom;
        delete props.zIndex;
      }
      
      // 2. Remove negative margins that cause overlap
      if (props.spacingControl?.margin) {
        const m = props.spacingControl.margin;
        const hasNegativeMargin = (typeof m.top === 'number' && m.top < 0) ||
                                  (typeof m.bottom === 'number' && m.bottom < 0) ||
                                  (typeof m.left === 'number' && m.left < 0) ||
                                  (typeof m.right === 'number' && m.right < 0);
        if (hasNegativeMargin) {
          console.warn(`[QA Pass] Removing negative margins from ${comp.id}`);
          props.spacingControl.margin = {
            top: Math.max(0, typeof m.top === 'number' ? m.top : 0),
            right: Math.max(0, typeof m.right === 'number' ? m.right : 0),
            bottom: Math.max(0, typeof m.bottom === 'number' ? m.bottom : 0),
            left: Math.max(0, typeof m.left === 'number' ? m.left : 0),
            unit: m.unit || 'px'
          };
        }
      }
      
      // 3. Clamp width to canvas width (prevent horizontal overflow)
      const widthPx = parseSizeToPx(props.width);
      if (widthPx && widthPx > canvasWidth) {
        console.warn(`[QA Pass] Clamping width ${widthPx}px to 100% for ${comp.id}`);
        props.width = '100%';
        props.maxWidth = `${canvasWidth}px`;
      }
      
      // 4. Remove problematic transforms that cause overlap
      if (props.transform && typeof props.transform === 'string') {
        if (props.transform.includes('translateY(-') || 
            props.transform.includes('translateX(-')) {
          console.warn(`[QA Pass] Removing negative transform from ${comp.id}`);
          delete props.transform;
        }
      }
      
      // 5. Ensure sections have height: auto and proper containment for decorative children
      if (comp.type === 'section' || idLower.includes('-section')) {
        if (props.height && props.height !== 'auto') {
          props.height = 'auto';
        }
        // GAP 4 FIX: Preserve minHeight for hero sections (validateSectionStyles already capped it)
        const isHeroQA = idLower.includes('hero');
        if (!isHeroQA) {
          delete props.minHeight;
        }
        
        // Force sections to always be full-width (override any constrained widths from AI)
        props.width = '100%';
        // Remove any maxWidth that could constrain section width
        delete props.maxWidth;
        
        // Check if section has decorative children that need containment
        const hasDecorativeChildren = comp.children?.some((child: any) => {
          const childId = String(child.id || '').toLowerCase();
          return childId.includes('orb') || 
                 childId.includes('decorative') || 
                 childId.includes('blob') ||
                 child.props?.pointerEvents === 'none';
        });
        
        if (hasDecorativeChildren) {
          props.overflow = 'hidden';
          props.position = props.position || 'relative';
        }
      }
      
      // 6. Ensure image components have proper defaults
      if (comp.type === 'image') {
        if (!props.objectFit) props.objectFit = 'cover';
        if (!props.width) props.width = '100%';
        
        // Check if image is inside a hero section (by ID pattern)
        const isHeroImage = idLower.includes('hero');
        
        if (isHeroImage) {
          // Hero images should fill their container completely
          props.width = '100%';
          props.height = '100%';
          props.objectFit = 'cover';
          props.flexShrink = 0;
          // Ensure aspect ratio doesn't constrain size in split layouts
          delete props.aspectRatio;
          console.log(`[QA Pass] Hero image fills container: ${comp.id}`);
        }
        
        // Remove any absolute positioning from images (unless decorative)
        if (!isDecorativeElement) {
          delete props.position;
          delete props.top;
          delete props.left;
          delete props.right;
          delete props.bottom;
        }
        props.flexShrink = 0;
      }
      
      // 7. Ensure nav-horizontal components have proper layout
      if (comp.type === 'nav-horizontal') {
        if (!props.width) props.width = '100%';
        if (!props.justifyContent) props.justifyContent = 'space-between';
        if (!props.alignItems) props.alignItems = 'center';
        
        // 7b. Restructure children: Logo on left, everything else grouped on right
        if (comp.children?.length) {
          const children = comp.children as AppComponent[];
          
          // Check if already restructured (has nav-right-group or nav-right)
          const hasRightGroup = children.some(c => {
            const childId = String(c.id || '').toLowerCase();
            return childId.includes('nav-right-group') || 
                   childId.includes('nav-right') ||
                   (childId.includes('nav-content') && c.children?.length);
          });
          
          // GAP 8 FIX: Only restructure if nav has MORE than 3 children (AI's 3-child structure is valid)
          if (!hasRightGroup && children.length > 3) {
            // Find the logo child
            const logoChild = children.find(c => {
              const childId = String(c.id || '').toLowerCase();
              return childId.includes('logo') || childId.includes('brand');
            });
            
            // Collect all non-logo children
            const rightChildren = children.filter(c => {
              const childId = String(c.id || '').toLowerCase();
              return !childId.includes('logo') && !childId.includes('brand');
            });
            
            if (logoChild && rightChildren.length > 1) {
              // CRITICAL: Ensure each child nav item is properly spaced and doesn't merge
              const processedRightChildren = rightChildren.map(child => {
                const processedChild = { ...child };
                processedChild.props = processedChild.props || {};
                // Ensure link/text children don't merge - force inline-block and nowrap
                if (processedChild.type === 'link' || processedChild.type === 'text') {
                  processedChild.props.whiteSpace = 'nowrap';
                  processedChild.props.display = 'inline-block';
                }
                return processedChild;
              });
              
              // Create the nav-right-group container
              const navRightGroup: AppComponent = {
                id: 'nav-right-group',
                type: 'div',
                style: {},
                props: {
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '32px', // Spacing between links and CTAs
                  _aiGenerated: true,
                },
                children: processedRightChildren,
              };
              
              // Replace children with restructured layout: [Logo, nav-right-group]
              comp.children = [logoChild, navRightGroup];
              console.log(`[QA Pass] Restructured nav-horizontal: logo + ${rightChildren.length} items grouped on right`);
            }
          }
        }
      }
      
      // 8. Ensure flex-row card containers have proper card sizing
      // This prevents text-wrapping issues where cards have no width constraints
      if (comp.type === 'div' && props.display === 'flex' && props.flexDirection === 'row' && comp.children?.length >= 2) {
        const allChildrenAreCards = comp.children.every((c: any) => {
          const cId = String(c.id || '').toLowerCase();
          return c.type === 'div' || c.type === 'container' || cId.includes('card') || cId.includes('item') || cId.includes('column') || cId.includes('tier');
        });
        if (allChildrenAreCards) {
          // Ensure proper flex wrapping
          if (!props.flexWrap) props.flexWrap = 'wrap';
          if (!props.gap) props.gap = '24px';
          if (!props.width) props.width = '100%';
          
          // Give each child proper flex sizing
          const childCount = comp.children.length;
          comp.children = comp.children.map((child: any) => {
            child.props = child.props || {};
            if (!child.props.flexBasis && !child.props.width) {
              child.props.flexBasis = childCount >= 4 ? 'calc(25% - 18px)' : childCount >= 3 ? 'calc(33.333% - 16px)' : 'calc(50% - 12px)';
            }
            if (!child.props.minWidth) {
              child.props.minWidth = '260px';
            }
            return child;
          });
          console.log(`[QA Pass] Added flex card sizing to ${comp.id} (${childCount} cards)`);
        }
      }
      
      // 9. Detect products/features grids that should use CSS Grid
      // NOTE: In practice, the AI sometimes provides gridTemplateColumns but leaves display as flex.
      // We aggressively enforce CSS Grid when a component looks like a multi-card section.
      const isProductGrid =
        idLower.includes('product') ||
        idLower.includes('feature') ||
        idLower.includes('grid') ||
        idLower.includes('cards') ||
        idLower.includes('items') ||
        idLower.includes('collection') ||
        idLower.includes('pricing') ||
        idLower.includes('plan') ||
        idLower.includes('tier');

      const hasMultipleCardChildren =
        (comp.children?.length ?? 0) >= 3 &&
        comp.children!.every((c: any) => {
          const childId = String(c.id || '').toLowerCase();
          // Treat common container-like nodes as "cards" even when IDs are generic.
          return (
            c.type === 'div' ||
            c.type === 'container' ||
            childId.includes('card') ||
            childId.includes('item') ||
            childId.includes('product')
          );
        });

      const existingGridCols = props.gridTemplateColumns as string | undefined;

      // If it looks like a grid section, enforce grid regardless of whether columns were provided.
      if ((isProductGrid || !!existingGridCols) && hasMultipleCardChildren) {
        const childCount = comp.children!.length;
        const inferredColumns = childCount >= 4 ? 4 : childCount >= 3 ? 3 : 2;

        // Ensure grid intent is applied
        props.display = 'grid';
        props.gridTemplateColumns = existingGridCols || `repeat(${inferredColumns}, 1fr)`;
        props.gap = props.gap || '24px';
        // Better defaults for cards (prevents odd centering/squishing)
        (props as any).alignItems = props.alignItems || 'stretch';
        (props as any).justifyItems = (props as any).justifyItems || 'stretch';
        delete props.flexDirection;

        // FIX: Add width to ensure grid fills container (prevents squished layouts)
        props.width = props.width || '100%';
        
        // Add maxWidth for proper content containment and centering
        if (!props.maxWidth) {
          props.maxWidth = '1200px';
          props.margin = props.margin || '0 auto';
        }

        // Ensure grid children have proper sizing
        if (comp.children?.length) {
          comp.children = comp.children.map((child: any) => {
            child.props = child.props || {};
            // Grid children should fill their cells
            if (!child.props.width) {
              child.props.width = '100%';
            }
            // Ensure cards have a minimum width for readability
            if (!child.props.minWidth && child.type === 'div') {
              child.props.minWidth = '200px';
            }
            return child;
          });
        }

        // Add responsive overrides if missing
        const colCount = parseGridColumns(props.gridTemplateColumns);
        props.tabletStyles = props.tabletStyles || {};
        if (!props.tabletStyles.gridTemplateColumns && colCount > 2) {
          props.tabletStyles.gridTemplateColumns = 'repeat(2, 1fr)';
        }
        props.mobileStyles = props.mobileStyles || {};
        if (!props.mobileStyles.gridTemplateColumns) {
          props.mobileStyles.gridTemplateColumns = '1fr';
        }

        console.log(
          `[QA Pass] Enforced grid on ${comp.id} (cols=${props.gridTemplateColumns}, width=100%, maxWidth=1200px) with responsive overrides`
        );
      }
      
      // Recursively sanitize children
      if (comp.children?.length) {
        comp.children = comp.children.map(sanitizeComponent);
      }
      
      return { ...comp, props };
    };
    
    return components.map(sanitizeComponent);
  };

  // Helper to parse grid columns like "repeat(4, 1fr)" or "1fr 1fr 1fr"
  const parseGridColumns = (gridTemplateColumns: string | undefined): number => {
    if (!gridTemplateColumns) return 0;
    
    const repeatMatch = gridTemplateColumns.match(/repeat\((\d+)/);
    if (repeatMatch) return parseInt(repeatMatch[1], 10);
    
    const frCount = (gridTemplateColumns.match(/1fr/g) || []).length;
    return frCount;
  };

  // Deep clone component with new unique IDs
  const deepCloneWithNewIds = (component: AppComponent, suffix: number): AppComponent => {
    const newId = `${component.id}-${suffix}`;
    
    const clone: AppComponent = {
      ...component,
      id: newId,
      props: { ...component.props },
      children: component.children?.map((child, idx) => 
        deepCloneWithNewIds(child, suffix * 100 + idx)
      ),
    };
    
    // Update appliedClasses to use new ID
    if (clone.props?.appliedClasses?.length) {
      clone.props.appliedClasses = [newId, ...clone.props.appliedClasses.slice(1)];
    }
    
    return clone;
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTION COMPLETENESS SYSTEM - Ensure all required sections are present
  // ═══════════════════════════════════════════════════════════════════════════════

  type PageType = 'portfolio' | 'landing' | 'ecommerce' | 'generic' | 'focused';

  // Detect what type of page is being built from the prompt
  // Now includes 'focused' type for single-component/section requests
  
  const detectPageType = (prompt: string): PageType => {
    const lowerPrompt = prompt.toLowerCase();
    
    // Check for focused request FIRST - these should NOT get extra sections
    const focusedPatterns = [
      /(?:create|make|build|add|design)\s+(?:a\s+)?(?:simple\s+)?(?:login|signup|sign-up|signin|sign-in|contact|newsletter|pricing|testimonial|feature|faq|hero|footer|navbar|nav|card|modal|sidebar)/i,
      /(?:just|only)\s+(?:a\s+)?/i,
    ];
    
    for (const pattern of focusedPatterns) {
      if (pattern.test(lowerPrompt)) {
        console.log(`[Page Type Detection] Focused request detected - skipping section requirements`);
        return 'focused';
      }
    }
    
    if (lowerPrompt.includes('portfolio') || lowerPrompt.includes('developer') || 
        lowerPrompt.includes('freelancer') || lowerPrompt.includes('personal') ||
        lowerPrompt.includes('cv') || lowerPrompt.includes('resume')) {
      return 'portfolio';
    }
    
    if (lowerPrompt.includes('ecommerce') || lowerPrompt.includes('e-commerce') ||
        lowerPrompt.includes('shop') || lowerPrompt.includes('store') ||
        lowerPrompt.includes('fashion') || lowerPrompt.includes('product')) {
      return 'ecommerce';
    }
    
    if (lowerPrompt.includes('landing') || lowerPrompt.includes('saas') ||
        lowerPrompt.includes('startup') || lowerPrompt.includes('app') ||
        lowerPrompt.includes('marketing')) {
      return 'landing';
    }
    
    return 'generic';
  };

  // Template injection systems removed - all designs are 100% AI-generated

  // ═══════════════════════════════════════════════════════════════════════════════
  // PLACEHOLDER SANITIZATION - Remove empty images and divs
  // ═══════════════════════════════════════════════════════════════════════════════

  const sanitizeEmptyPlaceholders = (components: AppComponent[]): AppComponent[] => {
    
    // Helper: Check if a color is a placeholder-style gray/neutral
    const isPlaceholderBackground = (bgValue: string | undefined): boolean => {
      if (!bgValue) return false;
      const bg = String(bgValue).toLowerCase();
      
      // Semantic tokens that indicate placeholder/muted styling
      if (bg.includes('muted') || bg.includes('neutral') || bg.includes('slate') || 
          bg.includes('gray') || bg.includes('grey') || bg.includes('placeholder')) {
        return true;
      }
      
      // Hex gray detection: #ddd, #eee, #ccc, #e5e7eb, #f1f5f9, etc.
      const hexMatch = bg.match(/#([0-9a-f]{3,8})\b/i);
      if (hexMatch) {
        const hex = hexMatch[1];
        let r: number, g: number, b: number;
        
        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16);
          g = parseInt(hex[1] + hex[1], 16);
          b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length >= 6) {
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
        } else {
          return false;
        }
        
        // Gray = R, G, B are similar values AND in light-gray range (180-250)
        const isGrayRange = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20;
        const isLightGray = r > 180 && g > 180 && b > 180 && r < 250 && g < 250 && b < 250;
        
        if (isGrayRange && isLightGray) {
          return true;
        }
      }
      
      // RGB gray detection: rgb(229, 231, 235)
      const rgbMatch = bg.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        
        const isGrayRange = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20;
        const isLightGray = r > 180 && g > 180 && b > 180 && r < 250 && g < 250 && b < 250;
        
        if (isGrayRange && isLightGray) {
          return true;
        }
      }
      
      return false;
    };
    
    // Helper: Check if element is purely empty (no meaningful content at all)
    const isEmptyElement = (comp: AppComponent): boolean => {
      const hasChildren = comp.children && comp.children.length > 0;
      const hasTextContent = comp.props?.content || comp.props?.text || comp.props?.children;
      const hasLabel = comp.props?.label;
      const hasSrc = comp.props?.src;
      const hasHref = comp.props?.href;
      
      return !hasChildren && !hasTextContent && !hasLabel && !hasSrc && !hasHref;
    };
    
    // NEW: Check if a header div is incomplete (has children but no heading)
    const isIncompleteHeaderDiv = (comp: AppComponent): boolean => {
      const idLower = String(comp.id || '').toLowerCase();
      if (!idLower.includes('header') || comp.type !== 'div') return false;
      
      const children = comp.children || [];
      if (children.length === 0) return false;
      
      const hasHeading = children.some((c: any) => 
        ['heading', 'h1', 'h2', 'h3', 'h4'].includes(c.type)
      );
      
      // Has children (like badge) but no heading = incomplete
      return !hasHeading;
    };
    
    // NEW: Check if div only contains minimal/shallow content
    const hasOnlyMinimalChildren = (comp: AppComponent): boolean => {
      if (comp.type !== 'div') return false;
      const children = comp.children || [];
      
      // Empty
      if (children.length === 0) return true;
      
      // Only contains a single badge, separator, or nested empty div
      if (children.length === 1) {
        const child = children[0] as any;
        const isMinimal = child.type === 'badge' || 
                          child.type === 'separator' ||
                          (child.type === 'div' && hasOnlyMinimalChildren(child as AppComponent));
        return isMinimal;
      }
      
      return false;
    };
    
    const sanitizeComponent = (comp: AppComponent): AppComponent | null => {
      // Remove heading components with no/placeholder content (they render as "Sample Heading")
      const compTypeStr = comp.type as string;
      const isHeading = ['heading', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(compTypeStr);
      
      if (isHeading) {
        const content = comp.props?.content || comp.props?.children || comp.props?.text;
        if (!content || 
            content === '' || 
            /sample\s*heading/i.test(content) || 
            /your\s*heading/i.test(content) || 
            /section\s*title/i.test(content)) {
          console.log(`[Sanitize] Removing heading with placeholder content: "${content}" (${comp.id})`);
          return null;
        }
      }

      // Remove text components with no/placeholder content (they render as "Sample text")
      if (comp.type === 'text' || (comp.type as string) === 'paragraph' || (comp.type as string) === 'span') {
        const content = comp.props?.content || comp.props?.text || comp.props?.children;
        if (!content || 
            content === '' || 
            /sample\s*text/i.test(content) || 
            /lorem\s*ipsum/i.test(content) || 
            /description\s*here/i.test(content) || 
            /your\s*text/i.test(content)) {
          console.log(`[Sanitize] Removing text with placeholder content: "${content}" (${comp.id})`);
          return null;
        }
      }

      // Remove link components with no/placeholder content
      if (comp.type === 'link') {
        const text = comp.props?.text || comp.props?.content || comp.props?.children;
        if (!text || 
            text === '' || 
            /link\s*text/i.test(text) || 
            /link\s*\d+/i.test(text) || 
            text === 'Link' || 
            text === 'Page') {
          console.log(`[Sanitize] Removing link with placeholder content: "${text}" (${comp.id})`);
          return null;
        }
      }

      // Skip images with empty src - these render as cyan placeholder boxes
      if (comp.type === 'image') {
        const src = comp.props?.src;
        if (!src || src === '' || src === '/placeholder.svg' && !comp.props.imagePrompt) {
          console.log(`[Sanitize] Removing empty image placeholder: ${comp.id}`);
          return null;
        }
      }
      
      // NOTE: Removed aggressive isIncompleteHeaderDiv + hasOnlyMinimalChildren checks
      // These were stripping valid section header wrappers (badge + heading containers)
      
      // Remove empty divs that are likely placeholders
      if (comp.type === 'div') {
        const isEmpty = isEmptyElement(comp);
        
        if (isEmpty) {
          const bgColor = comp.props?.backgroundColor || comp.props?.background || 
                          (comp.style as any)?.background?.color;
          const hasPlaceholderBg = isPlaceholderBackground(bgColor);
          
          // Remove if: empty AND has placeholder-style background
          if (hasPlaceholderBg) {
            console.log(`[Sanitize] Removing empty placeholder div with gray bg: ${comp.id}`);
            return null;
          }
          
          // Also remove completely empty divs with no styling purpose
          const hasBorder = comp.props?.borderWidth || comp.props?.border || 
                            (comp.style as any)?.border?.width;
          const hasBackground = bgColor && !isPlaceholderBackground(bgColor);
          const isDecorative = String(comp.id || '').toLowerCase().includes('decorative') ||
                               String(comp.id || '').toLowerCase().includes('spacer') ||
                               String(comp.id || '').toLowerCase().includes('orb') ||
                               String(comp.id || '').toLowerCase().includes('blob');
          
          // Skip removing if it's intentionally decorative
          if (isDecorative) {
            return comp;
          }
          
          // Remove empty divs with no background and no border (pure waste of space)
          if (!hasBackground && !hasBorder) {
            console.log(`[Sanitize] Removing empty unstyled div: ${comp.id}`);
            return null;
          }
        }
      }
      
      // Recursively sanitize children
      if (comp.children && comp.children.length > 0) {
        const sanitizedChildren = comp.children
          .map(child => sanitizeComponent(child as AppComponent))
          .filter((c): c is AppComponent => c !== null);
        
        // If after sanitizing children, this container becomes empty and is not styled, remove it too
        if ((comp.type === 'div' || comp.type === 'section' || comp.type === 'container') && sanitizedChildren.length === 0 && isEmptyElement({ ...comp, children: [] })) {
          const bgColor = comp.props?.backgroundColor || comp.props?.background;
          const hasPlaceholderBg = isPlaceholderBackground(bgColor);
          const hasMeaningfulBg = bgColor && !hasPlaceholderBg;
          const hasBorder = comp.props?.borderWidth || comp.props?.border;
          
          if (!hasMeaningfulBg && !hasBorder) {
            console.log(`[Sanitize] Removing container that became empty after child sanitization: ${comp.id}`);
            return null;
          }
        }

        // Helper: check if a section contains ONLY text/heading content (no interactive/visual elements)
        const hasOnlyTextContent = (children: any[]): boolean => {
          return children.every((child: any) => {
            const isTextType = ['heading', 'text', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'badge'].includes(child.type);
            if (isTextType) return true;
            if (['div', 'section', 'container'].includes(child.type) && child.children?.length > 0) {
              return hasOnlyTextContent(child.children);
            }
            if (['div', 'section', 'container'].includes(child.type) && (!child.children || child.children.length === 0)) {
              return true;
            }
            return false;
          });
        };

        // NOTE: Text-only section pruning removed — a section with just headings/text is a valid design choice
        
        // Fix accordion items with placeholder "Section N" titles
        if (comp.type === 'accordion' && sanitizedChildren) {
          sanitizedChildren.forEach((item: any) => {
            if (item.type === 'accordion-item' && item.props?.title && /^Section \d+$/i.test(item.props.title)) {
              const header = item.children?.find((c: any) => c.type === 'accordion-header');
              if (header?.props?.content && !/^Section \d+$/i.test(header.props.content)) {
                item.props.title = header.props.content;
              }
            }
          });
        }

        return { ...comp, children: sanitizedChildren };
      }
      
      return comp;
    };
    
    return components
      .map(comp => sanitizeComponent(comp))
      .filter((c): c is AppComponent => c !== null);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTION ORDERING - Ensure sections appear in correct order
  // ═══════════════════════════════════════════════════════════════════════════════

  const enforceCorrectSectionOrder = (components: AppComponent[]): AppComponent[] => {
    // Canonical order: nav → hero → content sections → newsletter → contact/cta → footer
    const sectionOrderPriority: Record<string, number> = {
      'nav': 0,
      'header': 1,
      'hero': 10,
      'about': 20,
      'skills': 30,
      'services': 40,
      'features': 50,
      'projects': 60,
      'products': 70,
      'portfolio': 75,
      'testimonials': 80,
      'pricing': 90,
      'team': 95,
      'newsletter': 100,
      'subscribe': 100,
      'cta': 110,
      'contact': 120,
      'footer': 200,
    };
    
    const getSectionPriority = (comp: AppComponent): number => {
      const id = String(comp.id || '').toLowerCase();
      const type = String(comp.type || '').toLowerCase();
      
      // Check for exact matches in ID
      for (const [key, priority] of Object.entries(sectionOrderPriority)) {
        if (id.includes(key) || type.includes(key)) {
          return priority;
        }
      }
      
      // Unknown sections go in the middle (before newsletter/contact/footer)
      return 85;
    };
    
    // Separate sections from non-section components
    const sections: AppComponent[] = [];
    const nonSections: AppComponent[] = [];
    
    for (const comp of components) {
      const isSection = comp.type === 'section' || 
                        comp.type === 'nav-horizontal' ||
                        String(comp.id || '').includes('-section');
      if (isSection) {
        sections.push(comp);
      } else {
        nonSections.push(comp);
      }
    }
    
    // Sort sections by priority
    sections.sort((a, b) => getSectionPriority(a) - getSectionPriority(b));
    
    // Log reordering if any changes were made
    const originalOrder = components.filter(c => 
      c.type === 'section' || c.type === 'nav-horizontal' || String(c.id || '').includes('-section')
    ).map(c => c.id);
    const newOrder = sections.map(c => c.id);
    
    if (JSON.stringify(originalOrder) !== JSON.stringify(newOrder)) {
      console.log(`[Section Order] Reordered sections:`, {
        before: originalOrder,
        after: newOrder
      });
    }
    
    // Return sections in correct order (non-sections first, then ordered sections)
    return [...nonSections, ...sections];
  };


  // Process component data recursively
  const processComponent = (
    compData: any,
    parentId?: string
  ): AppComponent => {
    // CRITICAL GUARD: Prevent crash if AI returns malformed data (string, null, etc.)
    if (!compData || typeof compData !== 'object') {
      console.warn('[AI Build] processComponent received invalid data:', typeof compData, compData);
      // Return a minimal placeholder component to prevent crash
      return {
        id: generateId('invalid'),
        type: 'div' as ComponentType,
        props: { _invalid: true, _originalValue: String(compData) },
        style: {},
        children: []
      };
    }
    
    // PHASE A FIX: Flatten AI style to props FIRST, then validate
    // This ensures our validation rules win over AI styles
    
    // Use AI-provided ID if semantic, otherwise generate a semantic fallback
    const rawId = compData.id;
    const componentType = normalizeComponentType(compData.type || 'container');
    
    let id: string;
    if (rawId && isSemanticId(rawId)) {
      id = rawId;
    } else if (rawId) {
      validateSemanticId(rawId, componentType);
      id = rawId;
    } else {
      id = generateId(componentType);
    }

    // Guarantee uniqueness across the current build
    id = ensureUniqueId(id);

    // Step 1: Flatten AI style object to props
    const flattenedStyles = flattenStyleToProps(compData.style);

    // Step 2: Merge: base props + flattened styles (styles win for conflicts)
    let mergedProps = {
      ...compData.props || {},
      ...flattenedStyles,
    };
    
    // Step 3: Create temp component for validation (with merged props)
    const tempComponent = {
      ...compData,
      id,
      props: mergedProps,
    };
    
    // Step 4: Validate section styles AFTER merge (so our fixes win)
    const validatedData = validateSectionStyles(tempComponent);
    
    // Step 5: Use validated props (validation rules have final say)
    mergedProps = validatedData.props || mergedProps;

    // Flatten typography to top-level props for renderer compatibility
    // AND mark them as locked so renderer doesn't discard AI-specified values
    if (mergedProps.typography) {
      const typo = mergedProps.typography;
      if (typo.fontSize) mergedProps.fontSize = typo.fontSize;
      if (typo.fontFamily) mergedProps.fontFamily = typo.fontFamily;
      if (typo.fontWeight) mergedProps.fontWeight = typo.fontWeight;
      if (typo.color) mergedProps.color = typo.color;
      if (typo.textAlign) mergedProps.textAlign = typo.textAlign;
      if (typo.lineHeight) mergedProps.lineHeight = typo.lineHeight;
      if (typo.letterSpacing) mergedProps.letterSpacing = typo.letterSpacing;

      // Mark all AI-provided typography keys as explicitly locked so the renderer
      // uses them instead of deferring to inheritance or design token defaults
      mergedProps.__lockedProps = mergedProps.__lockedProps || {};
      if (typo.fontSize) mergedProps.__lockedProps.fontSize = true;
      if (typo.fontFamily) mergedProps.__lockedProps.fontFamily = true;
      if (typo.fontWeight) mergedProps.__lockedProps.fontWeight = true;
      if (typo.color) mergedProps.__lockedProps.color = true;
      if (typo.textAlign) mergedProps.__lockedProps.textAlign = true;
      if (typo.lineHeight) mergedProps.__lockedProps.lineHeight = true;
      if (typo.letterSpacing) mergedProps.__lockedProps.letterSpacing = true;
      mergedProps.__lockedProps.typography = {
        fontSize: !!typo.fontSize,
        fontFamily: !!typo.fontFamily,
        fontWeight: !!typo.fontWeight,
        color: !!typo.color,
        textAlign: !!typo.textAlign,
        lineHeight: !!typo.lineHeight,
        letterSpacing: !!typo.letterSpacing,
      };
    }

    // Convert AI's structured backgroundGradient object to a CSS string the renderer accepts
    if (mergedProps.backgroundGradient && typeof mergedProps.backgroundGradient === 'object') {
      const grad = mergedProps.backgroundGradient as any;
      if (Array.isArray(grad.stops) && grad.angle !== undefined) {
        const stops = grad.stops.map((s: any) => `${s.color} ${s.position}%`).join(', ');
        mergedProps.backgroundGradient = `linear-gradient(${grad.angle}deg, ${stops})`;
      }
    }

    // Normalize gap values to consistent pixel strings
    if (mergedProps.gap) {
      if (typeof mergedProps.gap === 'number') {
        mergedProps.gap = `${mergedProps.gap}px`;
      } else if (typeof mergedProps.gap === 'string') {
        const gapMap: Record<string, string> = {
          'none': '0px', 'sm': '8px', 'md': '16px', 
          'lg': '24px', 'xl': '32px', '2xl': '48px'
        };
        if (gapMap[mergedProps.gap]) {
          mergedProps.gap = gapMap[mergedProps.gap];
        }
      }
    }

    // Sanitize literal \n in text content - replace with space for cleaner text
    if (mergedProps.content && typeof mergedProps.content === 'string') {
      mergedProps.content = mergedProps.content.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
    }
    if (mergedProps.text && typeof mergedProps.text === 'string') {
      mergedProps.text = mergedProps.text.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
    }
    if (mergedProps.children && typeof mergedProps.children === 'string') {
      mergedProps.children = mergedProps.children.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Normalize button/label content: AI uses 'content', renderer uses 'text'
    if ((componentType === 'button' || componentType === 'label') && mergedProps.content && !mergedProps.text) {
      mergedProps.text = mergedProps.content;
    }

    // For buttons: ensure textColor is set if AI provided color (renderer uses textColor)
    if (componentType === 'button' && mergedProps.color && !mergedProps.textColor) {
      mergedProps.textColor = mergedProps.color;
    }

    // Auto-assign classNames from semantic ID with uniqueness check
    const semanticClassNames: string[] = [];
    
    // Use the component ID as primary class name (semantic naming)
    // Ensure class name uniqueness to prevent style collisions
    if (id && isSemanticId(id)) {
      const uniqueClassName = ensureUniqueClassName(id);
      semanticClassNames.push(uniqueClassName);
    }
    
    // Also include any AI-provided appliedClasses (validate uniqueness)
    if (validatedData.props?.appliedClasses && Array.isArray(validatedData.props.appliedClasses)) {
      for (const cls of validatedData.props.appliedClasses) {
        if (!semanticClassNames.includes(cls)) {
          // Use unique class name if different from ID
          const uniqueCls = cls === id ? semanticClassNames[0] : ensureUniqueClassName(cls);
          if (!semanticClassNames.includes(uniqueCls)) {
            semanticClassNames.push(uniqueCls);
          }
        }
      }
    }

    const component: AppComponent = {
      id,
      type: componentType,
      props: {
        ...mergedProps,
        _aiGenerated: true, // Flag for ComponentRenderer fallback logic
      },
      style: {}, // Clear style object - everything is in props now
      classNames: semanticClassNames.length > 0 ? semanticClassNames : undefined,
      children: [],
    };

    // Add visibility conditions if present
    if (validatedData.visibility) {
      component.props.visibility = validatedData.visibility;
    }

    // Also set appliedClasses in props for class system compatibility
    if (semanticClassNames.length > 0) {
      component.props.appliedClasses = semanticClassNames;
      component.props.activeClass = semanticClassNames[0];
    } else if (validatedData.props?.appliedClasses) {
      component.props.appliedClasses = validatedData.props.appliedClasses;
    }
    if (validatedData.props?.activeClass) {
      component.props.activeClass = validatedData.props.activeClass;
    }

    // Process children recursively - propagate _aiGenerated flag
    if (Array.isArray(validatedData.children)) {
      component.children = validatedData.children.map((child: any) => {
        const processedChild = processComponent(child, id);
        // Ensure _aiGenerated flag propagates to all children
        if (!processedChild.props) processedChild.props = {};
        processedChild.props._aiGenerated = true;
        return processedChild;
      });
    }

    return component;
  };

  // Execute a single build step
  const executeStep = async (
    step: { type: string; message?: string; data?: any },
    stepIndex: number,
    totalSteps: number
  ): Promise<BuildStep> => {
    const buildStep: BuildStep = {
      type: step.type as BuildStep['type'],
      status: 'building',
      message: step.message || `Processing ${step.type}...`,
      data: step.data,
    };

    setCurrentStep(buildStep);
    setBuildSteps((prev) => [...prev, buildStep]);
    setProgress(Math.round(((stepIndex + 1) / totalSteps) * 100));

    // Add delay for visual feedback
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      switch (step.type) {
        case 'progress':
          buildStep.message = step.message || 'Processing...';
          buildStep.status = 'complete';
          break;

        case 'variable':
          if (step.data && currentProjectId) {
            const varData = step.data;
            const scope = varData.scope || 'app';
            
            // Validate page ID for page-scoped variables
            if (scope === 'page' && !currentPage) {
              buildStep.status = 'error';
              buildStep.message = `Cannot create page variable "${varData.name}" - no page selected`;
              break;
            }
            
            buildStep.message = `Creating variable: ${varData.name}`;
            
            try {
              // Check if variable already exists
              const { appVariableDefinitions, pageVariableDefinitions } = useVariableStore.getState();
              
              let existingVariable;
              if (scope === 'page') {
                existingVariable = pageVariableDefinitions.find(
                  v => v.name === varData.name && v.pageId === currentPage
                );
              } else {
                existingVariable = appVariableDefinitions.find(v => v.name === varData.name);
              }
              
              if (existingVariable) {
                // Variable already exists - skip creation but set runtime value
                setVariable(scope, varData.name, varData.initialValue);
                
                buildStep.status = 'complete';
                buildStep.message = `✓ Variable exists: ${varData.name}`;
                break;
              }
              
              // Get current user for variable creation
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                throw new Error('User not authenticated');
              }

              await createVariable({
                appProjectId: currentProjectId,
                userId: user.id,
                name: varData.name,
                scope: scope,
                dataType: varData.dataType || 'string',
                initialValue: varData.initialValue,
                description: varData.description,
                isActive: true,
                preserveOnNavigation: varData.preserveOnNavigation,
                persistToStorage: varData.persistToStorage,
                pageId: currentPage,
              });
              
              // Also set the runtime value
              setVariable(
                scope,
                varData.name,
                varData.initialValue
              );
              
              buildStep.status = 'complete';
              buildStep.message = `✓ Created variable: ${varData.name}`;
            } catch (err) {
              console.error('Error creating variable:', err);
              buildStep.status = 'error';
              buildStep.message = `Failed to create variable: ${varData.name}`;
            }
          } else {
            buildStep.status = 'complete';
          }
          break;

        case 'class':
          if (step.data) {
            const classData = step.data;
            buildStep.message = `Creating class: ${classData.name}`;
            
            try {
              // Get addClass from store state to avoid hook ordering issues
              const { addClass } = useClassStore.getState();
              await addClass(classData.name, classData.styles || {}, false);
              
              buildStep.status = 'complete';
              buildStep.message = `✓ Created class: ${classData.name}`;
            } catch (err) {
              console.error('Error creating class:', err);
              buildStep.status = 'error';
              buildStep.message = `Failed to create class: ${classData.name}`;
            }
          } else {
            buildStep.status = 'complete';
          }
          break;

        case 'component':
          if (step.data) {
            // Debug: Log raw component data before processing
            console.log('[AI Build] Raw component data:', {
              id: step.data.id,
              type: step.data.type,
              childCount: step.data.children?.length || 0,
              propsKeys: Object.keys(step.data.props || {})
            });
            
            const component = processComponent(step.data);
            
            // Debug: Log processed component
            console.log('[AI Build] Processed component:', {
              id: component.id,
              type: component.type,
              childCount: component.children?.length || 0,
              text: component.props?.text,
              content: component.props?.content,
              display: component.props?.display,
              flexDirection: component.props?.flexDirection
            });
            
            buildStep.message = `Adding ${component.type}: ${component.props?.content || component.id}`;
            
            try {
              // Process any image prompts in the component tree
              await processImagePrompts(component);
              
              addComponent(component);
              buildStep.status = 'complete';
              buildStep.message = `✓ Added ${component.type}`;
            } catch (err) {
              console.error('Error adding component:', err);
              buildStep.status = 'error';
              buildStep.message = `Failed to add component`;
            }
          } else {
            buildStep.status = 'complete';
          }
          break;

        case 'binding':
          if (step.data) {
            const { componentId, property, variableBinding, condition } = step.data;
            buildStep.message = `Binding ${property} to ${variableBinding}`;
            
            try {
              if (property === 'visibility') {
                // Visibility conditions
                updateComponent(componentId, {
                  props: {
                    visibility: {
                      variableBinding,
                      operator: condition?.operator || 'equals',
                      value: condition?.value
                    }
                  }
                });
              } else if (property === 'value') {
                // Two-way form binding - set value prop with variable binding
                updateComponent(componentId, {
                  props: {
                    value: variableBinding
                  }
                });
              } else {
                // For other bindings, update the prop directly
                updateComponent(componentId, {
                  props: {
                    [property]: variableBinding
                  }
                });
              }
              
              buildStep.status = 'complete';
              buildStep.message = `✓ Bound ${property}`;
            } catch (err) {
              console.error('Error applying binding:', err);
              buildStep.status = 'error';
              buildStep.message = `Failed to apply binding`;
            }
          } else {
            buildStep.status = 'complete';
          }
          break;

        case 'flow':
          if (step.data) {
            const { componentId, trigger, actions } = step.data;
            buildStep.message = `Creating ${trigger} action flow`;
            
            try {
              // Convert actions to flow format
              const flowNodes = actions.map((action: any, idx: number) => ({
                id: `action-${idx}`,
                type: action.type,
                data: {
                  type: action.type,
                  label: action.type.replace(/-/g, ' '),
                  inputs: action.config || {}
                },
                position: { x: 250, y: 100 + idx * 100 }
              }));
              
              const flowEdges = flowNodes.slice(0, -1).map((_: any, idx: number) => ({
                id: `edge-${idx}`,
                source: `action-${idx}`,
                target: `action-${idx + 1}`
              }));
              
              // Add start node
              flowNodes.unshift({
                id: 'start',
                type: 'start',
                data: { type: 'start', label: 'Start' },
                position: { x: 250, y: 0 }
              });
              
              if (flowNodes.length > 1) {
                flowEdges.unshift({
                  id: 'edge-start',
                  source: 'start',
                  target: 'action-0'
                });
              }
              
              // Update component with action flow
              updateComponent(componentId, {
                actionFlows: {
                  [trigger]: {
                    nodes: flowNodes,
                    edges: flowEdges
                  }
                }
              });
              
              buildStep.status = 'complete';
              buildStep.message = `✓ Created ${trigger} flow with ${actions.length} action(s)`;
            } catch (err) {
              console.error('Error creating flow:', err);
              buildStep.status = 'error';
              buildStep.message = `Failed to create action flow`;
            }
          } else {
            buildStep.status = 'complete';
          }
          break;

        default:
          buildStep.status = 'complete';
      }
    } catch (err) {
      console.error('Step execution error:', err);
      buildStep.status = 'error';
    }

    // Update the step in the list
    setBuildSteps((prev) =>
      prev.map((s, i) => (i === prev.length - 1 ? buildStep : s))
    );

    return buildStep;
  };

  // Locate a matching section on the current canvas for targeted replacement
  const findSectionOnCanvas = (keyword: string, components: AppComponent[]): { index: number; id: string; component: AppComponent } | null => {
    if (!keyword || !components || components.length === 0) return null;
    
    const lowerKw = keyword.toLowerCase();
    
    // Strategy 1: Match by ID (exact or partial)
    const idMatch = components.findIndex(c => {
      const id = (c.id || '').toLowerCase();
      // Match "hero-section", "section-hero", "hero"
      return id === lowerKw || id === `${lowerKw}-section` || id === `section-${lowerKw}` || 
             (id.includes(lowerKw) && c.type === 'section') || 
             (id.includes(lowerKw) && c.type === 'div' && c.id?.includes('section'));
    });
    
    if (idMatch >= 0) {
      console.log(`[Section Match] Found by ID: ${components[idMatch].id} (index ${idMatch})`);
      return { index: idMatch, id: components[idMatch].id, component: components[idMatch] };
    }
    
    // Strategy 2: Match by semantic class
    const classMatch = components.findIndex(c => {
      const classes = (c.props?.appliedClasses || []).map((cls: string) => cls.toLowerCase());
      return classes.some((cls: string) => cls.includes(lowerKw));
    });
    
    if (classMatch >= 0) {
      console.log(`[Section Match] Found by class: ${components[classMatch].id} (index ${classMatch})`);
      return { index: classMatch, id: components[classMatch].id, component: components[classMatch] };
    }
    
    // Strategy 3: Check children content (fallback)
    // Only if we have < 10 sections, otherwise too slow
    if (components.length < 10) {
      const contentMatch = components.findIndex(c => {
        const json = JSON.stringify(c).toLowerCase();
        // Check if keyword appears frequently or in key props
        return json.includes(`"${lowerKw}"`) || json.includes(`${lowerKw} section`);
      });
      
      if (contentMatch >= 0) {
        console.log(`[Section Match] Found by content: ${components[contentMatch].id} (index ${contentMatch})`);
        return { index: contentMatch, id: components[contentMatch].id, component: components[contentMatch] };
      }
    }
    
    return null;
  };

  // Start the build process with batched component rendering
  const startBuild = useCallback(
    async (prompt: string, options?: { forceRebuild?: boolean; isRetry?: boolean }) => {
      console.log('[AI Build] startBuild called with prompt:', prompt.substring(0, 100));
      
      // Set global AI build flag FIRST to prevent class store race conditions
      setIsAIBuilding(true);
      setIsBuilding(true);
      setBuildSteps([]);
      setCurrentStep(null);
      setProgress(0);
      setError(null);
      // Reset overlay progress state for this new build
      clearAIBuildProgress();
      setAIBuildStep('Initializing build…');

      // Reset layout repair indices for unique content on each new generation
      resetProductIndices();
      resetFeatureIndices();
      resetFooterIndices();
      
      // Reset style hash cache for class deduplication
      styleHashToClassRef.current.clear();

      abortControllerRef.current = new AbortController();

      // Streaming: components rendered per-phase instead of batch-at-end
      const streamedComponents: AppComponent[] = []; // Track what's been rendered for final ordering
      const bufferedFooter: AppComponent[] = []; // Buffer footer to render last
      let streamedCount = 0;
      const pendingBindings: Array<{ componentId: string; property: string; variableBinding: string; condition?: any }> = [];
      const pendingFlows: Array<{ componentId: string; trigger: string; actions: any[] }> = [];
      
      // Pending batch — components are collected here during the build and
      // rendered to the canvas in ONE shot at the very end (no per-section updates).
      const pendingBatch: AppComponent[] = [];

      // Helper: Process, repair, sync and COLLECT a single component (no canvas render yet)
      const streamComponentToCanvas = async (component: AppComponent): Promise<void> => {
        // Run per-section QA
        const sanitized = finalLayoutQAPass([component]);
        const comp = sanitized[0] || component;
        
        // Apply layout repairs
        if (repairNavbarInTree(comp)) console.log(`[Stream] Navbar repaired: ${comp.id}`);
        if (repairFeatureCardsInTree(comp)) console.log(`[Stream] Feature cards repaired: ${comp.id}`);
        if (repairProductCardsInTree(comp)) console.log(`[Stream] Product cards repaired: ${comp.id}`);
        if (repairFooterInTree(comp)) console.log(`[Stream] Footer repaired: ${comp.id}`);
        
        // Sanitize empty placeholders
        const cleaned = sanitizeEmptyPlaceholders([comp]);
        if (cleaned.length === 0) return;
        const finalComp = cleaned[0];
        
        // Sync to class store
        await syncAllComponentClasses([finalComp]);
        
        // Process image prompts
        await processImagePrompts(finalComp);
        
        // ── PROGRESSIVE RENDER: immediately append this section to the live canvas ──
        // Non-footer sections are rendered as they arrive so users can watch the page build.
        // The overlay is now a compact top-strip banner, not a full-screen cover, so sections
        // are visible as they appear.
        {
          const { addComponentsBatch } = useAppBuilderStore.getState();
          addComponentsBatch([finalComp], false); // false = append, not replace
        }
        // Also keep in pendingBatch for footer-ordering at the very end
        pendingBatch.push(finalComp);
        streamedComponents.push(finalComp);
        streamedCount++;
        
        // Update sidebar progress with section name (sidebar still shows live progress)
        const sectionName = finalComp.id?.replace(/-section$/, '').replace(/-/g, ' ') || finalComp.type;
        const capitalizedName = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
        setBuildSteps((prev) => [...prev, {
          type: 'component' as BuildStep['type'],
          status: 'complete',
          message: `✓ Planned: ${capitalizedName}`,
          data: { sectionName: capitalizedName, streamedCount },
        }]);

        // ── Real-time overlay progress ──
        addAICompletedStep(capitalizedName);
        setAIBuildStep('');  // clear active step after completion
      };

      try {
        console.log('[AI Build] Entering try block, currentProject:', currentProject?.id, 'currentPage:', currentPage);
        
        // Get context for AI
        const currentPageData = currentProject?.pages.find(
          (p) => p.id === currentPage
        );
        
        // Add initial progress step
        const initStep: BuildStep = {
          type: 'progress',
          status: 'building',
          message: 'Analyzing your request...',
        };
        setBuildSteps([initStep]);

        // ═══════════════════════════════════════════════════════════════
        // MODE DETECTION: Section-Replace vs Full Page vs Focused Append
        // ═══════════════════════════════════════════════════════════════
        
        // Check if this is a section-targeted replacement request
        // Must match "[TARGET SECTION: xxx]" format from ProgressiveAIChat
        const targetSectionMatch = prompt.match(/^\[TARGET SECTION: ([^\]]+)\]/);
        const targetSectionKeyword = targetSectionMatch ? targetSectionMatch[1] : null;
        
        // Try to find the section on canvas
        const matchedSection = targetSectionKeyword 
          ? findSectionOnCanvas(targetSectionKeyword, currentPageData?.components || [])
          : null;
          
        const isSectionReplace = !!matchedSection;
        const hadSectionTarget = !!targetSectionKeyword; // classifier explicitly targeted a section

        // Check if this is a full page build
        // The AI classifier in ProgressiveAIChat now handles intent detection.
        // If it determined a specific section, [TARGET SECTION: xxx] is in the prompt → isSectionReplace=true.
        // If no target section, we check for explicit full-page keywords or default to full-page
        // when there's no existing content on canvas.
        const hasExistingContent = (currentPageData?.components || []).length > 0;
        const isFullPageBuild = !isSectionReplace && (
          options?.forceRebuild || 
          !hasExistingContent ||
          // Only match full-page keywords when the classifier did NOT detect a specific section
          (!hadSectionTarget && (
            /\b(create|build|make|design|generate)\b.*\b(page|website|portfolio|landing|dashboard|app|form|site|homepage|storefront)\b/i.test(prompt) ||
            /\b(page|website|portfolio|landing|homepage|storefront|saas|startup|agency|blog|ecommerce|e-commerce|shop|store|platform)\b/i.test(prompt)
          ))
        );
        
        // Guard: If classifier targeted a section but we couldn't find it on canvas, don't wipe the canvas
        if (hadSectionTarget && !isSectionReplace && hasExistingContent) {
          toast.warning(`Couldn't find the "${targetSectionKeyword}" section. Try clicking it directly on the canvas, then ask your question.`);
          setIsBuilding(false);
          setIsAIBuilding(false);
          return { success: false, error: 'Section not found on canvas' };
        }
        
        console.log(`[AI Build] Mode detected: ${isSectionReplace ? 'SECTION-REPLACE' : isFullPageBuild ? 'FULL-PAGE' : 'FOCUSED-APPEND'}`);

        
        // Get viewport info from store for canvas-aware design
        const { viewport, customCanvasWidth } = useAppBuilderStore.getState();
        const canvasWidth = customCanvasWidth || (viewport === 'desktop' ? 1140 : viewport === 'tablet' ? 768 : 375);
        canvasWidthRef.current = canvasWidth;

        // Seed ID registry (avoid duplicates with existing canvas components for partial builds)
        const seededIds = new Set<string>();
        if (!isFullPageBuild) {
          collectComponentIds(currentPageData?.components || [], seededIds);
        }
        usedIdsRef.current = seededIds;
        
        // Load design tokens and button presets for the current project
        let designTokens: DesignToken[] = [];
        let buttonPresets: ButtonPreset[] = [];
        
        if (currentProject?.id) {
          try {
            [designTokens, buttonPresets] = await Promise.all([
              designTokenService.loadDesignTokens(currentProject.id),
              designTokenService.loadButtonPresets(currentProject.id)
            ]);
            console.log(`[AI Build] Loaded ${designTokens.length} design tokens, ${buttonPresets.length} button presets`);
          } catch (err) {
            console.warn('[AI Build] Could not load design system:', err);
          }
        }
        
        // Filter to only active tokens
        const activeTokens = designTokens.filter(t => t.isActive);
        
        // Generate a design seed for layout variety
        const designSeed = Math.floor(Math.random() * 10000);
        
        // Get selected model from AI sidebar store
        const selectedModel = useAISidebarStore.getState().selectedModel;
        
        const context = {
          existingComponents: isFullPageBuild ? 0 : (currentPageData?.components?.length || 0),
          projectName: currentProject?.name,
          currentPageName: currentPageData?.name,
          // Selected AI model
          model: selectedModel,
          // Design seed for variety
          designSeed: designSeed,
          forceRebuild: options?.forceRebuild || false,
          isRetry: options?.isRetry || false,
          // Viewport context for canvas-aware generation
          viewportContext: {
            currentViewport: viewport || 'desktop',
            canvasWidth: canvasWidth,
            breakpoints: { desktop: 1140, tablet: 768, mobile: 375 }
          },
          // Design system context for AI to use project-specific styles
          designSystem: activeTokens.length > 0 || buttonPresets.length > 0 ? {
            colors: activeTokens.filter(t => t.category === 'color').map(t => ({ name: t.name, value: t.value, description: t.description })),
            fonts: activeTokens.filter(t => t.category === 'font').map(t => ({ name: t.name, value: t.value, description: t.description })),
            spacing: activeTokens.filter(t => t.category === 'spacing').map(t => ({ name: t.name, value: t.value, description: t.description })),
            borders: activeTokens.filter(t => t.category === 'border').map(t => ({ name: t.name, value: t.value, description: t.description })),
            shadows: activeTokens.filter(t => t.category === 'shadow').map(t => ({ name: t.name, value: t.value, description: t.description })),
            buttonPresets: buttonPresets.map(p => ({ name: p.name, variant: p.variant, styles: p.styles, states: p.states }))
          } : undefined
        };

        // Update progress
        setBuildSteps([{ ...initStep, status: 'complete', message: '✓ Analyzed request' }]);

        // ═══════════════════════════════════════════════════════════════
        // CLIENT-SIDE PHASED GENERATION (like AI Wall) — avoids rate limits
        // For full-page builds: get phases, then call each one sequentially
        // For focused builds: single direct call (no multi-phase needed)
        // ═══════════════════════════════════════════════════════════════
        
        let response: any;
        let wasProgressivelyStreamed = false;
        
        if (isSectionReplace && matchedSection) {
          // ═══════════════════════════════════════════════════════════════
          // SECTION REPLACEMENT MODE - Surgical swap of one component
          // ═══════════════════════════════════════════════════════════════
          console.log(`[AI Build] Executing surgical replacement for section: ${targetSectionKeyword}`);
          
          setBuildSteps((prev) => [{ ...prev[0], status: 'complete', message: `✓ Targeting ${targetSectionKeyword} section` }]);
          
          // Clean prompt (remove the target marker)
          const cleanPrompt = prompt.replace(/^\[TARGET SECTION: [^\]]+\]\s*/, '');
          
          // Load the original page design seed so the edited section matches the page's visual identity
          const storedSeed = (() => {
            try {
              const raw = localStorage.getItem(`page-design-seed-${currentProject?.id}-${currentPage}`);
              return raw ? JSON.parse(raw) : null;
            } catch { return null; }
          })();

          // Call edge function with section-edit mode
          const { data, error } = await supabase.functions.invoke('app-builder-ai', {
            body: { 
              prompt: cleanPrompt, 
              context: {
                ...context,
                projectId: currentProject?.id,
                existingSection: matchedSection.component,
                sectionType: targetSectionKeyword,
                // Use the ORIGINAL page design seed so colors/typography stay consistent
                designSeed: storedSeed ?? context.designSeed,
                // Provide adjacent section styles so AI can match them
                neighborSections: buildNeighborContext(
                  currentPageData?.components || [],
                  matchedSection.index
                ),
              }, 
              mode: 'section-edit' 
            }
          });
          
          if (error || !data?.steps || data.steps.length === 0) {
            throw new Error(error?.message || 'Failed to update section');
          }
          
          const newSection = data.steps[0].data;
          if (!newSection) throw new Error('AI returned invalid section data');
          
          // Sanitize and sync classes
          const sanitized = finalLayoutQAPass([newSection]);
          const comp = sanitized[0] || newSection;
          
          // Clean up old classes (optional, but good for hygiene)
          // Clean up old classes (optional, but good for hygiene)
          // We don't delete old classes immediately to avoid flash of unstyled content, 
          // the auto-reconciliation will handle it later
          
          // Sync new classes - using local function defined in this hook
          await syncAllComponentClasses([comp]);
          await processImagePrompts(comp);
          
          // Perform the surgical swap
          const { replaceComponentAtIndex } = useAppBuilderStore.getState();
          if (currentPage) {
            replaceComponentAtIndex(currentPage, matchedSection.index, comp);
            
            setBuildSteps((prev) => [...prev, {
              type: 'component',
              status: 'complete',
              message: `✓ Updated ${targetSectionKeyword} section`,
              data: { sectionName: targetSectionKeyword }
            }]);
          }
          
          // Early return for section-replace -- no further processing needed
          setProgress(100);
          toast.success(`Updated ${targetSectionKeyword} section!`);
          return { success: true, summary: `Updated ${targetSectionKeyword} section` };
          
        } else if (isFullPageBuild) {
          // PHASED APPROACH: mirrors AI Wall's sequential batching
          console.log(`[AI Build] Using client-side phased generation (like AI Wall) with model ${selectedModel}`);
          
          const phasePlanStep: BuildStep = {
            type: 'progress',
            status: 'building',
            message: 'Planning page structure...',
          };
          setBuildSteps((prev) => [...prev, phasePlanStep]);
          setProgress(10);
          
          // Step 1: Get the phase list + design seed from the server
          const { data: phasePlan, error: planError } = await supabase.functions.invoke(
            'app-builder-ai',
            { body: { prompt, context: { ...context, projectId: currentProject?.id }, mode: 'get-phases' } }
          );
          
          if (planError || !phasePlan?.phases) {
            throw new Error(planError?.message || 'Failed to plan page structure');
          }
          
          const phases = phasePlan.phases as Array<{ name: string; sections: string[]; required: boolean; timeoutMs: number; instructions: string }>;
          console.log(`[AI Build] Phase plan: ${phases.map(p => p.name).join(', ')}`);
          
          // Persist the design seed so future section edits can use the same visual identity
          if (phasePlan.designSeed && currentProject?.id && currentPage) {
            localStorage.setItem(
              `page-design-seed-${currentProject.id}-${currentPage}`,
              JSON.stringify(phasePlan.designSeed)
            );
            console.log(`[AI Build] Persisted designSeed=${phasePlan.designSeed} for page ${currentPage}`);
          }
          
          setBuildSteps((prev) => {
            const updated = [...prev];
            const planIdx = updated.findIndex(s => s.message?.includes('Planning'));
            if (planIdx >= 0) updated[planIdx] = { ...updated[planIdx], status: 'complete', message: `✓ Planned ${phases.length} sections` };
            return updated;
          });
          // Tell the overlay how many sections to expect (for "N of M" counter)
          setAITotalSections(phases.length);
          setAIBuildStep(`Planning ${phases.length} sections…`);
          setProgress(15);
          
          // PROGRESSIVE STREAMING: Clear canvas ONCE before streaming begins
          if (currentProject && currentPage) {
            const { setCurrentProject } = useAppBuilderStore.getState();
            const latestProject = useAppBuilderStore.getState().currentProject;
            if (latestProject) {
              const pageData = latestProject.pages.find(p => p.id === currentPage);
              if (pageData?.components && pageData.components.length > 0) {
                const { cleanupDeletedComponentReferences, reconcileOrphanedClasses } = useClassStore.getState();
                const collectAllIds = (components: any[]): string[] => {
                  const ids: string[] = [];
                  for (const comp of components) {
                    if (comp?.id) ids.push(comp.id);
                    if (comp?.children) ids.push(...collectAllIds(comp.children));
                  }
                  return ids;
                };
                const allExistingIds = collectAllIds(pageData.components);
                for (const componentId of allExistingIds) {
                  await cleanupDeletedComponentReferences(componentId);
                }
                if (reconcileOrphanedClasses) await reconcileOrphanedClasses();
              }
              const updatedPages = latestProject.pages.map(page => 
                page.id === currentPage ? { ...page, components: [] } : page
              );
              setCurrentProject({ ...latestProject, pages: updatedPages });
              console.log('[AI Build] Cleared canvas before progressive streaming');
            }
          }
          
          // Step 2: Execute each phase and STREAM components to canvas immediately
          const allSteps: any[] = []; // Still collect for fallback nav/footer injection
          const failedPhases: string[] = [];
          let consecutiveFailures = 0;
          
          for (let i = 0; i < phases.length; i++) {
            if (abortControllerRef.current?.signal.aborted) {
              throw new Error('Build cancelled');
            }
            
            const phase = phases[i];
            const phaseProgress = 15 + Math.round(((i + 1) / phases.length) * 70); // 15-85%
            
            const phaseStep: BuildStep = {
              type: 'progress',
              status: 'building',
              message: `Generating ${phase.name}...`,
            };
            setBuildSteps((prev) => [...prev, phaseStep]);
            // Update overlay active-step label
            setAIBuildStep(`Generating: ${phase.name}…`);
            
            const phaseContext = {
              ...context,
              projectId: currentProject?.id,
              phaseName: phase.name,
              phaseInstructions: phase.instructions,
              phaseSections: phase.sections,
              phaseTimeoutMs: phase.timeoutMs,
              phaseRequired: phase.required,
              designSeed: phasePlan.designSeed,
              designDirective: phasePlan.designDirective,
              blueprintDirective: phasePlan.blueprintDirective,
            };
            
            let phaseSteps: any[] = [];
            let lastPhaseResult: any = null;
            
            try {
              const { data: phaseResult, error: phaseError } = await supabase.functions.invoke(
                'app-builder-ai',
                { body: { prompt, context: phaseContext, mode: 'single-phase' } }
              );
              lastPhaseResult = phaseResult;
              
              if (phaseError) {
                console.warn(`[AI Build] Phase "${phase.name}" invoke error:`, phaseError.message);
                if (phase.required) throw new Error(`Required phase "${phase.name}" failed: ${phaseError.message}`);
                failedPhases.push(phase.name);
              } else if (phaseResult?.isRateLimited) {
                // Required phases get more retries; optional phases fail fast
                const retryDelays = phase.required ? [15000, 30000, 45000] : [10000];
                let retrySuccess = false;
                for (let retryIdx = 0; retryIdx < retryDelays.length; retryIdx++) {
                  console.warn(`[AI Build] Phase "${phase.name}" rate limited, waiting ${retryDelays[retryIdx] / 1000}s for retry ${retryIdx + 1}/${retryDelays.length}...`);
                  await new Promise(r => setTimeout(r, retryDelays[retryIdx]));
                  
                  const { data: retryResult, error: retryError } = await supabase.functions.invoke(
                    'app-builder-ai',
                    { body: { prompt, context: phaseContext, mode: 'single-phase' } }
                  );
                  
                  if (!retryError && !retryResult?.isRateLimited && retryResult?.success && retryResult?.steps) {
                    phaseSteps = retryResult.steps;
                    retrySuccess = true;
                    break;
                  }
                }
                if (!retrySuccess) {
                  if (phase.required) throw new Error(`Required phase "${phase.name}" rate limited after ${retryDelays.length} retries`);
                  failedPhases.push(phase.name);
                }
              } else if (phaseResult?.success && phaseResult?.steps) {
                phaseSteps = phaseResult.steps;
                
                // Surface auth warnings to the user
                if (phaseResult.authError) {
                  toast.warning('AI model API key is invalid or expired. Falling back to other providers. Check your API key settings.');
                }
                
                // If phase returned 0 components but was "recoverable", retry once after 3s
                if (phaseSteps.length === 0 && phaseResult.recoverable && !phase.required) {
                  console.warn(`[AI Build] Phase "${phase.name}" returned 0 components (recoverable), retrying in 3s...`);
                  await new Promise(r => setTimeout(r, 3000));
                  try {
                  const { data: recoverResult } = await supabase.functions.invoke(
                      'app-builder-ai',
                      { body: { prompt, context: { ...phaseContext, retryWithFallback: true }, mode: 'single-phase' } }
                    );
                    if (recoverResult?.success && recoverResult?.steps?.length > 0) {
                      phaseSteps = recoverResult.steps;
                      console.log(`[AI Build] Recovery retry for "${phase.name}" succeeded with ${phaseSteps.length} steps`);
                    } else {
                      console.warn(`[AI Build] Recovery retry for "${phase.name}" also returned empty`);
                      failedPhases.push(phase.name);
                    }
                  } catch (recoverErr: any) {
                    console.warn(`[AI Build] Recovery retry for "${phase.name}" failed:`, recoverErr.message);
                    failedPhases.push(phase.name);
                  }
                }
              } else if (!phaseResult?.success) {
                if (phase.required) throw new Error(phaseResult?.error || `Phase "${phase.name}" failed`);
                failedPhases.push(phase.name);
              }
            } catch (phaseErr: any) {
              console.error(`[AI Build] Phase "${phase.name}" exception:`, phaseErr.message);
              if (phase.required) throw phaseErr;
              failedPhases.push(phase.name);
            }
            
            // STREAM: Process and render this phase's components IMMEDIATELY
            allSteps.push(...phaseSteps);
            
            for (const step of phaseSteps) {
              if (step.type === 'component' && step.data && typeof step.data === 'object' && step.data.type) {
                const component = processComponent(step.data);
                if (component.props?._invalid) continue;
                
                const isFooter = String(component.id || '').toLowerCase().includes('footer');
                
                if (isFooter) {
                  // Buffer footer to render last
                  bufferedFooter.push(component);
                  console.log(`[AI Build Stream] Buffered footer: ${component.id}`);
                } else {
                  await streamComponentToCanvas(component);
                  console.log(`[AI Build Stream] Streamed section ${streamedCount}: ${component.id}`);
                }
              } else if (step.type === 'binding' && step.data) {
                pendingBindings.push(step.data);
              } else if (step.type === 'flow' && step.data) {
                pendingFlows.push(step.data);
              } else if (step.type === 'variable' || step.type === 'class') {
                await executeStep(step, 0, 1);
              }
            }
            
            // Update progress — only show success if components were actually produced
            setProgress(phaseProgress);
            setBuildSteps((prev) => {
              const updated = [...prev];
              let idx = -1;
              for (let j = updated.length - 1; j >= 0; j--) { if (updated[j].message?.includes(phase.name) && updated[j].message?.includes('Generating')) { idx = j; break; } }
              if (idx >= 0) {
                if (phaseSteps.length > 0) {
                  updated[idx] = { ...updated[idx], status: 'complete', message: `✓ Generated ${phase.name}` };
                } else {
                  const failReason = lastPhaseResult?.warning?.includes('truncat') || lastPhaseResult?.warning?.includes('parse')
                    ? 'output truncated (JSON parse failed)'
                    : lastPhaseResult?.authError
                    ? 'API key invalid'
                    : 'no output returned';
                  updated[idx] = { ...updated[idx], status: 'error', message: `Failed: ${phase.name} (${failReason})` };
                }
              }
              return updated;
            });
            
            console.log(`[AI Build] Phase ${i + 1}/${phases.length} "${phase.name}" done — ${streamedCount} streamed, ${bufferedFooter.length} buffered`);
            
            // Show next section name in the banner so users know what's coming next
            const nextPhase = phases[i + 1];
            if (nextPhase) {
              setAINextSectionName(nextPhase.name);
              setAIBuildStep(`Generating: ${nextPhase.name}…`);
            } else {
              setAINextSectionName('');
            }
            
            // Early termination: if 3+ consecutive non-required phases fail, stop the loop
            // (Increased from 2 to 3 to allow recovery from transient truncation issues)
            if (phaseSteps.length === 0 && !phase.required) {
              consecutiveFailures++;
              if (consecutiveFailures >= 3) {
                toast.error('Multiple sections failed to generate. Try again or switch to a different AI model.', { duration: 8000 });
                break;
              }
            } else {
              consecutiveFailures = 0;
            }
            
            // Inter-phase delay to avoid hitting rate limits across sequential phases
            if (i < phases.length - 1) {
              await new Promise(r => setTimeout(r, 3000));
            }
          }
          
          // ═══════════════════════════════════════════════════════════════
          // GENERATION HEALTH CHECK — warn if too many phases failed
          // ═══════════════════════════════════════════════════════════════
          if (failedPhases.length >= 3) {
            toast.warning(`${failedPhases.length} sections failed to generate. Your selected AI model may not be working correctly. Try a different model or check your API key settings.`, { duration: 8000 });
          }
          
          // ═══════════════════════════════════════════════════════════════
          // MINIMUM SECTION GUARANTEE — retry failed phases and stream results
          // ═══════════════════════════════════════════════════════════════
          if (failedPhases.length > 0 && streamedCount < 5) {
            console.log(`[AI Build] Only ${streamedCount} sections streamed with ${failedPhases.length} failed phases. Retrying...`);
            
            for (const failedPhaseName of failedPhases) {
              if (abortControllerRef.current?.signal.aborted) break;
              
              const failedPhase = phases.find(p => p.name === failedPhaseName);
              if (!failedPhase) continue;
              
              await new Promise(r => setTimeout(r, 2000));
              
              const retryContext = {
                ...context,
                projectId: currentProject?.id,
                phaseName: failedPhase.name,
                phaseInstructions: failedPhase.instructions,
                phaseSections: failedPhase.sections,
                phaseTimeoutMs: failedPhase.timeoutMs,
                phaseRequired: failedPhase.required,
                designSeed: phasePlan.designSeed,
                designDirective: phasePlan.designDirective,
                blueprintDirective: phasePlan.blueprintDirective,
              };
              
              try {
                const { data: retryResult } = await supabase.functions.invoke(
                  'app-builder-ai',
                  { body: { prompt, context: retryContext, mode: 'single-phase' } }
                );
                if (retryResult?.success && retryResult?.steps?.length > 0) {
                  for (const step of retryResult.steps) {
                    if (step.type === 'component' && step.data?.type) {
                      const component = processComponent(step.data);
                      if (!component.props?._invalid) {
                        const isFooter = String(component.id || '').toLowerCase().includes('footer');
                        if (isFooter) {
                          bufferedFooter.push(component);
                        } else {
                          await streamComponentToCanvas(component);
                        }
                      }
                    }
                  }
                }
              } catch (retryErr: any) {
                console.warn(`[AI Build] Retry of "${failedPhaseName}" also failed:`, retryErr.message);
              }
            }
          }

          // ═══════════════════════════════════════════════════════════════
          // SAFETY NET: Inject nav/footer if missing, then stream them
          // ═══════════════════════════════════════════════════════════════
          const hasNavbar = streamedComponents.some(c => {
            const id = String(c.id || '').toLowerCase();
            return id.includes('nav') || id.includes('header');
          });
          
          const seedColors = phasePlan.designSeed || {};
          const accentColor = seedColors.colorMood?.accent || '#3b82f6';
          const textColor = seedColors.colorMood?.text || '#1e293b';
          const surfaceColor = seedColors.colorMood?.surface || '#ffffff';
          
          if (!hasNavbar) {
            console.log('[AI Build] No navbar detected — streaming fallback navbar');
            const navComponent = processComponent({
              id: 'nav-section',
              type: 'section',
              props: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                position: 'sticky',
                top: '0',
                zIndex: '50',
                backgroundColor: { type: 'solid', value: surfaceColor, opacity: 100 },
                spacingControl: { padding: { top: '16', right: '32', bottom: '16', left: '32', unit: 'px' } },
                boxShadows: [{ enabled: true, type: 'outer', x: 0, y: 1, blur: 3, spread: 0, color: 'rgba(0,0,0,0.1)' }],
              },
              children: [
                { id: 'nav-logo', type: 'heading', props: { text: 'Brand', typography: { fontSize: '20', fontWeight: '700', color: textColor } }, children: [] },
                {
                  id: 'nav-links-container', type: 'div',
                  props: { display: 'flex', gap: '24', alignItems: 'center' },
                  children: [
                    { id: 'nav-link-1', type: 'text', props: { text: 'Features', typography: { fontSize: '14', fontWeight: '500', color: textColor } }, children: [] },
                    { id: 'nav-link-2', type: 'text', props: { text: 'Pricing', typography: { fontSize: '14', fontWeight: '500', color: textColor } }, children: [] },
                    { id: 'nav-link-3', type: 'text', props: { text: 'About', typography: { fontSize: '14', fontWeight: '500', color: textColor } }, children: [] },
                    { id: 'nav-cta', type: 'button', props: { text: 'Get Started', backgroundColor: { type: 'solid', value: accentColor, opacity: 100 }, typography: { fontSize: '14', fontWeight: '600', color: '#ffffff' }, borderRadius: { topLeft: '8', topRight: '8', bottomRight: '8', bottomLeft: '8', unit: 'px' }, spacingControl: { padding: { top: '8', right: '20', bottom: '8', left: '20', unit: 'px' } } }, children: [] },
                  ],
                },
              ],
            });
            // Prepend nav — we need to reorder after
            await streamComponentToCanvas(navComponent);
          }
          
          // Stream buffered footer LAST
          if (bufferedFooter.length > 0) {
            for (const footer of bufferedFooter) {
              await streamComponentToCanvas(footer);
            }
          } else {
            // No footer generated — inject fallback
            console.log('[AI Build] No footer detected — streaming fallback footer');
            const footerDark = '#0f172a';
            const projectName = prompt?.split(/\s+/).slice(0, 3).join(' ') || 'Brand';
            const footerComponent = processComponent({
              id: 'footer-section', type: 'section', _aiGenerated: true,
              props: {
                display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '0',
                backgroundColor: { type: 'solid', value: footerDark, opacity: 100 },
                spacingControl: { padding: { top: '64', right: '24', bottom: '32', left: '24', unit: 'px' } },
              },
              children: [
                { id: 'footer-brand', type: 'heading', props: { content: projectName, tag: 'h3', typography: { fontSize: '22', fontWeight: '700', color: '#ffffff' } }, children: [] },
                { id: 'footer-copyright', type: 'text', props: { content: `© ${new Date().getFullYear()} ${projectName}. All rights reserved.`, typography: { fontSize: '13', color: 'rgba(255,255,255,0.4)' } }, children: [] },
              ],
            });
            await streamComponentToCanvas(footerComponent);
          }
          
          if (streamedCount === 0) {
            throw new Error('No components generated across any phase');
          }

          // ── Progressive rendering: sections already on canvas as they were generated.
          // Only the buffered footer needs to be appended now (at the very end to ensure ordering).
          setAINextSectionName('');
          if (bufferedFooter.length > 0) {
            const { addComponentsBatch } = useAppBuilderStore.getState();
            addComponentsBatch(bufferedFooter, false); // false = append, not replace
            console.log(`[AI Build] Footer appended last: ${bufferedFooter.length} section(s)`);
          }
          
          console.log(`[AI Build] Progressive render complete: ${streamedCount} sections already on canvas`);
          
          // Skip to bindings/flows (no per-section batch processing needed)
          response = { success: true, steps: [], summary: `Built ${streamedCount} sections` };
          wasProgressivelyStreamed = true;
          
        } else {
          // SINGLE-CALL APPROACH for focused/component builds (no multi-phase needed)
          console.log(`[AI Build] Direct call to app-builder-ai with model ${selectedModel}`);
          
          const buildingStep: BuildStep = {
            type: 'progress',
            status: 'building',
            message: 'AI is generating your component...',
          };
          setBuildSteps((prev) => [...prev, buildingStep]);
          setProgress(20);
          
          const { data: directResponse, error: invokeError } = await supabase.functions.invoke(
            'app-builder-ai',
            { body: { prompt, context: { ...context, projectId: currentProject?.id } } }
          );
          
          if (invokeError) {
            console.error('[AI Build] Edge function error:', invokeError);
            const errorMessage = invokeError.message?.toLowerCase() || '';
            const isTimeoutError = errorMessage.includes('failed to send') || errorMessage.includes('failed to fetch') || errorMessage.includes('timeout') || errorMessage.includes('network') || errorMessage.includes('504');
            if (isTimeoutError) {
              throw new Error('Request timed out. Please try again — generation times can vary. You can also try a shorter prompt.');
            }
            throw new Error(invokeError.message || 'AI generation failed');
          }
          
          response = directResponse;
        }
        
        if (!response) {
          throw new Error('Empty response from AI');
        }

        // If sections were already progressively streamed to canvas, skip batch processing entirely
        if (wasProgressivelyStreamed) {
          console.log('[AI Build] Skipping batch processing — sections already streamed to canvas');
          
          // Mark building step as complete
          setBuildSteps((prev) => {
            const updated = [...prev];
            const aiGeneratingIndex = updated.findIndex(s => 
              (s.message === 'AI is generating your page...' || s.message === 'AI is generating your component...') && s.status === 'building'
            );
            if (aiGeneratingIndex >= 0) {
              updated[aiGeneratingIndex] = { ...updated[aiGeneratingIndex], status: 'complete', message: '✓ AI generation complete' };
            }
            return updated;
          });
        } else {
        // NON-STREAMED BATCH PROCESSING PATH (single-call builds only)
        
        // Handle timeout responses that came back with 200 status
        if (response.isTimeout) {
          throw new Error(response.suggestion || 'Request timed out. Try switching to "Gemini 3.1 Flash" for faster generation.');
        }
        
        console.log('[AI Build] Response received');
        
        // Mark building step as complete
        setBuildSteps((prev) => {
          const updated = [...prev];
          const aiGeneratingIndex = updated.findIndex(s => 
            (s.message === 'AI is generating your page...' || s.message === 'AI is generating your component...') && s.status === 'building'
          );
          if (aiGeneratingIndex >= 0) {
            updated[aiGeneratingIndex] = { ...updated[aiGeneratingIndex], status: 'complete', message: '✓ AI generation complete' };
          }
          return updated;
        });
        
        const componentCount = response.steps?.filter((s: any) => s.type === 'component').length || 0;
        
        console.log('[AI Build] Response received:', {
          success: response.success,
          action: (response as any).action,
          stepCount: response.steps?.length || 0,
          componentStepCount: componentCount,
          warning: (response as any).warning
        });

        if (!response.success) {
          throw new Error(response.error || 'Build failed');
        }
        
        // Handle chat-only response FIRST
        if ((response as any).action === 'chat') {
          const isParseIssue = response.message?.includes('encountered an issue') || response.message?.includes('Unable to generate');
          if (isParseIssue) {
            console.warn('[AI Build] Backend returned chat fallback due to parse issue');
            throw new Error('AI response could not be processed. Please try again — results vary between attempts.');
          }
          const chatStep: BuildStep = { type: 'progress', status: 'complete', message: response.message || 'Completed' };
          setBuildSteps([chatStep]);
          setProgress(100);
          return { success: true, message: response.message };
        }
        
        // Check for empty response
        if (response.success && (!response.steps || response.steps.length === 0)) {
          throw new Error('AI returned an empty response. Please try again with a different prompt or model.');
        }
        
        // Check for zero components
        if (response.success && componentCount === 0) {
          throw new Error('AI failed to generate any components. Please try with a clearer prompt.');
        }

        // For single-call (non-streamed) builds, use batch collection
        const pendingComponents: AppComponent[] = [];
        
        // PHASE 1: Process all steps - collect components but don't add to canvas yet
        const steps = response.steps;
        const totalSteps = steps.length;
        
        // Progress step for generation
        const genStep: BuildStep = {
          type: 'progress',
          status: 'building',
          message: 'Generating components...',
        };
        setBuildSteps((prev) => [...prev, genStep]);

        for (let i = 0; i < steps.length; i++) {
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error('Build cancelled');
          }
          
          const step = steps[i];
          const stepProgress = Math.round(((i + 1) / totalSteps) * 70); // 0-70% for generation
          setProgress(stepProgress);
          
          // Handle different step types
          switch (step.type) {
            case 'progress':
              // Just update message
              break;
              
            case 'variable':
            case 'class':
              // Execute immediately (these don't affect layout)
              await executeStep(step, i, totalSteps);
              break;
              
            case 'component':
              // Validate component data before processing
              if (step.data && typeof step.data === 'object' && step.data.type) {
                const component = processComponent(step.data);
                // Skip invalid placeholder components
                if (component.props?._invalid) {
                  console.warn('[AI Build] Skipping invalid placeholder component');
                  break;
                }
                // Process image prompts
                await processImagePrompts(component);
                // Collect for batch addition
                pendingComponents.push(component);
                
                setBuildSteps((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    message: `Generating: ${component.type}...`,
                  };
                  return updated;
                });
              } else {
                console.warn('[AI Build] Skipping invalid component step:', step.data);
              }
              break;
              
            case 'binding':
              if (step.data) {
                pendingBindings.push(step.data);
              }
              break;
              
            case 'flow':
              if (step.data) {
                pendingFlows.push(step.data);
              }
              break;
          }
        }

        // Mark generation step as complete
        setBuildSteps((prev) => {
          const updated = [...prev];
          const genStepIndex = updated.findIndex(s => s.message?.includes('Generating'));
          if (genStepIndex >= 0) {
            updated[genStepIndex] = { ...updated[genStepIndex], status: 'complete', message: `✓ Generated ${pendingComponents.length} component(s)` };
          }
          return updated;
        });
        
        // CLIENT-SIDE RETRY: If 0 components were generated and this isn't already a retry
        if (pendingComponents.length === 0 && !options?.isRetry) {
          console.warn('[AI Build] 0 components generated, triggering client-side retry');
          
          const retryStep: BuildStep = {
            type: 'progress',
            status: 'building',
            message: 'No components generated, retrying...',
          };
          setBuildSteps((prev) => [...prev, retryStep]);
          
          const enhancedPrompt = `${prompt}\n\nCRITICAL: You MUST generate components. Create a complete page with navigation, hero section, content sections, and footer. Return valid JSON with component steps.`;
          
          return startBuild(enhancedPrompt, {
            ...options,
            forceRebuild: true,
            isRetry: true
          });
        }
        
        // If retry also failed, show clear error
        if (pendingComponents.length === 0 && options?.isRetry) {
          console.error('[AI Build] Retry also produced 0 components');
          throw new Error('AI generation failed after retry. Please try again with a more specific prompt.');
        }

        // PHASE 2: Run final QA pass to sanitize layout issues
        setProgress(75);
        const validateStep: BuildStep = {
          type: 'progress',
          status: 'building',
          message: 'Validating layout...',
        };
        setBuildSteps((prev) => [...prev, validateStep]);

        // PHASE D: Apply final layout QA pass to all pending components
        const sanitizedComponents = finalLayoutQAPass(pendingComponents);
        // Replace pending with sanitized
        pendingComponents.length = 0;
        pendingComponents.push(...sanitizedComponents);
        console.log(`[AI Build] Layout QA pass completed on ${sanitizedComponents.length} components`);

        // PHASE 3: Clear canvas AND cleanup class references BEFORE rendering new components
        if (isFullPageBuild && currentProject && currentPage && pendingComponents.length > 0) {
          // Safety net: don't clear canvas if we generated fewer than 2 components for a full page
          if (pendingComponents.length < 2) {
            console.warn(`[AI Build] Only ${pendingComponents.length} components generated for full-page build — skipping canvas clear to avoid empty page`);
            toast.warning('Build produced fewer sections than expected. Your existing design was preserved. Try again with a more detailed prompt.');
          } else {
            const { setCurrentProject } = useAppBuilderStore.getState();
            const latestProject = useAppBuilderStore.getState().currentProject;
            if (latestProject) {
              const pageData = latestProject.pages.find(p => p.id === currentPage);
              
              // CRITICAL FIX: Cleanup class references for ALL existing components BEFORE clearing
              if (pageData?.components && pageData.components.length > 0) {
                const { cleanupDeletedComponentReferences, reconcileOrphanedClasses } = useClassStore.getState();
                
                // Collect ALL component IDs recursively (including nested children)
                const collectAllIds = (components: any[]): string[] => {
                  const ids: string[] = [];
                  for (const comp of components) {
                    if (comp?.id) ids.push(comp.id);
                    if (comp?.children) ids.push(...collectAllIds(comp.children));
                  }
                  return ids;
                };
                
                const allExistingIds = collectAllIds(pageData.components);
                console.log(`[AI Build] Cleaning up ${allExistingIds.length} component class references before rebuild`);
                
                // Clean up class references for each deleted component
                for (const componentId of allExistingIds) {
                  await cleanupDeletedComponentReferences(componentId);
                }
                
                // Run reconciliation pass to ensure no orphaned classes remain
                if (reconcileOrphanedClasses) {
                  await reconcileOrphanedClasses();
                }
              }
              
              const updatedPages = latestProject.pages.map(page => {
                if (page.id === currentPage) {
                  return { ...page, components: [] }; // Clear existing components
                }
                return page;
              });
              setCurrentProject({ ...latestProject, pages: updatedPages });
              console.log('[AI Build] Cleared canvas before batch render (class references cleaned)');
            }
          }
        }

        // Mark validation step as complete
        setBuildSteps((prev) => {
          const updated = [...prev];
          const validateIndex = updated.findIndex(s => s.message?.includes('Validating'));
          if (validateIndex >= 0) {
            updated[validateIndex] = { ...updated[validateIndex], status: 'complete', message: '✓ Validated layout' };
          }
          return updated;
        });

        // PHASE 2.5: Class sync moved to AFTER all transformations (Phase 4.9.2)

        // PHASE 4: Batch render all components at once
        setProgress(85);
        const renderStep: BuildStep = {
          type: 'progress',
          status: 'building',
          message: `Rendering ${pendingComponents.length} component(s)...`,
        };
        setBuildSteps((prev) => [...prev, renderStep]);

        // Auto-create page variables from AI-generated bindings
        const extractAndCreateVariables = async (components: AppComponent[]) => {
          const pageBindings = new Set<string>();
          
          // Recursively extract all {{page.xxx}} bindings from component tree
          const scanComponent = (comp: AppComponent) => {
            const propsToScan = ['content', 'text', 'children', 'label', 'placeholder', 'value'];
            for (const prop of propsToScan) {
              const value = (comp.props as any)?.[prop];
              if (typeof value === 'string') {
                const matches = value.matchAll(/\{\{page\.([^}|]+)/g);
                for (const match of matches) {
                  pageBindings.add(match[1]);
                }
              }
            }
            comp.children?.forEach(scanComponent);
          };
          
          components.forEach(scanComponent);
          
          // Create missing page variables
          for (const varName of pageBindings) {
            try {
              // Determine a sensible default value based on variable name
              let defaultValue = '';
              if (varName.toLowerCase().includes('name')) defaultValue = 'Your Name';
              else if (varName.toLowerCase().includes('title')) defaultValue = 'Your Title';
              else if (varName.toLowerCase().includes('email')) defaultValue = 'email@example.com';
              else if (varName.toLowerCase().includes('description')) defaultValue = 'Description text';
              
              await createVariable({
                scope: 'page',
                name: varName,
                dataType: 'string',
                initialValue: defaultValue,
                appProjectId: currentProjectId || currentProject?.id || '',
                pageId: currentPage || '',
                userId: '', // Will be set by the store
                isActive: true,
              });
              console.log(`[AI Build] Auto-created page variable: ${varName}`);
            } catch (err) {
              // Variable may already exist, which is fine
              console.log(`[AI Build] Variable ${varName} may already exist`);
            }
          }
        };
        
        // Extract and create variables before adding components
        await extractAndCreateVariables(pendingComponents);
        
        // Allow class store state to propagate before rendering components
        // This prevents the race condition where components render before CSS is injected
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // PHASE 4.7: Remove empty placeholder images and divs (cyan boxes)
        const placeholderSanitized = sanitizeEmptyPlaceholders(pendingComponents);
        console.log(`[AI Build] Placeholder sanitization: ${pendingComponents.length} → ${placeholderSanitized.length} components`);
        
        // PHASE 4.8: Enforce correct section order (footer last, contact before footer, etc.)
        const orderedComponents = enforceCorrectSectionOrder(placeholderSanitized);
        console.log(`[AI Build] Section ordering enforced for ${orderedComponents.length} components`);
        
        // PHASE 4.9: Apply layout repairs BEFORE rendering
        // This fixes product images, grid alignment, card shadows, testimonial avatars, etc.
        // Running repairs here ensures first render is perfect without needing page refresh
        console.log(`[AI Build] Applying layout repairs to ${orderedComponents.length} components...`);
        let totalRepairs = 0;
        
        // NEW: Validate and fix navbar responsive behavior
        const enforceNavbarResponsiveBehavior = (component: AppComponent): boolean => {
          let fixed = false;
          
          const processComponent = (comp: AppComponent): void => {
            const props = comp.props || {};
            const idLower = String(comp.id || '').toLowerCase();
            
            // Detect hamburger/mobile menu buttons
            const isHamburgerButton = (
              idLower.includes('hamburger') ||
              idLower.includes('mobile-menu') ||
              idLower.includes('nav-mobile') ||
              (comp.type === 'button' && props.iconName === 'Menu')
            );
            
            if (isHamburgerButton) {
              // ENFORCE: Hamburger must be hidden on desktop
              if (props.display !== 'none') {
                props.display = 'none';
                fixed = true;
                console.log(`[Navbar Fix] Enforced display:none on hamburger: ${comp.id}`);
              }
              // ENFORCE: Hamburger must show on mobile
              props.mobileStyles = props.mobileStyles || {};
              if (props.mobileStyles.display !== 'flex') {
                props.mobileStyles.display = 'flex';
                fixed = true;
                console.log(`[Navbar Fix] Enforced mobileStyles.display:flex on hamburger: ${comp.id}`);
              }
              comp.props = props;
            }
            
            // Detect nav-links containers
            const isNavLinks = (
              idLower.includes('nav-links') ||
              idLower.includes('nav-menu') ||
              idLower.includes('nav-items')
            ) && (comp.type === 'div' || comp.type === 'container');
            
            if (isNavLinks) {
              // ENFORCE: Nav links must be visible on desktop
              if (props.display !== 'flex') {
                props.display = 'flex';
                props.flexDirection = props.flexDirection || 'row';
                props.alignItems = props.alignItems || 'center';
                props.gap = props.gap || '32';
                fixed = true;
                console.log(`[Navbar Fix] Enforced flex layout on nav-links: ${comp.id}`);
              }
              // ENFORCE: Nav links must hide on mobile
              props.mobileStyles = props.mobileStyles || {};
              if (props.mobileStyles.display !== 'none') {
                props.mobileStyles.display = 'none';
                fixed = true;
                console.log(`[Navbar Fix] Enforced mobileStyles.display:none on nav-links: ${comp.id}`);
              }
              comp.props = props;
            }
            
            // Recursively process children
            if (comp.children?.length) {
              comp.children.forEach(processComponent);
            }
          };
          
          processComponent(component);
          return fixed;
        };
        
        const applyLayoutRepairs = (component: AppComponent): void => {
          // Repair navbar structure FIRST (logo-left, nav-links-grouped, hamburger-right)
          if (repairNavbarInTree(component)) {
            totalRepairs++;
          }
          
          // Repair feature cards (grid alignment, icon containers, card styling)
          if (repairFeatureCardsInTree(component)) {
            totalRepairs++;
          }
          
          // Repair product/testimonial cards (inject images, fix shadows, add avatars)
          if (repairProductCardsInTree(component)) {
            totalRepairs++;
          }
          
          // Repair footer sections (dark background, 4-column grid, link colors)
          if (repairFooterInTree(component)) {
            totalRepairs++;
          }
        };
        
        // Apply repairs to all top-level components (recursively handles children)
        for (const component of orderedComponents) {
          applyLayoutRepairs(component);
        }
        
        // PHASE 4.9.1: Enforce navbar responsive behavior
        // This ensures hamburger is hidden on desktop and nav-links are hidden on mobile
        let navbarFixes = 0;
        for (const component of orderedComponents) {
          if (enforceNavbarResponsiveBehavior(component)) {
            navbarFixes++;
          }
        }
        
        if (totalRepairs > 0 || navbarFixes > 0) {
          console.log(`[AI Build] Layout repairs applied: ${totalRepairs} components fixed, ${navbarFixes} navbar fixes before render`);
        }
        
        // PHASE 4.9.2: Sync component styles to class store AFTER all transformations
        // This ensures hydrated sections, repaired cards, and navbar fixes all get proper classes
        setProgress(78);
        const classSyncStep: BuildStep = {
          type: 'class' as BuildStep['type'],
          status: 'building',
          message: 'Syncing component styles to classes...',
        };
        setBuildSteps((prev) => [...prev, classSyncStep]);

        // Sync all component styles to classes - this assigns semantic class names
        await syncAllComponentClasses(orderedComponents);
        console.log(`[AI Build] Class sync completed for ${orderedComponents.length} component trees (after all transformations)`);

        // Mark class sync step as complete
        setBuildSteps((prev) => {
          const updated = [...prev];
          const syncIndex = updated.findIndex(s => s.message?.includes('Syncing component styles'));
          if (syncIndex >= 0) {
            updated[syncIndex] = { ...updated[syncIndex], status: 'complete', message: '✓ Classes synchronized' };
          }
          return updated;
        });
        
        const finalComponents = orderedComponents;
        console.log(`[AI Build] All phases complete: ${finalComponents.length} components ready for render`);
        
        // Add all components in a single batch using batch persistence
        // This prevents race conditions where individual saves could overwrite each other
        const { addComponentsBatch } = useAppBuilderStore.getState();
        addComponentsBatch(finalComponents, true); // true = clear existing first (already done above, but ensures atomic operation)
        
        // Mark render step as complete
        setBuildSteps((prev) => {
          const updated = [...prev];
          const renderIndex = updated.findIndex(s => s.message?.includes('Rendering'));
          if (renderIndex >= 0) {
            updated[renderIndex] = { ...updated[renderIndex], status: 'complete', message: `✓ Rendered ${isFullPageBuild ? streamedCount : pendingComponents.length} component(s)` };
          }
          return updated;
        });
        } // end of !wasProgressivelyStreamed batch processing block

        setProgress(90);

        // PHASE 5: Apply bindings after all components exist
        for (const binding of pendingBindings) {
          const { componentId, property, variableBinding, condition } = binding;
          try {
            if (property === 'visibility') {
              updateComponent(componentId, {
                props: {
                  visibility: {
                    variableBinding,
                    operator: condition?.operator || 'equals',
                    value: condition?.value
                  }
                }
              });
            } else if (property === 'value') {
              updateComponent(componentId, {
                props: { value: variableBinding }
              });
            } else {
              updateComponent(componentId, {
                props: { [property]: variableBinding }
              });
            }
          } catch (err) {
            console.error('Error applying binding:', err);
          }
        }

        setProgress(95);

        // PHASE 6: Apply flows after bindings
        for (const flow of pendingFlows) {
          const { componentId, trigger, actions } = flow;
          try {
            const flowNodes = actions.map((action: any, idx: number) => ({
              id: `action-${idx}`,
              type: action.type,
              data: {
                type: action.type,
                label: action.type.replace(/-/g, ' '),
                inputs: action.config || {}
              },
              position: { x: 250, y: 100 + idx * 100 }
            }));
            
            const flowEdges = flowNodes.slice(0, -1).map((_: any, idx: number) => ({
              id: `edge-${idx}`,
              source: `action-${idx}`,
              target: `action-${idx + 1}`
            }));
            
            flowNodes.unshift({
              id: 'start',
              type: 'start',
              data: { type: 'start', label: 'Start', inputs: {} },
              position: { x: 250, y: 0 }
            });
            
            if (flowNodes.length > 1) {
              flowEdges.unshift({
                id: 'edge-start',
                source: 'start',
                target: 'action-0'
              });
            }
            
            updateComponent(componentId, {
              actionFlows: {
                [trigger]: { nodes: flowNodes, edges: flowEdges }
              }
            });
          } catch (err) {
            console.error('Error creating flow:', err);
          }
        }

        // Final success
        setProgress(100);
        const summaryStep: BuildStep = {
          type: 'progress',
          status: 'complete',
          message: response.summary || `✓ Built ${isFullPageBuild ? streamedCount : 0} component(s)!`,
        };
        setBuildSteps((prev) => [...prev, summaryStep]);

        toast.success('App built successfully!');
        return { success: true, summary: response.summary };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Build failed';
        setError(errorMessage);

        // ✅ Partial preservation: if sections were already collected, render them
        // before showing the error so the user can see what was generated.
        if (pendingBatch.length > 0) {
          console.log(`[AI Build] Partial render on error: ${pendingBatch.length} sections collected`);
          try {
            const orderedPartial = enforceCorrectSectionOrder([...pendingBatch]);
            const { addComponentsBatch } = useAppBuilderStore.getState();
            addComponentsBatch(orderedPartial, true);
          } catch (renderErr) {
            console.error('[AI Build] Failed to render partial batch:', renderErr);
          }
          const errorStep: BuildStep = {
            type: 'progress',
            status: 'error',
            message: `Partial result: ${pendingBatch.length} section(s) generated. Some sections failed (${errorMessage}).`,
          };
          setBuildSteps((prev) => [...prev, errorStep]);
        } else {
          const errorStep: BuildStep = {
            type: 'progress',
            status: 'error',
            message: `Error: ${errorMessage}`,
          };
          setBuildSteps((prev) => [...prev, errorStep]);
        }

        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        // Clear global AI build flag to allow class operations to resume
        setIsAIBuilding(false);
        setIsBuilding(false);
        setCurrentStep(null);
      }
    },
    [currentProject, currentPage, addComponent, updateComponent, createVariable, setVariable, currentProjectId, executeStep, processComponent, processImagePrompts]
  );

  // Cancel the build
  const cancelBuild = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsBuilding(false);
    setCurrentStep(null);
    toast.info('Build cancelled');
  }, []);

  // Reset build state
  const resetBuild = useCallback(() => {
    setBuildSteps([]);
    setCurrentStep(null);
    setProgress(0);
    setError(null);
  }, []);

  return {
    isBuilding,
    buildSteps,
    currentStep,
    progress,
    error,
    startBuild,
    cancelBuild,
    resetBuild,
  };
}
