import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { corsHeaders } from '../_shared/cors.ts';

interface DomainRequest {
  publishedAppId?: string;
  domain: string;
  action: 'add' | 'verify' | 'remove' | 'status';
}

interface CloudflareDomainResult {
  success: boolean;
  hostname?: string;
  ssl_status?: string;
  verification_status?: string;
  error?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Cloudflare API credentials (for Cloudflare for Platforms)
const CLOUDFLARE_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN');
const CLOUDFLARE_ZONE_ID = Deno.env.get('CLOUDFLARE_ZONE_ID');
const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the user from the request
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { publishedAppId, domain, action }: DomainRequest = await req.json();

    // For status checks, we don't need publishedAppId
    if (action === 'status') {
      return await checkDomainStatus(domain);
    }

    if (!publishedAppId) {
      return new Response(
        JSON.stringify({ error: 'Published app ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the published app belongs to the user
    const { data: publishedApp, error: appError } = await supabase
      .from('published_apps')
      .select('*')
      .eq('id', publishedAppId)
      .eq('user_id', user.id)
      .single();

    if (appError || !publishedApp) {
      return new Response(
        JSON.stringify({ error: 'Published app not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'add':
        return await addCustomDomain(publishedAppId, domain, user.id);
      case 'verify':
        return await verifyCustomDomain(domain, publishedAppId);
      case 'remove':
        return await removeCustomDomain(publishedAppId, domain);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Error managing domain:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Add a custom domain to a published app
 */
async function addCustomDomain(publishedAppId: string, domain: string, userId: string) {
  // Normalize domain
  const normalizedDomain = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
  
  // Validate domain format
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
  if (!domainRegex.test(normalizedDomain)) {
    return new Response(
      JSON.stringify({ error: 'Invalid domain format' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if domain is already in use
  const { data: existingDomain } = await supabase
    .from('custom_domains')
    .select('*')
    .eq('domain', normalizedDomain)
    .maybeSingle();

  if (existingDomain) {
    // If it's the same app, return the existing domain data
    if (existingDomain.published_app_id === publishedAppId) {
      return new Response(
        JSON.stringify({
          success: true,
          customDomain: existingDomain,
          dnsInstructions: {
            records: [
              {
                type: 'CNAME',
                name: normalizedDomain,
                value: 'rantir.cloud',
                purpose: 'Routes traffic to your published app'
              },
              {
                type: 'TXT',
                name: `_rantir-verify.${normalizedDomain}`,
                value: existingDomain.verification_token,
                purpose: 'Verifies domain ownership'
              }
            ],
            note: 'Add these DNS records at your domain registrar. Verification may take up to 48 hours for DNS propagation.'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Domain belongs to a different app
    return new Response(
      JSON.stringify({ error: 'Domain is already in use by another app' }),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Generate verification token
  const verificationToken = crypto.randomUUID();

  // Insert custom domain record
  const { data, error } = await supabase
    .from('custom_domains')
    .insert({
      published_app_id: publishedAppId,
      domain: normalizedDomain,
      verification_token: verificationToken,
      verification_status: 'pending',
      dns_verified: false,
      ssl_status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to insert custom domain:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // If Cloudflare is configured, try to add the hostname
  let cloudflareResult: CloudflareDomainResult | null = null;
  if (CLOUDFLARE_API_TOKEN && CLOUDFLARE_ZONE_ID) {
    cloudflareResult = await addCloudflareHostname(normalizedDomain);
  }

  return new Response(
    JSON.stringify({
      success: true,
      customDomain: data,
      cloudflare: cloudflareResult,
      dnsInstructions: {
        records: [
          {
            type: 'CNAME',
            name: normalizedDomain,
            value: 'rantir.cloud',
            purpose: 'Routes traffic to your published app'
          },
          {
            type: 'TXT',
            name: `_rantir-verify.${normalizedDomain}`,
            value: verificationToken,
            purpose: 'Verifies domain ownership'
          }
        ],
        note: 'Add these DNS records at your domain registrar. Verification may take up to 48 hours for DNS propagation.'
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Verify a custom domain's DNS configuration
 */
async function verifyCustomDomain(domain: string, publishedAppId: string) {
  try {
    // Get domain record
    const { data: customDomain, error } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('domain', domain)
      .eq('published_app_id', publishedAppId)
      .single();

    if (error || !customDomain) {
      return new Response(
        JSON.stringify({ error: 'Custom domain not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check DNS verification
    const dnsResult = await checkDNSRecords(domain, customDomain.verification_token);
    
    // Check Cloudflare status if configured
    let cloudflareStatus = null;
    if (CLOUDFLARE_API_TOKEN && CLOUDFLARE_ZONE_ID) {
      cloudflareStatus = await getCloudflareHostnameStatus(domain);
    }

    // Determine overall status
    const isVerified = dnsResult.cnameVerified && dnsResult.txtVerified;
    const sslStatus = cloudflareStatus?.ssl_status || (isVerified ? 'provisioning' : 'pending');

    // Update domain status
    const { data: updatedDomain, error: updateError } = await supabase
      .from('custom_domains')
      .update({
        dns_verified: isVerified,
        verification_status: isVerified ? 'verified' : 'pending',
        ssl_status: sslStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', customDomain.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // If verified, update the published app with custom domain
    if (isVerified) {
      await supabase
        .from('published_apps')
        .update({ 
          custom_domain: domain,
          updated_at: new Date().toISOString()
        })
        .eq('id', customDomain.published_app_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: isVerified,
        customDomain: updatedDomain,
        dnsStatus: dnsResult,
        cloudflareStatus,
        message: isVerified 
          ? 'Domain verified successfully! SSL is being provisioned.'
          : `Domain verification pending. CNAME: ${dnsResult.cnameVerified ? '✓' : '✗'}, TXT: ${dnsResult.txtVerified ? '✓' : '✗'}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Domain verification error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Verification failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Remove a custom domain from a published app
 */
async function removeCustomDomain(publishedAppId: string, domain: string) {
  // Remove from Cloudflare if configured
  if (CLOUDFLARE_API_TOKEN && CLOUDFLARE_ZONE_ID) {
    await removeCloudflareHostname(domain);
  }

  // Remove custom domain from published app
  await supabase
    .from('published_apps')
    .update({ 
      custom_domain: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', publishedAppId);

  // Delete custom domain record
  const { error } = await supabase
    .from('custom_domains')
    .delete()
    .eq('published_app_id', publishedAppId)
    .eq('domain', domain);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Custom domain removed successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Check domain status without modifying anything
 */
async function checkDomainStatus(domain: string) {
  const { data: customDomain } = await supabase
    .from('custom_domains')
    .select('*')
    .eq('domain', domain)
    .maybeSingle();

  if (!customDomain) {
    return new Response(
      JSON.stringify({ exists: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      exists: true,
      status: customDomain.verification_status,
      dns_verified: customDomain.dns_verified,
      ssl_status: customDomain.ssl_status
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Check DNS records for a domain
 * Always checks CNAME record pointing to rantir.cloud
 */
async function checkDNSRecords(domain: string, verificationToken: string): Promise<{
  cnameVerified: boolean;
  txtVerified: boolean;
  cnameValue: string | null;
  txtValue: string | null;
}> {
  let cnameVerified = false;
  let txtVerified = false;
  let cnameValue: string | null = null;
  let txtValue: string | null = null;

  try {
    // Check CNAME record - all domains should point to rantir.cloud
    const cnameResponse = await fetch(`https://dns.google/resolve?name=${domain}&type=CNAME`);
    const cnameData = await cnameResponse.json();
    
    if (cnameData.Answer) {
      for (const record of cnameData.Answer) {
        const target = record.data?.toLowerCase().replace(/\.$/, '');
        cnameValue = target;
        if (target === 'rantir.cloud' || target?.endsWith('.rantir.cloud')) {
          cnameVerified = true;
          break;
        }
      }
    }
    console.log(`DNS check for ${domain}: CNAME=${cnameVerified} (${cnameValue})`);
  } catch (error) {
    console.error('DNS lookup failed:', error);
  }

  try {
    // Check TXT record for verification
    const txtResponse = await fetch(`https://dns.google/resolve?name=_rantir-verify.${domain}&type=TXT`);
    const txtData = await txtResponse.json();
    
    if (txtData.Answer) {
      for (const record of txtData.Answer) {
        const value = record.data?.replace(/"/g, '');
        txtValue = value;
        if (value === verificationToken) {
          txtVerified = true;
          break;
        }
      }
    }
    console.log(`DNS check for ${domain}: TXT=${txtVerified} (found: ${txtValue}, expected: ${verificationToken})`);
  } catch (error) {
    console.error('TXT lookup failed:', error);
  }
  
  return { cnameVerified, txtVerified, cnameValue, txtValue };
}

// ============================================
// Cloudflare for Platforms Integration
// ============================================

/**
 * Add a custom hostname to Cloudflare for Platforms
 */
async function addCloudflareHostname(domain: string): Promise<CloudflareDomainResult> {
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ZONE_ID) {
    console.log('Cloudflare not configured, skipping hostname provisioning');
    return { success: false, error: 'Cloudflare not configured' };
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/custom_hostnames`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hostname: domain,
          ssl: {
            method: 'http',
            type: 'dv',
            settings: {
              min_tls_version: '1.2',
              http2: 'on'
            }
          }
        })
      }
    );

    const data = await response.json();
    
    if (!data.success) {
      const errorCode = data.errors?.[0]?.code;
      const errorMessage = data.errors?.[0]?.message || 'Failed to add hostname to Cloudflare';
      
      // Error 1404 = No SSL for SaaS quota (requires Enterprise plan)
      // Gracefully handle this - domain can still work via manual DNS + Cloudflare Worker proxy
      if (errorCode === 1404) {
        console.log('Cloudflare SSL for SaaS not available (Enterprise feature), proceeding without automatic SSL provisioning');
        return { 
          success: false, 
          error: 'SSL for SaaS requires Cloudflare Enterprise. Domain will work via manual DNS setup.' 
        };
      }
      
      console.error('Cloudflare hostname creation failed:', data.errors);
      return { success: false, error: errorMessage };
    }

    return {
      success: true,
      hostname: data.result.hostname,
      ssl_status: data.result.ssl?.status || 'pending',
      verification_status: data.result.status
    };
  } catch (error) {
    console.error('Cloudflare API error:', error);
    return { success: false, error: 'Cloudflare API error' };
  }
}

/**
 * Get the status of a custom hostname in Cloudflare
 */
async function getCloudflareHostnameStatus(domain: string): Promise<CloudflareDomainResult | null> {
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ZONE_ID) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/custom_hostnames?hostname=${domain}`,
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        }
      }
    );

    const data = await response.json();
    
    if (!data.success || !data.result?.length) {
      return null;
    }

    const hostname = data.result[0];
    return {
      success: true,
      hostname: hostname.hostname,
      ssl_status: hostname.ssl?.status || 'pending',
      verification_status: hostname.status
    };
  } catch (error) {
    console.error('Cloudflare status check error:', error);
    return null;
  }
}

/**
 * Remove a custom hostname from Cloudflare
 */
async function removeCloudflareHostname(domain: string): Promise<boolean> {
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ZONE_ID) {
    return false;
  }

  try {
    // First, find the hostname ID
    const listResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/custom_hostnames?hostname=${domain}`,
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        }
      }
    );

    const listData = await listResponse.json();
    
    if (!listData.success || !listData.result?.length) {
      return true; // Already removed
    }

    const hostnameId = listData.result[0].id;

    // Delete the hostname
    const deleteResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/custom_hostnames/${hostnameId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        }
      }
    );

    const deleteData = await deleteResponse.json();
    return deleteData.success;
  } catch (error) {
    console.error('Cloudflare hostname removal error:', error);
    return false;
  }
}