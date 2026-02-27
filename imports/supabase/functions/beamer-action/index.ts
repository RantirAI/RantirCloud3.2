import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { apiKey, action, title, content, category, message, language, userEmail } = body;

    console.log('[BEAMER] Action:', action);

    if (!apiKey) {
      throw new Error('API key is required');
    }

    if (!action) {
      throw new Error('Action is required');
    }

    let result;

    if (action === 'create_post' || action === 'createBeamerPost') {
      if (!title || !content) {
        throw new Error('Title and content are required for creating posts');
      }

      const lang = language || 'EN';
      const postData: any = {
        published: true,
        publish: true,
        title: [title],
        content: [content],
        ...(category ? { category } : {}),
        ...(language ? { language: [lang] } : {}),
        ...(userEmail ? { userEmail } : {})
      };

      console.log('[BEAMER] Posting keys:', Object.keys(postData));
      console.log('[BEAMER] Creating post with language:', lang);

      const response = await fetch('https://api.getbeamer.com/v0/posts', {
        method: 'POST',
        headers: {
          'Beamer-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[BEAMER] API Error Response:', errorText);
        throw new Error(`Beamer API error (${response.status}): ${errorText}`);
      }

      result = await response.json();
    } else if (action === 'list_posts') {
      const response = await fetch('https://api.getbeamer.com/v0/posts', {
        method: 'GET',
        headers: {
          'Beamer-Api-Key': apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Beamer API error: ${errorText}`);
      }

      result = await response.json();
    } else if (action === 'send_notification') {
      if (!title || !message) {
        throw new Error('Title and message are required for sending notifications');
      }

      const notificationData = {
        title,
        message,
      };

      const response = await fetch('https://api.getbeamer.com/v0/push', {
        method: 'POST',
        headers: {
          'Beamer-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Beamer API error: ${errorText}`);
      }

      result = await response.json();
    } else if (action === 'createNewFeatureRequest') {
      if (!title || !content && !message && !category) {
        // Using `description` from node inputs; fallback to `content` if present
      }

      const { description, language: lang } = body;
      if (!title || !description) {
        throw new Error('Title and description are required for creating feature requests');
      }

      const featureRequestData: any = {
        title: [title],
        content: [description],
        visible: true,
        language: [lang || 'EN'],
      };
      if (category) featureRequestData.category = category;

      const response = await fetch('https://api.getbeamer.com/v0/requests', {
        method: 'POST',
        headers: {
          'Beamer-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(featureRequestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Beamer API error: ${errorText}`);
      }

      result = await response.json();
    } else if (action === 'createComment') {
      const { postId, comment, userId, userEmail, userFirstname, userLastname, visible } = body;
      if (!postId || !comment) {
        throw new Error('postId and comment are required for creating a comment');
      }

      const commentData: any = {
        text: comment,
        visible: typeof visible === 'boolean' ? visible : true,
      };
      if (userId) commentData.userId = userId;
      if (userEmail) commentData.userEmail = userEmail;
      if (userFirstname) commentData.userFirstname = userFirstname;
      if (userLastname) commentData.userLastname = userLastname;

      const response = await fetch(`https://api.getbeamer.com/v0/posts/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        headers: {
          'Beamer-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Beamer API error: ${errorText}`);
      }

      result = await response.json();
    } else if (action === 'createVote') {
      const { requestId, postId, userId, userEmail, userFirstname, userLastname } = body;
      const targetRequestId = requestId || postId;
      if (!targetRequestId || !userId) {
        throw new Error('requestId and userId are required for creating a vote');
      }

      const voteData: any = { userId };
      if (userEmail) voteData.userEmail = userEmail;
      if (userFirstname) voteData.userFirstname = userFirstname;
      if (userLastname) voteData.userLastname = userLastname;

      const response = await fetch(`https://api.getbeamer.com/v0/requests/${encodeURIComponent(targetRequestId)}/votes`, {
        method: 'POST',
        headers: {
          'Beamer-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(voteData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Beamer API error: ${errorText}`);
      }

      result = await response.json();
    } else if (action === 'createCustomApiCall') {
      const { endpoint, method = 'GET', body: payload } = body;
      if (!endpoint) throw new Error('Endpoint is required for custom API call');

      const normalizedEndpoint = String(endpoint).replace(/^\/+/, '');
      const url = `https://api.getbeamer.com/v0/${normalizedEndpoint}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Beamer-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: ['GET', 'HEAD'].includes(method.toUpperCase()) ? undefined : (typeof payload === 'string' ? payload : JSON.stringify(payload || {})),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Beamer API error: ${errorText}`);
      }

      // Try to parse JSON; if fails, return text
      const text = await response.text();
      try {
        result = JSON.parse(text);
      } catch {
        result = { raw: text };
      }
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Beamer action error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
