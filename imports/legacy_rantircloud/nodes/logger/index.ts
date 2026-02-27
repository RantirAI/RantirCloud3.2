import { NodePlugin } from '@/types/node-plugin';
import { FileText } from 'lucide-react';
import { nodeRegistry } from '@/lib/node-registry';

export const loggerNode: NodePlugin = {
  type: 'logger',
  name: 'Logger',
  description: 'Log data to the monitoring dashboard. Only logs when enabled. Useful for debugging and tracking flow execution.',
  category: 'action',
  icon: FileText,
  color: '#8B5CF6',
  inputs: [
    {
      name: 'enabled',
      label: 'Logging Enabled',
      type: 'boolean',
      required: true,
      default: true,
      description: 'Enable or disable logging. When disabled, this node passes data through without logging.',
    },
    {
      name: 'destination',
      label: 'Log Destination',
      type: 'select',
      required: true,
      default: 'dashboard',
      options: [
        { label: 'Monitoring Dashboard', value: 'dashboard', description: 'Save to database for persistent monitoring' },
        { label: 'Debugger Only', value: 'debugger', description: 'Show in debugger panel (no DB save)' },
        { label: 'Both', value: 'both', description: 'Log to dashboard and debugger' },
      ],
      description: 'Where to send the log entry',
    },
    {
      name: 'logLevel',
      label: 'Log Level',
      type: 'select',
      required: true,
      default: 'info',
      options: [
        { label: 'Debug', value: 'debug', description: 'Detailed debugging information' },
        { label: 'Info', value: 'info', description: 'General information messages' },
        { label: 'Warning', value: 'warning', description: 'Warning messages' },
        { label: 'Error', value: 'error', description: 'Error messages' },
      ],
      description: 'The severity level of the log entry',
    },
    {
      name: 'message',
      label: 'Log Message',
      type: 'text',
      required: true,
      placeholder: 'Enter a descriptive message for this log entry',
      description: 'A descriptive message for the log entry. Supports variable binding.',
    },
    {
      name: 'dataSource',
      label: 'Data to Log',
      type: 'select',
      required: false,
      description: 'Select which node output to log. The data will be stored in the log metadata.',
      dynamic: true,
      dynamicOptions: (nodes, edges, currentNodeId) => {
        const connectedNodeIds = edges
          .filter(edge => edge.target === currentNodeId)
          .map(edge => edge.source);

        const options: { label: string; value: string; description?: string }[] = [
          { label: 'None', value: '__none__', description: 'Log message only without data' }
        ];

        connectedNodeIds.forEach(sourceNodeId => {
          const sourceNode = nodes.find(n => n.id === sourceNodeId);
          if (!sourceNode) return;

          const plugin = nodeRegistry.getPlugin(sourceNode.data.type);
          if (!plugin || !plugin.outputs) return;

          plugin.outputs.forEach(output => {
            options.push({
              label: `${sourceNode.data.label} > ${output.name}`,
              value: `{{${sourceNodeId}.${output.name}}}`,
              description: output.description,
            });
          });
        });

        return options;
      },
    },
    {
      name: 'customData',
      label: 'Custom Data (JSON)',
      type: 'code',
      language: 'json',
      required: false,
      placeholder: '{\n  "key": "value"\n}',
      description: 'Optional custom JSON data to include in the log metadata. Supports variable binding.',
    },
  ],
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Returns true if logger executed successfully. Use in Condition nodes to check execution status.',
    },
    {
      name: 'logged',
      type: 'boolean',
      description: 'Whether the log was successfully written',
    },
    {
      name: 'logId',
      type: 'string',
      description: 'The ID of the created log entry (if logging was enabled)',
    },
    {
      name: 'passthrough',
      type: 'object',
      description: 'The input data passed through unchanged',
    },
  ],
  execute: async (inputs, context) => {
    const { destination, logLevel, message, dataSource, customData } = inputs;
    
    // Handle enabled - could be boolean, string, or undefined
    const enabledRaw = inputs.enabled;
    const isEnabled = enabledRaw === true || enabledRaw === 'true' || enabledRaw === undefined;
    
    // If logging is disabled, just pass through
    if (!isEnabled) {
      return {
        success: true, // Logger executed but logging disabled
        logged: false,
        logId: null,
        passthrough: context.variables,
      };
    }

    // Resolve the data source variable if provided
    let resolvedData: any = null;
    if (dataSource && dataSource !== '__none__' && dataSource.startsWith('{{') && dataSource.endsWith('}}')) {
      const variablePath = dataSource.slice(2, -2); // Remove {{ and }}
      resolvedData = context.variables[variablePath];
    }

    // Parse custom data if provided
    let parsedCustomData: any = null;
    if (customData) {
      try {
        // Replace variable references in the JSON string
        let resolvedCustomData = customData;
        const variablePattern = /\{\{([^}]+)\}\}/g;
        let match;
        while ((match = variablePattern.exec(customData)) !== null) {
          const varPath = match[1];
          const varValue = context.variables[varPath];
          resolvedCustomData = resolvedCustomData.replace(
            match[0],
            JSON.stringify(varValue) || 'null'
          );
        }
        parsedCustomData = JSON.parse(resolvedCustomData);
      } catch (e) {
        console.warn('Logger: Failed to parse custom data as JSON:', e);
        parsedCustomData = { raw: customData };
      }
    }

    // Build the metadata object
    const metadata: Record<string, any> = {
      nodeId: context.nodeId,
      timestamp: new Date().toISOString(),
    };

    if (resolvedData !== null) {
      metadata.data = resolvedData;
    }

    if (parsedCustomData !== null) {
      metadata.customData = parsedCustomData;
    }

    const logDestination = destination || 'dashboard';

    // The actual logging will be done by the flow-executor edge function
    // We return the log info so the executor can save it
    return {
      success: true, // Logger executed successfully
      logged: true,
      logId: logDestination === 'debugger' ? null : `pending-${Date.now()}`,
      passthrough: context.variables,
      _logEntry: {
        level: logLevel || 'info',
        message: message || 'Logger node executed',
        metadata,
        destination: logDestination,
      },
    };
  },
};
