import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { consumerKey, consumerSecret, accessToken, accessTokenSecret, action, text, tweetId } = await req.json();
    
    const API_KEY = consumerKey?.trim();
    const API_SECRET = consumerSecret?.trim();
    const ACCESS_TOKEN = accessToken?.trim();
    const ACCESS_TOKEN_SECRET = accessTokenSecret?.trim();

    if (!API_KEY || !API_SECRET || !ACCESS_TOKEN || !ACCESS_TOKEN_SECRET) {
      throw new Error("Twitter API credentials are required");
    }

    const generateOAuthSignature = (
      method: string,
      url: string,
      params: Record<string, string>,
      consumerSecret: string,
      tokenSecret: string
    ): string => {
      const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(
        Object.entries(params).sort().map(([k, v]) => `${k}=${v}`).join("&")
      )}`;
      const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
      const hmacSha1 = createHmac("sha1", signingKey);
      return hmacSha1.update(signatureBaseString).digest("base64");
    };

    const generateOAuthHeader = (method: string, url: string): string => {
      const oauthParams = {
        oauth_consumer_key: API_KEY,
        oauth_nonce: Math.random().toString(36).substring(2),
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_token: ACCESS_TOKEN,
        oauth_version: "1.0",
      };

      const signature = generateOAuthSignature(method, url, oauthParams, API_SECRET, ACCESS_TOKEN_SECRET);
      const signedOAuthParams = { ...oauthParams, oauth_signature: signature };

      return "OAuth " + Object.entries(signedOAuthParams)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
        .join(", ");
    };

    let result;

    if (action === 'createTweet') {
      if (!text) {
        throw new Error("Tweet text is required");
      }
      const url = "https://api.x.com/2/tweets";
      const method = "POST";
      const oauthHeader = generateOAuthHeader(method, url);

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: oauthHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const responseText = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${responseText}`);
      result = JSON.parse(responseText);
    } else if (action === 'createReply') {
      if (!text || !tweetId) {
        throw new Error("Tweet text and tweet ID are required for replies");
      }
      const url = "https://api.x.com/2/tweets";
      const method = "POST";
      const oauthHeader = generateOAuthHeader(method, url);

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: oauthHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          text,
          reply: { in_reply_to_tweet_id: tweetId }
        }),
      });

      const responseText = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${responseText}`);
      result = JSON.parse(responseText);
    } else if (action === 'get_user') {
      const url = "https://api.x.com/2/users/me";
      const method = "GET";
      const oauthHeader = generateOAuthHeader(method, url);

      const response = await fetch(url, {
        method,
        headers: { Authorization: oauthHeader },
      });

      const responseText = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${responseText}`);
      result = JSON.parse(responseText);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Twitter error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
