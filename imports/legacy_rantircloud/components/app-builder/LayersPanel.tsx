import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useComponentUsageStore } from '@/stores/componentUsageStore';
import { AppComponent } from '@/types/appBuilder';
import { ComponentType } from '@/types/appBuilder';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ComponentSelectorModal } from './ComponentSelectorModal';
import { 
  ChevronDown, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  Copy, 
  Trash2,
  MoreHorizontal,
  Lock,
  Unlock,
  ChevronsDownUp,
  ChevronsUpDown,
  Settings,
  Plus,
  Monitor,
  Database,
  Variable
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { getComponentIcon, getComponentName } from '@/lib/componentIcons';
import { getTextElementDisplayLabel, getComponentSemanticTag } from './HeadingSettingsPopup';

// Helper to get layer display name with semantic tag support
function getLayerDisplayName(component: AppComponent): string {
  // For heading/text components, show the semantic tag (H1, H2, ..., Body)
  if (component.type === 'heading' || component.type === 'text') {
    const tagLabel = getTextElementDisplayLabel(component);
    const textContent = component.props?.text || component.props?.content || '';
    const truncatedText = textContent.length > 8 ? textContent.substring(0, 8) + '...' : textContent;
    
    // Show tag + truncated content for better context
    if (truncatedText) {
      return `${tagLabel}: ${truncatedText}`;
    }
    return tagLabel;
  }
  
  // For other components, prefer first CSS class name (e.g. "hero", "logo-strip") over _autoClass
  const firstClassName = component.classNames?.[0];
  const displayName = firstClassName || component.props?._autoClass || component.props?.name || component.props?.text || component.props?.content || getComponentName(component.type);
  return displayName.length > 16 ? displayName.substring(0, 16) + '...' : displayName;
}

interface LayersItemProps {
  component: AppComponent;
  level: number;
  onToggleCollapse: (id: string) => void;
  collapsedItems: Set<string>;
  onAddComponent: (parentId: string, parentName: string) => void;
  selectedComponent: string | null;
}

function LayersItem({ component, level, onToggleCollapse, collapsedItems, onAddComponent, selectedComponent }: LayersItemProps) {
  const { 
    selectComponent, 
    updateComponent, 
    deleteComponent, 
    duplicateComponent 
  } = useAppBuilderStore();
  
  const layerItemRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedComponent === component.id;
  const isCollapsed = collapsedItems.has(component.id);
  const hasChildren = component.children && component.children.length > 0;
  const isVisible = component.props?.visible !== false;
  const isLocked = component.props?.locked === true;
  const hasVisibilityBinding = !!(component.props?.visibilityBinding || component.props?.visibilityCondition);

  // Auto-scroll into view when selected
  useEffect(() => {
    if (isSelected && layerItemRef.current) {
      layerItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isSelected]);
  const visibilityCondition = component.props?.visibilityCondition as { variableBinding?: string; operator?: string; value?: any } | undefined;

  // Check if this is a dynamic section (connected to database)
  const conn = component.props?.databaseConnection as { tableId?: string; tableProjectId?: string; tableName?: string; databaseId?: string } | undefined;
  const hasValidConnection = !!(conn?.tableId || conn?.tableProjectId || conn?.tableName);
  const isDynamicSection = component.props?.isDynamic === true && hasValidConnection;
  const isDynamicType = ['dynamic-list', 'pro-dynamic-list', 'dynamic-grid', 'list', 'grid'].includes(component.type);
  const isDynamic = isDynamicSection || (isDynamicType && hasValidConnection);
  
  // Connection info for tooltip
  const connectionInfo = isDynamic ? {
    tableName: conn?.tableName || 'Unknown table',
    databaseId: conn?.databaseId,
    tableId: conn?.tableId || conn?.tableProjectId
  } : null;

  // Draggable for reordering
  const { attributes, listeners, setNodeRef: dragRef, transform, isDragging } = useDraggable({
    id: `layer-${component.id}`,
    data: {
      data: {
        id: component.id,
        component: component,
        source: 'layers',
        type: 'layer'
      }
    }
  });

  // Droppable for nesting
  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `layer-drop-${component.id}`,
    data: {
      accepts: ['layer', 'component'],
      parentId: component.id,
      index: component.children?.length || 0
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateComponent(component.id, {
      props: { ...component.props, visible: !isVisible }
    });
  };

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateComponent(component.id, {
      props: { ...component.props, locked: !isLocked }
    });
  };

  const handleSelect = () => {
    if (!isLocked) {
      selectComponent(component.id);
    }
  };

  const handleDuplicate = () => {
    duplicateComponent(component.id);
  };

  const handleDelete = () => {
    deleteComponent(component.id);
  };

  return (
    <div
      ref={(node) => {
        dropRef(node);
        (layerItemRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      data-layer-id={component.id}
      style={style}
      className={cn(
        'relative',
        isOver && 'bg-primary/5 border-l-2 border-primary'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-0.5 py-0.5 px-0.5 rounded cursor-pointer hover:bg-accent/30 group',
          isSelected && 'bg-primary/10',
          !isVisible && 'opacity-50',
          isLocked && 'cursor-not-allowed',
          isDragging && 'cursor-grabbing',
          // Blue background for dynamic sections
          isDynamic && !isSelected && 'bg-blue-500/15 border-l-2 border-blue-500'
        )}
        style={{ paddingLeft: `${level * 10}px` }}
        onClick={handleSelect}
      >
        {/* Drag Handle - only show on hover */}
        <div
          ref={dragRef}
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-0.5 -m-0.5 hover:bg-accent/30 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
        </div>
        {/* Collapse/Expand Button */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-3 w-3 p-0 hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(component.id);
            }}
          >
            {isCollapsed ? (
              <ChevronRight className="h-2.5 w-2.5" />
            ) : (
              <ChevronDown className="h-2.5 w-2.5" />
            )}
          </Button>
        ) : (
          <div className="w-3" />
        )}

        {/* Component Icon/Name */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          {(() => {
            const IconComponent = getComponentIcon(component.type);
            return <IconComponent className="h-3 w-3 text-muted-foreground" />;
          })()}
          {/* Database icon for dynamic sections */}
          {isDynamic && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Database className="h-2.5 w-2.5 text-blue-500 flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-blue-600 text-white border-blue-700">
                  <div className="flex items-center gap-2">
                    <Database className="h-3.5 w-3.5" />
                    <div>
                      <p className="font-medium text-xs">Connected to:</p>
                      <p className="text-xs opacity-90">{connectionInfo?.tableName}</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {/* Eye+Variable icon for visibility binding */}
          {hasVisibilityBinding && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative flex-shrink-0">
                    <Eye className="h-2.5 w-2.5 text-purple-500" />
                    <Variable className="h-1.5 w-1.5 text-purple-400 absolute -bottom-0.5 -right-0.5" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-purple-600 text-white border-purple-700">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Eye className="h-4 w-4" />
                      <Variable className="h-2 w-2 absolute -bottom-0.5 -right-0.5" />
                    </div>
                    <div>
                      <p className="font-medium text-xs">Visibility bound to variable:</p>
                      {visibilityCondition ? (
                        <p className="text-xs opacity-90 font-mono">
                          {visibilityCondition.variableBinding?.replace(/\{\{|\}\}/g, '')} {visibilityCondition.operator} {JSON.stringify(visibilityCondition.value)}
                        </p>
                      ) : (
                        <p className="text-xs opacity-90 font-mono">{component.props?.visibilityBinding}</p>
                      )}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <span className="text-xs truncate">
            {getLayerDisplayName(component)}
          </span>
        </div>

        {/* Action Buttons - hide 3-dot menu when selected to save space */}
        <div className={cn(
          "flex items-center gap-0.5 transition-opacity",
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}>
          {/* Add Component Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={(e) => {
              e.stopPropagation();
              onAddComponent(component.id, component.props?._autoClass || component.props?.name || component.props?.text || component.props?.content || component.type);
            }}
            title="Add component"
          >
            <Plus className="h-2.5 w-2.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0"
            onClick={handleToggleVisibility}
          >
            {isVisible ? (
              <Eye className="h-2.5 w-2.5" />
            ) : (
              <EyeOff className="h-2.5 w-2.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0"
            onClick={handleToggleLock}
          >
            {isLocked ? (
              <Lock className="h-2.5 w-2.5" />
            ) : (
              <Unlock className="h-2.5 w-2.5" />
            )}
          </Button>

          {/* 3-dot menu - only show when NOT selected */}
          {!isSelected && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-2.5 w-2.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <div className="ml-1 border-l border-border/30 pl-0.5 mt-0.5">
          {component.children!.map((child, index) => (
            <div key={child.id} className="relative">
              {/* Drop zone before each child */}
              <DropZone
                id={`before-${child.id}`}
                parentId={component.id}
                index={index}
                className="h-0.5 mb-0.5"
              />
              <LayersItem
                component={child}
                level={level + 1}
                onToggleCollapse={onToggleCollapse}
                collapsedItems={collapsedItems}
                onAddComponent={onAddComponent}
                selectedComponent={selectedComponent}
              />
            </div>
          ))}
          {/* Drop zone after last child */}
          <DropZone
            id={`after-${component.id}`}
            parentId={component.id}
            index={component.children!.length}
            className="h-0.5 mt-0.5"
          />
        </div>
      )}
    </div>
  );
}

// Drop Zone Component for better drag and drop experience
interface DropZoneProps {
  id: string;
  parentId: string;
  index: number;
  className?: string;
}

function DropZone({ id, parentId, index, className }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `dropzone-${id}`,
    data: {
      accepts: ['layer', 'component'],
      parentId,
      index
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-full transition-all duration-200',
        isOver ? 'bg-primary/20 border-2 border-dashed border-primary rounded' : 'bg-transparent',
        className
      )}
    />
  );
}

export function LayersPanel() {
  const { currentProject, currentPage, selectComponent, selectedComponent, addComponent } = useAppBuilderStore();
  const { incrementUsage } = useComponentUsageStore();
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [componentModalOpen, setComponentModalOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedParentName, setSelectedParentName] = useState<string>('');

  // Collect all component IDs recursively
  const collectAllIds = useCallback((components: AppComponent[]): string[] => {
    const ids: string[] = [];
    const traverse = (comps: AppComponent[]) => {
      for (const comp of comps) {
        ids.push(comp.id);
        if (comp.children?.length) {
          traverse(comp.children);
        }
      }
    };
    traverse(components);
    return ids;
  }, []);

  const handleToggleCollapse = (id: string) => {
    setCollapsedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Toggle collapse/expand all layers (excluding root body which always stays expanded)
  const handleToggleAllCollapse = useCallback(() => {
    const pageData = currentProject?.pages.find(p => p.id === currentPage);
    const components = pageData?.components || [];
    
    if (allCollapsed) {
      // Expand all - clear collapsed set
      setCollapsedItems(new Set());
    } else {
      // Collapse all child layers (NOT the root body)
      const allIds = collectAllIds(components);
      setCollapsedItems(new Set(allIds));
    }
    setAllCollapsed(!allCollapsed);
  }, [allCollapsed, currentProject, currentPage, collectAllIds]);

  const handleAddComponent = (parentId: string, parentName: string) => {
    setSelectedParentId(parentId);
    setSelectedParentName(parentName);
    setComponentModalOpen(true);
  };

  const handleSelectComponent = (componentType: ComponentType) => {
    // Track usage
    incrementUsage(componentType);
    
    // Create the component
    const newComponent: AppComponent = {
      id: `${componentType}-${Date.now()}`,
      type: componentType,
      props: {
        content: componentType === 'text' ? 'New text' : undefined,
        text: componentType === 'button' ? 'Button' : undefined,
        placeholder: componentType === 'input' ? 'Enter text...' : undefined,
      },
      style: {},
      children: []
    };

    // Add to the selected parent
    if (selectedParentId === 'root') {
      addComponent(newComponent);
    } else {
      addComponent(newComponent, selectedParentId);
    }
  };

  // Droppable for the entire layers panel - MUST be called before any conditional returns
  const { setNodeRef: layersDropRef, isOver: isLayersOver } = useDroppable({
    id: 'layers-panel-root',
    data: {
      accepts: ['component', 'layer'],
      parentId: 'root',
      index: 0
    }
  });

  if (!currentProject || !currentPage) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-sm">No project selected</div>
        </div>
      </div>
    );
  }

  const pageData = currentProject.pages.find(p => p.id === currentPage);
  const components = pageData?.components || [];

  const handleBodySelect = () => {
    selectComponent('body');
  };

  const handleBodySettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectComponent('body');
  };

  return (
    <div 
      ref={layersDropRef}
      className={cn(
        "h-full flex flex-col bg-card transition-all duration-300",
        isLayersOver && "bg-primary/5 border-l-2 border-primary"
      )}
    >
      <div className="p-1.5 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-xs">Layers</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0"
                onClick={handleToggleAllCollapse}
              >
                {allCollapsed ? (
                  <ChevronsUpDown className="h-2.5 w-2.5" />
                ) : (
                  <ChevronsDownUp className="h-2.5 w-2.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {allCollapsed ? 'Expand all layers' : 'Collapse all layers'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <ScrollArea className="flex-1" scrollbarVariant="hover-show">
        <div className="p-1">
          {/* Body Container - Root page layer (always expanded, no collapse button) */}
          <div className="relative">
            <div
              className={cn(
                'flex items-center gap-1 py-0.5 px-0.5 rounded cursor-pointer hover:bg-accent/30 group',
                selectedComponent === 'body' && 'bg-primary/10',
                'bg-accent/10'
              )}
              onClick={handleBodySelect}
            >
              {/* Body Icon/Name - no collapse button for root */}
              <div className="flex-1 flex items-center gap-1.5 min-w-0">
                <Monitor className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs truncate font-medium">
                  {pageData?.name || 'Page'}
                </span>
              </div>

              {/* Settings Button - hide 3-dot when selected */}
              <div className={cn(
                "flex items-center gap-0.5 transition-opacity",
                selectedComponent === 'body' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}>
                {/* Add Component to Body Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddComponent('root', 'Body');
                  }}
                  title="Add component to body"
                >
                  <Plus className="h-2.5 w-2.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={handleBodySettings}
                  title="Body Properties"
                >
                  <Settings className="h-2.5 w-2.5" />
                </Button>
              </div>
            </div>

              {/* Body Children - always visible (root never collapses) */}
              <div className="ml-1 border-l border-border/30 pl-0.5 mt-0.5">
                  {components.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-4">
                      <div className="space-y-2">
                        <p className="text-xs">No components yet</p>
                        <p className="text-[10px]">Drag components here</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {components.map((component, index) => (
                        <div key={component.id} className="relative">
                          {/* Drop zone before each root component */}
                          <DropZone
                            id={`root-before-${component.id}`}
                            parentId="root"
                            index={index}
                            className="h-0.5 mb-0.5"
                          />
                          <LayersItem
                            component={component}
                            level={1}
                            onToggleCollapse={handleToggleCollapse}
                            collapsedItems={collapsedItems}
                            onAddComponent={handleAddComponent}
                            selectedComponent={selectedComponent}
                          />
                        </div>
                      ))}
                      {/* Drop zone after last root component */}
                      <DropZone
                        id="root-after-all"
                        parentId="root"
                        index={components.length}
                        className="h-0.5 mt-0.5"
                      />
                    </div>
                  )}
              </div>
          </div>
            
            {/* Drop zone indicator */}
            {isLayersOver && (
              <div className="mt-2 p-3 border-2 border-dashed border-primary rounded-lg bg-primary/5">
                <div className="text-center text-primary text-sm">
                  Drop component here
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

      {/* Component Selector Modal */}
      <ComponentSelectorModal
        open={componentModalOpen}
        onOpenChange={setComponentModalOpen}
        onSelectComponent={handleSelectComponent}
        parentComponentName={selectedParentName}
      />
    </div>
  );
}