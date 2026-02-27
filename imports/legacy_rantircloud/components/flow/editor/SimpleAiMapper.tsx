
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { Wand, Loader2 } from 'lucide-react';
import { useFlowStore } from '@/lib/flow-store';
import { nodeRegistry } from '@/lib/node-registry';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SimpleAiMapperProps {
  sourceNodeId: string;
  targetNodeId: string;
  targetField: string;
  onFieldsGenerated: (fields: any) => void;
}

export function SimpleAiMapper({
  sourceNodeId,
  targetNodeId,
  targetField,
  onFieldsGenerated
}: {
  sourceNodeId: string;
  targetNodeId: string;
  targetField: string;
  onFieldsGenerated: (fields: any) => void;
}) {
  const [instructions, setInstructions] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const { nodes } = useFlowStore();

  const sourceNode = nodes.find(n => n.id === sourceNodeId);
  const targetNode = nodes.find(n => n.id === targetNodeId);
  
  const generateMapping = async () => {
    if (!instructions.trim()) {
      toast.error('Please provide instructions for the AI');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Get source node outputs schema
      const sourcePlugin = sourceNode ? nodeRegistry.getPlugin(sourceNode.data.type) : null;
      const sourceOutputs = sourcePlugin?.outputs || [];
      
      // Get target input field schema
      const targetPlugin = targetNode ? nodeRegistry.getPlugin(targetNode.data.type) : null;
      const targetInput = targetPlugin?.inputs?.find(input => input.name === targetField);

      // Generate a reasonable structure based on the instructions
      const jsonStructure = generateLocalJsonStructure(instructions, sourceOutputs, sourceNode, targetInput);
      
      onFieldsGenerated(jsonStructure);
      toast.success('Successfully generated JSON structure');
      
    } catch (error) {
      console.error('Error generating mapping:', error);
      toast.error('Failed to generate mapping');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Function to generate a reasonable JSON structure locally
  const generateLocalJsonStructure = (prompt: string, sourceOutputs: any[], sourceNode: any, targetInput: any) => {
    // Extract keywords from prompt
    const promptLower = prompt.toLowerCase();
    const keywords = {
      user: promptLower.includes('user'),
      profile: promptLower.includes('profile'),
      product: promptLower.includes('product'),
      order: promptLower.includes('order'),
      payment: promptLower.includes('payment'),
      transaction: promptLower.includes('transaction'),
      weather: promptLower.includes('weather'),
      reservation: promptLower.includes('reservation'),
      subscription: promptLower.includes('subscription'),
    };
    
    // Basic structure for each source node data type based on node type
    let mapping: Record<string, any> = {};
    
    // Generate source node variable references
    const sourcePrefix = `{{${sourceNodeId}.`;
    
    if (sourceNode?.data.type === 'data-table') {
      if (keywords.user || keywords.profile) {
        mapping = {
          user: {
            name: sourcePrefix + "user.name}}",
            email: sourcePrefix + "user.email}}",
            id: sourcePrefix + "user.id}}"
          },
          preferences: {
            theme: sourcePrefix + "user.preferences.theme}}",
            language: sourcePrefix + "user.preferences.language}}"
          }
        };
      } else if (keywords.product || keywords.order) {
        mapping = {
          order: {
            id: sourcePrefix + "order.id}}",
            date: sourcePrefix + "order.date}}",
            status: sourcePrefix + "order.status}}"
          },
          items: [
            { 
              name: sourcePrefix + "items[0].name}}", 
              price: sourcePrefix + "items[0].price}}",
              quantity: sourcePrefix + "items[0].quantity}}"
            }
          ],
          customer: {
            id: sourcePrefix + "customer.id}}",
            email: sourcePrefix + "customer.email}}"
          }
        };
      } else if (keywords.payment || keywords.transaction) {
        mapping = {
          transaction: {
            id: sourcePrefix + "transaction.id}}",
            amount: sourcePrefix + "transaction.amount}}",
            currency: sourcePrefix + "transaction.currency}}",
            status: sourcePrefix + "transaction.status}}",
            date: sourcePrefix + "transaction.date}}"
          },
          paymentMethod: {
            type: sourcePrefix + "paymentMethod.type}}",
            lastFour: sourcePrefix + "paymentMethod.lastFour}}"
          }
        };
      } else if (keywords.weather) {
        mapping = {
          location: sourcePrefix + "location}}",
          current: {
            temperature: sourcePrefix + "weather.temperature}}",
            condition: sourcePrefix + "weather.condition}}",
            humidity: sourcePrefix + "weather.humidity}}"
          },
          forecast: [
            {
              day: "Today",
              temperature: sourcePrefix + "forecast[0].temperature}}",
              condition: sourcePrefix + "forecast[0].condition}}"
            },
            {
              day: "Tomorrow",
              temperature: sourcePrefix + "forecast[1].temperature}}",
              condition: sourcePrefix + "forecast[1].condition}}"
            }
          ]
        };
      } else {
        // Default for data-table
        mapping = {
          data: {
            result: sourcePrefix + "result}}",
            records: sourcePrefix + "count}}"
          },
          metadata: {
            success: sourcePrefix + "success}}",
            timestamp: new Date().toISOString()
          }
        };
      }
    } else if (sourceNode?.data.type === 'http-request') {
      mapping = {
        response: {
          status: sourcePrefix + "status}}",
          data: sourcePrefix + "data}}",
          headers: sourcePrefix + "headers}}"
        },
        metadata: {
          requestTime: sourcePrefix + "requestTime}}",
          url: sourcePrefix + "url}}"
        }
      };
    } else if (sourceNode?.data.type === 'webflow') {
      mapping = {
        items: sourcePrefix + "items}}",
        pagination: {
          total: sourcePrefix + "total}}",
          count: sourcePrefix + "count}}"
        },
        siteInfo: {
          name: sourcePrefix + "site.name}}",
          id: sourcePrefix + "site.id}}"
        }
      };
    } else {
      // Generic fallback
      mapping = {
        data: {
          timestamp: new Date().toISOString(),
          source: sourceNode?.data.type || "unknown"
        },
        metadata: {
          timestamp: new Date().toISOString(),
          source: sourceNode?.data.type || "unknown"
        }
      };
      
      // Add available outputs as properties
      sourceOutputs.forEach(output => {
        if (mapping.data) { // Check that data exists before accessing
          mapping.data[output.name] = sourcePrefix + output.name + "}}";
        }
      });
    }
    
    // If this is for an AI agent instructions field, adapt the structure
    if (targetNode?.data.type === 'ai-agent' && targetField === 'instructions') {
      const sourceName = sourceNode?.data.label || 'data source';
      const instructions = `You are an AI assistant working with data from ${sourceName}.\n\n` +
        `Use the following data structure to answer questions:\n` +
        `\${JSON.stringify(data, null, 2)}\n\n` +
        `If the user mentions any information related to the data, access it and provide helpful insights.`;
      
      return instructions;
    }
    
    return mapping;
  };
  
  return (
    <div className="space-y-4 font-sans">
      <Alert className="bg-purple-50 border-purple-200">
        <Wand className="h-4 w-4 text-purple-500" />
        <AlertDescription className="text-purple-700">
          Describe what you want to map, and AI will generate the structure for you in real-time.
        </AlertDescription>
      </Alert>
      
      <div className="space-y-2">
        <Textarea
          placeholder="Describe what you want to map... (e.g., 'Extract the user's first name and email from the response and map them to separate fields')"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="min-h-[100px] font-sans resize-vertical focus:ring-purple-500 focus:border-purple-500"
        />
        
        <Button 
          onClick={generateMapping}
          disabled={isGenerating || !instructions.trim()}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand className="mr-2 h-4 w-4" />
              Generate JSON Structure
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
