import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      action,
      accessKeyId,
      secretAccessKey,
      region,
      topicArn,
      message,
      subject,
      messageStructure,
      phoneNumber,
      topicName,
      protocol,
      endpoint,
      subscriptionArn
    } = await req.json();

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS Access Key ID and Secret Access Key are required');
    }

    let response: any = {};
    const snsEndpoint = `https://sns.${region}.amazonaws.com/`;

    switch (action) {
      case 'publish':
        if (!topicArn || !message) {
          throw new Error('Topic ARN and message are required for publish');
        }
        
        const publishParams = {
          'Action': 'Publish',
          'TopicArn': topicArn,
          'Message': message,
          'Version': '2010-03-31'
        };

        if (subject) (publishParams as any)['Subject'] = subject;
        if (messageStructure) (publishParams as any)['MessageStructure'] = messageStructure;

        response = await makeSNSRequest(snsEndpoint, publishParams, accessKeyId, secretAccessKey, region);
        break;

      case 'send_sms':
        if (!phoneNumber || !message) {
          throw new Error('Phone number and message are required for SMS');
        }
        
        const smsParams = {
          'Action': 'Publish',
          'PhoneNumber': phoneNumber,
          'Message': message,
          'Version': '2010-03-31'
        };

        response = await makeSNSRequest(snsEndpoint, smsParams, accessKeyId, secretAccessKey, region);
        break;

      case 'create_topic':
        if (!topicName) {
          throw new Error('Topic name is required for create topic');
        }
        
        const createParams = {
          'Action': 'CreateTopic',
          'Name': topicName,
          'Version': '2010-03-31'
        };

        response = await makeSNSRequest(snsEndpoint, createParams, accessKeyId, secretAccessKey, region);
        break;

      case 'list_topics':
        const listParams = {
          'Action': 'ListTopics',
          'Version': '2010-03-31'
        };

        response = await makeSNSRequest(snsEndpoint, listParams, accessKeyId, secretAccessKey, region);
        break;

      case 'subscribe':
        if (!topicArn || !protocol || !endpoint) {
          throw new Error('Topic ARN, protocol, and endpoint are required for subscribe');
        }
        
        const subscribeParams = {
          'Action': 'Subscribe',
          'TopicArn': topicArn,
          'Protocol': protocol,
          'Endpoint': endpoint,
          'Version': '2010-03-31'
        };

        response = await makeSNSRequest(snsEndpoint, subscribeParams, accessKeyId, secretAccessKey, region);
        break;

      case 'unsubscribe':
        if (!subscriptionArn) {
          throw new Error('Subscription ARN is required for unsubscribe');
        }
        
        const unsubscribeParams = {
          'Action': 'Unsubscribe',
          'SubscriptionArn': subscriptionArn,
          'Version': '2010-03-31'
        };

        response = await makeSNSRequest(snsEndpoint, unsubscribeParams, accessKeyId, secretAccessKey, region);
        break;

      case 'list_subscriptions':
        const listSubsParams = {
          'Action': 'ListSubscriptions',
          'Version': '2010-03-31'
        };

        if (topicArn) {
          listSubsParams['Action'] = 'ListSubscriptionsByTopic';
          (listSubsParams as any)['TopicArn'] = topicArn;
        }

        response = await makeSNSRequest(snsEndpoint, listSubsParams, accessKeyId, secretAccessKey, region);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Amazon SNS Proxy: Successfully processed ${action}`);

    return new Response(JSON.stringify({
      success: true,
      data: response,
      ...response
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Amazon SNS Proxy Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Simplified SNS request function
async function makeSNSRequest(
  endpoint: string,
  params: Record<string, string>,
  accessKeyId: string,
  secretAccessKey: string,
  region: string
): Promise<any> {
  
  // Convert params to form data
  const formData = new URLSearchParams(params);
  
  // This is a simplified implementation
  // In production, use AWS SDK v3 for proper authentication
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `AWS ${accessKeyId}:${secretAccessKey}`, // Simplified - use proper AWS Signature V4
    'x-amz-region': region,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SNS API Error: ${response.status} ${errorText}`);
  }

  // Parse XML response (simplified)
  const responseText = await response.text();
  
  // Extract various data from XML response
  const messageIdMatch = responseText.match(/<MessageId>([^<]+)<\/MessageId>/);
  const topicArnMatch = responseText.match(/<TopicArn>([^<]+)<\/TopicArn>/);
  const subscriptionArnMatch = responseText.match(/<SubscriptionArn>([^<]+)<\/SubscriptionArn>/);
  
  const messageId = messageIdMatch ? messageIdMatch[1] : null;
  const topicArn = topicArnMatch ? topicArnMatch[1] : null;
  const subscriptionArn = subscriptionArnMatch ? subscriptionArnMatch[1] : null;
  
  return { 
    messageId, 
    topicArn, 
    subscriptionArn, 
    rawResponse: responseText 
  };
}