import React, { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/compact/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/compact/Select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { AlignCenterHorizontal } from 'lucide-react';
import { useClassPropertyTracking } from '@/hooks/useClassPropertyTracking';
import { useClassStore } from '@/stores/classStore';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { mergeClassSpacing, getSpacingPropertySource } from '@/lib/classSpacingMerger';

interface SpacingValues {
  top: string;
  right: string;
  bottom: string;
  left: string;
  unit: 'px' | 'rem' | 'em' | '%' | 'auto';
}

interface CombinedSpacingValues {
  margin: SpacingValues;
  padding: SpacingValues;
}

interface VisualSpacingEditorProps {
  label: string;
  type?: 'padding' | 'margin' | 'combined';
  value: SpacingValues | CombinedSpacingValues;
  onChange: (value: SpacingValues | CombinedSpacingValues) => void;
  componentProps?: Record<string, any>;
  componentType?: string;
  defaultValue?: CombinedSpacingValues;
}

const units = [
  { label: 'PX', value: 'px' },
  { label: 'EM', value: 'em' },
  { label: 'REM', value: 'rem' },
  { label: '%', value: '%' },
  { label: 'AUTO', value: 'auto' },
];

export function VisualSpacingEditor({ label, type = 'combined', value, onChange, componentProps, componentType, defaultValue }: VisualSpacingEditorProps) {
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [editingProperty, setEditingProperty] = useState<{
    property: string;
    value: string;
    unit: string;
  } | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    property: string;
    startY: number;
    startValue: number;
    unit: string;
  } | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const { isFromExternalClass, getPropertySource } = useClassPropertyTracking(componentProps);
  const { classes } = useClassStore();

  // Get class stack (applied classes)
  const classStack = useMemo(() => {
    if (componentProps?.classStack && Array.isArray(componentProps.classStack)) {
      return componentProps.classStack.map((item: any) => {
        if (typeof item === 'string') return item;
        return item.name;
      });
    }
    return componentProps?.appliedClasses || [];
  }, [componentProps?.classStack, componentProps?.appliedClasses]);

  // Active class for editing - use component's activeClass
  const activeClass = componentProps?.activeClass || (classStack.length > 0 ? classStack[classStack.length - 1] : null);

  // Determine primary class (the active one being edited)
  const primaryClassName = activeClass;
  
  // Secondary classes (all others in the stack)
  const secondaryClassNames = useMemo(() => {
    return classStack.filter((name: string) => name !== primaryClassName);
  }, [classStack, primaryClassName]);

  // Get merged spacing values from all classes using the proper merger utility
  const getMergedSpacingValues = useMemo(() => {
    const defaultSpacing: SpacingValues = { top: '0', right: '0', bottom: '0', left: '0', unit: 'px' };

    // Use the classSpacingMerger utility for proper non-destructive merging
    const marginMerge = mergeClassSpacing(classStack, classes, 'margin');
    const paddingMerge = mergeClassSpacing(classStack, classes, 'padding');

    // Convert to SpacingValues format
    const mergedMargin: SpacingValues = {
      top: String(marginMerge.values.top || '0'),
      right: String(marginMerge.values.right || '0'),
      bottom: String(marginMerge.values.bottom || '0'),
      left: String(marginMerge.values.left || '0'),
      unit: (marginMerge.values.unit as any) || 'px'
    };

    const mergedPadding: SpacingValues = {
      top: String(paddingMerge.values.top || '0'),
      right: String(paddingMerge.values.right || '0'),
      bottom: String(paddingMerge.values.bottom || '0'),
      left: String(paddingMerge.values.left || '0'),
      unit: (paddingMerge.values.unit as any) || 'px'
    };

    return { 
      margin: mergedMargin, 
      padding: mergedPadding,
      marginSources: marginMerge.sources,
      paddingSources: paddingMerge.sources
    };
  }, [classStack, classes]);

  // Use merged values for display, but fall back to value prop when no classes are applied
  const isCombined = type === 'combined' || (value && 'margin' in value && 'padding' in value);
  const defaultSpacing: SpacingValues = { top: '0', right: '0', bottom: '0', left: '0', unit: 'px' };
  
  // When no classes are in the stack, use the value prop directly instead of merged class values
  const hasClasses = classStack.length > 0;
  
  const currentValue: CombinedSpacingValues = isCombined 
    ? (hasClasses ? getMergedSpacingValues : (value as CombinedSpacingValues) || { margin: defaultSpacing, padding: defaultSpacing })
    : {
        margin: type === 'margin' 
          ? (hasClasses ? getMergedSpacingValues.margin : ((value as SpacingValues) || defaultSpacing))
          : defaultSpacing,
        padding: type === 'padding' 
          ? (hasClasses ? getMergedSpacingValues.padding : ((value as SpacingValues) || defaultSpacing))
          : defaultSpacing
      };

  const marginValue = currentValue.margin || defaultSpacing;
  const paddingValue = currentValue.padding || defaultSpacing;

  // Global drag handling - only update active class
  // SHIFT = update all four sides
  useEffect(() => {
    if (!dragState?.isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!dragState) return;

      e.preventDefault();
      e.stopPropagation();

      const deltaY = dragState.startY - e.clientY;
      const newValue = Math.max(0, dragState.startValue + Math.round(deltaY / 2));

      const [spacingType, side] = dragState.property.split(/(?=[A-Z])/);
      const isShift = e.shiftKey;

      // If we have an active class, update only that class
      if (activeClass) {
        const cls = classes.find((c) => c.name === activeClass);
        if (cls) {
          if (isShift) {
            // Update all four sides
            const newVal = `${newValue}${dragState.unit}`;
            const updatedStyles = {
              ...cls.styles,
              [`${spacingType}Top`]: newVal,
              [`${spacingType}Right`]: newVal,
              [`${spacingType}Bottom`]: newVal,
              [`${spacingType}Left`]: newVal,
            };
            const { updateClass } = useClassStore.getState();
            updateClass(cls.id, { styles: updatedStyles });
          } else {
            const propertyName = `${spacingType}${side.charAt(0).toUpperCase() + side.slice(1)}`;
            const updatedStyles = {
              ...cls.styles,
              [propertyName]: `${newValue}${dragState.unit}`,
            };
            const { updateClass } = useClassStore.getState();
            updateClass(cls.id, { styles: updatedStyles });
          }
        }
      } else {
        // No active class - fall back to component-level onChange
        const currentSpacing = spacingType === 'margin' ? marginValue : paddingValue;
        const sideKey = side.toLowerCase() as keyof Omit<SpacingValues, 'unit'>;

        let newSpacing;
        if (isShift) {
          newSpacing = {
            ...currentSpacing,
            top: `${newValue}`,
            right: `${newValue}`,
            bottom: `${newValue}`,
            left: `${newValue}`,
          };
        } else {
          newSpacing = {
            ...currentSpacing,
            [sideKey]: `${newValue}`,
          };
        }

        const newCombinedValue = {
          ...currentValue,
          [spacingType]: newSpacing,
        };

        if (isCombined) {
          onChange(newCombinedValue);
        } else {
          onChange(newSpacing);
        }
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragState(null);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleGlobalMouseMove, true);
    document.addEventListener('mouseup', handleGlobalMouseUp, true);

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove, true);
      document.removeEventListener('mouseup', handleGlobalMouseUp, true);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [dragState, activeClass, classes, currentValue, onChange, marginValue, paddingValue, isCombined]);

  // Get locked properties (locally edited on THIS component)
  const lockedProps = useMemo(() => {
    return componentProps?.__lockedProps || {};
  }, [componentProps?.__lockedProps]);

  // Check if a spacing property is locally edited
  const isPropertyLocked = (spacingType: 'margin' | 'padding', side: string): boolean => {
    const propertyName = `${spacingType}${side.charAt(0).toUpperCase() + side.slice(1)}`;
    return lockedProps[propertyName] === true;
  };

  // Get selected component ID
  const { selectedComponent } = useAppBuilderStore();

  // Key: If only 1 class applied, treat as "single class mode" - all properties show BLUE
  const isSingleClassMode = classStack.length === 1;

  // Get property state colors based on class ownership
  // COLOR RULES:
  // - BLUE: Single class mode OR original owner OR locally edited OR has non-zero default value
  // - YELLOW: Property inherited from a class applied from another element (only when multi-class)
  // - GRAY: Default/unset value (value equals component's default)
  const getPropertyColor = (spacingType: 'margin' | 'padding', side?: string, value?: string): string => {
    // Get the component's default value for this spacing property
    const getDefaultForSide = (spacingType: 'margin' | 'padding', side: string): string => {
      if (!defaultValue) return '0';
      const spacingDefaults = defaultValue[spacingType];
      if (!spacingDefaults) return '0';
      return String(spacingDefaults[side as keyof Omit<SpacingValues, 'unit'>] || '0');
    };

    const sideKey = side as 'top' | 'right' | 'bottom' | 'left';
    const componentDefault = side ? getDefaultForSide(spacingType, sideKey) : '0';
    
    // Check if value is the component's default (could be 0, could be 10, etc.)
    const isDefaultValue = !value || value === '' || value === componentDefault;
    
    // If value matches the component's default, show gray
    if (isDefaultValue && componentDefault === '0') {
      return '#999999';
    }
    
    // BLUE: Value matches a non-zero default (like button's 10px padding)
    if (value && value !== '0' && value === componentDefault) {
      return '#1677ff'; // Blue - component has non-zero default that's applied
    }

    // BLUE: Property was LOCALLY EDITED on THIS component (in __lockedProps)
    if (side && isPropertyLocked(spacingType, sideKey)) {
      return '#1677ff'; // Blue for locally edited on this component
    }

    // BLUE: Single class mode - only 1 class applied, show all properties as BLUE
    if (isSingleClassMode && value && value !== '0') {
      return '#1677ff'; // Blue - single class mode
    }

    // Use the spacing merger utility to find which class defines this property
    const definingClassName = getSpacingPropertySource(classStack, classes, spacingType, sideKey);

    if (definingClassName) {
      // Find the class object
      const definingClass = classes.find(c => c.name === definingClassName);
      
      // BLUE: This component is the ORIGINAL OWNER of the class (first in appliedTo)
      if (definingClass && definingClass.appliedTo[0] === selectedComponent) {
        return '#1677ff'; // Blue - this is where the class was created
      }
      
      // YELLOW: Property from class but this is NOT the original owner
      return '#d9a800'; // Yellow - inherited from another element
    }

    // GRAY: Default/unset value
    return '#999999';
  };

  const getSourceTooltip = (spacingType: 'margin' | 'padding', side?: string): string => {
    // Use the spacing merger utility to find which class defines this property
    const sideKey = side as 'top' | 'right' | 'bottom' | 'left';
    const definingClassName = getSpacingPropertySource(classStack, classes, spacingType, sideKey);

    if (!definingClassName) {
      return 'Default value';
    }

    const isActiveClass = definingClassName === primaryClassName;

    if (isActiveClass) {
      return `From .${definingClassName} (Active Class)`;
    } else {
      return `Inherited from .${definingClassName}`;
    }
  };

  const parseValue = (val: string): { num: number; unit: string } => {
    const match = val.match(/^(-?\d+(?:\.\d+)?)(px|rem|em|%)?$/);
    if (match) {
      return { num: parseFloat(match[1]), unit: match[2] || 'px' };
    }
    return { num: 0, unit: 'px' };
  };

  const handleMouseDown = (e: React.MouseEvent, property: string, currentValue: string) => {
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startTime = Date.now();
    let hasMoved = false;
    let dragInitiated = false;

    const { num, unit } = parseValue(currentValue);

    const handleInitialMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - startX);
      const deltaY = Math.abs(moveEvent.clientY - startY);

      if (deltaX > 0 || deltaY > 0) {
        hasMoved = true;
      }

      if (!dragInitiated && (deltaX > 5 || deltaY > 5)) {
        dragInitiated = true;

        document.removeEventListener('mousemove', handleInitialMouseMove);
        document.removeEventListener('mouseup', handleInitialMouseUp);

        setDragState({
          isDragging: true,
          property,
          startY: moveEvent.clientY,
          startValue: num,
          unit,
        });
      }
    };

    const handleInitialMouseUp = () => {
      const endTime = Date.now();
      const timeDiff = endTime - startTime;

      // Defer opening to the next tick so the click that opened it isn't treated as an outside interaction.
      if (!dragInitiated && timeDiff < 300 && !hasMoved) {
        window.setTimeout(() => {
          setEditingProperty({
            property,
            value: num.toString(),
            unit,
          });
        }, 0);
      }

      document.removeEventListener('mousemove', handleInitialMouseMove);
      document.removeEventListener('mouseup', handleInitialMouseUp);
    };

    document.addEventListener('mousemove', handleInitialMouseMove);
    document.addEventListener('mouseup', handleInitialMouseUp);
  };

  const handlePopoverValueChange = (val: string) => {
    if (editingProperty) {
      setEditingProperty({ ...editingProperty, value: val });
    }
  };

  const handlePopoverUnitChange = (unit: string) => {
    if (editingProperty) {
      setEditingProperty({ ...editingProperty, unit });
    }
  };

  const handlePopoverClose = (applyChanges: boolean = true) => {
    if (editingProperty && applyChanges) {
      const [spacingType, side] = editingProperty.property.split(/(?=[A-Z])/);
      const sideKey = side.toLowerCase() as keyof Omit<SpacingValues, 'unit'>;

      const raw = editingProperty.value.trim();
      const wantsAuto = raw.toLowerCase() === 'auto' || editingProperty.unit === 'auto';
      const applyAllSides = isShiftPressed;

      const finalValue = wantsAuto
        ? 'auto'
        : (() => {
            const numeric = raw === '' ? 0 : Number(raw);
            return Number.isFinite(numeric) ? String(numeric) : '0';
          })();

      // If we have an active class, update only that class in the store
      if (activeClass) {
        const cls = classes.find((c) => c.name === activeClass);
        if (cls) {
          const { updateClass } = useClassStore.getState();

          if (applyAllSides) {
            const updatedStyles = {
              ...cls.styles,
              [`${spacingType}Top`]: wantsAuto ? 'auto' : finalValue + editingProperty.unit,
              [`${spacingType}Right`]: wantsAuto ? 'auto' : finalValue + editingProperty.unit,
              [`${spacingType}Bottom`]: wantsAuto ? 'auto' : finalValue + editingProperty.unit,
              [`${spacingType}Left`]: wantsAuto ? 'auto' : finalValue + editingProperty.unit,
            };
            updateClass(cls.id, { styles: updatedStyles });
          } else {
            const propertyName = `${spacingType}${side.charAt(0).toUpperCase() + side.slice(1)}`;
            const updatedStyles = {
              ...cls.styles,
              [propertyName]: wantsAuto ? 'auto' : finalValue + editingProperty.unit,
            };
            updateClass(cls.id, { styles: updatedStyles });
          }
        }
      } else {
        // No active class - fall back to component-level onChange
        const currentSpacing = spacingType === 'margin' ? marginValue : paddingValue;
        const unit = (wantsAuto ? 'auto' : editingProperty.unit) as SpacingValues['unit'];

        const newSpacing = applyAllSides
          ? {
              ...currentSpacing,
              top: finalValue,
              right: finalValue,
              bottom: finalValue,
              left: finalValue,
              unit,
            }
          : {
              ...currentSpacing,
              [sideKey]: finalValue,
              unit,
            };

        const newCombinedValue = {
          ...currentValue,
          [spacingType]: newSpacing,
        };

        if (isCombined) {
          onChange(newCombinedValue);
        } else {
          onChange(newSpacing);
        }
      }
    }
    setEditingProperty(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && editingProperty) {
      handlePopoverClose(true);
    } else if (e.key === 'Escape') {
      setEditingProperty(null);
    }
  };

  const getPropertyLabel = (property: string): string => {
    const labels: Record<string, string> = {
      marginTop: 'Margin Top',
      marginRight: 'Margin Right',
      marginBottom: 'Margin Bottom',
      marginLeft: 'Margin Left',
      paddingTop: 'Padding Top',
      paddingRight: 'Padding Right',
      paddingBottom: 'Padding Bottom',
      paddingLeft: 'Padding Left',
    };
    return labels[property] || property;
  };

  const renderSpacingInput = (property: string, val: string) => {
    const isOpen = editingProperty?.property === property;
    const isDragging = dragState?.property === property && dragState?.isDragging;
    const isHovered = hoveredProperty === property;
    const propertyState = getPropertyColor(
      property.includes('margin') ? 'margin' : 'padding',
      property.replace(/margin|padding/i, '').toLowerCase(),
      val,
    );
    const tooltip = getSourceTooltip(
      property.includes('margin') ? 'margin' : 'padding',
      property.replace(/margin|padding/i, '').toLowerCase(),
    );

    return (
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) handlePopoverClose(true);
        }}
      >
        <PopoverTrigger asChild>
          <div
            onMouseEnter={() => !dragState?.isDragging && setHoveredProperty(property)}
            onMouseLeave={() => setHoveredProperty(null)}
            onMouseDown={(e) => handleMouseDown(e, property, val)}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              display: 'inline-block',
              cursor: isDragging ? 'ns-resize' : 'pointer',
              position: 'relative',
            }}
          >
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    style={{
                      padding: '2px 6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: propertyState,
                      userSelect: 'none',
                      minWidth: '28px',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                      textDecoration: isHovered && !isDragging && !isOpen ? 'underline' : 'none',
                      backgroundColor: isDragging
                        ? `${propertyState}15`
                        : isHovered && !isOpen
                          ? `${propertyState}0a`
                          : 'transparent',
                      borderRadius: '3px',
                    }}
                  >
                    {val || '0'}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  <div className="font-medium">{getPropertyLabel(property)}</div>
                  <div className="text-muted-foreground">{tooltip}</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="w-64 p-4 bg-popover z-50"
          align="start"
          side="right"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={() => handlePopoverClose(false)}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{getPropertyLabel(property)}</Label>
              {isShiftPressed && (
                <span className="text-xs text-muted-foreground">All sides</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                value={editingProperty?.value ?? ''}
                onChange={(e) => handlePopoverValueChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
                autoFocus
                placeholder="0"
              />
              <Select value={editingProperty?.unit || 'px'} onValueChange={handlePopoverUnitChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="px">px</SelectItem>
                  <SelectItem value="rem">rem</SelectItem>
                  <SelectItem value="em">em</SelectItem>
                  <SelectItem value="%">%</SelectItem>
                  <SelectItem value="auto">auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Hold Shift to change all {property.includes('margin') ? 'margins' : 'paddings'}
            </p>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const handleCenterAuto = () => {
    // set margin-left/right to auto (works for centering fixed-width elements)
    if (activeClass) {
      const cls = classes.find((c) => c.name === activeClass);
      if (cls) {
        const updatedStyles = {
          ...cls.styles,
          marginLeft: 'auto',
          marginRight: 'auto',
        };
        const { updateClass } = useClassStore.getState();
        updateClass(cls.id, { styles: updatedStyles });
      }
      return;
    }

    if (isCombined) {
      onChange({
        ...currentValue,
        margin: {
          ...marginValue,
          left: 'auto',
          right: 'auto',
        },
      });
    }
  };

  if (!isCombined) {
    // For single spacing type, simplified version
    const spacing = type === 'margin' ? marginValue : paddingValue;
    const ringType = type!;
    
    return (
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        <TooltipProvider delayDuration={300}>
          <div className="relative w-full" style={{ padding: '8px' }}>
            {/* SVG Container with preserved aspect ratio */}
            <div className="relative w-full" style={{ paddingBottom: '52.31%' /* 113/216 aspect ratio */ }}>
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 216 113"
                preserveAspectRatio="xMidYMid meet"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <mask id={`mask0_${ringType}`} style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x="0" y="0" width="216" height="112">
                  <path d="M212.998 0.710083H3.01156C1.63094 0.710083 0.511719 1.8293 0.511719 3.20993V109.203C0.511719 110.584 1.63094 111.703 3.01156 111.703H212.998C214.379 111.703 215.498 110.584 215.498 109.203V3.20993C215.498 1.8293 214.379 0.710083 212.998 0.710083Z" fill="white"/>
                </mask>
                <g mask={`url(#mask0_${ringType})`}>
                  <path d="M215.998 0.210083H0.0117188L81.5066 56.2066H134.503L215.998 0.210083Z" className="fill-muted/50"/>
                  <path d="M215.999 112.203L134.504 56.2066L215.999 0.210083V112.203Z" className="fill-muted/30"/>
                  <path d="M215.998 112.203H0.0117188L81.5066 56.2065H134.503L215.998 112.203Z" className="fill-muted/50"/>
                  <path d="M0.0117188 0.210083L81.5066 56.2066L0.0117188 112.203V0.210083Z" className="fill-muted/30"/>
                </g>
                <path d="M212.998 0.710083H3.01156C1.63094 0.710083 0.511719 1.8293 0.511719 3.20993V109.203C0.511719 110.584 1.63094 111.703 3.01156 111.703H212.998C214.379 111.703 215.498 110.584 215.498 109.203V3.20993C215.498 1.8293 214.379 0.710083 212.998 0.710083Z" className="stroke-border" strokeWidth="0.999937"/>
                <path d="M138.002 53.7068H78.0058C77.7297 53.7068 77.5059 53.9306 77.5059 54.2068V58.2065C77.5059 58.4826 77.7297 58.7065 78.0058 58.7065H138.002C138.278 58.7065 138.502 58.4826 138.502 58.2065V54.2068C138.502 53.9306 138.278 53.7068 138.002 53.7068Z" className="fill-muted/40 stroke-border" strokeWidth="0.999937"/>
              </svg>

              {/* Interactive spacing values - positioned with percentages */}
              <div className="absolute inset-0">
                <div className="absolute" style={{ top: '7%', left: '50%', transform: 'translateX(-50%)' }}>
                  {renderSpacingInput(`${ringType}Top`, spacing.top)}
                </div>
                <div className="absolute" style={{ top: '50%', right: '4%', transform: 'translateY(-50%)' }}>
                  {renderSpacingInput(`${ringType}Right`, spacing.right)}
                </div>
                <div className="absolute" style={{ bottom: '7%', left: '50%', transform: 'translateX(-50%)' }}>
                  {renderSpacingInput(`${ringType}Bottom`, spacing.bottom)}
                </div>
                <div className="absolute" style={{ top: '50%', left: '4%', transform: 'translateY(-50%)' }}>
                  {renderSpacingInput(`${ringType}Left`, spacing.left)}
                </div>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </div>
    );
  }

  // Combined margin + padding view
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={handleCenterAuto}
          title="Center (margin-left/right: auto)"
        >
          <AlignCenterHorizontal className="h-3.5 w-3.5" />
          Auto
        </Button>
      </div>
      
      <TooltipProvider delayDuration={300}>
        <div className="relative w-full" style={{ padding: '8px' }}>
          {/* SVG Container with preserved aspect ratio */}
          <div className="relative w-full" style={{ paddingBottom: '52.31%' /* 113/216 aspect ratio */ }}>
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 216 113"
              preserveAspectRatio="xMidYMid meet"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <mask id="mask0_716_4155" style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x="0" y="0" width="216" height="112">
                <path d="M212.998 0.710083H3.01156C1.63094 0.710083 0.511719 1.8293 0.511719 3.20993V109.203C0.511719 110.584 1.63094 111.703 3.01156 111.703H212.998C214.379 111.703 215.498 110.584 215.498 109.203V3.20993C215.498 1.8293 214.379 0.710083 212.998 0.710083Z" fill="white"/>
              </mask>
              <g mask="url(#mask0_716_4155)">
                <path d="M215.998 0.210083H0.0117188L81.5066 56.2066H134.503L215.998 0.210083Z" className="fill-muted/50"/>
                <path d="M215.999 112.203L134.504 56.2066L215.999 0.210083V112.203Z" className="fill-muted/30"/>
                <path d="M215.998 112.203H0.0117188L81.5066 56.2065H134.503L215.998 112.203Z" className="fill-muted/50"/>
                <path d="M0.0117188 0.210083L81.5066 56.2066L0.0117188 112.203V0.210083Z" className="fill-muted/30"/>
              </g>
              <path d="M212.998 0.710083H3.01156C1.63094 0.710083 0.511719 1.8293 0.511719 3.20993V109.203C0.511719 110.584 1.63094 111.703 3.01156 111.703H212.998C214.379 111.703 215.498 110.584 215.498 109.203V3.20993C215.498 1.8293 214.379 0.710083 212.998 0.710083Z" className="stroke-border" strokeWidth="0.999937"/>
              <path d="M176.001 25.7085H40.0096C38.629 25.7085 37.5098 26.8277 37.5098 28.2083V84.2048C37.5098 85.5855 38.629 86.7047 40.0096 86.7047H176.001C177.382 86.7047 178.501 85.5855 178.501 84.2048V28.2083C178.501 26.8277 177.382 25.7085 176.001 25.7085Z" className="fill-muted/40 stroke-border" strokeWidth="0.999937"/>
              <mask id="mask1_716_4155" style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x="40" y="28" width="136" height="56">
                <path d="M175.001 28.7083H41.0097C40.7336 28.7083 40.5098 28.9321 40.5098 29.2082V83.2048C40.5098 83.481 40.7336 83.7048 41.0097 83.7048H175.001C175.277 83.7048 175.501 83.481 175.501 83.2048V29.2082C175.501 28.9321 175.277 28.7083 175.001 28.7083Z" fill="white"/>
              </mask>
              <g mask="url(#mask1_716_4155)">
                <path d="M215.998 0.210083H0.0117188L81.5066 56.2066H134.503L215.998 0.210083Z" className="fill-muted/50"/>
                <path d="M215.999 112.203L134.504 56.2066L215.999 0.210083V112.203Z" className="fill-muted/30"/>
                <path d="M215.998 112.203H0.0117188L81.5066 56.2065H134.503L215.998 112.203Z" className="fill-muted/50"/>
                <path d="M0.0117188 0.210083L81.5066 56.2066L0.0117188 112.203V0.210083Z" className="fill-muted/30"/>
              </g>
              <path d="M175.001 28.7083H41.0097C40.7336 28.7083 40.5098 28.9321 40.5098 29.2082V83.2048C40.5098 83.481 40.7336 83.7048 41.0097 83.7048H175.001C175.277 83.7048 175.501 83.481 175.501 83.2048V29.2082C175.501 28.9321 175.277 28.7083 175.001 28.7083Z" className="stroke-border" strokeWidth="0.999937"/>
              <path d="M138.002 53.7068H78.0058C77.7297 53.7068 77.5059 53.9306 77.5059 54.2068V58.2065C77.5059 58.4826 77.7297 58.7065 78.0058 58.7065H138.002C138.278 58.7065 138.502 58.4826 138.502 58.2065V54.2068C138.502 53.9306 138.278 53.7068 138.002 53.7068Z" className="fill-muted/40 stroke-border" strokeWidth="0.999937"/>
            </svg>

            {/* Interactive spacing values - positioned with percentages matching SVG coordinates */}
            <div className="absolute inset-0">
              {/* Margin Top - centered at ~4% from top */}
              <div className="absolute" style={{ top: '6%', left: '50%', transform: 'translateX(-50%)' }}>
                {renderSpacingInput('marginTop', marginValue.top)}
              </div>

              {/* Margin Right - at ~41% height and ~96% from left */}
              <div className="absolute" style={{ top: '50%', right: '4%', transform: 'translateY(-50%)' }}>
                {renderSpacingInput('marginRight', marginValue.right)}
              </div>

              {/* Margin Bottom - centered at ~96% from top */}
              <div className="absolute" style={{ bottom: '6%', left: '50%', transform: 'translateX(-50%)' }}>
                {renderSpacingInput('marginBottom', marginValue.bottom)}
              </div>

              {/* Margin Left - at ~41% height and ~4% from left */}
              <div className="absolute" style={{ top: '50%', left: '4%', transform: 'translateY(-50%)' }}>
                {renderSpacingInput('marginLeft', marginValue.left)}
              </div>

              {/* Padding Top - centered at ~28% from top */}
              <div className="absolute" style={{ top: '28%', left: '50%', transform: 'translateX(-50%)' }}>
                {renderSpacingInput('paddingTop', paddingValue.top)}
              </div>

              {/* Padding Right - at ~41% height and ~80% from left */}
              <div className="absolute" style={{ top: '50%', right: '20%', transform: 'translateY(-50%)' }}>
                {renderSpacingInput('paddingRight', paddingValue.right)}
              </div>

              {/* Padding Bottom - centered at ~72% from top */}
              <div className="absolute" style={{ bottom: '28%', left: '50%', transform: 'translateX(-50%)' }}>
                {renderSpacingInput('paddingBottom', paddingValue.bottom)}
              </div>

              {/* Padding Left - at ~41% height and ~20% from left */}
              <div className="absolute" style={{ top: '50%', left: '20%', transform: 'translateY(-50%)' }}>
                {renderSpacingInput('paddingLeft', paddingValue.left)}
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
