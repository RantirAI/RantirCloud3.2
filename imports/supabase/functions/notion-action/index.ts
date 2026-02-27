import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      accessToken, 
      action, 
      databaseId, 
      properties, 
      pageId, 
      filter, 
      parentId,
      parentType,
      title, 
      content, 
      blockId, 
      comment, 
      endpoint, 
      method, 
      body 
    } = await req.json();
    
    console.log('Notion action request:', { action, databaseId, pageId, blockId });
    
    if (!accessToken) {
      throw new Error("Notion access token is required");
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    };

    let response: Response;
    let result: any;

    switch (action) {
      case 'createDatabaseItem':
        if (!databaseId || !properties) {
          throw new Error("Database ID and properties are required for createDatabaseItem");
        }
        response = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            parent: { database_id: databaseId },
            properties: properties,
          }),
        });
        break;

      case 'updateDatabaseItem':
        if (!pageId) {
          throw new Error("Page ID is required for updateDatabaseItem");
        }
        response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            properties: properties || {},
          }),
        });
        break;

      case 'findDatabaseItem':
        if (!databaseId) {
          throw new Error("Database ID is required for findDatabaseItem");
        }
        response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            filter: filter || undefined,
          }),
        });
        break;

      case 'createPage':
        if (!parentId || !title || !parentType) {
          throw new Error("Parent ID, parent type, and title are required for createPage");
        }
        
        const parentObject = parentType === 'database' 
          ? { database_id: parentId }
          : { page_id: parentId };
        
        response = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            parent: parentObject,
            properties: {
              title: {
                title: [{ text: { content: title } }]
              }
            },
            children: content ? [{
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [{ type: 'text', text: { content } }]
              }
            }] : []
          }),
        });
        break;

      case 'appendToPage':
        if (!pageId || !content) {
          throw new Error("Page ID and content are required for appendToPage");
        }
        response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            children: [{
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [{ type: 'text', text: { content } }]
              }
            }]
          }),
        });
        break;

      case 'getPageOrBlockChildren':
        if (!blockId) {
          throw new Error("Block ID is required for getPageOrBlockChildren");
        }
        response = await fetch(`https://api.notion.com/v1/blocks/${blockId}/children`, {
          method: 'GET',
          headers,
        });
        break;

      case 'archiveDatabaseItem':
        if (!pageId) {
          throw new Error("Page ID is required for archiveDatabaseItem");
        }
        response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            archived: true,
          }),
        });
        break;

      case 'restoreDatabaseItem':
        if (!pageId) {
          throw new Error("Page ID is required for restoreDatabaseItem");
        }
        response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            archived: false,
          }),
        });
        break;

      case 'addComment':
        if (!pageId || !comment) {
          throw new Error("Page ID and comment are required for addComment");
        }
        response = await fetch('https://api.notion.com/v1/comments', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            parent: { page_id: pageId },
            rich_text: [{ text: { content: comment } }]
          }),
        });
        break;

      case 'retrieveDatabase':
        if (!databaseId) {
          throw new Error("Database ID is required for retrieveDatabase");
        }
        response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
          method: 'GET',
          headers,
        });
        break;

      case 'getPageComments':
        if (!pageId) {
          throw new Error("Page ID is required for getPageComments");
        }
        response = await fetch(`https://api.notion.com/v1/comments?block_id=${pageId}`, {
          method: 'GET',
          headers,
        });
        break;

      case 'findPage':
        if (!filter) {
          throw new Error("Filter is required for findPage");
        }
        response = await fetch('https://api.notion.com/v1/search', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            filter: { property: 'object', value: 'page' },
            query: filter,
          }),
        });
        break;

      case 'createCustomApiCall':
        if (!endpoint || !method) {
          throw new Error("Endpoint and method are required for createCustomApiCall");
        }
        const customUrl = endpoint.startsWith('http') 
          ? endpoint 
          : `https://api.notion.com/v1${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        
        response = await fetch(customUrl, {
          method: method.toUpperCase(),
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    // Check response status before parsing
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Notion API error:', response.status, errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      // Provide better error messages
      let errorMessage = errorData.message || `Notion API error: ${response.status}`;
      
      if (response.status === 404) {
        errorMessage += ". Make sure the page/database exists and is shared with your integration.";
      } else if (response.status === 403) {
        errorMessage += ". Check that your integration has the required permissions in Notion.";
      } else if (errorData.code === 'unauthorized') {
        errorMessage = "Invalid access token. Please check your Notion integration token.";
      }
      
      throw new Error(errorMessage);
    }

    result = await response.json();
    console.log('Notion action success:', { action, resultKeys: Object.keys(result) });

    // Extract page URL if available
    const pageUrl = result.url || (result.id ? `https://notion.so/${result.id.replace(/-/g, '')}` : undefined);

    return new Response(JSON.stringify({ result, pageUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Notion error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
