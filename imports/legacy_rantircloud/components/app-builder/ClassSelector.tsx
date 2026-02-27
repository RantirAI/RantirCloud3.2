import { useState, useMemo, useEffect, useRef } from 'react';
import { useClassStore } from '@/stores/classStore';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useUserComponentStore } from '@/stores/userComponentStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/sonner';
import {
  Palette,
  Plus,
  Check,
  X,
  Wand2,
  Trash2,
  RefreshCw,
  AlertCircle,
  Lock,
  Pencil
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ClassSelectorProps {
  componentId: string;
  currentClassName?: string;
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

export function ClassSelector({ componentId, currentClassName }: ClassSelectorProps) {
  const { 
    classes, 
    addClass,
    applyClassToComponent, 
    removeClassFromComponent, 
    createClassFromComponent,
    deleteClass,
    setActiveClass,
    editingClassName,
    setEditingClassName,
    cleanupDuplicateClasses,
    updateClass
  } = useClassStore();

  const { selectedComponent, currentProject, currentPage, updateComponent } = useAppBuilderStore();
  const { isEditingMode, editingDefinition } = useUserComponentStore();
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingClass, setRenamingClass] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  // Track classes being created to avoid duplicate attempts
  const creatingClassesRef = useRef<Set<string>>(new Set());

  // Get component to access its props (supports BOTH page canvas and component-editing canvas)
  const component = useMemo(() => {
    if (isEditingMode && editingDefinition) {
      return findComponentInTree(editingDefinition, componentId);
    }

    if (!currentProject || !currentPage) return null;
    const pageData = currentProject.pages.find(p => p.id === currentPage);
    if (!pageData) return null;
    return findComponentInTree({ id: 'root', children: pageData.components }, componentId);
  }, [isEditingMode, editingDefinition, currentProject, currentPage, componentId]);

  // Build class stack from component props with active class support - DEDUPE
  const classStack = useMemo(() => {
    if (!component) return [];
    
    const appliedClasses = component.props?.appliedClasses || [];
    const autoClass = component.props?._autoClass;
    
    // Build stack: applied classes + auto-class at the end
    const classSet = new Set<string>(appliedClasses);
    if (autoClass && !classSet.has(autoClass)) {
      classSet.add(autoClass);
    }
    
    const stack = Array.from(classSet);
    
    // Cleanup duplicates from component if any exist
    if (appliedClasses.length !== Array.from(new Set(appliedClasses)).length) {
      cleanupDuplicateClasses(componentId);
    }
    
    return stack;
  }, [component, componentId]);
  
  // Create missing classes from classStack (auto-class sync)
  useEffect(() => {
    const missingClasses = classStack.filter(
      className => !classes.find(cls => cls.name === className) && 
                   !creatingClassesRef.current.has(className)
    );
    
    if (missingClasses.length > 0) {
      missingClasses.forEach(className => {
        creatingClassesRef.current.add(className);
        addClass(className, {}, true).then((newClass) => {
          if (newClass) {
            // Update the class's appliedTo to include this component
            const classStore = useClassStore.getState();
            const updatedClasses = classStore.classes.map(cls => 
              cls.id === newClass.id && !cls.appliedTo.includes(componentId)
                ? { ...cls, appliedTo: [...cls.appliedTo, componentId] }
                : cls
            );
            useClassStore.setState({ classes: updatedClasses });
          }
          creatingClassesRef.current.delete(className);
        });
      });
    }
  }, [classStack, classes, componentId, addClass]);
  
  // Get active class (the one being edited - from props)
  const activeClassName = useMemo(() => {
    if (!component) return null;
    return component.props?.activeClass || (classStack.length > 0 ? classStack[0] : null);
  }, [component, classStack]);

  // PRIMARY class is always the FIRST in the stack
  const primaryClassName = classStack.length > 0 ? classStack[0] : null;

  // Check if there are secondary classes (more than one class)
  const hasSecondaryClasses = classStack.length > 1;
  
  // Get secondary classes (all except the PRIMARY, not the active)
  const secondaryClasses = classStack.filter(cls => cls !== primaryClassName);

  // Calculate usage counts for classes
  const getClassUsageCount = (className: string) => {
    const styleClass = classes.find(cls => cls.name === className);
    if (!styleClass) return { thisPage: 0, otherPages: 0 };
    
    let thisPage = 0;
    let otherPages = 0;
    
    if (currentProject?.pages) {
      currentProject.pages.forEach(page => {
        const countOnPage = (components: any[]): number => {
          let count = 0;
          for (const comp of components) {
            if (styleClass.appliedTo.includes(comp.id)) {
              count++;
            }
            if (comp.children) {
              count += countOnPage(comp.children);
            }
          }
          return count;
        };
        
        const pageCount = countOnPage(page.components);
        if (page.id === currentPage) {
          thisPage = pageCount;
        } else {
          otherPages += pageCount;
        }
      });
    }
    
    return { thisPage, otherPages };
  };

  // Filter classes - show ALL classes applied to this component (including empty auto-classes)
  const appliedClasses = classes.filter(cls => {
    return cls.appliedTo.includes(componentId);
  });
  
  const appliedClassNames = new Set(appliedClasses.map(cls => cls.name));
  
  // Also include classes from classStack that may not be in appliedTo yet
  const classStackSet = new Set(classStack);
  
  const availableClasses = classes
    .filter(cls => {
      // Not already in the component's class stack
      if (classStackSet.has(cls.name)) return false;
      if (appliedClassNames.has(cls.name)) return false;
      // Show classes that have been used elsewhere (reusable classes)
      if (!cls.appliedTo || cls.appliedTo.length === 0) return false;
      return true;
    })
    .filter(cls => cls.name.toLowerCase().includes(searchQuery.toLowerCase()));
  

  const handleApplyClass = (classId: string) => {
    applyClassToComponent(classId, componentId);
  };

  const handleRemoveClass = (classId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    removeClassFromComponent(classId, componentId);
  };

  const handleCreateFromComponent = () => {
    if (newClassName.trim()) {
      if (!component?.props || Object.keys(component.props).length === 0) {
        toast.error('No styles to create a class from. Customize the component first.');
        return;
      }
      
      createClassFromComponent(componentId, newClassName.trim());
      setNewClassName('');
      setIsCreateMode(false);
      setIsOpen(false);
    }
  };

  const handleDeleteClass = (classId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    deleteClass(classId);
  };
  
  const handleSetActiveClass = (className: string) => {
    setActiveClass(componentId, className);
  };

  const handleClassClick = (className: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const styleClass = classes.find(cls => cls.name === className);
    if (!styleClass) return;

    const isPrimaryClass = className === primaryClassName;
    const isActiveClass = className === activeClassName;
    
    // PRIMARY CLASS LOGIC - Block editing primary when secondary classes exist
    if (isPrimaryClass && hasSecondaryClasses) {
      toast.error(
        `Cannot modify .${className} - ${secondaryClasses.length} dependent class${secondaryClasses.length > 1 ? 'es' : ''} exist. Remove dependent classes first.`,
        { duration: 4000 }
      );
      setEditingClassName(null);
      return;
    }
    
    // Clicking on primary class (no secondaries) or secondary class - set as active for editing
    if (isPrimaryClass) {
      // Primary class with no secondaries - toggle editing
      if (editingClassName === className) {
        setEditingClassName(null);
        toast.info(`Stopped editing "${className}"`);
      } else {
        setEditingClassName(className);
        handleSetActiveClass(className);
        toast.success(`Now editing "${className}"`);
      }
    } else {
      // Secondary class - set as active for editing
      if (editingClassName === className) {
        setEditingClassName(null);
        toast.info(`Stopped editing "${className}"`);
      } else {
        setEditingClassName(className);
        handleSetActiveClass(className);
        toast.success(`Now editing secondary class "${className}"`);
      }
    }
  };

  const handleStartRename = (className: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setRenamingClass(className);
    setRenameValue(className);
  };

  const handleRenameClass = (oldName: string) => {
    if (!renameValue.trim() || renameValue === oldName) {
      setRenamingClass(null);
      return;
    }

    const sanitizedName = renameValue.trim().replace(/\s+/g, '-');
    const styleClass = classes.find(cls => cls.name === oldName);
    if (styleClass) {
      updateClass(styleClass.id, { name: sanitizedName });
      toast.success(`Class renamed from "${oldName}" to "${sanitizedName}"`);
    }
    setRenamingClass(null);
  };

  // Get total usage for display
  const getTotalUsage = () => {
    if (classStack.length === 0) return null;
    const primaryClass = classStack[0];
    const usage = getClassUsageCount(primaryClass);
    return usage;
  };

  const totalUsage = getTotalUsage();

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Nesting indicator */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Nest:</span>
            <span className="text-xs font-medium text-foreground">{component?.type || 'Element'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 bg-muted/50 rounded">
              .{component?.props?._autoClass || 'auto'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => {
                if (currentProject?.id) {
                  const { loadClasses } = useClassStore.getState();
                  loadClasses(currentProject.id);
                }
              }}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Cannot modify warning - shown only when PRIMARY class is ACTIVE and secondary classes exist */}
        {hasSecondaryClasses && activeClassName === primaryClassName && (
          <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-md">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-medium text-amber-600 dark:text-amber-400">Cannot modify</p>
              <p className="text-muted-foreground">
                .{primaryClassName} - {secondaryClasses.length} dependent class{secondaryClasses.length > 1 ? 'es' : ''} exist{secondaryClasses.length === 1 ? 's' : ''}. Remove dependent classes first to edit.
              </p>
            </div>
          </div>
        )}
        
        {/* Class Badges */}
        <div className="space-y-2">
          {classStack.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {classStack.map((className, index) => {
                const styleClass = classes.find(cls => cls.name === className);
                const isCreating = creatingClassesRef.current.has(className);
                
                // If class not found, show loading state (useEffect will create it)
                if (!styleClass) {
                  return (
                    <div 
                      key={`creating-${className}`} 
                      className="flex items-center gap-1 px-2 py-1.5 rounded border bg-muted/50 border-border text-xs"
                    >
                      <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                      <span className="font-mono text-muted-foreground">.{className}</span>
                    </div>
                  );
                }
                
                const isPrimary = className === primaryClassName;
                const isEditing = editingClassName === className;
                const isActive = className === activeClassName;
                const isLocked = isPrimary && hasSecondaryClasses;
                const isRenaming = renamingClass === className;
                
                return (
                  <div key={styleClass.id} className="flex items-center gap-1">
                    {isRenaming ? (
                      <div className="flex items-center gap-1 flex-1">
                        <span className="text-xs text-muted-foreground">.</span>
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="h-6 text-xs flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameClass(className);
                            if (e.key === 'Escape') setRenamingClass(null);
                          }}
                          onBlur={() => handleRenameClass(className)}
                        />
                      </div>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex items-center gap-1 px-2 py-1.5 rounded border transition-all cursor-pointer group flex-1",
                              isPrimary 
                                ? isLocked
                                  ? "bg-muted/50 border-border text-muted-foreground opacity-60 cursor-not-allowed"
                                  : "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400" 
                                : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
                              isEditing && !isLocked && "ring-2 ring-offset-1 ring-blue-500"
                            )}
                            onClick={(e) => !isLocked && handleClassClick(className, e)}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (!isPrimary) handleSetActiveClass(className);
                            }}
                          >
                            {isLocked && (
                              <Lock className="h-3 w-3 opacity-70" />
                            )}
                            <span className="text-xs font-mono">.{className}</span>
                            
                            {/* Rename button - only show on hover for non-locked classes */}
                            {!isLocked && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 ml-auto opacity-0 group-hover:opacity-100 hover:bg-transparent"
                                onClick={(e) => handleStartRename(className, e)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-4 w-4 p-0 hover:bg-transparent",
                                isLocked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                              )}
                              onClick={(e) => handleRemoveClass(styleClass.id, e)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="text-xs">
                            <strong>{isPrimary ? 'Primary' : 'Secondary'}</strong> class<br/>
                            {isPrimary && !isLocked && "Click to edit • Double-click rename icon to rename"}
                            {isPrimary && isLocked && "Locked: Remove secondary classes first to edit"}
                            {!isPrimary && "Double-click to make primary"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
          
          {/* Add Class Button */}
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add C
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 max-h-[400px] overflow-hidden p-0 bg-popover border border-border shadow-lg z-[1000]" align="start">
              <div className="p-3 border-b border-border bg-muted/30">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <Palette className="h-4 w-4 text-primary" />
                  Available Classes
                </h4>
                <Input
                  placeholder="Search classes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              
              <ScrollArea className="h-60">
                <div className="p-2 space-y-1">
                  {availableClasses.length === 0 && !isCreateMode ? (
                    <div className="text-center text-muted-foreground py-6">
                      <Palette className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-medium">No classes available</p>
                      <p className="text-xs mt-1">Create a new class below</p>
                    </div>
                  ) : (
                    availableClasses.map((styleClass) => {
                      const styleCount = Object.keys(styleClass.styles).length;
                      return (
                        <div
                          key={styleClass.id}
                          className="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted/50 group"
                          onClick={() => {
                            handleApplyClass(styleClass.id);
                            setIsOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono">.{styleClass.name}</span>
                            <Badge variant="secondary" className="text-[10px] h-4">
                              {styleCount}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">
                              {styleClass.appliedTo.length} uses
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                              onClick={(e) => handleDeleteClass(styleClass.id, e)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              <div className="p-2 border-t border-border bg-muted/20">
                {isCreateMode ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="class-name"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        className="h-7 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateFromComponent();
                          else if (e.key === 'Escape') {
                            setIsCreateMode(false);
                            setNewClassName('');
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-7 px-2"
                        onClick={handleCreateFromComponent}
                        disabled={!newClassName.trim()}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setIsCreateMode(false);
                          setNewClassName('');
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => setIsCreateMode(true)}
                  >
                    <Wand2 className="h-3 w-3 mr-1" />
                    Create from Current
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Usage count */}
        {totalUsage && (totalUsage.thisPage > 0 || totalUsage.otherPages > 0) && (
          <div className="px-1">
            <span className="text-[10px] text-muted-foreground">
              {totalUsage.thisPage > 0 && `${totalUsage.thisPage} on this page`}
              {totalUsage.thisPage > 0 && totalUsage.otherPages > 0 && ', '}
              {totalUsage.otherPages > 0 && `${totalUsage.otherPages} on other pages`}
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
