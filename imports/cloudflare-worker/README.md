# Rantir Published Apps Router

This Cloudflare Worker handles routing for published Rantir apps on `*.rantir.cloud` subdomains and custom domains.

## Architecture

```
User Request → Cloudflare Worker → Supabase Edge Function → Rendered HTML
                   ↓
             DNS Routing
             SSL Termination
             Caching
```

## Setup Instructions

### 1. Prerequisites

- Cloudflare account with `rantir.cloud` domain added
- Node.js 18+ installed
- Wrangler CLI installed: `npm install -g wrangler`

### 2. Configure Cloudflare

1. **Add Domain to Cloudflare**
   - Go to Cloudflare Dashboard → Add Site → `rantir.cloud`
   - Follow DNS setup instructions to point nameservers to Cloudflare

2. **Create Wildcard DNS Record**
   - Go to DNS settings
   - Add record: Type `CNAME`, Name `*`, Target `rantir.cloud` (proxied)
   - This routes all subdomains through Cloudflare

### 3. Deploy Worker

```bash
# Login to Cloudflare
wrangler login

# Install dependencies
cd cloudflare-worker
npm install

# Deploy to development
npm run dev

# Deploy to production
npm run deploy
```

### 4. Configure Routes

After deployment, set up routes in Cloudflare:

1. Go to Workers & Pages → rantir-apps-router
2. Add trigger: `*.rantir.cloud/*`
3. Save

## Custom Domains

For custom domain support (e.g., `myapp.example.com`):

### Option A: Cloudflare for Platforms (Recommended)

1. Enable Cloudflare for Platforms in your account
2. Users add CNAME record: `myapp → rantir.cloud`
3. SSL is automatically provisioned

### Option B: Manual DNS

Users configure:
1. CNAME: `myapp.example.com` → `rantir.cloud`
2. TXT: `_rantir-verify.myapp.example.com` → verification token

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `CUSTOM_DOMAINS` | (Optional) KV namespace for domain caching |

## KV Caching (Optional)

For faster custom domain lookups:

```bash
# Create KV namespace
wrangler kv:namespace create "CUSTOM_DOMAINS"

# Add the binding to wrangler.toml
```

## Monitoring

View logs:
```bash
wrangler tail
```

## Troubleshooting

**Worker not receiving requests**
- Verify DNS is proxied (orange cloud) in Cloudflare
- Check route patterns match your domain

**SSL errors**
- Ensure Cloudflare SSL mode is "Full (strict)"
- Wildcard certificates are automatic for proxied domains

**Custom domains not working**
- Verify CNAME points to `rantir.cloud`
- Check domain is verified in the database
