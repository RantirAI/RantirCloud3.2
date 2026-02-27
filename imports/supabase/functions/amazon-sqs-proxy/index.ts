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
      queueUrl,
      messageBody,
      messageAttributes,
      delaySeconds,
      maxMessages,
      waitTimeSeconds,
      visibilityTimeoutSeconds,
      receiptHandle,
      attributes
    } = await req.json();

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS Access Key ID and Secret Access Key are required');
    }

    if (!queueUrl) {
      throw new Error('Queue URL is required');
    }

    let response: any = {};

    switch (action) {
      case 'send_message':
        if (!messageBody) {
          throw new Error('Message body is required for send message');
        }
        
        const sendParams = {
          'Action': 'SendMessage',
          'MessageBody': messageBody,
          'Version': '2012-11-05'
        };

        if (delaySeconds) (sendParams as any)['DelaySeconds'] = delaySeconds.toString();
        
        // Add message attributes if provided
        if (messageAttributes) {
          let attrIndex = 1;
          for (const [name, attr] of Object.entries(messageAttributes)) {
            (sendParams as any)[`MessageAttribute.${attrIndex}.Name`] = name;
            (sendParams as any)[`MessageAttribute.${attrIndex}.Value.DataType`] = (attr as any).DataType;
            if ((attr as any).StringValue) {
              (sendParams as any)[`MessageAttribute.${attrIndex}.Value.StringValue`] = (attr as any).StringValue;
            }
            if ((attr as any).BinaryValue) {
              (sendParams as any)[`MessageAttribute.${attrIndex}.Value.BinaryValue`] = (attr as any).BinaryValue;
            }
            attrIndex++;
          }
        }

        response = await makeSQSRequest(queueUrl, sendParams, accessKeyId, secretAccessKey, region);
        break;

      case 'receive_messages':
        const receiveParams = {
          'Action': 'ReceiveMessage',
          'Version': '2012-11-05'
        };

        if (maxMessages) (receiveParams as any)['MaxNumberOfMessages'] = maxMessages.toString();
        if (waitTimeSeconds) (receiveParams as any)['WaitTimeSeconds'] = waitTimeSeconds.toString();
        if (visibilityTimeoutSeconds) (receiveParams as any)['VisibilityTimeout'] = visibilityTimeoutSeconds.toString();

        response = await makeSQSRequest(queueUrl, receiveParams, accessKeyId, secretAccessKey, region);
        break;

      case 'delete_message':
        if (!receiptHandle) {
          throw new Error('Receipt handle is required for delete message');
        }
        
        const deleteParams = {
          'Action': 'DeleteMessage',
          'ReceiptHandle': receiptHandle,
          'Version': '2012-11-05'
        };

        response = await makeSQSRequest(queueUrl, deleteParams, accessKeyId, secretAccessKey, region);
        break;

      case 'purge_queue':
        const purgeParams = {
          'Action': 'PurgeQueue',
          'Version': '2012-11-05'
        };

        response = await makeSQSRequest(queueUrl, purgeParams, accessKeyId, secretAccessKey, region);
        break;

      case 'get_attributes':
        const getAttrParams = {
          'Action': 'GetQueueAttributes',
          'AttributeName.1': 'All',
          'Version': '2012-11-05'
        };

        response = await makeSQSRequest(queueUrl, getAttrParams, accessKeyId, secretAccessKey, region);
        break;

      case 'set_attributes':
        if (!attributes) {
          throw new Error('Attributes are required for set attributes');
        }
        
        const setAttrParams = {
          'Action': 'SetQueueAttributes',
          'Version': '2012-11-05'
        };

        let attrIndex = 1;
        for (const [name, value] of Object.entries(attributes)) {
          (setAttrParams as any)[`Attribute.${attrIndex}.Name`] = name;
          (setAttrParams as any)[`Attribute.${attrIndex}.Value`] = value;
          attrIndex++;
        }

        response = await makeSQSRequest(queueUrl, setAttrParams, accessKeyId, secretAccessKey, region);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Amazon SQS Proxy: Successfully processed ${action}`);

    return new Response(JSON.stringify({
      success: true,
      data: response,
      ...response
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Amazon SQS Proxy Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Simplified SQS request function
async function makeSQSRequest(
  queueUrl: string,
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

  const response = await fetch(queueUrl, {
    method: 'POST',
    headers,
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SQS API Error: ${response.status} ${errorText}`);
  }

  // Parse XML response (simplified)
  const responseText = await response.text();
  
  // Extract various data from XML response
  const messageIdMatch = responseText.match(/<MessageId>([^<]+)<\/MessageId>/);
  const messageId = messageIdMatch ? messageIdMatch[1] : null;
  
  // For receive messages, extract message array
  let messages = null;
  if (params.Action === 'ReceiveMessage') {
    // This is a simplified parser - in production, use proper XML parser
    const messageMatches = responseText.match(/<Message>(.*?)<\/Message>/g);
    if (messageMatches) {
      messages = messageMatches.map(match => {
        const bodyMatch = match.match(/<Body>([^<]+)<\/Body>/);
        const receiptHandleMatch = match.match(/<ReceiptHandle>([^<]+)<\/ReceiptHandle>/);
        const messageIdMatch = match.match(/<MessageId>([^<]+)<\/MessageId>/);
        
        return {
          MessageId: messageIdMatch ? messageIdMatch[1] : null,
          Body: bodyMatch ? bodyMatch[1] : null,
          ReceiptHandle: receiptHandleMatch ? receiptHandleMatch[1] : null
        };
      });
    }
  }
  
  // For get attributes, extract attributes
  let attributes = null;
  if (params.Action === 'GetQueueAttributes') {
    // Simplified attribute parsing
    attributes = { rawResponse: responseText };
  }
  
  return { 
    messageId, 
    messages, 
    attributes,
    rawResponse: responseText 
  };
}