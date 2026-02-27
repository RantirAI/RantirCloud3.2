
import { NodePlugin } from "@/types/node-plugin";
import { WebflowIcon } from "@/components/flow/icons/WebflowIcon";
import { supabase } from "@/integrations/supabase/client";

// Function to resolve variables - this will be called from dynamic options
const resolveVariable = (variableBinding: string) => {
  if (!variableBinding || typeof variableBinding !== 'string' || 
      !variableBinding.startsWith('{{') || !variableBinding.endsWith('}}')) {
    return variableBinding;
  }

  const binding = variableBinding.substring(2, variableBinding.length - 2);

  // Handle environment variables
  if (binding.startsWith('env.')) {
    const envVarName = binding.substring(4);
    const envVars = JSON.parse(localStorage.getItem('flow-env-vars') || '{}');
    return envVars[envVarName] || null;
  }

  // Handle flow variables from database
  if (!binding.includes('.')) {
    // Get flow project ID from URL
    const flowProjectId = window.location.pathname.split('/').pop();
    if (flowProjectId) {
      try {
        const flowVariablesKey = `flow-variables-${flowProjectId}`;
        const storedVariables = localStorage.getItem(flowVariablesKey);
        if (storedVariables) {
          const flowVariables = JSON.parse(storedVariables);
          const variable = flowVariables.find((v: any) => v.name === binding);
          return variable?.value || null;
        }
      } catch (error) {
        console.error('Error resolving flow variable:', error);
      }
    }
    return null;
  }

  return null;
};

export const webflowNode: NodePlugin = {
  type: "webflow",
  name: "Webflow",
  description: "Connect to Webflow API to create, read, update and delete data",
  category: "action",
  icon: WebflowIcon,
  color: "#4353FF",
  inputs: [
    {
      name: "apiKey",
      label: "API Key",
      type: "text",
      required: true,
      description: "Your Webflow API key",
      isApiKey: true,
    },
    {
      name: "action",
      label: "Action",
      type: "select",
      required: true,
      options: [
        { label: "List Sites", value: "list-sites" },
        { label: "List Collections", value: "list-collections" },
        { label: "List Items", value: "list-items" },
        { label: "Get Item", value: "get-item" },
        { label: "Create Item", value: "create-item" },
        { label: "Update Item", value: "update-item" },
        { label: "Delete Item", value: "delete-item" },
      ],
      default: "list-sites",
      description: "The action to perform on Webflow",
      dependsOnApiKey: true,
    },
    {
      name: "siteId",
      label: "Site ID",
      type: "webflowSelect",
      description: "The Webflow site to operate on",
      required: false,
      webflowField: true,
      optionType: "sites"
    },
    {
      name: "collectionId",
      label: "Collection ID",
      type: "webflowSelect",
      description: "The Webflow collection to operate on",
      required: false,
      webflowField: true,
      optionType: "collections"
    },
    {
      name: "itemData",
      label: "Item Data",
      type: "webflowFieldMapping",
      description: "Map fields to create or update in the collection",
      required: false,
    },
    // Add limit parameter for pagination
    {
      name: "limit",
      label: "Limit",
      type: "number",
      description: "Maximum number of items to retrieve (1-100)",
      required: false,
      default: "100",
    },
  ],
  outputs: [
    {
      name: "result",
      type: "object",
      description: "The result of the Webflow API call",
    },
    {
      name: "fields",
      type: "object",
      description: "Available fields in the collection",
    }
  ],
  async execute(inputs, context) {
    try {
      if (!inputs) {
        console.error("No inputs provided to Webflow node");
        return { result: { error: "No inputs provided" } };
      }

      const { action, apiKey, siteId, collectionId, itemData, limit } = inputs;
      const itemLimit = limit ? parseInt(limit) : 100;

      console.log('Webflow node executing with inputs:', { action, apiKey: apiKey ? '***' : null, siteId, collectionId });

      // Resolve variables during execution
      const resolvedApiKey = resolveVariable(apiKey);
      const resolvedSiteId = resolveVariable(siteId);
      const resolvedCollectionId = resolveVariable(collectionId);

      if (!resolvedApiKey) {
        console.error("No API key provided to Webflow node");
        return { result: { error: "No API key provided" } };
      }

      let path = '';
      let queryParams = '';
      let method = 'GET';
      let body = null;
      let itemId = null;
      
      // For update and delete operations, get itemId from the context variables if available
      if (action === 'update-item' || action === 'delete-item' || action === 'get-item') {
        // Allow item ID to come from previous nodes or explicit input
        itemId = context.variables['itemId'] || inputs.itemId;
        itemId = resolveVariable(itemId);
      }

      // Use v2 API endpoints
      switch (action) {
        case 'list-sites':
          path = 'v2/sites';
          break;
        case 'list-collections':
          if (!resolvedSiteId) {
            console.error("No Site ID provided to Webflow node");
            return { result: { error: "No Site ID provided" } };
          }
          // Update collection path format to match Webflow API
          path = `v2/sites/${resolvedSiteId}/collections`;
          break;
        case 'list-items':
          if (!resolvedCollectionId) {
            console.error("No Collection ID provided to Webflow node");
            return { result: { error: "No Collection ID provided" } };
          }
          path = `v2/collections/${resolvedCollectionId}/items`;
          queryParams = `?limit=${itemLimit}`;
          break;
        case 'get-item':
          if (!resolvedCollectionId || !itemId) {
            console.error("No Collection ID or Item ID provided to Webflow node");
            return { result: { error: "No Collection ID or Item ID provided" } };
          }
          path = `v2/collections/${resolvedCollectionId}/items/${itemId}`;
          break;
        case 'create-item':
          if (!resolvedCollectionId || !itemData) {
            console.error("No Collection ID or Item Data provided to Webflow node");
            return { result: { error: "No Collection ID or Item Data provided" } };
          }
          path = `v2/collections/${resolvedCollectionId}/items`;
          method = 'POST';
          
          // Parse and extract just the field data part to match Webflow API expectations
          let fieldData = {};
          try {
            const parsedData = typeof itemData === 'string' ? JSON.parse(itemData) : itemData;
            fieldData = parsedData.fields || parsedData;
          } catch (e) {
            console.error("Error parsing item data:", e);
            return { result: { error: "Failed to parse item data" } };
          }
          
          body = { 
            fieldData, 
            isArchived: false,
            isDraft: false 
          };
          break;
        case 'update-item':
          if (!resolvedCollectionId || !itemId || !itemData) {
            console.error("No Collection ID, Item ID, or Item Data provided to Webflow node");
            return { result: { error: "No Collection ID, Item ID, or Item Data provided" } };
          }
          path = `v2/collections/${resolvedCollectionId}/items/${itemId}`;
          method = 'PATCH';
          
          // Parse and extract just the field data part to match Webflow API expectations
          let updateFieldData = {};
          try {
            const parsedData = typeof itemData === 'string' ? JSON.parse(itemData) : itemData;
            updateFieldData = parsedData.fields || parsedData;
          } catch (e) {
            console.error("Error parsing item data for update:", e);
            return { result: { error: "Failed to parse item data" } };
          }
          
          body = { 
            fieldData: updateFieldData,
            isArchived: false,
            isDraft: false 
          };
          break;
        case 'delete-item':
          if (!resolvedCollectionId || !itemId) {
            console.error("No Collection ID or Item ID provided to Webflow node");
            return { result: { error: "No Collection ID or Item ID provided" } };
          }
          path = `v2/collections/${resolvedCollectionId}/items/${itemId}`;
          method = 'DELETE';
          break;
        default:
          console.error("Invalid action provided to Webflow node");
          return { result: { error: "Invalid action provided" } };
      }

      console.log(`Executing Webflow node with path: ${path}${queryParams}, method: ${method}`);

      // For actions that operate on collections, fetch fields to include in output
      let fields = {};
      if ((action === 'create-item' || action === 'update-item' || action === 'list-items') && resolvedCollectionId) {
        try {
          // First try to fetch collection schema
          const { data: schemaData, error: schemaError } = await supabase.functions.invoke('webflow-proxy', {
            method: 'POST',
            body: {
              path: `v2/collections/${resolvedCollectionId}`,
              apiKey: resolvedApiKey
            }
          });
          
          if (!schemaError && schemaData?.success && schemaData?.result) {
            console.log("Collection schema fetched successfully");
            
            if (schemaData.result.fields) {
              fields = schemaData.result.fields;
              console.log("Fields extracted from collection schema:", Object.keys(fields).length);
            }
          } else {
            // If schema fetch fails, try to get a sample item to extract fields
            const { data: itemsData, error: itemsError } = await supabase.functions.invoke('webflow-proxy', {
              method: 'POST',
              body: {
                path: `v2/collections/${resolvedCollectionId}/items`,
                queryParams: '?limit=1',
                apiKey: resolvedApiKey
              }
            });
            
            if (!itemsError && itemsData?.success && itemsData?.result?.items && itemsData.result.items.length > 0) {
              console.log("Successfully fetched a sample item");
              const sampleItem = itemsData.result.items[0];
              
              if (sampleItem.fieldData) {
                // Convert sample item fields to a similar format as schema fields
                Object.keys(sampleItem.fieldData).forEach(key => {
                  fields[key] = {
                    id: key,
                    name: key,
                    type: typeof sampleItem.fieldData[key] === 'object' ? 'Object' : 'PlainText',
                  };
                });
                console.log("Fields extracted from sample item:", Object.keys(fields).length);
              }
            }
          }
        } catch (err) {
          console.warn("Could not fetch collection fields:", err);
        }
      }

      // Call the edge function directly using POST method
      const { data: responseData, error: fnError } = await supabase.functions.invoke('webflow-proxy', {
        method: 'POST',
        body: {
          path,
          queryParams,
          apiKey: resolvedApiKey,
          method,
          body
        }
      });

      if (fnError) {
        console.error("Webflow API error:", fnError);
        return { result: { error: fnError.message || "Edge function request failed" } };
      }

      if (!responseData || !responseData.success) {
        console.error("Webflow API error:", responseData?.error);
        return { result: { error: responseData?.error || "API request failed" } };
      }

      console.log("Webflow API response:", responseData.result);

      // Prepare output with both the API result and the fields
      return { 
        result: responseData.result,
        fields
      };
    } catch (error: any) {
      console.error("Error executing Webflow node:", error);
      return { result: { error: error.message } };
    }
  },
};
