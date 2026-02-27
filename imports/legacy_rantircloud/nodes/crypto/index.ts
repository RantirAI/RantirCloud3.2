import { NodePlugin } from '@/types/node-plugin';

export const cryptoNode: NodePlugin = {
  type: 'crypto',
  name: 'Crypto',
  description: 'Cryptographic operations - hashing, encryption, and encoding',
  category: 'transformer',
  icon: 'https://cdn.activepieces.com/pieces/new-core/crypto.svg',
  color: '#6366F1',
  inputs: [
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Hash Text', value: 'hashText', description: 'Generate a hash of text (MD5, SHA1, SHA256, SHA512)' },
        { label: 'HMAC Signature', value: 'hmacSignature', description: 'Generate HMAC signature' },
        { label: 'Generate Password', value: 'generatePassword', description: 'Generate a secure random password' },
        { label: 'Base64 Decode', value: 'base64Decode', description: 'Decode Base64 encoded data' },
        { label: 'Base64 Encode', value: 'base64Encode', description: 'Encode data to Base64' },
        { label: 'OpenPGP Encrypt', value: 'openpgpEncrypt', description: 'Encrypt data using OpenPGP' },
      ],
      description: 'Choose the cryptographic operation',
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    if (action === 'hashText') {
      dynamicInputs.push(
        {
          name: 'algorithm',
          label: 'Algorithm',
          type: 'select',
          required: true,
          default: 'sha256',
          options: [
            { label: 'MD5', value: 'md5' },
            { label: 'SHA-1', value: 'sha1' },
            { label: 'SHA-256', value: 'sha256' },
            { label: 'SHA-384', value: 'sha384' },
            { label: 'SHA-512', value: 'sha512' },
          ],
          description: 'Hash algorithm to use',
        },
        {
          name: 'data',
          label: 'Text',
          type: 'textarea',
          required: true,
          description: 'Text to hash',
          placeholder: 'Enter text to hash...',
        },
        {
          name: 'encoding',
          label: 'Output Encoding',
          type: 'select',
          required: true,
          default: 'hex',
          options: [
            { label: 'Hexadecimal', value: 'hex' },
            { label: 'Base64', value: 'base64' },
          ],
          description: 'Output format for the hash',
        }
      );
    }

    if (action === 'hmacSignature') {
      dynamicInputs.push(
        {
          name: 'algorithm',
          label: 'Algorithm',
          type: 'select',
          required: true,
          default: 'sha256',
          options: [
            { label: 'SHA-1', value: 'sha1' },
            { label: 'SHA-256', value: 'sha256' },
            { label: 'SHA-384', value: 'sha384' },
            { label: 'SHA-512', value: 'sha512' },
          ],
          description: 'HMAC algorithm to use',
        },
        {
          name: 'data',
          label: 'Data',
          type: 'textarea',
          required: true,
          description: 'Data to sign',
          placeholder: 'Enter text to sign...',
        },
        {
          name: 'secret',
          label: 'Secret Key',
          type: 'text',
          required: true,
          description: 'Secret key for HMAC',
          isApiKey: true,
        },
        {
          name: 'encoding',
          label: 'Output Encoding',
          type: 'select',
          required: true,
          default: 'hex',
          options: [
            { label: 'Hexadecimal', value: 'hex' },
            { label: 'Base64', value: 'base64' },
          ],
          description: 'Output format for the signature',
        }
      );
    }

    if (action === 'generatePassword') {
      dynamicInputs.push(
        {
          name: 'length',
          label: 'Length',
          type: 'number',
          required: true,
          default: 16,
          description: 'Password length (8-128 characters)',
        },
        {
          name: 'includeUppercase',
          label: 'Include Uppercase',
          type: 'checkbox',
          required: false,
          default: true,
          description: 'Include uppercase letters (A-Z)',
        },
        {
          name: 'includeLowercase',
          label: 'Include Lowercase',
          type: 'checkbox',
          required: false,
          default: true,
          description: 'Include lowercase letters (a-z)',
        },
        {
          name: 'includeNumbers',
          label: 'Include Numbers',
          type: 'checkbox',
          required: false,
          default: true,
          description: 'Include numbers (0-9)',
        },
        {
          name: 'includeSymbols',
          label: 'Include Symbols',
          type: 'checkbox',
          required: false,
          default: true,
          description: 'Include special characters (!@#$%^&*)',
        }
      );
    }

    if (action === 'base64Encode' || action === 'base64Decode') {
      dynamicInputs.push({
        name: 'data',
        label: 'Data',
        type: 'textarea',
        required: true,
        description: action === 'base64Encode' ? 'Data to encode' : 'Base64 data to decode',
      });
    }

    if (action === 'openpgpEncrypt') {
      dynamicInputs.push(
        {
          name: 'data',
          label: 'Data',
          type: 'textarea',
          required: true,
          description: 'Data to encrypt',
          placeholder: 'Enter text to encrypt...',
        },
        {
          name: 'publicKey',
          label: 'Public Key (PEM)',
          type: 'code',
          language: 'plaintext',
          required: true,
          description: 'PGP public key for encryption',
          placeholder: '-----BEGIN PGP PUBLIC KEY BLOCK-----\n...\n-----END PGP PUBLIC KEY BLOCK-----',
        }
      );
    }

    return dynamicInputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'result', type: 'string', description: 'Result of the cryptographic operation' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        'https://appdmmjexevclmpyvtss.supabase.co/functions/v1/crypto-proxy',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(inputs),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        result: result.result,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        error: error.message,
      };
    }
  },
};
