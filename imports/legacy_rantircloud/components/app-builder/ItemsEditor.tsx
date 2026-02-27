import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { AppComponent } from '@/types/appBuilder';

interface ItemField {
  name: string;
  label: string;
  type: 'text' | 'textarea';
  placeholder?: string;
}

interface ItemsEditorProps {
  items: Array<{ id: string; [key: string]: any }>;
  onChange: (items: any[]) => void;
  itemType: 'accordion' | 'tabs' | 'carousel';
  fields: ItemField[];
  className?: string;
  componentId?: string; // The parent accordion/tabs component ID
}

export function ItemsEditor({ items, onChange, itemType, fields, className, componentId }: ItemsEditorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(items.map(i => i.id)));
  
  const { addComponent, deleteComponent, updateComponent, currentProject, currentPage, setSelectedComponent } = useAppBuilderStore();

  // Get the current component from the store
  const getParentComponent = (): AppComponent | null => {
    if (!componentId || !currentProject || !currentPage) return null;
    
    const page = currentProject.pages.find(p => p.id === currentPage);
    if (!page) return null;
    
    const findComponent = (components: AppComponent[]): AppComponent | null => {
      for (const comp of components) {
        if (comp.id === componentId) return comp;
        if (comp.children) {
          const found = findComponent(comp.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findComponent(page.components);
  };

  // Derive items from children if available
  const parentComponent = getParentComponent();
  const hasChildrenItems = parentComponent?.children?.some(c => 
    c.type === (itemType === 'accordion' ? 'accordion-item' : itemType === 'tabs' ? 'tab-item' : 'carousel-slide')
  );
  
  // Get items from children or props
  const derivedItems = hasChildrenItems && parentComponent?.children
    ? parentComponent.children
        .filter(c => c.type === (itemType === 'accordion' ? 'accordion-item' : itemType === 'tabs' ? 'tab-item' : 'carousel-slide'))
        .map(item => {
          const headerOrTrigger = item.children?.find(c => 
            c.type === (itemType === 'accordion' ? 'accordion-header' : itemType === 'tabs' ? 'tab-trigger' : 'carousel-slide-content')
          );
          const content = item.children?.find(c => 
            c.type === (itemType === 'accordion' ? 'accordion-content' : itemType === 'tabs' ? 'tab-content' : 'carousel-slide-content')
          );
          
          return {
            id: item.id,
            title: item.props?.title || headerOrTrigger?.props?.content || (itemType === 'accordion' ? 'Section' : 'Tab'),
            label: item.props?.label || headerOrTrigger?.props?.content || (itemType === 'tabs' ? 'Tab' : ''),
            content: content?.props?.content || 'Content...',
            _component: item,
            _headerComponent: headerOrTrigger,
            _contentComponent: content,
          };
        })
    : items;

  const toggleItemExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const addItem = () => {
    const itemNum = derivedItems.length + 1;
    const newItemId = `${itemType}-item-${Date.now()}`;
    
    if (hasChildrenItems && componentId) {
      // Create actual child components
      const headerId = `${itemType === 'accordion' ? 'accordion-header' : itemType === 'tabs' ? 'tab-trigger' : 'carousel-slide-content'}-${Date.now()}`;
      const contentId = `${itemType === 'accordion' ? 'accordion-content' : itemType === 'tabs' ? 'tab-content' : 'carousel-slide-content'}-${Date.now()}`;
      
      const headerComponent: AppComponent = {
        id: headerId,
        type: itemType === 'accordion' ? 'accordion-header' : itemType === 'tabs' ? 'tab-trigger' : 'carousel-slide-content',
        props: {
          content: itemType === 'accordion' ? `Section ${itemNum}` : itemType === 'tabs' ? `Tab ${itemNum}` : `Content for slide ${itemNum}`
        },
        style: {},
        children: []
      };
      
      // For carousel, we only need the content component (no separate header)
      const childComponents: AppComponent[] = itemType === 'carousel' 
        ? [headerComponent] 
        : [headerComponent, {
            id: contentId,
            type: itemType === 'accordion' ? 'accordion-content' : 'tab-content',
            props: {
              content: `Content for ${itemType === 'accordion' ? 'section' : 'tab'} ${itemNum}`
            },
            style: {},
            children: []
          }];
      
      const itemComponent: AppComponent = {
        id: newItemId,
        type: itemType === 'accordion' ? 'accordion-item' : itemType === 'tabs' ? 'tab-item' : 'carousel-slide',
        props: {
          title: itemType === 'accordion' ? `Section ${itemNum}` : undefined,
          label: itemType === 'tabs' ? `Tab ${itemNum}` : itemType === 'carousel' ? `Slide ${itemNum}` : undefined,
        },
        style: {},
        children: childComponents
      };
      
      // Add to the parent component
      addComponent(itemComponent, componentId);
      
      // Re-select the parent component to keep the sidebar open
      setTimeout(() => {
        setSelectedComponent(componentId);
      }, 0);
    } else {
      // Legacy: update props.items
      const newItem: Record<string, any> = { id: newItemId };
      
      fields.forEach(field => {
        if (field.name === 'title' || field.name === 'label') {
          newItem[field.name] = `${itemType === 'accordion' ? 'Section' : 'Tab'} ${itemNum}`;
        } else if (field.name === 'content') {
          newItem[field.name] = `Content for ${itemType === 'accordion' ? 'section' : 'tab'} ${itemNum}`;
        } else {
          newItem[field.name] = '';
        }
      });
      
      onChange([...items, newItem]);
    }
    
    // Auto-expand new item
    setExpandedItems(prev => new Set([...prev, newItemId]));
  };

  const removeItem = (id: string) => {
    if (derivedItems.length <= 1) return; // Keep at least one item
    
    const itemToRemove = derivedItems.find(i => i.id === id);
    
    if (hasChildrenItems && itemToRemove?._component) {
      // Delete the actual component
      deleteComponent(id);
    } else {
      // Legacy: update props.items
      onChange(items.filter(item => item.id !== id));
    }
    
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const updateItem = (id: string, field: string, value: any) => {
    const item = derivedItems.find(i => i.id === id);
    
    if (hasChildrenItems && item?._component) {
      // Update the actual component
      if (field === 'title' || field === 'label') {
        // Update both the item component and the header/trigger
        updateComponent(id, { props: { ...item._component.props, [field]: value } });
        if (item._headerComponent) {
          updateComponent(item._headerComponent.id, { 
            props: { ...item._headerComponent.props, content: value } 
          });
        }
      } else if (field === 'content' && item._contentComponent) {
        updateComponent(item._contentComponent.id, { 
          props: { ...item._contentComponent.props, content: value } 
        });
      }
    } else {
      // Legacy: update props.items
      onChange(items.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      ));
    }
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= derivedItems.length) return;
    
    if (hasChildrenItems && componentId && parentComponent) {
      // Reorder children in the parent component
      const newChildren = [...(parentComponent.children || [])];
      const itemChildren = newChildren.filter(c => 
        c.type === (itemType === 'accordion' ? 'accordion-item' : 'tab-item')
      );
      const otherChildren = newChildren.filter(c => 
        c.type !== (itemType === 'accordion' ? 'accordion-item' : 'tab-item')
      );
      
      const [movedItem] = itemChildren.splice(fromIndex, 1);
      itemChildren.splice(toIndex, 0, movedItem);
      
      updateComponent(componentId, { 
        children: [...otherChildren, ...itemChildren] 
      });
    } else {
      // Legacy: update props.items
      const newItems = [...items];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      onChange(newItems);
    }
  };

  const getItemTitle = (item: Record<string, any>) => {
    return item.title || item.label || `Item`;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("w-full", className)}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center justify-between w-full py-2.5 px-3 bg-muted/60 rounded-lg hover:bg-muted transition-colors border border-border/50">
          <div className="flex items-center gap-2">
            <ChevronRight className={cn("h-4 w-4 transition-transform text-muted-foreground", isOpen && "rotate-90")} />
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
              {itemType === 'accordion' ? 'Accordion Items' : 'Tab Items'}
            </span>
          </div>
          <span className="text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full">
            {derivedItems.length} items
          </span>
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-1.5 space-y-1">
        {derivedItems.map((item, index) => (
          <div key={item.id} className="space-y-1">
            {/* Item row */}
            <div className="flex items-center gap-1 w-full bg-muted/30 rounded-md px-1.5 py-1">
              {/* Expand/Collapse */}
              <button 
                onClick={() => toggleItemExpanded(item.id)}
                className="p-0.5 rounded hover:bg-muted transition-colors shrink-0"
              >
                <ChevronRight 
                  className={cn(
                    "h-3 w-3 text-muted-foreground transition-transform",
                    expandedItems.has(item.id) && "rotate-90"
                  )} 
                />
              </button>
              
              {/* Reorder buttons */}
              <button 
                onClick={() => moveItem(index, index - 1)}
                disabled={index === 0}
                className="p-0.5 rounded hover:bg-muted transition-colors disabled:opacity-30 shrink-0"
                title="Move up"
              >
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              </button>
              <button 
                onClick={() => moveItem(index, index + 1)}
                disabled={index === derivedItems.length - 1}
                className="p-0.5 rounded hover:bg-muted transition-colors disabled:opacity-30 shrink-0"
                title="Move down"
              >
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
              
              {/* Item number badge */}
              <span className="text-[10px] font-bold text-primary shrink-0">
                #{index + 1}
              </span>
              
              {/* Title preview */}
              <span className="text-xs text-muted-foreground truncate ml-1 flex-1">
                {getItemTitle(item)}
              </span>
              
              {/* Delete button */}
              <button 
                onClick={() => removeItem(item.id)}
                disabled={derivedItems.length <= 1}
                className="p-0.5 rounded hover:bg-destructive/10 transition-colors disabled:opacity-30 shrink-0 ml-auto"
                title="Remove item"
              >
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
            
            {/* Expanded fields - directly below the item row */}
            {expandedItems.has(item.id) && (
              <div className="border rounded-md p-2 space-y-2 bg-card ml-2">
                {fields.map(field => (
                  <div key={field.name} className="space-y-1">
                    <Label className="text-[10px] font-medium text-muted-foreground">
                      {field.label}
                    </Label>
                    {field.type === 'textarea' ? (
                      <Textarea
                        value={item[field.name] || ''}
                        onChange={(e) => updateItem(item.id, field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className="min-h-[60px] text-xs resize-none"
                      />
                    ) : (
                      <Input
                        value={item[field.name] || ''}
                        onChange={(e) => updateItem(item.id, field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className="h-7 text-xs"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full h-7 text-xs gap-1 border-dashed hover:border-primary hover:bg-primary/5 rounded-md" 
          onClick={addItem}
        >
          <Plus className="h-3 w-3" />
          Add {itemType === 'accordion' ? 'Section' : 'Tab'}
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
