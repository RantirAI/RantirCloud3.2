
import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useFlowStore } from '@/lib/flow-store';
import { useTheme } from '@/hooks/useTheme';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EditorToolbar } from './editor/EditorToolbar';
import { ResultPreview } from './editor/ResultPreview';
import { AvailableVariablesPanel } from './editor/AvailableVariablesPanel';
import { Badge } from '@/components/ui/badge';
import { X, Link, Expand } from 'lucide-react';
import { nodeRegistry } from '@/lib/node-registry';
import { useNodeAliases } from '@/hooks/useNodeAliases';
import { useVariableResolver } from '@/hooks/useVariableResolver';

interface MonacoEditorFieldProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  nodeId: string;
  height?: string;
  compact?: boolean;
  onExpand?: () => void;
}

export function MonacoEditorField({ 
  value, 
  onChange, 
  language = 'javascript', 
  nodeId,
  height = '200px',
  compact = false,
  onExpand
}: MonacoEditorFieldProps) {
  const [showPreview, setShowPreview] = useState(true); // Open by default
  const [evaluatedResult, setEvaluatedResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showVariables, setShowVariables] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'variables' | 'flowvars'>('variables');
  const variablesListRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const { nodes, edges, debugLogs } = useFlowStore();
  const { theme } = useTheme();
  const [availableVariables, setAvailableVariables] = useState<{[key: string]: any}>({});
  const [flowVarsAndSecrets, setFlowVarsAndSecrets] = useState<{[key: string]: any}>({});
  const [nodeOutputVariables, setNodeOutputVariables] = useState<{[key: string]: any}>({});
  const { formatForDisplay, toDisplayPath, toStoragePath, registry } = useNodeAliases();
  const { flowVariables: dbFlowVariables, vaultSecrets } = useVariableResolver();
  
  // Check if value is a variable binding ({{...}})
  const isVariableBinding = value && typeof value === 'string' && 
    value.trim().startsWith('{{') && value.trim().endsWith('}}');
  
  // Extract variable name from binding if it exists
  const boundVariable = isVariableBinding ? 
    value.trim().substring(2, value.trim().length - 2) : null;

  // Convert stored value (with node IDs) to display value (with aliases)
  const toDisplayValue = (storedValue: string): string => {
    if (!storedValue) return storedValue || '';
    if (typeof storedValue !== 'string') return String(storedValue);
    // Replace all {{nodeId.path}} patterns with {{Alias.path}}
    return storedValue.replace(/\{\{([^}]+)\}\}/g, (match, innerPath) => {
      // Don't translate env variables or flow variables
      if (innerPath.startsWith('env.') || !innerPath.includes('.')) {
        return match;
      }
      const aliasPath = registry.nodeIdToAliasPath(innerPath);
      return `{{${aliasPath}}}`;
    });
  };

  // Convert display value (with aliases) back to storage value (with node IDs)
  const toStorageValue = (displayValue: string): string => {
    if (!displayValue) return displayValue;
    // Replace all {{Alias.path}} patterns with {{nodeId.path}}
    return displayValue.replace(/\{\{([^}]+)\}\}/g, (match, innerPath) => {
      // Don't translate env variables or flow variables
      if (innerPath.startsWith('env.') || !innerPath.includes('.')) {
        return match;
      }
      const nodeIdPath = registry.aliasToNodeIdPath(innerPath);
      return nodeIdPath ? `{{${nodeIdPath}}}` : match;
    });
  };

  // Display value for the editor (shows aliases)
  const displayEditorValue = toDisplayValue(value);

  // Function to get available variables from all upstream nodes (node outputs only)
  const getNodeOutputVariables = () => {
    const variables: {[key: string]: any} = {};

    // Get all upstream nodes (nodes that come before this node in the flow)
    const getUpstreamNodeIds = () => {
      const visited = new Set<string>();
      const upstream: string[] = [];
      
      const findUpstreamNodes = (currentNodeId: string) => {
        if (visited.has(currentNodeId)) return;
        visited.add(currentNodeId);
        
        const incomingEdges = edges.filter(edge => edge.target === currentNodeId);
        
        for (const edge of incomingEdges) {
          upstream.push(edge.source);
          findUpstreamNodes(edge.source);
        }
      };
      
      findUpstreamNodes(nodeId);
      return [...new Set(upstream)];
    };

    const upstreamNodeIds = getUpstreamNodeIds();
    
    // For each upstream node, get available outputs from node definition
    upstreamNodeIds.forEach(sourceId => {
      const sourceNode = nodes.find(n => n.id === sourceId);
      if (!sourceNode) return;
      
      // First, try to get actual values from debug logs
      const nodeLogs = debugLogs.filter(log => log.nodeId === sourceId && log.type === 'output');
      if (nodeLogs.length > 0) {
        const latestLog = nodeLogs[nodeLogs.length - 1];
        if (latestLog.data) {
          Object.entries(latestLog.data).forEach(([key, outputValue]) => {
            variables[`${sourceId}.${key}`] = outputValue;
          });
          return;
        }
      }
      
      // If no debug logs, get available outputs from node plugin definition
      const nodePlugin = nodeRegistry.getPlugin(sourceNode.data.type as string);
      if (nodePlugin) {
        const staticOutputs = nodePlugin.outputs || [];
        staticOutputs.forEach((output: any) => {
          variables[`${sourceId}.${output.name}`] = `<${output.type || 'unknown'}>`;
        });
        
        const dynamicOutputs = nodePlugin.getDynamicOutputs?.(sourceNode.data.inputs || {}) || [];
        dynamicOutputs.forEach((output: any) => {
          variables[`${sourceId}.${output.name}`] = `<${output.type || 'unknown'}>`;
        });
      }
    });
    
    return variables;
  };

  // Build flow vars & secrets as a separate map
  const getFlowVarsAndSecrets = () => {
    const variables: {[key: string]: any} = {};
    vaultSecrets.forEach(s => {
      variables[`env.${s.name}`] = '<secret>';
    });
    dbFlowVariables.forEach(v => {
      variables[v.name] = v.value || '<string>';
    });
    return variables;
  };

  // Combined for autocomplete / code evaluation
  const getAvailableVariables = () => {
    return { ...getFlowVarsAndSecrets(), ...getNodeOutputVariables() };
  };

  // Update available variables when nodes, edges, or debug logs change
  useEffect(() => {
    const nodeVars = getNodeOutputVariables();
    const flowVars = getFlowVarsAndSecrets();
    setNodeOutputVariables(nodeVars);
    setFlowVarsAndSecrets(flowVars);
    setAvailableVariables({ ...flowVars, ...nodeVars });
  }, [nodes, edges, debugLogs, nodeId, dbFlowVariables, vaultSecrets]);

  // Get the current bound variable value if it exists
  const getBoundVariableValue = () => {
    if (boundVariable && availableVariables[boundVariable]) {
      return availableVariables[boundVariable];
    }
    return null;
  };

  // Handle clicks outside the variables list to close it when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        variablesListRef.current && 
        !variablesListRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('.variables-toggle-btn')
      ) {
        setShowVariables(false);
      }
    };

    // Only add the event listener if the variables list is shown
    if (showVariables) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showVariables]);

  // Setup Monaco editor when it's mounted
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Add custom completions for variables with human-readable aliases
    monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems: () => {
        const variables = getAvailableVariables();
        const suggestions = Object.keys(variables).map(varName => {
          // Show human-readable alias in autocomplete
          const displayName = formatForDisplay(varName, ' > ');
          return {
            label: displayName, // Show: "Webhook Handler > body"
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: varName, // Insert the actual node ID path
            detail: `Type: ${typeof variables[varName]}`,
            documentation: `Path: ${varName}\n\nValue:\n${JSON.stringify(variables[varName], null, 2).slice(0, 500)}`,
          };
        });

        // Add common functions
        const commonSuggestions = [
          {
            label: 'return',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'return ',
            documentation: 'Return a value from this node'
          },
          {
            label: 'Object.keys',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'Object.keys(${1:object})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Get all keys from an object'
          },
          {
            label: 'map function',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: '${1:array}.map(${2:item} => {\n\t${3}\n})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Map over an array'
          }
        ];

        return { suggestions: [...suggestions, ...commonSuggestions] };
      }
    });
  };

  // Handle stable onChange function for the editor to prevent focus loss
  // Converts display format (with aliases) back to storage format (with node IDs)
  const handleEditorChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      // Convert the display value (aliases) back to storage value (node IDs)
      const storageValue = toStorageValue(newValue);
      onChange(storageValue);
    }
  };

  // Evaluate code and update preview
  const evaluateCode = () => {
    // If it's a variable binding, just show the bound variable value
    if (isVariableBinding) {
      const boundValue = getBoundVariableValue();
      if (boundValue !== null) {
        setEvaluatedResult(boundValue);
        setError(null);
      } else {
        setError(`Variable "${boundVariable}" not found or has no value`);
        setEvaluatedResult(null);
      }
      return;
    }

    try {
      const variables = getAvailableVariables();
      
      // Create variable declarations for each available variable
      // Also expose nested properties as flat accessible paths
      let variableDeclarations = '';
      
      // Helper to recursively add nested paths
      const addNestedPaths = (obj: any, prefix: string, maxDepth: number = 5) => {
        if (maxDepth <= 0 || typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
          return;
        }
        Object.keys(obj).forEach(key => {
          const nestedKey = `${prefix}.${key}`;
          const jsNestedName = nestedKey.replace(/[\.\-]/g, '_');
          try {
            variableDeclarations += `const ${jsNestedName} = ${JSON.stringify(obj[key])};\n`;
          } catch {
            // Skip circular references
          }
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            addNestedPaths(obj[key], nestedKey, maxDepth - 1);
          }
        });
      };
      
      Object.entries(variables).forEach(([name, value]) => {
        // Replace dots AND dashes with underscores for valid JS variable names
        const jsVarName = name.replace(/[\.\-]/g, '_');
        try {
          variableDeclarations += `const ${jsVarName} = ${JSON.stringify(value)};\n`;
        } catch {
          // Skip circular references
        }
        // Also expose nested properties for deep path access
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          addNestedPaths(value, name);
        }
      });
      
      // Process the code to handle {{brackets}} and convert variable references to valid JS names
      let processedCode = value;
      
      // First, extract and replace {{nodeId.property.nested.path}} syntax with valid JS variable names
      processedCode = processedCode.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
        // Convert to valid JS name: replace dots and dashes with underscores
        return varName.replace(/[\.\-]/g, '_');
      });
      
      // Also replace direct variable references (without brackets) for backwards compatibility
      Object.keys(variables).forEach(varName => {
        const jsVarName = varName.replace(/[\.\-]/g, '_');
        // Escape special regex chars in variable name (dots and dashes)
        const escapedVarName = varName.replace(/[.\-]/g, '\\$&');
        // Replace direct variable references, ensuring we don't replace partial matches
        const regex = new RegExp(`\\b${escapedVarName}\\b`, 'g');
        processedCode = processedCode.replace(regex, jsVarName);
      });
      // Create a function that has access to variables from previous nodes
      const evalCode = new Function(`
        try {
          ${variableDeclarations}
          ${processedCode}
        } catch (error) {
          return { __error: error.message };
        }
      `);
      
      // Execute the function with variable values
      const result = evalCode();
      
      if (result && typeof result === 'object' && '__error' in result) {
        setError(result.__error as string);
        setEvaluatedResult(null);
      } else {
        setError(null);
        setEvaluatedResult(result);
      }
    } catch (err: any) {
      setError(err.message);
      setEvaluatedResult(null);
    }
  };

  // Handle toggling between variable binding and custom code
  const toggleBindingMode = () => {
    if (isVariableBinding) {
      // Switch from binding to custom code
      onChange('// Write custom code here\n');
    } else {
      // Switch to binding mode with empty binding
      onChange('{{}}');
      // When switching to binding mode, also show the variables list
      setShowVariables(true);
    }
  };

  // Handle inserting a variable reference
  const handleSelectVariable = (variableName: string) => {
    // Always insert with brackets for easier use
    const insertText = `{{${variableName}}}`;
    
    if (isVariableBinding) {
      // If already in binding mode, replace the entire value
      onChange(insertText);
    } else {
      // In custom code mode, insert at cursor position with brackets
      if (editorRef.current) {
        const selection = editorRef.current.getSelection();
        editorRef.current.executeEdits('insert-variable', [{
          range: selection,
          text: insertText,
          forceMoveMarkers: true
        }]);
        // Focus back on editor
        editorRef.current.focus();
      }
    }
    // Keep the variables list open to allow multiple selections
    // Only close if in binding mode and a selection was made
    if (isVariableBinding) {
      setShowVariables(false);
    }
  };

  // Toggle the variables dropdown
  const toggleVariables = () => {
    setShowVariables(prev => !prev);
  };

  // Clear the current variable binding
  const clearVariableBinding = () => {
    onChange('// Write custom code here\n');
  };

  // Generate a list of connected nodes and their variable names for display at the top of the editor
  const getConnectedNodesList = () => {
    const nodeOutputs = new Map();
    
    // Get connected nodes to this node
    const connectedNodeIds = edges
      .filter(edge => edge.target === nodeId)
      .map(edge => edge.source);
    
    // For each connected node, get its details
    connectedNodeIds.forEach(sourceId => {
      const sourceNode = nodes.find(n => n.id === sourceId);
      if (!sourceNode) return;
      
      // Get node plugin outputs
      const nodePlugin = window.flow?.nodeRegistry?.getPlugin(sourceNode.data.type);
      if (nodePlugin?.outputs) {
        const outputs = nodePlugin.outputs.map(output => ({
          name: `${sourceId}.${output.name}`,
          description: output.description || '',
          type: output.type || 'unknown'
        }));
        
        // Store node label and its output variables
        nodeOutputs.set(sourceNode.data.label, outputs);
      }
    });
    
    return nodeOutputs;
  };

  const connectedNodes = getConnectedNodesList();
  const hasConnectedNodes = connectedNodes.size > 0;
  // Normalize value to string for safe rendering/operations
  const displayValue: string = typeof value === 'string' ? value : String(value ?? '');

  // Compact summary when content exists
  const renderCompactSummary = () => {
    // Ensure value is a string before calling string methods
    const stringValue = typeof value === 'string' ? value : String(value || '');
    if (!compact || !stringValue || stringValue.trim() === '') return null;
    
    if (isVariableBinding && boundVariable) {
      // Show human-readable alias in the badge
      const displayPath = formatForDisplay(boundVariable, ' > ');
      return (
        <div 
          className="px-2.5 py-2 border-b cursor-pointer bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50 transition-colors" 
          onClick={onExpand}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm bg-primary/10 border border-primary/20">
                <Link className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium">Bound to</span>
                <div className="font-medium text-xs text-foreground truncate">{displayPath}</div>
              </div>
            </div>
            <Expand className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          </div>
        </div>
      );
    }
    
    // For custom code, show a preview snippet
    const codePreview = stringValue.split('\n')[0].trim();
    const lineCount = stringValue.split('\n').length;
    
    return (
      <div className="p-2 bg-muted border-b cursor-pointer hover:bg-muted/80" onClick={onExpand}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700">Code:</span>
            <code className="text-xs bg-background px-2 py-1 rounded border max-w-[200px] truncate">
              {codePreview || '// Custom code...'}
            </code>
            {lineCount > 1 && (
              <span className="text-xs text-muted-foreground">+{lineCount - 1} more lines</span>
            )}
          </div>
          <Expand className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>
    );
  };

  return (
    <div className="border rounded h-full flex flex-col overflow-hidden">
      {!compact && (
        <EditorToolbar 
          language={language}
          isVariableBinding={isVariableBinding}
          availableVariablesCount={Object.keys(availableVariables).length}
          toggleBindingMode={toggleBindingMode}
          evaluateCode={evaluateCode}
          togglePreview={() => setShowPreview(!showPreview)}
          showPreview={showPreview}
          toggleVariables={toggleVariables}
        />
      )}
      
      {/* Compact summary for when there's content */}
      {renderCompactSummary()}
      
      {/* Current binding display for non-compact mode */}
      {!compact && isVariableBinding && boundVariable && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b px-3 py-2 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xs mr-2">Bound to:</span>
            <Badge 
             variant="outline" 
              className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 px-2 py-0.5 flex items-center gap-1"
            >
              <Link className="h-3.5 w-3.5 mr-0.5" />
              {formatForDisplay(boundVariable, ' > ')}
            </Badge>
          </div>
          <button 
            onClick={clearVariableBinding}
            className="h-5 w-5 rounded-full hover:bg-blue-200 flex items-center justify-center"
            title="Clear binding"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      
      {/* Show connected nodes and their variables at the top of the editor */}
      {!compact && hasConnectedNodes && !isVariableBinding && (
        <div className="bg-muted border-b px-3 py-1.5 text-xs">
          <div className="font-medium mb-1">Available Variables:</div>
          <div className="flex flex-wrap gap-2">
            {Array.from(connectedNodes.entries()).map(([nodeLabel, variables]) => (
              <div key={nodeLabel} className="flex flex-col">
                <div className="text-xs font-semibold text-gray-700">{nodeLabel}:</div>
                <div className="flex flex-wrap gap-1">
                  {variables.map((variable: {name: string, description: string, type: string}) => (
                    <button
                      key={variable.name}
                      onClick={() => handleSelectVariable(variable.name)}
                      className="px-1.5 py-0.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded text-xs flex items-center gap-1"
                      title={`${variable.description} (${variable.type})`}
                    >
                      {variable.name.split('.').pop()}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className={`flex flex-1 min-h-0 overflow-hidden`}>
        {/* Main editor area */}
        <div className={`${showPreview && !compact ? "flex-1" : "w-full"} relative flex flex-col min-w-0`}>
          {compact ? (
            // In compact mode, show a simple text input-like view
            <div 
              className="w-full h-full min-h-[40px] p-2 bg-background dark:bg-background border-0 cursor-pointer flex items-center text-sm text-muted-foreground hover:bg-muted/50 dark:hover:bg-muted/20"
              onClick={onExpand}
            >
              {displayValue.trim() === '' && (
                <span>Click to add code...</span>
              )}
            </div>
          ) : (
            <Editor
              height="100%"
              language={language}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              value={displayEditorValue}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                suggestOnTriggerCharacters: true,
              }}
              onMount={handleEditorDidMount}
            />
          )}
        </div>
        
        {/* Side panel with preview and variables */}
        {showPreview && !compact && (
          <div className="w-80 border-l border-border flex flex-col overflow-hidden bg-card">
            {/* Live Preview Section */}
            <div className="flex flex-col border-b border-border">
              <div className="p-2 text-sm font-medium border-b border-border bg-muted/30 text-foreground">
                Live Preview
              </div>
              <ScrollArea className="max-h-48">
                <div className="p-3">
                  <ResultPreview error={error} result={evaluatedResult} />
                </div>
              </ScrollArea>
            </div>
            
            {/* Tabbed Variables Section */}
            <div className="flex border-b border-border bg-muted/30">
              <button
                onClick={() => setSidebarTab('variables')}
                className={`flex-1 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide transition-colors ${
                  sidebarTab === 'variables' 
                    ? 'text-foreground border-b-2 border-primary bg-background' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Variables ({Object.keys(nodeOutputVariables).length})
              </button>
              <button
                onClick={() => setSidebarTab('flowvars')}
                className={`flex-1 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide transition-colors ${
                  sidebarTab === 'flowvars' 
                    ? 'text-foreground border-b-2 border-primary bg-background' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Vars & Secrets ({Object.keys(flowVarsAndSecrets).length})
              </button>
            </div>

            {/* Tab Content */}
            {sidebarTab === 'variables' ? (
              <AvailableVariablesPanel
                availableVariables={nodeOutputVariables}
                nodes={nodes}
                onSelectVariable={handleSelectVariable}
                formatForDisplay={formatForDisplay}
              />
            ) : (
              <AvailableVariablesPanel
                availableVariables={flowVarsAndSecrets}
                nodes={nodes}
                onSelectVariable={handleSelectVariable}
                formatForDisplay={formatForDisplay}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
