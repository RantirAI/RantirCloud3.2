import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { isValidElement, ReactNode } from 'react'
import {
  Collapsible_Shadcn_ as Collapsible,
  CollapsibleContent_Shadcn_ as CollapsibleContent,
  CollapsibleTrigger_Shadcn_ as CollapsibleTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from 'ui'

export interface NavGroupItem {
  title: string
  url: string
  icon?: LucideIcon | ReactNode
  isActive?: boolean
  label?: string
  items?: {
    title: string
    url: string
    isActive?: boolean
  }[]
}

export interface NavGroupProps {
  label?: string
  items: NavGroupItem[]
  isCollapsible?: boolean
}

export function NavGroup({ label, items, isCollapsible = true }: NavGroupProps) {
  const content = (
    <SidebarMenu className="gap-0">
      {items.map((item) =>
        item.items && item.items.length > 0 ? (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={item.isActive}
                  className="gap-1.5 text-foreground-light"
                >
                  <NavItemIcon icon={item.icon} />
                  <span>{item.title}</span>
                  {item.label && (
                    <span className="ml-1 rounded bg-foreground-muted/20 px-1.5 py-0.5 text-[10px] leading-none font-medium">
                      {item.label}
                    </span>
                  )}
                  <ChevronRight
                    size={14}
                    strokeWidth={1.5}
                    className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-foreground-lighter hidden !w-4 !h-4 group-hover:block"
                  />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub className="gap-0">
                  {item.items.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild isActive={subItem.isActive}>
                        <Link href={subItem.url}>
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ) : (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              tooltip={item.title}
              isActive={item.isActive}
              asChild
              className="gap-1.5 text-foreground-light"
            >
              <Link href={item.url}>
                <NavItemIcon icon={item.icon} />
                <span>{item.title}</span>
                {item.label && (
                  <span className="ml-1 rounded bg-foreground-muted/20 px-1.5 py-0.5 text-[10px] leading-none font-medium">
                    {item.label}
                  </span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      )}
    </SidebarMenu>
  )

  if (label) {
    return (
      <Collapsible defaultOpen className="group/group-collapsible">
        <SidebarGroup>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel
              className={`text-foreground-lighter flex items-center gap-1.5 ${
                isCollapsible ? 'cursor-pointer hover:text-foreground' : 'pointer-events-none'
              }`}
            >
              <span>{label}</span>
              {isCollapsible && (
                <ChevronRight
                  strokeWidth={1.5}
                  className="!w-4 !h-4 transition-transform duration-200 group-data-[state=open]/group-collapsible:rotate-90"
                />
              )}
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent>{content}</CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    )
  }

  return <SidebarGroup>{content}</SidebarGroup>
}

function NavItemIcon({ icon }: { icon?: LucideIcon | ReactNode }) {
  if (!icon) return null

  // If it's already a rendered React element (e.g. <SomeIcon />), use it as-is
  if (isValidElement(icon)) {
    return icon
  }

  // Otherwise it's a component reference (function or forwardRef) - render it
  const IconComponent = icon as LucideIcon
  return <IconComponent size={14} strokeWidth={1.5} />
}
