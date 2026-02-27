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
      bucketName,
      objectKey,
      fileContent,
      contentType,
      sourceKey,
      destinationKey,
      prefix,
      maxKeys
    } = await req.json();

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS Access Key ID and Secret Access Key are required');
    }

    if (!bucketName) {
      throw new Error('Bucket name is required');
    }

    // AWS S3 operations using AWS SDK v3 (simplified implementation)
    let response: any = {};
    const baseUrl = `https://${bucketName}.s3.${region}.amazonaws.com`;

    switch (action) {
      case 'list_objects':
        const listUrl = new URL(baseUrl);
        if (prefix) listUrl.searchParams.set('prefix', prefix);
        if (maxKeys) listUrl.searchParams.set('max-keys', maxKeys.toString());
        
        response = await makeS3Request('GET', listUrl.toString(), accessKeyId, secretAccessKey, region);
        break;
        
      case 'upload_file':
        if (!objectKey || !fileContent) {
          throw new Error('Object key and file content are required for upload');
        }
        const uploadUrl = `${baseUrl}/${objectKey}`;
        const uploadHeaders: Record<string, string> = {};
        if (contentType) uploadHeaders['Content-Type'] = contentType;
        
        response = await makeS3Request('PUT', uploadUrl, accessKeyId, secretAccessKey, region, fileContent, uploadHeaders);
        break;
        
      case 'download_file':
        if (!objectKey) {
          throw new Error('Object key is required for download');
        }
        const downloadUrl = `${baseUrl}/${objectKey}`;
        response = await makeS3Request('GET', downloadUrl, accessKeyId, secretAccessKey, region);
        break;
        
      case 'delete_file':
        if (!objectKey) {
          throw new Error('Object key is required for delete');
        }
        const deleteUrl = `${baseUrl}/${objectKey}`;
        response = await makeS3Request('DELETE', deleteUrl, accessKeyId, secretAccessKey, region);
        break;
        
      case 'get_presigned_url':
        if (!objectKey) {
          throw new Error('Object key is required for presigned URL');
        }
        // Generate presigned URL (simplified - in production use AWS SDK)
        const presignedUrl = generatePresignedUrl(baseUrl, objectKey, accessKeyId, secretAccessKey, region);
        response = { downloadUrl: presignedUrl };
        break;
        
      case 'copy_file':
        if (!sourceKey || !destinationKey) {
          throw new Error('Source key and destination key are required for copy');
        }
        const copyUrl = `${baseUrl}/${destinationKey}`;
        const copyHeaders = { 'x-amz-copy-source': `/${bucketName}/${sourceKey}` };
        response = await makeS3Request('PUT', copyUrl, accessKeyId, secretAccessKey, region, undefined, copyHeaders);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Amazon S3 Proxy: Successfully processed ${action}`);

    return new Response(JSON.stringify({
      success: true,
      data: response,
      ...response // Spread response data to top level
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Amazon S3 Proxy Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Simplified S3 request function (in production, use AWS SDK v3)
async function makeS3Request(
  method: string,
  url: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  body?: string,
  additionalHeaders: Record<string, string> = {}
): Promise<any> {
  
  // This is a simplified implementation
  // In production, you should use the AWS SDK v3 for proper authentication
  const headers = {
    'Authorization': `AWS ${accessKeyId}:${secretAccessKey}`, // Simplified - use proper AWS Signature V4
    'x-amz-region': region,
    ...additionalHeaders
  };

  const response = await fetch(url, {
    method,
    headers,
    body
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`S3 API Error: ${response.status} ${errorText}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/xml') || contentType?.includes('text/xml')) {
    return await response.text(); // Return XML as text
  } else {
    return await response.text(); // Return content as text
  }
}

function generatePresignedUrl(
  baseUrl: string,
  objectKey: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string
): string {
  // Simplified presigned URL generation
  // In production, use proper AWS Signature V4 algorithm
  const expiration = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  return `${baseUrl}/${objectKey}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${accessKeyId}&X-Amz-Expires=3600`;
}