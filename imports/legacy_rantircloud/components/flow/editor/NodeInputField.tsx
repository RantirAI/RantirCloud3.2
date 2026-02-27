import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from "@/components/ui/switch";
import { MonacoEditorField } from '@/components/flow/MonacoEditorField';
import { Loader2, X } from 'lucide-react';
import { LogoIcon } from '@/components/flow/LogoIcon';
import { WebflowFieldMappingButton } from './WebflowFieldMappingButton';
import { DatabaseSelectorField } from '../node-types/DatabaseSelectorField';
import { TableSelectorField } from '../node-types/TableSelectorField';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { WebflowSelectField } from '../node-types/WebflowSelectField';
import { ClicDataSelectField } from '../node-types/ClicDataSelectField';
import { VariableBindingButton } from './VariableBindingButton';
import { WebflowIcon } from '@/components/flow/icons/WebflowIcon';
import { useVariableResolver } from '@/hooks/useVariableResolver';
import { nodeRegistry } from '@/lib/node-registry';
import { useFlowStore } from '@/lib/flow-store';
import { QueryParamsEditor } from '../webhook/QueryParamsEditor';

interface NodeInputFieldProps {
  node?: any;
  input: any;
  value: any;
  onValueChange?: (newValue: any) => void;
  nodeId?: string;
  onChange?: (value: any) => void;
  onExpandCode?: (input: any, value: string) => void;
  variables?: any[];
  onConnect?: () => void;
  onOpenCodeEditor?: (nodeId: string, fieldName: string, currentValue: string) => void;
}

const NodeInputField: React.FC<NodeInputFieldProps> = ({ 
  node, 
  input, 
  value, 
  onValueChange,
  onChange,
  onExpandCode,
  nodeId,
  variables = [],
  onConnect,
  onOpenCodeEditor
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<Array<{label: string; value: string; description?: string}>>([]);
  const { resolveVariable, resolveAllVariables, isVariableBinding, getVariableDisplayName } = useVariableResolver();
  
  // Import useFlowStore to access nodes
  const { nodes: flowNodes } = useFlowStore();
  
  // Use either onValueChange or onChange based on what's provided
  const handleValueChange = (newValue: any) => {
    if (onChange) {
      onChange(newValue);
    } else if (onValueChange) {
      onValueChange(newValue);
    }
  };

  // Check if field should be disabled due to missing API key
  const isDisabledDueToApiKey = () => {
    if (!input.dependsOnApiKey) return false;
    
    // Find the API key field in the node's inputs
    const apiKeyField = node.data.inputs && Object.keys(node.data.inputs).find(key => {
      // Check if this input corresponds to an API key field
      const nodeInputs = nodeRegistry.getPlugin(node.data.type)?.inputs || [];
      const inputConfig = nodeInputs.find(inp => inp.name === key);
      return inputConfig?.isApiKey;
    });
    
    if (!apiKeyField) return false;
    
    const apiKeyValue = getNodeInput(apiKeyField);
    return !apiKeyValue || apiKeyValue.trim() === '';
  };

  // Fix to properly get input values from node with variable resolution
  const getNodeInput = (inputName: string) => {
    if (!node || !node.data || !node.data.inputs) return '';
    const rawValue = node.data.inputs[inputName] || '';
    // Resolve variables for internal use
    return resolveVariable(rawValue, nodeId);
  };
 
  // Identify action/operation select fields (e.g., Snowflake operation)
  const isActionField = input.name === 'action' || input.name === 'operation';
 
  // Get the resolved value for component functionality
  const getResolvedValue = (val: any) => {
    if (isVariableBinding(val)) {
      const resolved = resolveVariable(val, nodeId);
      console.log(`Resolved value for ${val}:`, resolved);
      return resolved !== null ? resolved : '';
    }
    return val;
  };

  // Handle unbinding a variable
  const handleUnbind = () => {
    handleValueChange('');
    toast.success('Variable unbound');
  };

  // Extract source node info for variable binding display
  const getSourceNodeInfo = (val: string) => {
    if (!val) return null;
    const match = val.match(/^{{([^.]+)\./);
    if (!match) return null;
    const sourceNodeId = match[1];
    const sourceNode = flowNodes.find((n: any) => n.id === sourceNodeId);
    if (!sourceNode) return null;
    const plugin = nodeRegistry.getPlugin(sourceNode.data.type);
    return { node: sourceNode, plugin, icon: plugin?.icon, color: plugin?.color };
  };

  // Render inline badge when a variable is bound (replaces entire input)
  const renderBoundBadge = (heightClass?: string) => {
    const sourceInfo = getSourceNodeInfo(value);
    const brandColor = sourceInfo?.plugin?.color || '#6366f1';
    const displayName = getVariableDisplayName(value);

    return (
      <div
        className={`group/badge flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors ${heightClass || ''}`}
        style={{
          backgroundColor: `${brandColor}08`,
          borderColor: `${brandColor}20`,
        }}
      >
        {sourceInfo?.icon && (
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${brandColor}15` }}
          >
            <LogoIcon icon={sourceInfo.icon} alt={sourceInfo.node?.data?.label || ''} size="sm" color={brandColor} />
          </div>
        )}
        <span className="text-xs font-normal truncate flex-1 text-muted-foreground">
          {displayName}
        </span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 rounded-md opacity-60 hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-opacity"
            onClick={handleUnbind}
            title="Remove binding"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  // Show variable binding info if value is a variable (kept for select/special fields)
  const renderVariableInfo = () => {
    if (!isVariableBinding(value)) return null;
    const sourceInfo = getSourceNodeInfo(value);
    return (
      <div className="mt-1.5 rounded-md border border-primary/20 bg-primary/5 overflow-hidden">
        <div className="flex items-center gap-2 px-2 py-1.5">
          {sourceInfo?.icon && (
            <div
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${sourceInfo.color}15` }}
            >
              <LogoIcon icon={sourceInfo.icon} alt={sourceInfo.node?.data?.label || ''} size="sm" color={sourceInfo.color} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground truncate">
              {getVariableDisplayName(value)}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex-shrink-0"
            onClick={handleUnbind}
            title="Remove binding"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  // Get display value for inputs when variable is bound
  const getDisplayValue = () => {
    if (isVariableBinding(value)) {
      return '';
    }
    return value || '';
  };
  
  // Fetch dynamic options for select inputs with resolved variables
  useEffect(() => {
    if (input.type === 'select' && input.dynamic && input.dynamicOptions && !input.webflowField) {
      // Don't fetch if already loading to prevent infinite loops
      if (isLoading) return;
      
      const fetchOptions = async () => {
        try {
          setIsLoading(true);
          // Use flow store instead of window.flow for current data
          const { nodes, edges } = useFlowStore.getState();
          
          // Resolve all variables in node inputs before passing to dynamicOptions
          const resolvedInputs = node?.data?.inputs ? resolveAllVariables(node.data.inputs, nodeId) : {};
          
          const result = await input.dynamicOptions(nodes, edges, nodeId || '', resolvedInputs);
          
          if (Array.isArray(result)) {
            setOptions(result);
          }
        } catch (error) {
          console.error('Error fetching dynamic options:', error);
          setOptions([{ label: 'Error loading options', value: 'error' }]);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchOptions();
    } else if (input.type === 'select' && input.options) {
      setOptions(input.options);
    }
  }, [input.name, input.type, input.dynamic, nodeId, node?.data?.inputs]); // Added node data inputs dependency

  // Clamp invalid action/operation values to a supported option (e.g., legacy 'schema')
  useEffect(() => {
    if (input.type !== 'select' || !isActionField) return;
    // Prefer loaded options; fallback to static input.options
    const available = (options && options.length > 0 ? options : (input.options || [])).map((o) => o.value);
    const currentVal = getResolvedValue(value);
    if (!currentVal) return;
    if (!available.includes(currentVal)) {
      const newVal = (input as any).default ?? available[0] ?? '';
      if (newVal && newVal !== currentVal) {
        handleValueChange(newVal);
      }
    }
  }, [input.type, isActionField, options, value]);

  // Handle connect button click for Webflow
  const handleConnect = () => {
    const resolvedApiKey = getResolvedValue(value);
    console.log('Connect button clicked with resolved API key:', resolvedApiKey);
    
    if (!resolvedApiKey) {
      toast.error("Please enter an API key first");
      return;
    }
    
    console.log("Next button clicked, automatically loading sites data");
    
    if (onConnect) {
      onConnect();
    } else {
      toast.success("Connecting to Webflow...", {
        description: "Loading sites data now"
      });
    }
  };

  // Render variable binding button inside input fields
  const renderInlineVariableButton = () => {
    
    return (
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
        <VariableBindingButton
          onVariableSelect={handleValueChange}
          variables={variables}
          size="icon"
          variant="ghost"
          className="h-6 w-6 p-0 hover:bg-transparent border-0 shadow-none"
          position="right"
          nodeId={nodeId}
          includeLoopVariables={true}
          isBound={isVariableBinding(value)}
          boundVariableName={isVariableBinding(value) ? getVariableDisplayName(value) : undefined}
          onUnbind={isVariableBinding(value) ? handleUnbind : undefined}
          onOpenSidebar={(nId) => onOpenCodeEditor?.(nId, input.name, value || '')}
        />
      </div>
    );
  };

  // Special handling for Webflow node
  if (node?.data?.type === 'webflow') {
    // For Webflow site selector field
    if (input.name === 'siteId') {
      const apiKeyValue = getNodeInput('apiKey');
      console.log('Site selector using resolved API key:', apiKeyValue);
      return (
        <div>
          <div className="relative">
            <WebflowSelectField 
              value={String(getResolvedValue(value) || '')}
              onChange={handleValueChange}
              apiKey={apiKeyValue}
              optionType="sites"
              placeholder="Select a Webflow site"
              loadOnMount={true}
            />
            {renderInlineVariableButton()}
          </div>
          {renderVariableInfo()}
        </div>
      );
    }
    
    // For Webflow collection selector field
    if (input.name === 'collectionId') {
      const apiKeyValue = getNodeInput('apiKey');
      const siteIdValue = getNodeInput('siteId');
      console.log('Collection selector using resolved values:', { apiKeyValue, siteIdValue });
      return (
        <div>
          <div className="relative">
            <WebflowSelectField 
              value={String(getResolvedValue(value) || '')}
              onChange={handleValueChange}
              apiKey={apiKeyValue}
              siteId={siteIdValue}
              optionType="collections"
              placeholder="Select a collection"
              loadOnMount={true}
            />
            {renderInlineVariableButton()}
          </div>
          {renderVariableInfo()}
        </div>
      );
    }
    
    // For Webflow item selector field
    if (input.name === 'itemId') {
      const apiKeyValue = getNodeInput('apiKey');
      const collectionIdValue = getNodeInput('collectionId');
      console.log('Item selector using resolved values:', { apiKeyValue, collectionIdValue });
      return (
        <div>
          <div className="relative">
            <WebflowSelectField 
              value={String(getResolvedValue(value) || '')}
              onChange={handleValueChange}
              apiKey={apiKeyValue}
              collectionId={collectionIdValue}
              optionType="items"
              placeholder="Select an item"
              loadOnMount={true}
            />
            {renderInlineVariableButton()}
          </div>
          {renderVariableInfo()}
        </div>
      );
    }
  }

  // Special handling for API key in Webflow node
  if (input.name === 'apiKey' && nodeId && node?.data?.type === 'webflow') {
    return (
      <div className="space-y-3">
        <div className="relative">
          <Input
            type="text"
            placeholder={input.placeholder || input.label}
            value={isVariableBinding(value) ? getDisplayValue() : value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            className="pr-10"
            readOnly={isVariableBinding(value)}
          />
          {renderInlineVariableButton()}
        </div>
        {renderVariableInfo()}
        
        <Button 
          variant="secondary" 
          size="sm" 
          className="w-full bg-[#4353FF] text-white hover:bg-[#3242EE]"
          onClick={handleConnect}
          disabled={!getResolvedValue(value)}
        >
          <WebflowIcon size={16} className="mr-2 filter brightness-0 invert" />
          Next
        </Button>
      </div>
    );
  }

  switch (input.type) {
    case 'text':
      return (
        <div>
          {isVariableBinding(value) ? (
            renderBoundBadge()
          ) : (
            <div className="relative">
              <Input
                type="text"
                placeholder={input.placeholder || input.label}
                value={value || ''}
                onChange={(e) => handleValueChange(e.target.value)}
                className="pr-10"
              />
              {renderInlineVariableButton()}
            </div>
          )}
        </div>
      );
    case 'number':
      return (
        <div>
          {isVariableBinding(value) ? (
            renderBoundBadge()
          ) : (
            <div className="relative">
              <Input
                type="number"
                placeholder={input.placeholder || input.label}
                value={getResolvedValue(value) || ''}
                onChange={(e) => handleValueChange(Number(e.target.value))}
                className="pr-10"
              />
              {renderInlineVariableButton()}
            </div>
          )}
        </div>
      );
    case 'textarea':
      return (
        <div>
          {isVariableBinding(value) ? (
            renderBoundBadge('min-h-[80px]')
          ) : (
            <div className="relative">
              <Textarea
                placeholder={input.placeholder || input.label}
                value={getResolvedValue(value) || ''}
                onChange={(e) => handleValueChange(e.target.value)}
                className="pr-10"
              />
              {renderInlineVariableButton()}
            </div>
          )}
        </div>
      );
    case 'code':
      const codeValue = value || '';
      return (
        <div className="relative">
          {isVariableBinding(value) ? (
            renderBoundBadge('min-h-[100px]')
          ) : (
            <>
              <MonacoEditorField
                language={input.language || 'javascript'}
                value={codeValue}
                onChange={handleValueChange}
                nodeId={nodeId}
                height="150px"
                compact={true}
                onExpand={onExpandCode ? () => onExpandCode(input, codeValue) : undefined}
              />
            </>
          )}
        </div>
      );
    case 'select':
      const resolvedSelectValue = getResolvedValue(value);
      
      // Don't show variables for action/operation/returnType fields - these should only show predefined options
      const isStaticConfigField = input.name === 'action' || input.name === 'operation' || input.name === 'returnType';
      const shouldShowVariables = !isStaticConfigField && variables?.length > 0;
      
      return (
        <div>
          <Select onValueChange={handleValueChange} value={resolvedSelectValue || ''}>
            <SelectTrigger className={isLoading ? "animate-pulse" : ""}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading options...</span>
                </div>
              ) : (
                <SelectValue placeholder={input.placeholder || input.label}>
                  {isVariableBinding(value) ? getVariableDisplayName(value) : (options.find(opt => opt.value === resolvedSelectValue)?.label || resolvedSelectValue)}
                </SelectValue>
              )}
            </SelectTrigger>
            <SelectContent>
              {shouldShowVariables && (
                <>
                  {variables.map((variable, index) => (
                    <SelectItem key={`var-${index}`} value={variable.value}>
                      <div className="flex flex-col">
                        <span className="text-blue-600 font-medium">{variable.label}</span>
                        {variable.description && (
                          <span className="text-xs text-muted-foreground">{variable.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                  <div className="border-t my-1"></div>
                </>
              )}
              {options.filter(option => option.value !== '').map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
              {options.length === 0 && !isLoading && (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No options available
                </div>
              )}
              {isLoading && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm">Loading options...</span>
                </div>
              )}
            </SelectContent>
          </Select>
          {!isActionField && renderVariableInfo()}
        </div>
      );
    case 'boolean':
      const resolvedBoolValue = getResolvedValue(value);
      return (
        <div>
          <div className="flex items-center gap-2">
            <Switch
              checked={isVariableBinding(value) ? false : resolvedBoolValue || false}
              onCheckedChange={handleValueChange}
              id={input.name}
              disabled={isVariableBinding(value)}
            />
            
          </div>
          {renderVariableInfo()}
        </div>
      );
    case 'variable':
      return (
        <div>
          <div className="relative">
            <Input
              type="text"
              placeholder={input.placeholder || input.label}
              value={isVariableBinding(value) ? getDisplayValue() : getResolvedValue(value) || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              className="pr-10"
              readOnly={isVariableBinding(value)}
            />
            {renderInlineVariableButton()}
          </div>
          {renderVariableInfo()}
        </div>
      );
    case 'databaseSelector':
      return (
        <div>
          <div className="relative">
            <DatabaseSelectorField
              value={getResolvedValue(value) || ''}
              onChange={handleValueChange}
            />
            {renderInlineVariableButton()}
          </div>
          {renderVariableInfo()}
        </div>
      );
    case 'tableSelector':
      return (
        <div>
          <div className="relative">
            <TableSelectorField
              databaseId={getResolvedValue(getNodeInput('databaseId')) || ''}
              value={getResolvedValue(value) || ''}
              onChange={handleValueChange}
            />
            {renderInlineVariableButton()}
          </div>
          {renderVariableInfo()}
        </div>
      );
    case 'webflowFieldMapping':
      return (
        <div>
          <div className="relative">
            <WebflowFieldMappingButton
              collectionId={getResolvedValue(getNodeInput('collectionId'))}
              apiKey={getResolvedValue(getNodeInput('apiKey'))}
              value={getResolvedValue(value) || '{}'}
              onChange={handleValueChange}
            />
            {renderInlineVariableButton()}
          </div>
          {renderVariableInfo()}
        </div>
      );
    case 'clicdataSelect':
      const clicdataApiKey = getResolvedValue(getNodeInput('apiKey'));
      const clicdataApiVersion = getResolvedValue(getNodeInput('apiVersion'));
      return (
        <div>
          <ClicDataSelectField
            value={String(getResolvedValue(value) || '')}
            onChange={handleValueChange}
            apiKey={clicdataApiKey}
            apiVersion={clicdataApiVersion}
            optionType={input.clicdataOptionType || 'dataSets'}
            placeholder={input.placeholder || 'Select a table'}
            loadOnMount={true}
          />
          {renderVariableInfo()}
        </div>
      );
    case 'queryParamsEditor':
      return (
        <QueryParamsEditor
          value={Array.isArray(value) ? value : []}
          onChange={handleValueChange}
        />
      );
    case 'hidden':
      // Hidden fields are not rendered
      return null;
    default:
      return (
        <div>
          <div className="relative">
            <Input
              type="text"
              placeholder={input.placeholder || input.label}
              value={isVariableBinding(value) ? getDisplayValue() : getResolvedValue(value) || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              className="pr-10"
              readOnly={isVariableBinding(value)}
            />
            {renderInlineVariableButton()}
          </div>
          {renderVariableInfo()}
        </div>
      );
  }
};

export default NodeInputField;
