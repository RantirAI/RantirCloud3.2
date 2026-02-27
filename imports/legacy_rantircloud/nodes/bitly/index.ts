import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const bitlyNode: NodePlugin = {
  type: 'bitly',
  name: 'Bitly',
  description: 'Shorten URLs and track clicks with Bitly',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/bitly.png',
  color: '#EE6123',
  inputs: [
    {
      name: 'accessToken',
      label: 'Access Token',
      type: 'text',
      required: true,
      description: 'Your Bitly API access token',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Archive Bitlink', value: 'archiveBitlink' },
        { label: 'Create Bitlink', value: 'createBitlink' },
        { label: 'Create QR Code', value: 'createQrCode' },
        { label: 'Get Bitlink Details', value: 'getBitlinkDetails' },
        { label: 'Update Bitlink', value: 'updateBitlink' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'Action to perform',
    },
    {
      name: 'longUrl',
      label: 'Long URL',
      type: 'text',
      required: false,
      description: 'URL to shorten',
      placeholder: 'https://example.com/very/long/url',
      showWhen: {
        field: 'action',
        values: ['createBitlink', 'createQrCode']
      }
    },
    {
      name: 'bitlinkId',
      label: 'Bitlink ID',
      type: 'text',
      required: false,
      description: 'Bitlink to retrieve or modify',
      showWhen: {
        field: 'action',
        values: ['archiveBitlink', 'getBitlinkDetails', 'updateBitlink']
      }
    },
    {
      name: 'customSlug',
      label: 'Custom Slug',
      type: 'text',
      description: 'Custom back-half for shortened URL',
      showWhen: {
        field: 'action',
        values: ['createBitlink']
      }
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      description: 'Title for the bitlink',
      showWhen: {
        field: 'action',
        values: ['createBitlink', 'updateBitlink']
      }
    },
    {
      name: 'groupId',
      label: 'Group ID',
      type: 'text',
      description: 'Bitly group GUID',
      showWhen: {
        field: 'action',
        values: ['createBitlink']
      }
    },
    {
      name: 'domain',
      label: 'Domain',
      type: 'text',
      description: 'Optional custom domain (e.g., bit.ly or your branded domain)',
      showWhen: {
        field: 'action',
        values: ['createBitlink']
      }
    },
    {
      name: 'qrFormat',
      label: 'QR Format',
      type: 'select',
      default: 'png',
      options: [
        { label: 'PNG', value: 'png' },
        { label: 'SVG', value: 'svg' },
        { label: 'PDF', value: 'pdf' },
      ],
      description: 'Output format for generated QR code',
      showWhen: {
        field: 'action',
        values: ['createQrCode']
      }
    },
    {
      name: 'endpoint',
      label: 'API Endpoint',
      type: 'text',
      required: false,
      description: 'Custom API endpoint',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
    {
      name: 'method',
      label: 'HTTP Method',
      type: 'select',
      required: false,
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'PATCH', value: 'PATCH' },
        { label: 'DELETE', value: 'DELETE' },
      ],
      description: 'HTTP method',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
    {
      name: 'customData',
      label: 'Request Data',
      type: 'code',
      language: 'json',
      description: 'Data to send with the request',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
  ],
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'Bitly API response',
    },
  ],
  async execute(inputs) {
    const { accessToken, action } = inputs || {};
    if (!accessToken) {
      throw new Error('Access token is required');
    }

    const requiredByAction: Record<string, string[]> = {
      createBitlink: ['longUrl'],
      createQrCode: ['longUrl'],
      getBitlinkDetails: ['bitlinkId'],
      archiveBitlink: ['bitlinkId'],
      updateBitlink: ['bitlinkId'],
      createCustomApiCall: ['endpoint', 'method'],
    };

    const required = requiredByAction[action] || [];
    const missing = required.filter((f) => !inputs?.[f] || String(inputs[f]).trim() === '');

    if (missing.length) {
      throw new Error(`Missing required fields for ${action}: ${missing.join(', ')}`);
    }

    const { data, error } = await supabase.functions.invoke('bitly-action', {
      body: inputs,
    });

    if (error) throw error;
    return { result: data };
  },
};
