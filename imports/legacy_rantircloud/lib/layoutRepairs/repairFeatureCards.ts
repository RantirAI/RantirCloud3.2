import { AppComponent } from '@/types/appBuilder';

// Track indices for unique feature content assignment
let featureCardIndex = 0;

/**
 * Resets the feature card index.
 * Call this before each AI generation to ensure consistent starting point.
 */
export function resetFeatureIndices(): void {
  featureCardIndex = 0;
  console.log('[Layout Repairs] Reset feature card indices for new generation');
}

/**
 * Repairs card styling to ensure visible shadows, borders, and modern hover effects
 * CRITICAL: Also ensures overflow protection to prevent text bleeding
 */
function repairCardStyling(component: AppComponent): boolean {
  const id = (component.id || '').toLowerCase();
  if (!id.includes('card') || component.type !== 'div') return false;
  
  const props = component.props || {};
  let changed = false;
  
  // CRITICAL: Ensure overflow protection - prevents text from bleeding outside card
  if (props.overflow !== 'hidden') {
    props.overflow = 'hidden';
    changed = true;
  }
  
  // CRITICAL: Ensure text doesn't break out of card boundaries
  if (!props.wordBreak) {
    props.wordBreak = 'break-word';
    changed = true;
  }
  
  // FALLBACK ONLY: Shadow — only if AI set nothing at all
  if (props.boxShadows === undefined || props.boxShadows === null) {
    props.boxShadows = [{
      enabled: true, type: 'outer',
      x: 0, y: 12, blur: 32, spread: -6,
      color: 'rgba(0,0,0,0.15)'
    }];
    changed = true;
  }
  
  // FALLBACK ONLY: Border — only if completely absent
  if (props.border === undefined || props.border === null) {
    props.border = {
      width: '1', style: 'solid', color: 'hsl(var(--border))',
      unit: 'px', sides: { top: true, right: true, bottom: true, left: true }
    };
    changed = true;
  }
  
  // FALLBACK ONLY: borderRadius — only if completely absent
  if (props.borderRadius === undefined || props.borderRadius === null) {
    props.borderRadius = {
      topLeft: '16', topRight: '16', bottomRight: '16', bottomLeft: '16', unit: 'px'
    };
    changed = true;
  }
  
  // FALLBACK ONLY: backgroundColor — only if completely absent AND no gradient
  if ((props.backgroundColor === undefined || props.backgroundColor === null) && !props.backgroundGradient) {
    props.backgroundColor = { type: 'solid', value: 'hsl(var(--card))' };
    props._aiGenerated = true;
    changed = true;
  }
  
  // FALLBACK ONLY: padding — only if no padding exists at all
  if (!props.spacingControl?.padding?.top && !props.spacingControl?.padding?.bottom) {
    props.spacingControl = props.spacingControl || {};
    props.spacingControl.padding = {
      top: '28', right: '28', bottom: '28', left: '28', unit: 'px'
    };
    changed = true;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FLEXBOX CARD SIZING - For even distribution with proper gaps
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Remove width: 100% (conflicts with flex-basis)
  if (props.width === '100%' && props.flexBasis) {
    delete props.width;
    changed = true;
  }
  
  // FALLBACK: flex-basis only when missing
  if (!props.flexBasis) {
    props.flexBasis = 'calc(33.333% - 22px)';
    changed = true;
  }
  
  // FALLBACK: minWidth only when 0 or missing
  if (!props.minWidth || props.minWidth === '0') {
    props.minWidth = '280px';
    changed = true;
  }
  
  // FALLBACK: maxWidth only when missing
  if (!props.maxWidth || props.maxWidth === 'none') {
    props.maxWidth = '400px';
    changed = true;
  }
  
  // FALLBACK: flexGrow/flexShrink when missing
  if (!props.flexGrow) {
    props.flexGrow = '1';
    changed = true;
  }
  if (!props.flexShrink) {
    props.flexShrink = '0';
    changed = true;
  }
  
  // Use stretch for equal height cards
  if (props.alignSelf !== 'stretch') {
    props.alignSelf = 'stretch';
    changed = true;
  }
  if (props.height !== '100%') {
    props.height = '100%';
    changed = true;
  }
  
  component.props = props;
  return changed;
}

/**
 * Repairs section containers to ensure they use full page width
 * CRITICAL: Also adds position:relative and overflow:hidden for proper stacking isolation
 */
function repairSectionWidth(component: AppComponent): boolean {
  const id = (component.id || '').toLowerCase();
  
  // STRICT: Only actual section containers
  const isActualSection = 
    component.type === 'section' || 
    (id.endsWith('-section') && component.type === 'div');
  
  // EXCLUDE sub-components
  const isSubComponent = 
    id.includes('-header') || 
    id.includes('-grid') || 
    id.includes('-card') || 
    id.includes('-item') ||
    id.includes('-content') ||
    id.includes('-wrapper');
  
  if (!isActualSection || isSubComponent) return false;
  
  const props = component.props || {};
  let changed = false;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL: Section Isolation - Prevents text from bleeding between sections
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Position relative creates a stacking context
  if (props.position !== 'relative') {
    props.position = 'relative';
    changed = true;
    console.log(`[Section Repair] Added position:relative to: ${component.id}`);
  }
  
  // Overflow hidden clips content at section boundaries
  if (props.overflow !== 'hidden') {
    props.overflow = 'hidden';
    changed = true;
    console.log(`[Section Repair] Added overflow:hidden to: ${component.id}`);
  }
  
  // Force full width on sections
  if (props.width !== '100%') {
    props.width = '100%';
    changed = true;
  }
  
  // Remove restrictive maxWidth on parent sections - let children control their max-width
  if (props.maxWidth && props.maxWidth !== '100%' && props.maxWidth !== 'none') {
    props.maxWidth = '100%';
    changed = true;
  }
  
  props._aiGenerated = true;
  component.props = props;
  return changed;
}

/**
 * Repairs features-grid container to ensure proper spacing and layout
 */
function repairFeaturesGrid(component: AppComponent): boolean {
  const id = (component.id || '').toLowerCase();
  const isGrid = 
    id.includes('-grid') || 
    id.includes('cards-container') || 
    id.includes('-items') ||
    // Explicit container patterns the AI generates
    id.includes('features-container') ||
    id.includes('services-container') ||
    id.includes('benefits-container') ||
    id.includes('capabilities-container') ||
    id.includes('offerings-container') ||
    id.includes('team-container') ||
    id.includes('stats-container') ||
    id.includes('about-container') ||
    id.includes('portfolio-container') ||
    id.includes('projects-container') ||
    id.includes('gallery-container') ||
    id.includes('pricing-container') ||
    id.includes('faq-container');
  
  if (!isGrid || component.type !== 'div') return false;
  if (id.includes('-card')) return false; // Don't apply to individual cards
  
  const props = component.props || {};
  let changed = false;
  
  // Ensure width 100% so it fills container
  if (props.width !== '100%') {
    props.width = '100%';
    changed = true;
  }
  
  // FALLBACK ONLY: maxWidth — only set if completely missing
  if (!props.maxWidth) {
    props.maxWidth = '1400px';
    changed = true;
  }
  
  // Center the grid with auto margins
  if (props.marginLeft !== 'auto') {
    props.marginLeft = 'auto';
    changed = true;
  }
  if (props.marginRight !== 'auto') {
    props.marginRight = 'auto';
    changed = true;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SWITCH TO FLEXBOX for even card distribution
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Use flex instead of grid for better card distribution
  if (props.display !== 'flex') {
    props.display = 'flex';
    changed = true;
    console.log(`[Grid Repair] Switched to flex layout: ${component.id}`);
  }
  
  // Enable wrapping for responsive behavior
  if (props.flexWrap !== 'wrap') {
    props.flexWrap = 'wrap';
    changed = true;
  }
  
  // Align items to stretch for equal height cards in each row
  if (props.alignItems !== 'stretch') {
    props.alignItems = 'stretch';
    changed = true;
    console.log(`[Grid Repair] Set alignItems:stretch for equal height cards: ${component.id}`);
  }
  
  // Remove grid-specific properties
  if (props.gridTemplateColumns) {
    delete props.gridTemplateColumns;
    delete props.gridAutoRows;
    delete props.gridAutoFlow;
    delete props.justifyItems;
    changed = true;
    console.log(`[Grid Repair] Removed grid properties: ${component.id}`);
  }
  
  // FALLBACK ONLY: gap — only set if completely missing
  if (!props.gap) {
    props.gap = '32px';
    changed = true;
  }
  
  // Mark as AI-generated for proper rendering
  props._aiGenerated = true;
  
  component.props = props;
  
  return changed;
}

/**
 * Detects if a component is a feature card based on its ID or structure.
 * Feature cards should be flex columns, NOT grids.
 */
function isFeatureCard(component: AppComponent): boolean {
  const id = (component.id || '').toLowerCase();
  
  // ID-based detection (safest)
  if (
    id.includes('feature-card') ||
    id.includes('capability-card') ||
    id.includes('benefit-card') ||
    id.includes('service-card') ||
    id.includes('testimonial-card') ||
    id.includes('team-card') ||
    id.includes('stat-card') ||
    id.includes('pricing-card') ||
    // Additional card types AI can generate
    id.includes('portfolio-card') ||
    id.includes('project-card') ||
    id.includes('gallery-card') ||
    id.includes('offering-card') ||
    id.includes('about-card') ||
    id.includes('faq-card')
  ) {
    return true;
  }
  
  // Heuristic detection: div with icon + heading + text children
  if (component.type === 'div' && Array.isArray(component.children)) {
    const hasIcon = component.children.some((c: AppComponent) => c.type === 'icon');
    const hasHeading = component.children.some((c: AppComponent) => c.type === 'heading');
    const hasText = component.children.some((c: AppComponent) => c.type === 'text');
    const childCount = component.children.length;
    
    // Typical feature card: 2-4 children with icon + heading + optional text
    if (hasIcon && hasHeading && childCount >= 2 && childCount <= 5) {
      // Additional check: should NOT be a grid container like "features-grid"
      if (!id.includes('-grid') && !id.includes('grid-') && !id.includes('container')) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Checks if a minWidth value resembles 200px (which causes overflow in cards)
 */
function isProblematicMinWidth(value: any): boolean {
  if (!value) return false;
  
  if (typeof value === 'string') {
    return value === '200px' || value === '200' || value.includes('200px');
  }
  
  if (typeof value === 'object' && value.value !== undefined) {
    return value.value === 200 || value.value === '200';
  }
  
  if (typeof value === 'number') {
    return value === 200;
  }
  
  return false;
}

/**
 * Removes problematic container constraints from leaf nodes
 */
function cleanLeafNodeConstraints(props: Record<string, any>): boolean {
  let changed = false;
  
  // Remove minWidth from leaf nodes (prevents overflow in tight grids)
  if (isProblematicMinWidth(props.minWidth)) {
    delete props.minWidth;
    changed = true;
  }
  
  // Remove maxWidth that looks like container width (doesn't belong on leaf nodes)
  if (props.maxWidth === '1200px' || props.maxWidth === '1140px' || props.maxWidth === '1280px') {
    delete props.maxWidth;
    changed = true;
  }
  
  return changed;
}

/**
 * Repairs a single feature card to use flex column layout instead of grid
 */
function repairFeatureCardLayout(component: AppComponent): boolean {
  let changed = false;
  const props = component.props || {};
  
  // Force flex column layout (not grid)
  if (props.display === 'grid' || props.gridTemplateColumns) {
    props.display = 'flex';
    props.flexDirection = 'column';
    delete props.gridTemplateColumns;
    delete props.gridTemplateRows;
    delete props.gridAutoFlow;
    delete props.justifyItems;
    changed = true;
    console.log(`[Layout Repair] Fixed feature card grid→flex: ${component.id}`);
  }
  
  // Ensure flex column layout exists
  if (props.display !== 'flex') {
    props.display = 'flex';
    changed = true;
  }
  if (props.flexDirection !== 'column') {
    props.flexDirection = 'column';
    changed = true;
  }
  
  // Ensure reasonable gap
  if (!props.gap) {
    props.gap = '12px';
    changed = true;
  }
  
  // Clean up responsive overrides that might have grid
  if (props.tabletStyles?.gridTemplateColumns) {
    delete props.tabletStyles.gridTemplateColumns;
    changed = true;
  }
  if (props.mobileStyles?.gridTemplateColumns) {
    delete props.mobileStyles.gridTemplateColumns;
    changed = true;
  }
  
  // Ensure card has minWidth (prevents collapse in parent grid)
  if (!props.minWidth) {
    props.minWidth = '200px';
    changed = true;
  }
  
  // Fix children: remove minWidth from leaf nodes (icon, heading, text)
  if (Array.isArray(component.children)) {
    for (const child of component.children) {
      const childComponent = child as AppComponent;
      const childProps = childComponent.props || {};
      
      // Only clean leaf nodes (icon, heading, text, button)
      if (['icon', 'heading', 'text', 'button', 'link'].includes(childComponent.type)) {
        if (cleanLeafNodeConstraints(childProps)) {
          changed = true;
          console.log(`[Layout Repair] Cleaned leaf node constraints: ${childComponent.id}`);
        }
      }
    }
  }
  
  component.props = props;
  return changed;
}

/**
 * Recursively traverses a component tree and repairs feature card layouts and styling.
 * Returns true if any repairs were made.
 */
export function repairFeatureCardsInTree(component: AppComponent): boolean {
  let changed = false;
  
  // Repair section containers to use full width
  if (repairSectionWidth(component)) {
    changed = true;
  }
  
  // Repair features-grid container layout
  if (repairFeaturesGrid(component)) {
    changed = true;
  }
  
  // Check and repair this component if it's a feature card
  if (isFeatureCard(component)) {
    if (repairFeatureCardLayout(component)) {
      changed = true;
    }
  }
  
  // Repair card styling (shadows, borders, hover effects) for all cards
  if (repairCardStyling(component)) {
    changed = true;
  }
  
  // Recurse into children
  if (Array.isArray(component.children)) {
    for (const child of component.children) {
      if (repairFeatureCardsInTree(child as AppComponent)) {
        changed = true;
      }
    }
  }
  
  return changed;
}

/**
 * Repairs all pages in a project, returning true if any changes were made.
 */
export function repairProjectFeatureCards(pages: any[]): boolean {
  let changed = false;
  
  for (const page of pages) {
    if (Array.isArray(page.components)) {
      for (const component of page.components) {
        if (repairFeatureCardsInTree(component)) {
          changed = true;
        }
      }
    }
  }
  
  return changed;
}
