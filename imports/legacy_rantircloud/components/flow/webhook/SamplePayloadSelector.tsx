import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Webhook, Globe, CreditCard, Github, ShoppingCart, MessageSquare, Mail, Zap } from 'lucide-react';

export interface SamplePayload {
  provider: string;
  eventType: string;
  displayName: string;
  payload: {
    body: any;
    headers: Record<string, string>;
    query: Record<string, string>;
    method: string;
  };
}

// Sample payloads from common webhook providers
export const SAMPLE_PAYLOADS: SamplePayload[] = [
  {
    provider: 'webflow',
    eventType: 'form_submission',
    displayName: 'Webflow - Form Submission',
    payload: {
      body: {
        _id: 'form_123456789',
        displayName: 'Contact Form',
        siteId: 'site_abc123',
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          message: 'Hello, I would like to get in touch.',
          phone: '+1 234 567 8900'
        },
        submittedAt: '2024-01-15T12:00:00.000Z'
      },
      headers: {
        'content-type': 'application/json',
        'x-webflow-signature': 'sha256=abc123...'
      },
      query: {},
      method: 'POST'
    }
  },
  {
    provider: 'webflow',
    eventType: 'ecomm_new_order',
    displayName: 'Webflow - New Order',
    payload: {
      body: {
        orderId: 'ord_123456',
        status: 'pending',
        customerInfo: {
          email: 'customer@example.com',
          firstName: 'Jane',
          lastName: 'Smith'
        },
        purchasedItems: [
          { name: 'Product 1', quantity: 2, price: 29.99 }
        ],
        totals: {
          subtotal: 59.98,
          tax: 5.00,
          total: 64.98
        }
      },
      headers: {
        'content-type': 'application/json',
        'x-webflow-signature': 'sha256=xyz789...'
      },
      query: {},
      method: 'POST'
    }
  },
  {
    provider: 'stripe',
    eventType: 'checkout.session.completed',
    displayName: 'Stripe - Checkout Completed',
    payload: {
      body: {
        id: 'evt_123456789',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_abc123',
            customer_email: 'customer@example.com',
            amount_total: 2999,
            currency: 'usd',
            payment_status: 'paid',
            metadata: {
              product_id: 'prod_123'
            }
          }
        }
      },
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=123456789,v1=abc...'
      },
      query: {},
      method: 'POST'
    }
  },
  {
    provider: 'stripe',
    eventType: 'invoice.paid',
    displayName: 'Stripe - Invoice Paid',
    payload: {
      body: {
        id: 'evt_invoice_paid',
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_123456',
            customer: 'cus_abc123',
            customer_email: 'billing@example.com',
            amount_paid: 4999,
            currency: 'usd',
            status: 'paid'
          }
        }
      },
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=123456789,v1=xyz...'
      },
      query: {},
      method: 'POST'
    }
  },
  {
    provider: 'github',
    eventType: 'push',
    displayName: 'GitHub - Push Event',
    payload: {
      body: {
        ref: 'refs/heads/main',
        repository: {
          full_name: 'owner/repo',
          html_url: 'https://github.com/owner/repo'
        },
        pusher: {
          name: 'developer',
          email: 'dev@example.com'
        },
        commits: [
          {
            id: 'abc123',
            message: 'Update feature',
            author: { name: 'Developer', email: 'dev@example.com' }
          }
        ]
      },
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'push',
        'x-hub-signature-256': 'sha256=...'
      },
      query: {},
      method: 'POST'
    }
  },
  {
    provider: 'shopify',
    eventType: 'orders/create',
    displayName: 'Shopify - Order Created',
    payload: {
      body: {
        id: 12345678901234,
        email: 'buyer@example.com',
        name: '#1001',
        total_price: '99.99',
        currency: 'USD',
        line_items: [
          {
            title: 'Sample Product',
            quantity: 1,
            price: '99.99'
          }
        ],
        shipping_address: {
          first_name: 'John',
          last_name: 'Doe',
          city: 'New York',
          country: 'United States'
        }
      },
      headers: {
        'content-type': 'application/json',
        'x-shopify-hmac-sha256': 'abc123...',
        'x-shopify-topic': 'orders/create'
      },
      query: {},
      method: 'POST'
    }
  },
  {
    provider: 'slack',
    eventType: 'message',
    displayName: 'Slack - Message Event',
    payload: {
      body: {
        type: 'event_callback',
        event: {
          type: 'message',
          channel: 'C1234567890',
          user: 'U1234567890',
          text: 'Hello from Slack!',
          ts: '1234567890.123456'
        },
        team_id: 'T1234567890'
      },
      headers: {
        'content-type': 'application/json',
        'x-slack-signature': 'v0=abc123...',
        'x-slack-request-timestamp': '1234567890'
      },
      query: {},
      method: 'POST'
    }
  },
  {
    provider: 'generic',
    eventType: 'custom',
    displayName: 'Generic - Custom Webhook',
    payload: {
      body: {
        event: 'custom_event',
        data: {
          id: '123',
          name: 'Sample Data',
          value: 42,
          active: true,
          tags: ['tag1', 'tag2']
        },
        timestamp: new Date().toISOString()
      },
      headers: {
        'content-type': 'application/json'
      },
      query: {
        source: 'external',
        version: '1.0'
      },
      method: 'POST'
    }
  }
];

const getProviderIcon = (provider: string) => {
  switch (provider) {
    case 'webflow': return <Globe className="h-4 w-4" />;
    case 'stripe': return <CreditCard className="h-4 w-4" />;
    case 'github': return <Github className="h-4 w-4" />;
    case 'shopify': return <ShoppingCart className="h-4 w-4" />;
    case 'slack': return <MessageSquare className="h-4 w-4" />;
    case 'sendgrid': return <Mail className="h-4 w-4" />;
    default: return <Webhook className="h-4 w-4" />;
  }
};

interface SamplePayloadSelectorProps {
  onSelect: (payload: SamplePayload) => void;
  value?: string;
}

export function SamplePayloadSelector({ onSelect, value }: SamplePayloadSelectorProps) {
  const handleSelect = (key: string) => {
    const [provider, eventType] = key.split('::');
    const sample = SAMPLE_PAYLOADS.find(s => s.provider === provider && s.eventType === eventType);
    if (sample) {
      onSelect(sample);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Use Sample Payload</Label>
      <Select onValueChange={handleSelect} value={value}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="Select a sample payload..." />
        </SelectTrigger>
        <SelectContent>
          {SAMPLE_PAYLOADS.map((sample) => (
            <SelectItem 
              key={`${sample.provider}::${sample.eventType}`} 
              value={`${sample.provider}::${sample.eventType}`}
            >
              <div className="flex items-center gap-2">
                {getProviderIcon(sample.provider)}
                <span>{sample.displayName}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
