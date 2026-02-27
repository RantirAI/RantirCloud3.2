import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GITHUB_CLIENT_ID = Deno.env.get('GITHUB_CLIENT_ID')!;
const GITHUB_CLIENT_SECRET = Deno.env.get('GITHUB_CLIENT_SECRET')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // POST: initiate OAuth — return the GitHub authorize URL
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
      
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo,user&state=${encodeURIComponent(state)}`;

      return new Response(JSON.stringify({ url: githubAuthUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // GET: handle OAuth callback from GitHub
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
      // Exchange code for access token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return new Response(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`, { status: 400 });
      }

      const accessToken = tokenData.access_token;
      const scope = tokenData.scope;
      const tokenType = tokenData.token_type;

      // Fetch GitHub user info
      const userRes = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/vnd.github+json' },
      });
      const githubUser = await userRes.json();

      // Store in database
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Upsert — update if same github user already connected
      const { error: dbError } = await supabase
        .from('user_github_connections')
        .upsert({
          user_id: state.userId,
          github_user_id: githubUser.id,
          github_username: githubUser.login,
          access_token: accessToken,
          token_type: tokenType,
          scope: scope,
          avatar_url: githubUser.avatar_url,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,github_user_id',
          ignoreDuplicates: false,
        });

      if (dbError) {
        // If unique constraint doesn't exist on that combo, just insert
        await supabase
          .from('user_github_connections')
          .insert({
            user_id: state.userId,
            github_user_id: githubUser.id,
            github_username: githubUser.login,
            access_token: accessToken,
            token_type: tokenType,
            scope: scope,
            avatar_url: githubUser.avatar_url,
          });
      }

      // Redirect back to the app
      const redirectUrl = state.returnUrl || '/';
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    } catch (error) {
      console.error('GitHub OAuth callback error:', error);
      return new Response(`OAuth error: ${error.message}`, { status: 500 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
