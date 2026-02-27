// Provider-specific signature configurations
export const PROVIDER_CONFIGS: Record<string, { header: string; algorithm: string; prefix?: string; timestampHeader?: string }> = {
  webflow: { header: "x-webflow-signature", algorithm: "sha256", timestampHeader: "x-webflow-timestamp" },
  stripe: { header: "stripe-signature", algorithm: "stripe_v1" },
  github: { header: "x-hub-signature-256", algorithm: "sha256", prefix: "sha256=" },
  shopify: { header: "x-shopify-hmac-sha256", algorithm: "sha256" },
  generic: { header: "x-webhook-signature", algorithm: "sha256", prefix: "sha256=" },
};

// Generic HMAC-SHA256 signature verification
export async function verifyHmacSignature(
  payload: string, 
  signature: string, 
  secret: string,
  prefix: string = "sha256="
): Promise<boolean> {
  try {
    if (!signature || !secret) return false;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const expectedSignature = prefix + Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    
    // Clean up the incoming signature for comparison
    const cleanSignature = signature.startsWith(prefix) ? signature : prefix + signature;
    
    return cleanSignature === expectedSignature;
  } catch {
    return false;
  }
}

// Stripe signature verification (timestamp-based)
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string,
  toleranceSeconds: number = 300
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!signature || !secret) return { valid: false, error: "Missing signature or secret" };
    
    // Parse Stripe signature header: t=timestamp,v1=signature
    const parts = signature.split(",");
    const timestampPart = parts.find(p => p.startsWith("t="));
    const sigPart = parts.find(p => p.startsWith("v1="));
    
    if (!timestampPart || !sigPart) {
      return { valid: false, error: "Invalid Stripe signature format" };
    }
    
    const timestamp = parseInt(timestampPart.substring(2), 10);
    const sig = sigPart.substring(3);
    
    // Check timestamp tolerance
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
      return { valid: false, error: "Signature timestamp expired" };
    }
    
    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
    const expectedSig = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    
    return { valid: sig === expectedSig };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

// Webflow signature verification (uses timestamp + payload with hex encoding)
async function verifyWebflowSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp?: string,
  toleranceMs: number = 300000 // 5 minutes
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!signature || !secret) return { valid: false, error: "Missing signature or secret" };
    
    // Validate timestamp if provided (prevent replay attacks)
    if (timestamp) {
      const webhookTime = parseInt(timestamp, 10);
      const now = Date.now();
      if (isNaN(webhookTime) || Math.abs(now - webhookTime) > toleranceMs) {
        return { valid: false, error: "Webhook timestamp expired or invalid" };
      }
    }
    
    // Webflow format: timestamp + ":" + body (if timestamp provided), else just body
    const signedPayload = timestamp ? `${timestamp}:${payload}` : payload;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
    
    // Webflow uses HEX encoding, not base64!
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    
    return { valid: signature === expectedSignature };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

// GitHub signature verification
async function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const isValid = await verifyHmacSignature(payload, signature, secret, "sha256=");
    return { valid: isValid };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

// Shopify signature verification (base64)
async function verifyShopifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!signature || !secret) return { valid: false, error: "Missing signature or secret" };
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
    
    return { valid: signature === expectedSignature };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

// Main provider signature verification
export async function verifyProviderSignature(
  provider: string,
  payload: string,
  headers: Record<string, string>,
  config: {
    secret: string;
    headerName?: string;
    algorithm?: string;
    timestampTolerance?: number;
  }
): Promise<{ valid: boolean; error?: string; skipped?: boolean }> {
  if (provider === "none" || !provider) {
    return { valid: true, skipped: true };
  }
  
  const providerConfig = PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.generic;
  const headerName = config.headerName || providerConfig.header;
  const signature = headers[headerName.toLowerCase()];
  
  if (!signature) {
    return { valid: false, error: `Missing ${headerName} header` };
  }
  
  if (!config.secret) {
    return { valid: false, error: "External webhook secret not configured" };
  }
  
  switch (provider) {
    case "webflow":
      const webflowTimestamp = headers["x-webflow-timestamp"];
      return verifyWebflowSignature(payload, signature, config.secret, webflowTimestamp);
    case "stripe":
      return verifyStripeSignature(payload, signature, config.secret, config.timestampTolerance || 300);
    case "github":
      return verifyGitHubSignature(payload, signature, config.secret);
    case "shopify":
      return verifyShopifySignature(payload, signature, config.secret);
    case "generic":
    case "custom":
    default:
      const isValid = await verifyHmacSignature(payload, signature, config.secret, providerConfig.prefix || "");
      return { valid: isValid };
  }
}
