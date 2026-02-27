
import React from 'react';
import { Code, Variable, ArrowRight, Eye, EyeOff, Link, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface EditorToolbarProps {
  language: string;
  isVariableBinding: boolean;
  toggleBindingMode: () => void;
  evaluateCode: () => void;
  togglePreview: () => void;
  showPreview: boolean;
  toggleVariables: () => void;
  availableVariablesCount: number;
}

export function EditorToolbar({
  language,
  isVariableBinding,
  toggleBindingMode,
  evaluateCode,
  togglePreview,
  showPreview,
  toggleVariables,
  availableVariablesCount
}: EditorToolbarProps) {
  return (
    <div className="border-b bg-muted/30 flex items-center justify-between p-1">
      <div className="flex items-center gap-2 pl-2">
        <Code className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{language}</span>
      </div>
      
      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <Button
                variant="ghost"
                size="xs"
                className="h-7 w-7"
                onClick={toggleVariables}
                disabled={availableVariablesCount === 0}
              >
                <Variable className="h-4 w-4" />
              </Button>
              {availableVariablesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center z-10 pointer-events-none">
                  {availableVariablesCount}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>Show available variables</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="xs"
              className="h-7 w-7"
              onClick={toggleBindingMode}
            >
              {isVariableBinding ? <Unlink className="h-4 w-4" /> : <Link className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isVariableBinding ? "Switch to custom code" : "Switch to variable binding"}
          </TooltipContent>
        </Tooltip>
        
        {!isVariableBinding && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="xs"
                className="h-7 w-7"
                onClick={evaluateCode}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Run code</TooltipContent>
          </Tooltip>
        )}
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="xs"
              className="h-7 w-7"
              onClick={togglePreview}
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showPreview ? "Hide preview" : "Show preview"}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
