
export interface BotpressIntegration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  isInstalled: boolean;
  provider: string; // e.g., 'botpress', 'plus', 'simplegreatbots'
  version?: string;
  isCompleted?: boolean;
}

export type IntegrationCategory = 
  | 'All'
  | 'Productivity'
  | 'Channels'
  | 'Automation'
  | 'Development'
  | 'Support'
  | 'Analytics' 
  | 'Business Operations'
  | 'LLMs / Gen AI';
