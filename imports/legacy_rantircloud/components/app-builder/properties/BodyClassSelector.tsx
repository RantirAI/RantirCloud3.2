import React, { useEffect, useState, useMemo } from 'react';
import { useClassStore } from '@/stores/classStore';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Check,
  X,
  ChevronDown,
  Trash2,
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

const DEFAULT_BODY_CLASS = 'body';

const DEFAULT_BODY_CLASS_STYLES: Record<string, any> = {
  // Website-like default canvas (white page with dark text)
  backgroundColor: '#ffffff',
  color: '#000000',
};

export function BodyClassSelector() {
  const {
    classes,
    addClass,
    updateClass,
    deleteClass,
  } = useClassStore();

  const { currentProject, currentPage, updatePageBodyProperties } = useAppBuilderStore();
  
  const [isClassPopoverOpen, setIsClassPopoverOpen] = useState(false);
  const [isInlineCreating, setIsInlineCreating] = useState(false);
  const [inlineClassName, setInlineClassName] = useState('');
  const [inlineError, setInlineError] = useState('');
  const [classSearchQuery, setClassSearchQuery] = useState('');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState('');

  const pageData = useMemo(() => {
    if (!currentProject || !currentPage) return null;
    return currentProject.pages.find(p => p.id === currentPage);
  }, [currentProject, currentPage]);

  const bodyProps = pageData?.bodyProperties || {};

  // Ensure the default body class exists in the Class Store (and has sane defaults).
  useEffect(() => {
    const existing = classes.find((c) => c.name === DEFAULT_BODY_CLASS);

    if (!existing) {
      // Create once.
      addClass(DEFAULT_BODY_CLASS, DEFAULT_BODY_CLASS_STYLES, true);
      return;
    }

    // Backfill defaults without overwriting user edits.
    const patch: Record<string, any> = {};
    if (existing.styles?.backgroundColor == null && existing.styles?.background == null) {
      patch.backgroundColor = DEFAULT_BODY_CLASS_STYLES.backgroundColor;
    }
    if (existing.styles?.color == null) {
      patch.color = DEFAULT_BODY_CLASS_STYLES.color;
    }

    if (Object.keys(patch).length > 0) {
      updateClass(existing.id, {
        styles: {
          ...(existing.styles || {}),
          ...patch,
        },
      });
    }
  }, [classes, addClass, updateClass]);

  // Persist the default class on the page body so the canvas resolver actually applies it.
  useEffect(() => {
    if (!currentProject || !currentPage) return;

    const page = currentProject.pages.find((p) => p.id === currentPage);
    const current = page?.bodyProperties || {};

    const applied = Array.isArray((current as any).appliedClasses) ? (current as any).appliedClasses : [];
    const active = typeof (current as any).activeClass === 'string' ? (current as any).activeClass : undefined;

    // Only set defaults when missing (never overwrite existing configuration).
    if (applied.length === 0) {
      updatePageBodyProperties(currentPage, {
        ...current,
        appliedClasses: [DEFAULT_BODY_CLASS],
        activeClass: active || DEFAULT_BODY_CLASS,
      });
      return;
    }

    // Ensure activeClass is always set.
    if (!active) {
      updatePageBodyProperties(currentPage, {
        ...current,
        activeClass: applied[applied.length - 1] || DEFAULT_BODY_CLASS,
      });
    }
  }, [currentProject, currentPage, updatePageBodyProperties]);

  // Get applied classes from body properties
  const appliedClassNames: string[] = useMemo(() => {
    const classNames = bodyProps.appliedClasses || [];
    // Ensure page-body is always first if not explicitly set
    if (classNames.length === 0) {
      return [DEFAULT_BODY_CLASS];
    }
    return classNames;
  }, [bodyProps.appliedClasses]);

  // Find actual class objects for applied classes
  const appliedClasses = useMemo(() => {
    return appliedClassNames
      .map(name => classes.find(c => c.name === name))
      .filter(Boolean);
  }, [appliedClassNames, classes]);

  const activeClassName = bodyProps.activeClass || appliedClassNames[0] || DEFAULT_BODY_CLASS;

  // Available classes to add (not already applied)
  const availableClasses = useMemo(() => {
    return classes.filter(cls => !appliedClassNames.includes(cls.name));
  }, [classes, appliedClassNames]);

  const filteredAvailableClasses = useMemo(() => {
    if (!classSearchQuery) return availableClasses;
    const query = classSearchQuery.toLowerCase();
    return availableClasses.filter(cls => 
      cls.name.toLowerCase().includes(query)
    );
  }, [availableClasses, classSearchQuery]);

  // Validate class name
  const validateClassName = (name: string): string | null => {
    if (!name.trim()) return 'Class name cannot be empty';
    if (/^\d/.test(name)) return 'Class name cannot start with a number';
    if (!/^[a-zA-Z][a-zA-Z0-9\s\-_]*$/.test(name)) {
      return 'Only letters, numbers, spaces, hyphens, and underscores allowed';
    }
    return null;
  };

  const sanitizeClassName = (name: string): string => {
    return name.trim().replace(/\s+/g, '-');
  };

  const handleApplyClass = async (classId: string, className: string) => {
    const newAppliedClasses = [...appliedClassNames, className];
    updatePageBodyProperties(currentPage!, {
      ...bodyProps,
      appliedClasses: newAppliedClasses,
      activeClass: className,
    });
    setIsClassPopoverOpen(false);
    setClassSearchQuery('');
  };

  const handleRemoveClass = async (classId: string, className: string) => {
    // Don't allow removing if it's the only class
    if (appliedClassNames.length <= 1) return;
    
    const newAppliedClasses = appliedClassNames.filter(n => n !== className);
    const newActiveClass = newAppliedClasses[newAppliedClasses.length - 1] || DEFAULT_BODY_CLASS;
    
    updatePageBodyProperties(currentPage!, {
      ...bodyProps,
      appliedClasses: newAppliedClasses,
      activeClass: newActiveClass,
    });
  };

  const handleSetActiveClass = (className: string) => {
    updatePageBodyProperties(currentPage!, {
      ...bodyProps,
      activeClass: className,
    });
  };

  const handleRenameClass = async (classId: string) => {
    if (editingClassName.trim()) {
      const sanitizedName = editingClassName.trim().replace(/\s+/g, '-');
      await updateClass(classId, { name: sanitizedName });
      
      // Update bodyProperties if this class was applied
      if (appliedClassNames.includes(editingClassName)) {
        const newAppliedClasses = appliedClassNames.map(n => 
          n === editingClassName ? sanitizedName : n
        );
        updatePageBodyProperties(currentPage!, {
          ...bodyProps,
          appliedClasses: newAppliedClasses,
          activeClass: bodyProps.activeClass === editingClassName ? sanitizedName : bodyProps.activeClass,
        });
      }
      
      setEditingClassId(null);
      setEditingClassName('');
    }
  };

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
      const newAppliedClasses = [...appliedClassNames, existingClass.name];
      updatePageBodyProperties(currentPage!, {
        ...bodyProps,
        appliedClasses: newAppliedClasses,
        activeClass: existingClass.name,
      });
    } else {
      // Create new class with current body styles
      // Extract only style properties from bodyProps
      const styleProps = { ...bodyProps };
      delete styleProps.appliedClasses;
      delete styleProps.activeClass;
      
      await addClass(sanitized, styleProps, false);
      
      const newAppliedClasses = [...appliedClassNames, sanitized];
      updatePageBodyProperties(currentPage!, {
        ...bodyProps,
        appliedClasses: newAppliedClasses,
        activeClass: sanitized,
      });
    }
    
    setIsInlineCreating(false);
    setInlineClassName('');
    setInlineError('');
  };

  const startRenaming = (classId: string, currentName: string) => {
    setEditingClassId(classId);
    setEditingClassName(currentName);
  };

  const cancelRenaming = () => {
    setEditingClassId(null);
    setEditingClassName('');
  };

  const cancelInlineCreation = () => {
    setIsInlineCreating(false);
    setInlineClassName('');
    setInlineError('');
  };

  return (
    <div className="space-y-3">
      {/* Classes input field with tags */}
      <div className="space-y-2">
        <div className="relative">
          <div 
            className="min-h-[32px] w-full border border-input bg-background dark:bg-zinc-950 px-3 py-1.5 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-text"
            onDoubleClick={(e) => {
              if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('empty-space')) {
                setIsInlineCreating(true);
              }
            }}
          >
            {/* Applied classes as badges */}
            <div className="flex flex-wrap gap-1.5 items-center empty-space">
              {appliedClasses.map((styleClass, index) => {
                if (!styleClass) return null;
                const isActive = styleClass.name === activeClassName;
                const isPrimary = index === 0;
                const hasSecondaries = appliedClasses.length > 1;
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
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 hover:bg-primary hover:text-primary-foreground"
                          onClick={() => handleRenameClass(styleClass.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={cancelRenaming}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "flex items-center gap-1.5 px-2 py-0.5 rounded-md group relative transition-all text-xs font-medium",
                                isPrimaryLocked && "bg-muted text-muted-foreground cursor-not-allowed",
                                (isPrimary && !hasSecondaries) && "bg-primary text-primary-foreground cursor-pointer",
                                (!isPrimary && isActive) && "bg-primary text-primary-foreground cursor-pointer",
                                (!isPrimary && !isActive) && "bg-secondary text-secondary-foreground cursor-pointer"
                              )}
                              onClick={() => !isPrimaryLocked && handleSetActiveClass(styleClass.name)}
                              onDoubleClick={() => startRenaming(styleClass.id, styleClass.name)}
                            >
                              <span className="select-none">{styleClass.name}</span>
                              
                              {!isPrimaryLocked && (
                                <button
                                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-white/80"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveClass(styleClass.id, styleClass.name);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {isPrimaryLocked ? 'Primary class (locked)' : 'Double-click to rename'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                );
              })}

              {/* Inline creation input */}
              {isInlineCreating && (
                <div className="flex items-center gap-1">
                  <Input
                    value={inlineClassName}
                    onChange={(e) => {
                      setInlineClassName(e.target.value);
                      setInlineError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleInlineCreate();
                      } else if (e.key === 'Escape') {
                        cancelInlineCreation();
                      }
                    }}
                    placeholder="Class name..."
                    className={cn(
                      "h-6 w-24 text-xs px-1.5",
                      inlineError && "border-destructive"
                    )}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 hover:bg-primary hover:text-primary-foreground"
                    onClick={handleInlineCreate}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={cancelInlineCreation}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Add class button */}
              {!isInlineCreating && (
                <Popover open={isClassPopoverOpen} onOpenChange={setIsClassPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="p-2 border-b">
                      <Input
                        placeholder="Search or create class..."
                        value={classSearchQuery}
                        onChange={(e) => setClassSearchQuery(e.target.value)}
                        className="h-7 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && classSearchQuery.trim()) {
                            const sanitized = sanitizeClassName(classSearchQuery);
                            const exists = classes.find(c => c.name.toLowerCase() === sanitized.toLowerCase());
                            if (exists) {
                              handleApplyClass(exists.id, exists.name);
                            } else {
                              setInlineClassName(classSearchQuery);
                              setIsInlineCreating(true);
                              setIsClassPopoverOpen(false);
                            }
                          }
                        }}
                      />
                    </div>
                    <ScrollArea className="max-h-48">
                      <div className="p-1">
                        {filteredAvailableClasses.length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground text-center">
                            {classSearchQuery ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-xs"
                                onClick={() => {
                                  setInlineClassName(classSearchQuery);
                                  setIsInlineCreating(true);
                                  setIsClassPopoverOpen(false);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Create "{sanitizeClassName(classSearchQuery)}"
                              </Button>
                            ) : (
                              'No classes available'
                            )}
                          </div>
                        ) : (
                          filteredAvailableClasses.map(cls => (
                            <button
                              key={cls.id}
                              className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted flex items-center justify-between group"
                              onClick={() => handleApplyClass(cls.id, cls.name)}
                            >
                              <span>{cls.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
          
          {inlineError && (
            <p className="text-xs text-destructive mt-1">{inlineError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
