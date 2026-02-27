import { NodePlugin } from '@/types/node-plugin';
import { HubSpotIcon } from '@/components/flow/icons/HubSpotIcon';

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

export const hubspotNode: NodePlugin = {
  type: 'hubspot',
  name: 'HubSpot',
  description: 'Connect to HubSpot CRM to manage contacts, deals, tickets, companies and more',
  category: 'action',
  icon: HubSpotIcon,
  color: '#FF7A59',
      inputs: [
    {
      name: 'accessToken',
      label: 'Access Token',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Your HubSpot private app access token. Note: Legacy API keys are deprecated - use Private App tokens instead.'
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        // Utility Operations
        { label: 'Verify Connection', value: 'verify_connection' },
        
        // Contact Operations
        { label: 'Create Contact', value: 'create_contact' },
        { label: 'Update Contact', value: 'update_contact' },
        { label: 'Get Contact', value: 'get_contact' },
        { label: 'Find Contact', value: 'find_contact' },
        { label: 'Add Contact to List', value: 'add_contact_to_list' },
        { label: 'Remove Contact from List', value: 'remove_contact_from_list' },
        { label: 'Add Contact to Workflow', value: 'add_contact_to_workflow' },
        { label: 'Remove Email Subscription', value: 'remove_email_subscription' },

        // Company Operations
        { label: 'Create Company', value: 'create_company' },
        { label: 'Update Company', value: 'update_company' },
        { label: 'Get Company', value: 'get_company' },
        { label: 'Find Company', value: 'find_company' },

        // Deal Operations
        { label: 'Create Deal', value: 'create_deal' },
        { label: 'Update Deal', value: 'update_deal' },
        { label: 'Get Deal', value: 'get_deal' },
        { label: 'Find Deal', value: 'find_deal' },

        // Ticket Operations
        { label: 'Create Ticket', value: 'create_ticket' },
        { label: 'Update Ticket', value: 'update_ticket' },
        { label: 'Get Ticket', value: 'get_ticket' },
        { label: 'Find Ticket', value: 'find_ticket' },

        // Product Operations
        { label: 'Create Product', value: 'create_product' },
        { label: 'Update Product', value: 'update_product' },
        { label: 'Get Product', value: 'get_product' },
        { label: 'Find Product', value: 'find_product' },

        // Line Item Operations
        { label: 'Create Line Item', value: 'create_line_item' },
        { label: 'Update Line Item', value: 'update_line_item' },
        { label: 'Get Line Item', value: 'get_line_item' },
        { label: 'Find Line Item', value: 'find_line_item' },

        // Custom Object Operations
        { label: 'Create Custom Object', value: 'create_custom_object' },
        { label: 'Update Custom Object', value: 'update_custom_object' },
        { label: 'Get Custom Object', value: 'get_custom_object' },
        { label: 'Find Custom Object', value: 'find_custom_object' },

        // Content Operations
        { label: 'Create Page', value: 'create_page' },
        { label: 'Get Page', value: 'get_page' },
        { label: 'Delete Page', value: 'delete_page' },
        { label: 'Create COS Blog Post', value: 'create_blog_post' },

        // Association Operations
        { label: 'Create Associations', value: 'create_associations' },
        { label: 'Remove Associations', value: 'remove_associations' },
        { label: 'Find Associations', value: 'find_associations' },

        // File Operations
        { label: 'Upload File', value: 'upload_file' },

        // Pipeline Operations
        { label: 'Get Owner by ID', value: 'get_owner' },
        { label: 'Get Pipeline Stage Details', value: 'get_pipeline_stage' },

        // Custom
        { label: 'Custom API Call', value: 'custom_api_call' }
      ],
      description: 'Select the HubSpot action to perform'
    }
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs?.action;
    if (!action) return [];

    const dynamicInputs = [];

    // Add action-specific inputs
    switch (action) {
      // ── Contacts ──────────────────────────────────────────────────────────
      case 'create_contact':
      case 'update_contact':
        if (action === 'update_contact') {
          dynamicInputs.push({ name: 'contact_id', label: 'Contact ID', type: 'text', required: true });
        }
        dynamicInputs.push(
          { name: 'email', label: 'Email', type: 'text', required: action === 'create_contact' },
          { name: 'firstname', label: 'First Name', type: 'text' },
          { name: 'lastname', label: 'Last Name', type: 'text' },
          { name: 'phone', label: 'Phone', type: 'text' },
          { name: 'company', label: 'Company', type: 'text' },
          { name: 'website', label: 'Website', type: 'text' },
          { name: 'jobtitle', label: 'Job Title', type: 'text' }
        );
        break;

      case 'get_contact':
        dynamicInputs.push({ name: 'contact_id', label: 'Contact ID', type: 'text', required: true });
        break;

      case 'find_contact':
        dynamicInputs.push(
          { name: 'email', label: 'Email', type: 'text', description: 'Search by email address' },
          { name: 'search_query', label: 'Search Query', type: 'text', description: 'General keyword search' }
        );
        break;

      case 'add_contact_to_list':
        dynamicInputs.push(
          { name: 'list_id', label: 'List ID', type: 'text', required: true },
          { name: 'contact_vid', label: 'Contact VID', type: 'text', required: true, description: 'HubSpot numeric contact ID' }
        );
        break;

      case 'remove_contact_from_list':
        dynamicInputs.push(
          { name: 'list_id', label: 'List ID', type: 'text', required: true },
          { name: 'contact_vid', label: 'Contact VID', type: 'text', required: true }
        );
        break;

      case 'add_contact_to_workflow':
        dynamicInputs.push(
          { name: 'workflow_id', label: 'Workflow ID', type: 'text', required: true },
          { name: 'email', label: 'Contact Email', type: 'text', required: true }
        );
        break;

      case 'remove_email_subscription':
        dynamicInputs.push(
          { name: 'email', label: 'Contact Email', type: 'text', required: true }
        );
        break;

      // ── Companies ─────────────────────────────────────────────────────────
      case 'create_company':
      case 'update_company':
        if (action === 'update_company') {
          dynamicInputs.push({ name: 'company_id', label: 'Company ID', type: 'text', required: true });
        }
        dynamicInputs.push(
          { name: 'name', label: 'Company Name', type: 'text', required: action === 'create_company' },
          { name: 'domain', label: 'Domain', type: 'text' },
          { name: 'industry', label: 'Industry', type: 'text' },
          { name: 'phone', label: 'Phone', type: 'text' },
          { name: 'city', label: 'City', type: 'text' },
          { name: 'state', label: 'State', type: 'text' },
          { name: 'country', label: 'Country', type: 'text' }
        );
        break;

      case 'get_company':
        dynamicInputs.push({ name: 'company_id', label: 'Company ID', type: 'text', required: true });
        break;

      case 'find_company':
        dynamicInputs.push(
          { name: 'domain', label: 'Domain', type: 'text', description: 'Exact domain match' },
          { name: 'search_query', label: 'Search Query', type: 'text', description: 'General keyword search' }
        );
        break;

      // ── Deals ─────────────────────────────────────────────────────────────
      case 'create_deal':
      case 'update_deal':
        if (action === 'update_deal') {
          dynamicInputs.push({ name: 'deal_id', label: 'Deal ID', type: 'text', required: true });
        }
        dynamicInputs.push(
          { name: 'dealname', label: 'Deal Name', type: 'text', required: action === 'create_deal' },
          { name: 'amount', label: 'Amount', type: 'text' },
          { name: 'dealstage', label: 'Deal Stage', type: 'text' },
          { name: 'pipeline', label: 'Pipeline', type: 'text' },
          { name: 'closedate', label: 'Close Date', type: 'text', description: 'Format: YYYY-MM-DD' },
          { name: 'dealtype', label: 'Deal Type', type: 'text' }
        );
        break;

      case 'get_deal':
        dynamicInputs.push({ name: 'deal_id', label: 'Deal ID', type: 'text', required: true });
        break;

      case 'find_deal':
        dynamicInputs.push(
          { name: 'dealname', label: 'Deal Name', type: 'text' },
          { name: 'search_query', label: 'Search Query', type: 'text' }
        );
        break;

      // ── Tickets ───────────────────────────────────────────────────────────
      case 'create_ticket':
      case 'update_ticket':
        if (action === 'update_ticket') {
          dynamicInputs.push({ name: 'ticket_id', label: 'Ticket ID', type: 'text', required: true });
        }
        dynamicInputs.push(
          { name: 'subject', label: 'Subject', type: 'text', required: action === 'create_ticket' },
          { name: 'content', label: 'Content', type: 'textarea' },
          { name: 'hs_pipeline_stage', label: 'Pipeline Stage', type: 'text' },
          { name: 'hs_ticket_priority', label: 'Priority', type: 'select', options: [
            { label: 'Low', value: 'LOW' },
            { label: 'Medium', value: 'MEDIUM' },
            { label: 'High', value: 'HIGH' }
          ]},
          { name: 'source_type', label: 'Source Type', type: 'text' }
        );
        break;

      case 'get_ticket':
        dynamicInputs.push({ name: 'ticket_id', label: 'Ticket ID', type: 'text', required: true });
        break;

      case 'find_ticket':
        dynamicInputs.push(
          { name: 'subject', label: 'Subject', type: 'text' },
          { name: 'search_query', label: 'Search Query', type: 'text' }
        );
        break;

      // ── Products ──────────────────────────────────────────────────────────
      case 'create_product':
      case 'update_product':
        if (action === 'update_product') {
          dynamicInputs.push({ name: 'product_id', label: 'Product ID', type: 'text', required: true });
        }
        dynamicInputs.push(
          { name: 'name', label: 'Product Name', type: 'text', required: action === 'create_product' },
          { name: 'price', label: 'Price', type: 'text' },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'hs_sku', label: 'SKU', type: 'text' }
        );
        break;

      case 'get_product':
        dynamicInputs.push({ name: 'product_id', label: 'Product ID', type: 'text', required: true });
        break;

      case 'find_product':
        dynamicInputs.push(
          { name: 'name', label: 'Product Name', type: 'text' },
          { name: 'search_query', label: 'Search Query', type: 'text' }
        );
        break;

      // ── Line Items ────────────────────────────────────────────────────────
      case 'create_line_item':
      case 'update_line_item':
        if (action === 'update_line_item') {
          dynamicInputs.push({ name: 'line_item_id', label: 'Line Item ID', type: 'text', required: true });
        }
        dynamicInputs.push(
          { name: 'name', label: 'Name', type: 'text', required: action === 'create_line_item' },
          { name: 'quantity', label: 'Quantity', type: 'text' },
          { name: 'price', label: 'Unit Price', type: 'text' },
          { name: 'hs_product_id', label: 'Product ID', type: 'text', description: 'Associated HubSpot product ID' }
        );
        break;

      case 'get_line_item':
        dynamicInputs.push({ name: 'line_item_id', label: 'Line Item ID', type: 'text', required: true });
        break;

      case 'find_line_item':
        dynamicInputs.push(
          { name: 'name', label: 'Name', type: 'text' },
          { name: 'search_query', label: 'Search Query', type: 'text' }
        );
        break;

      // ── Custom Objects ────────────────────────────────────────────────────
      case 'create_custom_object':
      case 'update_custom_object':
      case 'get_custom_object':
      case 'find_custom_object':
        dynamicInputs.push({
          name: 'object_type',
          label: 'Object Type',
          type: 'text',
          required: true,
          description: 'Custom object schema ID, e.g. "2-3456789"'
        });
        if (action !== 'create_custom_object') {
          dynamicInputs.push({ name: 'object_id', label: 'Object ID', type: 'text', required: action !== 'find_custom_object' });
        }
        if (action === 'create_custom_object' || action === 'update_custom_object') {
          dynamicInputs.push({ name: 'properties', label: 'Properties (JSON)', type: 'code', language: 'json', description: 'Object properties as JSON, e.g. {"name":"value"}' });
        }
        if (action === 'find_custom_object') {
          dynamicInputs.push({ name: 'search_query', label: 'Search Query', type: 'text' });
        }
        break;

      // ── Content (CMS Hub) ─────────────────────────────────────────────────
      case 'create_page':
        dynamicInputs.push(
          { name: 'name', label: 'Page Name', type: 'text', required: true },
          { name: 'slug', label: 'Slug', type: 'text', description: 'URL path, e.g. /about' },
          { name: 'template_path', label: 'Template Path', type: 'text' }
        );
        break;

      case 'get_page':
      case 'delete_page':
        dynamicInputs.push({ name: 'page_id', label: 'Page ID', type: 'text', required: true });
        break;

      case 'create_blog_post':
        dynamicInputs.push(
          { name: 'name', label: 'Post Title', type: 'text', required: true },
          { name: 'content_group_id', label: 'Blog ID', type: 'text', required: true, description: 'The HubSpot blog (content group) ID' },
          { name: 'post_body', label: 'Post Body (HTML)', type: 'textarea' }
        );
        break;

      // ── Associations ──────────────────────────────────────────────────────
      case 'create_associations':
      case 'remove_associations':
      case 'find_associations':
        dynamicInputs.push(
          { name: 'from_object_type', label: 'From Object Type', type: 'text', required: true, description: 'e.g. contacts, deals' },
          { name: 'from_object_id', label: 'From Object ID', type: 'text', required: true },
          { name: 'to_object_type', label: 'To Object Type', type: 'text', required: true, description: 'e.g. companies, tickets' }
        );
        if (action !== 'find_associations') {
          dynamicInputs.push({ name: 'to_object_id', label: 'To Object ID', type: 'text', required: true });
        }
        break;

      // ── File Upload ───────────────────────────────────────────────────────
      case 'upload_file':
        dynamicInputs.push(
          { name: 'file_url', label: 'File URL', type: 'text', required: true, description: 'Public URL of the file to upload' },
          { name: 'file_name', label: 'File Name', type: 'text', description: 'Override file name (optional)' },
          { name: 'folder_path', label: 'Folder Path', type: 'text', description: 'HubSpot folder path, e.g. /uploads' }
        );
        break;

      // ── Pipeline / Owners ─────────────────────────────────────────────────
      case 'get_owner':
        dynamicInputs.push({ name: 'owner_id', label: 'Owner ID', type: 'text', required: true });
        break;

      case 'get_pipeline_stage':
        dynamicInputs.push(
          { name: 'object_type', label: 'Object Type', type: 'select', required: true, options: [
            { label: 'Deals', value: 'deals' },
            { label: 'Tickets', value: 'tickets' },
            { label: 'Contacts', value: 'contacts' }
          ]},
          { name: 'pipeline_id', label: 'Pipeline ID', type: 'text', required: true },
          { name: 'stage_id', label: 'Stage ID', type: 'text', required: true }
        );
        break;

      // ── Custom API Call ───────────────────────────────────────────────────
      case 'custom_api_call':
        dynamicInputs.push(
          { name: 'endpoint', label: 'API Endpoint', type: 'text', required: true, description: 'e.g., /crm/v3/objects/contacts' },
          { name: 'method', label: 'HTTP Method', type: 'select', required: true, options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'PATCH', value: 'PATCH' },
            { label: 'DELETE', value: 'DELETE' }
          ]},
          { name: 'request_body', label: 'Request Body (JSON)', type: 'code', language: 'json' },
          { name: 'query_params', label: 'Query Parameters (JSON)', type: 'code', language: 'json' }
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
      description: 'The response data from HubSpot'
    },
    {
      name: 'id',
      type: 'string',
      description: 'The ID of the created/updated record'
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if the operation failed'
    },
    {
      name: 'error_category',
      type: 'string',
      description: 'HubSpot error category (e.g., INVALID_AUTHENTICATION, RATE_LIMIT)'
    },
    {
      name: 'correlation_id',
      type: 'string',
      description: 'HubSpot correlation ID for debugging'
    },
    {
      name: 'raw_response',
      type: 'object',
      description: 'The complete raw response from HubSpot API'
    }
  ],
  async execute(inputs, context) {
    const { accessToken, action, ...actionInputs } = inputs;

    // Resolve variables in inputs
    const resolvedInputs = Object.fromEntries(
      Object.entries(actionInputs).map(([key, value]) => [
        key,
        typeof value === 'string' ? resolveVariable(value) : value
      ])
    );

    const authToken = resolveVariable(accessToken);
    if (!authToken || typeof authToken !== 'string' || authToken.trim() === '') {
      throw new Error('Access token is required and must be a valid string. Please check your environment variables or variable bindings.');
    }

    try {
      // Use Supabase proxy function for HubSpot API calls
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('hubspot-proxy', {
        body: {
          accessToken: authToken,
          action: resolveVariable(action),
          inputs: resolvedInputs
        }
      });

      if (error) {
        throw new Error(`HubSpot proxy error: ${error.message}`);
      }

      return data;
    } catch (error) {
      // Enhanced error handling to surface HubSpot-specific errors
      if (error.message?.includes('Authentication credentials not found')) {
        throw new Error('HubSpot authentication failed. Please verify your access token is correct and not expired. Legacy API keys are deprecated - use Private App tokens instead.');
      }
      throw new Error(`HubSpot operation failed: ${error.message}`);
    }
  }
};