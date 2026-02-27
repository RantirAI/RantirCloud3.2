import { corsHeaders } from "../_shared/cors.ts";

const BACKBLAZE_API_BASE = "https://api.backblazeb2.com";

interface BackblazeAuthResponse {
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
}

async function authorizeAccount(keyId: string, applicationKey: string): Promise<BackblazeAuthResponse> {
  const credentials = btoa(`${keyId}:${applicationKey}`);
  
  const response = await fetch(`${BACKBLAZE_API_BASE}/b2api/v2/b2_authorize_account`, {
    headers: {
      'Authorization': `Basic ${credentials}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Backblaze authorization failed: ${error}`);
  }

  return await response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      keyId, 
      applicationKey, 
      action, 
      bucketName, 
      fileName, 
      fileUrl, 
      contentType = 'application/octet-stream' 
    } = await req.json();

    if (!keyId || !applicationKey) {
      throw new Error('Key ID and application key are required');
    }

    if (!bucketName || !fileName) {
      throw new Error('Bucket name and file name are required');
    }

    console.log(`[Backblaze] Action: ${action}`);

    // Authorize with Backblaze
    const auth = await authorizeAccount(keyId, applicationKey);

    let responseData: any;

    switch (action) {
      case 'backBlazes3UploadFile': {
        if (!fileUrl) throw new Error('File URL is required');

        // Fetch the file from the URL
        console.log('[Backblaze] Fetching file from:', fileUrl);
        const fileResponse = await fetch(fileUrl);
        
        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch file from URL: ${fileResponse.statusText}`);
        }
        
        const fileData = await fileResponse.arrayBuffer();

        // Get upload URL
        const bucketResponse = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_buckets`, {
          method: 'POST',
          headers: {
            'Authorization': auth.authorizationToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: keyId,
            bucketName: bucketName,
          }),
        });

        const bucketData = await bucketResponse.json();
        const bucket = bucketData.buckets?.[0];

        if (!bucket) {
          throw new Error(`Bucket ${bucketName} not found`);
        }

        const uploadUrlResponse = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
          method: 'POST',
          headers: {
            'Authorization': auth.authorizationToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bucketId: bucket.bucketId,
          }),
        });

        const uploadUrlData = await uploadUrlResponse.json();

        // Upload file

        const uploadResponse = await fetch(uploadUrlData.uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': uploadUrlData.authorizationToken,
            'X-Bz-File-Name': encodeURIComponent(fileName),
            'Content-Type': contentType,
            'X-Bz-Content-Sha1': 'do_not_verify',
          },
          body: fileData,
        });

        responseData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(responseData.message || 'File upload failed');
        }

        console.log('[Backblaze] File uploaded successfully');
        break;
      }

      case 'readBackBlazeFile': {
        // Download file
        const downloadUrl = `${auth.downloadUrl}/file/${bucketName}/${fileName}`;

        const downloadResponse = await fetch(downloadUrl, {
          headers: {
            'Authorization': auth.authorizationToken,
          },
        });

        if (!downloadResponse.ok) {
          throw new Error('File download failed');
        }

        const fileData = await downloadResponse.text();
        responseData = {
          fileName,
          content: fileData,
          contentType: downloadResponse.headers.get('content-type'),
        };

        console.log('[Backblaze] File downloaded successfully');
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[Backblaze] Error:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
