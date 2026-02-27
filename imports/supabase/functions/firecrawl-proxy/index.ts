import { corsHeaders } from '../_shared/cors.ts';

console.log('Firecrawl Proxy Function Starting');

Deno.serve(async (req) => {
  console.log(`Firecrawl Proxy - ${req.method} request received`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      tabularExtraction,
      ...otherInputs
    } = await req.json();

    if (!apiKey) {
      console.error('Firecrawl Proxy - API key is missing');
      throw new Error('API key is required');
    }

    console.log(`Firecrawl Proxy - Processing action: ${action}`);

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
          requestBody.includeTags = includeTags.split(',').map((tag: string) => tag.trim());
        }
        if (excludeTags) {
          requestBody.excludeTags = excludeTags.split(',').map((tag: string) => tag.trim());
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

    console.log(`Firecrawl Proxy - Making ${method} request to: ${baseUrl}${endpoint}`);

    const requestOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (method !== 'GET' && Object.keys(requestBody).length > 0) {
      requestOptions.body = JSON.stringify(requestBody);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, requestOptions);
    
    console.log(`Firecrawl Proxy - Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Firecrawl Proxy - API error:', errorData);
      throw new Error(`Firecrawl API error (${response.status}): ${errorData}`);
    }

    const responseData = await response.json();
    
    // Process the response based on action
    let processedData = responseData;
    let tabularData: any[] = [];
    let mappedData: any = {};
    let extractedFields: any = {};

    // Extract tabular data if requested
    if (tabularExtraction && responseData.data) {
      if (Array.isArray(responseData.data)) {
        // Multiple pages (crawl result)
        tabularData = responseData.data.flatMap((page: any) => 
          extractTablesFromContent(page.markdown || page.html || '')
        );
      } else {
        // Single page (scrape result)
        tabularData = extractTablesFromContent(
          responseData.data.markdown || responseData.data.html || ''
        );
      }
    }

    // Apply field mapping if provided
    if (fieldMapping && responseData.data) {
      try {
        const mapping = JSON.parse(fieldMapping);
        mappedData = applyFieldMapping(responseData.data, mapping);
      } catch (error) {
        console.warn('Invalid field mapping JSON, skipping mapping');
      }
    }

    // Extract structured fields if schema was used
    if (responseData.data?.extract) {
      extractedFields = responseData.data.extract;
    }

    console.log('Firecrawl Proxy - Request successful');

    const result = {
      success: responseData.success !== false,
      data: processedData,
      metadata: {
        url: responseData.url || url,
        timestamp: new Date().toISOString(),
        action,
        credits: responseData.credits,
      },
      crawlId: responseData.jobId || responseData.id,
      status: responseData.status || 'completed',
      tabularData,
      mappedData,
      extractedFields,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Firecrawl Proxy - Error:', error instanceof Error ? error.message : 'Unknown error');
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to extract tables from markdown/HTML content
function extractTablesFromContent(content: string): any[] {
  const tables: any[] = [];
  
  // Extract markdown tables
  const markdownTableRegex = /\|(.+)\|\n\|[-:|]+\|\n((?:\|(.+)\|\n?)+)/g;
  let match;

  while ((match = markdownTableRegex.exec(content)) !== null) {
    const headers = match[1].split('|').map(h => h.trim()).filter(h => h);
    const rows = match[2].split('\n').filter(row => row.trim()).map(row => 
      row.split('|').map(cell => cell.trim()).filter(cell => cell)
    );

    if (headers.length > 0 && rows.length > 0) {
      const tableData = rows.map(row => {
        const rowObj: any = {};
        headers.forEach((header, index) => {
          rowObj[header] = row[index] || '';
        });
        return rowObj;
      });
      tables.push({
        headers,
        rows: tableData,
        type: 'markdown'
      });
    }
  }

  return tables;
}

// Helper function to apply field mapping
function applyFieldMapping(data: any, mapping: any): any {
  if (Array.isArray(data)) {
    return data.map(item => applyFieldMapping(item, mapping));
  }

  if (typeof data === 'object' && data !== null) {
    const mappedData: any = {};
    
    for (const [sourceField, targetField] of Object.entries(mapping)) {
      if (data.hasOwnProperty(sourceField)) {
        mappedData[targetField as string] = data[sourceField];
      }
    }

    // Include unmapped fields
    for (const [key, value] of Object.entries(data)) {
      if (!mapping.hasOwnProperty(key)) {
        mappedData[key] = value;
      }
    }

    return mappedData;
  }

  return data;
}