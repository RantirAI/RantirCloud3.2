import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { network, action, query, address, blockHash, blockNumber, txHash, tokenAddress, limit } = await req.json();
    
    console.log(`[Blockscout] Action: ${action}, Network: ${network}`);
    
    if (!network) {
      throw new Error("Network is required (e.g., eth, polygon, optimism)");
    }

    if (!action) {
      throw new Error("Action is required");
    }

    // Validate required parameters per action
    const requiredParams = {
      search: ['query'],
      checkRedirect: ['blockNumber'],
      getBlockByHash: ['blockHash'],
      getBlockTransactions: ['blockHash'],
      getBlockWithdrawals: ['blockHash'],
      getTransactionByHash: ['txHash'],
      getTransactionTokenTransfers: ['txHash'],
      getTransactionInternalTransactions: ['txHash'],
      getTransactionLogs: ['txHash'],
      getTransactionRawTrace: ['txHash'],
      getTransactionStateChanges: ['txHash'],
      getTransactionSummary: ['txHash'],
      getAddressByHash: ['address'],
      getAddressCounters: ['address'],
      getAddressTransactions: ['address'],
      getAddressTokenTransfers: ['address'],
      getAddressLogs: ['address'],
      getAddressBlocksValidated: ['address'],
      getAddressTokenBalances: ['address'],
      getAddressTokens: ['address'],
      getAddressWithdrawals: ['address'],
      getAddressCoinBalanceHistory: ['address'],
      getAddressCoinBalanceHistoryByDay: ['address'],
      getTokenByAddress: ['address'],
      getTokenTransfers: ['tokenAddress'],
      getTokenHolders: ['tokenAddress'],
      getTokenCounters: ['tokenAddress'],
      getTokenInstances: ['tokenAddress'],
    };

    const required = requiredParams[action];
    if (required) {
      const params = { query, address, blockHash, blockNumber, txHash, tokenAddress };
      const missing = required.filter(param => !params[param]);
      if (missing.length > 0) {
        throw new Error(`Missing required parameters for ${action}: ${missing.join(', ')}`);
      }
    }

    const baseUrl = `https://${network}.blockscout.com/api/v2`;
    let url = baseUrl;
    let response;

    switch (action) {
      case 'search':
        url = `${baseUrl}/search?q=${encodeURIComponent(query)}`;
        break;
      case 'checkRedirect':
        url = `${baseUrl}/search/check-redirect?q=${encodeURIComponent(blockNumber)}`;
        break;
      case 'getBlocks':
        url = `${baseUrl}/blocks${limit ? `?limit=${limit}` : ''}`;
        break;
      case 'getMainPageBlocks':
        url = `${baseUrl}/main-page/blocks`;
        break;
      case 'getBlockByHash':
        url = `${baseUrl}/blocks/${blockHash}`;
        break;
      case 'getBlockTransactions':
        url = `${baseUrl}/blocks/${blockHash}/transactions`;
        break;
      case 'getBlockWithdrawals':
        url = `${baseUrl}/blocks/${blockHash}/withdrawals`;
        break;
      case 'getTransactions':
        url = `${baseUrl}/transactions${limit ? `?limit=${limit}` : ''}`;
        break;
      case 'getMainPageTransactions':
        url = `${baseUrl}/main-page/transactions`;
        break;
      case 'getTransactionByHash':
        url = `${baseUrl}/transactions/${txHash}`;
        break;
      case 'getTransactionTokenTransfers':
        url = `${baseUrl}/transactions/${txHash}/token-transfers`;
        break;
      case 'getTransactionInternalTransactions':
        url = `${baseUrl}/transactions/${txHash}/internal-transactions`;
        break;
      case 'getTransactionLogs':
        url = `${baseUrl}/transactions/${txHash}/logs`;
        break;
      case 'getTransactionRawTrace':
        url = `${baseUrl}/transactions/${txHash}/raw-trace`;
        break;
      case 'getTransactionStateChanges':
        url = `${baseUrl}/transactions/${txHash}/state-changes`;
        break;
      case 'getTransactionSummary':
        url = `${baseUrl}/transactions/${txHash}/summary`;
        break;
      case 'getAddresses':
        url = `${baseUrl}/addresses`;
        break;
      case 'getAddressByHash':
        url = `${baseUrl}/addresses/${address}`;
        break;
      case 'getAddressCounters':
        url = `${baseUrl}/addresses/${address}/counters`;
        break;
      case 'getAddressTransactions':
        url = `${baseUrl}/addresses/${address}/transactions${limit ? `?limit=${limit}` : ''}`;
        break;
      case 'getAddressTokenTransfers':
        url = `${baseUrl}/addresses/${address}/token-transfers`;
        break;
      case 'getAddressLogs':
        url = `${baseUrl}/addresses/${address}/logs`;
        break;
      case 'getAddressBlocksValidated':
        url = `${baseUrl}/addresses/${address}/blocks-validated`;
        break;
      case 'getAddressTokenBalances':
        url = `${baseUrl}/addresses/${address}/token-balances`;
        break;
      case 'getAddressTokens':
        url = `${baseUrl}/addresses/${address}/tokens`;
        break;
      case 'getAddressWithdrawals':
        url = `${baseUrl}/addresses/${address}/withdrawals`;
        break;
      case 'getAddressCoinBalanceHistory':
        url = `${baseUrl}/addresses/${address}/coin-balance-history`;
        break;
      case 'getAddressCoinBalanceHistoryByDay':
        url = `${baseUrl}/addresses/${address}/coin-balance-history-by-day`;
        break;
      case 'getTokens':
        url = `${baseUrl}/tokens`;
        break;
      case 'getTokenByAddress':
        url = `${baseUrl}/tokens/${address}`;
        break;
      case 'getTokenTransfers':
        url = `${baseUrl}/tokens/${tokenAddress}/transfers${limit ? `?limit=${limit}` : ''}`;
        break;
      case 'getTokenHolders':
        url = `${baseUrl}/tokens/${tokenAddress}/holders`;
        break;
      case 'getTokenCounters':
        url = `${baseUrl}/tokens/${tokenAddress}/counters`;
        break;
      case 'getTokenInstances':
        url = `${baseUrl}/tokens/${tokenAddress}/instances`;
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[Blockscout] Fetching: ${url}`);
    response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Blockscout] API error (${response.status}):`, errorText);
      throw new Error(`Blockscout API error (${response.status}): ${errorText}`);
    }

    // Check if response has content
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    
    console.log(`[Blockscout] Response - Content-Type: ${contentType}, Content-Length: ${contentLength}`);

    // Handle empty responses
    if (contentLength === '0' || !contentType?.includes('application/json')) {
      console.log(`[Blockscout] Empty or non-JSON response, returning empty object`);
      return new Response(JSON.stringify({}), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const text = await response.text();
    if (!text || text.trim().length === 0) {
      console.log(`[Blockscout] Empty response body, returning empty object`);
      return new Response(JSON.stringify({}), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result;
    try {
      result = JSON.parse(text);
      console.log(`[Blockscout] Successfully parsed response`);
    } catch (parseError) {
      console.error(`[Blockscout] JSON parse error:`, parseError);
      throw new Error(`Failed to parse Blockscout API response: ${parseError.message}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Blockscout error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
