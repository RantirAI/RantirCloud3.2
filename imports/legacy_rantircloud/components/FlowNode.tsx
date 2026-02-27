
import React, { memo, useCallback } from "react";
import { Handle, Position } from "@xyflow/react";
import { NodeData } from "@/types/flowTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Settings,
  Terminal,
  BookOpen,
  Globe,
  ClipboardCheck,
  Database,
  Plus,
  Trash2,
  Power,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


// Make sure to export this component properly
export const NodeActionBadge = ({ actionType }: { actionType?: string }) => {
  const getActionIcon = (type?: string) => {
    const commonClasses = "h-3 w-3";
    switch(type) {
      case 'system': return <Terminal className={commonClasses} />;
      case 'input': return <BookOpen className={commonClasses} />;
      case 'output': return <MessageSquare className={commonClasses} />;
      case 'action': return <Database className={commonClasses} />;
      case 'api': return <Globe className={commonClasses} />;
      case 'config': return <Settings className={commonClasses} />;
      case 'clipboard': return <ClipboardCheck className={commonClasses} />;
      default: return null;
    }
  };

  if (!actionType) return null;

  return (
    <Badge 
      variant="outline" 
      className="text-[10px] h-5 gap-1 bg-white/50"
    >
      {getActionIcon(actionType)}
      {actionType}
    </Badge>
  );
};

interface FlowNodeProps {
  data: NodeData;
  id: string;
  selected: boolean;
}

const FlowNode = ({ data, id, selected }: FlowNodeProps) => {
  const handleNodeClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (data.onOpenProperties) {
      data.onOpenProperties(id);
    }
  }, [id, data]);

  const handleAddNode = useCallback((event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    if (data.onAddNode) {
      data.onAddNode(id);
    }
  }, [id, data]);

  const handleDeleteNode = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (data.onDelete) {
      data.onDelete(id);
    }
  }, [id, data]);

  const label = data.label || "Unnamed Node";
  const description = data.description || "";
  
  const hasLoopEnabled = data.loopConfig?.enabled;
  const hasContinueOnError = data.errorBehavior === 'continue';
  
  const renderNodeIcon = () => {
    if (data.type === 'webflow') {
      return <img 
        src="https://cdn.prod.website-files.com/67e18b84fa43974c4775c6ac/67f05d5f1856eddf103ade25_677c7ebd444787716acb6d71_672ef891a9bcfa70336d887d_webflow.svg" 
        alt="Webflow" 
        className="w-4 h-4" 
      />;
    }
    
    // Handle string icons (URLs) FIRST - must be rendered as img, not as component
    if (data.icon && typeof data.icon === 'string') {
      return <img src={data.icon} alt={label} className="w-4 h-4 object-contain" />;
    }
    
    // Handle React components (functions/classes)
    if (data.icon && typeof data.icon === 'function') {
      const IconComponent = data.icon as React.ComponentType<{ className?: string; size?: number }>;
      return <IconComponent className="w-4 h-4" size={16} />;
    }
    
    // Default fallback
    return <Globe className="w-4 h-4 text-blue-500" />;
  };

  const nodeCategory = (data.category as string) || (data.type as string) || '';

  return (
    <div className="relative">

      <div 
        className={cn(
          "px-4 py-3 min-w-[240px] bg-white rounded-lg border shadow-sm",
          selected && "ring-2 ring-primary",
          "hover:shadow-md cursor-pointer relative",
          hasLoopEnabled && "border-orange-300 bg-orange-50"
        )}
        onClick={handleNodeClick}
      >
        {/* Continue on Error indicator */}
        {hasContinueOnError && (
          <div className="absolute -top-2 -left-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                    <AlertTriangle className="w-3 h-3 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Continue on Error: Errors from this node will be logged but won't stop the flow
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Loop indicator */}
        {hasLoopEnabled && (
          <div className="absolute -top-2 -right-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-3 h-3 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Loop enabled ({data.loopConfig?.loopType})
                    {data.loopConfig?.sourceNodeId && (
                      <br />
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center shrink-0">
              {renderNodeIcon()}
            </div>
            <div className="min-w-0 overflow-hidden">
              <h3 className="text-sm font-medium truncate">{label}</h3>
              <p className="text-xs text-muted-foreground truncate">
                {(() => {
                  const operation = data.inputs?.operation || data.inputs?.action || data.inputs?.method;
                  return operation ? operation.toString().toUpperCase() : (data.type as string) || "";
                })()}
              </p>
            </div>
          </div>
          
          <div className="flex gap-1 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-400"
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Toggle node enabled
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-red-500"
                    onClick={handleDeleteNode}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Delete node
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {data.actionType && (
          <div className="mt-2">
            <NodeActionBadge actionType={data.actionType} />
          </div>
        )}

        {/* Input handle - PERFECTLY centered and invisible */}
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2 !h-2 !bg-transparent !border-0 !left-1/2 !top-0 !transform !-translate-x-1/2"
          style={{ 
            position: 'absolute',
            left: '50%', 
            top: '0px',
            transform: 'translateX(-50%)',
            width: '2px',
            height: '2px',
            background: 'transparent',
            border: 'none'
          }}
        />

        {/* Output handle - PERFECTLY centered and invisible */}
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2 !h-2 !bg-transparent !border-0 !left-1/2 !bottom-0 !transform !-translate-x-1/2"
          style={{ 
            position: 'absolute',
            left: '50%', 
            bottom: '0px',
            transform: 'translateX(-50%)',
            width: '2px',
            height: '2px',
            background: 'transparent',
            border: 'none'
          }}
        />

        {/* Add button */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
          <button
            onClick={handleAddNode}
            className="w-6 h-6 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50"
          >
            <Plus className="w-3 h-3 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(FlowNode);
