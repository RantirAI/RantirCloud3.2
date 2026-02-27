import { corsHeaders } from '../_shared/cors.ts';

console.log('Actual Budget Proxy Function Starting');

Deno.serve(async (req) => {
  console.log(`Actual Budget Proxy - ${req.method} request received`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { serverUrl, password, action, ...actionInputs } = await req.json();

    if (!serverUrl) {
      console.error('Actual Budget Proxy - Server URL is missing');
      throw new Error('Actual Budget server URL is required');
    }

    console.log(`Actual Budget Proxy - Processing action: ${action}`);

    // Open budget if needed
    if (actionInputs.budgetId) {
      console.log(`Actual Budget Proxy - Opening budget: ${actionInputs.budgetId}`);
      const openResponse = await fetch(`${serverUrl}/api/budget/${actionInputs.budgetId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(password && { 'X-ACTUAL-PASSWORD': password })
        },
        body: JSON.stringify({})
      });

      if (!openResponse.ok) {
        throw new Error(`Failed to open budget: ${openResponse.status}`);
      }
    }

    let endpoint = '';
    let method = 'GET';
    let requestBody = null;

    switch (action) {
      case 'get_accounts':
        endpoint = '/api/accounts';
        break;

      case 'create_account':
        endpoint = '/api/accounts';
        method = 'POST';
        requestBody = {
          name: actionInputs.accountName,
          type: actionInputs.accountType || 'checking',
          offBudget: actionInputs.offBudget || false,
        };
        break;

      case 'get_categories':
        endpoint = '/api/categories';
        break;

      case 'create_category':
        endpoint = '/api/categories';
        method = 'POST';
        requestBody = {
          name: actionInputs.categoryName,
          groupId: actionInputs.groupId,
        };
        break;

      case 'get_transactions':
        endpoint = '/api/transactions';
        if (actionInputs.accountId) {
          endpoint += `?account=${actionInputs.accountId}`;
        }
        break;

      case 'create_transaction':
        endpoint = '/api/transactions';
        method = 'POST';
        requestBody = {
          account: actionInputs.accountId,
          amount: parseInt(actionInputs.amount) * 100, // Convert to cents
          payee: actionInputs.payee,
          notes: actionInputs.notes || '',
          date: actionInputs.date,
          category: actionInputs.categoryId,
        };
        break;

      case 'update_transaction':
        endpoint = `/api/transactions/${actionInputs.transactionId}`;
        method = 'PATCH';
        requestBody = {};
        if ((actionInputs as any).amount) (requestBody as any).amount = parseInt((actionInputs as any).amount) * 100;
        if ((actionInputs as any).payee) (requestBody as any).payee = (actionInputs as any).payee;
        if ((actionInputs as any).notes) (requestBody as any).notes = (actionInputs as any).notes;
        if ((actionInputs as any).date) (requestBody as any).date = (actionInputs as any).date;
        if ((actionInputs as any).categoryId) (requestBody as any).category = (actionInputs as any).categoryId;
        break;

      case 'delete_transaction':
        endpoint = `/api/transactions/${actionInputs.transactionId}`;
        method = 'DELETE';
        break;

      case 'get_budgets':
        endpoint = '/api/budgets';
        break;

      case 'custom_api_call':
        endpoint = actionInputs.endpoint;
        method = actionInputs.method || 'GET';
        if (actionInputs.requestBody) {
          try {
            requestBody = JSON.parse(actionInputs.requestBody);
          } catch (error) {
            throw new Error('Invalid JSON in request body');
          }
        }
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    console.log(`Actual Budget Proxy - Making ${method} request to: ${serverUrl}${endpoint}`);

    const response = await fetch(`${serverUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(password && { 'X-ACTUAL-PASSWORD': password })
      },
      body: requestBody ? JSON.stringify(requestBody) : null,
    });

    console.log(`Actual Budget Proxy - Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
      console.error('Actual Budget Proxy - API error:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Actual Budget Proxy - Request successful');

    const successResponse = {
      success: true,
      data: result,
      accounts: Array.isArray(result) && action === 'get_accounts' ? result : null,
      account: !Array.isArray(result) && action === 'create_account' ? result : null,
      categories: Array.isArray(result) && action === 'get_categories' ? result : null,
      category: !Array.isArray(result) && action === 'create_category' ? result : null,
      transactions: Array.isArray(result) && action === 'get_transactions' ? result : null,
      transaction: !Array.isArray(result) && ['create_transaction', 'update_transaction'].includes(action) ? result : null,
      budgets: Array.isArray(result) && action === 'get_budgets' ? result : null,
      error: null,
    };

    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Actual Budget Proxy - Error:', errorMessage);
    
    const errorResponse = {
      success: false,
      data: null,
      accounts: null,
      account: null,
      categories: null,
      category: null,
      transactions: null,
      transaction: null,
      budgets: null,
      error: errorMessage,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});