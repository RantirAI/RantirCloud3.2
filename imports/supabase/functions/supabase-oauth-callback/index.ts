import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SB_OAUTH_CLIENT_ID = Deno.env.get('SB_OAUTH_CLIENT_ID')!;
const SB_OAUTH_CLIENT_SECRET = Deno.env.get('SB_OAUTH_CLIENT_SECRET')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // POST: initiate OAuth — return the Supabase authorize URL
  if (req.method === 'POST') {
    try {
      const { returnUrl } = await req.json();

      // Verify user is authenticated
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Not authenticated' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Build state param with user id and return URL
      const state = btoa(JSON.stringify({ userId: user.id, returnUrl: returnUrl || '/' }));

      const redirectUri = `${SUPABASE_URL}/functions/v1/supabase-oauth-callback`;

      const supabaseAuthUrl = `https://api.supabase.com/v1/oauth/authorize?client_id=${SB_OAUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${encodeURIComponent(state)}`;

      return new Response(JSON.stringify({ url: supabaseAuthUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // GET: handle OAuth callback from Supabase
  if (req.method === 'GET') {
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state');

    if (!code || !stateParam) {
      return new Response('Missing code or state', { status: 400 });
    }

    let state: { userId: string; returnUrl: string };
    try {
      state = JSON.parse(atob(stateParam));
    } catch {
      return new Response('Invalid state parameter', { status: 400 });
    }

    try {
      const redirectUri = `${SUPABASE_URL}/functions/v1/supabase-oauth-callback`;

      // Exchange code for access token
      const tokenRes = await fetch('https://api.supabase.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: SB_OAUTH_CLIENT_ID,
          client_secret: SB_OAUTH_CLIENT_SECRET,
        }).toString(),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        console.error('Supabase OAuth token error:', tokenData);
        return new Response(`Supabase OAuth error: ${tokenData.error_description || tokenData.error}`, { status: 400 });
      }

      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;

      // Fetch user's Supabase organizations to identify the account
      const orgsRes = await fetch('https://api.supabase.com/v1/organizations', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });
      const orgs = await orgsRes.json();

      // Fetch projects to get project info
      const projectsRes = await fetch('https://api.supabase.com/v1/projects', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });
      const projects = await projectsRes.json();

      // Use the first org name as the connection identifier
      const orgName = Array.isArray(orgs) && orgs.length > 0 ? orgs[0].name : 'Supabase Account';
      const orgId = Array.isArray(orgs) && orgs.length > 0 ? orgs[0].id : null;

      // Store in database
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { error: dbError } = await supabase
        .from('user_supabase_connections')
        .upsert({
          user_id: state.userId,
          project_name: orgName,
          supabase_url: orgId || 'oauth-connected',
          supabase_anon_key: accessToken,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,supabase_url',
          ignoreDuplicates: false,
        });

      if (dbError) {
        // Fallback to insert
        await supabase
          .from('user_supabase_connections')
          .insert({
            user_id: state.userId,
            project_name: orgName,
            supabase_url: orgId || 'oauth-connected',
            supabase_anon_key: accessToken,
          });
      }

      // Redirect back to the app
      const redirectUrl = state.returnUrl || '/';
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    } catch (error) {
      console.error('Supabase OAuth callback error:', error);
      return new Response(`OAuth error: ${error.message}`, { status: 500 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
