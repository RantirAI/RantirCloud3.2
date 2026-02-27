import React, { useState } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { AppComponent } from '@/types/appBuilder';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import * as Iconsax from 'iconsax-react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AppSidebarProps {
  component: AppComponent;
  isPreview: boolean;
}

// Helper to create an icon element from Iconsax
const createIconElement = (iconName: string | undefined, variant: string = 'Bold', size: number = 16, className?: string) => {
  if (!iconName) return null;
  
  // Try Iconsax first (the IconPicker uses Iconsax)
  const IconsaxComponent = (Iconsax as any)[iconName];
  if (IconsaxComponent) {
    return <IconsaxComponent size={size} variant={variant} className={className} />;
  }
  
  // Try Lucide as fallback
  const LucideComponent = (LucideIcons as any)[iconName];
  if (LucideComponent) {
    return <LucideComponent size={size} className={className} />;
  }
  
  return null;
};

export function AppSidebar({ component, isPreview }: AppSidebarProps) {
  const { currentProject, setCurrentPage, currentPage } = useAppBuilderStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  const props = component.props || {};
  const {
    title = 'Navigation',
    mode = 'sidebar', // default to shadcn sidebar
    variant = 'default',
    position = 'left',
    pages = [],
    backgroundColor,
    textColor,
    activeColor,
    activeBackgroundColor,
    hoverBackgroundColor,
    width = '16rem',
    logo = '',
    logoHeight = '32px',
    logoAlt = 'Logo',
    topbarHeight = '56px',
    paddingX = '16px',
    paddingY = '0px',
    itemsAlign = 'center',
  } = props;

  const availablePages = currentProject?.pages || [];

  // Process pages - keep icon name and variant for direct rendering
  const sidebarPages = pages.map((pageConfig: any) => {
    const page = pageConfig.type !== 'external' 
      ? availablePages.find(p => p.id === pageConfig.pageId)
      : null;
    if (pageConfig.type !== 'external' && !page) return null;

    const children = (pageConfig.children || []).map((child: any) => {
      const childPage = child.type !== 'external'
        ? availablePages.find(p => p.id === child.pageId)
        : null;
      if (child.type !== 'external' && !childPage) return null;
      
      return {
        ...child,
        page: childPage,
      };
    }).filter(Boolean);

    return {
      ...pageConfig,
      page,
      children
    };
  }).filter(Boolean);

  const handlePageClick = (pageConfig: any) => {
    if (pageConfig.type === 'external' && pageConfig.externalUrl) {
      window.open(pageConfig.externalUrl, '_blank');
    } else if (isPreview && pageConfig.pageId) {
      setCurrentPage(pageConfig.pageId);
    }
    setIsMobileMenuOpen(false);
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // RESIZABLE TOPBAR MODE (animated)
  if (mode === 'resizable-topbar') {
    const navItems = sidebarPages.map((item) => ({
      name: item.label,
      link: item.pageId || item.externalUrl || item.id,
      icon: createIconElement(item.icon, item.iconVariant, 16)
    }));

    return (
      <div className="relative w-full">
        <Navbar>
          <NavBody>
            <NavbarLogo 
              src={logo} 
              alt={logoAlt} 
              height={logoHeight}
              fallbackText={title}
            />
            <NavItems 
              items={navItems} 
              onItemClick={(link) => {
                const item = sidebarPages.find(p => 
                  p.pageId === link || p.externalUrl === link || p.id === link
                );
                if (item) handlePageClick(item);
              }}
              activeItem={currentPage}
            />
            <div className="flex items-center gap-4" />
          </NavBody>

          <MobileNav>
            <MobileNavHeader>
              <NavbarLogo 
                src={logo} 
                alt={logoAlt} 
                height={logoHeight}
                fallbackText={title}
              />
              <MobileNavToggle
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              />
            </MobileNavHeader>

            <MobileNavMenu
              isOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
            >
              {sidebarPages.map((item) => (
                <button
                  key={item.id || item.pageId}
                  onClick={() => handlePageClick(item)}
                  className={cn(
                    "relative flex items-center gap-2 py-2 text-neutral-600 dark:text-neutral-300",
                    currentPage === item.pageId && "font-medium"
                  )}
                >
                  {createIconElement(item.icon, item.iconVariant, 16)}
                  {item.label}
                </button>
              ))}
            </MobileNavMenu>
          </MobileNav>
        </Navbar>
        <div className="h-16" />
      </div>
    );
  }

  // SIMPLE TOPBAR MODE
  if (mode === 'topbar') {
    const alignmentClasses = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between'
    };

    return (
      <div 
        className="w-full border-b"
        style={{ 
          backgroundColor: backgroundColor || 'hsl(var(--sidebar))', 
          color: textColor || 'hsl(var(--sidebar-foreground))'
        }}
      >
        <div 
          className={cn(
            "flex items-center w-full",
            alignmentClasses[itemsAlign as keyof typeof alignmentClasses] || 'justify-start'
          )}
          style={{
            height: topbarHeight,
            paddingLeft: paddingX,
            paddingRight: paddingX,
            paddingTop: paddingY,
            paddingBottom: paddingY,
          }}
        >
          {logo ? (
            <div className="flex items-center mr-6 shrink-0">
              <img 
                src={logo} 
                alt={logoAlt}
                style={{ height: logoHeight, width: 'auto' }}
                className="object-contain"
              />
            </div>
          ) : title ? (
            <h3 className="font-semibold text-sm mr-6 shrink-0">{title}</h3>
          ) : null}
          
          <nav className={cn(
            "flex items-center gap-1",
            itemsAlign === 'between' ? 'flex-1' : ''
          )}>
            {sidebarPages.map((item) => {
              const isActive = currentPage === item.pageId;
              return (
                <button
                  key={item.id || item.pageId}
                  onClick={() => handlePageClick(item)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors cursor-pointer",
                    "hover:bg-[var(--nav-hover-bg)]"
                  )}
                  style={{
                    '--nav-hover-bg': hoverBackgroundColor || 'transparent',
                    color: isActive ? (activeColor || 'hsl(var(--sidebar-primary))') : undefined,
                    backgroundColor: isActive ? (activeBackgroundColor || 'hsl(var(--sidebar-accent))') : 'transparent',
                  } as React.CSSProperties}
                >
                  {createIconElement(item.icon, item.iconVariant, 16, "flex-shrink-0")}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    );
  }

  // DEFAULT: SHADCN SIDEBAR MODE
  const renderMenuItem = (item: any) => {
    const hasChildren = item.children?.length > 0;
    const isActive = currentPage === item.pageId;
    const isExpanded = expandedGroups.has(item.id);

    if (hasChildren) {
      return (
        <Collapsible
          key={item.id || item.pageId}
          open={isExpanded}
          onOpenChange={() => toggleGroup(item.id)}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                isActive={isActive}
                className={cn("w-full", "hover:bg-[var(--nav-hover-bg)]")}
                style={{
                  '--nav-hover-bg': hoverBackgroundColor || 'transparent',
                  color: isActive ? activeColor : textColor,
                  backgroundColor: isActive ? activeBackgroundColor : undefined,
                } as React.CSSProperties}
              >
                {createIconElement(item.icon, item.iconVariant, 16)}
                <span className="flex-1">{item.label}</span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 transition-transform" />
                ) : (
                  <ChevronRight className="h-4 w-4 transition-transform" />
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.children.map((child: any) => (
                  <SidebarMenuSubItem key={child.id || child.pageId}>
                    <SidebarMenuSubButton
                      isActive={currentPage === child.pageId}
                      onClick={() => handlePageClick(child)}
                      className={cn("cursor-pointer", "hover:bg-[var(--nav-hover-bg)]")}
                      style={{
                        '--nav-hover-bg': hoverBackgroundColor || 'transparent',
                        color: currentPage === child.pageId ? activeColor : textColor,
                        backgroundColor: currentPage === child.pageId ? activeBackgroundColor : undefined,
                      } as React.CSSProperties}
                    >
                      {createIconElement(child.icon, child.iconVariant, 14)}
                      <span>{child.label}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuItem key={item.id || item.pageId}>
        <SidebarMenuButton
          isActive={isActive}
          onClick={() => handlePageClick(item)}
          className={cn("cursor-pointer", "hover:bg-[var(--nav-hover-bg)]")}
          style={{
            '--nav-hover-bg': hoverBackgroundColor || 'transparent',
            color: isActive ? activeColor : textColor,
            backgroundColor: isActive ? activeBackgroundColor : undefined,
          } as React.CSSProperties}
        >
          {createIconElement(item.icon, item.iconVariant, 16)}
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar
        side={position as 'left' | 'right'}
        variant={variant === 'floating' ? 'floating' : 'sidebar'}
        className={cn(
          "border-r",
          variant === 'floating' && "rounded-lg shadow-lg m-2"
        )}
        style={{
          '--sidebar-width': width,
          backgroundColor: backgroundColor || undefined,
          color: textColor || undefined,
        } as React.CSSProperties}
      >
        <SidebarHeader className="border-b border-sidebar-border">
          {logo ? (
            <div className="flex items-center px-2 py-3">
              <img 
                src={logo} 
                alt={logoAlt}
                style={{ height: logoHeight, width: 'auto' }}
                className="object-contain"
              />
            </div>
          ) : title ? (
            <div className="flex items-center px-2 py-3">
              <h3 className="font-semibold text-sm">{title}</h3>
            </div>
          ) : null}
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sidebarPages.map(renderMenuItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}
