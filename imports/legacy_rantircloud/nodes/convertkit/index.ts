import { NodePlugin } from '@/types/node-plugin';

export const convertkitNode: NodePlugin = {
  type: 'convertkit',
  name: 'ConvertKit',
  description: 'Email marketing platform for creators',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/convertkit.png',
  color: '#FB6970',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your ConvertKit API key',
      isApiKey: true,
    },
    {
      name: 'apiSecret',
      label: 'API Secret',
      type: 'text',
      required: false,
      description: 'Your ConvertKit API secret (required for some actions)',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        // Subscribers
        { label: 'Get Subscriber by ID', value: 'getSubscriberById' },
        { label: 'Get Subscriber by Email', value: 'getSubscriberByEmail' },
        { label: 'List Subscribers', value: 'listSubscribers' },
        { label: 'Update Subscriber', value: 'updateSubscriber' },
        { label: 'Unsubscribe Subscriber', value: 'unsubscribeSubscriber' },
        { label: 'List Subscriber Tags by Email', value: 'listSubscriberTagsByEmail' },
        { label: 'List Tags by Subscriber ID', value: 'listTagsBySubscriberId' },
        // Webhooks
        { label: 'Create Webhook', value: 'createWebhook' },
        { label: 'Delete Webhook', value: 'deleteWebhook' },
        // Custom Fields
        { label: 'List Fields', value: 'listFields' },
        { label: 'Create Field', value: 'createField' },
        { label: 'Update Field', value: 'updateField' },
        { label: 'Delete Field', value: 'deleteField' },
        // Broadcasts
        { label: 'List Broadcasts', value: 'listBroadcasts' },
        { label: 'Create Broadcast', value: 'createBroadcast' },
        { label: 'Get Broadcast by ID', value: 'getBroadcastById' },
        { label: 'Update Broadcast', value: 'updateBroadcast' },
        { label: 'Delete Broadcast', value: 'deleteBroadcast' },
        { label: 'Broadcast Stats', value: 'broadcastStats' },
        // Forms
        { label: 'List Forms', value: 'listForms' },
        { label: 'Add Subscriber to Form', value: 'addSubscriberToForm' },
        { label: 'List Form Subscriptions', value: 'listFormSubscriptions' },
        // Sequences
        { label: 'List Sequences', value: 'listSequences' },
        { label: 'Add Subscriber to Sequence', value: 'addSubscriberToSequence' },
        { label: 'List Subscriptions to Sequence', value: 'listSubscriptionsToSequence' },
        // Tags
        { label: 'List Tags', value: 'listTags' },
        { label: 'Create Tag', value: 'createTag' },
        { label: 'Tag Subscriber', value: 'tagSubscriber' },
        { label: 'Remove Tag from Subscriber by Email', value: 'removeTagFromSubscriberByEmail' },
        { label: 'Remove Tag from Subscriber by ID', value: 'removeTagFromSubscriberById' },
        { label: 'List Subscriptions to a Tag', value: 'listSubscriptionsToATag' },
        // Purchases
        { label: 'List Purchases', value: 'listPurchases' },
        { label: 'Get Purchase by ID', value: 'getPurchaseById' },
        { label: 'Create Single Purchase', value: 'createSinglePurchase' },
        { label: 'Create Purchases', value: 'createPurchases' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    // Subscriber actions
    if (action === 'getSubscriberById' || action === 'listTagsBySubscriberId') {
      inputs.push(
        { name: 'subscriberId', label: 'Subscriber ID', type: 'text' as const, required: true, description: 'The subscriber ID' }
      );
    } else if (action === 'getSubscriberByEmail' || action === 'listSubscriberTagsByEmail') {
      inputs.push(
        { name: 'email', label: 'Email', type: 'text' as const, required: true, description: 'Subscriber email address' }
      );
    } else if (action === 'listSubscribers') {
      inputs.push(
        { name: 'page', label: 'Page', type: 'number' as const, required: false, description: 'Page number' },
        { name: 'sortOrder', label: 'Sort Order', type: 'select' as const, required: false, options: [
          { label: 'Ascending', value: 'asc' },
          { label: 'Descending', value: 'desc' },
        ]},
        { name: 'sortField', label: 'Sort Field', type: 'select' as const, required: false, options: [
          { label: 'Created At', value: 'created_at' },
          { label: 'Cancelled At', value: 'cancelled_at' },
        ]}
      );
    } else if (action === 'updateSubscriber') {
      inputs.push(
        { name: 'subscriberId', label: 'Subscriber ID', type: 'text' as const, required: true },
        { name: 'firstName', label: 'First Name', type: 'text' as const, required: false },
        { name: 'email', label: 'New Email', type: 'text' as const, required: false },
        { name: 'fields', label: 'Custom Fields (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    } else if (action === 'unsubscribeSubscriber') {
      inputs.push(
        { name: 'email', label: 'Email', type: 'text' as const, required: true, description: 'Email to unsubscribe' }
      );
    }
    // Webhook actions
    else if (action === 'createWebhook') {
      inputs.push(
        { name: 'targetUrl', label: 'Target URL', type: 'text' as const, required: true },
        { name: 'event', label: 'Event', type: 'select' as const, required: true, options: [
          { label: 'Subscriber Activate', value: 'subscriber.subscriber_activate' },
          { label: 'Subscriber Unsubscribe', value: 'subscriber.subscriber_unsubscribe' },
          { label: 'Subscriber Bounce', value: 'subscriber.subscriber_bounce' },
          { label: 'Subscriber Complain', value: 'subscriber.subscriber_complain' },
          { label: 'Form Subscribe', value: 'subscriber.form_subscribe' },
          { label: 'Tag Add', value: 'subscriber.tag_add' },
          { label: 'Tag Remove', value: 'subscriber.tag_remove' },
          { label: 'Purchase Create', value: 'purchase.purchase_create' },
        ]}
      );
    } else if (action === 'deleteWebhook') {
      inputs.push(
        { name: 'webhookId', label: 'Webhook ID', type: 'text' as const, required: true }
      );
    }
    // Custom Field actions
    else if (action === 'createField') {
      inputs.push(
        { name: 'label', label: 'Field Label', type: 'text' as const, required: true }
      );
    } else if (action === 'updateField' || action === 'deleteField') {
      inputs.push(
        { name: 'fieldId', label: 'Field ID', type: 'text' as const, required: true }
      );
      if (action === 'updateField') {
        inputs.push({ name: 'label', label: 'New Label', type: 'text' as const, required: true });
      }
    }
    // Broadcast actions
    else if (action === 'createBroadcast') {
      inputs.push(
        { name: 'subject', label: 'Subject', type: 'text' as const, required: true },
        { name: 'content', label: 'Content (HTML)', type: 'textarea' as const, required: true },
        { name: 'description', label: 'Description', type: 'text' as const, required: false },
        { name: 'public', label: 'Public', type: 'select' as const, required: false, options: [
          { label: 'No', value: 'false' },
          { label: 'Yes', value: 'true' },
        ]}
      );
    } else if (action === 'getBroadcastById' || action === 'deleteBroadcast' || action === 'broadcastStats') {
      inputs.push(
        { name: 'broadcastId', label: 'Broadcast ID', type: 'text' as const, required: true }
      );
    } else if (action === 'updateBroadcast') {
      inputs.push(
        { name: 'broadcastId', label: 'Broadcast ID', type: 'text' as const, required: true },
        { name: 'subject', label: 'Subject', type: 'text' as const, required: false },
        { name: 'content', label: 'Content (HTML)', type: 'textarea' as const, required: false },
        { name: 'description', label: 'Description', type: 'text' as const, required: false }
      );
    }
    // Form actions
    else if (action === 'addSubscriberToForm') {
      inputs.push(
        { name: 'formId', label: 'Form ID', type: 'text' as const, required: true },
        { name: 'email', label: 'Email', type: 'text' as const, required: true },
        { name: 'firstName', label: 'First Name', type: 'text' as const, required: false },
        { name: 'fields', label: 'Custom Fields (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    } else if (action === 'listFormSubscriptions') {
      inputs.push(
        { name: 'formId', label: 'Form ID', type: 'text' as const, required: true },
        { name: 'page', label: 'Page', type: 'number' as const, required: false }
      );
    }
    // Sequence actions
    else if (action === 'addSubscriberToSequence') {
      inputs.push(
        { name: 'sequenceId', label: 'Sequence ID', type: 'text' as const, required: true },
        { name: 'email', label: 'Email', type: 'text' as const, required: true },
        { name: 'firstName', label: 'First Name', type: 'text' as const, required: false },
        { name: 'fields', label: 'Custom Fields (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    } else if (action === 'listSubscriptionsToSequence') {
      inputs.push(
        { name: 'sequenceId', label: 'Sequence ID', type: 'text' as const, required: true },
        { name: 'page', label: 'Page', type: 'number' as const, required: false }
      );
    }
    // Tag actions
    else if (action === 'createTag') {
      inputs.push(
        { name: 'tagName', label: 'Tag Name', type: 'text' as const, required: true }
      );
    } else if (action === 'tagSubscriber') {
      inputs.push(
        { name: 'tagId', label: 'Tag ID', type: 'text' as const, required: true },
        { name: 'email', label: 'Email', type: 'text' as const, required: true },
        { name: 'firstName', label: 'First Name', type: 'text' as const, required: false }
      );
    } else if (action === 'removeTagFromSubscriberByEmail') {
      inputs.push(
        { name: 'tagId', label: 'Tag ID', type: 'text' as const, required: true },
        { name: 'email', label: 'Email', type: 'text' as const, required: true }
      );
    } else if (action === 'removeTagFromSubscriberById') {
      inputs.push(
        { name: 'tagId', label: 'Tag ID', type: 'text' as const, required: true },
        { name: 'subscriberId', label: 'Subscriber ID', type: 'text' as const, required: true }
      );
    } else if (action === 'listSubscriptionsToATag') {
      inputs.push(
        { name: 'tagId', label: 'Tag ID', type: 'text' as const, required: true },
        { name: 'page', label: 'Page', type: 'number' as const, required: false }
      );
    }
    // Purchase actions
    else if (action === 'getPurchaseById') {
      inputs.push(
        { name: 'purchaseId', label: 'Purchase ID', type: 'text' as const, required: true }
      );
    } else if (action === 'createSinglePurchase') {
      inputs.push(
        { name: 'email', label: 'Email', type: 'text' as const, required: true },
        { name: 'transactionId', label: 'Transaction ID', type: 'text' as const, required: true },
        { name: 'productId', label: 'Product ID', type: 'text' as const, required: true },
        { name: 'productName', label: 'Product Name', type: 'text' as const, required: true },
        { name: 'currency', label: 'Currency', type: 'text' as const, required: false, default: 'USD' },
        { name: 'subtotal', label: 'Subtotal (cents)', type: 'number' as const, required: true },
        { name: 'total', label: 'Total (cents)', type: 'number' as const, required: true }
      );
    } else if (action === 'createPurchases') {
      inputs.push(
        { name: 'purchases', label: 'Purchases (JSON Array)', type: 'code' as const, language: 'json' as const, required: true, description: 'Array of purchase objects' }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data from ConvertKit' },
    { name: 'subscriberId', type: 'string', description: 'Subscriber ID' },
    { name: 'items', type: 'array', description: 'List of items (subscribers, tags, etc.)' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('convertkit-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
