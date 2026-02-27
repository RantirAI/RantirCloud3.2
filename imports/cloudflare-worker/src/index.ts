/**
 * Rantir Published Apps Router
 * 
 * This Cloudflare Worker routes requests to published Rantir apps:
 * - Handles wildcard subdomains (*.rantir.cloud)
 * - Supports custom domain routing
 * - Proxies requests to the Supabase render-published-app edge function
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Create a Cloudflare account and add your domain (rantir.cloud)
 * 2. Install Wrangler CLI: npm install -g wrangler
 * 3. Login to Cloudflare: wrangler login
 * 4. Update wrangler.toml with your settings
 * 5. Deploy: wrangler deploy
 * 
 * DNS SETUP:
 * - Add a wildcard DNS record: *.rantir.cloud -> CNAME -> your-worker.workers.dev
 * - Or use Cloudflare's routes to handle *.rantir.cloud/* -> worker
 */

export interface Env {
  // Your Supabase project URL (e.g., https://xyz.supabase.co)
  SUPABASE_URL: string;
  // Optional: Custom domain lookup cache (Cloudflare KV namespace)
  CUSTOM_DOMAINS?: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const hostname = url.hostname;
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        },
      });
    }

    // Handle chatwidget.rantir.cloud — proxy to chat-widget edge function
    if (hostname === 'chatwidget.rantir.cloud') {
      // Debug mode for widget
      if (url.searchParams.get('debug_headers') === '1') {
        const debugChatUrl = `${env.SUPABASE_URL}/functions/v1/chat-widget${url.pathname.replace(/^\/$/, '')}${url.search}`;
        const upstream = await fetch(debugChatUrl);
        const upstreamHeaders: Record<string, string> = {};
        upstream.headers.forEach((v, k) => { upstreamHeaders[k] = v; });
        return new Response(`<!DOCTYPE html>
<html><body style="font-family:monospace;padding:2rem;background:#1a1a1a;color:#fff;">
<h1>Chat Widget Debug</h1>
<p><strong>Hostname:</strong> ${hostname}</p>
<p><strong>Upstream URL:</strong> ${debugChatUrl}</p>
<p><strong>Upstream Status:</strong> ${upstream.status}</p>
<h2>Upstream Headers</h2>
<pre>${JSON.stringify(upstreamHeaders, null, 2)}</pre>
</body></html>`, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      const chatUrl = `${env.SUPABASE_URL}/functions/v1/chat-widget${url.pathname.replace(/^\/$/, '')}${url.search}`;
      const chatResponse = await fetch(chatUrl, {
        method: request.method,
        headers: {
          'User-Agent': request.headers.get('User-Agent') || 'Rantir-ChatWidget/1.0',
          'Content-Type': request.headers.get('Content-Type') || 'application/json',
          'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || '',
          'x-api-key': request.headers.get('x-api-key') || '',
        },
        body: request.method !== 'GET' ? request.body : undefined,
      });
      
      const chatHeaders = new Headers();
      const ct = chatResponse.headers.get('Content-Type');
      if (ct) chatHeaders.set('Content-Type', ct);
      chatHeaders.set('Access-Control-Allow-Origin', '*');
      chatHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
      chatHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      chatHeaders.set('Cache-Control', 'no-cache');
      chatHeaders.set('X-Powered-By', 'Rantir');
      
      if (request.method === 'GET') {
        chatHeaders.set('Content-Type', 'text/html; charset=utf-8');
        chatHeaders.set('Content-Security-Policy', "frame-ancestors *");
      }
      
      return new Response(chatResponse.body, {
        status: chatResponse.status,
        headers: chatHeaders,
      });
    }

    // Determine routing type
    const routingInfo = await getRoutingInfo(hostname, env);
    
    if (!routingInfo.isValidApp) {
      // Not a published app domain - could be the main site or invalid
      return new Response('Not Found', { status: 404 });
    }

    // Build the render URL
    const renderUrl = buildRenderUrl(env.SUPABASE_URL, routingInfo, url);
    
    // Fetch from the edge function
    const response = await fetch(renderUrl, {
      method: 'GET',
      headers: {
        'User-Agent': request.headers.get('User-Agent') || 'Rantir-Router/1.0',
        'Referer': request.headers.get('Referer') || '',
        'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || '',
        'X-Forwarded-Proto': 'https',
        'X-Real-IP': request.headers.get('CF-Connecting-IP') || '',
      },
    });

    // Debug mode: return diagnostic info instead of proxied response
    if (url.searchParams.get('debug_headers') === '1') {
      const upstreamHeaders: Record<string, string> = {};
      response.headers.forEach((v, k) => { upstreamHeaders[k] = v; });
      
      const debugHtml = `<!DOCTYPE html>
<html><head><title>Rantir Debug</title></head>
<body style="font-family:monospace;padding:2rem;background:#1a1a1a;color:#fff;">
<h1>Rantir Router Debug</h1>
<p><strong>Hostname:</strong> ${hostname}</p>
<p><strong>Routing Type:</strong> ${routingInfo.type}</p>
<p><strong>Identifier:</strong> ${routingInfo.identifier}</p>
<p><strong>Upstream URL:</strong> ${renderUrl}</p>
<p><strong>Upstream Status:</strong> ${response.status}</p>
<h2>Upstream Headers</h2>
<pre>${JSON.stringify(upstreamHeaders, null, 2)}</pre>
</body></html>`;
      
      return new Response(debugHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Build response headers - FORCE text/html
    // CRITICAL: Create completely fresh headers - do NOT copy from upstream
    // The Supabase gateway adds restrictive "default-src 'none'; sandbox" CSP
    // and "text/plain" content-type which we must override completely
    const headers = new Headers();
    
    // Force correct content type (Supabase returns text/plain)
    headers.set('Content-Type', 'text/html; charset=utf-8');

    // Add permissive CSP that allows the runtime to execute
    // This replaces the gateway's restrictive "default-src 'none'; sandbox" CSP
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com https://esm.sh https://fonts.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://appdmmjexevclmpyvtss.supabase.co https://*.supabase.co https:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
    ].join('; ');
    headers.set('Content-Security-Policy', csp);

    // Copy only safe headers from upstream (avoid CSP, content-type, sandbox, etc.)
    ['ETag', 'Last-Modified', 'Vary'].forEach((h) => {
      const v = response.headers.get(h);
      if (v) headers.set(h, v);
    });

    // Add caching and custom headers
    headers.set('Cache-Control', 'public, max-age=60, s-maxage=300');
    headers.set('X-Powered-By', 'Rantir');
    headers.set('X-Rantir-App', routingInfo.identifier);
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

interface RoutingInfo {
  isValidApp: boolean;
  type: 'subdomain' | 'custom_domain' | 'none';
  identifier: string; // subdomain slug or custom domain
}

/**
 * Determine how to route the request based on hostname
 */
async function getRoutingInfo(hostname: string, env: Env): Promise<RoutingInfo> {
  // Check if it's a rantir.cloud subdomain
  if (hostname.endsWith('.rantir.cloud')) {
    const subdomain = hostname.replace('.rantir.cloud', '');
    
    // Skip main domain variations
    if (subdomain === 'www' || subdomain === '' || subdomain === 'rantir') {
      return { isValidApp: false, type: 'none', identifier: '' };
    }
    
    // Skip internal subdomains
    if (['api', 'app', 'dashboard', 'admin', 'cdn', 'static'].includes(subdomain)) {
      return { isValidApp: false, type: 'none', identifier: '' };
    }
    
    return { isValidApp: true, type: 'subdomain', identifier: subdomain };
  }
  
  // Check if it's a custom domain
  // First check KV cache for faster lookup
  if (env.CUSTOM_DOMAINS) {
    const cachedSlug = await env.CUSTOM_DOMAINS.get(hostname);
    if (cachedSlug) {
      return { isValidApp: true, type: 'custom_domain', identifier: hostname };
    }
  }
  
  // For custom domains not in cache, let the edge function handle validation
  // This allows the edge function to verify the domain exists in the database
  if (!hostname.includes('rantir.cloud') && !hostname.includes('localhost')) {
    return { isValidApp: true, type: 'custom_domain', identifier: hostname };
  }
  
  return { isValidApp: false, type: 'none', identifier: '' };
}

/**
 * Build the URL to call the Supabase edge function
 */
function buildRenderUrl(supabaseUrl: string, routingInfo: RoutingInfo, originalUrl: URL): string {
  const baseUrl = `${supabaseUrl}/functions/v1/render-published-app`;
  const params = new URLSearchParams();
  
  // Set the subdomain/domain parameter
  if (routingInfo.type === 'subdomain') {
    params.set('subdomain', routingInfo.identifier);
  } else {
    params.set('domain', routingInfo.identifier);
  }
  
  // Forward the page path if present
  const pagePath = originalUrl.searchParams.get('page') || originalUrl.pathname;
  if (pagePath && pagePath !== '/') {
    params.set('page', pagePath);
  }
  
  // Forward password if present
  const password = originalUrl.searchParams.get('password');
  if (password) {
    params.set('password', password);
  }
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Handle errors gracefully
 */
function handleError(error: Error): Response {
  console.error('Rantir Router Error:', error);
  
  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Error - Rantir</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="min-h-screen bg-gray-900 flex items-center justify-center">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-white mb-4">Something went wrong</h1>
        <p class="text-gray-400">Please try again later</p>
      </div>
    </body>
    </html>
  `, {
    status: 500,
    headers: { 'Content-Type': 'text/html' },
  });
}
