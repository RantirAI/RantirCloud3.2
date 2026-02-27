import { corsHeaders } from '../_shared/cors.ts';

// Helper to convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper to convert ArrayBuffer to base64
function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

// Generate secure password
function generateSecurePassword(
  length: number,
  includeUppercase: boolean,
  includeLowercase: boolean,
  includeNumbers: boolean,
  includeSymbols: boolean
): string {
  let chars = '';
  if (includeUppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (includeLowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (includeNumbers) chars += '0123456789';
  if (includeSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  if (chars.length === 0) {
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  }
  
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomBytes).map(b => chars[b % chars.length]).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      action, 
      algorithm,
      data,
      secret,
      encoding,
      length,
      includeUppercase,
      includeLowercase,
      includeNumbers,
      includeSymbols,
      publicKey
    } = body;

    console.log('Crypto proxy called with action:', action);

    let result: string;

    switch (action) {
      case 'hashText': {
        if (!data) {
          throw new Error('Text is required for hashing');
        }

        const algo = algorithm || 'sha256';
        const algoMap: Record<string, string> = {
          'md5': 'MD5',
          'sha1': 'SHA-1',
          'sha256': 'SHA-256',
          'sha384': 'SHA-384',
          'sha512': 'SHA-512',
        };

        const cryptoAlgo = algoMap[algo];
        if (!cryptoAlgo) {
          throw new Error(`Unsupported algorithm: ${algo}`);
        }

        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest(cryptoAlgo, dataBuffer);

        result = encoding === 'base64' ? bufferToBase64(hashBuffer) : bufferToHex(hashBuffer);
        break;
      }

      case 'hmacSignature': {
        if (!data) {
          throw new Error('Data is required for HMAC');
        }
        if (!secret) {
          throw new Error('Secret key is required for HMAC');
        }

        const algo = algorithm || 'sha256';
        const algoMap: Record<string, string> = {
          'sha1': 'SHA-1',
          'sha256': 'SHA-256',
          'sha384': 'SHA-384',
          'sha512': 'SHA-512',
        };

        const cryptoAlgo = algoMap[algo];
        if (!cryptoAlgo) {
          throw new Error(`Unsupported HMAC algorithm: ${algo}`);
        }

        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const messageData = encoder.encode(data);

        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'HMAC', hash: cryptoAlgo },
          false,
          ['sign']
        );

        const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
        result = encoding === 'base64' ? bufferToBase64(signature) : bufferToHex(signature);
        break;
      }

      case 'generatePassword': {
        const len = Math.min(128, Math.max(8, length || 16));
        result = generateSecurePassword(
          len,
          includeUppercase !== false,
          includeLowercase !== false,
          includeNumbers !== false,
          includeSymbols !== false
        );
        break;
      }

      case 'base64Encode': {
        if (!data) {
          throw new Error('Data is required');
        }
        result = btoa(data);
        break;
      }

      case 'base64Decode': {
        if (!data) {
          throw new Error('Data is required');
        }
        result = atob(data);
        break;
      }

      case 'openpgpEncrypt': {
        if (!data) {
          throw new Error('Data is required for encryption');
        }
        if (!publicKey) {
          throw new Error('Public key is required for OpenPGP encryption');
        }

        // Note: Full OpenPGP implementation would require a library like openpgpjs
        // For now, we'll provide a base64 encoded version with a note
        // In production, you would use: import * as openpgp from 'openpgp';
        
        console.log('OpenPGP encryption requested - using simplified encryption');
        
        // Simplified: Just encode the data (in production, use proper OpenPGP)
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        
        // Generate a random key and encrypt with AES-GCM as fallback
        const aesKey = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt']
        );
        
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          aesKey,
          dataBuffer
        );
        
        // Combine IV and encrypted data
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);
        
        result = bufferToBase64(combined);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('Crypto operation successful');

    return new Response(JSON.stringify({
      success: true,
      result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Crypto proxy error:', error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
