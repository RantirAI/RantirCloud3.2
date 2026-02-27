
import { NodePlugin } from '@/types/node-plugin';
import { Cpu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const aiAgentNode: NodePlugin = {
  type: 'ai-agent',
  name: 'AI Agent',
  description: 'Create an AI agent with instructions and settings',
  category: 'action',
  icon: Cpu,
  color: '#9B87F5',
  inputs: [
    {
      name: 'chatToolCalling',
      label: 'Enable Tool Calling',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Allow the AI agent to trigger connected downstream flow actions (e.g., send email, log to database) via tool calling during chat conversations.',
    },
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your AI service API key (OpenAI, Anthropic, MiniMax). Use {{env.SECRET_NAME}} for vault secrets.',
    },
    {
      name: 'model',
      label: 'Model',
      type: 'select',
      required: true,
      default: 'gpt-4o',
      options: [
        { label: 'GPT-4o', value: 'gpt-4o' },
        { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
        { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
        { label: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' },
        { label: 'Claude Haiku 4.5', value: 'claude-haiku-4-5' },
        { label: 'MiniMax M2.5', value: 'minimax-m2.5' },
        { label: 'MiniMax M2.5 Lightning', value: 'minimax-m2.5-lightning' },
      ],
      description: 'The AI model to use',
    },
    {
      name: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: true,
      placeholder: 'Provide instructions for the AI agent...',
      description: 'Instructions that define the AI agent behavior',
    },
    {
      name: 'inputData',
      label: 'Input Data',
      type: 'code',
      language: 'json',
      required: false,
      description: 'Data to send to the AI agent (JSON format)',
      jsonSchema: {
        type: 'object',
        description: 'Input data structure for the AI agent',
        properties: {
          messages: {
            type: 'array',
            description: 'Messages to process',
            items: {
              type: 'object',
              properties: {
                role: { type: 'string', enum: ['system', 'user', 'assistant'] },
                content: { type: 'string' }
              }
            }
          },
          context: {
            type: 'object',
            description: 'Context information for the AI',
            properties: {
              documents: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    content: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      name: 'temperature',
      label: 'Temperature',
      type: 'number',
      required: false,
      default: 0.7,
      description: 'Controls randomness (0-1)',
    },
    {
      name: 'knowledgeFiles',
      label: 'Knowledge Files',
      type: 'hidden' as any,
      required: false,
      default: [],
      description: 'Uploaded reference documents for AI context',
    },
    {
      name: 'postResponseHooks',
      label: 'Post-Response Hooks',
      type: 'hidden' as any,
      required: false,
      default: [],
      description: 'Node IDs that execute automatically after every AI response',
    }
  ],
  outputs: [
    {
      name: 'response',
      type: 'string',
      description: 'The AI agent response',
      jsonSchema: { type: 'string', description: 'The generated text response from the AI model' }
    },
    {
      name: 'userMessage',
      type: 'string',
      description: 'The user message that triggered this response (available in chat mode)',
      jsonSchema: { type: 'string', description: 'The original user message from the chat widget' }
    },
    {
      name: 'sessionId',
      type: 'string',
      description: 'The chat session identifier (available in chat mode)',
      jsonSchema: { type: 'string', description: 'Unique session ID for the chat conversation' }
    },
    {
      name: 'conversationHistory',
      type: 'array',
      description: 'Full conversation history (available in chat mode)',
      jsonSchema: { type: 'array', items: { type: 'object', properties: { role: { type: 'string' }, content: { type: 'string' } } } }
    },
    {
      name: 'metadata',
      type: 'object',
      description: 'Additional metadata about the response',
      jsonSchema: {
        type: 'object',
        properties: {
          model: { type: 'string' },
          timestamp: { type: 'string' },
          tokens: {
            type: 'object',
            properties: {
              prompt: { type: 'number' },
              completion: { type: 'number' },
              total: { type: 'number' }
            }
          }
        }
      }
    }
  ],
  async execute(inputs, context) {
    const { apiKey, model, instructions, inputData, temperature, knowledgeFiles } = inputs;

    if (!apiKey) {
      throw new Error('API key is required. Use {{env.SECRET_NAME}} for vault secrets.');
    }

    // Parse inputData
    let parsedData: any = {};
    if (inputData) {
      if (typeof inputData === 'string') {
        try { parsedData = JSON.parse(inputData); } catch { parsedData = { input: inputData }; }
      } else if (typeof inputData === 'object') {
        parsedData = inputData;
      } else {
        parsedData = { value: inputData };
      }
    }

    // Build messages array from inputData
    let messages: any[] = [];
    if (parsedData?.messages && Array.isArray(parsedData.messages)) {
      messages = parsedData.messages;
    } else {
      const dataStr = typeof parsedData === 'object' ? JSON.stringify(parsedData) : String(parsedData);
      messages = [{ role: 'user', content: dataStr.length > 0 && dataStr !== '{}' ? dataStr : 'Hello' }];
    }

    // Get flowProjectId from context if available
    const flowProjectId = (context as any)?.flowProjectId || null;

    // Call the edge function
    const { data, error } = await supabase.functions.invoke('ai-agent-proxy', {
      body: {
        apiKey,
        model,
        instructions,
        messages,
        inputData: parsedData,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        knowledgeFiles: knowledgeFiles || [],
        flowProjectId,
      },
    });

    if (error) {
      throw new Error(`AI Agent error: ${error.message}`);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    // Extract user message from input messages for flow context
    const lastUserMessage = messages
      .filter((m: any) => m.role === 'user')
      .pop();

    return {
      response: data.response || '',
      userMessage: lastUserMessage?.content || '',
      metadata: data.metadata || { model, timestamp: new Date().toISOString(), tokens: { prompt: 0, completion: 0, total: 0 } },
    };
  }
};
