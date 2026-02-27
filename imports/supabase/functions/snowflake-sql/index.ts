import { corsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  operation: string;
  authMethod?: "password" | "keypair";
  creds?: {
    account?: string;
    username?: string;
    password?: string;
    privateKey?: string;
    passphrase?: string;
    warehouse?: string;
  };
  database?: string;
  schema?: string;
  table?: string;
  query?: string;
  queries?: string[];
  insertData?: Record<string, any>[];
  batchSize?: number;
  flowProjectId?: string;
}

function jsonResponse(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// ─── Base64url encoding ───
function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function textToBase64url(text: string): string {
  return base64url(new TextEncoder().encode(text));
}

// ─── PEM parsing helpers ───
function stripPemHeaders(pem: string): string {
  return pem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s+/g, "");
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ─── ASN.1 / PKCS#5 helpers for encrypted keys ───
function parseAsn1(data: Uint8Array, offset = 0): { tag: number; value: Uint8Array; next: number } {
  const tag = data[offset];
  let len = data[offset + 1];
  let headerLen = 2;
  if (len & 0x80) {
    const numBytes = len & 0x7f;
    len = 0;
    for (let i = 0; i < numBytes; i++) {
      len = (len << 8) | data[offset + 2 + i];
    }
    headerLen = 2 + numBytes;
  }
  return {
    tag,
    value: data.subarray(offset + headerLen, offset + headerLen + len),
    next: offset + headerLen + len,
  };
}

function parseAsn1Sequence(data: Uint8Array): Uint8Array[] {
  const items: Uint8Array[] = [];
  let offset = 0;
  while (offset < data.length) {
    const parsed = parseAsn1(data, offset);
    items.push(parsed.value);
    offset = parsed.next;
  }
  return items;
}

// OID comparison
function oidEquals(a: Uint8Array, b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Known OIDs
const OID_PBES2 = [0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x05, 0x0d]; // 1.2.840.113549.1.5.13
const OID_PBKDF2 = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x05, 0x0c]; // 1.2.840.113549.1.5.12
const OID_AES256_CBC = [0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x01, 0x2a]; // 2.16.840.1.101.3.4.1.42
const OID_AES128_CBC = [0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x01, 0x02]; // 2.16.840.1.101.3.4.1.2
const OID_HMAC_SHA256 = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x02, 0x09]; // 1.2.840.113549.2.9
const OID_HMAC_SHA1 = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x02, 0x07]; // 1.2.840.113549.2.7

async function decryptPkcs8EncryptedKey(pemData: Uint8Array, passphrase: string): Promise<ArrayBuffer> {
  // Parse outer SEQUENCE: [encryptionAlgorithm, encryptedData]
  const outer = parseAsn1(pemData, 0);
  const outerItems = parseAsn1Sequence(outer.value);

  // encryptionAlgorithm is a SEQUENCE: [algorithm OID, params]
  const algoSeq = parseAsn1(outerItems[0], 0);
  const algoItems = parseAsn1Sequence(algoSeq.value);

  // Check PBES2
  const algoOidParsed = parseAsn1(algoItems[0], 0);
  // algoItems[1] is the PBES2 params SEQUENCE: [kdf, encScheme]
  const pbes2Params = parseAsn1(algoItems[1], 0);
  const pbes2Items = parseAsn1Sequence(pbes2Params.value);

  // KDF params (PBKDF2)
  const kdfSeq = parseAsn1(pbes2Items[0], 0);
  const kdfItems = parseAsn1Sequence(kdfSeq.value);
  const kdfOid = parseAsn1(kdfItems[0], 0).value;
  const kdfParamsSeq = parseAsn1(kdfItems[1], 0);
  const kdfParams = parseAsn1Sequence(kdfParamsSeq.value);

  const salt = parseAsn1(kdfParams[0], 0).value;
  const iterations = parseAsn1(kdfParams[1], 0).value;
  const iterCount = iterations.reduce((acc, b) => (acc << 8) | b, 0);

  // Determine HMAC hash (default SHA-1 if not specified, SHA-256 if specified)
  let hmacHash = "SHA-1";
  let keyLen = 32; // default for AES-256
  if (kdfParams.length > 2) {
    // Check for key length
    const klParsed = parseAsn1(kdfParams[2], 0);
    if (klParsed.tag === 0x02) {
      // INTEGER = key length
      keyLen = klParsed.value.reduce((acc, b) => (acc << 8) | b, 0);
    }
    // Check for PRF (last param might be a SEQUENCE with HMAC OID)
    if (kdfParams.length > 3) {
      const prfSeq = parseAsn1(kdfParams[3], 0);
      const prfItems = parseAsn1Sequence(prfSeq.value);
      const prfOid = parseAsn1(prfItems[0], 0).value;
      if (oidEquals(prfOid, OID_HMAC_SHA256)) hmacHash = "SHA-256";
    } else if (klParsed.tag === 0x30) {
      // It's a SEQUENCE (PRF), not key length
      const prfItems = parseAsn1Sequence(klParsed.value);
      const prfOid = parseAsn1(prfItems[0], 0).value;
      if (oidEquals(prfOid, OID_HMAC_SHA256)) hmacHash = "SHA-256";
    }
  }

  // Encryption scheme
  const encSeq = parseAsn1(pbes2Items[1], 0);
  const encItems = parseAsn1Sequence(encSeq.value);
  const encOid = parseAsn1(encItems[0], 0).value;
  const iv = parseAsn1(encItems[1], 0).value;

  let aesLength = 256;
  if (oidEquals(encOid, OID_AES128_CBC)) aesLength = 128;

  // Encrypted data (OCTET STRING)
  const encryptedData = parseAsn1(outerItems[1], 0).value;

  // Derive key with PBKDF2
  const passphraseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: iterCount, hash: hmacHash },
    passphraseKey,
    aesLength
  );

  // Decrypt with AES-CBC
  const aesKey = await crypto.subtle.importKey(
    "raw",
    derivedBits,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );

  return await crypto.subtle.decrypt({ name: "AES-CBC", iv }, aesKey, encryptedData);
}

// ─── SHA-256 fingerprint for public key ───
async function getPublicKeyFingerprint(privateKey: CryptoKey): Promise<string> {
  const pubJwk = await crypto.subtle.exportKey("jwk", privateKey);
  // Reconstruct a minimal public key JWK
  const pubOnlyJwk = { kty: pubJwk.kty, n: pubJwk.n, e: pubJwk.e };
  const pubKey = await crypto.subtle.importKey(
    "jwk",
    pubOnlyJwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    true,
    ["verify"]
  );
  const spki = await crypto.subtle.exportKey("spki", pubKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", spki);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

// ─── Generate JWT for Snowflake key pair auth ───
async function generateSnowflakeJwt(
  account: string,
  username: string,
  privateKeyPem: string,
  passphrase?: string
): Promise<string> {
  const stripped = stripPemHeaders(privateKeyPem);
  const keyBuffer = base64ToArrayBuffer(stripped);

  let pkcs8Buffer: ArrayBuffer;

  if (privateKeyPem.includes("ENCRYPTED")) {
    if (!passphrase) throw new Error("Passphrase required for encrypted private key");
    pkcs8Buffer = await decryptPkcs8EncryptedKey(new Uint8Array(keyBuffer), passphrase);
  } else {
    pkcs8Buffer = keyBuffer;
  }

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8Buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    true,
    ["sign"]
  );

  const fingerprint = await getPublicKeyFingerprint(cryptoKey);
  const qualifiedUsername = `${account.toUpperCase()}.${username.toUpperCase()}`;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: `${qualifiedUsername}.SHA256:${fingerprint}`,
    sub: qualifiedUsername,
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = textToBase64url(JSON.stringify(header));
  const encodedPayload = textToBase64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64url(new Uint8Array(signature))}`;
}

// ─── Get Snowflake access token via password (OAuth client_credentials-like) ───
async function getSnowflakePasswordToken(
  account: string,
  username: string,
  password: string
): Promise<string> {
  // Snowflake SQL API accepts Basic auth or session token
  // Use Basic auth header directly
  const credentials = btoa(`${username}:${password}`);
  return `Basic ${credentials}`;
}

// ─── Call Snowflake SQL API v2 ───
async function callSnowflakeApi(
  account: string,
  authHeader: string,
  statement: string,
  warehouse?: string,
  database?: string,
  schema?: string
): Promise<any> {
  // Account identifier: remove .snowflakecomputing.com if present
  const accountId = account.replace(/\.snowflakecomputing\.com$/i, "");
  const baseUrl = `https://${accountId}.snowflakecomputing.com/api/v2/statements`;

  const body: any = { statement, timeout: 60 };
  if (warehouse) body.warehouse = warehouse;
  if (database) body.database = database;
  if (schema) body.schema = schema;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Snowflake-Authorization-Token-Type": authHeader.startsWith("Basic ") ? "BASIC" : "KEYPAIR_JWT",
    Authorization: authHeader.startsWith("Basic ") ? authHeader : `Bearer ${authHeader}`,
    "User-Agent": "RantirCloud/1.0",
  };

  const resp = await fetch(baseUrl, { method: "POST", headers, body: JSON.stringify(body) });
  const data = await resp.json();

  if (!resp.ok) {
    const msg = data?.message || data?.error?.message || JSON.stringify(data);
    throw new Error(`Snowflake API error (${resp.status}): ${msg}`);
  }

  return data;
}

function parseSnowflakeResponse(apiResp: any): { results: any[]; rowCount: number; metadata: any } {
  const resultSetMetaData = apiResp?.resultSetMetaData || {};
  const rowType = resultSetMetaData?.rowType || [];
  const rawData = apiResp?.data || [];

  const columns = rowType.map((col: any) => col.name);
  const results = rawData.map((row: any[]) => {
    const obj: Record<string, any> = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return obj;
  });

  return {
    results,
    rowCount: results.length,
    metadata: {
      statementHandle: apiResp?.statementHandle,
      statementStatusUrl: apiResp?.statementStatusUrl,
      numRows: resultSetMetaData?.numRows,
      partitionInfo: resultSetMetaData?.partitionInfo,
    },
  };
}

// ─── Build auth header based on method ───
async function buildAuthHeader(
  authMethod: string,
  account: string,
  username: string,
  password?: string,
  privateKey?: string,
  passphrase?: string
): Promise<string> {
  if (authMethod === "keypair") {
    if (!privateKey) throw new Error("Private key is required for key pair authentication");
    return await generateSnowflakeJwt(account, username, privateKey, passphrase);
  } else {
    if (!password) throw new Error("Password is required for password authentication");
    return await getSnowflakePasswordToken(account, username, password);
  }
}

// ─── Main handler ───
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    const { operation, database, schema, table } = body;

    const DEMO = (Deno.env.get("DEMO_SNOWFLAKE") || "true").toLowerCase() === "true";

    const authMethod = body.authMethod || "password";
    const account = body.creds?.account || Deno.env.get("SNOWFLAKE_ACCOUNT") || "";
    const username = body.creds?.username || Deno.env.get("SNOWFLAKE_USERNAME") || "";
    const warehouse = body.creds?.warehouse || Deno.env.get("SNOWFLAKE_WAREHOUSE") || "";
    const password = body.creds?.password || Deno.env.get("SNOWFLAKE_PASSWORD") || "";
    const privateKey = body.creds?.privateKey || Deno.env.get("SNOWFLAKE_PRIVATE_KEY") || "";
    const passphrase = body.creds?.passphrase || Deno.env.get("SNOWFLAKE_PASSPHRASE") || "";

    let authValid = false;
    if (authMethod === "keypair") {
      authValid = !!(account && username && privateKey);
    } else {
      authValid = !!(account && username && password);
    }

    // ─── DEMO MODE ───
    if (DEMO && !authValid) {
      switch (operation) {
        case "listDatabases":
          return jsonResponse(200, { results: [{ name: "SAMPLE_SOURCES" }, { name: "ANALYTICS" }], rowCount: 2 });
        case "listSchemas":
          if (!database) return jsonResponse(400, { error: "database required" });
          return jsonResponse(200, { results: [{ name: "PUBLIC" }, { name: "CORE" }], rowCount: 2 });
        case "listTables":
          if (!database || !schema) return jsonResponse(400, { error: "database and schema required" });
          return jsonResponse(200, { results: [{ name: "USERS" }, { name: "ORDERS" }], rowCount: 2 });
        case "schema":
          if (!database || !schema || !table) return jsonResponse(400, { error: "database, schema and table required" });
          return jsonResponse(200, {
            schema: [
              { name: "ID", type: "NUMBER" }, { name: "NAME", type: "TEXT" },
              { name: "EMAIL", type: "TEXT" }, { name: "CREATED_AT", type: "TIMESTAMP" },
            ],
            results: [
              { name: "ID", type: "NUMBER" }, { name: "NAME", type: "TEXT" },
              { name: "EMAIL", type: "TEXT" }, { name: "CREATED_AT", type: "TIMESTAMP" },
            ],
            rowCount: 4,
          });
        case "query":
          return jsonResponse(200, { results: [{ CURRENT_TIMESTAMP: new Date().toISOString() }], rowCount: 1, metadata: { demo: true } });
        case "multiple": {
          const arr = (body.queries || []).map((q, i) => ({ query: q, rows: [{ idx: i + 1 }], rowCount: 1 }));
          return jsonResponse(200, { results: arr, rowCount: arr.reduce((a, b) => a + (b.rowCount || 0), 0) });
        }
        case "insert": {
          const count = Array.isArray(body.insertData) ? body.insertData.length : 0;
          return jsonResponse(200, { results: [{ success: true, message: `Inserted ${count} rows (demo)` }], rowCount: count });
        }
        default:
          return jsonResponse(400, { error: `Unknown operation: ${operation}` });
      }
    }

    // ─── REAL MODE: validate credentials ───
    if (!authValid) {
      const requiredSecrets = authMethod === "keypair"
        ? "SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME, SNOWFLAKE_PRIVATE_KEY"
        : "SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME, SNOWFLAKE_PASSWORD";
      return jsonResponse(400, { error: `Snowflake credentials not configured for ${authMethod} auth. Provide credentials or add secrets: ${requiredSecrets}` });
    }

    const authHeader = await buildAuthHeader(authMethod, account, username, password, privateKey, passphrase);

    // ─── Handle operations ───
    switch (operation) {
      case "listDatabases": {
        const resp = await callSnowflakeApi(account, authHeader, "SHOW DATABASES", warehouse);
        const parsed = parseSnowflakeResponse(resp);
        return jsonResponse(200, {
          results: parsed.results.map((r: any) => ({ name: r.name || r.NAME || r["name"] })),
          rowCount: parsed.rowCount,
        });
      }

      case "listSchemas": {
        if (!database) return jsonResponse(400, { error: "database required" });
        const resp = await callSnowflakeApi(account, authHeader, `SHOW SCHEMAS IN DATABASE "${database}"`, warehouse, database);
        const parsed = parseSnowflakeResponse(resp);
        return jsonResponse(200, {
          results: parsed.results.map((r: any) => ({ name: r.name || r.NAME })),
          rowCount: parsed.rowCount,
        });
      }

      case "listTables": {
        if (!database || !schema) return jsonResponse(400, { error: "database and schema required" });
        const resp = await callSnowflakeApi(account, authHeader, `SHOW TABLES IN "${database}"."${schema}"`, warehouse, database, schema);
        const parsed = parseSnowflakeResponse(resp);
        return jsonResponse(200, {
          results: parsed.results.map((r: any) => ({ name: r.name || r.NAME })),
          rowCount: parsed.rowCount,
        });
      }

      case "schema": {
        if (!database || !schema || !table) return jsonResponse(400, { error: "database, schema and table required" });
        const resp = await callSnowflakeApi(account, authHeader, `DESCRIBE TABLE "${database}"."${schema}"."${table}"`, warehouse, database, schema);
        const parsed = parseSnowflakeResponse(resp);
        return jsonResponse(200, {
          schema: parsed.results.map((r: any) => ({ name: r.name || r.NAME, type: r.type || r.TYPE })),
          results: parsed.results,
          rowCount: parsed.rowCount,
        });
      }

      case "query": {
        if (!body.query) return jsonResponse(400, { error: "query is required" });
        const resp = await callSnowflakeApi(account, authHeader, body.query, warehouse, database, schema);
        const parsed = parseSnowflakeResponse(resp);
        return jsonResponse(200, parsed);
      }

      case "multiple": {
        const qs = (body.queries || []).filter(Boolean);
        if (qs.length === 0) return jsonResponse(400, { error: "Provide at least one SQL statement" });
        const allResults: any[] = [];
        let totalRows = 0;
        for (const q of qs) {
          const resp = await callSnowflakeApi(account, authHeader, q, warehouse, database, schema);
          const parsed = parseSnowflakeResponse(resp);
          allResults.push({ query: q, rows: parsed.results, rowCount: parsed.rowCount });
          totalRows += parsed.rowCount;
        }
        return jsonResponse(200, { results: allResults, rowCount: totalRows });
      }

      case "insert": {
        if (!database || !schema || !table) return jsonResponse(400, { error: "database, schema and table required for insert" });
        const data = body.insertData || [];
        if (!Array.isArray(data) || data.length === 0) return jsonResponse(400, { error: "insertData must be a non-empty array" });

        const batchSize = body.batchSize || 1000;
        const columns = Object.keys(data[0]);
        let totalInserted = 0;

        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          const valueRows = batch.map((row) => {
            const vals = columns.map((col) => {
              const v = row[col];
              if (v === null || v === undefined) return "NULL";
              if (typeof v === "number") return String(v);
              return `'${String(v).replace(/'/g, "''")}'`;
            });
            return `(${vals.join(", ")})`;
          });

          const sql = `INSERT INTO "${database}"."${schema}"."${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES ${valueRows.join(", ")}`;
          await callSnowflakeApi(account, authHeader, sql, warehouse, database, schema);
          totalInserted += batch.length;
        }

        return jsonResponse(200, {
          results: [{ success: true, message: `Inserted ${totalInserted} rows` }],
          rowCount: totalInserted,
        });
      }

      default:
        return jsonResponse(400, { error: `Unknown operation: ${operation}` });
    }
  } catch (err) {
    console.error("snowflake-sql error", err);
    return jsonResponse(500, { error: (err as Error).message || "Internal error" });
  }
});
