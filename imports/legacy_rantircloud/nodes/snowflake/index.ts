import { NodePlugin } from '@/types/node-plugin';
import { SnowflakeIcon } from '@/components/flow/icons/SnowflakeIcon';
import { supabase } from '@/integrations/supabase/client';

async function invokeSnowflake(payload: any) {
  const { data, error } = await supabase.functions.invoke('snowflake-sql', {
    body: payload,
  });
  if (error) throw new Error(error.message || 'Failed to call snowflake-sql');
  return data;
}

export const snowflakeNode: NodePlugin = {
  type: 'snowflake',
  name: 'Snowflake',
  description: 'Run queries and insert rows in Snowflake via secure edge function',
  category: 'action',
  icon: SnowflakeIcon,
  color: '#29B5E8',
  inputs: [
    {
      name: 'account',
      label: 'Account',
      type: 'text',
      required: true,
      description: 'Your Snowflake account identifier',
      isApiKey: true,
    },
    {
      name: 'operation',
      label: 'Action',
      type: 'select',
      required: true,
      default: 'query',
      options: [
        { label: 'Run Query', value: 'query', description: 'Execute a single SQL query' },
        { label: 'Multiple Queries', value: 'multiple', description: 'Execute multiple SQL queries in sequence' },
        { label: 'Insert Rows', value: 'insert', description: 'Insert data into a table' },
      ],
      description: 'Type of action to perform',
      dependsOnApiKey: true,
    },
    {
      name: 'authMethod',
      label: 'Authentication Method',
      type: 'select',
      required: true,
      default: 'password',
      options: [
        { label: 'Username/Password', value: 'password', description: 'Authenticate with username and password' },
        { label: 'Key Pair', value: 'keypair', description: 'Authenticate with private key' },
      ],
      description: 'Choose authentication method',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs(currentInputs) {
    let operation = currentInputs?.operation || 'query';
    const allowedOps = ['query', 'multiple', 'insert'];
    if (!allowedOps.includes(operation)) operation = 'query';
    
    const authMethod = currentInputs?.authMethod || 'password';
    const dynamicInputs = [];
    
    // Common fields
    dynamicInputs.push(
      { name: 'warehouse', label: 'Warehouse', type: 'text', description: 'Optional: override secret SNOWFLAKE_WAREHOUSE' }
    );

    // Auth method specific fields
    if (authMethod === 'password') {
      dynamicInputs.push(
        { name: 'username', label: 'Username', type: 'text', description: 'Optional: override secret SNOWFLAKE_USERNAME', isApiKey: true },
        { name: 'password', label: 'Password', type: 'text', description: 'Optional: override secret SNOWFLAKE_PASSWORD', isApiKey: true }
      );
    } else if (authMethod === 'keypair') {
      dynamicInputs.push(
        { name: 'username', label: 'Username', type: 'text', description: 'Optional: override secret SNOWFLAKE_USERNAME', isApiKey: true },
        { name: 'privateKey', label: 'Private Key', type: 'textarea', description: 'Optional: override secret SNOWFLAKE_PRIVATE_KEY', isApiKey: true, placeholder: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----' },
        { name: 'passphrase', label: 'Passphrase', type: 'text', description: 'Optional: override secret SNOWFLAKE_PASSPHRASE (if private key is encrypted)', isApiKey: true }
      );
    }

    // Show database selector for insert operations
    if (operation === 'insert') {
      dynamicInputs.push({
        name: 'database',
        label: 'Database',
        type: 'select',
        required: true,
        dynamic: true,
        description: 'Select database (fetched dynamically from Snowflake)',
        async dynamicOptions() {
          try {
            const res = await invokeSnowflake({ operation: 'listDatabases' });
            const list = Array.isArray(res?.results) ? res.results : [];
            return list.map((d: any) => ({ label: d.name || String(d), value: d.name || String(d) }));
          } catch (e: any) {
            console.warn('listDatabases error', e?.message);
            return [];
          }
        },
      });
    }

    // Show schema selector for insert operations  
    if (operation === 'insert') {
      dynamicInputs.push({
        name: 'schema',
        label: 'Schema',
        type: 'select',
        required: true,
        dynamic: true,
        description: 'Select schema (depends on database)',
        async dynamicOptions(_nodes, _edges, _currentNodeId, inputs) {
          if (!inputs?.database) return [];
          try {
            const res = await invokeSnowflake({ operation: 'listSchemas', database: inputs.database });
            const list = Array.isArray(res?.results) ? res.results : [];
            return list.map((s: any) => ({ label: s.name || String(s), value: s.name || String(s) }));
          } catch (e: any) {
            console.warn('listSchemas error', e?.message);
            return [];
          }
        },
      });
    }

    // Show table selector for insert operations
    if (operation === 'insert') {
      dynamicInputs.push({
        name: 'table',
        label: 'Table',
        type: 'select',
        required: true,
        dynamic: true,
        description: 'Select table (depends on database and schema)',
        async dynamicOptions(_nodes, _edges, _currentNodeId, inputs) {
          if (!inputs?.database || !inputs?.schema) return [];
          try {
            const res = await invokeSnowflake({ operation: 'listTables', database: inputs.database, schema: inputs.schema });
            const list = Array.isArray(res?.results) ? res.results : [];
            return list.map((t: any) => ({ label: t.name || String(t), value: t.name || String(t) }));
          } catch (e: any) {
            console.warn('listTables error', e?.message);
            return [];
          }
        },
      });
    }

    // Add action-specific fields
    if (operation === 'query') {
      dynamicInputs.push({
        name: 'query',
        label: 'SQL Query',
        type: 'code',
        language: 'javascript',
        required: true,
        description: 'SQL to execute for single query operation',
        placeholder: 'SELECT CURRENT_TIMESTAMP();',
      });
    } else if (operation === 'multiple') {
      dynamicInputs.push({
        name: 'queries',
        label: 'Multiple Queries',
        type: 'textarea',
        required: true,
        description: 'Multiple SQL queries separated by semicolons',
        placeholder: 'SELECT 1;\nSELECT 2;',
      });
    } else if (operation === 'insert') {
      dynamicInputs.push(
        {
          name: 'insertData',
          label: 'Insert Data (JSON Array)',
          type: 'code',
          language: 'json',
          required: true,
          description: 'Array of objects to insert into the selected table',
          placeholder: '[{"name":"Alice"},{"name":"Bob"}]',
        },
        {
          name: 'batchSize',
          label: 'Batch Size',
          type: 'number',
          default: 1000,
          description: 'Rows per insert batch',
        }
      );
    }

    return dynamicInputs;
  },
  outputs: [
    { name: 'results', type: 'array', description: 'Query results or operation details' },
    { name: 'rowCount', type: 'number', description: 'Rows returned/affected' },
    { name: 'schema', type: 'object', description: 'Schema details for selected table' },
    { name: 'metadata', type: 'object', description: 'Execution metadata' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, _context) {
    const { operation, authMethod, account, username, password, privateKey, passphrase, warehouse, database, schema, table, query, queries, insertData, batchSize = 1000 } = inputs;

    try {
      const payload: any = {
        operation,
        authMethod: authMethod || 'password',
        creds: { account, username, warehouse },
        database,
        schema,
        table,
        batchSize,
      };

      // Add auth-specific credentials
      if (authMethod === 'keypair') {
        payload.creds.privateKey = privateKey;
        payload.creds.passphrase = passphrase;
      } else {
        payload.creds.password = password;
      }

      if (operation === 'query') {
        if (!query) throw new Error('Query is required for operation=query');
        payload.query = typeof query === 'string' ? query : String(query);
      } else if (operation === 'multiple') {
        const qs = (queries || '').split(';').map((q: string) => q.trim()).filter(Boolean);
        if (qs.length === 0) throw new Error('Provide at least one SQL statement in Multiple Queries');
        payload.queries = qs;
      } else if (operation === 'insert') {
        if (!database || !schema || !table) throw new Error('Database, schema and table are required for insert');
        if (!insertData) throw new Error('Insert data is required');
        const data = typeof insertData === 'string' ? JSON.parse(insertData) : insertData;
        if (!Array.isArray(data) || data.length === 0) throw new Error('Insert data must be a non-empty array');
        payload.insertData = data;
      }

      const res = await invokeSnowflake(payload);
      if (res?.error) throw new Error(res.error);

      return {
        results: res?.results ?? [],
        rowCount: res?.rowCount ?? 0,
        schema: res?.schema ?? null,
        metadata: res?.metadata ?? {},
        error: null,
      };
    } catch (err: any) {
      return {
        results: [],
        rowCount: 0,
        schema: null,
        metadata: {},
        error: err?.message || 'Snowflake operation failed',
      };
    }
  },
};
