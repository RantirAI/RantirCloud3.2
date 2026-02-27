import React, { useState, useEffect } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useUserComponentStore } from '@/stores/userComponentStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Database, Zap, Monitor, Palette } from 'lucide-react';
import { StylesTab } from './properties/StylesTab';
import { DataSettingsTab } from './properties/DataSettingsTab';
import { ActionsTab } from './properties/ActionsTab';
import { BodyPropertiesTab } from './properties/BodyPropertiesTab';
import { BodyDataSettingsTab } from './properties/BodyDataSettingsTab';
import { BodyActionsTab } from './properties/BodyActionsTab';
import { ComponentPropsManager } from './properties/ComponentPropsManager';
import { getComponentIcon, getComponentName } from '@/lib/componentIcons';
import "./properties/properties-compact.css";

export function ComponentPropertiesPanel() {
  const { selectedComponent, currentProject, currentPage } = useAppBuilderStore();
  const { isEditingMode, editingDefinition } = useUserComponentStore();
  const [activeTab, setActiveTab] = useState('styles');

  // Listen for tab switch events from canvas popups
  useEffect(() => {
    const handleSwitchTab = (e: CustomEvent) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('app-builder:switch-tab', handleSwitchTab as EventListener);
    return () => {
      window.removeEventListener('app-builder:switch-tab', handleSwitchTab as EventListener);
    };
  }, []);

  // Reset tab when component changes
  useEffect(() => {
    setActiveTab('styles');
  }, [selectedComponent]);

  // In component-editing mode, always provide access to "Component Props" (even when an element is selected)
  if (isEditingMode) {
    const renderElementPanel = () => {
      // If nothing selected in editing mode, show component settings
      if (!selectedComponent) {
        return (
          <div className="h-full flex flex-col bg-background">
            <ComponentPropsManager />
          </div>
        );
      }

      // If body selected, show body props (same behavior)
      if (selectedComponent === 'body') {
        return (
          <div className="h-full flex flex-col bg-background" onPointerDown={(e) => { e.stopPropagation(); }} onMouseDown={(e) => { e.stopPropagation(); }}>
            <div className="flex-1 flex flex-col overflow-hidden">
              <Tabs defaultValue="styles" className="flex-1 flex flex-col bg-card" data-props-compact="true">
                <TabsList className="w-full h-auto p-0 bg-transparent rounded-none border-b flex-shrink-0">
               <TabsTrigger value="styles" className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-none border-b-2 border-x-0 border-t-0 border-transparent data-[state=active]:border-b-2 data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">
                    <Palette className="h-3 w-3" />
                    Styles
                  </TabsTrigger>
                  <TabsTrigger value="data-settings" className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-none border-b-2 border-x-0 border-t-0 border-transparent data-[state=active]:border-b-2 data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">
                    <Database className="h-3 w-3" />
                    Data & Settings
                  </TabsTrigger>
                  <TabsTrigger value="actions" className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-none border-b-2 border-x-0 border-t-0 border-transparent data-[state=active]:border-b-2 data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">
                    <Zap className="h-3 w-3" />
                    Actions
                  </TabsTrigger>
                </TabsList>

                <div className="px-3 pb-2 bg-card flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                      <Monitor className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-xs truncate text-muted-foreground">Page Body</h3>
                    </div>
                  </div>
                </div>

                <TabsContent value="styles" className="flex-1 m-0 overflow-hidden">
                  <BodyPropertiesTab />
                </TabsContent>

                <TabsContent value="data-settings" className="flex-1 m-0 overflow-hidden">
                  <BodyDataSettingsTab />
                </TabsContent>

                <TabsContent value="actions" className="flex-1 m-0 overflow-hidden">
                  <BodyActionsTab />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        );
      }

      // Find the selected component (prefer editingDefinition)
      const findComponent = (components: any[], id: string): any => {
        for (const comp of components) {
          if (comp.id === id) return comp;
          if (comp.children) {
            const found = findComponent(comp.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      let component = null;
      if (editingDefinition) {
        component = editingDefinition.id === selectedComponent
          ? editingDefinition
          : (editingDefinition.children ? findComponent([editingDefinition], selectedComponent) : null);
      }

      if (!component && currentProject && currentPage) {
        const currentPageData = currentProject.pages.find(page => page.id === currentPage);
        if (currentPageData) {
          component = findComponent(currentPageData.components, selectedComponent);
        }
      }

      if (!component) return null;

      // Enhance with parent connection data
      const findParentWithDataConnection = (components: any[], childId: string): any => {
        const makeConnection = (comp: any) => ({
          tableName: comp.props?.databaseConnection?.tableName || comp.props?._cachedSchema?.tableName || 'Connected Table',
          schema: comp.props?._cachedSchema?.schema || comp.props?._cachedSchema?.fields || comp.props?.databaseConnection?.schema || [],
          fields: comp.props?._cachedSchema?.schema || comp.props?._cachedSchema?.fields || comp.props?.databaseConnection?.schema || [],
          _cachedSchema: comp.props?._cachedSchema
        });

        const walk = (comp: any): { found: boolean; connection: any | null } => {
          if (!comp) return { found: false, connection: null };
          if (comp.id === childId) return { found: true, connection: null };
          if (!Array.isArray(comp.children)) return { found: false, connection: null };

          for (const child of comp.children) {
            const res = walk(child);
            if (res.found) {
              if (comp.props?.databaseConnection || comp.props?._cachedSchema) {
                return { found: true, connection: makeConnection(comp) };
              }
              return res;
            }
          }
          return { found: false, connection: null };
        };

        for (const root of components) {
          const res = walk(root);
          if (res.found && res.connection) return res.connection;
        }
        return null;
      };

      let parentConnection = null;
      if (editingDefinition) {
        parentConnection = findParentWithDataConnection([editingDefinition], selectedComponent);
      }
      if (!parentConnection && currentProject && currentPage) {
        const currentPageData = currentProject.pages.find(page => page.id === currentPage);
        if (currentPageData) {
          parentConnection = findParentWithDataConnection(currentPageData.components, selectedComponent);
        }
      }

      const enhancedComponent = parentConnection ? {
        ...component,
        props: {
          ...component.props,
          _parentConnection: parentConnection
        }
      } : component;

      return (
        <div className="h-full flex flex-col bg-background" onPointerDown={(e) => { e.stopPropagation(); }} onMouseDown={(e) => { e.stopPropagation(); }}>
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs defaultValue="styles" className="flex-1 flex flex-col bg-card" data-props-compact="true">
              <TabsList className="w-full h-auto p-0 bg-transparent rounded-none border-b flex-shrink-0">
                  <TabsTrigger value="styles" className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-none border-b-2 border-x-0 border-t-0 border-transparent data-[state=active]:border-b-2 data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">
                    <Palette className="h-3 w-3" />
                    Styles
                  </TabsTrigger>
                  <TabsTrigger value="data-settings" className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-none border-b-2 border-x-0 border-t-0 border-transparent data-[state=active]:border-b-2 data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">
                    <Database className="h-3 w-3" />
                    Data & Settings
                  </TabsTrigger>
                  <TabsTrigger value="actions" className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-none border-b-2 border-x-0 border-t-0 border-transparent data-[state=active]:border-b-2 data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">
                    <Zap className="h-3 w-3" />
                    Actions
                  </TabsTrigger>
                </TabsList>

          <div className="px-3 pb-2 bg-card flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                {(() => {
                  const Icon = getComponentIcon(component.type);
                  return <Icon className="h-3 w-3 text-primary" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-xs truncate text-muted-foreground">{component.props?._autoClass || getComponentName(component.type)}</h3>
              </div>
            </div>
          </div>

              <TabsContent value="data-settings" className="relative flex-1 m-0 min-h-0">
                <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
                  <DataSettingsTab component={enhancedComponent} />
                </div>
              </TabsContent>

              <TabsContent value="actions" className="flex-1 m-0 overflow-hidden">
                <ActionsTab component={enhancedComponent} />
              </TabsContent>

              <TabsContent value="styles" className="flex-1 m-0 overflow-hidden">
                <StylesTab component={enhancedComponent} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      );
    };

    return (
      <Tabs defaultValue="element" className="h-full flex flex-col bg-background">
        <TabsList className="w-full h-auto p-0 bg-transparent rounded-none border-b flex-shrink-0">
          <TabsTrigger value="element" className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-none border-b-2 border-x-0 border-t-0 border-transparent data-[state=active]:border-b-2 data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">Element</TabsTrigger>
          <TabsTrigger value="component" className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-none border-b-2 border-x-0 border-t-0 border-transparent data-[state=active]:border-b-2 data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">Component Props</TabsTrigger>
        </TabsList>

        <TabsContent value="element" className="flex-1 m-0 overflow-hidden">
          {renderElementPanel()}
        </TabsContent>

        <TabsContent value="component" className="flex-1 m-0 overflow-hidden">
          <div className="h-full flex flex-col bg-background">
            <ComponentPropsManager />
          </div>
        </TabsContent>
      </Tabs>
    );
  }

  // ===== Normal page editing mode =====

  // If no component is selected (normal mode), show empty state
  if (!selectedComponent || !currentProject || !currentPage) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground bg-background dark:bg-background">
        <div className="text-center">
          <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a component to edit its properties</p>
        </div>
      </div>
    );
  }

  // Handle body selection
  if (selectedComponent === 'body') {
    return (
      <div className="h-full flex flex-col bg-background" onPointerDown={(e) => { e.stopPropagation(); }} onMouseDown={(e) => { e.stopPropagation(); }}>
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs defaultValue="styles" className="flex-1 flex flex-col bg-card" data-props-compact="true">
            <TabsList className="w-full h-auto p-0 bg-transparent rounded-none border-b flex-shrink-0">
              <TabsTrigger value="styles" className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-none border-b-2 border-x-0 border-t-0 border-transparent data-[state=active]:border-b-2 data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">
                <Palette className="h-3 w-3" />
                Styles
              </TabsTrigger>
              <TabsTrigger value="data-settings" className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-none border-b-2 border-x-0 border-t-0 border-transparent data-[state=active]:border-b-2 data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">
                <Database className="h-3 w-3" />
                Data & Settings
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-none border-b-2 border-x-0 border-t-0 border-transparent data-[state=active]:border-b-2 data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">
                <Zap className="h-3 w-3" />
                Actions
              </TabsTrigger>
            </TabsList>

            <div className="px-3 pb-2 bg-card flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                  <Monitor className="h-3 w-3 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-xs truncate text-muted-foreground">Page Body</h3>
                </div>
              </div>
            </div>

            <TabsContent value="styles" className="flex-1 m-0 overflow-hidden">
              <BodyPropertiesTab />
            </TabsContent>

            <TabsContent value="data-settings" className="flex-1 m-0 overflow-hidden">
              <BodyDataSettingsTab />
            </TabsContent>

            <TabsContent value="actions" className="flex-1 m-0 overflow-hidden">
              <BodyActionsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Find the selected component
  const findComponent = (components: any[], id: string): any => {
    for (const comp of components) {
      if (comp.id === id) return comp;
      if (comp.children) {
        const found = findComponent(comp.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const currentPageData = currentProject.pages.find(page => page.id === currentPage);
  const component = currentPageData ? findComponent(currentPageData.components, selectedComponent) : null;
  if (!component) return null;

  // Enhance component with parent connection data if it's inside a dynamic component
  const findParentWithDataConnection = (components: any[], childId: string): any => {
    const makeConnection = (comp: any) => ({
      tableName: comp.props?.databaseConnection?.tableName || comp.props?._cachedSchema?.tableName || 'Connected Table',
      schema: comp.props?._cachedSchema?.schema || comp.props?._cachedSchema?.fields || comp.props?.databaseConnection?.schema || [],
      fields: comp.props?._cachedSchema?.schema || comp.props?._cachedSchema?.fields || comp.props?.databaseConnection?.schema || [],
      _cachedSchema: comp.props?._cachedSchema
    });

    const walk = (comp: any): { found: boolean; connection: any | null } => {
      if (!comp) return { found: false, connection: null };
      if (comp.id === childId) return { found: true, connection: null };
      if (!Array.isArray(comp.children)) return { found: false, connection: null };

      for (const child of comp.children) {
        const res = walk(child);
        if (res.found) {
          if (comp.props?.databaseConnection || comp.props?._cachedSchema) {
            return { found: true, connection: makeConnection(comp) };
          }
          return res;
        }
      }
      return { found: false, connection: null };
    };

    for (const root of components) {
      const res = walk(root);
      if (res.found && res.connection) return res.connection;
    }
    return null;
  };

  const parentConnection = currentPageData ? findParentWithDataConnection(currentPageData.components, selectedComponent) : null;

  const enhancedComponent = parentConnection ? {
    ...component,
    props: {
      ...component.props,
      _parentConnection: parentConnection
    }
  } : component;

  return (
    <div className="h-full flex flex-col bg-background" onPointerDown={(e) => { e.stopPropagation(); }} onMouseDown={(e) => { e.stopPropagation(); }}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col bg-card" data-props-compact="true">
          <TabsList className="w-full h-auto p-0 bg-transparent rounded-none border-b flex-shrink-0">
            <TabsTrigger value="styles" className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-none border-b-2 border-x-0 border-t-0 border-transparent data-[state=active]:border-b-2 data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">
              <Palette className="h-3 w-3" />
              Styles
            </TabsTrigger>
            <TabsTrigger value="data-settings" className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-none border-b-2 border-x-0 border-t-0 border-transparent data-[state=active]:border-b-2 data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">
              <Database className="h-3 w-3" />
              Data & Settings
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-none border-b-2 border-x-0 border-t-0 border-transparent data-[state=active]:border-b-2 data-[state=active]:border-x-0 data-[state=active]:border-t-0 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">
              <Zap className="h-3 w-3" />
              Actions
            </TabsTrigger>
          </TabsList>

          <div className="px-3 pb-2 bg-card flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                {(() => {
                  const Icon = getComponentIcon(component.type);
                  return <Icon className="h-3 w-3 text-primary" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-xs truncate text-muted-foreground">{component.props?._autoClass || getComponentName(component.type)}</h3>
              </div>
            </div>
          </div>

          <TabsContent value="data-settings" className="relative flex-1 m-0 min-h-0">
            <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
              <DataSettingsTab component={enhancedComponent} />
            </div>
          </TabsContent>

          <TabsContent value="actions" className="flex-1 m-0 overflow-hidden">
            <ActionsTab component={enhancedComponent} />
          </TabsContent>

          <TabsContent value="styles" className="flex-1 m-0 overflow-hidden">
            <StylesTab component={enhancedComponent} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
