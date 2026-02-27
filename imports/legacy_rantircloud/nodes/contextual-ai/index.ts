import { NodePlugin } from '@/types/node-plugin';

export const contextualAiNode: NodePlugin = {
  type: 'contextual-ai',
  name: 'Contextual AI',
  description: 'AI-powered contextual understanding and RAG platform',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/contextual-ai.png',
  color: '#6366F1',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Contextual AI API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Query Agent', value: 'queryAgent' },
        { label: 'Generate', value: 'generate' },
        { label: 'Ingest Document', value: 'ingestDocument' },
        { label: 'Parse File', value: 'parseFile' },
        { label: 'Create Agent', value: 'createAgent' },
        { label: 'Invite Users', value: 'inviteUsers' },
        { label: 'Create Datastore', value: 'createDatastore' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'queryAgent') {
      inputs.push(
        { name: 'agentId', label: 'Agent ID', type: 'text' as const, required: true, description: 'The ID of the agent to query' },
        { name: 'query', label: 'Query', type: 'textarea' as const, required: true, description: 'The question or query to send to the agent' },
        { name: 'conversationId', label: 'Conversation ID', type: 'text' as const, required: false, description: 'Optional conversation ID for context continuity' },
        { name: 'retrieveStrategy', label: 'Retrieve Strategy', type: 'select' as const, required: false, options: [
          { label: 'Auto', value: 'auto' },
          { label: 'Always', value: 'always' },
          { label: 'Never', value: 'never' },
        ], description: 'When to retrieve from knowledge base' },
        { name: 'streamResponse', label: 'Stream Response', type: 'select' as const, required: false, options: [
          { label: 'No', value: 'false' },
          { label: 'Yes', value: 'true' },
        ], description: 'Whether to stream the response' }
      );
    } else if (action === 'generate') {
      inputs.push(
        { name: 'model', label: 'Model', type: 'select' as const, required: true, options: [
          { label: 'v2 (Latest)', value: 'v2' },
          { label: 'v1', value: 'v1' },
        ], description: 'Model version to use for generation' },
        { name: 'prompt', label: 'Prompt', type: 'textarea' as const, required: true, description: 'The prompt for text generation' },
        { name: 'knowledge', label: 'Knowledge Context (JSON array)', type: 'code' as const, language: 'json' as const, required: false, description: 'Array of knowledge strings for RAG context, e.g. ["context 1", "context 2"]' },
        { name: 'systemPrompt', label: 'System Prompt', type: 'textarea' as const, required: false, description: 'Optional system prompt for context' },
        { name: 'maxTokens', label: 'Max New Tokens', type: 'number' as const, required: false, description: 'Maximum tokens to generate (default: 1024)' },
        { name: 'temperature', label: 'Temperature', type: 'number' as const, required: false, description: 'Creativity level (default: 0)' },
        { name: 'topP', label: 'Top P', type: 'number' as const, required: false, description: 'Nucleus sampling (default: 0.9)' },
        { name: 'avoidCommentary', label: 'Avoid Commentary', type: 'select' as const, required: false, options: [
          { label: 'No', value: 'false' },
          { label: 'Yes', value: 'true' },
        ], description: 'Whether to avoid adding commentary to the response' }
      );
    } else if (action === 'ingestDocument') {
      inputs.push(
        { name: 'datastoreId', label: 'Datastore ID', type: 'text' as const, required: true, description: 'The datastore to ingest the document into' },
        { name: 'documentUrl', label: 'Document URL', type: 'text' as const, required: false, description: 'URL of the document to ingest' },
        { name: 'documentContent', label: 'Document Content', type: 'textarea' as const, required: false, description: 'Raw text content to ingest' },
        { name: 'documentName', label: 'Document Name', type: 'text' as const, required: false, description: 'Name for the document' },
        { name: 'metadata', label: 'Metadata (JSON)', type: 'code' as const, language: 'json' as const, required: false, description: 'Additional metadata for the document' }
      );
    } else if (action === 'parseFile') {
      inputs.push(
        { name: 'fileUrl', label: 'File URL', type: 'text' as const, required: true, description: 'URL of the file to parse (will be fetched and uploaded)' },
        { name: 'outputType', label: 'Output Type', type: 'select' as const, required: false, options: [
          { label: 'Markdown Document', value: 'markdown-document' },
          { label: 'Markdown Per Page', value: 'markdown-per-page' },
          { label: 'Blocks Per Page', value: 'blocks-per-page' },
        ], description: 'Format of the parsed output' },
        { name: 'parseMode', label: 'Parse Mode', type: 'select' as const, required: false, options: [
          { label: 'Basic (Fast)', value: 'basic' },
          { label: 'Standard (Recommended)', value: 'standard' },
        ], description: 'Parsing quality vs speed tradeoff' }
      );
    } else if (action === 'createAgent') {
      inputs.push(
        { name: 'agentName', label: 'Agent Name', type: 'text' as const, required: true, description: 'Name for the new agent' },
        { name: 'description', label: 'Description', type: 'textarea' as const, required: false, description: 'Description of the agent' },
        { name: 'datastoreIds', label: 'Datastore IDs (comma-separated)', type: 'text' as const, required: false, description: 'IDs of datastores to attach' },
        { name: 'systemPrompt', label: 'System Prompt', type: 'textarea' as const, required: false, description: 'System prompt for the agent' },
        { name: 'model', label: 'Model', type: 'text' as const, required: false, description: 'Model to use for the agent' }
      );
    } else if (action === 'inviteUsers') {
      inputs.push(
        { name: 'emails', label: 'Email Addresses (comma-separated)', type: 'textarea' as const, required: true, description: 'Email addresses to invite' },
        { name: 'role', label: 'Role', type: 'select' as const, required: true, options: [
          { label: 'Viewer', value: 'viewer' },
          { label: 'Editor', value: 'editor' },
          { label: 'Admin', value: 'admin' },
        ], description: 'Role to assign to invited users' },
        { name: 'agentIds', label: 'Agent IDs (comma-separated)', type: 'text' as const, required: false, description: 'Specific agents to grant access to' }
      );
    } else if (action === 'createDatastore') {
      inputs.push(
        { name: 'datastoreName', label: 'Datastore Name', type: 'text' as const, required: true, description: 'Name for the new datastore' },
        { name: 'description', label: 'Description', type: 'textarea' as const, required: false, description: 'Description of the datastore' },
        { name: 'embeddingModel', label: 'Embedding Model', type: 'text' as const, required: false, description: 'Embedding model to use' },
        { name: 'chunkSize', label: 'Chunk Size', type: 'number' as const, required: false, description: 'Size of document chunks' },
        { name: 'chunkOverlap', label: 'Chunk Overlap', type: 'number' as const, required: false, description: 'Overlap between chunks' }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data from Contextual AI' },
    { name: 'result', type: 'string', description: 'Generated or processed text result' },
    { name: 'agentId', type: 'string', description: 'Created agent ID' },
    { name: 'datastoreId', type: 'string', description: 'Created datastore ID' },
    { name: 'documentId', type: 'string', description: 'Ingested document ID' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('contextual-ai-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
