import React, { useState, useRef, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link2, Link2Off, AlignCenterHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClassPropertyTracking } from "@/hooks/useClassPropertyTracking";
import { useClassStore } from "@/stores/classStore";
import { useAppBuilderStore } from "@/stores/appBuilderStore";
import { Button } from "@/components/ui/button";

interface SpacingValues {
  top: string;
  right: string;
  bottom: string;
  left: string;
  unit: "px" | "rem" | "em" | "%";
}

interface CombinedSpacingValues {
  margin: SpacingValues;
  padding: SpacingValues;
}

interface SvgSpacingEditorProps {
  label?: string;
  value: CombinedSpacingValues;
  onChange: (value: CombinedSpacingValues) => void;
  componentProps?: Record<string, any>;
}

const units = [
  { label: "PX", value: "px" },
  { label: "EM", value: "em" },
  { label: "REM", value: "rem" },
  { label: "%", value: "%" },
];

export function SvgSpacingEditor({ label, value, onChange, componentProps }: SvgSpacingEditorProps) {
  console.log("🎨 SvgSpacingEditor rendering - SVG style");
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null);
  const [isMarginLinked, setIsMarginLinked] = useState(false);
  const [isPaddingLinked, setIsPaddingLinked] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    property: string;
    startY: number;
    startValue: number;
    unit: string;
  } | null>(null);
  const [editingProperty, setEditingProperty] = useState<{
    property: string;
    value: string;
    unit: string;
  } | null>(null);

  const { isFromExternalClass, getPropertySource } = useClassPropertyTracking(componentProps);
  const { classes } = useClassStore();
  const { selectedComponent } = useAppBuilderStore();

  const defaultSpacing: SpacingValues = { top: "0", right: "0", bottom: "0", left: "0", unit: "px" };
  const marginValue = value.margin || defaultSpacing;
  const paddingValue = value.padding || defaultSpacing;
  
  // Get locked properties (locally edited on THIS component)
  const lockedProps = useMemo(() => {
    return componentProps?.__lockedProps || {};
  }, [componentProps?.__lockedProps]);

  // Get class stack for determining single class mode
  const classStack = useMemo(() => {
    return (componentProps?.appliedClasses as string[]) || [];
  }, [componentProps?.appliedClasses]);

  // Key: If only 1 class applied, treat as "single class mode" - all properties show BLUE
  const isSingleClassMode = classStack.length === 1;

  // Check if this component is the ORIGINAL OWNER of the active class
  const isOriginalOwner = useMemo(() => {
    const activeClassName = componentProps?.activeClass || 
      (classStack.length > 0 ? classStack[classStack.length - 1] : null);
    
    if (!activeClassName || !selectedComponent) return false;
    const activeClass = classes.find(c => c.name === activeClassName);
    return activeClass?.appliedTo?.[0] === selectedComponent;
  }, [componentProps?.activeClass, classStack, selectedComponent, classes]);

  // Check if a spacing property is locally edited (in __lockedProps)
  const isPropertyLocked = (spacingType: "margin" | "padding", side: string): boolean => {
    const propertyName = `${spacingType}${side.charAt(0).toUpperCase() + side.slice(1)}`;
    return lockedProps[propertyName] === true;
  };

  // Handle Shift key for linking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Global drag handling
  useEffect(() => {
    if (!dragState?.isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!dragState) return;

      e.preventDefault();
      e.stopPropagation();

      const deltaY = dragState.startY - e.clientY;
      const newValue = Math.max(0, dragState.startValue + Math.round(deltaY));

      const isMargin = dragState.property.includes("margin");
      const shouldLinkAll = (isMargin && isMarginLinked) || (!isMargin && isPaddingLinked) || e.shiftKey;

      if (shouldLinkAll) {
        const spacingType = isMargin ? "margin" : "padding";
        const newSpacing = {
          top: `${newValue}`,
          right: `${newValue}`,
          bottom: `${newValue}`,
          left: `${newValue}`,
          unit: dragState.unit as any,
        };

        onChange({
          ...value,
          [spacingType]: newSpacing,
        });
      } else {
        const [spacingType, side] = dragState.property.split(/(?=[A-Z])/);
        const currentSpacing = spacingType === "margin" ? marginValue : paddingValue;
        const sideKey = side.toLowerCase() as keyof Omit<SpacingValues, "unit">;

        onChange({
          ...value,
          [spacingType]: {
            ...currentSpacing,
            [sideKey]: `${newValue}`,
          },
        });
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragState(null);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    document.addEventListener("mousemove", handleGlobalMouseMove, true);
    document.addEventListener("mouseup", handleGlobalMouseUp, true);

    document.body.style.userSelect = "none";
    document.body.style.cursor = "ns-resize";

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove, true);
      document.removeEventListener("mouseup", handleGlobalMouseUp, true);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [dragState, value, onChange, marginValue, paddingValue, isMarginLinked, isPaddingLinked]);

  // Get property state colors based on class hierarchy
  // BLUE = locally edited OR single class mode OR original owner of class
  // YELLOW = inherited from external class (only when multiple classes)
  // GRAY = default/no class
  const getPropertyColor = (spacingType: "margin" | "padding", side?: string): string => {
    const mainProp = spacingType;
    const sideProp = side ? `${spacingType}${side.charAt(0).toUpperCase() + side.slice(1)}` : null;
    
    // Get the current value to check if it's non-default
    const currentSpacing = spacingType === "margin" ? marginValue : paddingValue;
    const sideValue = side ? currentSpacing[side as keyof typeof currentSpacing] : null;
    const isDefaultValue = !sideValue || sideValue === "0" || sideValue === "";
    
    // If value is default/unset, always show gray
    if (isDefaultValue) {
      return "#888888";
    }

    // BLUE: Property was LOCALLY EDITED on this component (in __lockedProps)
    if (side && isPropertyLocked(spacingType, side)) {
      return "#1677ff"; // Blue - locally edited
    }
    
    // BLUE: Single class mode - only 1 class applied, show all properties as BLUE
    if (isSingleClassMode) {
      return "#1677ff"; // Blue - single class mode
    }
    
    // BLUE: This component is the ORIGINAL OWNER of the active class
    if (isOriginalOwner) {
      const source = getPropertySource(mainProp) || (sideProp ? getPropertySource(sideProp) : null);
      if (source && source.source === "class") {
        return "#1677ff"; // Blue - original owner of the class
      }
    }

    const source = getPropertySource(mainProp) || (sideProp ? getPropertySource(sideProp) : null);

    if (!source || source.source !== "class") {
      return "#888888";
    }

    // YELLOW: Property from external/inherited class (not original owner)
    return "#d9a800";
  };

  const isPropertyEditable = (spacingType: "margin" | "padding", side?: string): boolean => {
    const mainProp = spacingType;
    const sideProp = side ? `${spacingType}${side.charAt(0).toUpperCase() + side.slice(1)}` : null;

    const isMainExternal = isFromExternalClass(mainProp);
    const isSideExternal = sideProp ? isFromExternalClass(sideProp) : false;

    return !isMainExternal && !isSideExternal;
  };

  const getSourceTooltip = (spacingType: "margin" | "padding", side?: string): string => {
    const mainProp = spacingType;
    const sideProp = side ? `${spacingType}${side.charAt(0).toUpperCase() + side.slice(1)}` : null;

    // Check if locally edited
    if (side && isPropertyLocked(spacingType, side)) {
      const appliedClasses: string[] = (componentProps?.appliedClasses as string[]) || [];
      const activeClassName = componentProps?.activeClass || 
        (appliedClasses.length > 0 ? appliedClasses[appliedClasses.length - 1] : null);
      return activeClassName ? `Edited in .${activeClassName}` : "Locally edited";
    }

    const source = getPropertySource(mainProp) || (sideProp ? getPropertySource(sideProp) : null);

    if (!source || source.source !== "class") {
      return "Manual property";
    }

    // If original owner, show as owner
    if (isOriginalOwner) {
      return `From .${source.className} (owner)`;
    }

    return `Inherited from .${source.className}`;
  };

  const parseValue = (val: string): { num: number; unit: string } => {
    const match = val.match(/^(-?\d+(?:\.\d+)?)(px|rem|em|%)?$/);
    if (match) {
      return { num: parseFloat(match[1]), unit: match[2] || "px" };
    }
    return { num: 0, unit: "px" };
  };

  const handleMouseDown = (e: React.MouseEvent, property: string, currentValue: string) => {
    if (e.button !== 0) return;
    if (
      !isPropertyEditable(
        property
          .replace(/([A-Z])/g, " $1")
          .trim()
          .split(" ")[0] as any,
        property
          .replace(/([A-Z])/g, " $1")
          .trim()
          .split(" ")[1]
          ?.toLowerCase() as any,
      )
    )
      return;

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

        document.removeEventListener("mousemove", handleInitialMouseMove);
        document.removeEventListener("mouseup", handleInitialMouseUp);

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

      if (!dragInitiated && timeDiff < 300 && !hasMoved) {
        setEditingProperty({
          property,
          value: num.toString(),
          unit,
        });
      }

      document.removeEventListener("mousemove", handleInitialMouseMove);
      document.removeEventListener("mouseup", handleInitialMouseUp);
    };

    document.addEventListener("mousemove", handleInitialMouseMove);
    document.addEventListener("mouseup", handleInitialMouseUp);
  };

  const handlePopoverValueChange = (val: string) => {
    if (editingProperty) {
      // Allow empty string during editing
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
      const isMargin = editingProperty.property.includes("margin");
      const shouldLinkAll = (isMargin && isMarginLinked) || (!isMargin && isPaddingLinked) || isShiftPressed;

      if (shouldLinkAll) {
        const spacingType = isMargin ? "margin" : "padding";
        const newSpacing = {
          top: editingProperty.value,
          right: editingProperty.value,
          bottom: editingProperty.value,
          left: editingProperty.value,
          unit: editingProperty.unit as any,
        };

        onChange({
          ...value,
          [spacingType]: newSpacing,
        });
      } else {
        const [spacingType, side] = editingProperty.property.split(/(?=[A-Z])/);
        const currentSpacing = spacingType === "margin" ? marginValue : paddingValue;
        const sideKey = side.toLowerCase() as keyof Omit<SpacingValues, "unit">;

        onChange({
          ...value,
          [spacingType]: {
            ...currentSpacing,
            [sideKey]: editingProperty.value,
          },
        });
      }
    }
    setEditingProperty(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && editingProperty) {
      handlePopoverClose(true);
    } else if (e.key === "Escape") {
      setEditingProperty(null);
    }
  };

  const getPropertyLabel = (property: string): string => {
    const labels: Record<string, string> = {
      marginTop: "Margin Top",
      marginRight: "Margin Right",
      marginBottom: "Margin Bottom",
      marginLeft: "Margin Left",
      paddingTop: "Padding Top",
      paddingRight: "Padding Right",
      paddingBottom: "Padding Bottom",
      paddingLeft: "Padding Left",
    };
    return labels[property] || property;
  };

  const renderSpacingInput = (property: string, val: string) => {
    const isOpen = editingProperty?.property === property;
    const isDragging = dragState?.property === property && dragState?.isDragging;
    const isHovered = hoveredProperty === property;
    const propertyState = getPropertyColor(
      property.includes("margin") ? "margin" : "padding",
      property.replace(/margin|padding/i, "").toLowerCase(),
    );
    const tooltip = getSourceTooltip(
      property.includes("margin") ? "margin" : "padding",
      property.replace(/margin|padding/i, "").toLowerCase(),
    );

    return (
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handlePopoverClose(true);
          }
        }}
      >
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <div
                  onMouseEnter={() => !dragState?.isDragging && setHoveredProperty(property)}
                  onMouseLeave={() => setHoveredProperty(null)}
                  onMouseDown={(e) => handleMouseDown(e, property, val)}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{
                    display: "inline-block",
                    cursor: isDragging ? "ns-resize" : "pointer",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      padding: "2px 6px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: propertyState,
                      userSelect: "none",
                      minWidth: "28px",
                      textAlign: "center",
                      transition: "all 0.15s ease",
                      textDecoration: isHovered && !isDragging && !isOpen ? "underline" : "none",
                      backgroundColor: isDragging
                        ? `${propertyState}15`
                        : isHovered && !isOpen
                          ? `${propertyState}0a`
                          : "transparent",
                      borderRadius: "3px",
                    }}
                  >
                    {val || "0"}
                  </div>
                </div>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              <div className="font-medium">{getPropertyLabel(property)}</div>
              <div className="text-muted-foreground">{tooltip}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <PopoverContent
          className="w-64 p-4"
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
              {(isShiftPressed || (property.includes("margin") ? isMarginLinked : isPaddingLinked)) && (
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
              <Select value={editingProperty?.unit || "px"} onValueChange={handlePopoverUnitChange}>
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
            {!isMarginLinked && !isPaddingLinked && (
              <p className="text-xs text-muted-foreground">
                Hold Shift to change all {property.includes("margin") ? "margins" : "paddings"}
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // Handle center auto (margin: 0 auto)
  const handleCenterAuto = () => {
    onChange({
      ...value,
      margin: {
        ...marginValue,
        left: 'auto',
        right: 'auto',
      },
    });
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative w-full" style={{ padding: "8px" }}>
        {/* Center Auto Button */}
        <div className="flex justify-end mb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={handleCenterAuto}
              >
                <AlignCenterHorizontal className="h-3.5 w-3.5" />
                Auto
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Center horizontally (margin: auto)</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        {/* SVG Container with preserved aspect ratio */}
        <div className="relative w-full" style={{ paddingBottom: "52.31%" /* 113/216 aspect ratio */ }}>
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 216 113"
            preserveAspectRatio="xMidYMid meet"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <mask id="mask0_716_4155" style={{ maskType: "luminance" }} maskUnits="userSpaceOnUse" x="0" y="0" width="216" height="112">
              <path d="M212.998 0.710083H3.01156C1.63094 0.710083 0.511719 1.8293 0.511719 3.20993V109.203C0.511719 110.584 1.63094 111.703 3.01156 111.703H212.998C214.379 111.703 215.498 110.584 215.498 109.203V3.20993C215.498 1.8293 214.379 0.710083 212.998 0.710083Z" fill="white"/>
            </mask>
            <g mask="url(#mask0_716_4155)">
              <path d="M215.998 0.210083H0.0117188L81.5066 56.2066H134.503L215.998 0.210083Z" fill="#F8F8F8"/>
              <path d="M215.999 112.203L134.504 56.2066L215.999 0.210083V112.203Z" fill="#F1F3F5"/>
              <path d="M215.998 112.203H0.0117188L81.5066 56.2065H134.503L215.998 112.203Z" fill="#F8F8F8"/>
              <path d="M0.0117188 0.210083L81.5066 56.2066L0.0117188 112.203V0.210083Z" fill="#F1F3F5"/>
            </g>
            <path d="M212.998 0.710083H3.01156C1.63094 0.710083 0.511719 1.8293 0.511719 3.20993V109.203C0.511719 110.584 1.63094 111.703 3.01156 111.703H212.998C214.379 111.703 215.498 110.584 215.498 109.203V3.20993C215.498 1.8293 214.379 0.710083 212.998 0.710083Z" stroke="#E6E6E6" strokeWidth="0.999937"/>
            <path d="M176.001 25.7085H40.0096C38.629 25.7085 37.5098 26.8277 37.5098 28.2083V84.2048C37.5098 85.5855 38.629 86.7047 40.0096 86.7047H176.001C177.382 86.7047 178.501 85.5855 178.501 84.2048V28.2083C178.501 26.8277 177.382 25.7085 176.001 25.7085Z" fill="#F5F5F5" stroke="#E6E6E6" strokeWidth="0.999937"/>
            <mask id="mask1_716_4155" style={{ maskType: "luminance" }} maskUnits="userSpaceOnUse" x="40" y="28" width="136" height="56">
              <path d="M175.001 28.7083H41.0097C40.7336 28.7083 40.5098 28.9321 40.5098 29.2082V83.2048C40.5098 83.481 40.7336 83.7048 41.0097 83.7048H175.001C175.277 83.7048 175.501 83.481 175.501 83.2048V29.2082C175.501 28.9321 175.277 28.7083 175.001 28.7083Z" fill="white"/>
            </mask>
            <g mask="url(#mask1_716_4155)">
              <path d="M215.998 0.210083H0.0117188L81.5066 56.2066H134.503L215.998 0.210083Z" fill="#F8F8F8"/>
              <path d="M215.999 112.203L134.504 56.2066L215.999 0.210083V112.203Z" fill="#F1F3F5"/>
              <path d="M215.998 112.203H0.0117188L81.5066 56.2065H134.503L215.998 112.203Z" fill="#F8F8F8"/>
              <path d="M0.0117188 0.210083L81.5066 56.2066L0.0117188 112.203V0.210083Z" fill="#F1F3F5"/>
            </g>
            <path d="M175.001 28.7083H41.0097C40.7336 28.7083 40.5098 28.9321 40.5098 29.2082V83.2048C40.5098 83.481 40.7336 83.7048 41.0097 83.7048H175.001C175.277 83.7048 175.501 83.481 175.501 83.2048V29.2082C175.501 28.9321 175.277 28.7083 175.001 28.7083Z" stroke="#E6E6E6" strokeWidth="0.999937"/>
            <path d="M138.002 53.7068H78.0058C77.7297 53.7068 77.5059 53.9306 77.5059 54.2068V58.2065C77.5059 58.4826 77.7297 58.7065 78.0058 58.7065H138.002C138.278 58.7065 138.502 58.4826 138.502 58.2065V54.2068C138.502 53.9306 138.278 53.7068 138.002 53.7068Z" fill="#F5F5F5" stroke="#E6E6E6" strokeWidth="0.999937"/>
          </svg>

          {/* Interactive spacing values - positioned with percentages matching SVG coordinates */}
          <div className="absolute inset-0">
            {/* Margin Top - centered at ~7% from top */}
            <div className="absolute" style={{ top: "7%", left: "50%", transform: "translateX(-50%)" }}>
              {renderSpacingInput("marginTop", marginValue.top)}
            </div>

            {/* Margin Right - at ~50% height and ~96% from left */}
            <div className="absolute" style={{ top: "50%", right: "4%", transform: "translateY(-50%)" }}>
              {renderSpacingInput("marginRight", marginValue.right)}
            </div>

            {/* Margin Bottom - centered at ~93% from top */}
            <div className="absolute" style={{ bottom: "7%", left: "50%", transform: "translateX(-50%)" }}>
              {renderSpacingInput("marginBottom", marginValue.bottom)}
            </div>

            {/* Margin Left - at ~50% height and ~4% from left */}
            <div className="absolute" style={{ top: "50%", left: "4%", transform: "translateY(-50%)" }}>
              {renderSpacingInput("marginLeft", marginValue.left)}
            </div>

            {/* Padding Top - centered at ~28% from top */}
            <div className="absolute" style={{ top: "28%", left: "50%", transform: "translateX(-50%)" }}>
              {renderSpacingInput("paddingTop", paddingValue.top)}
            </div>

            {/* Padding Right - at ~50% height and ~85% from left */}
            <div className="absolute" style={{ top: "50%", right: "15%", transform: "translateY(-50%)" }}>
              {renderSpacingInput("paddingRight", paddingValue.right)}
            </div>

            {/* Padding Bottom - centered at ~72% from top */}
            <div className="absolute" style={{ bottom: "28%", left: "50%", transform: "translateX(-50%)" }}>
              {renderSpacingInput("paddingBottom", paddingValue.bottom)}
            </div>

            {/* Padding Left - at ~50% height and ~15% from left */}
            <div className="absolute" style={{ top: "50%", left: "15%", transform: "translateY(-50%)" }}>
              {renderSpacingInput("paddingLeft", paddingValue.left)}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
