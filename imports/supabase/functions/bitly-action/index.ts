import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken, action, longUrl, customSlug, groupId, bitlinkId, title, endpoint, method, customData, domain, qrFormat } = await req.json();
    
    if (!accessToken) {
      throw new Error("Bitly access token is required");
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    let result;
    let response;

    switch (action) {
      case 'createBitlink': {
        const body: any = { long_url: longUrl };
        if (customSlug) body.custom_bitlinks = [customSlug];
        if (groupId) body.group_guid = groupId;
        if (title) body.title = title;
        if (domain) body.domain = domain;

        response = await fetch('https://api-ssl.bitly.com/v4/bitlinks', {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create bitlink');
        }
        result = await response.json();
        break;
      }

      case 'createQrCode': {
        // First create or get the bitlink
        const bitlinkBody: any = { long_url: longUrl };
        const bitlinkResponse = await fetch('https://api-ssl.bitly.com/v4/bitlinks', {
          method: 'POST',
          headers,
          body: JSON.stringify(bitlinkBody),
        });
        
        if (!bitlinkResponse.ok) {
          const error = await bitlinkResponse.json();
          throw new Error(error.message || 'Failed to create bitlink for QR code');
        }
        
        const bitlink = await bitlinkResponse.json();
        
        // Then get the QR code
        const formatParam = qrFormat ? `?image_format=${encodeURIComponent(qrFormat)}` : '';
        response = await fetch(`https://api-ssl.bitly.com/v4/bitlinks/${bitlink.id}/qr${formatParam}`, {
          headers,
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create QR code');
        }
        result = await response.json();
        break;
      }

      case 'getBitlinkDetails': {
        response = await fetch(`https://api-ssl.bitly.com/v4/bitlinks/${bitlinkId}`, {
          headers,
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to get bitlink details');
        }
        result = await response.json();
        break;
      }

      case 'archiveBitlink': {
        response = await fetch(`https://api-ssl.bitly.com/v4/bitlinks/${bitlinkId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ archived: true }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to archive bitlink');
        }
        result = await response.json();
        break;
      }

      case 'updateBitlink': {
        const body: any = {};
        if (title) body.title = title;
        
        response = await fetch(`https://api-ssl.bitly.com/v4/bitlinks/${bitlinkId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(body),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to update bitlink');
        }
        result = await response.json();
        break;
      }

      case 'createCustomApiCall': {
        const url = endpoint.startsWith('http') 
          ? endpoint 
          : `https://api-ssl.bitly.com/v4${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        
        const options: any = {
          method,
          headers,
        };
        
        if (customData && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          try {
            options.body = typeof customData === 'string' ? customData : JSON.stringify(customData);
          } catch (e) {
            throw new Error('Invalid JSON in request data');
          }
        }
        
        response = await fetch(url, options);
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Custom API call failed');
        }
        result = await response.json();
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Bitly error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
