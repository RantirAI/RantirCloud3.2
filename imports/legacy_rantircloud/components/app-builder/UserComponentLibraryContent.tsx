import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useUserComponentStore } from '@/stores/userComponentStore';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { userComponentService } from '@/services/userComponentService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Package, 
  Trash2, 
  Edit2, 
  MoreVertical,
  FolderOpen,
  Plus,
  ChevronDown,
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

interface UserComponentLibraryContentProps {
  searchFilter?: string;
}

export function UserComponentLibraryContent({ searchFilter = '' }: UserComponentLibraryContentProps) {
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
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Uncategorized']));

  useEffect(() => {
    if (projectId) {
      loadComponents(projectId);
    }
  }, [projectId, loadComponents]);

  const filteredComponents = components.filter(comp => 
    comp.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    comp.description?.toLowerCase().includes(searchFilter.toLowerCase())
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
      {/* Component List */}
      <ScrollArea className="flex-1">
        <div className="p-0 space-y-0">
          {components.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground px-4">
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
            <div className="text-center py-8 text-muted-foreground px-4">
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
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between w-full py-2 px-3 hover:bg-muted/50 cursor-pointer border-b border-border/50">
                      <div className="flex items-center gap-2">
                        {expandedCategories.has(category) ? (
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-muted-foreground rotate-[-90deg]" />
                        )}
                        <span className="font-medium text-xs text-foreground">{category}</span>
                        <span className="text-[10px] text-muted-foreground">
                          ({categoryComponents.length})
                        </span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 opacity-0 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          enterEditingMode(undefined, currentPage);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-1 mt-2 mb-4 px-3">
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