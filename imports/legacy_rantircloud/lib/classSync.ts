/**
 * Standalone class sync utility for importing components into the builder.
 * Extracted from useAIAppBuildStream to be reusable by AI Wall imports, 
 * file imports, and other entry points.
 */

import { useClassStore } from '@/stores/classStore';
import { generateStyleHash } from '@/lib/autoClassSystem';
import { AppComponent } from '@/types/appBuilder';

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC CLASS NAME CONSTANTS (mirror useAIAppBuildStream)
// ═══════════════════════════════════════════════════════════════════════════════

const PRESERVE_SEMANTIC_NAMES = new Set([
  'body-text', 'hero-text', 'card-description', 'footer-text', 'nav-text',
  'testimonial-text', 'feature-text', 'section-text',
  'card-title', 'hero-title', 'section-title', 'feature-title', 'footer-title',
  'nav-title', 'testimonial-title', 'pricing-title',
  'hero-button', 'cta-button', 'nav-button', 'footer-button', 'primary-button',
  'feature-card', 'testimonial-card', 'pricing-card', 'product-card', 'team-card',
  'footer-link', 'nav-link', 'card-link',
  'hero-container', 'card-container', 'grid-container', 'nav-container',
]);

const CLASS_NAME_MAPPINGS: Record<string, string> = {
  'page-title': 'heading-xl', 'hero-headline': 'heading-xl', 'main-title': 'heading-xl',
  'features-title': 'heading-lg', 'testimonials-title': 'heading-lg', 'about-title': 'heading-lg',
  'faq-title': 'heading-lg', 'contact-title': 'heading-lg',
  'product-title': 'heading-md', 'team-title': 'heading-md',
  'section-subtitle': 'body-lg', 'hero-subtitle': 'body-lg',
  'card-text': 'body-base', 'description-text': 'body-base',
  'small-text': 'body-sm', 'caption-text': 'body-sm', 'badge-text': 'label',
  'main-button': 'btn-primary', 'secondary-button': 'btn-secondary',
  'outline-button': 'btn-secondary', 'ghost-button': 'btn-ghost', 'link-button': 'btn-link',
  'card-base': 'card', 'card-primary': 'card', 'content-card': 'card', 'project-card': 'card',
  'card-grid': 'flex-row', 'features-grid': 'flex-row', 'products-grid': 'flex-row', 'testimonials-grid': 'flex-row',
  'sanitized': 'element', 'fallback': 'element', 'element': 'element',
  'text': 'body-text', 'heading': 'heading', 'div': 'container', 'section': 'section',
  'container': 'container', 'button': 'primary-button', 'image': 'img', 'link': 'link', 'icon': 'icon',
};

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeClassName(className: string): string {
  if (!className) return className;
  if (PRESERVE_SEMANTIC_NAMES.has(className)) return className;

  const sanitizedPattern = /^(sanitized|fallback|element|text|heading|div|section|container|button|image|link|icon)[-_]?[a-z0-9]{6,}/i;
  const timestampSuffixPattern = /[-_]\d{10,}[-_]?[a-z0-9]*$/i;
  const randomSuffixPattern = /[-_][a-z0-9]{6,}$/;

  if (sanitizedPattern.test(className)) {
    const typeMatch = className.match(/^(sanitized[-_]?)?(fallback[-_]?)?(element[-_]?)?(text|heading|div|section|container|button|image|link|icon)/i);
    if (typeMatch) {
      const ct = (typeMatch[4] || '').toLowerCase();
      const map: Record<string, string> = { heading: 'heading', text: 'body-text', button: 'primary-button', container: 'container', div: 'container', section: 'section', image: 'img', link: 'link', icon: 'icon' };
      return map[ct] || 'element';
    }
    return 'element';
  }

  if (timestampSuffixPattern.test(className)) {
    const cleaned = className.replace(timestampSuffixPattern, '');
    if (PRESERVE_SEMANTIC_NAMES.has(cleaned)) return cleaned;
    return normalizeClassName(cleaned);
  }

  if (randomSuffixPattern.test(className) && className.length > 15) {
    const cleaned = className.replace(randomSuffixPattern, '');
    if (PRESERVE_SEMANTIC_NAMES.has(cleaned)) return cleaned;
    if (CLASS_NAME_MAPPINGS[cleaned]) return CLASS_NAME_MAPPINGS[cleaned];
    return normalizeClassName(cleaned);
  }

  if (CLASS_NAME_MAPPINGS[className]) return CLASS_NAME_MAPPINGS[className];

  const baseNameMatch = className.match(/^(.+?)-?\d+$/);
  if (baseNameMatch) {
    const baseName = baseNameMatch[1];
    if (PRESERVE_SEMANTIC_NAMES.has(baseName)) return baseName;
    if (CLASS_NAME_MAPPINGS[baseName]) return CLASS_NAME_MAPPINGS[baseName];
  }

  const patterns: Array<{ pattern: RegExp; replacement: string }> = [
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

  for (const { pattern, replacement } of patterns) {
    if (pattern.test(className)) return replacement;
  }

  return className;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC CLASS DERIVATION
// ═══════════════════════════════════════════════════════════════════════════════

function deriveSemanticClassName(componentId: string, componentType: string, parentId?: string): string {
  const parentContext = parentId?.match(/(hero|features|testimonials|footer|nav|card|cta|pricing|about|contact|faq|trust|team|stats|blog|gallery|badge|partner|accordion)/i)?.[1]?.toLowerCase();

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
    case 'section': return 'section';
    case 'image': return 'img';
    case 'icon': return 'icon';
    default: return componentType || 'element';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLE EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

const STYLE_KEYS = [
  'display', 'flexDirection', 'justifyContent', 'alignItems', 'flexWrap', 'gap',
  'gridTemplateColumns', 'gridTemplateRows', 'gridGap', 'gridColumn', 'gridRow',
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'spacingControl', 'padding', 'margin',
  'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing',
  'textAlign', 'color', 'textTransform',
  'backgroundColor', 'backgroundGradient', 'background',
  'border', 'borderRadius', 'borderWidth', 'borderStyle', 'borderColor',
  'boxShadow', 'opacity', 'backdropFilter', 'overflow',
  'position', 'zIndex',
  'tabletStyles', 'mobileStyles',
];

function extractStyleProps(props: Record<string, any>): Record<string, any> {
  if (!props) return {};
  const result: Record<string, any> = {};
  for (const key of STYLE_KEYS) {
    if (props[key] !== undefined && props[key] !== null && props[key] !== '') {
      result[key] = props[key];
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSIVE MERGE HELPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Merge responsive (tablet/mobile) styles into an existing class by name.
 * Used during dedup to preserve responsive overrides when desktop styles match.
 */
function mergeResponsiveIntoClass(
  className: string,
  newTablet?: Record<string, any>,
  newMobile?: Record<string, any>
) {
  const { classes, updateClassBreakpoint } = useClassStore.getState();
  const cls = classes.find(c => c.name === className);
  if (!cls) return;

  if (newTablet && Object.keys(newTablet).length > 0) {
    const merged = { ...(cls.tabletStyles || {}), ...newTablet };
    updateClassBreakpoint(cls.id, 'tablet', merged);
  }
  if (newMobile && Object.keys(newMobile).length > 0) {
    const merged = { ...(cls.mobileStyles || {}), ...newMobile };
    updateClassBreakpoint(cls.id, 'mobile', merged);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC CATEGORY (for dedup)
// ═══════════════════════════════════════════════════════════════════════════════

function getSemanticCategory(componentType: string): string {
  switch (componentType) {
    case 'heading': return 'heading';
    case 'text': return 'text';
    case 'button': return 'button';
    case 'link': return 'link';
    case 'image': case 'avatar': return 'image';
    case 'container': case 'div': case 'section': return 'container';
    case 'icon': return 'icon';
    case 'input': case 'textarea': case 'select': return 'form';
    default: return 'element';
  }
}

function getClassSemanticCategory(className: string): string {
  if (/description|body|caption|subtitle|paragraph|text(?!-)|\.text/i.test(className) && !/title|heading|headline/i.test(className)) return 'text';
  if (/title|heading|headline/i.test(className)) return 'heading';
  if (/button|btn|cta/i.test(className)) return 'button';
  if (/link/i.test(className) && !/button|btn/i.test(className)) return 'link';
  if (/img|image|avatar|logo|icon/i.test(className)) return 'image';
  if (/card|container|section|grid|row|col|wrapper|box/i.test(className)) return 'container';
  if (/input|field|form/i.test(className)) return 'form';
  return 'element';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SYNC API
// ═══════════════════════════════════════════════════════════════════════════════

async function syncSingleComponent(
  component: AppComponent,
  parentId?: string,
  styleHashCache?: Map<string, string>
): Promise<void> {
  const { addClass, classes } = useClassStore.getState();
  const cache = styleHashCache || new Map<string, string>();

  // Determine raw class name
  let rawClassName = component.props?.appliedClasses?.[0] || (component.classNames && component.classNames[0]);

  const needsDerivation = !rawClassName ||
    /^(sanitized|element|fallback)[-_]/i.test(rawClassName) ||
    rawClassName === component.id;

  if (needsDerivation) {
    rawClassName = deriveSemanticClassName(component.id, component.type, parentId);
  }

  if (!rawClassName) return;

  let primaryClassName = normalizeClassName(rawClassName);

  // Update appliedClasses on the component
  if (primaryClassName !== (component.props?.appliedClasses?.[0] || component.id) && component.props) {
    component.props.appliedClasses = [primaryClassName];
  }

  // Check existing class — reuse or create unique variant
  const existingClass = classes.find(c => c.name === primaryClassName);
  if (existingClass) {
    const styleProps = extractStyleProps(component.props || {});
    // Compare only desktop keys — exclude tabletStyles/mobileStyles from hash
    // to prevent false mismatches when responsive overrides differ
    const desktopOnlyProps = { ...styleProps };
    const responsiveKeys = { tabletStyles: desktopOnlyProps.tabletStyles, mobileStyles: desktopOnlyProps.mobileStyles };
    delete desktopOnlyProps.tabletStyles;
    delete desktopOnlyProps.mobileStyles;

    const existingHash = generateStyleHash(existingClass.styles);
    const newHash = generateStyleHash(desktopOnlyProps);

    if (existingHash === newHash || Object.keys(desktopOnlyProps).length === 0) {
      // Desktop styles match — merge any new responsive overrides into existing class
      if (responsiveKeys.tabletStyles || responsiveKeys.mobileStyles) {
        const { classes: latestClasses } = useClassStore.getState();
        const cls = latestClasses.find(c => c.name === primaryClassName);
        if (cls) {
          const { updateClassBreakpoint } = useClassStore.getState();
          if (responsiveKeys.tabletStyles && Object.keys(responsiveKeys.tabletStyles).length > 0) {
            const merged = { ...(cls.tabletStyles || {}), ...responsiveKeys.tabletStyles };
            updateClassBreakpoint(cls.id, 'tablet', merged);
          }
          if (responsiveKeys.mobileStyles && Object.keys(responsiveKeys.mobileStyles).length > 0) {
            const merged = { ...(cls.mobileStyles || {}), ...responsiveKeys.mobileStyles };
            updateClassBreakpoint(cls.id, 'mobile', merged);
          }
        }
      }
      if (component.props) component.props.appliedClasses = [primaryClassName];
      return;
    }

    let suffix = 2;
    let uniqueName = `${primaryClassName}-${suffix}`;
    while (classes.find(c => c.name === uniqueName)) {
      const variant = classes.find(c => c.name === uniqueName);
      if (variant && generateStyleHash(variant.styles) === newHash) {
        if (component.props) component.props.appliedClasses = [uniqueName];
        return;
      }
      suffix++;
      uniqueName = `${primaryClassName}-${suffix}`;
    }
    primaryClassName = uniqueName;
    if (component.props) component.props.appliedClasses = [primaryClassName];
  }

  // Extract & create class
  const styleProps = extractStyleProps(component.props || {});
  if (Object.keys(styleProps).length > 0) {
    // Separate responsive keys from desktop styles for proper dedup
    const { tabletStyles: newTablet, mobileStyles: newMobile, ...desktopOnlyProps } = styleProps;
    const hasResponsive = (newTablet && Object.keys(newTablet).length > 0) || (newMobile && Object.keys(newMobile).length > 0);

    // Type-aware dedup — hash ONLY desktop styles
    const semanticCategory = getSemanticCategory(component.type);
    const desktopHash = generateStyleHash(desktopOnlyProps);
    const semanticHash = `${semanticCategory}::${desktopHash}`;

    if (cache.has(semanticHash)) {
      const cachedName = cache.get(semanticHash)!;
      const cachedCategory = getClassSemanticCategory(cachedName);
      if (cachedCategory === semanticCategory) {
        if (component.props) component.props.appliedClasses = [cachedName];
        // Merge responsive styles into the matched class
        if (hasResponsive) {
          mergeResponsiveIntoClass(cachedName, newTablet, newMobile);
        }
        return;
      }
    }

    // Check store for same-category match — compare desktop-only hashes
    const { classes: currentClasses } = useClassStore.getState();
    for (const cls of currentClasses) {
      if (!cls.isAutoClass) continue;
      if (getClassSemanticCategory(cls.name) !== semanticCategory) continue;
      if (generateStyleHash(cls.styles) === desktopHash) {
        cache.set(semanticHash, cls.name);
        if (component.props) component.props.appliedClasses = [cls.name];
        // Merge responsive styles into the matched class
        if (hasResponsive) {
          mergeResponsiveIntoClass(cls.name, newTablet, newMobile);
        }
        return;
      }
    }

    try {
      await addClass(primaryClassName, styleProps, true);
      cache.set(semanticHash, primaryClassName);
    } catch (err) {
      console.warn(`[ClassSync] Failed to create class "${primaryClassName}":`, err);
    }
  } else {
    if (component.props) component.props.appliedClasses = [primaryClassName];
  }
}

/**
 * Recursively sync all components and their children to the class store.
 * This assigns semantic class names and creates class entries —
 * the same logic used by the AI Builder pipeline.
 */
export async function syncAllComponentClasses(
  components: AppComponent[],
  parentId?: string,
  styleHashCache?: Map<string, string>
): Promise<void> {
  const cache = styleHashCache || new Map<string, string>();
  for (const component of components) {
    await syncSingleComponent(component, parentId, cache);
    if (component.children?.length) {
      await syncAllComponentClasses(component.children, component.id, cache);
    }
  }
}
