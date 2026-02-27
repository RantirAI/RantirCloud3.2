import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Copy, Check, ExternalLink, ShieldCheck, Webhook, Code2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

const WEBHOOK_PROVIDERS = {
  webflow: {
    name: 'Webflow',
    color: '#4353FF',
    description: 'Connect your Webflow site to trigger flows on form submissions, CMS changes, and e-commerce events.',
    signatureHeader: 'X-Webflow-Signature',
    algorithm: 'HMAC-SHA256 (base64)',
    setupSteps: [
      'Go to your Webflow site dashboard',
      'Navigate to Site Settings → Integrations → Webhooks',
      'Click "Add Webhook" and enter your flow\'s endpoint URL',
      'Select the events you want to trigger (e.g., form_submission, ecomm_new_order)',
      'Copy the Signing Secret from Webflow',
      'Paste it in the "External Webhook Secret" field in your flow deployment settings',
    ],
    events: [
      { name: 'form_submission', description: 'When a form is submitted on your site' },
      { name: 'site_publish', description: 'When your site is published' },
      { name: 'ecomm_new_order', description: 'When a new e-commerce order is placed' },
      { name: 'ecomm_order_changed', description: 'When an order status changes' },
      { name: 'collection_item_created', description: 'When a new CMS item is created' },
      { name: 'collection_item_changed', description: 'When a CMS item is updated' },
      { name: 'collection_item_deleted', description: 'When a CMS item is deleted' },
      { name: 'memberships_user_account_added', description: 'When a new member signs up' },
    ],
    examplePayload: `{
  "_id": "580e63fc8c9a982ac9b8b749",
  "name": "form_submission",
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Hello!"
  },
  "site": "580e63e98c9a982ac9b8b744"
}`,
    docs: 'https://developers.webflow.com/data/docs/webhooks',
  },
  stripe: {
    name: 'Stripe',
    color: '#635BFF',
    description: 'Process Stripe payment events like successful charges, subscription updates, and customer changes.',
    signatureHeader: 'Stripe-Signature',
    algorithm: 'HMAC-SHA256 with timestamp (v1)',
    setupSteps: [
      'Go to your Stripe Dashboard → Developers → Webhooks',
      'Click "Add endpoint" and enter your flow\'s endpoint URL',
      'Select the events you want to receive (e.g., checkout.session.completed)',
      'Click "Add endpoint" to save',
      'Click on your endpoint, then "Reveal" the Signing Secret',
      'Copy the secret (starts with whsec_) and paste it in your flow deployment settings',
    ],
    events: [
      { name: 'checkout.session.completed', description: 'Payment completed via Checkout' },
      { name: 'payment_intent.succeeded', description: 'Successful payment' },
      { name: 'payment_intent.payment_failed', description: 'Failed payment attempt' },
      { name: 'customer.subscription.created', description: 'New subscription created' },
      { name: 'customer.subscription.updated', description: 'Subscription modified' },
      { name: 'customer.subscription.deleted', description: 'Subscription canceled' },
      { name: 'invoice.paid', description: 'Invoice was paid' },
      { name: 'invoice.payment_failed', description: 'Invoice payment failed' },
    ],
    examplePayload: `{
  "id": "evt_1Hp4x6KI...",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_...",
      "customer_email": "john@example.com",
      "amount_total": 2000,
      "currency": "usd"
    }
  }
}`,
    docs: 'https://stripe.com/docs/webhooks',
  },
  github: {
    name: 'GitHub',
    color: '#24292e',
    description: 'Automate your development workflow with GitHub events like pushes, pull requests, and issue updates.',
    signatureHeader: 'X-Hub-Signature-256',
    algorithm: 'HMAC-SHA256',
    setupSteps: [
      'Go to your GitHub repository → Settings → Webhooks',
      'Click "Add webhook"',
      'Enter your flow\'s endpoint URL in the Payload URL field',
      'Set Content type to "application/json"',
      'Enter a secret (you create this) and save it',
      'Paste the same secret in your flow deployment settings',
      'Select the events you want to trigger',
    ],
    events: [
      { name: 'push', description: 'Code pushed to repository' },
      { name: 'pull_request', description: 'PR opened, closed, or synchronized' },
      { name: 'issues', description: 'Issue opened, edited, or closed' },
      { name: 'issue_comment', description: 'Comment on an issue or PR' },
      { name: 'release', description: 'Release published' },
      { name: 'workflow_run', description: 'GitHub Action completed' },
      { name: 'star', description: 'Repository starred' },
      { name: 'fork', description: 'Repository forked' },
    ],
    examplePayload: `{
  "action": "opened",
  "pull_request": {
    "number": 123,
    "title": "Add new feature",
    "user": { "login": "octocat" },
    "head": { "ref": "feature-branch" },
    "base": { "ref": "main" }
  },
  "repository": {
    "full_name": "owner/repo"
  }
}`,
    docs: 'https://docs.github.com/en/webhooks',
  },
  shopify: {
    name: 'Shopify',
    color: '#96bf48',
    description: 'Connect your Shopify store to handle orders, customer events, and inventory updates.',
    signatureHeader: 'X-Shopify-Hmac-SHA256',
    algorithm: 'HMAC-SHA256 (base64)',
    setupSteps: [
      'Go to Shopify Admin → Settings → Notifications → Webhooks',
      'Or use a Shopify app to create webhooks programmatically',
      'Click "Create webhook" and select the event',
      'Enter your flow\'s endpoint URL',
      'Copy the Webhook API version and signing secret',
      'Paste the secret in your flow deployment settings',
    ],
    events: [
      { name: 'orders/create', description: 'New order placed' },
      { name: 'orders/paid', description: 'Order payment completed' },
      { name: 'orders/fulfilled', description: 'Order shipped' },
      { name: 'customers/create', description: 'New customer registered' },
      { name: 'products/update', description: 'Product information changed' },
      { name: 'inventory_levels/update', description: 'Stock levels changed' },
      { name: 'carts/create', description: 'Shopping cart created' },
      { name: 'checkouts/create', description: 'Checkout initiated' },
    ],
    examplePayload: `{
  "id": 820982911946154508,
  "email": "john@example.com",
  "total_price": "99.00",
  "currency": "USD",
  "line_items": [{
    "title": "Product Name",
    "quantity": 1,
    "price": "99.00"
  }]
}`,
    docs: 'https://shopify.dev/docs/api/admin-rest/webhooks',
  },
  slack: {
    name: 'Slack',
    color: '#4A154B',
    description: 'Build Slack integrations that respond to messages, reactions, and workspace events.',
    signatureHeader: 'X-Slack-Signature',
    algorithm: 'HMAC-SHA256 with timestamp (v0)',
    setupSteps: [
      'Go to api.slack.com/apps and create or select your app',
      'Navigate to "Event Subscriptions" and enable events',
      'Enter your flow\'s endpoint URL as the Request URL',
      'Slack will verify your endpoint with a challenge request',
      'Go to "Basic Information" and copy the "Signing Secret"',
      'Paste the secret in your flow deployment settings',
    ],
    events: [
      { name: 'message.channels', description: 'Message in a public channel' },
      { name: 'message.im', description: 'Direct message to your bot' },
      { name: 'app_mention', description: 'Your bot was mentioned' },
      { name: 'reaction_added', description: 'Emoji reaction added' },
      { name: 'member_joined_channel', description: 'User joined a channel' },
      { name: 'file_shared', description: 'File was shared' },
      { name: 'workflow_step_execute', description: 'Workflow step triggered' },
    ],
    examplePayload: `{
  "type": "event_callback",
  "event": {
    "type": "message",
    "channel": "C0123456789",
    "user": "U0123456789",
    "text": "Hello, world!",
    "ts": "1234567890.123456"
  }
}`,
    docs: 'https://api.slack.com/apis/connections/events-api',
  },
  custom: {
    name: 'Custom / Generic',
    color: '#6366f1',
    description: 'Connect any webhook provider using standard HMAC signature verification.',
    signatureHeader: 'X-Webhook-Signature (configurable)',
    algorithm: 'HMAC-SHA256 (configurable)',
    setupSteps: [
      'Configure your external service to send webhooks to your flow\'s endpoint URL',
      'Set up HMAC signature verification with a shared secret',
      'In your flow deployment settings, select "Custom" as the provider',
      'Enter the header name where your service sends the signature',
      'Enter the signing secret from your external service',
      'Configure the signature algorithm (sha256 or sha1)',
    ],
    events: [
      { name: 'Any event', description: 'Configure based on your provider\'s documentation' },
    ],
    examplePayload: `{
  "event": "custom_event",
  "data": {
    "key": "value"
  },
  "timestamp": "2024-01-15T12:00:00Z"
}`,
    docs: '',
  },
  postman: {
    name: 'Postman / cURL',
    color: '#FF6C37',
    description: 'Test your webhook endpoints using Postman or cURL before connecting external services.',
    signatureHeader: 'X-API-Key',
    algorithm: 'API Key Authentication',
    setupSteps: [
      'Open Postman and click "New Request"',
      'Set the HTTP method to POST (or your configured method)',
      'Paste your webhook URL from the Endpoint tab',
      'Go to Headers and add "Content-Type: application/json"',
      'Add "X-API-Key" header with your generated API key',
      'Go to Body → raw → JSON and add your test payload',
      'Click Send and verify the response',
    ],
    events: [
      { name: 'test_webhook', description: 'Send test payload to verify flow execution' },
      { name: 'simulate_provider', description: 'Use provider example payloads to test integrations' },
    ],
    examplePayload: `{
  "event": "test_webhook",
  "data": {
    "name": "Test User",
    "email": "test@example.com"
  },
  "timestamp": "2024-01-15T12:00:00Z"
}`,
    docs: 'https://learning.postman.com/docs/sending-requests/requests/',
  },
};

export function WebhookKnowledgeBase() {
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6 p-4 overflow-y-auto">
      {/* Introduction */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Webhook Integration Guide
          </CardTitle>
          <CardDescription>
            Learn how to connect external services to trigger your flows automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Webhook className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">What are Webhooks?</p>
                <p className="text-muted-foreground text-xs">
                  Webhooks are HTTP callbacks that notify your flow when events happen in external services.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Signature Verification</p>
                <p className="text-muted-foreground text-xs">
                  We verify signatures using HMAC to ensure webhooks are from trusted sources.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Documentation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Code2 className="w-4 h-4" />
            Provider Setup Guides
          </CardTitle>
          <CardDescription>
            Step-by-step instructions for each webhook provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion 
            type="single" 
            collapsible 
            value={expandedProvider || undefined}
            onValueChange={(val) => setExpandedProvider(val || null)}
          >
            {Object.entries(WEBHOOK_PROVIDERS).map(([key, provider]) => (
              <AccordionItem key={key} value={key} className="border rounded-lg mb-2 px-3">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: provider.color }}
                    >
                      {provider.name.charAt(0)}
                    </div>
                    <span className="font-medium">{provider.name}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto mr-2">
                      {provider.algorithm.split(' ')[0]}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4 space-y-4">
                  {/* Description */}
                  <p className="text-sm text-muted-foreground">{provider.description}</p>

                  {/* Technical Details */}
                  <div className="grid gap-2 text-xs">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">Signature Header</span>
                      <code className="font-mono text-primary">{provider.signatureHeader}</code>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">Algorithm</span>
                      <code className="font-mono">{provider.algorithm}</code>
                    </div>
                  </div>

                  {/* Setup Steps */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Setup Steps</h4>
                    <ol className="space-y-2 text-xs">
                      {provider.setupSteps.map((step, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-[10px] font-medium">
                            {i + 1}
                          </span>
                          <span className="text-muted-foreground pt-0.5">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Events */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Available Events</h4>
                    <div className="grid gap-1.5">
                      {provider.events.map((event, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {event.name}
                          </code>
                          <span className="text-muted-foreground">{event.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Example Payload */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">Example Payload</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => copyToClipboard(provider.examplePayload, `${key}-payload`)}
                      >
                        {copied === `${key}-payload` ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <pre className="bg-muted p-3 rounded-lg text-[10px] overflow-x-auto font-mono">
                      {provider.examplePayload}
                    </pre>
                  </div>

                  {/* Documentation Link */}
                  {provider.docs && (
                    <a
                      href={provider.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View official documentation
                    </a>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">💡 Quick Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">Testing Webhooks:</strong> Use the "Test" button in your flow to simulate incoming webhook data before connecting to external services.
          </p>
          <p>
            <strong className="text-foreground">Transformations:</strong> Use the webhook trigger's transform code to extract specific fields from complex payloads.
          </p>
          <p>
            <strong className="text-foreground">Error Handling:</strong> Most providers will retry failed webhooks. Add a Response node to return proper status codes.
          </p>
          <p>
            <strong className="text-foreground">Debugging:</strong> Check the Monitoring tab to view incoming webhook payloads and any execution errors.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
