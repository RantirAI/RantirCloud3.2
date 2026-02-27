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
      fromEmail,
      toEmails,
      subject,
      bodyText,
      bodyHtml,
      ccEmails,
      bccEmails,
      recipients,
      identity
    } = await req.json();

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS Access Key ID and Secret Access Key are required');
    }

    let response: any = {};
    const sesEndpoint = `https://email.${region}.amazonaws.com/`;

    switch (action) {
      case 'send_email':
        if (!fromEmail || !toEmails || !subject) {
          throw new Error('From email, to emails, and subject are required for send email');
        }
        
        const emailParams = {
          'Action': 'SendEmail',
          'Source': fromEmail,
          'Message.Subject.Data': subject,
          'Message.Subject.Charset': 'UTF-8',
          'Version': '2010-12-01'
        };

        // Add destinations
        const toEmailList = toEmails.split(',').map((e: string) => e.trim());
        toEmailList.forEach((email: string, index: number) => {
          (emailParams as any)[`Destination.ToAddresses.member.${index + 1}`] = email;
        });

        if (ccEmails) {
          const ccEmailList = ccEmails.split(',').map((e: string) => e.trim());
          ccEmailList.forEach((email: string, index: number) => {
            (emailParams as any)[`Destination.CcAddresses.member.${index + 1}`] = email;
          });
        }

        if (bccEmails) {
          const bccEmailList = bccEmails.split(',').map((e: string) => e.trim());
          bccEmailList.forEach((email: string, index: number) => {
            (emailParams as any)[`Destination.BccAddresses.member.${index + 1}`] = email;
          });
        }

        // Add body content
        if (bodyText) {
          (emailParams as any)['Message.Body.Text.Data'] = bodyText;
          (emailParams as any)['Message.Body.Text.Charset'] = 'UTF-8';
        }
        if (bodyHtml) {
          (emailParams as any)['Message.Body.Html.Data'] = bodyHtml;
          (emailParams as any)['Message.Body.Html.Charset'] = 'UTF-8';
        }

        response = await makeSESRequest(sesEndpoint, emailParams, accessKeyId, secretAccessKey, region);
        break;

      case 'send_bulk_email':
        if (!fromEmail || !recipients || !subject) {
          throw new Error('From email, recipients, and subject are required for bulk email');
        }
        
        // Simplified bulk email - send individual emails
        const messageIds = [];
        for (const recipient of recipients) {
          const bulkParams = {
            'Action': 'SendEmail',
            'Source': fromEmail,
            'Destination.ToAddresses.member.1': recipient.email,
            'Message.Subject.Data': subject,
            'Message.Subject.Charset': 'UTF-8',
            'Version': '2010-12-01'
          };

          if (bodyText) {
            (bulkParams as any)['Message.Body.Text.Data'] = bodyText;
            (bulkParams as any)['Message.Body.Text.Charset'] = 'UTF-8';
          }
          if (bodyHtml) {
            (bulkParams as any)['Message.Body.Html.Data'] = bodyHtml;
            (bulkParams as any)['Message.Body.Html.Charset'] = 'UTF-8';
          }

          const bulkResponse = await makeSESRequest(sesEndpoint, bulkParams, accessKeyId, secretAccessKey, region);
          messageIds.push(bulkResponse.messageId);
        }
        response = { messageIds };
        break;

      case 'verify_identity':
        if (!identity) {
          throw new Error('Identity is required for verification');
        }
        
        const verifyParams = {
          'Action': 'VerifyEmailIdentity',
          'EmailAddress': identity,
          'Version': '2010-12-01'
        };
        
        response = await makeSESRequest(sesEndpoint, verifyParams, accessKeyId, secretAccessKey, region);
        break;

      case 'list_identities':
        const listParams = {
          'Action': 'ListIdentities',
          'IdentityType': 'EmailAddress',
          'Version': '2010-12-01'
        };
        
        response = await makeSESRequest(sesEndpoint, listParams, accessKeyId, secretAccessKey, region);
        break;

      case 'get_statistics':
        const statsParams = {
          'Action': 'GetSendStatistics',
          'Version': '2010-12-01'
        };
        
        response = await makeSESRequest(sesEndpoint, statsParams, accessKeyId, secretAccessKey, region);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Amazon SES Proxy: Successfully processed ${action}`);

    return new Response(JSON.stringify({
      success: true,
      data: response,
      ...response
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Amazon SES Proxy Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Simplified SES request function
async function makeSESRequest(
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
    'Content-Type': 'application/x-amz-json-1.0',
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
    throw new Error(`SES API Error: ${response.status} ${errorText}`);
  }

  // Parse XML response (simplified)
  const responseText = await response.text();
  
  // Extract message ID from XML response if present
  const messageIdMatch = responseText.match(/<MessageId>([^<]+)<\/MessageId>/);
  const messageId = messageIdMatch ? messageIdMatch[1] : null;
  
  return { messageId, rawResponse: responseText };
}