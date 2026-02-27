import React, { useState } from 'react';
import { useClassStore } from '@/stores/classStore';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useUserComponentStore } from '@/stores/userComponentStore';
import { useComponentStateStore, ComponentState } from '@/stores/componentStateStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Palette,
  Plus,
  Check,
  X,
  Wand2,
  ChevronDown,
  MousePointer, 
  Hand, 
  Focus, 
  Eye,
  Zap,
  Trash2,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const stateConfigs = [
  { id: 'normal' as ComponentState, label: 'Base', icon: MousePointer },
  { id: 'hover' as ComponentState, label: 'Hover (:hover)', icon: Hand },
  { id: 'pressed' as ComponentState, label: 'Active (:active)', icon: Zap },
  { id: 'focused' as ComponentState, label: 'Focus Visible (:focus-visible)', icon: Focus },
  { id: 'focus-within' as ComponentState, label: 'Focus Within (:focus-within)', icon: Eye }
];

interface ClassStateSelectorProps {
  componentId: string;
}

const findComponentInTree = (root: any, id: string): any => {
  if (!root) return null;
  if (root.id === id) return root;
  const children = Array.isArray(root.children) ? root.children : [];
  for (const child of children) {
    const found = findComponentInTree(child, id);
    if (found) return found;
  }
  return null;
};

const collectComponentIds = (root: any, set: Set<string>) => {
  if (!root) return;
  set.add(root.id);
  const children = Array.isArray(root.children) ? root.children : [];
  children.forEach((c: any) => collectComponentIds(c, set));
};

export function ClassStateSelector({ componentId }: ClassStateSelectorProps) {
  const {
    classes,
    applyClassToComponent,
    removeClassFromComponent,
    createClassFromComponent,
    deleteClass,
    updateClass
  } = useClassStore();

  const { updateComponent, currentProject, currentPage } = useAppBuilderStore();
  const { isEditingMode, editingDefinition } = useUserComponentStore();
  const { activeEditingState, setActiveEditingState } = useComponentStateStore();
  
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [isClassPopoverOpen, setIsClassPopoverOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState('');
  const [isInlineCreating, setIsInlineCreating] = useState(false);
  const [inlineClassName, setInlineClassName] = useState('');
  const [inlineError, setInlineError] = useState('');
  const [classSearchQuery, setClassSearchQuery] = useState('');

  // Get the current component (supports BOTH page canvas and component-editing canvas)
  const component = React.useMemo(() => {
    if (isEditingMode && editingDefinition) {
      return findComponentInTree(editingDefinition, componentId);
    }

    if (!currentProject || !currentPage) return null;
    const page = currentProject.pages.find(p => p.id === currentPage);
    if (!page) return null;
    return findComponentInTree({ id: 'root', children: page.components }, componentId);
  }, [isEditingMode, editingDefinition, currentProject, currentPage, componentId]);

  // Build class stack from component props - ensure unique classes
  const classStack = React.useMemo(() => {
    if (!component) return [];
    
    console.log('[ClassStateSelector] Building classStack:', {
      componentId,
      rawAppliedClasses: component.props?.appliedClasses,
      appliedClassesType: Array.isArray(component.props?.appliedClasses) ? 'array' : typeof component.props?.appliedClasses,
      autoClass: component.props?._autoClass,
      activeClass: component.props?.activeClass,
      allProps: Object.keys(component.props || {})
    });
    
    const appliedClasses = component.props?.appliedClasses || [];
    const autoClass = component.props?._autoClass;
    
    // Check for duplicates in raw array
    const hasDuplicates = appliedClasses.length !== new Set(appliedClasses).size;
    if (hasDuplicates) {
      console.warn('[ClassStateSelector] DUPLICATES DETECTED in appliedClasses:', {
        raw: appliedClasses,
        duplicates: appliedClasses.filter((item, index) => appliedClasses.indexOf(item) !== index)
      });
    }
    
    // Use Set to ensure uniqueness
    const uniqueClasses = Array.from(new Set(appliedClasses));
    
    if (autoClass && !uniqueClasses.includes(autoClass)) {
      console.log('[ClassStateSelector] Adding autoClass to stack:', autoClass);
      uniqueClasses.push(autoClass);
    }
    
    console.log('[ClassStateSelector] Final classStack:', uniqueClasses);
    
    return uniqueClasses;
  }, [component, componentId]);
  
  // Get active class (explicitly set or last in stack)
  const activeClassName = React.useMemo(() => {
    if (!component) return null;
    const activeClass = component.props?.activeClass || (classStack.length > 0 ? classStack[classStack.length - 1] : null);
    
    console.log('[ClassStateSelector] Active class determination:', {
      explicitActiveClass: component.props?.activeClass,
      lastInStack: classStack.length > 0 ? classStack[classStack.length - 1] : null,
      finalActiveClass: activeClass,
      classStack
    });
    
    return activeClass;
  }, [component, classStack]);

  // CRITICAL FIX: Deduplicate classes by name - only show ONE class per name
  // This prevents showing duplicate "Container 1" badges when multiple classes have the same name
  // IMPORTANT: Maintain classStack order - primary class first, secondary classes after
  const appliedClasses = React.useMemo(() => {
    const classMap = new Map<string, typeof classes[0]>();
    
    // Filter classes that are in the classStack
    const matchingClasses = classes.filter(cls => classStack.includes(cls.name));
    
    // Keep only the most recently created class for each name
    matchingClasses.forEach(cls => {
      const existing = classMap.get(cls.name);
      if (!existing || new Date(cls.createdAt) > new Date(existing.createdAt)) {
        classMap.set(cls.name, cls);
      }
    });
    
    // Sort by classStack order to maintain primary -> secondary ordering
    const deduped = Array.from(classMap.values()).sort((a, b) => {
      const indexA = classStack.indexOf(a.name);
      const indexB = classStack.indexOf(b.name);
      return indexA - indexB;
    });
    
    console.log('[ClassStateSelector] Applied classes filtered & deduped:', {
      classStackNames: classStack,
      matchingClasses: matchingClasses.map(c => ({ id: c.id, name: c.name, createdAt: c.createdAt })),
      dedupedClasses: deduped.map(c => ({ id: c.id, name: c.name })),
      totalClasses: classes.length,
      duplicatesRemoved: matchingClasses.length - deduped.length
    });
    
    return deduped;
  }, [classes, classStack]);
  
  // Filter available classes to only show those with valid component references
  const availableClasses = React.useMemo(() => {
    // Get all valid component IDs across all pages + editing canvas (if active)
    const validComponentIds = new Set<string>();

    if (currentProject?.pages) {
      currentProject.pages.forEach(page => {
        const collectFromPage = (components: any[]) => {
          components.forEach(comp => {
            validComponentIds.add(comp.id);
            if (comp.children) collectFromPage(comp.children);
          });
        };
        collectFromPage(page.components);
      });
    }

    if (isEditingMode && editingDefinition) {
      collectComponentIds(editingDefinition, validComponentIds);
    }

    // Show classes not already applied to this component
    // Include classes with no components (allows reuse of orphaned classes)
    return classes
      .filter(cls => !cls.appliedTo.includes(componentId))
      .filter(cls => {
        if (cls.appliedTo.length === 0) return true;
        return cls.appliedTo.some(id => validComponentIds.has(id));
      });
  }, [classes, componentId, currentProject, isEditingMode, editingDefinition]);

  // Check if a state has custom styles (checks class stateStyles, not component.style)
  const hasStateStyles = React.useCallback((state: ComponentState) => {
    if (state === 'normal') return false;
    // Check all applied classes for state overrides
    for (const styleClass of appliedClasses) {
      const stateStylesObj = styleClass.stateStyles?.[state as keyof typeof styleClass.stateStyles];
      if (stateStylesObj && Object.keys(stateStylesObj).length > 0) return true;
    }
    return false;
  }, [appliedClasses]);

  const handleApplyClass = async (classId: string, className: string) => {
    await applyClassToComponent(classId, componentId);
    // Rely on applyClassToComponent to update props (appliedClasses and _propertySource)
    setIsClassPopoverOpen(false);
  };

  const handleRemoveClass = async (classId: string, className: string) => {
    console.log('[ClassStateSelector] Before remove:', {
      classId,
      className,
      componentId,
      currentAppliedClasses: component?.props?.appliedClasses,
      classStack
    });
    
    await removeClassFromComponent(classId, componentId);
    
    // Force a small delay to ensure state has propagated
    setTimeout(() => {
      console.log('[ClassStateSelector] After remove:', {
        newAppliedClasses: component?.props?.appliedClasses,
        newClassStack: classStack
      });
    }, 100);
  };

  const handleCreateFromComponent = () => {
    if (newClassName.trim()) {
      console.log('[ClassStateSelector] Creating class from component:', {
        componentId,
        newClassName: newClassName.trim(),
        currentAppliedClasses: component?.props?.appliedClasses,
        currentAutoClass: component?.props?._autoClass,
        currentActiveClass: component?.props?.activeClass
      });
      
      createClassFromComponent(componentId, newClassName.trim());
      setNewClassName('');
      setIsCreateMode(false);
      setIsClassPopoverOpen(false);
      
      // Log state after creation
      setTimeout(() => {
        console.log('[ClassStateSelector] After class creation:', {
          newAppliedClasses: component?.props?.appliedClasses,
          newAutoClass: component?.props?._autoClass,
          newActiveClass: component?.props?.activeClass
        });
      }, 100);
    }
  };

  const handleStateChange = (state: ComponentState) => {
    setActiveEditingState(state);
  };

  const handleRenameClass = async (classId: string) => {
    if (editingClassName.trim()) {
      const sanitizedName = editingClassName.trim().replace(/\s+/g, '-');
      await updateClass(classId, { name: sanitizedName });
      setEditingClassId(null);
      setEditingClassName('');
    }
  };

  const startRenaming = (classId: string, currentName: string) => {
    setEditingClassId(classId);
    setEditingClassName(currentName);
  };

  const cancelRenaming = () => {
    setEditingClassId(null);
    setEditingClassName('');
  };

  const handleSetActiveClass = (className: string) => {
    if (!component) return;
    updateComponent(componentId, {
      props: {
        ...component.props,
        activeClass: className
      }
    });
  };

  // Validate class name
  const validateClassName = (name: string): string | null => {
    if (!name.trim()) return 'Class name cannot be empty';
    
    // Check for leading numbers
    if (/^\d/.test(name)) return 'Class name cannot start with a number';
    
    // Check for invalid characters
    if (!/^[a-zA-Z][a-zA-Z0-9\s\-_]*$/.test(name)) {
      return 'Only letters, numbers, spaces, hyphens, and underscores allowed';
    }
    
    return null;
  };

  // Sanitize class name (convert spaces to hyphens)
  const sanitizeClassName = (name: string): string => {
    return name.trim().replace(/\s+/g, '-');
  };

  // Handle inline class creation
  const handleInlineCreate = async () => {
    const trimmed = inlineClassName.trim();
    
    if (!trimmed) {
      setInlineError('Please enter a class name');
      return;
    }

    const validationError = validateClassName(trimmed);
    if (validationError) {
      setInlineError(validationError);
      return;
    }

    const sanitized = sanitizeClassName(trimmed);
    
    // Check if class already exists
    const existingClass = classes.find(cls => cls.name.toLowerCase() === sanitized.toLowerCase());
    
    if (existingClass) {
      // Apply existing class
      await applyClassToComponent(existingClass.id, componentId);
      setIsInlineCreating(false);
      setInlineClassName('');
      setInlineError('');
      return;
    }

    // Create new class from component styles
    await createClassFromComponent(componentId, sanitized);
    
    setIsInlineCreating(false);
    setInlineClassName('');
    setInlineError('');
  };

  const handleInlineInputChange = (value: string) => {
    setInlineClassName(value);
    setInlineError('');
  };

  const cancelInlineCreation = () => {
    setIsInlineCreating(false);
    setInlineClassName('');
    setInlineError('');
  };

  const currentStateConfig = stateConfigs.find(s => s.id === activeEditingState);
  const CurrentStateIcon = currentStateConfig?.icon || MousePointer;

  return (
    <div className="space-y-3">
      {/* Classes input field with tags */}
      <div className="space-y-2">
        <div className="relative">
          <div 
            className="min-h-[32px] w-full border border-input bg-background px-3 py-1.5 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-text"
            onDoubleClick={(e) => {
              // Only trigger if clicking on empty space (not on badges or buttons)
              if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('empty-space')) {
                setIsInlineCreating(true);
              }
            }}
          >
            {/* Applied classes as badges */}
            <div className="flex flex-wrap gap-1.5 items-center empty-space">
            {appliedClasses.map((styleClass, index) => {
                const isActive = styleClass.name === activeClassName;
                // First class in stack is primary, rest are secondary
                const isPrimary = index === 0;
                const hasSecondaries = appliedClasses.length > 1;
                // Primary is locked when secondary classes exist
                const isPrimaryLocked = isPrimary && hasSecondaries;
                
                return (
                  <div key={styleClass.id} className="flex items-center gap-1">
                    {editingClassId === styleClass.id ? (
                      <div className="flex items-center gap-1 bg-background border border-primary rounded px-1">
                        <Input
                          value={editingClassName}
                          onChange={(e) => setEditingClassName(e.target.value)}
                          className="h-5 text-xs w-32 px-1 border-0 focus-visible:ring-0"
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                              handleRenameClass(styleClass.id);
                            } else if (e.key === 'Escape') {
                              cancelRenaming();
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 hover:bg-primary hover:text-primary-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameClass(styleClass.id);
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelRenaming();
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-0.5 rounded-md group relative transition-all text-xs font-medium",
                          // PRIMARY class with secondaries = YELLOW + LOCKED (inherited/base)
                          isPrimaryLocked && "bg-amber-500 hover:bg-amber-600 text-white cursor-not-allowed",
                          // PRIMARY class without secondaries = BLUE (editable)
                          isPrimary && !hasSecondaries && "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer",
                          // SECONDARY class = BLUE (editable)
                          !isPrimary && "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer",
                          // Active ring indicator for the class being edited
                          isActive && !isPrimaryLocked && "ring-2 ring-offset-1 ring-primary"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Don't allow clicking locked primary to set as active
                          if (!isPrimaryLocked) {
                            handleSetActiveClass(styleClass.name);
                          }
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          // Don't allow renaming locked primary
                          if (!isPrimaryLocked) {
                            startRenaming(styleClass.id, styleClass.name);
                          }
                        }}
                        title={isPrimaryLocked 
                          ? `Primary class (locked) - Remove secondary classes to edit` 
                          : "Click to activate • Double-click to rename • Click X to remove"}
                      >
                        {/* Lock icon for locked primary class */}
                        {isPrimaryLocked && <Lock className="h-3 w-3" />}
                        <span className="select-none font-mono">.{styleClass.name}</span>
                        {/* Only show X for non-locked classes */}
                        {!isPrimaryLocked && (
                          <X 
                            className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveClass(styleClass.id, styleClass.name);
                            }}
                          />
                        )}
                      </div>
                    )}
                    {/* Active state indicator */}
                    {activeEditingState !== 'normal' && editingClassId !== styleClass.id && (
                      <Badge variant="default" className="text-xs px-1.5 py-0.5 bg-primary text-primary-foreground">
                        {currentStateConfig?.label}
                      </Badge>
                    )}
                  </div>
                );
              })}
              
              {/* Webflow-style inline autocomplete input */}
              <div className="relative inline-block">
                <Input
                  value={inlineClassName}
                  onChange={(e) => {
                    handleInlineInputChange(e.target.value);
                    setIsInlineCreating(true);
                  }}
                  onFocus={() => setIsInlineCreating(true)}
                  onBlur={(e) => {
                    // Delay to allow clicking on dropdown items
                    setTimeout(() => {
                      if (!e.relatedTarget?.closest('.class-autocomplete-dropdown')) {
                        setIsInlineCreating(false);
                        setInlineClassName('');
                        setInlineError('');
                      }
                    }, 150);
                  }}
                  placeholder="+ Add C..."
                  className="h-6 text-xs w-24 px-2 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inlineClassName.trim()) {
                      e.preventDefault();
                      handleInlineCreate();
                    } else if (e.key === 'Escape') {
                      setIsInlineCreating(false);
                      setInlineClassName('');
                      setInlineError('');
                    }
                  }}
                />
                
                {/* Autocomplete dropdown */}
                {isInlineCreating && (
                  <div className="class-autocomplete-dropdown absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-md shadow-lg z-[1000]">
                    {(() => {
                      const searchTerm = inlineClassName.toLowerCase();
                      const filteredClasses = availableClasses.filter(cls =>
                        cls.name.toLowerCase().includes(searchTerm)
                      );
                      const exactMatch = classes.find(cls => 
                        cls.name.toLowerCase() === searchTerm
                      );
                      
                      return (
                        <>
                          {filteredClasses.length > 0 && (
                            <>
                              <div className="px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border sticky top-0 bg-popover">
                                Existing Classes
                              </div>
                              <div className="max-h-48 overflow-y-auto py-1">
                                {filteredClasses.map((styleClass) => (
                                  <div
                                    key={styleClass.id}
                                    className="flex items-center justify-between px-3 py-1.5 hover:bg-muted cursor-pointer transition-colors"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleApplyClass(styleClass.id, styleClass.name);
                                      setInlineClassName('');
                                      setIsInlineCreating(false);
                                    }}
                                  >
                                    <span className="text-sm font-mono">.{styleClass.name}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                          
                          {/* Create new class option */}
                          {inlineClassName.trim() && !exactMatch && (
                            <div
                              className="px-3 py-2 hover:bg-muted cursor-pointer transition-colors border-t border-border flex items-center gap-2 text-sm"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleInlineCreate();
                              }}
                            >
                              <Plus className="h-3 w-3" />
                              <span>Create "<span className="font-mono">.{sanitizeClassName(inlineClassName)}</span>"</span>
                            </div>
                          )}
                          
                          {/* Empty state when no search term */}
                          {!inlineClassName.trim() && filteredClasses.length === 0 && (
                            <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                              <Palette className="h-5 w-5 mx-auto mb-1 opacity-50" />
                              <p>No classes available</p>
                              <p className="text-xs mt-1">Type to create one</p>
                            </div>
                          )}
                          
                          {/* No matches but has search term */}
                          {inlineClassName.trim() && filteredClasses.length === 0 && !exactMatch && (
                            <div className="px-3 py-2 text-xs text-muted-foreground">
                              No matching classes
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Inline error message */}
          {inlineError && (
            <div className="text-xs text-destructive mt-1 px-3">
              {inlineError}
            </div>
          )}

          {/* State dropdown on the right */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground relative"
                >
                  <CurrentStateIcon className="h-3 w-3" />
                  {/* Blue dot indicator for states with changes */}
                  {hasStateStyles(activeEditingState) && (
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {stateConfigs.map((config) => {
                  const Icon = config.icon;
                  const hasChanges = hasStateStyles(config.id);
                  return (
                    <DropdownMenuItem
                      key={config.id}
                      onClick={() => handleStateChange(config.id)}
                      className={cn(
                        "flex items-center gap-2 text-xs",
                        activeEditingState === config.id && "bg-accent"
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {config.label}
                      <div className="flex items-center gap-1 ml-auto">
                        {/* Blue dot for states with changes */}
                        {hasChanges && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                        {/* Check mark for active state */}
                        {activeEditingState === config.id && (
                          <Check className="h-3 w-3" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* State editing badge */}
        {activeEditingState !== 'normal' && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-md">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-xs font-medium text-primary">
                Editing: {currentStateConfig?.label}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-[10px] text-primary hover:text-primary-foreground hover:bg-primary"
              onClick={() => setActiveEditingState('normal')}
            >
              Back to Base
            </Button>
          </div>
        )}

        {appliedClasses.length > 0 && !isInlineCreating && activeEditingState === 'normal' && (
          <div className="text-xs text-muted-foreground">
            {appliedClasses.length} class{appliedClasses.length !== 1 ? 'es' : ''} applied
          </div>
        )}
        
        {isInlineCreating && !inlineError && (
          <div className="text-xs text-muted-foreground">
            Press Enter to create class
          </div>
        )}
      </div>
    </div>
  );
}