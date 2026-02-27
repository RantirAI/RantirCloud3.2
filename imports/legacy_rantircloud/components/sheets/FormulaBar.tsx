import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, FunctionSquare } from 'lucide-react';
import { parseFormula } from '@/lib/sheets/formulaEngine';
import { cn } from '@/lib/utils';

interface FormulaBarProps {
  selectedCell?: { row: number; col: number };
  value?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  isEditing: boolean;
}

export function FormulaBar({ selectedCell, value = '', onSubmit, onCancel, isEditing }: FormulaBarProps) {
  const [formulaValue, setFormulaValue] = useState(value);
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormulaValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (formulaValue.startsWith('=')) {
      const result = parseFormula(formulaValue);
      setIsValid(result.valid);
      setError(result.error);
    } else {
      setIsValid(true);
      setError(undefined);
    }
  }, [formulaValue]);

  const handleSubmit = () => {
    if (isValid) {
      onSubmit(formulaValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const cellAddress = selectedCell 
    ? `${String.fromCharCode(65 + selectedCell.col)}${selectedCell.row + 1}`
    : '';

  return (
    <div className="border-b bg-background p-2 flex items-center gap-2 flex-shrink-0">
      <div className="flex items-center gap-2 min-w-[100px]">
        <FunctionSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-mono font-medium">{cellAddress}</span>
      </div>
      
      <div className="flex-1 relative">
        <Input
          ref={inputRef}
          value={formulaValue}
          onChange={(e) => setFormulaValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isEditing ? "Enter value or formula (start with =)" : "Select a cell to edit"}
          disabled={!isEditing}
          className={cn(
            "font-mono text-sm",
            !isValid && "border-destructive focus-visible:ring-destructive"
          )}
        />
        {error && (
          <div className="absolute top-full left-0 mt-1 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>

      {isEditing && (
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSubmit}
            disabled={!isValid}
            className="h-8 w-8"
          >
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onCancel}
            className="h-8 w-8"
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );
}
