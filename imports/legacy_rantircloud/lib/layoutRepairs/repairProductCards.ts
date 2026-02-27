import { AppComponent, ComponentType } from '@/types/appBuilder';

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT CATALOG - Diverse products with unique images, names, descriptions
// ═══════════════════════════════════════════════════════════════════════════════

const PRODUCT_CATALOG = [
  // Fashion - Clothing
  { name: 'Velvet Cascade Dress', description: 'Flowing silk with hand-stitched details and premium finish', price: '$289.00', imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=400&fit=crop' },
  { name: 'Midnight Ember Coat', description: 'Tailored wool blend with luxurious satin lining', price: '$425.00', imageUrl: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=600&h=400&fit=crop' },
  { name: 'Aurora Silk Blouse', description: 'Lightweight elegance perfect for any occasion', price: '$185.00', imageUrl: 'https://images.unsplash.com/photo-1564584217132-2271feaeb3c5?w=600&h=400&fit=crop' },
  { name: 'Coastal Linen Set', description: 'Breezy comfort meets refined contemporary style', price: '$245.00', imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&h=400&fit=crop' },
  { name: 'Cashmere Knit Sweater', description: 'Ultra-soft Mongolian cashmere in timeless design', price: '$395.00', imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&h=400&fit=crop' },
  { name: 'Tailored Blazer', description: 'Modern cut with structured shoulders and slim fit', price: '$320.00', imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&h=400&fit=crop' },
  // Accessories - Watches & Jewelry
  { name: 'Obsidian Chronograph', description: 'Precision Swiss movement with sapphire crystal', price: '$599.00', imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=400&fit=crop' },
  { name: 'Pearl Drop Earrings', description: 'Freshwater pearls set in 18k gold vermeil', price: '$128.00', imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&h=400&fit=crop' },
  { name: 'Rose Gold Bracelet', description: 'Delicate chain with minimalist charm pendant', price: '$175.00', imageUrl: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&h=400&fit=crop' },
  { name: 'Leather Strap Watch', description: 'Classic analog design with premium leather band', price: '$245.00', imageUrl: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&h=400&fit=crop' },
  { name: 'Diamond Stud Earrings', description: 'Brilliant cut diamonds in platinum setting', price: '$890.00', imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&h=400&fit=crop' },
  // Bags & Accessories
  { name: 'Artisan Leather Tote', description: 'Hand-crafted Italian leather with brass hardware', price: '$375.00', imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=400&fit=crop' },
  { name: 'Canvas Weekender', description: 'Durable waxed canvas with leather trim details', price: '$195.00', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=400&fit=crop' },
  { name: 'Crossbody Clutch', description: 'Compact elegance with removable chain strap', price: '$165.00', imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=400&fit=crop' },
  { name: 'Vintage Backpack', description: 'Heritage design with modern functionality', price: '$220.00', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=400&fit=crop' },
  // Footwear
  { name: 'Nova Running Shoes', description: 'Ultra-lightweight with responsive cushioning tech', price: '$159.00', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=400&fit=crop' },
  { name: 'Classic Leather Boots', description: 'Handcrafted full-grain leather with Goodyear welt', price: '$445.00', imageUrl: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600&h=400&fit=crop' },
  { name: 'Minimalist Sneakers', description: 'Clean white leather with cushioned sole', price: '$135.00', imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&h=400&fit=crop' },
  { name: 'Suede Loafers', description: 'Italian suede with memory foam insole', price: '$195.00', imageUrl: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&h=400&fit=crop' },
  // Tech & Electronics
  { name: 'Wireless Earbuds Pro', description: 'Active noise cancellation with 30hr battery', price: '$249.00', imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=400&fit=crop' },
  { name: 'Smart Speaker', description: 'Premium audio with voice assistant built-in', price: '$199.00', imageUrl: 'https://images.unsplash.com/photo-1543512214-318c7553f230?w=600&h=400&fit=crop' },
  { name: 'Mechanical Keyboard', description: 'Cherry MX switches with RGB backlight', price: '$175.00', imageUrl: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600&h=400&fit=crop' },
  // Home & Lifestyle
  { name: 'Ceramic Vase Set', description: 'Artisan-crafted minimalist design trio', price: '$89.00', imageUrl: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=600&h=400&fit=crop' },
  { name: 'Scented Candle Collection', description: 'Hand-poured soy wax with essential oils', price: '$65.00', imageUrl: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&h=400&fit=crop' },
  { name: 'Linen Throw Blanket', description: 'Stonewashed Belgian linen in neutral tones', price: '$145.00', imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop' },
  // Beauty & Skincare
  { name: 'Hydrating Serum', description: 'Hyaluronic acid with vitamin C complex', price: '$78.00', imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=400&fit=crop' },
  { name: 'Luxury Fragrance', description: 'Notes of bergamot, cedar and white musk', price: '$125.00', imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&h=400&fit=crop' },
  { name: 'Skincare Gift Set', description: 'Complete routine in elegant packaging', price: '$185.00', imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=400&fit=crop' }
];

// Shuffled products for current generation session
let shuffledProducts: typeof PRODUCT_CATALOG = [];

/**
 * Gets shuffled products, reshuffling if needed
 */
function getShuffledProducts(): typeof PRODUCT_CATALOG {
  if (shuffledProducts.length === 0) {
    shuffledProducts = [...PRODUCT_CATALOG];
    // Fisher-Yates shuffle for non-predictive variety
    for (let i = shuffledProducts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledProducts[i], shuffledProducts[j]] = [shuffledProducts[j], shuffledProducts[i]];
    }
  }
  return shuffledProducts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTIMONIAL PROFILES - Diverse clients with avatars, names, roles
// ═══════════════════════════════════════════════════════════════════════════════

const TESTIMONIAL_PROFILES = [
  // Women - diverse ethnicities
  { name: 'Sarah Chen', role: 'CEO, TechVentures Inc.', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', quote: 'Working with this team transformed our entire digital strategy. The results exceeded our expectations by 3x.' },
  { name: 'Mei Lin', role: 'Product Lead, Velocity', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face', quote: 'Incredibly intuitive platform that saved us months of development time.' },
  { name: 'Emily Rodriguez', role: 'Marketing Director, Bloom & Co', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', quote: 'Outstanding quality and professionalism. Our conversion rates increased 40% after the redesign.' },
  { name: 'Aisha Johnson', role: 'VP Product, Innovate.io', avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face', quote: 'A game-changer for our business. The new platform helped us scale to 10,000 users in just 3 months.' },
  { name: 'Sofia Andersson', role: 'UX Research Lead', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face', quote: 'The user experience improvements led to a 60% reduction in support tickets.' },
  { name: 'Maya Thompson', role: 'Creative Director', avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=face', quote: 'Beautiful designs that truly capture our brand essence perfectly.' },
  { name: 'Rachel Kim', role: 'Founder, Nexus Labs', avatarUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop&crop=face', quote: 'The best investment we made for our startup this year.' },
  { name: 'Priya Sharma', role: 'Engineering Manager', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face', quote: 'Technical excellence combined with creative vision. Rare and valuable.' },
  { name: 'Olivia Bennett', role: 'COO, Sterling Group', avatarUrl: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=100&h=100&fit=crop&crop=face', quote: 'Streamlined our operations and increased efficiency by 45%.' },
  { name: 'Natasha Volkov', role: 'Brand Strategist', avatarUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=100&h=100&fit=crop&crop=face', quote: 'They understood our vision from day one and executed flawlessly.' },
  // Men - diverse ethnicities
  { name: 'Marcus Williams', role: 'Founder, Horizon Labs', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', quote: 'The attention to detail and creative vision brought our brand to life in ways we never imagined possible.' },
  { name: 'David Park', role: 'CTO, CloudScale Systems', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', quote: 'Exceptional work from start to finish. They understood our vision and delivered beyond expectations.' },
  { name: 'James Mitchell', role: 'Head of Design, Artistry Studio', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face', quote: 'The design quality is unmatched. Every detail was thoughtfully crafted to perfection.' },
  { name: 'Omar Hassan', role: 'CEO, Quantum Dynamics', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face', quote: 'Transformed our digital presence completely. ROI exceeded all forecasts.' },
  { name: 'Carlos Rivera', role: 'VP Engineering, TechFlow', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=face', quote: 'The technical implementation was flawless. Zero downtime migration.' },
  { name: 'Michael Torres', role: 'Product Director', avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face', quote: 'Our product launch was a massive success thanks to their expertise.' },
  { name: 'Raj Patel', role: 'Founder, DataSync', avatarUrl: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop&crop=face', quote: 'Best decision we made was partnering with this team.' },
  { name: 'Alex Chen', role: 'Growth Lead, Spark', avatarUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=100&h=100&fit=crop&crop=face', quote: 'Our growth metrics doubled within the first quarter.' },
  { name: 'Jordan Williams', role: 'CEO, Elevate Co', avatarUrl: 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=100&h=100&fit=crop&crop=face', quote: 'Professional, responsive, and incredibly talented team.' },
  { name: 'Daniel Okonkwo', role: 'CIO, Global Finance', avatarUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop&crop=face', quote: 'Enterprise-grade quality with startup speed. Impressive.' }
];

// Shuffled profiles for current generation session
let shuffledProfiles: typeof TESTIMONIAL_PROFILES = [];

/**
 * Gets shuffled profiles, reshuffling if needed
 */
function getShuffledProfiles(): typeof TESTIMONIAL_PROFILES {
  if (shuffledProfiles.length === 0) {
    shuffledProfiles = [...TESTIMONIAL_PROFILES];
    // Fisher-Yates shuffle
    for (let i = shuffledProfiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledProfiles[i], shuffledProfiles[j]] = [shuffledProfiles[j], shuffledProfiles[i]];
    }
  }
  return shuffledProfiles;
}

// Track indices for unique content assignment
let productCardIndex = 0;
let testimonialCardIndex = 0;

/**
 * Resets the product and testimonial card indices.
 * Call this before each AI generation to ensure unique content.
 */
export function resetProductIndices(): void {
  productCardIndex = 0;
  testimonialCardIndex = 0;
  shuffledProfiles = []; // Reset shuffle for new generation
  shuffledProducts = []; // Reset product shuffle for new generation
  console.log('[Layout Repairs] Reset product/testimonial indices for new generation');
}

/**
 * Gets a relevant keyword for product image search based on component content
 */
function getProductKeyword(component: AppComponent): string {
  const children = component.children || [];
  
  // Try to find product name from children
  for (const child of children) {
    const childComp = child as AppComponent;
    if (childComp.type === 'text' || childComp.type === 'heading') {
      const content = String(childComp.props?.content || childComp.props?.text || '').toLowerCase();
      if (content.includes('shoe')) return 'shoes,fashion';
      if (content.includes('watch')) return 'watch,luxury';
      if (content.includes('bag') || content.includes('purse')) return 'bag,fashion';
      if (content.includes('phone') || content.includes('tech')) return 'technology,gadget';
      if (content.includes('furniture') || content.includes('chair')) return 'furniture,interior';
      if (content.includes('jewelry') || content.includes('ring')) return 'jewelry,luxury';
      if (content.includes('cloth') || content.includes('shirt') || content.includes('dress')) return 'fashion,clothing';
    }
  }
  
  // Default product keywords
  return 'product,ecommerce,retail';
}

/**
 * Updates generic text content in children with unique product data
 */
function updateProductContent(children: any[], productData: typeof PRODUCT_CATALOG[0]): boolean {
  let changed = false;
  
  for (const child of children) {
    if (child.type === 'text' || child.type === 'heading') {
      const content = String(child.props?.content || '').toLowerCase().trim();
      
      // Replace generic product names
      if (content === 'product name' || content === 'product title' || content.includes('product name')) {
        child.props = child.props || {};
        child.props.content = productData.name;
        changed = true;
        console.log(`[Product Repair] Updated product name: ${productData.name}`);
      }
    }
    
    // Check for content container divs
    if (child.type === 'div' && Array.isArray(child.children)) {
      // Look for name/description/price components
      const hasDescription = child.children.some((c: any) => {
        const cid = (c.id || '').toLowerCase();
        const content = String(c.props?.content || '').toLowerCase();
        return cid.includes('desc') || (content.length > 40 && !content.includes('$'));
      });
      
      if (!hasDescription) {
        // Find position after name, before price
        let insertIndex = -1;
        for (let i = 0; i < child.children.length; i++) {
          const c = child.children[i];
          const cid = (c.id || '').toLowerCase();
          const content = String(c.props?.content || '');
          
          if (cid.includes('name') || cid.includes('title')) {
            insertIndex = i + 1;
          } else if (content.includes('$') && insertIndex === -1) {
            insertIndex = i;
          }
        }
        
        if (insertIndex >= 0) {
          const descComponent = {
            id: `${child.id || 'content'}-desc-repaired-${Date.now()}`,
            type: 'text',
            props: {
              content: productData.description,
              typography: { 
                fontSize: '14', 
                color: 'hsl(var(--muted-foreground))', 
                lineHeight: '1.5' 
              }
            },
            style: {},
            children: []
          };
          child.children.splice(insertIndex, 0, descComponent);
          changed = true;
          console.log(`[Product Repair] Injected product description`);
        }
      }
      
      // Recursively update nested children
      if (updateProductContent(child.children, productData)) {
        changed = true;
      }
    }
  }
  
  return changed;
}

/**
 * Repairs a single product card by injecting missing image and fixing sizing
 */
function repairProductCard(component: AppComponent): boolean {
  const id = (component.id || '').toLowerCase();
  if (!id.includes('product-card') || component.type !== 'div') return false;
  
  let changed = false;
  const props = component.props || {};
  const children = component.children || [];
  
  // Get unique product data from shuffled pool
  const shuffled = getShuffledProducts();
  const productData = shuffled[productCardIndex % shuffled.length];
  productCardIndex++;
  
  // Check if has an image child (recursively check in children too)
  const hasImageChild = (comps: any[]): boolean => {
    for (const c of comps) {
      if (c.type === 'image') return true;
      if (c.children && c.children.length > 0 && hasImageChild(c.children)) return true;
    }
    return false;
  };
  
  const hasImage = hasImageChild(children);
  
  if (!hasImage) {
    // Inject a UNIQUE product image at the beginning
    const imageComponent: AppComponent = {
      id: `${component.id}-image-repaired-${Date.now()}`,
      type: 'image',
      props: {
        src: productData.imageUrl, // UNIQUE image per product
        imagePrompt: `Professional product photography, ${productData.name}, studio lighting`,
        alt: productData.name,
        width: '100%',
        height: '220px',
        objectFit: 'cover',
        backgroundColor: 'hsl(var(--muted))',
        borderRadius: { topLeft: '12', topRight: '12', bottomRight: '0', bottomLeft: '0', unit: 'px' },
        _aiGenerated: true,
        transition: 'transform 0.3s ease',
        stateStyles: { hover: { transform: 'scale(1.05)' } }
      },
      style: {},
      children: []
    };
    
    children.unshift(imageComponent);
    component.children = children;
    changed = true;
    console.log(`[Product Repair] Added unique image for: ${productData.name}`);
  }
  
  // Update generic content with unique product data
  if (updateProductContent(children, productData)) {
    changed = true;
  }
  
  // Ensure proper minWidth (prevent collapse)
  const currentMinWidth = props.minWidth;
  const isZeroMinWidth = !currentMinWidth || 
    (typeof currentMinWidth === 'object' && (currentMinWidth.value === '0' || currentMinWidth.value === 0)) ||
    currentMinWidth === '0' || currentMinWidth === '0px';
  
  if (isZeroMinWidth) {
    props.minWidth = '260px';
    changed = true;
    console.log(`[Product Repair] Fixed minWidth for: ${component.id}`);
  }
  
  // Ensure width is 100% to fill grid cell
  if (props.width !== '100%') {
    props.width = '100%';
    changed = true;
  }
  
  // FALLBACK ONLY: Shadow — only if AI set nothing at all
  if (props.boxShadows === undefined || props.boxShadows === null) {
    props.boxShadows = [{
      enabled: true, type: 'outer',
      x: 0, y: 10, blur: 30, spread: -5,
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
      topLeft: '12', topRight: '12', bottomRight: '12', bottomLeft: '12', unit: 'px'
    };
    changed = true;
  }
  
  // Ensure proper flex layout
  if (props.display !== 'flex') {
    props.display = 'flex';
    props.flexDirection = 'column';
    changed = true;
  }
  
  // Ensure overflow hidden (structural)
  if (props.overflow !== 'hidden') {
    props.overflow = 'hidden';
    changed = true;
  }
  
  // FALLBACK ONLY: backgroundColor — only if completely absent
  if (props.backgroundColor === undefined || props.backgroundColor === null) {
    props.backgroundColor = { type: 'solid', value: 'hsl(var(--card))' };
    props._aiGenerated = true;
    changed = true;
  }
  
  component.props = props;
  return changed;
}

/**
 * Injects avatar into testimonial card if missing
 */
function injectTestimonialAvatar(component: AppComponent, profile: typeof TESTIMONIAL_PROFILES[0]): boolean {
  const children = component.children || [];
  let changed = false;
  
  // Check if avatar already exists
  const hasAvatar = (comps: any[]): boolean => {
    for (const c of comps) {
      if (c.type === 'avatar') return true;
      if (c.type === 'image' && (c.id || '').toLowerCase().includes('avatar')) return true;
      if (c.children && hasAvatar(c.children)) return true;
    }
    return false;
  };
  
  if (hasAvatar(children)) return false;
  
  // Find or create author section
  let authorSection = children.find((c: any) => {
    const cid = (c.id || '').toLowerCase();
    return cid.includes('author') || cid.includes('client') || cid.includes('user');
  });
  
  // Create avatar component
  const avatarComponent: AppComponent = {
    id: `${component.id}-avatar-${Date.now()}`,
    type: 'avatar',
    props: {
      src: profile.avatarUrl,
      alt: profile.name,
      size: 'md',
      fallback: profile.name.split(' ').map(n => n[0]).join(''),
      width: '48px',
      height: '48px',
      borderRadius: { topLeft: '9999', topRight: '9999', bottomRight: '9999', bottomLeft: '9999', unit: 'px' },
      flexShrink: '0',
      objectFit: 'cover'
    },
    style: {},
    children: []
  };
  
  if (authorSection && authorSection.type === 'div') {
    // Add avatar to beginning of author section
    authorSection.children = authorSection.children || [];
    authorSection.children.unshift(avatarComponent);
    authorSection.props = authorSection.props || {};
    authorSection.props.display = 'flex';
    authorSection.props.flexDirection = 'row';
    authorSection.props.alignItems = 'center';
    authorSection.props.justifyContent = 'flex-start';
    authorSection.props.gap = '12px';
    authorSection.props.flexWrap = 'nowrap';
    changed = true;
    console.log(`[Testimonial Repair] Added avatar to existing author section`);
  } else {
    // Create new author section with avatar
    const newAuthorSection: AppComponent = {
      id: `${component.id}-author-section-${Date.now()}`,
      type: 'div',
      props: { 
        display: 'flex', 
        flexDirection: 'row',
        alignItems: 'center', 
        justifyContent: 'flex-start',
        gap: '12px',
        flexWrap: 'nowrap',
        spacingControl: {
          margin: { top: '20', right: '0', bottom: '0', left: '0', unit: 'px' }
        }
      },
      style: {},
      children: [
        avatarComponent,
        {
          id: `${component.id}-author-info-${Date.now()}`,
          type: 'div',
          props: { 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            gap: '4',
            flexShrink: '0'
          },
          style: {},
          children: [
            { 
              id: `${component.id}-name-${Date.now()}`, 
              type: 'text', 
              props: { 
                content: profile.name, 
                typography: { fontSize: '15', fontWeight: '600', color: 'hsl(var(--foreground))' } 
              },
              style: {},
              children: []
            },
            { 
              id: `${component.id}-role-${Date.now()}`, 
              type: 'text', 
              props: { 
                content: profile.role, 
                typography: { fontSize: '13', color: 'hsl(var(--muted-foreground))' } 
              },
              style: {},
              children: []
            }
          ]
        }
      ]
    };
    
    children.push(newAuthorSection);
    component.children = children;
    changed = true;
    console.log(`[Testimonial Repair] Created new author section with avatar`);
  }
  
  // Update existing name/role if generic
  for (const child of children) {
    if (child.type === 'text' || child.type === 'heading') {
      const content = String(child.props?.content || '').toLowerCase();
      if (content === 'client name' || content === 'customer name' || content === 'name') {
        child.props.content = profile.name;
        changed = true;
      }
      if (content === 'role' || content === 'position' || content === 'ceo' || content.includes('title')) {
        child.props.content = profile.role;
        changed = true;
      }
    }
    
    // Check nested divs
    if (child.type === 'div' && Array.isArray(child.children)) {
      for (const nested of child.children) {
        if (nested.type === 'text') {
          const content = String(nested.props?.content || '').toLowerCase();
          if (content === 'client name' || content === 'customer name') {
            nested.props.content = profile.name;
            changed = true;
          }
          if (content === 'role' || content === 'position') {
            nested.props.content = profile.role;
            changed = true;
          }
        }
      }
    }
  }
  
  return changed;
}

/**
 * Reorganizes testimonial card children to ensure proper Quote → Author ordering
 */
function reorganizeTestimonialCardChildren(component: AppComponent, profile: typeof TESTIMONIAL_PROFILES[0]): boolean {
  const children = component.children || [];
  if (children.length === 0) return false;
  
  let changed = false;
  
  // Categorize children
  let quoteChild: any = null;
  let authorSection: any = null;
  const otherChildren: any[] = [];
  const floatingNameRoleTexts: any[] = [];
  
  for (const child of children) {
    const childId = (child.id || '').toLowerCase();
    const childType = child.type;
    
    // Check if this is the author section
    if (childType === 'div' && (childId.includes('author') || childId.includes('client') || childId.includes('user-info'))) {
      authorSection = child;
      continue;
    }
    
    // Check if this is quote text (typically the longest text or one that looks like a testimonial)
    if ((childType === 'text' || childType === 'heading') && !childId.includes('name') && !childId.includes('role')) {
      const content = String(child.props?.content || '');
      if (content.length > 40 || childId.includes('quote') || childId.includes('testimonial')) {
        quoteChild = child;
        continue;
      }
    }
    
    // Check for floating name/role texts that should be in author section
    if (childType === 'text') {
      const content = String(child.props?.content || '').toLowerCase();
      const nameLower = profile.name.toLowerCase();
      const isNameLike = content.includes(nameLower) || 
                         childId.includes('name') || 
                         childId.includes('role') ||
                         content === 'client name' || 
                         content === 'customer name';
      if (isNameLike) {
        floatingNameRoleTexts.push(child);
        continue;
      }
    }
    
    otherChildren.push(child);
  }
  
  // If we have floating name/role texts but no author section, wrap them
  if (floatingNameRoleTexts.length > 0 && !authorSection) {
    authorSection = {
      id: `${component.id}-author-repaired-${Date.now()}`,
      type: 'div',
      props: { 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12',
        spacingControl: { margin: { top: '20', right: '0', bottom: '0', left: '0', unit: 'px' } }
      },
      style: {},
      children: floatingNameRoleTexts
    };
    changed = true;
    console.log(`[Testimonial Repair] Wrapped floating name/role texts into author section`);
  }
  
  // Reconstruct children: quote first, then others, then author section last
  const newChildren: any[] = [];
  if (quoteChild) newChildren.push(quoteChild);
  newChildren.push(...otherChildren);
  if (authorSection) {
    newChildren.push(authorSection);
  }
  
  // Only update if we actually reordered something meaningful
  if (newChildren.length > 0 && (quoteChild || authorSection)) {
    component.children = newChildren;
    changed = true;
  }
  
  return changed;
}

/**
 * Fixes author section internal layout (avatar + name/role alignment)
 */
function fixAuthorSectionLayout(component: AppComponent): boolean {
  const children = component.children || [];
  let changed = false;
  
  for (const child of children) {
    const childId = (child.id || '').toLowerCase();
    
    // Find author section divs
    if (child.type === 'div' && (childId.includes('author') || childId.includes('client') || childId.includes('user-info'))) {
      const authorProps = child.props || {};
      
      // Enforce horizontal flex layout for avatar + info
      if (authorProps.display !== 'flex') {
        authorProps.display = 'flex';
        changed = true;
      }
      // Force row layout (avatar beside text, not stacked)
      if (authorProps.flexDirection !== 'row') {
        authorProps.flexDirection = 'row';
        changed = true;
      }
      if (authorProps.alignItems !== 'center') {
        authorProps.alignItems = 'center';
        changed = true;
      }
      // Prevent centering issues - align to start
      if (authorProps.justifyContent !== 'flex-start') {
        authorProps.justifyContent = 'flex-start';
        changed = true;
      }
      // Prevent wrapping
      if (authorProps.flexWrap !== 'nowrap') {
        authorProps.flexWrap = 'nowrap';
        changed = true;
      }
      if (!authorProps.gap || parseInt(String(authorProps.gap)) < 10) {
        authorProps.gap = '16px';
        changed = true;
      }
      
      // Add margin-top to separate from quote text
      authorProps.spacingControl = authorProps.spacingControl || {};
      const currentMarginTop = authorProps.spacingControl.margin?.top;
      if (!currentMarginTop || parseInt(String(currentMarginTop)) < 16) {
        authorProps.spacingControl.margin = {
          top: '20', right: '0', bottom: '0', left: '0', unit: 'px'
        };
        changed = true;
      }
      
      child.props = authorProps;
      
      // Fix avatar sizing and nested info div
      if (Array.isArray(child.children)) {
        for (const nestedChild of child.children) {
          // Fix avatar sizing - ensure it doesn't shrink
          if (nestedChild.type === 'avatar' || nestedChild.type === 'image') {
            nestedChild.props = nestedChild.props || {};
            // Force explicit pixel dimensions (never auto)
            nestedChild.props.width = '48px';
            nestedChild.props.height = '48px';
            nestedChild.props.flexShrink = '0';
            nestedChild.props.objectFit = 'cover';
            if (nestedChild.type === 'avatar') {
              nestedChild.props.borderRadius = { topLeft: '9999', topRight: '9999', bottomRight: '9999', bottomLeft: '9999', unit: 'px' };
            }
            if (nestedChild.type === 'image') {
              nestedChild.props.borderRadius = { topLeft: '9999', topRight: '9999', bottomRight: '9999', bottomLeft: '9999', unit: 'px' };
            }
            changed = true;
          }
          // Fix info container
          if (nestedChild.type === 'div') {
            const nestedId = (nestedChild.id || '').toLowerCase();
            // Info container should be column layout
            if (nestedId.includes('info') || nestedId.includes('details') || nestedId.includes('text')) {
              nestedChild.props = nestedChild.props || {};
              nestedChild.props.display = 'flex';
              nestedChild.props.flexDirection = 'column';
              nestedChild.props.justifyContent = 'center';
              nestedChild.props.gap = '4px';
              nestedChild.props.flexShrink = '1';
              nestedChild.props.minWidth = '0';
              nestedChild.props.overflow = 'hidden';
              changed = true;
              
              // Add text truncation to children
              if (Array.isArray(nestedChild.children)) {
                for (const textChild of nestedChild.children) {
                  if (textChild.type === 'text' || textChild.type === 'heading') {
                    textChild.props = textChild.props || {};
                    textChild.props.overflow = 'hidden';
                    textChild.props.textOverflow = 'ellipsis';
                    textChild.props.whiteSpace = 'nowrap';
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  return changed;
}

/**
 * CRITICAL: Ensures avatar is INSIDE the author section, not floating separately
 * Moves any floating avatars into their proper author sections
 */
function consolidateFloatingAvatars(component: AppComponent): boolean {
  const children = component.children || [];
  if (children.length === 0) return false;
  
  let changed = false;
  let floatingAvatar: any = null;
  let authorSection: any = null;
  const newChildren: any[] = [];
  
  // Find floating avatar and author section
  for (const child of children) {
    const childId = (child.id || '').toLowerCase();
    const childType = child.type;
    
    // Check if this is a floating avatar (not inside author section)
    if ((childType === 'avatar' || childType === 'image') && childId.includes('avatar')) {
      floatingAvatar = child;
      continue;
    }
    
    // Check if this is the author section
    if (childType === 'div' && (childId.includes('author') || childId.includes('client') || childId.includes('user-info'))) {
      authorSection = child;
      continue;
    }
    
    newChildren.push(child);
  }
  
  // If we have both a floating avatar and author section, move avatar INTO author section
  if (floatingAvatar && authorSection) {
    // Fix avatar props first
    floatingAvatar.props = floatingAvatar.props || {};
    floatingAvatar.props.width = '48px';
    floatingAvatar.props.height = '48px';
    floatingAvatar.props.flexShrink = '0';
    floatingAvatar.props.objectFit = 'cover';
    floatingAvatar.props.borderRadius = { topLeft: '9999', topRight: '9999', bottomRight: '9999', bottomLeft: '9999', unit: 'px' };
    
    // Add avatar to the beginning of author section
    authorSection.children = authorSection.children || [];
    
    // Check if author section already has an avatar
    const hasAvatarAlready = authorSection.children.some((c: any) => 
      c.type === 'avatar' || ((c.id || '').toLowerCase().includes('avatar') && c.type === 'image')
    );
    
    if (!hasAvatarAlready) {
      authorSection.children.unshift(floatingAvatar);
      console.log(`[Testimonial Repair] Moved floating avatar into author section`);
    }
    
    // Ensure author section has proper horizontal layout
    authorSection.props = authorSection.props || {};
    authorSection.props.display = 'flex';
    authorSection.props.flexDirection = 'row';
    authorSection.props.alignItems = 'center';
    authorSection.props.justifyContent = 'flex-start';
    authorSection.props.gap = '12px';
    authorSection.props.flexWrap = 'nowrap';
    
    // Reconstruct children with author section at the end
    newChildren.push(authorSection);
    component.children = newChildren;
    changed = true;
  } else if (floatingAvatar && !authorSection) {
    // Create author section for floating avatar
    const newAuthorSection = {
      id: `${component.id}-author-consolidated-${Date.now()}`,
      type: 'div' as const,
      props: { 
        display: 'flex', 
        flexDirection: 'row',
        alignItems: 'center', 
        justifyContent: 'flex-start',
        gap: '12',
        flexWrap: 'nowrap',
        spacingControl: {
          margin: { top: '20', right: '0', bottom: '0', left: '0', unit: 'px' }
        }
      },
      style: {},
      children: [floatingAvatar]
    } as AppComponent;
    
    newChildren.push(newAuthorSection);
    component.children = newChildren as AppComponent[];
    changed = true;
    console.log(`[Testimonial Repair] Created author section for floating avatar`);
  }
  
  return changed;
}

/**
 * Ensures author section has both avatar and info, creates info div if missing
 */
function ensureAuthorSectionStructure(component: AppComponent, profile: typeof TESTIMONIAL_PROFILES[0]): boolean {
  const children = component.children || [];
  let changed = false;
  
  for (const child of children) {
    const childId = (child.id || '').toLowerCase();
    
    if (child.type === 'div' && (childId.includes('author') || childId.includes('client') || childId.includes('user-info'))) {
      const authorChildren = child.children || [];
      
      // Check what's in the author section
      let hasInfoDiv = false;
      let infoDiv: any = null;
      const floatingTexts: any[] = [];
      let hasAvatar = false;
      
      for (const ac of authorChildren) {
        if (ac.type === 'div') {
          const acId = (ac.id || '').toLowerCase();
          if (acId.includes('info') || acId.includes('details') || acId.includes('text')) {
            hasInfoDiv = true;
            infoDiv = ac;
          }
        } else if (ac.type === 'text' || ac.type === 'heading') {
          floatingTexts.push(ac);
        } else if (ac.type === 'avatar' || ac.type === 'image') {
          hasAvatar = true;
        }
      }
      
      // Helper to create name/role texts from profile
      const createNameRoleTexts = () => [
        { 
          id: `${child.id}-name-${Date.now()}`, 
          type: 'text' as const, 
          props: { 
            content: profile.name, 
            typography: { fontSize: '15', fontWeight: '600', color: 'hsl(var(--foreground))' },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          },
          style: {},
          children: []
        },
        { 
          id: `${child.id}-role-${Date.now()}`, 
          type: 'text' as const, 
          props: { 
            content: profile.role, 
            typography: { fontSize: '13', color: 'hsl(var(--muted-foreground))' },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          },
          style: {},
          children: []
        }
      ];
      
      // Helper to create info div
      const createInfoDivWithTexts = (texts: any[]) => ({
        id: `${child.id}-info-${Date.now()}`,
        type: 'div' as const,
        props: { 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          gap: '4px',
          flexShrink: '1',
          minWidth: '0',
          overflow: 'hidden'
        },
        style: {},
        children: texts
      });
      
      // CASE 1: Has floating texts but no info div - wrap them
      if (floatingTexts.length > 0 && !hasInfoDiv) {
        const newInfoDiv = createInfoDivWithTexts(floatingTexts);
        const avatar = authorChildren.find((c: any) => c.type === 'avatar' || c.type === 'image');
        child.children = (avatar ? [avatar, newInfoDiv] : [newInfoDiv]) as AppComponent[];
        changed = true;
        console.log(`[Testimonial Repair] Wrapped floating texts in info div`);
      }
      // CASE 2: Has avatar but NO info div AND NO floating texts - create name/role from profile
      else if (hasAvatar && !hasInfoDiv && floatingTexts.length === 0) {
        const newInfoDiv = createInfoDivWithTexts(createNameRoleTexts());
        const avatar = authorChildren.find((c: any) => c.type === 'avatar' || c.type === 'image');
        child.children = (avatar ? [avatar, newInfoDiv] : [newInfoDiv]) as AppComponent[];
        changed = true;
        console.log(`[Testimonial Repair] Created name/role from profile: ${profile.name}`);
      }
      // CASE 3: Has info div but it's EMPTY - populate with profile data
      else if (hasInfoDiv && infoDiv && (!infoDiv.children || infoDiv.children.length === 0)) {
        infoDiv.children = createNameRoleTexts();
        changed = true;
        console.log(`[Testimonial Repair] Populated empty info div with profile: ${profile.name}`);
      }
    }
  }
  
  return changed;
}

/**
 * Repairs a single testimonial card by fixing layout, shadows, and adding avatar
 */
function repairTestimonialCard(component: AppComponent): boolean {
  const id = (component.id || '').toLowerCase();
  
  // Expanded patterns for testimonial/client/review/feedback/quote cards
  const isTestimonialCardId = 
    id.includes('testimonial-card') ||
    id.includes('client-card') ||
    id.includes('review-card') ||
    id.includes('feedback-card') ||
    id.includes('quote-card');

  if (!isTestimonialCardId || component.type !== 'div') return false;
  
  let changed = false;
  const props = component.props || {};
  
  // Get unique profile data based on index
  const profiles = getShuffledProfiles();
  const profile = profiles[testimonialCardIndex % profiles.length];
  testimonialCardIndex++;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL: Enforce flex column layout for consistent card structure
  // ═══════════════════════════════════════════════════════════════════════════
  if (props.display !== 'flex') {
    props.display = 'flex';
    changed = true;
  }
  if (props.flexDirection !== 'column') {
    props.flexDirection = 'column';
    changed = true;
  }
  
  // Ensure minimum gap between quote and author
  if (!props.gap || parseInt(String(props.gap)) < 16) {
    props.gap = '20px';
    changed = true;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Reorganize children to ensure Quote → Author order
  // ═══════════════════════════════════════════════════════════════════════════
  if (reorganizeTestimonialCardChildren(component, profile)) {
    changed = true;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Inject avatar if missing
  // ═══════════════════════════════════════════════════════════════════════════
  if (injectTestimonialAvatar(component, profile)) {
    changed = true;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Fix author section layout (enforce flex row with proper alignment)
  // ═══════════════════════════════════════════════════════════════════════════
  if (fixAuthorSectionLayout(component)) {
    changed = true;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL: Consolidate any floating avatars into author section
  // ═══════════════════════════════════════════════════════════════════════════
  if (consolidateFloatingAvatars(component)) {
    changed = true;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Ensure author section has proper structure (avatar + info div)
  // ═══════════════════════════════════════════════════════════════════════════
  if (ensureAuthorSectionStructure(component, profile)) {
    changed = true;
  }
  
  // FALLBACK ONLY: Shadow — only if AI set nothing at all
  if (props.boxShadows === undefined || props.boxShadows === null) {
    props.boxShadows = [{
      enabled: true, type: 'outer',
      x: 0, y: 8, blur: 28, spread: -4,
      color: 'rgba(0,0,0,0.12)'
    }];
    changed = true;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FLEXBOX CARD SIZING - For even distribution
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
  
  // FALLBACK ONLY: backgroundColor — only if completely absent
  if (props.backgroundColor === undefined || props.backgroundColor === null) {
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
  
  component.props = props;
  return changed;
}

/**
 * Injects e-commerce action buttons (Add to Cart, Wishlist) into product cards if missing
 * This ensures all product cards have modern e-commerce functionality
 */
function injectProductActions(component: AppComponent): boolean {
  const id = (component.id || '').toLowerCase();
  if (!id.includes('product-card') || component.type !== 'div') return false;
  
  const children = component.children || [];
  let changed = false;
  
  // Check if actions already exist
  const hasActions = children.some((child: any) => {
    const childId = (child.id || '').toLowerCase();
    return childId.includes('actions') || 
           childId.includes('add-cart') || 
           childId.includes('cart-btn') ||
           childId.includes('wishlist');
  });
  
  // Also check nested children for buttons
  const hasNestedButtons = (comps: any[]): boolean => {
    for (const c of comps) {
      if (c.type === 'button') {
        const btnText = String(c.props?.text || c.props?.content || '').toLowerCase();
        if (btnText.includes('cart') || btnText.includes('buy') || btnText.includes('add')) {
          return true;
        }
      }
      if (c.children && hasNestedButtons(c.children)) return true;
    }
    return false;
  };
  
  if (hasActions || hasNestedButtons(children)) return false;
  
  // Find the price element to inject actions after it
  let contentContainer: any = null;
  let priceIndex = -1;
  
  for (const child of children) {
    if (child.type === 'div' && Array.isArray(child.children)) {
      const childId = (child.id || '').toLowerCase();
      if (childId.includes('content') || childId.includes('info') || childId.includes('details')) {
        contentContainer = child;
        // Find price within content container
        for (let i = 0; i < child.children.length; i++) {
          const c = child.children[i];
          const content = String(c.props?.content || '').trim();
          const cid = (c.id || '').toLowerCase();
          if (content.startsWith('$') || cid.includes('price')) {
            priceIndex = i;
          }
        }
      }
    }
  }
  
  // Create the actions row
  const actionsRow: AppComponent = {
    id: `${component.id}-actions-${Date.now()}`,
    type: 'div' as ComponentType,
    props: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '8',
      spacingControl: { 
        padding: { top: '0', right: '16', bottom: '16', left: '16', unit: 'px' } 
      },
      _aiGenerated: true,
    },
    style: {},
    children: [
      {
        id: `${component.id}-add-cart-${Date.now()}`,
        type: 'button' as ComponentType,
        props: {
          text: 'Add to Cart',
          variant: 'default',
          width: '100%',
          flexGrow: '1',
          _aiGenerated: true,
        },
        style: {},
        children: []
      },
      {
        id: `${component.id}-wishlist-${Date.now()}`,
        type: 'button' as ComponentType,
        props: {
          text: '♡',
          variant: 'outline',
          width: '44px',
          minWidth: '44px',
          flexShrink: '0',
          _aiGenerated: true,
        },
        style: {},
        children: []
      }
    ]
  };
  
  // Inject the actions row
  if (contentContainer) {
    // Add padding to content if it doesn't have bottom padding
    const contentPadding = contentContainer.props?.spacingControl?.padding;
    if (contentPadding) {
      contentPadding.bottom = '8';
    }
    // Actions go after content container as a sibling
    const contentIndex = children.indexOf(contentContainer);
    if (contentIndex >= 0) {
      children.splice(contentIndex + 1, 0, actionsRow);
      component.children = children;
      changed = true;
      console.log(`[Product Repair] Injected action buttons: ${component.id}`);
    }
  } else {
    // No content container found, append to end
    children.push(actionsRow);
    component.children = children;
    changed = true;
    console.log(`[Product Repair] Appended action buttons to end: ${component.id}`);
  }
  
  return changed;
}

/**
 * Injects rating stars into product cards if missing
 */
function injectProductRating(component: AppComponent): boolean {
  const id = (component.id || '').toLowerCase();
  if (!id.includes('product-card') || component.type !== 'div') return false;
  
  const children = component.children || [];
  
  // Check if rating already exists
  const hasRating = (comps: any[]): boolean => {
    for (const c of comps) {
      const cid = (c.id || '').toLowerCase();
      const content = String(c.props?.content || '');
      if (cid.includes('rating') || cid.includes('stars') || content.includes('★')) {
        return true;
      }
      if (c.children && hasRating(c.children)) return true;
    }
    return false;
  };
  
  if (hasRating(children)) return false;
  
  // Find content container and price element
  for (const child of children) {
    if (child.type === 'div' && Array.isArray(child.children)) {
      const childId = (child.id || '').toLowerCase();
      if (childId.includes('content') || childId.includes('info') || childId.includes('details')) {
        // Find price index
        let priceIndex = -1;
        for (let i = 0; i < child.children.length; i++) {
          const c = child.children[i];
          const content = String(c.props?.content || '').trim();
          const cid = (c.id || '').toLowerCase();
          if (content.startsWith('$') || cid.includes('price')) {
            priceIndex = i;
            break;
          }
        }
        
        if (priceIndex >= 0) {
          // Generate random rating
          const starCount = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars
          const stars = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);
          const reviewCount = Math.floor(Math.random() * 200) + 30;
          
          const ratingRow: AppComponent = {
            id: `${component.id}-rating-${Date.now()}`,
            type: 'div' as ComponentType,
            props: {
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '4',
              _aiGenerated: true,
            },
            style: {},
            children: [
              {
                id: `${component.id}-stars-${Date.now()}`,
                type: 'text' as ComponentType,
                props: {
                  content: stars,
                  typography: { fontSize: '14', color: 'hsl(45 93% 47%)' },
                  _aiGenerated: true,
                },
                style: {},
                children: []
              },
              {
                id: `${component.id}-review-count-${Date.now()}`,
                type: 'text' as ComponentType,
                props: {
                  content: `(${reviewCount})`,
                  typography: { fontSize: '12', color: 'hsl(var(--muted-foreground))' },
                  _aiGenerated: true,
                },
                style: {},
                children: []
              }
            ]
          };
          
          // Insert rating before price
          child.children.splice(priceIndex, 0, ratingRow);
          console.log(`[Product Repair] Injected rating stars: ${component.id}`);
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Repairs product/testimonial grid containers
 */
function repairGridContainer(component: AppComponent): boolean {
  const id = (component.id || '').toLowerCase();
  
  // Expanded product grid patterns
  const isProductGrid = 
    id.includes('products-grid') || 
    id.includes('product-grid') ||
    id.includes('products-container') ||
    id.includes('product-cards');

  // Expanded testimonial/client/review/feedback/quote grid patterns
  const isTestimonialGrid = 
    id.includes('testimonials-grid') || 
    id.includes('testimonial-grid') ||
    id.includes('testimonials-container') ||
    id.includes('testimonial-cards') ||
    // Client variations (for "What Our Clients Say")
    id.includes('clients-grid') ||
    id.includes('client-grid') ||
    id.includes('clients-container') ||
    id.includes('client-cards') ||
    // Review variations
    id.includes('reviews-grid') ||
    id.includes('review-grid') ||
    id.includes('reviews-container') ||
    id.includes('review-cards') ||
    // Feedback variations
    id.includes('feedback-grid') ||
    id.includes('feedback-container') ||
    // Quote variations
    id.includes('quotes-grid') ||
    id.includes('quote-grid');

  // General grid patterns for other section types
  const isGeneralGrid = 
    // Team
    id.includes('team-grid') ||
    id.includes('team-container') ||
    id.includes('team-cards') ||
    // Pricing
    id.includes('pricing-grid') ||
    id.includes('pricing-container') ||
    id.includes('pricing-cards') ||
    // Portfolio/Projects
    id.includes('portfolio-grid') ||
    id.includes('portfolio-container') ||
    id.includes('portfolio-cards') ||
    id.includes('projects-grid') ||
    id.includes('projects-container') ||
    id.includes('project-cards') ||
    // Gallery
    id.includes('gallery-grid') ||
    id.includes('gallery-container') ||
    id.includes('gallery-cards') ||
    // Services
    id.includes('services-grid') ||
    id.includes('services-container') ||
    id.includes('services-cards') ||
    // Benefits
    id.includes('benefits-grid') ||
    id.includes('benefits-container') ||
    id.includes('benefits-cards') ||
    // Capabilities
    id.includes('capabilities-grid') ||
    id.includes('capabilities-container') ||
    id.includes('capabilities-cards') ||
    // Offerings
    id.includes('offerings-grid') ||
    id.includes('offerings-container') ||
    id.includes('offerings-cards') ||
    // Stats
    id.includes('stats-grid') ||
    id.includes('stats-container') ||
    id.includes('stats-cards') ||
    // About
    id.includes('about-grid') ||
    id.includes('about-container') ||
    // FAQ
    id.includes('faq-grid') ||
    id.includes('faq-container');
  
  if ((!isProductGrid && !isTestimonialGrid && !isGeneralGrid) || component.type !== 'div') return false;
  
  let changed = false;
  const props = component.props || {};
  
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
  
  // Ensure full width
  if (props.width !== '100%') {
    props.width = '100%';
    changed = true;
  }
  
  // FALLBACK ONLY: maxWidth — only set if completely missing
  if (!props.maxWidth) {
    props.maxWidth = '1400px';
    changed = true;
  }
  
  // Center the container
  if (!props.spacingControl?.margin) {
    props.spacingControl = props.spacingControl || {};
    props.spacingControl.margin = { top: '0', right: 'auto', bottom: '0', left: 'auto', unit: 'px' };
    changed = true;
  }
  
  // Mark as AI-generated for proper rendering
  props._aiGenerated = true;
  
  component.props = props;
  
  return changed;
}

/**
 * Repairs section spacing
 */
function repairSectionSpacing(component: AppComponent): boolean {
  const id = (component.id || '').toLowerCase();
  const type = component.type;
  
  // STRICT: Only match actual section containers
  const isActualSection = type === 'section' || (id.endsWith('-section') && type === 'div');
  
  // EXCLUDE: Headers, grids, cards, items, content wrappers
  const isSubComponent = 
    id.includes('-header') || 
    id.includes('-grid') || 
    id.includes('-card') || 
    id.includes('-item') ||
    id.includes('-content') ||
    id.includes('-wrapper') ||
    id.includes('-container');
  
  if (!isActualSection || isSubComponent) return false;
  
  let changed = false;
  const props = component.props || {};
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL: Section Isolation - Prevents text from bleeding between sections
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Position relative creates a stacking context
  if (props.position !== 'relative') {
    props.position = 'relative';
    changed = true;
    console.log(`[Section Spacing] Added position:relative to: ${component.id}`);
  }
  
  // Overflow hidden clips content at section boundaries
  if (props.overflow !== 'hidden') {
    props.overflow = 'hidden';
    changed = true;
    console.log(`[Section Spacing] Added overflow:hidden to: ${component.id}`);
  }
  
  // FALLBACK ONLY: padding — only if no padding exists at all
  if (!props.spacingControl?.padding?.top && !props.spacingControl?.padding?.bottom) {
    props.spacingControl = props.spacingControl || {};
    props.spacingControl.padding = {
      top: '80', right: '24', bottom: '80', left: '24', unit: 'px'
    };
    changed = true;
  }
  
  // Ensure section takes full width
  if (props.width !== '100%') {
    props.width = '100%';
    changed = true;
  }
  
  component.props = props;
  return changed;
}

/**
 * Recursively traverses a component tree and repairs product/testimonial cards
 */
export function repairProductCardsInTree(component: AppComponent): boolean {
  let changed = false;
  
  // Check and repair sections
  if (repairSectionSpacing(component)) {
    changed = true;
  }
  
  // Check and repair grid containers
  if (repairGridContainer(component)) {
    changed = true;
  }
  
  // Check and repair product cards
  if (repairProductCard(component)) {
    changed = true;
  }
  
  // NOTE: Removed injectProductActions() and injectProductRating() calls
  // These caused broken layouts by injecting elements post-render.
  // Product cards should now be generated CORRECTLY by the AI with all elements.
  
  // Check and repair testimonial cards
  if (repairTestimonialCard(component)) {
    changed = true;
  }
  
  // Recurse into children
  if (Array.isArray(component.children)) {
    for (const child of component.children) {
      if (repairProductCardsInTree(child as AppComponent)) {
        changed = true;
      }
    }
  }
  
  return changed;
}

/**
 * Repairs all pages in a project for product and testimonial cards
 */
export function repairProjectProductCards(pages: any[]): boolean {
  // Reset indices for each repair session
  productCardIndex = 0;
  testimonialCardIndex = 0;
  
  let changed = false;
  
  for (const page of pages) {
    if (Array.isArray(page.components)) {
      for (const component of page.components) {
        if (repairProductCardsInTree(component)) {
          changed = true;
        }
      }
    }
  }
  
  if (changed) {
    console.log('[Layout Repairs] Product/Testimonial card repairs applied with unique content');
  }
  
  return changed;
}
