import { nodeRegistry } from './node-registry';
import { aiAgentNode } from '@/nodes/ai-agent';
import { httpRequestNode } from '@/nodes/http-request';
import { calculatorNode } from '@/nodes/calculator';
import { dataFilterNode } from '@/nodes/data-filter';
import { conditionNode } from '@/nodes/condition'; // Re-added condition node
import { forEachLoopNode } from '@/nodes/for-each-loop'; // New branching loop node
import { webhookTriggerNode } from '@/nodes/webhook-trigger';
import { responseNode } from '@/nodes/response';
import { webflowNode } from '@/nodes/webflow';
import { dataTableNode } from '@/nodes/data-table';
import { aiMapperNode } from '@/nodes/ai-mapper';
import { airtableNode } from '@/nodes/airtable';
import { loggerNode } from '@/nodes/logger';
import { firecrawlNode } from '@/nodes/firecrawl';
import { snowflakeNode } from '@/nodes/snowflake';
import { shopifyNode } from '@/nodes/shopify';
import { salesforceNode } from '@/nodes/salesforce';
import { googleDocsNode } from '@/nodes/google-docs';
import { googleSheetsNode } from '@/nodes/google-sheets';
import { hubspotNode } from '@/nodes/hubspot';
import { apolloNode } from '@/nodes/apollo';
import { activecampaignNode } from '@/nodes/activecampaign';
import { activepiecesNode } from '@/nodes/activepieces';
import { actualbudgetNode } from '@/nodes/actualbudget';
import { twitterNode } from '@/nodes/twitter';
import { slackNode } from '@/nodes/slack';
import { notionNode } from '@/nodes/notion';
import { googleCalendarNode } from '@/nodes/google-calendar';
import { woocommerceNode } from '@/nodes/woocommerce';
import { assembledNode } from '@/nodes/assembled';
import { assemblyaiNode } from '@/nodes/assemblyai';
import { acuitySchedulingNode } from '@/nodes/acuity-scheduling';
import { acumbamailNode } from '@/nodes/acumbamail';
import { afforaiNode } from '@/nodes/afforai';
// New nodes
import { agentxNode } from '@/nodes/agentx';
import { aianswerNode } from '@/nodes/aianswer';
import { aircallNode } from '@/nodes/aircall';
import { airparserNode } from '@/nodes/airparser';
import { trelloNode } from '@/nodes/trello';
import { asanaNode } from '@/nodes/asana';
// AWS and Airtop nodes
import { airtopNode } from '@/nodes/airtop';
import { amazonS3Node } from '@/nodes/amazon-s3';
import { amazonSESNode } from '@/nodes/amazon-ses';
import { amazonSNSNode } from '@/nodes/amazon-sns';
import { amazonSQSNode } from '@/nodes/amazon-sqs';
import { brevoNode } from '@/nodes/brevo';
// New nodes from user request
import { aminosNode } from '@/nodes/aminos';
import { anyhookGraphqlNode } from '@/nodes/anyhook-graphql';
import { apifyNode } from '@/nodes/apify';
import { apitableNode } from '@/nodes/apitable';
import { apitemplateIoNode } from '@/nodes/apitemplate-io';
import { approvalNode } from '@/nodes/approval';
import { ashbyNode } from '@/nodes/ashby';
// Service integration nodes
import { mailchimpNode } from '@/nodes/mailchimp';
import { typeformNode } from '@/nodes/typeform';
import { zendeskNode } from '@/nodes/zendesk';
import { zoomNode } from '@/nodes/zoom';
import { wordpressNode } from '@/nodes/wordpress';
import { gmailNode } from '@/nodes/gmail';
import { stripeNode } from '@/nodes/stripe';
import { resendNode } from '@/nodes/resend';
// Latest server-side nodes
import { memberstackNode } from '@/nodes/memberstack';
import { attioNode } from '@/nodes/attio';
import { autocallsNode } from '@/nodes/autocalls';
import { avomaNode } from '@/nodes/avoma';
import { azureCommunicationServicesNode } from '@/nodes/azure-communication-services';
import { azureOpenAINode } from '@/nodes/azure-openai';
import { backblazeNode } from '@/nodes/backblaze';
// New B-nodes
import { bamboohrNode } from '@/nodes/bamboohr';
import { bannerbearNode } from '@/nodes/bannerbear';
import { amplitudeNode } from '@/nodes/amplitude';
import { baserowNode } from '@/nodes/baserow';
import { beamerNode } from '@/nodes/beamer';
import { beehiivNode } from '@/nodes/beehiiv';
import { biginByZohoNode } from '@/nodes/bigin-by-zoho';
// New B-nodes part 2
import { bettermodeNode } from '@/nodes/bettermode';
import { bikaNode } from '@/nodes/bika';
import { binanceNode } from '@/nodes/binance';
import { bitlyNode } from '@/nodes/bitly';
import { blockscoutNode } from '@/nodes/blockscout';
import { blueskyNode } from '@/nodes/bluesky';
import { bonjoroNode } from '@/nodes/bonjoro';
// New B-nodes batch 3
import { boxNode } from '@/nodes/box';
import { brilliantDirectoriesNode } from '@/nodes/brilliant-directories';
import { browseAiNode } from '@/nodes/browse-ai';
import { browserlessNode } from '@/nodes/browserless';
import { bubbleNode } from '@/nodes/bubble';
import { bumpupsNode } from '@/nodes/bumpups';
import { calComNode } from '@/nodes/cal-com';
import { calendlyNode } from '@/nodes/calendly';
import { callRoundedNode } from '@/nodes/call-rounded';
import { cambAiNode } from '@/nodes/camb-ai';
import { campaignMonitorNode } from '@/nodes/campaign-monitor';
import { capsuleCrmNode } from '@/nodes/capsule-crm';
// New C-nodes batch 2
import { captainDataNode } from '@/nodes/captain-data';
import { cartloomNode } from '@/nodes/cartloom';
import { cashfreePaymentsNode } from '@/nodes/cashfree-payments';
import { certopusNode } from '@/nodes/certopus';
// New C-nodes batch 3 - Chat integrations
import { chargekeepNode } from '@/nodes/chargekeep';
import { chatAidNode } from '@/nodes/chat-aid';
import { chatDataNode } from '@/nodes/chat-data';
import { chatbaseNode } from '@/nodes/chatbase';
import { chatnodeNode } from '@/nodes/chatnode';
import { chatsistantNode } from '@/nodes/chatsistant';
import { chainalysisApiNode } from '@/nodes/chainalysis-api';
import { chaindeskNode } from '@/nodes/chaindesk';
// New C-nodes batch 4
import { checkoutNode } from '@/nodes/checkout';
import { circleNode } from '@/nodes/circle';
import { clarifaiNode } from '@/nodes/clarifai';
import { claudeNode } from '@/nodes/claude';
import { clearoutNode } from '@/nodes/clearout';
import { clickfunnelsNode } from '@/nodes/clickfunnels';

// New C-nodes batch 5
import { clicksendNode } from '@/nodes/clicksend';
import { clickupNode } from '@/nodes/clickup';
import { clockifyNode } from '@/nodes/clockify';
import { clockodoNode } from '@/nodes/clockodo';
import { closeNode } from '@/nodes/close';
import { cloudconvertNode } from '@/nodes/cloudconvert';

// New C-nodes batch 6 - Server-side integrations
import { clearoutPhoneNode } from '@/nodes/clearoutphone';
import { cloudinaryNode } from '@/nodes/cloudinary';
import { cloutlyNode } from '@/nodes/cloutly';
import { codaNode } from '@/nodes/coda';
import { codyNode } from '@/nodes/cody';
import { clicdataNode } from '@/nodes/clicdata';

// New C-nodes batch 7 - Cognito Forms, CometAPI, Comfy ICU, Confluence, Connections
import { cognitoFormsNode } from '@/nodes/cognito-forms';
import { cometapiNode } from '@/nodes/cometapi';
import { comfyicuNode } from '@/nodes/comfyicu';
import { confluenceNode } from '@/nodes/confluence';
import { connectionsNode } from '@/nodes/connections';
import { constantContactNode } from '@/nodes/constant-contact';

// New C-nodes batch 8 - Contentful, Contextual AI, Contiguity, ConvertKit, Copper, Copy.ai
import { contentfulNode } from '@/nodes/contentful';
import { contextualAiNode } from '@/nodes/contextual-ai';
import { contiguityNode } from '@/nodes/contiguity';
import { convertkitNode } from '@/nodes/convertkit';
import { copperNode } from '@/nodes/copper';
import { copyAiNode } from '@/nodes/copy-ai';

// New C-nodes batch 9 - Couchbase, Crisp, Crypto, Cryptolens, CSV, Cursor
import { couchbaseNode } from '@/nodes/couchbase';
import { crispNode } from '@/nodes/crisp';
import { cryptoNode } from '@/nodes/crypto';
import { cryptolensNode } from '@/nodes/cryptolens';
import { csvNode } from '@/nodes/csv';
import { cursorNode } from '@/nodes/cursor';

// New C/D-nodes - Customer.io, CustomGPT, CyberArk, Dappier, Dashworks, Data Mapper
import { customerIoNode } from '@/nodes/customer-io';
import { customgptNode } from '@/nodes/customgpt';
import { cyberarkNode } from '@/nodes/cyberark';
import { dappierNode } from '@/nodes/dappier';
import { dashworksNode } from '@/nodes/dashworks';
import { dataMapperNode } from '@/nodes/data-mapper';

// Data Summarizer, Datadog, ElevenLabs nodes
import { dataSummarizerNode } from '@/nodes/data-summarizer';
import { datadogNode } from '@/nodes/datadog';
import { elevenlabsNode } from '@/nodes/elevenlabs';

// DataFuel, Date Helper, DatoCMS, Deepgram nodes
import { datafuelNode } from '@/nodes/datafuel';
import { dateHelperNode } from '@/nodes/date-helper';
import { datocmsNode } from '@/nodes/datocms';
import { deepgramNode } from '@/nodes/deepgram';

// HelpScout, DeepL, DeepSeek nodes
import { helpscoutNode } from '@/nodes/helpscout';
import { deeplNode } from '@/nodes/deepl';
import { deepseekNode } from '@/nodes/deepseek';

// Declare global flow object with nodeRegistry for dynamic options
declare global {
  interface Window {
    flow?: {
      nodeRegistry?: any; // This will hold the nodeRegistry for access in dynamic option functions
    };
  }
}

export function registerAllNodes() {
  console.log("Registering all nodes...");
  
  // Core trigger and response nodes
  nodeRegistry.register(webhookTriggerNode);
  nodeRegistry.register(responseNode);
  
  // Core utility nodes
  nodeRegistry.register(loggerNode);
  
  // Core email node
  nodeRegistry.register(resendNode);
  
  // Core nodes
  nodeRegistry.register(aiAgentNode);
  nodeRegistry.register(httpRequestNode);
  nodeRegistry.register(calculatorNode);
  nodeRegistry.register(dataFilterNode);
  nodeRegistry.register(conditionNode); // Re-added condition node
  nodeRegistry.register(forEachLoopNode); // New branching loop node
  nodeRegistry.register(webflowNode);
  nodeRegistry.register(dataTableNode);
  nodeRegistry.register(aiMapperNode);
  nodeRegistry.register(airtableNode);
  nodeRegistry.register(firecrawlNode);
  nodeRegistry.register(snowflakeNode);
  nodeRegistry.register(shopifyNode);
  nodeRegistry.register(salesforceNode);
  nodeRegistry.register(googleDocsNode);
  nodeRegistry.register(googleSheetsNode);
  nodeRegistry.register(hubspotNode);
  nodeRegistry.register(apolloNode);
  nodeRegistry.register(activecampaignNode);
  nodeRegistry.register(activepiecesNode);
  nodeRegistry.register(actualbudgetNode);
  nodeRegistry.register(acuitySchedulingNode);
  nodeRegistry.register(acumbamailNode);
  nodeRegistry.register(afforaiNode);
  
  // New nodes
  nodeRegistry.register(agentxNode);
  nodeRegistry.register(aianswerNode);
  nodeRegistry.register(aircallNode);
  nodeRegistry.register(airparserNode);
  nodeRegistry.register(trelloNode);
  nodeRegistry.register(asanaNode);
  
  // AWS and Airtop nodes
  nodeRegistry.register(airtopNode);
  nodeRegistry.register(amazonS3Node);
  nodeRegistry.register(amazonSESNode);
  nodeRegistry.register(amazonSNSNode);
  nodeRegistry.register(amazonSQSNode);
  nodeRegistry.register(brevoNode);
  
  // New nodes from user request
  nodeRegistry.register(aminosNode);
  nodeRegistry.register(anyhookGraphqlNode);
  nodeRegistry.register(apifyNode);
  nodeRegistry.register(apitableNode);
  nodeRegistry.register(apitemplateIoNode);
  nodeRegistry.register(approvalNode);
  nodeRegistry.register(ashbyNode);
  
  // Service integration nodes
  nodeRegistry.register(mailchimpNode);
  nodeRegistry.register(typeformNode);
  nodeRegistry.register(zendeskNode);
  nodeRegistry.register(zoomNode);
  nodeRegistry.register(wordpressNode);
  nodeRegistry.register(gmailNode);
  nodeRegistry.register(stripeNode);
  nodeRegistry.register(twitterNode);
  nodeRegistry.register(slackNode);
  nodeRegistry.register(notionNode);
  nodeRegistry.register(googleCalendarNode);
  nodeRegistry.register(woocommerceNode);
  nodeRegistry.register(assembledNode);
  nodeRegistry.register(assemblyaiNode);
  
  // Latest server-side nodes
  nodeRegistry.register(memberstackNode);
  nodeRegistry.register(attioNode);
  nodeRegistry.register(autocallsNode);
  nodeRegistry.register(avomaNode);
  nodeRegistry.register(azureCommunicationServicesNode);
  nodeRegistry.register(azureOpenAINode);
  nodeRegistry.register(backblazeNode);
  
  // New B-nodes
  nodeRegistry.register(bamboohrNode);
  nodeRegistry.register(bannerbearNode);
  nodeRegistry.register(amplitudeNode);
  nodeRegistry.register(baserowNode);
  nodeRegistry.register(beamerNode);
  nodeRegistry.register(beehiivNode);
  nodeRegistry.register(biginByZohoNode);
  
  // New B-nodes part 2
  nodeRegistry.register(bettermodeNode);
  nodeRegistry.register(bikaNode);
  nodeRegistry.register(binanceNode);
  nodeRegistry.register(bitlyNode);
  nodeRegistry.register(blockscoutNode);
  nodeRegistry.register(blueskyNode);
  nodeRegistry.register(bonjoroNode);
  
  // New B-nodes batch 3
  nodeRegistry.register(boxNode);
  nodeRegistry.register(brilliantDirectoriesNode);
  nodeRegistry.register(browseAiNode);
  nodeRegistry.register(browserlessNode);
  nodeRegistry.register(bubbleNode);
  nodeRegistry.register(bumpupsNode);
  
  // New C-nodes
  nodeRegistry.register(calComNode);
  nodeRegistry.register(calendlyNode);
  nodeRegistry.register(callRoundedNode);
  nodeRegistry.register(cambAiNode);
  nodeRegistry.register(campaignMonitorNode);
  nodeRegistry.register(capsuleCrmNode);
  
  // New C-nodes batch 2
  nodeRegistry.register(captainDataNode);
  nodeRegistry.register(cartloomNode);
  nodeRegistry.register(cashfreePaymentsNode);
  nodeRegistry.register(certopusNode);
  nodeRegistry.register(chainalysisApiNode);
  nodeRegistry.register(chaindeskNode);
  
  // New C-nodes batch 3 - Chat integrations
  nodeRegistry.register(chargekeepNode);
  nodeRegistry.register(chatAidNode);
  nodeRegistry.register(chatDataNode);
  nodeRegistry.register(chatbaseNode);
  nodeRegistry.register(chatnodeNode);
  nodeRegistry.register(chatsistantNode);
  
  // New C-nodes batch 4
  nodeRegistry.register(checkoutNode);
  nodeRegistry.register(circleNode);
  nodeRegistry.register(clarifaiNode);
  nodeRegistry.register(claudeNode);
  nodeRegistry.register(clearoutNode);
  nodeRegistry.register(clickfunnelsNode);
  
  // New C-nodes batch 5
  nodeRegistry.register(clicksendNode);
  nodeRegistry.register(clickupNode);
  nodeRegistry.register(clockifyNode);
  nodeRegistry.register(clockodoNode);
  nodeRegistry.register(closeNode);
  nodeRegistry.register(cloudconvertNode);
  
  // New C-nodes batch 6 - Server-side integrations
  nodeRegistry.register(clearoutPhoneNode);
  nodeRegistry.register(cloudinaryNode);
  nodeRegistry.register(cloutlyNode);
  nodeRegistry.register(codaNode);
  nodeRegistry.register(codyNode);
  nodeRegistry.register(clicdataNode);
  
  // New C-nodes batch 7 - Cognito Forms, CometAPI, Comfy ICU, Confluence, Connections, Constant Contact
  nodeRegistry.register(cognitoFormsNode);
  nodeRegistry.register(cometapiNode);
  nodeRegistry.register(comfyicuNode);
  nodeRegistry.register(confluenceNode);
  nodeRegistry.register(connectionsNode);
  nodeRegistry.register(constantContactNode);
  
  // New C-nodes batch 8 - Contentful, Contextual AI, Contiguity, ConvertKit, Copper, Copy.ai
  nodeRegistry.register(contentfulNode);
  nodeRegistry.register(contextualAiNode);
  nodeRegistry.register(contiguityNode);
  nodeRegistry.register(convertkitNode);
  nodeRegistry.register(copperNode);
  nodeRegistry.register(copyAiNode);
  
  // New C-nodes batch 9 - Couchbase, Crisp, Crypto, Cryptolens, CSV, Cursor
  nodeRegistry.register(couchbaseNode);
  nodeRegistry.register(crispNode);
  nodeRegistry.register(cryptoNode);
  nodeRegistry.register(cryptolensNode);
  nodeRegistry.register(csvNode);
  nodeRegistry.register(cursorNode);
  
  // New C/D-nodes - Customer.io, CustomGPT, CyberArk, Dappier, Dashworks, Data Mapper
  nodeRegistry.register(customerIoNode);
  nodeRegistry.register(customgptNode);
  nodeRegistry.register(cyberarkNode);
  nodeRegistry.register(dappierNode);
  nodeRegistry.register(dashworksNode);
  nodeRegistry.register(dataMapperNode);
  
  // Data Summarizer, Datadog, ElevenLabs
  nodeRegistry.register(dataSummarizerNode);
  nodeRegistry.register(datadogNode);
  nodeRegistry.register(elevenlabsNode);
  
  // DataFuel, Date Helper, DatoCMS, Deepgram
  nodeRegistry.register(datafuelNode);
  nodeRegistry.register(dateHelperNode);
  nodeRegistry.register(datocmsNode);
  nodeRegistry.register(deepgramNode);
  
  // HelpScout, DeepL, DeepSeek
  nodeRegistry.register(helpscoutNode);
  nodeRegistry.register(deeplNode);
  nodeRegistry.register(deepseekNode);
  
  // Register nodes conditionally based on user installations (supports legacy array and new object shape)
  let installedNodeTypes: string[] = [];
  if (typeof window !== 'undefined') {
    const cache: any = (window as any).flowUserNodeInstallations;
    if (Array.isArray(cache)) {
      installedNodeTypes = cache;
    } else if (cache && Array.isArray(cache.installedNodeTypes)) {
      installedNodeTypes = cache.installedNodeTypes;
    }
  }
  nodeRegistry.registerConditionally(installedNodeTypes);
  
  // Make nodeRegistry globally available for dynamic option functions
  if (typeof window !== 'undefined') {
    window.flow = window.flow || {};
    window.flow.nodeRegistry = nodeRegistry;
  }

  console.log("Registered nodes:", nodeRegistry.getAllPlugins().map(p => p.type));
}

registerAllNodes();

export { nodeRegistry };