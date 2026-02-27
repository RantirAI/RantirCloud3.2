import { nodeRegistry } from '@/lib/node-registry';
import { CORE_NODE_TYPES, isCoreNode } from '@/lib/coreNodeTypes';

export interface DetectedIntegration {
  nodeType: string;
  name: string;
  isInstalled: boolean;
  requiresInstallation: boolean;
}

/**
 * Detect integrations needed from AI-generated nodes.
 * This function identifies nodes that are:
 * 1. Not already installed by the user
 * 2. Not a core/built-in node type
 * 3. Potentially installable from the integrations database
 */
export function detectMissingIntegrations(
  nodeTypes: string[],
  installedNodeTypes: string[]
): string[] {
  const missing: string[] = [];
  
  for (const nodeType of nodeTypes) {
    // Skip if it's a core node type (doesn't require installation)
    if (isCoreNode(nodeType)) {
      continue;
    }
    
    // Skip if already installed
    if (installedNodeTypes.includes(nodeType)) {
      continue;
    }
    
    // Check registry's hardcoded list OR assume it needs installation if not a core node
    // This ensures we attempt to install any non-core node the AI suggests
    if (nodeRegistry.requiresInstallation(nodeType) || !isCoreNode(nodeType)) {
      missing.push(nodeType);
    }
  }
  
  return [...new Set(missing)]; // Remove duplicates
}

/**
 * Parse a prompt to detect potential integration keywords
 */
export function detectIntegrationKeywords(prompt: string): string[] {
  const promptLower = prompt.toLowerCase();
  
  // Map of keywords to node types
  const keywordMap: Record<string, string[]> = {
    // Email services
    'gmail': ['gmail'],
    'email': ['gmail', 'brevo', 'amazon-ses'],
    'mailchimp': ['mailchimp'],
    'brevo': ['brevo'],
    'sendgrid': ['amazon-ses'],
    
    // CRM & Sales
    'salesforce': ['salesforce'],
    'hubspot': ['hubspot'],
    'pipedrive': ['close'],
    'crm': ['hubspot', 'salesforce'],
    
    // Project Management
    'trello': ['trello'],
    'asana': ['asana'],
    'clickup': ['clickup'],
    'notion': ['notion'],
    
    // Communication
    'slack': ['slack'],
    'discord': ['slack'],
    'teams': ['slack'],
    'twitter': ['twitter'],
    'bluesky': ['bluesky'],
    
    // Databases & Spreadsheets
    'airtable': ['airtable'],
    'google sheets': ['google-sheets'],
    'google-sheets': ['google-sheets'],
    'googlesheets': ['google-sheets'],
    'spreadsheet': ['google-sheets', 'airtable'],
    'baserow': ['baserow'],
    
    // Cloud Storage
    's3': ['amazon-s3'],
    'aws': ['amazon-s3', 'amazon-ses', 'amazon-sns', 'amazon-sqs'],
    'backblaze': ['backblaze'],
    'box': ['box'],
    
    // E-commerce
    'shopify': ['shopify'],
    'woocommerce': ['woocommerce'],
    'stripe': ['stripe'],
    
    // Calendar & Scheduling
    'calendar': ['google-calendar', 'cal-com', 'calendly'],
    'google calendar': ['google-calendar'],
    'calendly': ['calendly'],
    'cal.com': ['cal-com'],
    'acuity': ['acuity-scheduling'],
    
    // Web scraping
    'scrape': ['firecrawl', 'browse-ai', 'apify'],
    'firecrawl': ['firecrawl'],
    'browse': ['browse-ai'],
    'apify': ['apify'],
    
    // CMS
    'webflow': ['webflow'],
    'wordpress': ['wordpress'],
    
    // Documents
    'google docs': ['google-docs'],
    'google-docs': ['google-docs'],
    'googledocs': ['google-docs'],
    
    // Analytics & Data
    'snowflake': ['snowflake'],
    'amplitude': ['amplitude'],
    
    // AI Services
    'claude': ['claude'],
    'openai': ['azure-openai'],
    
    // Video & Meetings
    'zoom': ['zoom'],
    
    // Support
    'zendesk': ['zendesk'],
    
    // SMS
    'sms': ['clicksend'],
    'clicksend': ['clicksend'],
  };
  
  const detectedTypes: string[] = [];
  
  for (const [keyword, nodeTypes] of Object.entries(keywordMap)) {
    if (promptLower.includes(keyword)) {
      detectedTypes.push(...nodeTypes);
    }
  }
  
  return [...new Set(detectedTypes)]; // Remove duplicates
}

/**
 * Get display name for a node type
 */
export function getNodeDisplayName(nodeType: string): string {
  const displayNames: Record<string, string> = {
    'gmail': 'Gmail',
    'slack': 'Slack',
    'airtable': 'Airtable',
    'google-sheets': 'Google Sheets',
    'google-docs': 'Google Docs',
    'google-calendar': 'Google Calendar',
    'hubspot': 'HubSpot',
    'salesforce': 'Salesforce',
    'trello': 'Trello',
    'asana': 'Asana',
    'notion': 'Notion',
    'shopify': 'Shopify',
    'stripe': 'Stripe',
    'webflow': 'Webflow',
    'wordpress': 'WordPress',
    'mailchimp': 'Mailchimp',
    'brevo': 'Brevo',
    'amazon-s3': 'Amazon S3',
    'amazon-ses': 'Amazon SES',
    'firecrawl': 'Firecrawl',
    'twitter': 'Twitter/X',
    'clickup': 'ClickUp',
    'calendly': 'Calendly',
    'zendesk': 'Zendesk',
    'zoom': 'Zoom',
    'woocommerce': 'WooCommerce',
    'snowflake': 'Snowflake',
  };
  
  return displayNames[nodeType] || nodeType.split('-').map(w => 
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
}
