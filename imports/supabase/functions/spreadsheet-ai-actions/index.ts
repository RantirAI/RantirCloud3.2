import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TableField {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  options?: string[];
  description?: string;
}

// Helper to generate fake data based on field type
function generateFakeValue(field: TableField, index: number): any {
  const { name, type, options } = field;
  const nameLower = name.toLowerCase();
  
  switch (type) {
    case 'number':
      if (nameLower.includes('price') || nameLower.includes('cost') || nameLower.includes('amount')) {
        return Math.floor(Math.random() * 1000) + 10;
      }
      if (nameLower.includes('quantity') || nameLower.includes('stock') || nameLower.includes('count')) {
        return Math.floor(Math.random() * 100) + 1;
      }
      return Math.floor(Math.random() * 1000);
    case 'checkbox':
      return Math.random() > 0.3;
    case 'select':
      if (options && options.length > 0) {
        return options[Math.floor(Math.random() * options.length)];
      }
      return null;
    case 'date':
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 365));
      return date.toISOString().split('T')[0];
    case 'email':
      return `user${index + 1}@example.com`;
    case 'url':
      return `https://example.com/item-${index + 1}`;
    default: // text
      if (nameLower.includes('name') || nameLower.includes('title') || nameLower.includes('product')) {
        const adjectives = ['Premium', 'Deluxe', 'Standard', 'Pro', 'Ultra', 'Basic', 'Advanced', 'Classic'];
        const nouns = ['Widget', 'Gadget', 'Device', 'Tool', 'Item', 'Product', 'Component', 'Module'];
        return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]} ${index + 1}`;
      }
      if (nameLower.includes('description') || nameLower.includes('desc')) {
        return `Description for item ${index + 1}. This is a sample description.`;
      }
      if (nameLower.includes('sku') || nameLower.includes('code') || nameLower.includes('id')) {
        return `SKU-${String(index + 1).padStart(5, '0')}`;
      }
      if (nameLower.includes('category') || nameLower.includes('type')) {
        const categories = ['Electronics', 'Clothing', 'Food', 'Home', 'Sports', 'Books', 'Toys'];
        return categories[Math.floor(Math.random() * categories.length)];
      }
      return `Value ${index + 1}`;
  }
}

// Generate a 5-digit sequential numeric ID with random start
function generateRecordId(existingRecords?: any[]): string {
  if (existingRecords && existingRecords.length > 0) {
    // Find the highest numeric ID and increment
    const numericIds = existingRecords
      .map(r => parseInt(r.id, 10))
      .filter(id => !isNaN(id) && id >= 10000 && id <= 99999);
    
    if (numericIds.length > 0) {
      const nextId = Math.max(...numericIds) + 1;
      return String(nextId);
    }
  }
  
  // No existing records or no valid IDs - generate random start between 10000-89999
  const randomStart = Math.floor(Math.random() * 80000) + 10000;
  return String(randomStart);
}

// Generate a complete record based on schema
function generateRecord(fields: TableField[], index: number): Record<string, any> {
  // First generate the data to extract content
  const tempRecord: Record<string, any> = {};
  for (const field of fields) {
    if (field.name.toLowerCase() === 'id') continue;
    tempRecord[field.name] = generateFakeValue(field, index);
  }
  
  // Now create the final record with a content-based ID
  const record: Record<string, any> = {
    id: generateRecordId(tempRecord)
  };
  
  // Copy the generated values
  for (const [key, value] of Object.entries(tempRecord)) {
    record[key] = value;
  }
  
  for (const field of fields) {
    if (field.name.toLowerCase() === 'id') continue;
    record[field.name] = generateFakeValue(field, index);
  }
  
  return record;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      tableProjectId, 
      tableSchema, 
      tableData,
      allRecordIds = [], // Full list of record IDs for delete operations
      tableName,
      conversationHistory = []
    } = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build comprehensive system prompt
    const schemaDescription = tableSchema.fields.map((f: TableField) => {
      let desc = `- ${f.name} (${f.type}${f.required ? ', required' : ''})`;
      if (f.options && f.options.length > 0) {
        desc += ` [options: ${f.options.join(', ')}]`;
      }
      return desc;
    }).join('\n');

    const sampleData = tableData.slice(0, 5);
    const recordCount = tableData.length;

    // Build example record based on schema
    const exampleRecord: Record<string, any> = {};
    for (const field of tableSchema.fields) {
      if (field.name.toLowerCase() === 'id') continue;
      switch (field.type) {
        case 'number':
          exampleRecord[field.name] = 100;
          break;
        case 'checkbox':
          exampleRecord[field.name] = true;
          break;
        case 'select':
          exampleRecord[field.name] = field.options?.[0] || 'option1';
          break;
        default:
          exampleRecord[field.name] = `Example ${field.name}`;
      }
    }

    // Build record ID reference for AI
    const recordIdList = allRecordIds.length > 0 
      ? allRecordIds.slice(0, 200).map((id: string, i: number) => `${i + 1}. ${id}`).join('\n')
      : tableData.slice(0, 100).map((r: any, i: number) => `${i + 1}. ${r.id}`).join('\n');

    const systemPrompt = `You are a powerful spreadsheet assistant with FULL editing capabilities for the table "${tableName}".

CURRENT TABLE SCHEMA:
${schemaDescription}

RECORD COUNT: ${recordCount} records
SAMPLE DATA (first 5 records):
${JSON.stringify(sampleData, null, 2)}

ALL RECORD IDs (use these for update/delete operations):
${recordIdList}
${allRecordIds.length > 200 ? `... and ${allRecordIds.length - 200} more records` : ''}

You have access to the following tools to modify the spreadsheet:

1. add_record - Add a single new row with field values
2. add_records - Add multiple rows at once  
3. update_record - Update specific cells in a single row by ID
4. update_records - Bulk update multiple rows matching a condition
5. delete_record - Delete a single row by ID
6. delete_records - Delete multiple rows by IDs or matching a condition
7. add_column - Add a new column to the schema
8. add_columns - Add multiple columns at once (bulk column creation)
9. update_column - Modify an existing column (rename, change type, update options)
10. delete_column - Remove a column from the schema
11. populate_column - Fill values for a column across all existing records
12. clear_data - Remove all records but keep the schema

RECORD ID GENERATION (CRITICAL):
- Every record MUST have a unique 5-digit numeric ID
- Format: Exactly 5 digits (e.g., "10001", "45232", "78433")
- Start from a random base between 10000-89999 for new tables
- Continue sequentially from highest existing ID
- DO NOT always start from 00001 - that's predictable
- Examples: "10001", "10002", "34521", "78432"

CORRECT ID examples:
- "10001", "10002", "10003" ✓
- "45231", "45232", "45233" ✓
- "78432", "78433", "78434" ✓

WRONG ID examples:
- "00001", "00002" ❌ (predictable, starts with 0)
- "001" ❌ (only 3 digits)
- "a7k2m" ❌ (contains letters)
- "rec-x7k" ❌ (contains letters)
- "550e8400-e29b..." ❌ (UUID)

CRITICAL RULES FOR DATA GENERATION:
- When asked to add records/rows, you MUST include the "records" array with complete record objects
- Each record MUST include all required fields from the schema
- Field names must match EXACTLY as defined in the schema (case-sensitive)
- Generate realistic, varied data appropriate for each field type
- For "add_record", use the "record" field (singular object)
- For "add_records", use the "records" field (array of objects)
- DO NOT just return a message - you MUST return the actual data

USER-PROVIDED DATA HANDLING (CRITICAL):
When user provides SPECIFIC VALUES in their request, extract and use them EXACTLY:
- If user provides IDs → Include them in the record as-is (e.g., {"id": "100", ...})
- If user provides data without IDs → Omit id field (system generates 5-digit IDs: 45231, 45232, etc.)
- DO NOT generate fake/sample data when user has provided real values
- DO NOT modify or "improve" user-provided values - use them exactly as given
- Preserve all user data including numbers, names, dates, status values exactly

USER ID EXAMPLES:
- "add record: id=100, name=John, email=john@test.com" → record: {"id": "100", "name": "John", "email": "john@test.com"}
- "add 3 products: iPhone, MacBook, iPad" → records: [{"name": "iPhone"}, {"name": "MacBook"}, {"name": "iPad"}] (NO id field)

EXAMPLE for add_record (single record):
{
  "record": ${JSON.stringify(exampleRecord)},
  "message": "Added 1 new record"
}

EXAMPLE for add_records (multiple records):
{
  "records": [
    ${JSON.stringify(exampleRecord)},
    ${JSON.stringify({ ...exampleRecord, [tableSchema.fields.find((f: TableField) => f.name.toLowerCase().includes('name'))?.name || 'name']: 'Another Example' })}
  ],
  "message": "Added 2 new records"
}

RECORD ID MATCHING:
- When user references a specific record (e.g., "update mastering-smash-x7k" or "record xyz-abc"), find the EXACT ID match from the list above
- For partial matches, search through the record IDs and sample data to find the best match
- Always verify the record ID exists before updating/deleting
- If multiple records could match, list them and ask for clarification

BULK COLUMN OPERATIONS:
- Use add_columns when user asks for multiple columns (e.g., "add columns for Name, Price, and Stock")
- Use populate_column to fill in values for a SINGLE column across ALL existing records
- Use populate_columns (PLURAL) to fill in values for MULTIPLE columns at once - THIS IS CRITICAL!
- Combine add_columns + populate_columns when user wants new columns WITH data

MULTI-COLUMN POPULATION (CRITICAL - READ CAREFULLY):
When user asks to populate "multiple columns", "all columns", "these 3 columns", "the other columns", "add data to all columns":
→ You MUST use populate_columns (PLURAL) with ALL columns in a SINGLE call
→ NEVER use multiple populate_column (singular) calls - only the first one will be executed!

Examples:
- "populate all 3 columns" → Use populate_columns with columns: [{columnName: "Col1", strategy: "generate"}, {columnName: "Col2", strategy: "generate"}, {columnName: "Col3", strategy: "generate"}]
- "add data to the other columns" → Identify which columns are empty and use populate_columns with ALL of them
- "fill in Name, Price, and Stock" → Use populate_columns with all 3 columns in one call

WRONG (will only populate ONE column):
- Calling populate_column 3 times separately ❌

CORRECT (will populate ALL columns):
- Calling populate_columns once with all 3 columns ✅

COMBINED OPERATIONS (CRITICAL - MOST IMPORTANT):
When user asks to create columns AND data together (e.g., "add columns and data", "create a products table with sample data", "implement columns and records", "add fields with sample records"):
→ Use the "setup_table" tool to add columns AND generate records in ONE call
→ DO NOT use separate add_columns and add_records calls - only the first will execute!
→ The setup_table tool handles BOTH operations in a single request

Example prompts requiring setup_table:
- "Create a BlogPosts table with Title, Author, Date columns and 10 sample posts" → setup_table with 3 columns + recordCount: 10
- "Add columns for Name, Price, Stock and some sample products" → setup_table with 3 columns + recordCount: 5
- "Add columns and data" → setup_table with appropriate columns + records/recordCount
- "Implement columns and generate fake data" → setup_table

IMPORTANT RULES:
- For add_record/add_records: Include all required fields. Use field names as keys.
- For update_record: Specify the recordId and only the fields to update.
- For update_records: Describe the condition and what to update. ALWAYS include recordIds array.
- For column operations: Column names should be unique and descriptive.
- For COMBINED operations (columns + data): ALWAYS use setup_table, never call separate tools.

BULK UPDATE WITH UNIQUE VALUES PER RECORD (CRITICAL):
When user wants to update records with DIFFERENT values for each record (e.g., "use real IDs", "add realistic names to each row", "update to use real data"):
→ Use update_records with "recordUpdates" array instead of "updates" object
→ Each entry must have: { "id": "record-id", "updates": { "field": "new-value" } }
→ Generate the actual new values for each record - DO NOT return empty updates!

Example: "update all records to have realistic phone models"
→ Use recordUpdates: [
     { "id": "sample-id-1", "updates": { "model": "iPhone 15 Pro Max" } },
     { "id": "sample-id-2", "updates": { "model": "Samsung Galaxy S24" } },
     ...
   ]

WRONG: Returning updates: {} (empty object) - this does nothing!
CORRECT: Returning recordUpdates with actual values for each record.
- Always explain what you're about to do before executing.

DELETE OPERATIONS - CONFIRMATION FLOW (CRITICAL):
When a user asks to delete something, you MUST:
1. Call the appropriate delete tool (delete_record, delete_records, delete_column, clear_data)
2. Set confirmationRequired = true ALWAYS for delete operations
3. Your message MUST be a confirmation question, NOT a statement that you're deleting.

CORRECT message format for delete operations:
- "⚠️ Are you sure you want to delete the 'Product Category' column? This will remove the column and all its data. Reply 'yes' to confirm."
- "⚠️ Are you sure you want to delete record 'mastering-smash-x7k'? Reply 'yes' to confirm."
- "⚠️ Are you sure you want to delete 5 records? Reply 'yes' to confirm."
- "⚠️ Are you sure you want to clear all data? This will delete ${recordCount} records. Reply 'yes' to confirm."

WRONG message format (NEVER use these):
- "Deleting..." ❌
- "I'll delete the column now" ❌
- "Removing the records..." ❌

The user must explicitly confirm with "yes", "confirm", "proceed", etc. before the action is executed.

When the user asks to modify data, use the appropriate tool. If they're just asking questions about the data, respond conversationally without using tools.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "add_record",
          description: "Add a single new record/row to the table. MUST include the 'record' field with all data.",
          parameters: {
            type: "object",
            properties: {
              record: {
                type: "object",
                description: "The complete record data with field names as keys. REQUIRED - must contain actual field values."
              },
              message: {
                type: "string",
                description: "A message explaining what was added"
              }
            },
            required: ["record", "message"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "add_records",
          description: "Add multiple records/rows to the table at once. MUST include the 'records' array with all record data.",
          parameters: {
            type: "object",
            properties: {
              records: {
                type: "array",
                items: { type: "object" },
                description: "Array of complete records to add. REQUIRED - each record must contain actual field values."
              },
              message: {
                type: "string",
                description: "A message explaining what was added"
              }
            },
            required: ["records", "message"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_record",
          description: "Update a single record by its ID",
          parameters: {
            type: "object",
            properties: {
              recordId: {
                type: "string",
                description: "The ID of the record to update"
              },
              updates: {
                type: "object",
                description: "The fields to update with new values"
              },
              message: {
                type: "string",
                description: "A message explaining what was updated"
              }
            },
            required: ["recordId", "updates", "message"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_records",
          description: "Update multiple records. Use 'updates' for SAME value across all records, or 'recordUpdates' for UNIQUE values per record.",
          parameters: {
            type: "object",
            properties: {
              condition: {
                type: "string",
                description: "Description of which records to update"
              },
              updates: {
                type: "object",
                description: "Fields to update with the SAME values for all matched records"
              },
              recordUpdates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "Record ID to update" },
                    updates: { type: "object", description: "Fields to update for this specific record" }
                  },
                  required: ["id", "updates"]
                },
                description: "Array of per-record updates when each record needs UNIQUE values. Use this for bulk data transformation with different values per record."
              },
              affectedCount: {
                type: "number",
                description: "Number of records that will be affected"
              },
              recordIds: {
                type: "array",
                items: { type: "string" },
                description: "IDs of records to update"
              },
              message: {
                type: "string",
                description: "A message explaining what will be updated"
              },
              confirmationRequired: {
                type: "boolean",
                description: "Whether user confirmation is needed (true for bulk updates)"
              }
            },
            required: ["condition", "affectedCount", "message"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_record",
          description: "Delete a single record by its ID. Your message MUST be a confirmation question like: '⚠️ Are you sure you want to delete record [ID]? Reply yes to confirm.'",
          parameters: {
            type: "object",
            properties: {
              recordId: {
                type: "string",
                description: "The ID of the record to delete"
              },
              message: {
                type: "string",
                description: "A CONFIRMATION QUESTION asking if user wants to proceed. Format: '⚠️ Are you sure you want to delete record [ID]? Reply yes to confirm.'"
              },
              confirmationRequired: {
                type: "boolean",
                description: "ALWAYS set to true for delete operations"
              }
            },
            required: ["recordId", "message", "confirmationRequired"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_records",
          description: "Delete multiple records by IDs or matching a condition. Your message MUST be a confirmation question.",
          parameters: {
            type: "object",
            properties: {
              condition: {
                type: "string",
                description: "Description of which records to delete"
              },
              recordIds: {
                type: "array",
                items: { type: "string" },
                description: "IDs of records to delete"
              },
              affectedCount: {
                type: "number",
                description: "Number of records that will be deleted"
              },
              message: {
                type: "string",
                description: "A CONFIRMATION QUESTION asking if user wants to proceed. Format: '⚠️ Are you sure you want to delete [count] records? Reply yes to confirm.'"
              },
              confirmationRequired: {
                type: "boolean",
                description: "ALWAYS set to true for delete operations"
              }
            },
            required: ["recordIds", "affectedCount", "message", "confirmationRequired"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "add_column",
          description: "Add a new column/field to the table schema",
          parameters: {
            type: "object",
            properties: {
              column: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Column name" },
                  type: { type: "string", enum: ["text", "number", "date", "select", "checkbox", "url", "email"], description: "Column type" },
                  required: { type: "boolean", description: "Whether the field is required" },
                  options: { type: "array", items: { type: "string" }, description: "Options for select type" }
                },
                required: ["name", "type"]
              },
              message: {
                type: "string",
                description: "A message explaining what column was added"
              }
            },
            required: ["column", "message"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "add_columns",
          description: "Add multiple columns/fields to the table schema at once. Use this when user asks for multiple columns.",
          parameters: {
            type: "object",
            properties: {
              columns: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Column name" },
                    type: { type: "string", enum: ["text", "number", "date", "select", "checkbox", "url", "email"], description: "Column type" },
                    required: { type: "boolean", description: "Whether the field is required" },
                    options: { type: "array", items: { type: "string" }, description: "Options for select type" }
                  },
                  required: ["name", "type"]
                },
                description: "Array of column definitions to add"
              },
              message: {
                type: "string",
                description: "A message explaining what columns were added"
              }
            },
            required: ["columns", "message"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "populate_column",
          description: "Fill in values for a SINGLE column across all existing records. Only use for ONE column at a time. For multiple columns, use populate_columns instead.",
          parameters: {
            type: "object",
            properties: {
              columnName: {
                type: "string",
                description: "The name of the column to populate"
              },
              strategy: {
                type: "string",
                enum: ["generate", "fixed", "copy", "sequence"],
                description: "How to generate values: 'generate' for AI-generated values, 'fixed' for same value, 'copy' from another column, 'sequence' for numbered values"
              },
              value: {
                type: "string",
                description: "For 'fixed' strategy: the value to set. For 'generate': description of what to generate. For 'sequence': the prefix (e.g., 'Item-' becomes Item-1, Item-2)"
              },
              sourceColumn: {
                type: "string",
                description: "For 'copy' strategy: the column to copy from"
              },
              generatedValues: {
                type: "array",
                items: { type: "object" },
                description: "Pre-generated values for each record. Array of { recordId: string, value: any }"
              },
              message: {
                type: "string",
                description: "A message explaining what was populated"
              }
            },
            required: ["columnName", "strategy", "message"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "populate_columns",
          description: "Fill in values for MULTIPLE columns at once across all existing records. ALWAYS use this instead of populate_column when user asks to populate 2+ columns (e.g., 'populate all columns', 'add data to these 3 columns', 'fill in the other columns').",
          parameters: {
            type: "object",
            properties: {
              columns: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    columnName: { type: "string", description: "The name of the column to populate" },
                    strategy: { type: "string", enum: ["generate", "fixed", "copy", "sequence"], description: "How to generate values" },
                    value: { type: "string", description: "Value for fixed/sequence strategy or description for generate" },
                    sourceColumn: { type: "string", description: "For copy strategy: column to copy from" }
                  },
                  required: ["columnName", "strategy"]
                },
                description: "Array of columns to populate with their strategies. MUST include ALL columns user wants populated."
              },
              message: {
                type: "string",
                description: "A message explaining what columns were populated"
              }
            },
            required: ["columns", "message"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_column",
          description: "Update an existing column (rename, change type, modify options)",
          parameters: {
            type: "object",
            properties: {
              columnName: {
                type: "string",
                description: "The current name of the column to update"
              },
              updates: {
                type: "object",
                properties: {
                  name: { type: "string", description: "New column name" },
                  type: { type: "string", description: "New column type" },
                  required: { type: "boolean", description: "Whether the field is required" },
                  options: { type: "array", items: { type: "string" }, description: "Updated options for select type" }
                }
              },
              message: {
                type: "string",
                description: "A message explaining what was updated"
              }
            },
            required: ["columnName", "updates", "message"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_column",
          description: "Delete a column from the schema (this will remove data in that column). Your message MUST be a confirmation question.",
          parameters: {
            type: "object",
            properties: {
              columnName: {
                type: "string",
                description: "The name of the column to delete"
              },
              message: {
                type: "string",
                description: "A CONFIRMATION QUESTION asking if user wants to proceed. Format: '⚠️ Are you sure you want to delete the [column name] column? This will remove all data in this column. Reply yes to confirm.'"
              },
              confirmationRequired: {
                type: "boolean",
                description: "ALWAYS set to true for delete operations"
              }
            },
            required: ["columnName", "message", "confirmationRequired"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "clear_data",
          description: "Remove all records from the table (keeps schema intact)",
          parameters: {
            type: "object",
            properties: {
              affectedCount: {
                type: "number",
                description: "Number of records that will be deleted"
              },
              message: {
                type: "string",
                description: "A message explaining the action"
              },
              confirmationRequired: {
                type: "boolean",
                description: "Always true for this operation"
              }
            },
            required: ["affectedCount", "message", "confirmationRequired"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "setup_table",
          description: "COMBINED operation: Add columns AND generate sample records in a SINGLE call. Use this when user asks to create table structure WITH data (e.g., 'add columns and data', 'create columns with sample records', 'implement fields and generate fake data'). This is the ONLY way to handle combined column+data requests.",
          parameters: {
            type: "object",
            properties: {
              columns: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Column name" },
                    type: { type: "string", enum: ["text", "number", "date", "select", "checkbox", "url", "email"], description: "Column type" },
                    required: { type: "boolean", description: "Whether the field is required" },
                    options: { type: "array", items: { type: "string" }, description: "Options for select type" }
                  },
                  required: ["name", "type"]
                },
                description: "Columns to add to the table"
              },
              records: {
                type: "array",
                items: { type: "object" },
                description: "Optional: Pre-generated sample records to add. If not provided, records will be auto-generated based on recordCount."
              },
              recordCount: {
                type: "number",
                description: "Number of sample records to generate if records array not provided. Default: 5"
              },
              message: {
                type: "string",
                description: "Message explaining what was created (e.g., 'Added 3 columns and 10 sample records')"
              }
            },
            required: ["columns", "message"]
          }
        }
      }
    ];

    // Build messages array with conversation history
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    console.log('Calling OpenAI with tools for spreadsheet actions');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        tools,
        tool_choice: 'auto',
        max_completion_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    console.log('OpenAI response:', JSON.stringify(choice, null, 2));

    // Check if the model wants to call a tool
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      const functionName = toolCall.function.name;
      let functionArgs: any;
      
      try {
        functionArgs = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        // JSON parse failed - likely truncated response from OpenAI
        console.error('Failed to parse tool arguments:', toolCall.function.arguments?.substring(0, 500));
        console.log('Attempting to recover from truncated response...');
        
        // Check if it looks like a truncated add_records response
        if (functionName === 'add_records' && toolCall.function.arguments?.includes('"records"')) {
          // Extract count from original message and generate data locally
          const countMatch = message.match(/(\d+)\s*(fake|sample|test|new)?\s*(records?|rows?|products?|items?)/i);
          const count = countMatch ? Math.min(parseInt(countMatch[1], 10), 100) : 10;
          
          console.log(`Recovering: Generating ${count} records locally due to truncated AI response`);
          
          const generatedRecords: any[] = [];
          for (let i = 0; i < count; i++) {
            generatedRecords.push(generateRecord(tableSchema.fields, tableData.length + i));
          }
          
          functionArgs = {
            records: generatedRecords,
            message: `Added ${count} records (generated locally due to response size limits)`
          };
        } else if (functionName === 'add_record') {
          // Generate a single record
          console.log('Recovering: Generating 1 record locally');
          functionArgs = {
            record: generateRecord(tableSchema.fields, tableData.length),
            message: 'Added 1 record (generated locally)'
          };
        } else {
          // For other operations, we can't recover - throw the error
          throw new Error('AI returned invalid tool arguments - response may have been truncated. Try a smaller request.');
        }
      }

      console.log('Tool called:', functionName, JSON.stringify(functionArgs, null, 2));

      // Validate and fix the response based on action type
      let validatedResponse: any = {
        success: true,
        action: functionName,
        message: functionArgs.message || `Executed ${functionName}`,
        toolCallId: toolCall.id
      };

      // Handle add_record - ensure we have record data
      if (functionName === 'add_record') {
        // Accept either 'record' or 'data' field
        const recordData = functionArgs.record || functionArgs.data;
        
        if (!recordData || typeof recordData !== 'object' || Object.keys(recordData).length === 0) {
          // Generate a record if AI didn't provide one
          console.log('No record data provided, generating...');
          const generatedRecord = generateRecord(tableSchema.fields, tableData.length);
          validatedResponse.record = generatedRecord;
          validatedResponse.message = functionArgs.message || 'Added 1 new record with generated data';
        } else {
          // Use provided record, add ID if missing
          validatedResponse.record = {
            id: recordData.id || generateRecordId(tableData),
            ...recordData
          };
        }
      }
      
      // Handle add_records - ensure we have records array
      else if (functionName === 'add_records') {
        // Accept either 'records' or 'data' field
        let recordsData = functionArgs.records || functionArgs.data;
        
        if (!recordsData || !Array.isArray(recordsData) || recordsData.length === 0) {
          // Parse message to determine how many records to generate
          const countMatch = message.match(/(\d+)\s*(fake|sample|test|new)?\s*(records?|rows?|products?|items?)/i);
          const count = countMatch ? parseInt(countMatch[1], 10) : 5;
          
          console.log(`No records data provided, generating ${count} records...`);
          recordsData = [];
          for (let i = 0; i < count; i++) {
            recordsData.push(generateRecord(tableSchema.fields, tableData.length + i));
          }
          validatedResponse.records = recordsData;
          validatedResponse.message = functionArgs.message || `Added ${count} new records with generated data`;
        } else {
          // Ensure each record has an ID - use sequential IDs based on existing + newly added
          const allExisting = [...tableData];
          validatedResponse.records = recordsData.map((rec: any, idx: number) => {
            const newId = rec.id || generateRecordId([...allExisting, ...recordsData.slice(0, idx)]);
            return { id: newId, ...rec };
          });
        }
      }
      
      // Handle update_record
      else if (functionName === 'update_record') {
        if (!functionArgs.recordId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'update_record requires a recordId'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        validatedResponse.recordId = functionArgs.recordId;
        validatedResponse.updates = functionArgs.updates || {};
      }
      
      // Handle update_records
      else if (functionName === 'update_records') {
        validatedResponse.condition = functionArgs.condition;
        validatedResponse.updates = functionArgs.updates || {};
        
        // NEW: Handle per-record unique updates
        if (functionArgs.recordUpdates && Array.isArray(functionArgs.recordUpdates) && functionArgs.recordUpdates.length > 0) {
          validatedResponse.recordUpdates = functionArgs.recordUpdates;
          validatedResponse.affectedCount = functionArgs.recordUpdates.length;
          // Extract recordIds from recordUpdates
          validatedResponse.recordIds = functionArgs.recordUpdates.map((r: any) => r.id);
          validatedResponse.confirmationRequired = functionArgs.confirmationRequired !== false;
          console.log('[spreadsheet-ai-actions] Using recordUpdates for per-record unique values:', validatedResponse.recordUpdates.length);
        } else {
          // Original logic for uniform updates
          // If recordIds not provided but we have a condition, try to find matching records
          let recordIds = functionArgs.recordIds || [];
          
          // If no recordIds provided, try to extract them from the message or find by condition
          if ((!recordIds || recordIds.length === 0) && tableData.length > 0) {
            const conditionLower = (functionArgs.condition || '').toLowerCase();
            
            // For "all records" type conditions, return all record IDs
            if (conditionLower.includes('all') || conditionLower.includes('every')) {
              recordIds = allRecordIds.length > 0 ? allRecordIds : tableData.map((r: any) => r.id);
            } else {
              // Try to find IDs mentioned in the original message using regex pattern
              const idPattern = /[a-z]+-[a-z0-9]{3,5}|rec-[a-z0-9]+/gi;
              const mentionedIds = message.match(idPattern) || [];
              
              if (mentionedIds.length > 0) {
                // Filter to only valid IDs that exist
                const validIds = mentionedIds.filter((id: string) => 
                  allRecordIds.includes(id) || tableData.some((r: any) => r.id === id)
                );
                if (validIds.length > 0) {
                  recordIds = validIds;
                }
              }
              
              // If still no IDs, try matching by content in sample data
              if (recordIds.length === 0 && conditionLower) {
                // Look for records that match keywords in the condition
                const matchingRecords = tableData.filter((r: any) => {
                  const recordStr = JSON.stringify(r).toLowerCase();
                  // Check if any word from the condition appears in the record
                  const words = conditionLower.split(/\s+/).filter((w: string) => w.length > 3);
                  return words.some((word: string) => recordStr.includes(word));
                });
                if (matchingRecords.length > 0) {
                  recordIds = matchingRecords.map((r: any) => r.id);
                }
              }
            }
          }
          
          validatedResponse.recordIds = recordIds;
          validatedResponse.affectedCount = functionArgs.affectedCount || recordIds.length || 0;
          validatedResponse.confirmationRequired = functionArgs.confirmationRequired !== false;
          
          if (recordIds.length === 0 && (!validatedResponse.updates || Object.keys(validatedResponse.updates).length === 0)) {
            validatedResponse.message = (functionArgs.message || '') + ' (No matching records found. Please specify exact record IDs.)';
          }
        }
      }
      
      // Handle delete_record
      else if (functionName === 'delete_record') {
        if (!functionArgs.recordId) {
          // If no recordId but we can infer from the request, try to find it
          // For now, return error
          return new Response(JSON.stringify({
            success: false,
            error: 'delete_record requires a recordId. Please specify which record to delete by ID.'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        validatedResponse.recordId = functionArgs.recordId;
        validatedResponse.confirmationRequired = true;
      }
      
      // Handle delete_records
      else if (functionName === 'delete_records') {
        validatedResponse.condition = functionArgs.condition;
        
        // If recordIds not provided, try to find matching records based on condition
        let recordIds = functionArgs.recordIds || [];
        if ((!recordIds || recordIds.length === 0) && (tableData.length > 0 || allRecordIds.length > 0)) {
          const conditionLower = (functionArgs.condition || '').toLowerCase();
          // Handle common conditions - use allRecordIds for complete delete operations
          if (conditionLower.includes('all') || conditionLower.includes('every') || conditionLower.includes('clear')) {
            recordIds = allRecordIds.length > 0 ? allRecordIds : tableData.map((r: any) => r.id);
          }
        }
        
        validatedResponse.recordIds = recordIds;
        validatedResponse.affectedCount = functionArgs.affectedCount || recordIds.length || allRecordIds.length || 0;
        validatedResponse.confirmationRequired = true;
        
        if (recordIds.length === 0 && !functionArgs.recordIds) {
          validatedResponse.message = (functionArgs.message || 'Delete operation') + ' - No matching records found. Please specify record IDs or a more specific condition.';
        }
      }
      
      // Handle column operations
      else if (functionName === 'add_column') {
        if (!functionArgs.column) {
          return new Response(JSON.stringify({
            success: false,
            error: 'add_column requires a column definition'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        validatedResponse.column = functionArgs.column;
      }
      
      // Handle add_columns (bulk column creation)
      else if (functionName === 'add_columns') {
        if (!functionArgs.columns || !Array.isArray(functionArgs.columns) || functionArgs.columns.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'add_columns requires an array of column definitions'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        validatedResponse.columns = functionArgs.columns;
      }
      
      // Handle populate_column
      else if (functionName === 'populate_column') {
        if (!functionArgs.columnName) {
          return new Response(JSON.stringify({
            success: false,
            error: 'populate_column requires a columnName'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        validatedResponse.columnName = functionArgs.columnName;
        validatedResponse.strategy = functionArgs.strategy || 'generate';
        validatedResponse.value = functionArgs.value;
        validatedResponse.sourceColumn = functionArgs.sourceColumn;
        validatedResponse.generatedValues = functionArgs.generatedValues;
        validatedResponse.recordCount = recordCount;
        
        // If AI provided pre-generated values, pass them through
        if (functionArgs.generatedValues && Array.isArray(functionArgs.generatedValues)) {
          validatedResponse.generatedValues = functionArgs.generatedValues;
        }
      }
      
      // Handle populate_columns (batch population)
      else if (functionName === 'populate_columns') {
        if (!functionArgs.columns || !Array.isArray(functionArgs.columns) || functionArgs.columns.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'populate_columns requires an array of column specifications'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        validatedResponse.columns = functionArgs.columns;
        validatedResponse.recordCount = recordCount;
      }
      
      else if (functionName === 'update_column') {
        validatedResponse.columnName = functionArgs.columnName;
        validatedResponse.updates = functionArgs.updates;
      }
      
      else if (functionName === 'delete_column') {
        validatedResponse.columnName = functionArgs.columnName;
        validatedResponse.confirmationRequired = true;
      }
      
      else if (functionName === 'clear_data') {
        validatedResponse.affectedCount = functionArgs.affectedCount || recordCount;
        validatedResponse.confirmationRequired = true;
      }
      
      // Handle setup_table (combined columns + records operation)
      else if (functionName === 'setup_table') {
        if (!functionArgs.columns || !Array.isArray(functionArgs.columns) || functionArgs.columns.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'setup_table requires an array of column definitions'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        validatedResponse.columns = functionArgs.columns;
        
        // Build the new schema with existing + new columns
        const newSchema = [...(tableSchema.fields || []), ...functionArgs.columns.map((col: any) => ({
          id: crypto.randomUUID(),
          name: col.name,
          type: col.type || 'text',
          required: col.required || false,
          options: col.options
        }))];
        
        // Generate records using the new schema
        const recordCount = functionArgs.recordCount || 5;
        
        if (functionArgs.records && Array.isArray(functionArgs.records) && functionArgs.records.length > 0) {
          // Use provided records, ensure IDs
          validatedResponse.records = functionArgs.records.map((rec: any, idx: number) => ({
            id: rec.id || generateRecordId([...tableData, ...functionArgs.records.slice(0, idx)]),
            ...rec
          }));
        } else {
          // Generate records with the combined schema
          const generatedRecords: any[] = [];
          for (let i = 0; i < recordCount; i++) {
            generatedRecords.push(generateRecord(newSchema, tableData.length + i));
          }
          validatedResponse.records = generatedRecords;
        }
        
        validatedResponse.message = functionArgs.message || 
          `Added ${validatedResponse.columns.length} columns and ${validatedResponse.records.length} records`;
        
        console.log(`setup_table: Adding ${validatedResponse.columns.length} columns and ${validatedResponse.records.length} records`);
      }

      console.log('Validated response:', JSON.stringify(validatedResponse, null, 2));

      return new Response(JSON.stringify(validatedResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // No tool call, just a conversational response
    return new Response(JSON.stringify({
      success: true,
      action: null,
      message: choice.message.content
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in spreadsheet-ai-actions:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'An error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
