import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2, GripVertical, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { AppComponent } from '@/types/appBuilder';

interface ItemField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'icon';
  placeholder?: string;
}

interface ActiveItemsEditorProps {
  items: Array<{ id: string; [key: string]: any }>;
  onChange: (items: any[]) => void;
  activeValue: string;
  onActiveChange: (value: string) => void;
  itemType: 'accordion' | 'tabs';
  fields: ItemField[];
  className?: string;
  componentId?: string;
}

export function ActiveItemsEditor({ 
  items, 
  onChange, 
  activeValue, 
  onActiveChange,
  itemType, 
  fields, 
  className, 
  componentId 
}: ActiveItemsEditorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
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
    c.type === (itemType === 'accordion' ? 'accordion-item' : 'tab-item')
  );
  
  // Get items from children or props
  const derivedItems = hasChildrenItems && parentComponent?.children
    ? parentComponent.children
        .filter(c => c.type === (itemType === 'accordion' ? 'accordion-item' : 'tab-item'))
        .map(item => {
          const headerOrTrigger = item.children?.find(c => 
            c.type === (itemType === 'accordion' ? 'accordion-header' : 'tab-trigger')
          );
          const content = item.children?.find(c => 
            c.type === (itemType === 'accordion' ? 'accordion-content' : 'tab-content')
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

  const addItem = () => {
    const itemNum = derivedItems.length + 1;
    const newItemId = `${itemType}-item-${Date.now()}`;
    
    if (hasChildrenItems && componentId) {
      const headerId = `${itemType === 'accordion' ? 'accordion-header' : 'tab-trigger'}-${Date.now()}`;
      const contentId = `${itemType === 'accordion' ? 'accordion-content' : 'tab-content'}-${Date.now()}`;
      
      const headerComponent: AppComponent = {
        id: headerId,
        type: itemType === 'accordion' ? 'accordion-header' : 'tab-trigger',
        props: {
          content: itemType === 'accordion' ? `Section ${itemNum}` : `Tab ${itemNum}`
        },
        style: {},
        children: []
      };
      
      const contentComponent: AppComponent = {
        id: contentId,
        type: itemType === 'accordion' ? 'accordion-content' : 'tab-content',
        props: {
          content: `Content for ${itemType === 'accordion' ? 'section' : 'tab'} ${itemNum}`
        },
        style: {},
        children: []
      };
      
      const itemComponent: AppComponent = {
        id: newItemId,
        type: itemType === 'accordion' ? 'accordion-item' : 'tab-item',
        props: {
          title: itemType === 'accordion' ? `Section ${itemNum}` : undefined,
          label: itemType === 'tabs' ? `Tab ${itemNum}` : undefined,
        },
        style: {},
        children: [headerComponent, contentComponent]
      };
      
      addComponent(itemComponent, componentId);
      
      setTimeout(() => {
        setSelectedComponent(componentId);
      }, 0);
    } else {
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
  };

  const removeItem = (id: string) => {
    if (derivedItems.length <= 1) return;
    
    const itemToRemove = derivedItems.find(i => i.id === id);
    
    if (hasChildrenItems && itemToRemove?._component) {
      deleteComponent(id);
    } else {
      onChange(items.filter(item => item.id !== id));
    }
    
    // If removed item was active, clear active
    if (activeValue === id) {
      onActiveChange('');
    }
    
    setEditingItemId(null);
  };

  const updateItem = (id: string, field: string, value: any) => {
    const item = derivedItems.find(i => i.id === id);
    
    if (hasChildrenItems && item?._component) {
      if (field === 'title' || field === 'label') {
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
      onChange(items.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      ));
    }
  };

  const getItemTitle = (item: Record<string, any>) => {
    return item.title || item.label || `Item`;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full py-2.5 px-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform duration-200 text-muted-foreground",
                isOpen && "rotate-90"
              )} />
              <span className="text-xs font-medium text-foreground">
                {itemType === 'accordion' ? 'Accordion Items' : 'Tab Items'}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full border border-border/50">
              {derivedItems.length}
            </span>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="pt-3">
          <div className="space-y-4">
            {/* Active Selection Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="h-px flex-1 bg-border/50" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Default Active
                </span>
                <div className="h-px flex-1 bg-border/50" />
              </div>
              
              <RadioGroup 
                value={activeValue || ''} 
                onValueChange={onActiveChange}
                className="space-y-1"
              >
                {/* None option */}
                <label className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-muted/40 transition-colors">
                  <RadioGroupItem value="" id="active-none" className="h-4 w-4" />
                  <span className="text-xs text-muted-foreground">None (all collapsed)</span>
                </label>
              </RadioGroup>
            </div>

            {/* Items Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="h-px flex-1 bg-border/50" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Items
                </span>
                <div className="h-px flex-1 bg-border/50" />
              </div>

              <div className="space-y-1.5">
                {derivedItems.map((item, index) => {
                  const isEditing = editingItemId === item.id;
                  const itemId = item.id;
                  const isActive = activeValue === itemId;
                  
                  return (
                    <div key={itemId} className="space-y-2">
                      {/* Item Row */}
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all group border",
                        isActive 
                          ? "bg-primary/5 border-primary/30" 
                          : "bg-muted/20 border-transparent hover:bg-muted/40 hover:border-border/50"
                      )}>
                        {/* Drag handle */}
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 cursor-grab shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Radio for active selection */}
                        <RadioGroup value={activeValue || ''} onValueChange={onActiveChange}>
                          <RadioGroupItem value={itemId} id={`active-${itemId}`} className="h-4 w-4 shrink-0" />
                        </RadioGroup>
                        
                        {/* Item Label */}
                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            "text-xs font-medium block truncate",
                            isActive ? "text-primary" : "text-foreground"
                          )}>
                            {itemType === 'tabs' ? `Tab ${index + 1}` : `Section ${index + 1}`}
                          </span>
                          {getItemTitle(item) !== 'Item' && (
                            <span className="text-[10px] text-muted-foreground truncate block">
                              {getItemTitle(item)}
                            </span>
                          )}
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItemId(isEditing ? null : itemId);
                            }}
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              isEditing 
                                ? "bg-primary/10 text-primary" 
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                            title="Edit item"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItem(itemId);
                            }}
                            disabled={derivedItems.length <= 1}
                            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            title="Delete item"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Editing Panel */}
                      {isEditing && (
                        <div className="ml-4 border border-border/60 rounded-lg p-3 space-y-3 bg-card/50 shadow-sm">
                          {fields.map(field => (
                            <div key={field.name} className="space-y-1.5">
                              <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                {field.label}
                              </Label>
                              {field.type === 'textarea' ? (
                                <Textarea
                                  value={item[field.name] || ''}
                                  onChange={(e) => updateItem(item.id, field.name, e.target.value)}
                                  placeholder={field.placeholder}
                                  className="min-h-[80px] text-xs resize-none bg-background"
                                />
                              ) : (
                                <Input
                                  value={item[field.name] || ''}
                                  onChange={(e) => updateItem(item.id, field.name, e.target.value)}
                                  placeholder={field.placeholder}
                                  className="h-8 text-xs bg-background"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Add Button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full h-9 text-xs gap-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all" 
              onClick={addItem}
            >
              <Plus className="h-3.5 w-3.5" />
              Add {itemType === 'accordion' ? 'Section' : 'Tab'}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
