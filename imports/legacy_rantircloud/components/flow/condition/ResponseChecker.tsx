import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Zap, Check, Globe, FileCode, Server, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export interface UpstreamNode {
  nodeId: string;
  label: string;
  nodeType: string;
  hasErrorHandling: boolean;
  outputs: { name: string; type: string }[];
}

interface ResponseCheckerProps {
  upstreamNodes: UpstreamNode[];
  onApplyExpression: (expression: string, description?: string) => void;
  currentExpression?: string;
}

type SelectionType = 
  | { nodeId: string; type: 'failed' | 'succeeded' }
  | { nodeId: string; type: 'status'; subType: '2xx' | '4xx' | '5xx' | 'custom' }
  | { nodeId: string; type: 'field'; subType: string }
  | null;

// Expression generators - Execution status (available for ALL nodes)
const getFailedExpression = (nodeId: string) => `data["${nodeId}.success"] === false`;
const getSucceededExpression = (nodeId: string) => `data["${nodeId}.success"] === true`;

// HTTP Status expressions (only for http-request nodes)
const getStatus2xxExpression = (nodeId: string) => 
  `data["${nodeId}.status"] >= 200 && data["${nodeId}.status"] < 300`;
const getStatus4xxExpression = (nodeId: string) => 
  `data["${nodeId}.status"] >= 400 && data["${nodeId}.status"] < 500`;
const getStatus5xxExpression = (nodeId: string) => 
  `data["${nodeId}.status"] >= 500`;
const getStatusEqualsExpression = (nodeId: string, value: number) => 
  `data["${nodeId}.status"] === ${value}`;

// Field expressions (for nodes with data output)
const getFieldExistsExpression = (nodeId: string, field: string) =>
  `data["${nodeId}.${field}"] !== undefined && data["${nodeId}.${field}"] !== null`;
const getFieldNotExistsExpression = (nodeId: string, field: string) =>
  `data["${nodeId}.${field}"] === undefined || data["${nodeId}.${field}"] === null`;
const getFieldEmptyExpression = (nodeId: string, field: string) =>
  `data["${nodeId}.${field}"] === "" || data["${nodeId}.${field}"] === null || data["${nodeId}.${field}"] === undefined`;
const getFieldEqualsExpression = (nodeId: string, field: string, value: string) =>
  `data["${nodeId}.${field}"] === ${value}`;
const getFieldNotEqualsExpression = (nodeId: string, field: string, value: string) =>
  `data["${nodeId}.${field}"] !== ${value}`;

export function ResponseChecker({ upstreamNodes, onApplyExpression, currentExpression }: ResponseCheckerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedExpression, setSelectedExpression] = useState<SelectionType>(null);

  // Detect selection from current expression
  useEffect(() => {
    if (!currentExpression) {
      setSelectedExpression(null);
      return;
    }
    
    for (const node of upstreamNodes) {
      // Check execution status expressions
      if (currentExpression === getFailedExpression(node.nodeId)) {
        setSelectedExpression({ nodeId: node.nodeId, type: 'failed' });
        return;
      }
      if (currentExpression === getSucceededExpression(node.nodeId)) {
        setSelectedExpression({ nodeId: node.nodeId, type: 'succeeded' });
        return;
      }
      
      // Check HTTP status expressions
      if (currentExpression === getStatus2xxExpression(node.nodeId)) {
        setSelectedExpression({ nodeId: node.nodeId, type: 'status', subType: '2xx' });
        return;
      }
      if (currentExpression === getStatus4xxExpression(node.nodeId)) {
        setSelectedExpression({ nodeId: node.nodeId, type: 'status', subType: '4xx' });
        return;
      }
      if (currentExpression === getStatus5xxExpression(node.nodeId)) {
        setSelectedExpression({ nodeId: node.nodeId, type: 'status', subType: '5xx' });
        return;
      }
    }
    
    setSelectedExpression(null);
  }, [currentExpression, upstreamNodes]);

  if (upstreamNodes.length === 0) {
    return null;
  }

  const isSelected = (nodeId: string, type: string, subType?: string) => {
    if (!selectedExpression) return false;
    if (selectedExpression.nodeId !== nodeId) return false;
    if (selectedExpression.type !== type) return false;
    if (subType && 'subType' in selectedExpression && selectedExpression.subType !== subType) return false;
    return true;
  };

  return (
    <div className="mb-4 border border-border/50 rounded-lg overflow-hidden bg-gradient-to-b from-muted/40 to-muted/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between px-3 py-2.5 h-auto hover:bg-muted/50"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <div className="p-1 rounded-md bg-amber-500/10">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <span>Response Checker</span>
              {selectedExpression && (
                <span className="ml-1.5 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  <Check className="h-2.5 w-2.5 mr-0.5" />
                  Applied
                </span>
              )}
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Check responses from upstream nodes:
            </p>

            <div className="space-y-3">
              {upstreamNodes.map((node) => (
                <NodeResponseChecker
                  key={node.nodeId}
                  node={node}
                  isSelected={isSelected}
                  onApply={(expression, description) => {
                    onApplyExpression(expression, description);
                  }}
                  setSelectedExpression={setSelectedExpression}
                />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface NodeResponseCheckerProps {
  node: UpstreamNode;
  isSelected: (nodeId: string, type: string, subType?: string) => boolean;
  onApply: (expression: string, description?: string) => void;
  setSelectedExpression: (selection: SelectionType) => void;
}

function NodeResponseChecker({ node, isSelected, onApply, setSelectedExpression }: NodeResponseCheckerProps) {
  const [customStatusValue, setCustomStatusValue] = useState('');
  const [customFieldPath, setCustomFieldPath] = useState('data.error');
  const [customFieldOperator, setCustomFieldOperator] = useState<'exists' | 'notExists' | 'isEmpty' | 'equals' | 'notEquals'>('exists');
  const [customFieldValue, setCustomFieldValue] = useState('');
  
  const hasHttpStatus = node.nodeType === 'http-request';
  const hasDataOutput = node.outputs.some(o => o.name === 'data' || o.name === 'response');
  
  // Get icon based on node type
  const getNodeIcon = () => {
    switch (node.nodeType) {
      case 'http-request':
        return <Globe className="h-3.5 w-3.5 text-emerald-500" />;
      case 'webhook-trigger':
        return <Zap className="h-3.5 w-3.5 text-amber-500" />;
      default:
        return <Server className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const handleApplyCustomStatus = () => {
    const value = parseInt(customStatusValue, 10);
    if (isNaN(value)) return;
    const expression = getStatusEqualsExpression(node.nodeId, value);
    setSelectedExpression({ nodeId: node.nodeId, type: 'status', subType: 'custom' });
    onApply(expression, `Check if "${node.label}" status equals ${value}`);
  };

  const handleApplyFieldCheck = () => {
    let expression = '';
    let description = '';
    
    // Clean the field path - remove leading "data." if user included it
    const cleanField = customFieldPath.replace(/^data\./, '');
    
    switch (customFieldOperator) {
      case 'exists':
        expression = getFieldExistsExpression(node.nodeId, `data.${cleanField}`);
        description = `Check if "${node.label}" has ${cleanField}`;
        break;
      case 'notExists':
        expression = getFieldNotExistsExpression(node.nodeId, `data.${cleanField}`);
        description = `Check if "${node.label}" doesn't have ${cleanField}`;
        break;
      case 'isEmpty':
        expression = getFieldEmptyExpression(node.nodeId, `data.${cleanField}`);
        description = `Check if "${node.label}" ${cleanField} is empty`;
        break;
      case 'equals':
        // Smart value handling - detect booleans, numbers, strings
        let parsedValue = customFieldValue;
        if (customFieldValue === 'true' || customFieldValue === 'false') {
          parsedValue = customFieldValue;
        } else if (!isNaN(Number(customFieldValue))) {
          parsedValue = customFieldValue;
        } else {
          parsedValue = JSON.stringify(customFieldValue);
        }
        expression = getFieldEqualsExpression(node.nodeId, `data.${cleanField}`, parsedValue);
        description = `Check if "${node.label}" ${cleanField} equals ${customFieldValue}`;
        break;
      case 'notEquals':
        let parsedVal = customFieldValue;
        if (customFieldValue === 'true' || customFieldValue === 'false') {
          parsedVal = customFieldValue;
        } else if (!isNaN(Number(customFieldValue))) {
          parsedVal = customFieldValue;
        } else {
          parsedVal = JSON.stringify(customFieldValue);
        }
        expression = getFieldNotEqualsExpression(node.nodeId, `data.${cleanField}`, parsedVal);
        description = `Check if "${node.label}" ${cleanField} is not ${customFieldValue}`;
        break;
    }
    
    setSelectedExpression({ nodeId: node.nodeId, type: 'field', subType: customFieldPath });
    onApply(expression, description);
  };

  return (
    <div className="rounded-lg border border-border/60 bg-background shadow-sm overflow-hidden">
      {/* Node Header */}
      <div className="px-3 py-2 text-xs font-medium text-foreground truncate bg-muted/30 border-b border-border/40 flex items-center gap-2">
        {getNodeIcon()}
        {node.label}
        {node.hasErrorHandling && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">
            Continue on Error
          </span>
        )}
      </div>
      
      <div className="p-2 space-y-3">
        {/* Execution Status Section - ALWAYS show for ALL nodes */}
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Execution Status
          </Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "flex-1 h-8 text-xs gap-1.5 font-medium transition-all",
                isSelected(node.nodeId, 'failed')
                  ? "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90"
                  : "border-border hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
              )}
              onClick={() => {
                setSelectedExpression({ nodeId: node.nodeId, type: 'failed' });
                onApply(getFailedExpression(node.nodeId), `Check if "${node.label}" failed`);
              }}
            >
              <AlertTriangle className="h-3 w-3" />
              Failed
              {isSelected(node.nodeId, 'failed') && <Check className="h-3 w-3 ml-auto" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "flex-1 h-8 text-xs gap-1.5 font-medium transition-all",
                isSelected(node.nodeId, 'succeeded')
                  ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                  : "border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-emerald-600"
              )}
              onClick={() => {
                setSelectedExpression({ nodeId: node.nodeId, type: 'succeeded' });
                onApply(getSucceededExpression(node.nodeId), `Check if "${node.label}" succeeded`);
              }}
            >
              <CheckCircle2 className="h-3 w-3" />
              Succeeded
              {isSelected(node.nodeId, 'succeeded') && <Check className="h-3 w-3 ml-auto" />}
            </Button>
          </div>
        </div>

        {/* HTTP Status Section - only for http-request nodes */}
        {hasHttpStatus && (
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Globe className="h-3 w-3" />
              HTTP Status
            </Label>
            <div className="flex gap-1.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 text-xs px-2 font-medium transition-all",
                  isSelected(node.nodeId, 'status', '2xx')
                    ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                    : "border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-emerald-600"
                )}
                onClick={() => {
                  setSelectedExpression({ nodeId: node.nodeId, type: 'status', subType: '2xx' });
                  onApply(getStatus2xxExpression(node.nodeId), `Check if "${node.label}" returns success (2xx)`);
                }}
              >
                2xx ✓
                {isSelected(node.nodeId, 'status', '2xx') && <Check className="h-3 w-3 ml-1" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 text-xs px-2 font-medium transition-all",
                  isSelected(node.nodeId, 'status', '4xx')
                    ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-700"
                    : "border-border hover:border-amber-500/50 hover:bg-amber-500/5 hover:text-amber-600"
                )}
                onClick={() => {
                  setSelectedExpression({ nodeId: node.nodeId, type: 'status', subType: '4xx' });
                  onApply(getStatus4xxExpression(node.nodeId), `Check if "${node.label}" returns client error (4xx)`);
                }}
              >
                4xx
                {isSelected(node.nodeId, 'status', '4xx') && <Check className="h-3 w-3 ml-1" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 text-xs px-2 font-medium transition-all",
                  isSelected(node.nodeId, 'status', '5xx')
                    ? "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90"
                    : "border-border hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
                )}
                onClick={() => {
                  setSelectedExpression({ nodeId: node.nodeId, type: 'status', subType: '5xx' });
                  onApply(getStatus5xxExpression(node.nodeId), `Check if "${node.label}" returns server error (5xx)`);
                }}
              >
                5xx
                {isSelected(node.nodeId, 'status', '5xx') && <Check className="h-3 w-3 ml-1" />}
              </Button>
            </div>
            
            {/* Custom status input */}
            <div className="flex gap-1.5 items-center mt-1.5">
              <span className="text-[10px] text-muted-foreground">or</span>
              <Input
                type="number"
                placeholder="200"
                value={customStatusValue}
                onChange={(e) => setCustomStatusValue(e.target.value)}
                className="h-7 w-16 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={handleApplyCustomStatus}
                disabled={!customStatusValue}
              >
                Apply
              </Button>
            </div>
          </div>
        )}

        {/* Response Field Section - for nodes with data output */}
        {hasDataOutput && (
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <FileCode className="h-3 w-3" />
              Response Field
            </Label>
            
            {/* Quick presets */}
            <div className="flex gap-1.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 text-xs px-2 font-medium",
                  isSelected(node.nodeId, 'field', 'error-exists')
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => {
                  setSelectedExpression({ nodeId: node.nodeId, type: 'field', subType: 'error-exists' });
                  onApply(getFieldExistsExpression(node.nodeId, 'data.error'), `Check if "${node.label}" has error`);
                }}
              >
                data.error exists
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 text-xs px-2 font-medium",
                  isSelected(node.nodeId, 'field', 'success-false')
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => {
                  setSelectedExpression({ nodeId: node.nodeId, type: 'field', subType: 'success-false' });
                  onApply(getFieldEqualsExpression(node.nodeId, 'data.success', 'false'), `Check if "${node.label}" success is false`);
                }}
              >
                success = false
              </Button>
            </div>
            
            {/* Custom field checker */}
            <div className="flex flex-col gap-1.5 mt-2 p-2 rounded bg-muted/30 border border-border/40">
              <span className="text-[10px] text-muted-foreground">Custom field check:</span>
              <div className="flex flex-wrap gap-1.5 items-center">
                <Input
                  placeholder="data.error"
                  value={customFieldPath}
                  onChange={(e) => setCustomFieldPath(e.target.value)}
                  className="h-7 w-24 text-xs flex-shrink-0"
                />
                <Select 
                  value={customFieldOperator} 
                  onValueChange={(v: 'exists' | 'notExists' | 'isEmpty' | 'equals' | 'notEquals') => setCustomFieldOperator(v)}
                >
                  <SelectTrigger className="h-7 w-24 text-xs flex-shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exists">exists</SelectItem>
                    <SelectItem value="notExists">not exists</SelectItem>
                    <SelectItem value="isEmpty">is empty</SelectItem>
                    <SelectItem value="equals">equals</SelectItem>
                    <SelectItem value="notEquals">not equals</SelectItem>
                  </SelectContent>
                </Select>
                {(customFieldOperator === 'equals' || customFieldOperator === 'notEquals') && (
                  <Input
                    placeholder="value"
                    value={customFieldValue}
                    onChange={(e) => setCustomFieldValue(e.target.value)}
                    className="h-7 w-20 text-xs flex-shrink-0"
                  />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={handleApplyFieldCheck}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
