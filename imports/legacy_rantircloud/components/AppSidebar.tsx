
import { useState, useEffect } from "react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Network, Settings, ChevronDown, ChevronUp, Database, Plus, LogOut, ScrollText, Grid3X3, FileText } from "lucide-react";
import { databaseService } from "@/services/databaseService";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { NewFlowDialog } from "./NewFlowDialog";
import { useSidebar } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


export function AppSidebar() {
  const {
    user
  } = useAuth();
  const {
    pathname
  } = useLocation();
  const {
    state
  } = useSidebar();
  const [databases, setDatabases] = useState<any[]>([]);
  const [flowProjects, setFlowProjects] = useState<any[]>([]);
  const [appProjects, setAppProjects] = useState<any[]>([]);
  const [databasesExpanded, setDatabasesExpanded] = useState(true);
  const [flowsExpanded, setFlowsExpanded] = useState(true);
  const [appsExpanded, setAppsExpanded] = useState(true);
  
  useEffect(() => {
    const loadProjects = async () => {
      if (!user) return;
      try {
        // Load databases
        const databasesData = await databaseService.getUserDatabases(user.id);
        setDatabases(databasesData);
        
        // Load flow projects
        const { data: flows, error: flowError } = await supabase
          .from("flow_projects")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });
        
        if (flowError) {
          console.error("Failed to load flow projects", flowError);
        } else {
          setFlowProjects(flows || []);
        }

        // Load app projects
        const { data: apps, error: appError } = await supabase
          .from("app_projects")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });
        
        if (appError) {
          console.error("Failed to load app projects", appError);
        } else {
          setAppProjects(apps || []);
        }
      } catch (error) {
        console.error("Failed to load projects", error);
      }
    };
    if (user) {
      loadProjects();
    }
  }, [user]);
  
  useEffect(() => {
    if (pathname.includes('/databases')) {
      setDatabasesExpanded(true);
    }
    if (pathname.includes('/flows')) {
      setFlowsExpanded(true);
    }
    if (pathname.includes('/apps')) {
      setAppsExpanded(true);
    }
  }, [pathname]);
  
  return <Sidebar className={cn("w-60 min-w-[14rem] flex flex-col p-0 font-sans pr-0", "bg-muted/50")}>
      <SidebarHeader className="pt-[44px] pb-2 px-4 relative">
        {user && <div className="pt-6">
            <span className="text-base font-semibold text-[#333348] leading-tight block mb-1">
              {user.email}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors">
                <span className="flex items-center gap-2">
                  {user.user_metadata?.full_name || 'My Account'}
                </span>
                <ChevronDown className="h-4 w-4 ml-1" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="https://www.rantir.com/licensing" target="_blank" rel="noopener noreferrer" className="flex items-center">
                      <ScrollText className="h-4 w-4 mr-2" />
                      License
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => supabase.auth.signOut()} className="flex items-center">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>}
      </SidebarHeader>
      <SidebarContent className="flex-1 px-2 pb-2">
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/'}>
                <Link to="/" className="data-[active=true]:bg-white dark:data-[active=true]:bg-stone-700 data-[active=true]:shadow-form transition">
                  <LayoutDashboard className="h-5 w-5 text-[#888888] stroke-[1.2px]" />
                  <span className="text-[12px] font-semibold">Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={pathname.startsWith('/databases')} onClick={() => setDatabasesExpanded(!databasesExpanded)} className="justify-between transition group">
                <div className="flex items-center">
                  <Database className="h-4 w-4 mr-2 text-[#888888] stroke-[1.2px]" />
                  <span className="text-[12px] font-semibold">Data</span>
                </div>
                {databasesExpanded ? <ChevronUp className="h-4 w-4 text-[#888888] stroke-[1.2px]" /> : <ChevronDown className="h-4 w-4 text-[#888888] stroke-[1.2px]" />}
              </SidebarMenuButton>
              {databasesExpanded && <SidebarMenuSub>
                  {databases.map(db => <SidebarMenuSubItem key={db.id}>
                      <SidebarMenuSubButton asChild isActive={pathname === `/databases/${db.id}`} size="md" className="data-[active=true]:bg-background dark:data-[active=true]:bg-stone-700 data-[active=true]:shadow-form transition">
                        <Link to={`/databases/${db.id}`} className="text-[10px] truncate">
                          {db.name}
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>)}
                  <SidebarMenuSubItem className="hover:opacity-100 opacity-0 transition-opacity group">
                    <SidebarMenuSubButton asChild isActive={false} size="md" className="text-foreground">
                      <Link to="/databases" className="flex items-center text-foreground font-medium">
                        <Plus className="h-3.5 w-3.5 mr-1 text-[#888888] stroke-[1.2px]" />
                        <span className="text-[10px] font-semibold">New Database</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>}
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={pathname === "/flows" || pathname.startsWith("/flows/")} onClick={() => setFlowsExpanded(!flowsExpanded)} className="justify-between transition group">
                <div className="flex items-center">
                  <Network className="h-4 w-4 mr-2 text-[#888888] stroke-[1.2px]" />
                  <span className="text-[12px] font-semibold">Flows</span>
                </div>
                {flowsExpanded ? <ChevronUp className="h-4 w-4 text-[#888888] stroke-[1.2px]" /> : <ChevronDown className="h-4 w-4 text-[#888888] stroke-[1.2px]" />}
              </SidebarMenuButton>
              {flowsExpanded && <SidebarMenuSub>
                  {flowProjects.map(project => <SidebarMenuSubItem key={project.id}>
                      <SidebarMenuSubButton asChild isActive={pathname === `/flows/${project.id}`} size="md" className="data-[active=true]:bg-background dark:data-[active=true]:bg-stone-700 data-[active=true]:shadow-form transition">
                        <Link to={`/flows/${project.id}`} className="text-[10px] truncate">
                          {project.name}
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>)}
                  <SidebarMenuSubItem className="hover:opacity-100 opacity-0 transition-opacity group">
                    <SidebarMenuSubButton asChild={false} isActive={false} size="md" className="">
                      <NewFlowDialog asChild={false} />
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>}
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={pathname === "/apps" || pathname.startsWith("/apps/")} onClick={() => setAppsExpanded(!appsExpanded)} className="justify-between transition group">
                <div className="flex items-center">
                  <Grid3X3 className="h-4 w-4 mr-2 text-[#888888] stroke-[1.2px]" />
                  <span className="text-[12px] font-semibold">Apps</span>
                </div>
                {appsExpanded ? <ChevronUp className="h-4 w-4 text-[#888888] stroke-[1.2px]" /> : <ChevronDown className="h-4 w-4 text-[#888888] stroke-[1.2px]" />}
              </SidebarMenuButton>
              {appsExpanded && <SidebarMenuSub>
                  {appProjects.map(project => <SidebarMenuSubItem key={project.id}>
                      <SidebarMenuSubButton asChild isActive={pathname === `/apps/${project.id}`} size="md" className="data-[active=true]:bg-background dark:data-[active=true]:bg-stone-700 data-[active=true]:shadow-form transition">
                        <Link to={`/apps/${project.id}`} className="text-[10px] truncate">
                          {project.name}
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>)}
                  <SidebarMenuSubItem className="hover:opacity-100 opacity-0 transition-opacity group">
                    <SidebarMenuSubButton asChild isActive={false} size="md" className="text-foreground">
                      <Link to="/apps" className="flex items-center text-foreground font-medium">
                        <Plus className="h-3.5 w-3.5 mr-1 text-[#888888] stroke-[1.2px]" />
                        <span className="text-[10px] font-semibold">New App</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>;
}
