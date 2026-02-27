import { NodePlugin } from '@/types/node-plugin';
import { User } from 'lucide-react';

// Helper function to resolve variables
const resolveVariable = (variableBinding: string): string => {
  if (typeof variableBinding !== 'string') {
    return variableBinding;
  }

  // Handle environment variables
  if (variableBinding.startsWith('env.')) {
    const envKey = variableBinding.replace('env.', '');
    const envVars = JSON.parse(localStorage.getItem('flow-env-vars') || '{}');
    return envVars[envKey] || '';
  }

  // Handle flow variables
  const flowId = window.location.pathname.split('/').pop();
  if (flowId) {
    const flowVariables = JSON.parse(localStorage.getItem(`flow-variables-${flowId}`) || '{}');
    return flowVariables[variableBinding] || variableBinding;
  }

  return variableBinding;
};

export const apolloNode: NodePlugin = {
  type: 'apollo',
  name: 'Apollo',
  description: 'Match persons and enrich companies using Apollo API for sales intelligence and prospecting',
  category: 'action',
  icon: User,
  color: '#6B46C1',
  inputs: [
    {
      name: 'apiKey',
      label: 'Apollo API Key',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Your Apollo API key'
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Match Person', value: 'match_person' },
        { label: 'Enrich Company', value: 'enrich_company' }
      ],
      description: 'Select the Apollo action to perform'
    }
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs?.action;
    if (!action) return [];

    const dynamicInputs = [];

    switch (action) {
      case 'match_person':
        dynamicInputs.push(
          {
            name: 'email',
            label: 'Email',
            type: 'text',
            description: 'Person email address'
          },
          {
            name: 'first_name',
            label: 'First Name',
            type: 'text',
            description: 'Person first name'
          },
          {
            name: 'last_name',
            label: 'Last Name',
            type: 'text',
            description: 'Person last name'
          },
          {
            name: 'organization_name',
            label: 'Organization Name',
            type: 'text',
            description: 'Organization name for better matching'
          },
          {
            name: 'domain',
            label: 'Company Domain',
            type: 'text',
            description: 'Company domain (e.g., example.com)'
          }
        );
        break;

      case 'enrich_company':
        dynamicInputs.push(
          {
            name: 'domain',
            label: 'Company Domain',
            type: 'text',
            required: true,
            description: 'Company domain to enrich (e.g., example.com)'
          },
          {
            name: 'organization_name',
            label: 'Organization Name',
            type: 'text',
            description: 'Organization name for better matching'
          }
        );
        break;
    }

    return dynamicInputs;
  },
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful'
    },
    {
      name: 'data',
      type: 'object',
      description: 'The response data from Apollo'
    },
    {
      name: 'person',
      type: 'object',
      description: 'Person data (for person matching)'
    },
    {
      name: 'organization',
      type: 'object',
      description: 'Organization data (for company enrichment)'
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if the operation failed'
    }
  ],
  async execute(inputs, context) {
    const { apiKey, action, ...actionInputs } = inputs;

    console.log('Apollo Node - Starting execution:', { action, inputs: actionInputs });

    // Resolve variables in inputs
    const resolvedInputs = Object.fromEntries(
      Object.entries(actionInputs).map(([key, value]) => [
        key,
        typeof value === 'string' ? resolveVariable(value) : value
      ])
    );

    console.log('Apollo Node - Resolved inputs:', resolvedInputs);

    const authApiKey = resolveVariable(apiKey);
    if (!authApiKey) {
      console.error('Apollo Node - API key is missing');
      throw new Error('API key is required');
    }

    // Validate inputs based on action
    if (action === 'enrich_company') {
      const domain = resolvedInputs.domain;
      if (!domain) {
        console.error('Apollo Node - Domain is required for company enrichment');
        throw new Error('Domain is required for company enrichment');
      }
      
      // Validate domain format (must have a TLD)
      if (!domain.includes('.') || domain.split('.').length < 2) {
        console.error('Apollo Node - Invalid domain format:', domain);
        throw new Error(`Invalid domain format: "${domain}". Please use full domain like "example.com"`);
      }
    }

    const baseUrl = 'https://api.apollo.io/v1';
    let url = '';
    let requestPayload = null;

    try {
      console.log('Apollo Node - Using proxy for request');

      // Use Supabase proxy function for Apollo API calls
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('apollo-proxy', {
        body: {
          apiKey: authApiKey,
          action,
          ...resolvedInputs
        }
      });

      if (error) {
        throw new Error(`Apollo proxy error: ${error.message}`);
      }

      console.log('Apollo Node - Success result:', data);
      return data;

    } catch (error) {
      console.error('Apollo Node - Execution error:', {
        message: error.message,
        stack: error.stack,
        action,
        inputs: resolvedInputs
      });
      
      return {
        success: false,
        error: error.message,
        data: null,
        debug: {
          action,
          inputs: resolvedInputs,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
};