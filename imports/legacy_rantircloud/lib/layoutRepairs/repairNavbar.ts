/**
 * Navbar Structure Repair Utility
 * 
 * Fixes AI-generated navbars that have flat children instead of the proper
 * [logo, nav-links-container, hamburger] structure. This is critical because
 * with justify-content: space-between on 6+ flat children, items get spread
 * evenly instead of grouped correctly.
 */

import { AppComponent } from '@/types/appBuilder';

// Track repaired navbars to avoid duplicate repairs
let repairedNavbarIds = new Set<string>();

export function resetNavbarIndices(): void {
  repairedNavbarIds.clear();
}

/**
 * Find the logo element from navbar children using multiple detection patterns
 */
function findLogoChild(children: AppComponent[]): AppComponent | null {
  // 1. Try exact ID match for "logo" or "brand"
  let logo = children.find(c => {
    const id = (c.id || '').toLowerCase();
    return id.includes('logo') || id.includes('brand');
  });
  if (logo) return logo;

  // 2. Try first heading (very common logo pattern - brand name as heading)
  logo = children.find((c, idx) => idx < 2 && c.type === 'heading');
  if (logo) return logo;

  // 3. Try first image (logo as image file)
  logo = children.find((c, idx) => idx === 0 && c.type === 'image');
  if (logo) return logo;

  // 4. Try ID patterns like "nav-title", "store-name", company names
  logo = children.find(c => {
    const id = (c.id || '').toLowerCase();
    return (id.includes('title') && id.includes('nav')) ||
           id.includes('name') || 
           id.includes('store') ||
           id.includes('company');
  });

  return logo;
}

/**
 * Find hamburger menu button from navbar children
 */
function findHamburgerChild(children: AppComponent[]): AppComponent | null {
  return children.find(c => {
    const id = (c.id || '').toLowerCase();
    const iconName = (c.props?.iconName || '').toLowerCase();
    
    // Check for hamburger by icon
    if (iconName === 'menu' || iconName === 'hamburger' || iconName === 'alignjustify') {
      return true;
    }
    
    // Check for hamburger by ID
    if (id.includes('mobile') || id.includes('hamburger') || 
        id.includes('menu-toggle') || id.includes('menu-button')) {
      return true;
    }
    
    return false;
  });
}

/**
 * Check if navbar already has proper structure (nav-links container)
 * STRICT: Only match explicit nav-links patterns to avoid false positives
 */
function hasNavLinksContainer(children: AppComponent[]): boolean {
  return children.some(c => {
    const id = (c.id || '').toLowerCase();
    
    // Match explicit nav-links or link-div patterns
    if (id === 'nav-links' || id.startsWith('nav-links-') || id.includes('nav-links-container')) {
      return true;
    }
    if (id.startsWith('link-div') || id === 'link-div') {
      return true;
    }
    
    // Match nav-right or links-container ONLY if it's clearly a links grouping
    if ((id === 'nav-right' || id === 'links-container') && c.type === 'div') {
      return true;
    }
    
    return false;
  });
}

/**
 * Enforce critical navbar styling props (sticky, glass, padding)
 * NON-DESTRUCTIVE: Only applies fallback defaults when the AI did not generate explicit values.
 * Preserves AI-generated background colors, layout, and padding from the design system.
 */
function enforceNavbarStyling(component: AppComponent): void {
  component.props = component.props || {};

  // Structural/positioning props — safe to default if missing
  if (!component.props.position) component.props.position = 'sticky';
  if (!component.props.top) component.props.top = '0';
  if (!component.props.zIndex) component.props.zIndex = '50';
  if (!component.props.display) component.props.display = 'flex';

  // Layout alignment — only set if AI didn't provide them
  if (!component.props.alignItems) component.props.alignItems = 'center';

  // IMPORTANT: Do NOT override justifyContent if the AI set it — creative layouts use different values
  if (!component.props.justifyContent) component.props.justifyContent = 'space-between';

  // IMPORTANT: Preserve AI-generated background colors from the design system.
  // Only apply a white glass fallback when the AI produced NO background at all.
  const hasBackground =
    component.props.backgroundColor ||
    component.props.backgroundGradient ||
    component.props.style?.background;
  const hasBackdrop = component.props.backdropFilter;

  if (!hasBackground && !hasBackdrop) {
    // Fallback glass — only applied when AI produced nothing
    component.props.backgroundColor = { type: 'solid', value: '#ffffff', opacity: 90 };
    component.props.backdropFilter = 'blur(12px)';
  }

  // Horizontal padding — only set if AI didn't specify padding at all
  if (!component.props.spacingControl?.padding) {
    component.props.spacingControl = component.props.spacingControl || {};
    component.props.spacingControl.padding = { top: '16', right: '48', bottom: '16', left: '48', unit: 'px' };
  }
}

/**
 * Restructure navbar children into proper [logo, nav-links, hamburger] format
 */
function restructureNavbarChildren(component: AppComponent): boolean {
  if (component.type !== 'nav-horizontal') return false;
  
  // Skip if already repaired
  if (repairedNavbarIds.has(component.id)) return false;
  
  // ALWAYS enforce styling, even if structure is fine
  enforceNavbarStyling(component);
  
  if (!component.children?.length || component.children.length <= 2) {
    repairedNavbarIds.add(component.id);
    return true;
  }
  
  const children = component.children as AppComponent[];
  
  // Skip restructuring if already has proper structure (but styling was applied above)
  if (hasNavLinksContainer(children)) {
    repairedNavbarIds.add(component.id);
    return true;
  }
  
  // Find key components
  const logo = findLogoChild(children);
  const hamburger = findHamburgerChild(children);
  const navItems = children.filter(c => c !== logo && c !== hamburger);
  
  // Need at least 2 nav items to restructure
  if (navItems.length < 2) return false;
  
  console.log(`[Navbar Repair] Restructuring navbar "${component.id}" with ${navItems.length} nav items`);
  
  // Create nav-links container
  const navLinksContainer: AppComponent = {
    id: `link-div-${Date.now()}`,
    type: 'div',
    style: {},
    props: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '32',
      mobileStyles: { display: 'none' },
      _aiGenerated: true,
    },
    children: navItems,
  };
  
  // Rebuild children array in correct order
  const newChildren: AppComponent[] = [];
  
  // 1. Logo first (left side)
  if (logo) {
    newChildren.push(logo);
  }
  
  // 2. Nav links container (center/right with space-between)
  newChildren.push(navLinksContainer);
  
  // 3. Hamburger last (right side, hidden on desktop)
  if (hamburger) {
    hamburger.props = hamburger.props || {};
    hamburger.props.display = 'none';
    hamburger.props.mobileStyles = { 
      ...(hamburger.props.mobileStyles || {}),
      display: 'flex' 
    };
    newChildren.push(hamburger);
  }
  
  // Apply new structure
  component.children = newChildren;
  repairedNavbarIds.add(component.id);
  
  console.log(`[Navbar Repair] Restructured to: [${logo ? 'logo' : ''}${logo ? ', ' : ''}nav-links(${navItems.length})${hamburger ? ', hamburger' : ''}]`);
  
  return true;
}

/**
 * Repair navbar in a component tree (recursive)
 */
export function repairNavbarInTree(component: AppComponent): boolean {
  let repaired = false;
  
  // Check if this component is a navbar
  if (restructureNavbarChildren(component)) {
    repaired = true;
  }
  
  // Recursively check children
  if (component.children?.length) {
    for (const child of component.children as AppComponent[]) {
      if (repairNavbarInTree(child)) {
        repaired = true;
      }
    }
  }
  
  return repaired;
}

/**
 * Repair all navbars in a project's pages
 */
export function repairProjectNavbar(pages: any[]): number {
  resetNavbarIndices();
  let totalRepairs = 0;
  
  for (const page of pages) {
    if (page.components?.length) {
      for (const component of page.components) {
        if (repairNavbarInTree(component)) {
          totalRepairs++;
        }
      }
    }
  }
  
  return totalRepairs;
}
