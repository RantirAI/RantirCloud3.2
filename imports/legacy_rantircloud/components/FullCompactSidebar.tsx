import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Database,
  Network,
  Grid3X3,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  FileText
} from "lucide-react";
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import { useAuth } from '@/hooks/useAuth';
import { workspaceService } from '@/services/workspaceService';
import { supabase } from '@/integrations/supabase/client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { icon: Database, href: "/databases", label: "Databases" },
  { icon: Network, href: "/flows", label: "Flows" },
  { icon: Grid3X3, href: "/apps", label: "Apps" }
];

export function FullCompactSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [databases, setDatabases] = useState<any[]>([]);
  const [flowProjects, setFlowProjects] = useState<any[]>([]);
  const [appProjects, setAppProjects] = useState<any[]>([]);
  

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const [dbResponse, flowResponse, appResponse] = await Promise.all([
        supabase.from('databases').select('*').eq('user_id', user?.id),
        supabase.from('flow_projects').select('*').eq('user_id', user?.id),
        supabase.from('app_projects').select('*').eq('user_id', user?.id)
      ]);

      if (dbResponse.data) setDatabases(dbResponse.data);
      if (flowResponse.data) setFlowProjects(flowResponse.data);
      if (appResponse.data) setAppProjects(appResponse.data);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <aside className="sidebar w-[208px] fixed inset-y-0 z-30 flex flex-col border-r border-border" style={{ top: '44px', backgroundColor: 'hsl(var(--rc-bg))' }}>
      {/* Navigation */}
      <div className="flex-1 p-2 space-y-0.5 pt-1">
        {/* Projects sections */}
        {databases.length > 0 && (
          <div className="mt-2 group">
            <div className="section-header text-[12px] uppercase tracking-wide text-muted-foreground/50 px-2.5 py-1.5 font-inconsolata font-medium">
              Databases
              <button 
                className="section-add text-[12px] text-muted-foreground opacity-90 hover:opacity-100 transition-opacity"
                onClick={() => navigate('/databases')}
              >
                + New Database
              </button>
            </div>
            <div className="space-y-0.5">
              {databases.map((db) => (
                <Link
                  key={db.id}
                  to={`/databases/${db.id}`}
                  className={cn(
                    "nav-item flex items-center px-2.5 rounded text-[13px] transition-opacity h-[36px]",
                    location.pathname === `/databases/${db.id}`
                      ? "bg-secondary text-primary font-medium opacity-100"
                      : "text-muted-foreground opacity-90 hover:opacity-100"
                  )}
                >
                  <Database className="nav-icon h-4 w-4 shrink-0 mr-2" />
                  <span className="truncate">{db.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {flowProjects.length > 0 && (
          <div className="mt-2 group">
            <div className="section-header text-[12px] uppercase tracking-wide text-muted-foreground/50 px-2.5 py-1.5 font-inconsolata font-medium">
              Flows
              <button 
                className="section-add text-[12px] text-muted-foreground opacity-90 hover:opacity-100 transition-opacity"
                onClick={() => navigate('/flows')}
              >
                + New Flow
              </button>
            </div>
            <div className="space-y-0.5">
              {flowProjects.map((flow) => (
                <Link
                  key={flow.id}
                  to={`/flows/${flow.id}`}
                  className={cn(
                    "nav-item flex items-center px-2.5 rounded text-[13px] transition-opacity h-[36px]",
                    location.pathname === `/flows/${flow.id}`
                      ? "bg-secondary text-primary font-medium opacity-100"
                      : "text-muted-foreground opacity-90 hover:opacity-100"
                  )}
                >
                  <Network className="nav-icon h-4 w-4 shrink-0 mr-2" />
                  <span className="truncate">{flow.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {appProjects.length > 0 && (
          <div className="mt-2 group">
            <div className="section-header text-[12px] uppercase tracking-wide text-muted-foreground/50 px-2.5 py-1.5 font-inconsolata font-medium">
              Apps
              <button 
                className="section-add text-[12px] text-muted-foreground opacity-90 hover:opacity-100 transition-opacity"
                onClick={() => navigate('/apps')}
              >
                + New App
              </button>
            </div>
            <div className="space-y-0.5">
              {appProjects.map((app) => (
                <Link
                  key={app.id}
                  to={`/apps/${app.id}`}
                  className={cn(
                    "nav-item flex items-center px-2.5 rounded text-[13px] transition-opacity h-[36px]",
                    location.pathname === `/apps/${app.id}`
                      ? "bg-secondary text-primary font-medium opacity-100"
                      : "text-muted-foreground opacity-90 hover:opacity-100"
                  )}
                >
                  <Grid3X3 className="nav-icon h-4 w-4 shrink-0 mr-2" />
                  <span className="truncate">{app.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Plan Usage Stats */}
      <div className="p-3 space-y-3">
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide font-inconsolata">Current Plan Usage</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Storage</span>
              <span className="text-[11px] text-foreground font-medium">{(databases.length * 0.1).toFixed(2)}/6GB</span>
            </div>
            <div className="w-full bg-border rounded-full h-1">
              <div 
                className="bg-primary h-1 rounded-full" 
                style={{ width: `${Math.min((databases.length * 0.1 / 6) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Logic Flows</span>
              <span className="text-[11px] text-foreground font-medium">{flowProjects.length}/10</span>
            </div>
            <div className="w-full bg-border rounded-full h-1">
              <div 
                className="bg-primary h-1 rounded-full" 
                style={{ width: `${Math.min((flowProjects.length / 10) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Applications</span>
              <span className="text-[11px] text-foreground font-medium">{appProjects.length}/5</span>
            </div>
            <div className="w-full bg-border rounded-full h-1">
              <div 
                className="bg-primary h-1 rounded-full" 
                style={{ width: `${Math.min((appProjects.length / 5) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Databases</span>
              <span className="text-[11px] text-foreground font-medium">{databases.length * 100}/1M records</span>
            </div>
            <div className="w-full bg-border rounded-full h-1">
              <div 
                className="bg-primary h-1 rounded-full" 
                style={{ width: `${Math.min((databases.length * 100 / 1000000) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          
          
          <div className="pt-1 border-t border-border">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">resets in 2 weeks</span>
              <a href="/settings?tab=billing" className="text-primary hover:underline">Manage</a>
            </div>
          </div>
        </div>
      </div>

      {/* User account dropdown */}
      <div className="p-3 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2 px-1.5 py-2 rounded text-[13px] opacity-90 hover:opacity-100 transition-opacity">
              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white text-xs">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 text-left">
                <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                  {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
                </div>
                <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-destructive">
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
