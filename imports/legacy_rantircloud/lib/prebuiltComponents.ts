import { AppComponent, ComponentStyle } from '@/types/appBuilder';
import { v4 as uuidv4 } from 'uuid';

export interface PrebuiltComponent {
  id: string;
  name: string;
  description: string;
  category: 'navigation' | 'layout' | 'marketing' | 'forms' | 'cards';
  preview: string;
  createComponent: () => AppComponent;
}

const uid = () => uuidv4();

const createStyle = (options: {
  layout?: ComponentStyle['layout'];
  spacing?: ComponentStyle['spacing'];
  sizing?: ComponentStyle['sizing'];
  typography?: ComponentStyle['typography'];
  background?: ComponentStyle['background'];
  border?: ComponentStyle['border'];
  shadow?: ComponentStyle['shadow'];
}): ComponentStyle => ({
  layout: options.layout,
  spacing: options.spacing,
  sizing: options.sizing,
  typography: options.typography,
  background: options.background,
  border: options.border,
  shadow: options.shadow,
});

// ===================== NAVIGATION COMPONENTS =====================

function createSidebarNavItem(label: string, icon: string, isActive: boolean): AppComponent {
  return {
    id: uid(),
    type: 'container',
    props: { cursor: 'pointer' },
    style: createStyle({
      layout: { display: 'flex', alignItems: 'center', gap: 12 },
      spacing: { padding: { top: 12, bottom: 12, left: 16, right: 16 } },
      background: isActive ? { color: 'hsl(var(--primary))' } : undefined,
      border: { radius: 8 },
    }),
    children: [
      {
        id: uid(),
        type: 'container',
        props: {},
        style: createStyle({
          sizing: { width: '20px', height: '20px' },
          layout: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        }),
        children: [
          {
            id: uid(),
            type: 'icon',
            props: { name: icon, size: 18, color: isActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))' },
            style: createStyle({}),
            children: [],
          }
        ],
      },
      {
        id: uid(),
        type: 'text',
        props: { text: label },
        style: createStyle({
          typography: {
            fontSize: '14px',
            fontWeight: isActive ? '600' : '500',
            color: isActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
          },
        }),
        children: [],
      },
    ],
  };
}

function createHeaderNavLink(label: string, isActive: boolean): AppComponent {
  return {
    id: uid(),
    type: 'container',
    props: { cursor: 'pointer' },
    style: createStyle({
      spacing: { padding: { top: 8, bottom: 8, left: 16, right: 16 } },
      border: isActive ? { radius: 6 } : undefined,
      background: isActive ? { color: 'hsl(var(--accent))' } : undefined,
    }),
    children: [
      {
        id: uid(),
        type: 'text',
        props: { text: label },
        style: createStyle({
          typography: {
            fontSize: '14px',
            fontWeight: isActive ? '600' : '500',
            color: isActive ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
          },
        }),
        children: [],
      }
    ],
  };
}

// ===================== CARD COMPONENTS =====================

function createFeatureItem(text: string): AppComponent {
  return {
    id: uid(),
    type: 'container',
    props: {},
    style: createStyle({
      layout: { display: 'flex', alignItems: 'center', gap: 12 },
    }),
    children: [
      {
        id: uid(),
        type: 'container',
        props: {},
        style: createStyle({
          sizing: { width: '20px', height: '20px' },
          layout: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
          background: { color: 'hsl(var(--primary) / 0.15)' },
          border: { radius: 9999 },
        }),
        children: [
          {
            id: uid(),
            type: 'icon',
            props: { name: 'Check', size: 12, color: 'hsl(var(--primary))' },
            style: createStyle({}),
            children: [],
          }
        ],
      },
      {
        id: uid(),
        type: 'text',
        props: { text },
        style: createStyle({
          typography: { fontSize: '14px', color: 'hsl(var(--foreground))' },
        }),
        children: [],
      },
    ],
  };
}

function createFooterColumn(title: string, links: string[]): AppComponent {
  return {
    id: uid(),
    type: 'container',
    props: {},
    style: createStyle({
      layout: { display: 'flex', flexDirection: 'column', gap: 16 },
    }),
    children: [
      {
        id: uid(),
        type: 'text',
        props: { text: title },
        style: createStyle({
          typography: { fontSize: '14px', fontWeight: '600', color: 'hsl(var(--foreground))' },
        }),
        children: [],
      },
      {
        id: uid(),
        type: 'container',
        props: {},
        style: createStyle({
          layout: { display: 'flex', flexDirection: 'column', gap: 12 },
        }),
        children: links.map(link => ({
          id: uid(),
          type: 'text' as const,
          props: { text: link, cursor: 'pointer' },
          style: createStyle({
            typography: { fontSize: '14px', color: 'hsl(var(--muted-foreground))' },
          }),
          children: [],
        })),
      },
    ],
  };
}

// ===================== PREBUILT COMPONENTS =====================

export const prebuiltComponents: PrebuiltComponent[] = [
  // ================= NAVIGATION =================
  {
    id: 'sidebar-nav',
    name: 'Sidebar Navigation',
    description: 'Vertical sidebar with branding, nav menu & user profile',
    category: 'navigation',
    preview: 'PanelLeft',
    createComponent: () => ({
      id: uid(),
      type: 'container',
      props: {},
      style: createStyle({
        sizing: { width: '260px', height: '100vh' },
        layout: { display: 'flex', flexDirection: 'column' },
        background: { color: 'hsl(var(--card))' },
        border: { width: 1, style: 'solid', color: 'hsl(var(--border))' },
      }),
      children: [
        // Logo Section
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({
            layout: { display: 'flex', alignItems: 'center', gap: 12 },
            spacing: { padding: { top: 24, bottom: 24, left: 20, right: 20 } },
            border: { width: 0, color: 'hsl(var(--border))', style: 'solid' },
          }),
          children: [
            {
              id: uid(),
              type: 'container',
              props: {},
              style: createStyle({
                sizing: { width: '38px', height: '38px' },
                layout: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
                background: { gradient: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(262 83% 58%) 100%)' },
                border: { radius: 10 },
              }),
              children: [
                {
                  id: uid(),
                  type: 'icon',
                  props: { name: 'Layers', size: 20, color: 'hsl(var(--primary-foreground))' },
                  style: createStyle({}),
                  children: [],
                }
              ],
            },
            {
              id: uid(),
              type: 'text',
              props: { text: 'Acme Studio' },
              style: createStyle({
                typography: { fontSize: '17px', fontWeight: '700', color: 'hsl(var(--foreground))' },
              }),
              children: [],
            },
          ],
        },
        // Navigation Section
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({
            layout: { display: 'flex', flexDirection: 'column', gap: 2 },
            spacing: { padding: { top: 8, bottom: 8, left: 12, right: 12 } },
          }),
          children: [
            // Section Label
            {
              id: uid(),
              type: 'text',
              props: { text: 'WORKSPACE' },
              style: createStyle({
                typography: { fontSize: '10px', fontWeight: '600', color: 'hsl(var(--muted-foreground))' },
                spacing: { padding: { left: 12, bottom: 8, top: 8 } },
              }),
              children: [],
            },
            createSidebarNavItem('Overview', 'LayoutGrid', true),
            createSidebarNavItem('Campaigns', 'Megaphone', false),
            createSidebarNavItem('Audience', 'Users', false),
            createSidebarNavItem('Reports', 'TrendingUp', false),
            // Second Section
            {
              id: uid(),
              type: 'text',
              props: { text: 'TOOLS' },
              style: createStyle({
                typography: { fontSize: '10px', fontWeight: '600', color: 'hsl(var(--muted-foreground))' },
                spacing: { padding: { left: 12, bottom: 8, top: 20 } },
              }),
              children: [],
            },
            createSidebarNavItem('Integrations', 'Plug', false),
            createSidebarNavItem('Automations', 'Workflow', false),
            createSidebarNavItem('Settings', 'Settings', false),
          ],
        },
        // Spacer - pushes user section to bottom
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({ sizing: { height: 'auto', minHeight: '100px' } }),
          children: [],
        },
        // User Section at bottom
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({
            layout: { display: 'flex', alignItems: 'center', gap: 12 },
            spacing: { padding: { top: 16, bottom: 16, left: 16, right: 16 }, margin: { left: 12, right: 12, bottom: 16 } },
            background: { color: 'hsl(var(--muted) / 0.4)' },
            border: { radius: 12 },
          }),
          children: [
            {
              id: uid(),
              type: 'container',
              props: {},
              style: createStyle({
                sizing: { width: '36px', height: '36px' },
                layout: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
                background: { gradient: 'linear-gradient(135deg, hsl(25 95% 53%) 0%, hsl(350 89% 60%) 100%)' },
                border: { radius: 9999 },
              }),
              children: [
                {
                  id: uid(),
                  type: 'text',
                  props: { text: 'S' },
                  style: createStyle({
                    typography: { fontSize: '14px', fontWeight: '600', color: 'white' },
                  }),
                  children: [],
                }
              ],
            },
            {
              id: uid(),
              type: 'container',
              props: {},
              style: createStyle({
                layout: { display: 'flex', flexDirection: 'column' },
              }),
              children: [
                {
                  id: uid(),
                  type: 'text',
                  props: { text: 'Sarah Chen' },
                  style: createStyle({
                    typography: { fontSize: '13px', fontWeight: '600', color: 'hsl(var(--foreground))' },
                  }),
                  children: [],
                },
                {
                  id: uid(),
                  type: 'text',
                  props: { text: 'Pro Plan' },
                  style: createStyle({
                    typography: { fontSize: '11px', color: 'hsl(var(--muted-foreground))' },
                  }),
                  children: [],
                },
              ],
            },
            {
              id: uid(),
              type: 'icon',
              props: { name: 'ChevronsUpDown', size: 16, color: 'hsl(var(--muted-foreground))' },
              style: createStyle({}),
              children: [],
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'header-nav',
    name: 'Header Navigation',
    description: 'Modern header with logo, navigation links and CTA button',
    category: 'navigation',
    preview: 'Navigation',
    createComponent: () => ({
      id: uid(),
      type: 'container',
      props: {},
      style: createStyle({
        sizing: { width: '100%' },
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'between' },
        spacing: { padding: { top: 16, bottom: 16, left: 32, right: 32 } },
        background: { color: 'hsl(var(--background) / 0.8)' },
        border: { width: 1, style: 'solid', color: 'hsl(var(--border))' },
      }),
      children: [
        // Logo
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({
            layout: { display: 'flex', alignItems: 'center', gap: 10 },
          }),
          children: [
            {
              id: uid(),
              type: 'container',
              props: {},
              style: createStyle({
                sizing: { width: '36px', height: '36px' },
                layout: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
                background: { color: 'hsl(var(--primary))' },
                border: { radius: 8 },
              }),
              children: [
                {
                  id: uid(),
                  type: 'icon',
                  props: { name: 'Sparkles', size: 20, color: 'hsl(var(--primary-foreground))' },
                  style: createStyle({}),
                  children: [],
                }
              ],
            },
            {
              id: uid(),
              type: 'text',
              props: { text: 'Brand' },
              style: createStyle({
                typography: { fontSize: '20px', fontWeight: '700', color: 'hsl(var(--foreground))' },
              }),
              children: [],
            },
          ],
        },
        // Navigation Links
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({
            layout: { display: 'flex', alignItems: 'center', gap: 4 },
          }),
          children: [
            createHeaderNavLink('Home', true),
            createHeaderNavLink('Features', false),
            createHeaderNavLink('Pricing', false),
            createHeaderNavLink('About', false),
          ],
        },
        // CTA Buttons
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({
            layout: { display: 'flex', alignItems: 'center', gap: 12 },
          }),
          children: [
            {
              id: uid(),
              type: 'button',
              props: { text: 'Sign In', variant: 'ghost' },
              style: createStyle({
                spacing: { padding: { top: 10, bottom: 10, left: 20, right: 20 } },
                border: { radius: 8 },
                typography: { fontSize: '14px', fontWeight: '500' },
              }),
              children: [],
            },
            {
              id: uid(),
              type: 'button',
              props: { text: 'Get Started', variant: 'default' },
              style: createStyle({
                spacing: { padding: { top: 10, bottom: 10, left: 20, right: 20 } },
                background: { color: 'hsl(var(--primary))' },
                border: { radius: 8 },
                typography: { fontSize: '14px', fontWeight: '600', color: 'hsl(var(--primary-foreground))' },
                shadow: { blur: 8, spread: -2, color: 'hsl(var(--primary) / 0.3)', x: 0, y: 4 },
              }),
              children: [],
            },
          ],
        },
      ],
    }),
  },

  // ================= CARDS =================
  {
    id: 'feature-card',
    name: 'Feature Card',
    description: 'Elegant card with icon, heading and description',
    category: 'cards',
    preview: 'CreditCard',
    createComponent: () => ({
      id: uid(),
      type: 'container',
      props: {},
      style: createStyle({
        sizing: { width: '320px' },
        layout: { display: 'flex', flexDirection: 'column', gap: 20 },
        spacing: { padding: 28 },
        background: { color: 'hsl(var(--card))' },
        border: { radius: 16, width: 1, style: 'solid', color: 'hsl(var(--border))' },
        shadow: { blur: 20, spread: -5, color: 'hsl(var(--foreground) / 0.05)', x: 0, y: 10 },
      }),
      children: [
        // Icon
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({
            sizing: { width: '56px', height: '56px' },
            layout: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            background: { gradient: 'linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--primary) / 0.05) 100%)' },
            border: { radius: 14 },
          }),
          children: [
            {
              id: uid(),
              type: 'icon',
              props: { name: 'Zap', size: 28, color: 'hsl(var(--primary))' },
              style: createStyle({}),
              children: [],
            }
          ],
        },
        // Content
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({
            layout: { display: 'flex', flexDirection: 'column', gap: 10 },
          }),
          children: [
            {
              id: uid(),
              type: 'heading',
              props: { text: 'Lightning Fast', level: 'h3' },
              style: createStyle({
                typography: { fontSize: '20px', fontWeight: '600', color: 'hsl(var(--foreground))' },
              }),
              children: [],
            },
            {
              id: uid(),
              type: 'text',
              props: { text: 'Experience blazing fast performance with our optimized infrastructure and intelligent caching system.' },
              style: createStyle({
                typography: { fontSize: '14px', color: 'hsl(var(--muted-foreground))', lineHeight: '1.6' },
              }),
              children: [],
            },
          ],
        },
        // Link
        {
          id: uid(),
          type: 'container',
          props: { cursor: 'pointer' },
          style: createStyle({
            layout: { display: 'flex', alignItems: 'center', gap: 6 },
          }),
          children: [
            {
              id: uid(),
              type: 'text',
              props: { text: 'Learn more' },
              style: createStyle({
                typography: { fontSize: '14px', fontWeight: '600', color: 'hsl(var(--primary))' },
              }),
              children: [],
            },
            {
              id: uid(),
              type: 'icon',
              props: { name: 'ArrowRight', size: 16, color: 'hsl(var(--primary))' },
              style: createStyle({}),
              children: [],
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'pricing-card',
    name: 'Pricing Card',
    description: 'Professional pricing card with features list',
    category: 'cards',
    preview: 'DollarSign',
    createComponent: () => ({
      id: uid(),
      type: 'container',
      props: {},
      style: createStyle({
        sizing: { width: '340px' },
        layout: { display: 'flex', flexDirection: 'column' },
        background: { color: 'hsl(var(--card))' },
        border: { radius: 20, width: 2, style: 'solid', color: 'hsl(var(--primary))' },
        shadow: { blur: 30, spread: -10, color: 'hsl(var(--primary) / 0.15)', x: 0, y: 20 },
      }),
      children: [
        // Popular Badge
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({
            layout: { display: 'flex', justifyContent: 'center' },
            spacing: { padding: { top: 12 } },
          }),
          children: [
            {
              id: uid(),
              type: 'container',
              props: {},
              style: createStyle({
                spacing: { padding: { top: 6, bottom: 6, left: 16, right: 16 } },
                background: { color: 'hsl(var(--primary))' },
                border: { radius: 9999 },
              }),
              children: [
                {
                  id: uid(),
                  type: 'text',
                  props: { text: 'MOST POPULAR' },
                  style: createStyle({
                    typography: { fontSize: '11px', fontWeight: '700', color: 'hsl(var(--primary-foreground))' },
                  }),
                  children: [],
                },
              ],
            },
          ],
        },
        // Header
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({
            layout: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
            spacing: { padding: { top: 24, bottom: 24, left: 32, right: 32 } },
          }),
          children: [
            {
              id: uid(),
              type: 'text',
              props: { text: 'Pro' },
              style: createStyle({
                typography: { fontSize: '24px', fontWeight: '700', color: 'hsl(var(--foreground))' },
              }),
              children: [],
            },
            {
              id: uid(),
              type: 'container',
              props: {},
              style: createStyle({
                layout: { display: 'flex', alignItems: 'end', gap: 4 },
              }),
              children: [
                {
                  id: uid(),
                  type: 'text',
                  props: { text: '$29' },
                  style: createStyle({
                    typography: { fontSize: '48px', fontWeight: '800', color: 'hsl(var(--foreground))' },
                  }),
                  children: [],
                },
                {
                  id: uid(),
                  type: 'text',
                  props: { text: '/month' },
                  style: createStyle({
                    typography: { fontSize: '16px', color: 'hsl(var(--muted-foreground))' },
                    spacing: { padding: { bottom: 8 } },
                  }),
                  children: [],
                },
              ],
            },
            {
              id: uid(),
              type: 'text',
              props: { text: 'Perfect for growing businesses' },
              style: createStyle({
                typography: { fontSize: '14px', color: 'hsl(var(--muted-foreground))', textAlign: 'center' },
              }),
              children: [],
            },
          ],
        },
        // Features
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({
            layout: { display: 'flex', flexDirection: 'column', gap: 16 },
            spacing: { padding: { top: 24, bottom: 24, left: 32, right: 32 } },
            border: { width: 1, style: 'solid', color: 'hsl(var(--border))' },
          }),
          children: [
            createFeatureItem('Unlimited projects'),
            createFeatureItem('Advanced analytics'),
            createFeatureItem('Priority support'),
            createFeatureItem('Custom integrations'),
            createFeatureItem('Team collaboration'),
          ],
        },
        // CTA
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({
            spacing: { padding: { top: 24, bottom: 28, left: 32, right: 32 } },
          }),
          children: [
            {
              id: uid(),
              type: 'button',
              props: { text: 'Get Started Now', variant: 'default' },
              style: createStyle({
                sizing: { width: '100%' },
                spacing: { padding: { top: 14, bottom: 14 } },
                background: { color: 'hsl(var(--primary))' },
                border: { radius: 10 },
                typography: { fontSize: '16px', fontWeight: '600', color: 'hsl(var(--primary-foreground))' },
                shadow: { blur: 12, spread: -3, color: 'hsl(var(--primary) / 0.4)', x: 0, y: 6 },
              }),
              children: [],
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'stats-card',
    name: 'Stats Card',
    description: 'Metric display with trend indicator',
    category: 'cards',
    preview: 'TrendingUp',
    createComponent: () => ({
      id: uid(),
      type: 'container',
      props: {},
      style: createStyle({
        sizing: { width: '240px' },
        layout: { display: 'flex', flexDirection: 'column', gap: 16 },
        spacing: { padding: 24 },
        background: { color: 'hsl(var(--card))' },
        border: { radius: 16, width: 1, style: 'solid', color: 'hsl(var(--border))' },
      }),
      children: [
        // Header Row
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({
            layout: { display: 'flex', alignItems: 'center', justifyContent: 'between' },
          }),
          children: [
            {
              id: uid(),
              type: 'text',
              props: { text: 'Total Revenue' },
              style: createStyle({
                typography: { fontSize: '14px', fontWeight: '500', color: 'hsl(var(--muted-foreground))' },
              }),
              children: [],
            },
            {
              id: uid(),
              type: 'container',
              props: {},
              style: createStyle({
                sizing: { width: '36px', height: '36px' },
                layout: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
                background: { color: 'hsl(var(--primary) / 0.1)' },
                border: { radius: 10 },
              }),
              children: [
                {
                  id: uid(),
                  type: 'icon',
                  props: { name: 'DollarSign', size: 18, color: 'hsl(var(--primary))' },
                  style: createStyle({}),
                  children: [],
                }
              ],
            },
          ],
        },
        // Value
        {
          id: uid(),
          type: 'text',
          props: { text: '$45,231.89' },
          style: createStyle({
            typography: { fontSize: '32px', fontWeight: '700', color: 'hsl(var(--foreground))' },
          }),
          children: [],
        },
        // Trend
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({
            layout: { display: 'flex', alignItems: 'center', gap: 8 },
          }),
          children: [
            {
              id: uid(),
              type: 'container',
              props: {},
              style: createStyle({
                layout: { display: 'flex', alignItems: 'center', gap: 4 },
                spacing: { padding: { top: 4, bottom: 4, left: 8, right: 8 } },
                background: { color: 'hsl(142 76% 36% / 0.1)' },
                border: { radius: 6 },
              }),
              children: [
                {
                  id: uid(),
                  type: 'icon',
                  props: { name: 'TrendingUp', size: 14, color: 'hsl(142 76% 36%)' },
                  style: createStyle({}),
                  children: [],
                },
                {
                  id: uid(),
                  type: 'text',
                  props: { text: '+20.1%' },
                  style: createStyle({
                    typography: { fontSize: '12px', fontWeight: '600', color: 'hsl(142 76% 36%)' },
                  }),
                  children: [],
                },
              ],
            },
            {
              id: uid(),
              type: 'text',
              props: { text: 'from last month' },
              style: createStyle({
                typography: { fontSize: '12px', color: 'hsl(var(--muted-foreground))' },
              }),
              children: [],
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'testimonial-card',
    name: 'Testimonial Card',
    description: 'Customer testimonial with avatar and quote',
    category: 'cards',
    preview: 'Quote',
    createComponent: () => ({
      id: uid(),
      type: 'container',
      props: {},
      style: createStyle({
        sizing: { width: '380px' },
        layout: { display: 'flex', flexDirection: 'column', gap: 24 },
        spacing: { padding: 32 },
        background: { color: 'hsl(var(--card))' },
        border: { radius: 20, width: 1, style: 'solid', color: 'hsl(var(--border))' },
        shadow: { blur: 24, spread: -8, color: 'hsl(var(--foreground) / 0.08)', x: 0, y: 12 },
      }),
      children: [
        // Stars
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({
            layout: { display: 'flex', gap: 4 },
          }),
          children: Array(5).fill(null).map(() => ({
            id: uid(),
            type: 'icon' as const,
            props: { name: 'Star', size: 18, color: 'hsl(45 93% 47%)', fill: 'hsl(45 93% 47%)' },
            style: createStyle({}),
            children: [],
          })),
        },
        // Quote
        {
          id: uid(),
          type: 'text',
          props: { text: '"This product has completely transformed how we work. The intuitive interface and powerful features have saved us countless hours. Highly recommended!"' },
          style: createStyle({
            typography: { fontSize: '16px', color: 'hsl(var(--foreground))', lineHeight: '1.7' },
          }),
          children: [],
        },
        // Author
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({
            layout: { display: 'flex', alignItems: 'center', gap: 14 },
          }),
          children: [
            {
              id: uid(),
              type: 'container',
              props: {},
              style: createStyle({
                sizing: { width: '48px', height: '48px' },
                layout: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
                background: { gradient: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(262 83% 58%) 100%)' },
                border: { radius: 9999 },
              }),
              children: [
                {
                  id: uid(),
                  type: 'text',
                  props: { text: 'SK' },
                  style: createStyle({
                    typography: { fontSize: '16px', fontWeight: '600', color: 'hsl(var(--primary-foreground))' },
                  }),
                  children: [],
                }
              ],
            },
            {
              id: uid(),
              type: 'container',
              props: {},
              style: createStyle({
                layout: { display: 'flex', flexDirection: 'column', gap: 2 },
              }),
              children: [
                {
                  id: uid(),
                  type: 'text',
                  props: { text: 'Sarah Kim' },
                  style: createStyle({
                    typography: { fontSize: '15px', fontWeight: '600', color: 'hsl(var(--foreground))' },
                  }),
                  children: [],
                },
                {
                  id: uid(),
                  type: 'text',
                  props: { text: 'Product Manager at TechCorp' },
                  style: createStyle({
                    typography: { fontSize: '13px', color: 'hsl(var(--muted-foreground))' },
                  }),
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    }),
  },

  // ================= MARKETING =================
  {
    id: 'footer-section',
    name: 'Footer Section',
    description: 'Complete footer with links, social icons and copyright',
    category: 'marketing',
    preview: 'LayoutGrid',
    createComponent: () => ({
      id: uid(),
      type: 'container',
      props: {},
      style: createStyle({
        sizing: { width: '100%' },
        layout: { display: 'flex', flexDirection: 'column', gap: 48 },
        spacing: { padding: { top: 64, bottom: 32, left: 48, right: 48 } },
        background: { color: 'hsl(var(--card))' },
        border: { width: 1, style: 'solid', color: 'hsl(var(--border))' },
      }),
      children: [
        // Main Footer Content
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({
            layout: { display: 'flex', justifyContent: 'between', gap: 64 },
          }),
          children: [
            // Brand Column
            {
              id: uid(),
              type: 'container',
              props: {},
              style: createStyle({
                layout: { display: 'flex', flexDirection: 'column', gap: 20 },
                sizing: { maxWidth: '280px' },
              }),
              children: [
                {
                  id: uid(),
                  type: 'container',
                  props: {},
                  style: createStyle({
                    layout: { display: 'flex', alignItems: 'center', gap: 10 },
                  }),
                  children: [
                    {
                      id: uid(),
                      type: 'container',
                      props: {},
                      style: createStyle({
                        sizing: { width: '32px', height: '32px' },
                        layout: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
                        background: { color: 'hsl(var(--primary))' },
                        border: { radius: 8 },
                      }),
                      children: [
                        {
                          id: uid(),
                          type: 'icon',
                          props: { name: 'Sparkles', size: 18, color: 'hsl(var(--primary-foreground))' },
                          style: createStyle({}),
                          children: [],
                        }
                      ],
                    },
                    {
                      id: uid(),
                      type: 'text',
                      props: { text: 'Brand' },
                      style: createStyle({
                        typography: { fontSize: '18px', fontWeight: '700', color: 'hsl(var(--foreground))' },
                      }),
                      children: [],
                    },
                  ],
                },
                {
                  id: uid(),
                  type: 'text',
                  props: { text: 'Build beautiful products with our powerful platform. No coding required.' },
                  style: createStyle({
                    typography: { fontSize: '14px', color: 'hsl(var(--muted-foreground))', lineHeight: '1.6' },
                  }),
                  children: [],
                },
                // Social Icons
                {
                  id: uid(),
                  type: 'container',
                  props: {},
                  style: createStyle({
                    layout: { display: 'flex', gap: 12 },
                  }),
                  children: ['Twitter', 'Github', 'Linkedin'].map(social => ({
                    id: uid(),
                    type: 'container' as const,
                    props: { cursor: 'pointer' },
                    style: createStyle({
                      sizing: { width: '36px', height: '36px' },
                      layout: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
                      background: { color: 'hsl(var(--muted))' },
                      border: { radius: 8 },
                    }),
                    children: [
                      {
                        id: uid(),
                        type: 'icon' as const,
                        props: { name: social, size: 18, color: 'hsl(var(--muted-foreground))' },
                        style: createStyle({}),
                        children: [],
                      }
                    ],
                  })),
                },
              ],
            },
            // Link Columns
            createFooterColumn('Product', ['Features', 'Pricing', 'Changelog', 'Roadmap']),
            createFooterColumn('Company', ['About', 'Blog', 'Careers', 'Press']),
            createFooterColumn('Support', ['Help Center', 'Contact', 'Privacy', 'Terms']),
          ],
        },
        // Copyright
        {
          id: uid(),
          type: 'container',
          props: {},
          style: createStyle({
            layout: { display: 'flex', justifyContent: 'between', alignItems: 'center' },
            spacing: { padding: { top: 24 } },
            border: { width: 1, style: 'solid', color: 'hsl(var(--border))' },
          }),
          children: [
            {
              id: uid(),
              type: 'text',
              props: { text: '© 2024 Brand. All rights reserved.' },
              style: createStyle({
                typography: { fontSize: '14px', color: 'hsl(var(--muted-foreground))' },
              }),
              children: [],
            },
          ],
        },
      ],
    }),
  },
];

export function getPrebuiltComponentsByCategory() {
  const categories = {
    navigation: [] as PrebuiltComponent[],
    layout: [] as PrebuiltComponent[],
    marketing: [] as PrebuiltComponent[],
    forms: [] as PrebuiltComponent[],
    cards: [] as PrebuiltComponent[],
  };
  prebuiltComponents.forEach(comp => categories[comp.category].push(comp));
  return categories;
}
