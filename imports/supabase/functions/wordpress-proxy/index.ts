import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getErrorMessage } from "../_shared/errors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { siteUrl, username, password, action, ...params } = await req.json();

    if (!siteUrl || !username || !password) {
      throw new Error("Missing required WordPress credentials");
    }

    const baseUrl = siteUrl.replace(/\/$/, '') + '/wp-json/wp/v2';
    const auth = btoa(`${username}:${password}`);
    
    let url = baseUrl;
    let method = 'GET';
    let body = null;

    switch (action) {
      case 'createWordPressPost':
        url = `${baseUrl}/posts`;
        method = 'POST';
        body = JSON.stringify({
          title: params.title,
          content: params.content,
          status: params.status || 'publish',
          excerpt: params.excerpt
        });
        break;
        
      case 'createWordPressPage':
        url = `${baseUrl}/pages`;
        method = 'POST';
        body = JSON.stringify({
          title: params.title,
          content: params.content,
          status: params.status || 'publish'
        });
        break;
        
      case 'updateWordPressPost':
        url = `${baseUrl}/posts/${params.postId}`;
        method = 'POST';
        body = JSON.stringify({
          title: params.title,
          content: params.content,
          status: params.status,
          excerpt: params.excerpt
        });
        break;
        
      case 'getWordPressPost':
        if (params.postId) {
          url = `${baseUrl}/posts/${params.postId}`;
        } else {
          url = `${baseUrl}/posts?per_page=${params.limit || 10}`;
        }
        break;
        
      case 'customApiCall':
        url = `${baseUrl}${params.endpoint}`;
        method = params.method || 'GET';
        if (params.body && method !== 'GET') {
          body = JSON.stringify(params.body);
        }
        if (params.queryParams) {
          const searchParams = new URLSearchParams(params.queryParams);
          url += `?${searchParams.toString()}`;
        }
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WordPress API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    
    // Extract relevant data for return
    let responseData = {
      result,
      postId: result.id?.toString(),
      postUrl: result.link,
      editUrl: result.link ? `${siteUrl}/wp-admin/post.php?post=${result.id}&action=edit` : undefined
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("WordPress proxy error:", error);
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});