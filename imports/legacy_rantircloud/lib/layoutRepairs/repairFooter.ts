import { AppComponent } from '@/types/appBuilder';

/**
 * Repairs footer grid layout to ensure 4-column structure
 */
function repairFooterGrid(component: AppComponent): boolean {
  const id = (component.id || '').toLowerCase();
  
  // Target footer content containers (main grid area)
  const isFooterGrid = 
    id.includes('footer-content') || 
    id.includes('footer-grid') || 
    id.includes('footer-columns') ||
    (id.includes('footer') && id.includes('-inner'));
  
  if (!isFooterGrid || component.type !== 'div') return false;
  
  const props = component.props || {};
  let changed = false;
  
  // Force grid display for footer content
  if (props.display !== 'grid') {
    props.display = 'grid';
    changed = true;
    console.log(`[Footer Repair] Set display: grid on ${component.id}`);
  }
  
  // Set 4-column grid layout (brand + 3 link columns)
  if (!props.gridTemplateColumns || props.gridTemplateColumns.includes('1fr 1fr')) {
    props.gridTemplateColumns = 'repeat(4, 1fr)';
    changed = true;
    console.log(`[Footer Repair] Set gridTemplateColumns on ${component.id}`);
  }
  
  // Ensure proper alignment
  if (props.alignItems !== 'start') {
    props.alignItems = 'start';
    changed = true;
  }
  
  // Ensure gap
  if (!props.gap) {
    props.gap = '48px';
    changed = true;
  }
  
  // Set width and centering
  if (props.width !== '100%') {
    props.width = '100%';
    changed = true;
  }
  
  if (!props.maxWidth) {
    props.maxWidth = '1200px';
    changed = true;
  }
  
  // Add responsive styles for tablet/mobile
  if (!props.tabletStyles) {
    props.tabletStyles = {
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '32px',
    };
    changed = true;
  }
  
  if (!props.mobileStyles) {
    props.mobileStyles = {
      gridTemplateColumns: '1fr',
      gap: '24px',
    };
    changed = true;
  }
  
  // Mark as AI-generated for renderer
  props._aiGenerated = true;
  
  component.props = props;
  return changed;
}

/**
 * Repairs footer link colors for dark backgrounds
 */
function repairFooterLinks(component: AppComponent): boolean {
  const id = (component.id || '').toLowerCase();
  
  // Target link components in footer sections
  if (component.type !== 'link') return false;
  
  const props = component.props || {};
  let changed = false;
  
  // Set proper light color for dark footer backgrounds
  if (!props.color || props.color === 'hsl(var(--primary))' || props.color.includes('primary')) {
    props.color = 'rgba(255,255,255,0.7)';
    changed = true;
    console.log(`[Footer Repair] Set link color on ${component.id}`);
  }
  
  // Remove underline
  if (!props.textDecoration || props.textDecoration === 'underline') {
    props.textDecoration = 'none';
    changed = true;
  }
  
  // Set proper font size
  if (!props.fontSize) {
    props.fontSize = '14';
    changed = true;
  }
  
  // Add hover state for links
  if (!props.stateStyles?.hover) {
    props.stateStyles = {
      ...props.stateStyles,
      hover: {
        color: 'rgba(255,255,255,1)',
      }
    };
    changed = true;
  }
  
  component.props = props;
  return changed;
}

/**
 * Repairs text elements in footer that should be styled as links
 */
function repairFooterTextAsLinks(component: AppComponent): boolean {
  const id = (component.id || '').toLowerCase();
  
  // Target text components that are footer links
  if (component.type !== 'text') return false;
  
  // Check if this is a link text (has link- in ID or parent is footer)
  const isLinkText = id.includes('link') || id.includes('footer-link');
  if (!isLinkText) return false;
  
  const props = component.props || {};
  let changed = false;
  
  // Set proper color for dark footer backgrounds (if not already set properly)
  const currentColor = props.color || '';
  if (!currentColor || currentColor === 'hsl(var(--primary))' || 
      (!currentColor.includes('rgba') && !currentColor.includes('muted-foreground'))) {
    props.color = 'rgba(255,255,255,0.7)';
    changed = true;
  }
  
  // Set proper font size
  if (!props.fontSize) {
    props.fontSize = '14';
    changed = true;
  }
  
  // Add cursor pointer for link-like behavior
  if (!props.cursor) {
    props.cursor = 'pointer';
    changed = true;
  }
  
  component.props = props;
  return changed;
}

/**
 * Repairs footer section container to ensure dark background and proper structure
 */
function repairFooterSection(component: AppComponent): boolean {
  const id = (component.id || '').toLowerCase();
  
  // Target footer section
  const isFooterSection = 
    id === 'footer-section' || 
    id === 'footer' || 
    (id.includes('footer') && (component.type === 'section' || id.endsWith('-section')));
  
  if (!isFooterSection) return false;
  
  const props = component.props || {};
  let changed = false;
  
  // Ensure dark background for footer (slate-900 color)
  if (!props.backgroundColor || 
      props.backgroundColor === 'hsl(var(--card))' ||
      props.backgroundColor === 'transparent') {
    props.backgroundColor = { type: 'solid', value: '#0f172a' };
    changed = true;
    console.log(`[Footer Repair] Set dark background on ${component.id}`);
  }
  
  // Ensure full width
  if (props.width !== '100%') {
    props.width = '100%';
    changed = true;
  }
  
  // Ensure proper flex layout
  if (props.display !== 'flex') {
    props.display = 'flex';
    changed = true;
  }
  
  if (props.flexDirection !== 'column') {
    props.flexDirection = 'column';
    changed = true;
  }
  
  if (props.alignItems !== 'center') {
    props.alignItems = 'center';
    changed = true;
  }
  
  // Ensure proper padding
  if (!props.spacingControl?.padding) {
    props.spacingControl = {
      ...props.spacingControl,
      padding: { top: '80', right: '48', bottom: '48', left: '48', unit: 'px' }
    };
    changed = true;
  }
  
  // Mark as AI-generated
  props._aiGenerated = true;
  
  component.props = props;
  return changed;
}

/**
 * Repairs individual footer columns (brand, links) with proper flexBasis sizing
 */
function repairFooterColumns(component: AppComponent, isInFooter: boolean): boolean {
  if (!isInFooter || component.type !== 'div') return false;
  
  const id = (component.id || '').toLowerCase();
  
  // Target individual column containers in footer
  const isColumn = id.includes('footer-brand') || 
                   id.includes('footer-links') || 
                   id.includes('footer-col') ||
                   (id.includes('footer') && component.children?.length >= 2 && 
                    component.children.some((c: any) => c.type === 'link' || c.type === 'text'));
  
  if (!isColumn) return false;
  
  const props = component.props || {};
  let changed = false;
  
  // Ensure vertical column layout for individual columns
  if (props.flexDirection !== 'column') {
    props.flexDirection = 'column';
    changed = true;
  }
  if (props.display !== 'flex') {
    props.display = 'flex';
    changed = true;
  }
  if (!props.gap) {
    props.gap = '12px';
    changed = true;
  }
  
  // Set flexBasis for proper column sizing
  if (id.includes('brand')) {
    if (!props.flexBasis) { props.flexBasis = '35%'; changed = true; }
  } else {
    if (!props.flexBasis) { props.flexBasis = '18%'; changed = true; }
  }
  
  if (!props.minWidth) {
    props.minWidth = '150px';
    changed = true;
  }
  
  component.props = props;
  return changed;
}

/**
 * Recursively repairs footer components in a tree
 */
export function repairFooterInTree(component: AppComponent, isInFooter: boolean = false): boolean {
  let changed = false;
  const id = (component.id || '').toLowerCase();
  
  // Check if we're entering a footer section
  const isFooterContext = isInFooter || 
    id.includes('footer') || 
    id === 'footer-section' ||
    id === 'footer';
  
  // Repair footer section container
  if (repairFooterSection(component)) {
    changed = true;
  }
  
  // Repair footer grid
  if (isFooterContext && repairFooterGrid(component)) {
    changed = true;
  }
  
  // Repair footer column sizing
  if (isFooterContext && repairFooterColumns(component, isFooterContext)) {
    changed = true;
  }
  
  // Repair links in footer
  if (isFooterContext && repairFooterLinks(component)) {
    changed = true;
  }
  
  // Repair text elements that should look like links
  if (isFooterContext && repairFooterTextAsLinks(component)) {
    changed = true;
  }
  
  // Recurse into children
  if (Array.isArray(component.children)) {
    for (const child of component.children) {
      if (repairFooterInTree(child as AppComponent, isFooterContext)) {
        changed = true;
      }
    }
  }
  
  return changed;
}

/**
 * Entry point: repairs all footer components in a project's pages
 */
export function repairProjectFooter(pages: any[]): boolean {
  let changed = false;
  
  for (const page of pages) {
    if (Array.isArray(page.components)) {
      for (const component of page.components) {
        if (repairFooterInTree(component)) {
          changed = true;
        }
      }
    }
  }
  
  return changed;
}

/**
 * Reset function (for consistency with other repair utilities)
 */
export function resetFooterIndices(): void {
  console.log('[Layout Repairs] Reset footer indices for new generation');
}
