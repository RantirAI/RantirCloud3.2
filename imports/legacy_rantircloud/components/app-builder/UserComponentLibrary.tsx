import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useUserComponentStore } from '@/stores/userComponentStore';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { userComponentService } from '@/services/userComponentService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Package, 
  Trash2, 
  Edit2, 
  MoreVertical,
  FolderOpen,
  Plus,
  LayoutTemplate
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { UserComponent } from '@/types/userComponent';
import { toast } from 'sonner';
import { PrebuiltComponentPalette } from './PrebuiltComponentPalette';

export function UserComponentLibrary() {
  const { id: projectId } = useParams<{ id: string }>();
  const { 
    components, 
    categories, 
    isLoading, 
    loadComponents, 
    deleteComponent,
    selectComponent,
    selectedComponentId,
    enterEditingMode
  } = useUserComponentStore();
  const { addComponent, currentPage } = useAppBuilderStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Uncategorized']));

  useEffect(() => {
    if (projectId) {
      loadComponents(projectId);
    }
  }, [projectId, loadComponents]);

  const filteredComponents = components.filter(comp => 
    comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    comp.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const componentsByCategory = filteredComponents.reduce((acc, comp) => {
    const category = comp.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(comp);
    return acc;
  }, {} as Record<string, UserComponent[]>);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleAddToCanvas = async (component: UserComponent) => {
    if (!projectId) return;
    
    try {
      const instance = await userComponentService.instantiateComponent(
        projectId,
        component.id,
        {}
      );
      
      if (instance) {
        addComponent(instance);
        toast.success(`Added "${component.name}" to canvas`);
      }
    } catch (error) {
      console.error('Failed to add component:', error);
      toast.error('Failed to add component');
    }
  };

  const handleEdit = (component: UserComponent) => {
    enterEditingMode(component, currentPage);
  };

  const handleDelete = async (component: UserComponent) => {
    if (!projectId) return;
    
    if (confirm(`Delete "${component.name}"? This cannot be undone.`)) {
      await deleteComponent(projectId, component.id);
      toast.success('Component deleted');
    }
  };

  const allCategories = [...new Set([...categories, 'Uncategorized'])];

  if (isLoading && components.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Package className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <p className="text-sm">Loading components...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="prebuilt" className="h-full flex flex-col">
        <TabsList className="w-full shrink-0 mx-0 rounded-none border-b bg-muted/30">
          <TabsTrigger value="prebuilt" className="flex-1 text-xs data-[state=active]:bg-background">
            <LayoutTemplate className="h-3.5 w-3.5 mr-1" />
            Prebuilt
          </TabsTrigger>
          <TabsTrigger value="my-components" className="flex-1 text-xs data-[state=active]:bg-background">
            <Package className="h-3.5 w-3.5 mr-1" />
            My Components
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prebuilt" className="flex-1 mt-0 min-h-0">
          <PrebuiltComponentPalette />
        </TabsContent>

        <TabsContent value="my-components" className="flex-1 mt-0 min-h-0 flex flex-col">
          {/* Header */}
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">My Components</h3>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs"
                onClick={() => enterEditingMode(undefined, currentPage)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search components..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          {/* Component List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {components.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No components yet</p>
                  <p className="text-xs mt-1">Click "New" to create a component<br/>or right-click any element to save it</p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => enterEditingMode(undefined, currentPage)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Component
                  </Button>
                </div>
              ) : filteredComponents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No matching components</p>
                </div>
              ) : (
                allCategories.map(category => {
                  const categoryComponents = componentsByCategory[category] || [];
                  if (categoryComponents.length === 0) return null;
                  
                  return (
                    <Collapsible
                      key={category}
                      open={expandedCategories.has(category)}
                      onOpenChange={() => toggleCategory(category)}
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span className="flex-1 text-left">{category}</span>
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                          {categoryComponents.length}
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-4 space-y-1 mt-1">
                          {categoryComponents.map(component => (
                            <ComponentCard
                              key={component.id}
                              component={component}
                              isSelected={selectedComponentId === component.id}
                              onSelect={() => selectComponent(component.id)}
                              onAdd={() => handleAddToCanvas(component)}
                              onEdit={() => handleEdit(component)}
                              onDelete={() => handleDelete(component)}
                            />
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ComponentCardProps {
  component: UserComponent;
  isSelected: boolean;
  onSelect: () => void;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ComponentCard({ component, isSelected, onSelect, onAdd, onEdit, onDelete }: ComponentCardProps) {
  return (
    <div
      className={`group relative p-2 rounded-md border transition-all cursor-pointer ${
        isSelected 
          ? 'border-primary bg-primary/5' 
          : 'border-transparent hover:border-border hover:bg-accent/50'
      }`}
      onClick={onSelect}
      onDoubleClick={onAdd}
    >
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
          <Package className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{component.name}</p>
          {component.description && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              {component.description}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            {component.props.length} prop{component.props.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAdd}>
              <Plus className="h-3.5 w-3.5 mr-2" />
              Add to Canvas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="h-3.5 w-3.5 mr-2" />
              Edit Component
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
