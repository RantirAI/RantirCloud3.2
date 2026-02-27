import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Palette,
  Type,
  Square,
  Move,
  Container,
  CornerDownRight,
  Sparkles,
  FormInput,
  Layout,
} from 'lucide-react';

const navigationItems = [
  {
    title: 'Colors',
    url: '/design-system/colors',
    icon: Palette,
    description: 'Color palette and tokens',
  },
  {
    title: 'Typography',
    url: '/design-system/typography',
    icon: Type,
    description: 'Font families and text styles',
  },
  {
    title: 'Buttons',
    url: '/design-system/buttons',
    icon: Square,
    description: 'Button variants and states',
  },
  {
    title: 'Gaps',
    url: '/design-system/gaps',
    icon: Move,
    description: 'Spacing and layout gaps',
  },
  {
    title: 'Container',
    url: '/design-system/container',
    icon: Container,
    description: 'Container sizes and layouts',
  },
  {
    title: 'Border Radius',
    url: '/design-system/border-radius',
    icon: CornerDownRight,
    description: 'Rounded corners and borders',
  },
  {
    title: 'Effects',
    url: '/design-system/effects',
    icon: Sparkles,
    description: 'Shadows, gradients and animations',
  },
  {
    title: 'Forms',
    url: '/design-system/forms',
    icon: FormInput,
    description: 'Form elements and validation',
  },
  {
    title: 'Components',
    url: '/design-system/components',
    icon: Layout,
    description: 'UI component library',
  },
];

export function DesignSystemSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50';

  return (
    <Sidebar className={open ? 'w-60' : 'w-14'}>
      <div className="p-4 border-b border-border">
        {open && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Palette className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-sm">Design System</h1>
              <p className="text-xs text-muted-foreground">Professional UI Kit</p>
            </div>
          </div>
        )}
        
        {!open && (
          <div className="flex justify-center">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Palette className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Design Tokens</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={getNavCls}
                      title={!open ? item.description : undefined}
                      >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}