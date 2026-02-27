import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, password, action, text, replyTo, postUri } = await req.json();
    
    console.log('Bluesky action received:', action);
    
    if (!identifier || !password) {
      throw new Error("Bluesky identifier and password are required");
    }

    // Create session
    const sessionResponse = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    
    const session = await sessionResponse.json();
    
    if (!session.accessJwt) {
      throw new Error('Failed to authenticate with Bluesky');
    }

    const headers = {
      'Authorization': `Bearer ${session.accessJwt}`,
      'Content-Type': 'application/json',
    };

    let result;

    if (action === 'createPost') {
      const response = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          repo: session.did,
          collection: 'app.bsky.feed.post',
          record: {
            text,
            createdAt: new Date().toISOString(),
            ...(replyTo && { reply: replyTo })
          }
        }),
      });
      result = await response.json();
    } else if (action === 'likePost') {
      if (!postUri) {
        throw new Error('Post URI is required for liking a post');
      }
      const response = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          repo: session.did,
          collection: 'app.bsky.feed.like',
          record: {
            subject: {
              uri: postUri,
              cid: postUri.split('/').pop() // Simplified - in production you'd fetch the actual CID
            },
            createdAt: new Date().toISOString(),
          }
        }),
      });
      result = await response.json();
    } else if (action === 'repostPost') {
      if (!postUri) {
        throw new Error('Post URI is required for reposting');
      }
      const response = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          repo: session.did,
          collection: 'app.bsky.feed.repost',
          record: {
            subject: {
              uri: postUri,
              cid: postUri.split('/').pop() // Simplified - in production you'd fetch the actual CID
            },
            createdAt: new Date().toISOString(),
          }
        }),
      });
      result = await response.json();
    } else if (action === 'findPost') {
      if (!postUri) {
        throw new Error('Post URI is required to find a post');
      }
      const response = await fetch(`https://bsky.social/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(postUri)}`, {
        headers,
      });
      result = await response.json();
    } else if (action === 'findThread') {
      if (!postUri) {
        throw new Error('Post URI is required to find a thread');
      }
      const response = await fetch(`https://bsky.social/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(postUri)}&depth=10`, {
        headers,
      });
      result = await response.json();
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Bluesky error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
