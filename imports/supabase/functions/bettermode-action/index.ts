import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken, action, spaceId, title, content, memberId, badgeId, endpoint, body } = await req.json();
    
    if (!accessToken) {
      throw new Error("Bettermode access token is required");
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    let result;
    let response;

    if (action === 'createDiscussion') {
      response = await fetch('https://api.bettermode.com/graphql', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `mutation CreatePost($input: CreatePostInput!) {
            createPost(input: $input) {
              id
              title
              createdAt
              ... on Post {
                content {
                  text
                }
              }
            }
          }`,
          variables: {
            input: {
              spaceId,
              postTypeId: 'discussion',
              mappingFields: [
                {
                  key: 'title',
                  type: 'text',
                  value: title
                },
                {
                  key: 'content',
                  type: 'html',
                  value: content
                }
              ]
            }
          }
        }),
      });
      result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Failed to create discussion');
      }
    } else if (action === 'createQuestion') {
      response = await fetch('https://api.bettermode.com/graphql', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `mutation CreatePost($input: CreatePostInput!) {
            createPost(input: $input) {
              id
              title
              createdAt
              ... on Post {
                content {
                  text
                }
              }
            }
          }`,
          variables: {
            input: {
              spaceId,
              postTypeId: 'question',
              mappingFields: [
                {
                  key: 'title',
                  type: 'text',
                  value: title
                },
                {
                  key: 'content',
                  type: 'html',
                  value: content
                }
              ]
            }
          }
        }),
      });
      result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Failed to create question');
      }
    } else if (action === 'assignBadge') {
      response = await fetch('https://api.bettermode.com/graphql', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `mutation AddMemberBadge($memberId: ID!, $badgeId: ID!) {
            addMemberBadge(memberId: $memberId, badgeId: $badgeId) {
              status
            }
          }`,
          variables: {
            memberId,
            badgeId
          }
        }),
      });
      result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Failed to assign badge');
      }
    } else if (action === 'revokeBadge') {
      response = await fetch('https://api.bettermode.com/graphql', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `mutation RemoveMemberBadge($memberId: ID!, $badgeId: ID!) {
            removeMemberBadge(memberId: $memberId, badgeId: $badgeId) {
              status
            }
          }`,
          variables: {
            memberId,
            badgeId
          }
        }),
      });
      result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Failed to revoke badge');
      }
    } else if (action === 'createCustomApiCall') {
      response = await fetch('https://api.bettermode.com/graphql', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: endpoint,
          variables: body ? JSON.parse(body) : undefined
        }),
      });
      result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Custom API call failed');
      }
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Bettermode error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
