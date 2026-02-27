import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, GripVertical, ChevronDown, ChevronUp, Code, Variable, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MonacoEditorField } from '@/components/flow/MonacoEditorField';
import { ConditionCase, CONDITION_OPERATORS } from '@/nodes/condition';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Upstream nodes with "Continue on Error" enabled
interface UpstreamErrorNode {
  nodeId: string;
  label: string;
}

interface ConditionCaseEditorProps {
  cases: ConditionCase[];
  returnType: 'boolean' | 'string' | 'integer';
  onChange: (cases: ConditionCase[]) => void;
  nodeId: string;
  
  onOpenCodeEditor?: (nodeId: string, fieldName: string, currentValue: string, onSave: (value: string) => void) => void;
  upstreamErrorNodes?: UpstreamErrorNode[];
}

export function ConditionCaseEditor({ 
  cases, 
  returnType, 
  onChange, 
  nodeId,
  
  onOpenCodeEditor,
  upstreamErrorNodes = []
}: ConditionCaseEditorProps) {
  const [expandedCase, setExpandedCase] = useState<string | null>(cases.length > 0 ? cases[0].id : null);
  const [editingCondition, setEditingCondition] = useState<{ id: string; condition: string } | null>(null);

  const addCase = useCallback(() => {
    const caseNumber = cases.length + 1;
    // Generate unique return value based on return type
    const getUniqueReturnValue = () => {
      if (returnType === 'boolean') return caseNumber % 2 === 1 ? 'true' : 'false';
      if (returnType === 'integer') return String(caseNumber);
      return `branch_${caseNumber}`;
    };
    
    const newCase: ConditionCase = {
      id: `case-${Date.now()}`,
      leftOperand: '',
      operator: 'equals',
      rightOperand: '',
      rightOperandType: 'static',
      returnValue: getUniqueReturnValue(),
      label: `Condition ${caseNumber}`,
      useCustomExpression: false,
      condition: ''
    };
    onChange([...cases, newCase]);
    setExpandedCase(newCase.id);
  }, [cases, returnType, onChange]);

  const updateCase = useCallback((id: string, updates: Partial<ConditionCase>) => {
    onChange(cases.map(c => c.id === id ? { ...c, ...updates } : c));
  }, [cases, onChange]);

  const removeCase = useCallback((id: string) => {
    onChange(cases.filter(c => c.id !== id));
    if (expandedCase === id) {
      setExpandedCase(cases.length > 1 ? cases[0].id : null);
    }
  }, [cases, onChange, expandedCase]);

  const moveCase = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= cases.length) return;
    const newCases = [...cases];
    const [movedCase] = newCases.splice(fromIndex, 1);
    newCases.splice(toIndex, 0, movedCase);
    onChange(newCases);
  }, [cases, onChange]);

  const handleConditionSave = useCallback((value: string) => {
    if (editingCondition) {
      updateCase(editingCondition.id, { condition: value });
      setEditingCondition(null);
    }
  }, [editingCondition, updateCase]);

  const getReturnValuePlaceholder = () => {
    switch (returnType) {
      case 'boolean': return 'true or false';
      case 'integer': return 'e.g., 1, 2, 3';
      case 'string': return 'e.g., "premium", "basic"';
      default: return 'Return value';
    }
  };

  const openBindingForCaseField = (caseId: string, fieldName: string) => {
    const caseItem = cases.find(c => c.id === caseId);
    const currentValue = caseItem ? (caseItem as any)[fieldName] || '' : '';
    openCodeEditorForCaseField(caseId, fieldName, currentValue);
  };

  const openCodeEditorForCaseField = (caseId: string, fieldName: string, currentValue: string) => {
    onOpenCodeEditor?.(nodeId, `conditionCase.${caseId}.${fieldName}`, currentValue, (newValue) => {
      updateCase(caseId, { [fieldName]: newValue });
    });
  };

  // Check if operator needs right operand
  const operatorNeedsRightOperand = (operator: string) => {
    return !['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'].includes(operator);
  };

  return (
    <div className="space-y-3">
      {cases.map((caseItem, index) => (
        <div
          key={caseItem.id}
          className={cn(
            "border rounded-lg overflow-hidden bg-card",
            expandedCase === caseItem.id ? "border-primary/50" : "border-border"
          )}
        >
          {/* Case header */}
          <div
            className="flex items-center gap-2 p-2 bg-muted/50 cursor-pointer hover:bg-muted"
            onClick={() => setExpandedCase(expandedCase === caseItem.id ? null : caseItem.id)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 cursor-grab"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3 w-3" />
            </Button>
            
            <Badge variant={index === 0 ? "default" : "secondary"} className="text-xs">
              {index === 0 ? 'IF' : 'ELSE IF'}
            </Badge>
            
            <span className="text-sm font-medium flex-1 truncate">
              {caseItem.label || `Condition ${index + 1}`}
            </span>
            
            <div className="flex items-center gap-1">
              {index > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveCase(index, index - 1);
                  }}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
              )}
              {index < cases.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveCase(index, index + 1);
                  }}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  removeCase(caseItem.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Case body (expanded) */}
          {expandedCase === caseItem.id && (
            <div className="p-3 space-y-3 border-t">
              {/* Label */}
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input
                  value={caseItem.label || ''}
                  onChange={(e) => updateCase(caseItem.id, { label: e.target.value })}
                  placeholder="Condition name (optional)"
                  className="h-8 text-sm"
                />
              </div>

              {/* Quick Expressions - only show if upstream error nodes exist */}
              {upstreamErrorNodes.length > 0 && !caseItem.useCustomExpression && (
                <Collapsible className="border rounded-md bg-muted/30">
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 text-sm hover:bg-muted/50 transition-colors">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span className="font-medium text-xs">Quick Expressions</span>
                    <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-2 pt-0 space-y-2">
                    <p className="text-xs text-muted-foreground mb-2">
                      Click to check if upstream nodes with "Continue on Error" failed or succeeded:
                    </p>
                    {upstreamErrorNodes.map((errorNode) => (
                      <div key={errorNode.nodeId} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-7 text-xs justify-start gap-2 border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700"
                            onClick={() => {
                              updateCase(caseItem.id, {
                                leftOperand: `{{${errorNode.nodeId}._failedNode}}`,
                                operator: 'isTrue',
                                rightOperand: '',
                                rightOperandType: 'static',
                                label: caseItem.label || `${errorNode.label} failed`
                              });
                            }}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            <span className="truncate">"{errorNode.label}" failed</span>
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-7 text-xs justify-start gap-2 border-green-200 bg-green-50 hover:bg-green-100 text-green-700"
                            onClick={() => {
                              updateCase(caseItem.id, {
                                leftOperand: `{{${errorNode.nodeId}._failedNode}}`,
                                operator: 'isFalse',
                                rightOperand: '',
                                rightOperandType: 'static',
                                label: caseItem.label || `${errorNode.label} succeeded`
                              });
                            }}
                          >
                            <CheckCircle className="h-3 w-3" />
                            <span className="truncate">"{errorNode.label}" succeeded</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Advanced mode toggle */}
              <div className="flex items-center justify-between py-1">
                <Label className="text-xs text-muted-foreground">Use Custom Expression</Label>
                <Switch
                  checked={caseItem.useCustomExpression || false}
                  onCheckedChange={(checked) => updateCase(caseItem.id, { useCustomExpression: checked })}
                />
              </div>

              {caseItem.useCustomExpression ? (
                /* Legacy code editor for advanced users */
                <div className="space-y-1">
                  <Label className="text-xs">Custom Expression</Label>
                  <div className="flex gap-2">
                    <Input
                      value={caseItem.condition || ''}
                      onChange={(e) => updateCase(caseItem.id, { condition: e.target.value })}
                      placeholder="data.value > 100"
                      className="h-8 text-sm font-mono flex-1"
                    />
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingCondition({ id: caseItem.id, condition: caseItem.condition || '' })}
                        >
                          <Code className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl h-[60vh] flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Edit Condition</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 min-h-0">
                          <MonacoEditorField
                            value={editingCondition?.condition || caseItem.condition || ''}
                            onChange={(value) => setEditingCondition(prev => prev ? { ...prev, condition: value } : null)}
                            language="javascript"
                            nodeId={nodeId}
                            height="100%"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button variant="outline" onClick={() => setEditingCondition(null)}>
                            Cancel
                          </Button>
                          <Button onClick={() => handleConditionSave(editingCondition?.condition || '')}>
                            Save
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ) : (
                /* NEW: Structured condition builder */
                <>
                  {/* Left Operand (IF field) */}
                  <div className="space-y-1">
                    <Label className="text-xs">IF (Value to Check)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={caseItem.leftOperand || ''}
                        onChange={(e) => updateCase(caseItem.id, { leftOperand: e.target.value })}
                        placeholder="Select a variable..."
                        className="h-8 text-sm font-mono flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openBindingForCaseField(caseItem.id, 'leftOperand');
                        }}
                        title="Bind variable"
                      >
                        <Variable className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openCodeEditorForCaseField(caseItem.id, 'leftOperand', caseItem.leftOperand || '');
                        }}
                        title="Open code editor"
                      >
                        <Code className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Operator */}
                  <div className="space-y-1">
                    <Label className="text-xs">Operator</Label>
                    <Select
                      value={caseItem.operator || 'equals'}
                      onValueChange={(value) => updateCase(caseItem.id, { operator: value as any })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select operator" />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        {CONDITION_OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            <div className="flex flex-col">
                              <span>{op.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Right Operand (Compare To) - only if operator needs it */}
                  {operatorNeedsRightOperand(caseItem.operator || 'equals') && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Compare To</Label>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">
                            {caseItem.rightOperandType === 'variable' ? 'Variable' : 'Static Value'}
                          </Label>
                          <Switch
                            checked={caseItem.rightOperandType === 'variable'}
                            onCheckedChange={(checked) => 
                              updateCase(caseItem.id, { 
                                rightOperandType: checked ? 'variable' : 'static',
                                rightOperand: '' // Clear when switching
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={caseItem.rightOperand || ''}
                          onChange={(e) => updateCase(caseItem.id, { rightOperand: e.target.value })}
                          placeholder={caseItem.rightOperandType === 'variable' ? 'Select a variable...' : 'Enter value...'}
                          className={cn(
                            "h-8 text-sm flex-1",
                            caseItem.rightOperandType === 'variable' && "font-mono"
                          )}
                        />
                        {caseItem.rightOperandType === 'variable' && (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openBindingForCaseField(caseItem.id, 'rightOperand');
                              }}
                              title="Bind variable"
                            >
                              <Variable className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openCodeEditorForCaseField(caseItem.id, 'rightOperand', caseItem.rightOperand || '');
                              }}
                              title="Open code editor"
                            >
                              <Code className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Return Value */}
              <div className="space-y-1 pt-2 border-t">
                <Label className="text-xs">
                  Then Return
                  {returnType === 'boolean' && (
                    <span className="text-muted-foreground ml-1">(boolean)</span>
                  )}
                </Label>
                {returnType === 'boolean' ? (
                  <div className="flex gap-2">
                    <Button
                      variant={caseItem.returnValue === 'true' ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "flex-1 h-8",
                        caseItem.returnValue === 'true' && "bg-green-600 hover:bg-green-700"
                      )}
                      onClick={() => updateCase(caseItem.id, { returnValue: 'true' })}
                    >
                      TRUE
                    </Button>
                    <Button
                      variant={caseItem.returnValue === 'false' ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "flex-1 h-8",
                        caseItem.returnValue === 'false' && "bg-red-600 hover:bg-red-700"
                      )}
                      onClick={() => updateCase(caseItem.id, { returnValue: 'false' })}
                    >
                      FALSE
                    </Button>
                  </div>
                ) : (
                  <Input
                    value={caseItem.returnValue}
                    onChange={(e) => updateCase(caseItem.id, { returnValue: e.target.value })}
                    placeholder={getReturnValuePlaceholder()}
                    className="h-8 text-sm"
                    type={returnType === 'integer' ? 'number' : 'text'}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      ))}
      
      {/* Add Condition Button */}
      <Button
        variant="outline"
        className="w-full h-9 border-dashed"
        onClick={addCase}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Condition
      </Button>
      
      {/* ELSE indicator */}
      <div className="border rounded-lg p-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">ELSE</Badge>
          <span className="text-sm text-muted-foreground">
            Default branch when no condition matches
          </span>
        </div>
      </div>
    </div>
  );
}
