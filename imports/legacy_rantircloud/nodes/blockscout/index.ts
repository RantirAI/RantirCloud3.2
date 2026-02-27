import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const blockscoutNode: NodePlugin = {
  type: 'blockscout',
  name: 'Blockscout',
  description: 'Query blockchain data using Blockscout explorer',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/blockscout.png',
  color: '#6366F1',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: false,
      description: 'Blockscout API key (optional for basic queries)',
      isApiKey: true,
    },
    {
      name: 'network',
      label: 'Network',
      type: 'select',
      required: true,
      options: [
        { label: 'Ethereum', value: 'eth' },
        { label: 'Polygon', value: 'polygon' },
        { label: 'Optimism', value: 'optimism' },
        { label: 'Arbitrum', value: 'arbitrum' },
        { label: 'Base', value: 'base' },
      ],
      description: 'Blockchain network to query',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Search', value: 'search' },
        { label: 'Check Redirect', value: 'checkRedirect' },
        { label: 'Get Blocks', value: 'getBlocks' },
        { label: 'Get Main Page Blocks', value: 'getMainPageBlocks' },
        { label: 'Get Block By Hash', value: 'getBlockByHash' },
        { label: 'Get Block Transactions', value: 'getBlockTransactions' },
        { label: 'Get Block Withdrawals', value: 'getBlockWithdrawals' },
        { label: 'Get Transactions', value: 'getTransactions' },
        { label: 'Get Main Page Transactions', value: 'getMainPageTransactions' },
        { label: 'Get Transaction By Hash', value: 'getTransactionByHash' },
        { label: 'Get Transaction Token Transfers', value: 'getTransactionTokenTransfers' },
        { label: 'Get Transaction Internal Transactions', value: 'getTransactionInternalTransactions' },
        { label: 'Get Transaction Logs', value: 'getTransactionLogs' },
        { label: 'Get Transaction Raw Trace', value: 'getTransactionRawTrace' },
        { label: 'Get Transaction State Changes', value: 'getTransactionStateChanges' },
        { label: 'Get Transaction Summary', value: 'getTransactionSummary' },
        { label: 'Get Addresses', value: 'getAddresses' },
        { label: 'Get Address By Hash', value: 'getAddressByHash' },
        { label: 'Get Address Counters', value: 'getAddressCounters' },
        { label: 'Get Address Transactions', value: 'getAddressTransactions' },
        { label: 'Get Address Token Transfers', value: 'getAddressTokenTransfers' },
        { label: 'Get Address Logs', value: 'getAddressLogs' },
        { label: 'Get Address Blocks Validated', value: 'getAddressBlocksValidated' },
        { label: 'Get Address Token Balances', value: 'getAddressTokenBalances' },
        { label: 'Get Address Tokens', value: 'getAddressTokens' },
        { label: 'Get Address Withdrawals', value: 'getAddressWithdrawals' },
        { label: 'Get Address Coin Balance History', value: 'getAddressCoinBalanceHistory' },
        { label: 'Get Address Coin Balance History By Day', value: 'getAddressCoinBalanceHistoryByDay' },
        { label: 'Get Tokens', value: 'getTokens' },
        { label: 'Get Token By Address', value: 'getTokenByAddress' },
        { label: 'Get Token Transfers', value: 'getTokenTransfers' },
        { label: 'Get Token Holders', value: 'getTokenHolders' },
        { label: 'Get Token Counters', value: 'getTokenCounters' },
        { label: 'Get Token Instances', value: 'getTokenInstances' },
      ],
      description: 'Action to perform',
    },
    {
      name: 'query',
      label: 'Search Query',
      type: 'text',
      description: 'Search query string',
      showWhen: {
        field: 'action',
        values: ['search']
      }
    },
    {
      name: 'address',
      label: 'Address',
      type: 'text',
      description: 'Blockchain address',
      placeholder: '0x...',
      showWhen: {
        field: 'action',
        values: ['getAddressByHash', 'getAddressCounters', 'getAddressTransactions', 'getAddressTokenTransfers', 
                 'getAddressLogs', 'getAddressBlocksValidated', 'getAddressTokenBalances', 'getAddressTokens', 
                 'getAddressWithdrawals', 'getAddressCoinBalanceHistory', 'getAddressCoinBalanceHistoryByDay',
                 'getTokenByAddress']
      }
    },
    {
      name: 'blockHash',
      label: 'Block Hash',
      type: 'text',
      description: 'Block hash',
      placeholder: '0x...',
      showWhen: {
        field: 'action',
        values: ['getBlockByHash', 'getBlockTransactions', 'getBlockWithdrawals']
      }
    },
    {
      name: 'blockNumber',
      label: 'Block Number',
      type: 'text',
      description: 'Block number',
      showWhen: {
        field: 'action',
        values: ['checkRedirect']
      }
    },
    {
      name: 'txHash',
      label: 'Transaction Hash',
      type: 'text',
      description: 'Transaction hash',
      placeholder: '0x...',
      showWhen: {
        field: 'action',
        values: ['getTransactionByHash', 'getTransactionTokenTransfers', 'getTransactionInternalTransactions',
                 'getTransactionLogs', 'getTransactionRawTrace', 'getTransactionStateChanges', 'getTransactionSummary']
      }
    },
    {
      name: 'tokenAddress',
      label: 'Token Address',
      type: 'text',
      description: 'Token contract address',
      placeholder: '0x...',
      showWhen: {
        field: 'action',
        values: ['getTokenTransfers', 'getTokenHolders', 'getTokenCounters', 'getTokenInstances']
      }
    },
    {
      name: 'limit',
      label: 'Limit',
      type: 'number',
      description: 'Number of results to return',
      showWhen: {
        field: 'action',
        values: ['getBlocks', 'getTransactions', 'getAddressTransactions', 'getTokenTransfers']
      }
    },
  ],
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'Blockchain data',
    },
  ],
  async execute(inputs) {
    const { action, query, address, blockHash, blockNumber, txHash, tokenAddress } = inputs;

    // Validate required parameters based on action
    const validationErrors = [];
    
    if (action === 'search' && !query) {
      validationErrors.push('Search query is required for search action');
    }
    if (action === 'checkRedirect' && !blockNumber) {
      validationErrors.push('Block number is required for checkRedirect action');
    }
    if (['getBlockByHash', 'getBlockTransactions', 'getBlockWithdrawals'].includes(action) && !blockHash) {
      validationErrors.push('Block hash is required for this action');
    }
    if ([
      'getTransactionByHash', 'getTransactionTokenTransfers', 'getTransactionInternalTransactions',
      'getTransactionLogs', 'getTransactionRawTrace', 'getTransactionStateChanges', 'getTransactionSummary'
    ].includes(action) && !txHash) {
      validationErrors.push('Transaction hash is required for this action');
    }
    if ([
      'getAddressByHash', 'getAddressCounters', 'getAddressTransactions', 'getAddressTokenTransfers',
      'getAddressLogs', 'getAddressBlocksValidated', 'getAddressTokenBalances', 'getAddressTokens',
      'getAddressWithdrawals', 'getAddressCoinBalanceHistory', 'getAddressCoinBalanceHistoryByDay',
      'getTokenByAddress'
    ].includes(action) && !address) {
      validationErrors.push('Address is required for this action');
    }
    if (['getTokenTransfers', 'getTokenHolders', 'getTokenCounters', 'getTokenInstances'].includes(action) && !tokenAddress) {
      validationErrors.push('Token address is required for this action');
    }

    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    const { data, error } = await supabase.functions.invoke('blockscout-action', {
      body: inputs,
    });

    if (error) throw error;
    return { result: data };
  },
};
