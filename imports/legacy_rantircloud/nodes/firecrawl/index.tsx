import React from 'react';
import { NodePlugin } from '@/types/node-plugin';
import { Search, Database, Download } from 'lucide-react';

const FirecrawlIcon = () => (
  <svg fill="none" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M13.7605 6.61389C13.138 6.79867 12.6687 7.21667 12.3251 7.67073C12.2513 7.76819 12.0975 7.69495 12.1268 7.57552C12.7848 4.86978 11.9155 2.6209 9.20582 1.51393C9.06836 1.4576 8.92527 1.58097 8.96132 1.72519C10.1939 6.67417 5.00941 6.25673 5.66459 11.8671C5.67585 11.9634 5.56769 12.0293 5.48882 11.973C5.2432 11.7967 4.96885 11.4288 4.78069 11.1702C4.72548 11.0942 4.60605 11.1156 4.5807 11.2063C4.43085 11.7482 4.35986 12.2586 4.35986 12.7656C4.35986 14.7373 5.37333 16.473 6.90734 17.4791C6.99522 17.5366 7.10789 17.4543 7.07804 17.3535C6.99917 17.0887 6.95466 16.8093 6.95128 16.5203C6.95128 16.3429 6.96255 16.1615 6.99015 15.9925C7.05438 15.5677 7.20197 15.1632 7.44985 14.7948C8.29995 13.5188 10.0041 12.2862 9.73199 10.6125C9.71453 10.5066 9.83959 10.4368 9.91846 10.5094C11.119 11.6063 11.3567 13.0817 11.1595 14.405C11.1426 14.5199 11.2868 14.5813 11.3595 14.4912C11.5432 14.2613 11.7674 14.0596 12.0113 13.9081C12.0722 13.8703 12.1533 13.8991 12.1764 13.9667C12.3121 14.3616 12.5138 14.7323 12.7042 15.1029C12.9318 15.5485 13.0529 16.0573 13.0338 16.5958C13.0242 16.8578 12.9808 17.1113 12.9082 17.3524C12.8772 17.4543 12.9887 17.5394 13.0783 17.4808C14.6134 16.4747 15.6275 14.739 15.6275 12.7662C15.6275 12.0806 15.5075 11.4085 15.2804 10.7787C14.8044 9.45766 13.5966 8.46561 13.9019 6.74403C13.9166 6.66178 13.8405 6.59023 13.7605 6.61389Z"
      fill="currentColor"
    />
  </svg>
);

export const firecrawlNode: NodePlugin = {
  type: 'firecrawl',
  name: 'Firecrawl',
  description: 'Scrape websites, crawl pages, and extract structured data with Firecrawl API',
  category: 'action',
  icon: FirecrawlIcon,
  color: '#FF6600',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Firecrawl API key',
      placeholder: 'fc-your-api-key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      default: 'scrape',
      options: [
        { label: 'Scrape Single Page', value: 'scrape', description: 'Scrape a single webpage' },
        { label: 'Start Crawl', value: 'crawl', description: 'Start crawling a website' },
        { label: 'Get Crawl Status', value: 'crawl-status', description: 'Check crawl progress and get results' },
        { label: 'Custom API Call', value: 'custom', description: 'Make a custom Firecrawl API call' },
      ],
      description: 'Choose the Firecrawl action to perform',
      dependsOnApiKey: false,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs?.action || 'scrape';
    const baseInputs = [
      {
        name: 'url',
        label: action === 'crawl-status' ? 'Original URL (optional)' : 'URL',
        type: 'text' as const,
        required: action !== 'crawl-status',
        description: action === 'crawl-status' 
          ? 'Original URL that was crawled (optional for reference)' 
          : 'Target URL to scrape or crawl',
        placeholder: 'https://example.com',
      }
    ];

    switch (action) {
      case 'scrape':
        return [
          ...baseInputs,
          {
            name: 'formats',
            label: 'Output Formats',
            type: 'select' as const,
            required: false,
            default: 'markdown',
            options: [
              { label: 'Markdown', value: 'markdown' },
              { label: 'HTML', value: 'html' },
              { label: 'Raw HTML', value: 'rawHtml' },
              { label: 'Screenshot', value: 'screenshot' },
              { label: 'Links', value: 'links' },
              { label: 'Markdown + HTML', value: 'markdown,html' },
              { label: 'All Formats', value: 'markdown,html,rawHtml,screenshot,links' },
            ],
            description: 'Data formats to extract from the page',
          },
          {
            name: 'waitFor',
            label: 'Wait For (ms)',
            type: 'number' as const,
            required: false,
            description: 'Time to wait before scraping (milliseconds)',
            placeholder: '1000',
          },
          {
            name: 'includeTags',
            label: 'Include Tags',
            type: 'text' as const,
            required: false,
            description: 'CSS selectors to include (comma-separated)',
            placeholder: 'h1, h2, .content, #main',
          },
          {
            name: 'excludeTags',
            label: 'Exclude Tags',
            type: 'text' as const,
            required: false,
            description: 'CSS selectors to exclude (comma-separated)',
            placeholder: 'nav, footer, .advertisement',
          },
          {
            name: 'schema',
            label: 'Extract Schema',
            type: 'code' as const,
            language: 'json' as const,
            required: false,
            description: 'JSON schema to extract structured data',
            placeholder: '{\n  "title": "string",\n  "price": "number",\n  "description": "string"\n}',
          },
          {
            name: 'fieldMapping',
            label: 'Field Mapping',
            type: 'code' as const,
            language: 'json' as const,
            required: false,
            description: 'Map extracted fields to custom names',
            placeholder: '{\n  "title": "pageTitle",\n  "price": "productPrice",\n  "description": "pageContent"\n}',
          },
          {
            name: 'tabularExtraction',
            label: 'Extract Tables',
            type: 'boolean' as const,
            required: false,
            default: false,
            description: 'Extract and parse tabular data from the page',
          },
        ];

      case 'crawl':
        return [
          ...baseInputs,
          {
            name: 'limit',
            label: 'Crawl Limit',
            type: 'number' as const,
            required: false,
            default: 10,
            description: 'Maximum pages to crawl',
            placeholder: '10',
          },
          {
            name: 'maxDepth',
            label: 'Max Depth',
            type: 'number' as const,
            required: false,
            description: 'Maximum crawl depth',
            placeholder: '2',
          },
          {
            name: 'formats',
            label: 'Output Formats',
            type: 'select' as const,
            required: false,
            default: 'markdown',
            options: [
              { label: 'Markdown', value: 'markdown' },
              { label: 'HTML', value: 'html' },
              { label: 'Raw HTML', value: 'rawHtml' },
              { label: 'Screenshot', value: 'screenshot' },
              { label: 'Links', value: 'links' },
              { label: 'Markdown + HTML', value: 'markdown,html' },
              { label: 'All Formats', value: 'markdown,html,rawHtml,screenshot,links' },
            ],
            description: 'Data formats to extract from each page',
          },
          {
            name: 'allowBackwardLinks',
            label: 'Allow Backward Links',
            type: 'boolean' as const,
            required: false,
            default: false,
            description: 'Allow crawling backward links',
          },
          {
            name: 'allowExternalLinks',
            label: 'Allow External Links',
            type: 'boolean' as const,
            required: false,
            default: false,
            description: 'Allow crawling external links',
          },
          {
            name: 'schema',
            label: 'Extract Schema',
            type: 'code' as const,
            language: 'json' as const,
            required: false,
            description: 'JSON schema to extract structured data from each page',
            placeholder: '{\n  "title": "string",\n  "price": "number",\n  "description": "string"\n}',
          },
        ];

      case 'crawl-status':
        return [
          {
            name: 'crawlId',
            label: 'Crawl ID',
            type: 'text' as const,
            required: true,
            description: 'Crawl ID from a previous crawl operation',
            placeholder: 'crawl-id-from-previous-crawl',
          },
        ];

      case 'custom':
        return [
          {
            name: 'customEndpoint',
            label: 'Custom Endpoint',
            type: 'text' as const,
            required: true,
            description: 'Custom API endpoint path',
            placeholder: '/v0/scrape',
          },
          {
            name: 'customMethod',
            label: 'HTTP Method',
            type: 'select' as const,
            required: false,
            default: 'POST',
            options: [
              { label: 'GET', value: 'GET' },
              { label: 'POST', value: 'POST' },
              { label: 'PUT', value: 'PUT' },
              { label: 'DELETE', value: 'DELETE' },
            ],
            description: 'HTTP method for the API call',
          },
          {
            name: 'customBody',
            label: 'Request Body',
            type: 'code' as const,
            language: 'json' as const,
            required: false,
            description: 'Request body for the API call',
            placeholder: '{\n  "url": "https://example.com",\n  "formats": ["markdown"]\n}',
          },
        ];

      default:
        return baseInputs;
    }
  },
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
    {
      name: 'data',
      type: 'object',
      description: 'Extracted data or API response',
    },
    {
      name: 'metadata',
      type: 'object',
      description: 'Additional metadata about the operation',
    },
    {
      name: 'crawlId',
      type: 'string',
      description: 'Crawl ID for tracking (when starting a crawl)',
    },
    {
      name: 'status',
      type: 'string',
      description: 'Operation status',
    },
    {
      name: 'tabularData',
      type: 'array',
      description: 'Extracted tabular data from tables',
    },
    {
      name: 'mappedData',
      type: 'object',
      description: 'Data with custom field mapping applied',
    },
    {
      name: 'extractedFields',
      type: 'object',
      description: 'Data extracted using the provided schema',
    },
  ],
  async execute(inputs, context) {
    const { 
      apiKey, 
      action, 
      url, 
      formats, 
      includeTags, 
      excludeTags, 
      waitFor, 
      limit, 
      maxDepth,
      allowBackwardLinks,
      allowExternalLinks,
      schema,
      crawlId,
      customEndpoint,
      customMethod,
      customBody,
      fieldMapping,
      tabularExtraction
    } = inputs;

    if (!apiKey) {
      throw new Error('API key is required');
    }

    const baseUrl = 'https://api.firecrawl.dev';
    let endpoint = '';
    let method = 'POST';
    let requestBody: any = {};

    // Build request based on action
    switch (action) {
      case 'scrape':
        endpoint = '/v0/scrape';
        method = 'POST';
        requestBody = {
          url,
          formats: formats ? formats.split(',') : ['markdown'],
        };
        
        if (includeTags) {
          requestBody.includeTags = includeTags.split(',').map(tag => tag.trim());
        }
        if (excludeTags) {
          requestBody.excludeTags = excludeTags.split(',').map(tag => tag.trim());
        }
        if (waitFor) {
          requestBody.waitFor = parseInt(waitFor);
        }
        if (schema) {
          try {
            requestBody.extract = {
              schema: JSON.parse(schema),
            };
          } catch (error) {
            throw new Error('Invalid schema JSON format');
          }
        }
        break;

      case 'crawl':
        endpoint = '/v0/crawl';
        method = 'POST';
        requestBody = {
          url,
          crawlerOptions: {
            includes: [url + '/**'],
            limit: limit || 10,
          },
          pageOptions: {
            formats: formats ? formats.split(',') : ['markdown'],
          },
        };
        
        if (maxDepth) {
          requestBody.crawlerOptions.maxDepth = parseInt(maxDepth);
        }
        if (allowBackwardLinks !== undefined) {
          requestBody.crawlerOptions.allowBackwardCrawling = allowBackwardLinks;
        }
        if (allowExternalLinks !== undefined) {
          requestBody.crawlerOptions.allowExternalContentLinks = allowExternalLinks;
        }
        if (schema) {
          try {
            requestBody.pageOptions.extract = {
              schema: JSON.parse(schema),
            };
          } catch (error) {
            throw new Error('Invalid schema JSON format');
          }
        }
        break;

      case 'crawl-status':
        if (!crawlId) {
          throw new Error('Crawl ID is required for status check');
        }
        endpoint = `/v0/crawl/status/${crawlId}`;
        method = 'GET';
        break;

      case 'custom':
        if (!customEndpoint) {
          throw new Error('Custom endpoint is required for custom API calls');
        }
        endpoint = customEndpoint;
        method = customMethod || 'POST';
        if (customBody) {
          try {
            requestBody = JSON.parse(customBody);
          } catch (error) {
            throw new Error('Invalid custom request body JSON format');
          }
        }
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    try {
      // Use Supabase proxy function for Firecrawl API calls
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('firecrawl-proxy', {
        body: {
          apiKey,
          action,
          url,
          formats,
          includeTags,
          excludeTags,
          waitFor,
          limit,
          maxDepth,
          allowBackwardLinks,
          allowExternalLinks,
          schema,
          crawlId,
          customEndpoint,
          customMethod,
          customBody,
          fieldMapping,
          tabularExtraction
        }
      });

      if (error) {
        throw new Error(`Firecrawl proxy error: ${error.message}`);
      }

      return data;

    } catch (error) {
      throw new Error(`Firecrawl operation failed: ${error.message}`);
    }
  }
};

// Helper function to extract tables from markdown/HTML content
function extractTablesFromContent(content: string): any[] {
  const tables: any[] = [];
  
  // Extract markdown tables
  const markdownTableRegex = /\|(.+)\|\n\|[-:|]+\|\n((?:\|(.+)\|\n?)+)/g;
  let match;
  
  while ((match = markdownTableRegex.exec(content)) !== null) {
    const headerRow = match[1].split('|').map(cell => cell.trim()).filter(cell => cell);
    const dataRows = match[2].split('\n').filter(row => row.trim())
      .map(row => row.split('|').map(cell => cell.trim()).filter(cell => cell));
    
    if (headerRow.length > 0 && dataRows.length > 0) {
      const tableData = dataRows.map(row => {
        const rowObj: any = {};
        headerRow.forEach((header, index) => {
          rowObj[header] = row[index] || '';
        });
        return rowObj;
      });
      
      tables.push({
        headers: headerRow,
        rows: tableData,
        type: 'markdown'
      });
    }
  }
  
  return tables;
}

// Helper function to apply field mapping
function applyFieldMapping(data: any, mapping: Record<string, string>): any {
  if (Array.isArray(data)) {
    return data.map(item => applyFieldMapping(item, mapping));
  }
  
  if (typeof data === 'object' && data !== null) {
    const mapped: any = {};
    
    Object.entries(mapping).forEach(([sourceField, targetField]) => {
      if (data.hasOwnProperty(sourceField)) {
        mapped[targetField] = data[sourceField];
      }
    });
    
    // Include unmapped fields
    Object.entries(data).forEach(([key, value]) => {
      if (!mapping.hasOwnProperty(key)) {
        mapped[key] = value;
      }
    });
    
    return mapped;
  }
  
  return data;
}