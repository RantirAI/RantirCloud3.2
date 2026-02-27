import { useState, useCallback } from 'react';
import { documentService } from '@/services/documentService';
import { tableService } from '@/services/tableService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';

interface AIActionResult {
  action: 'create_document' | 'create_table' | 'query' | 'none';
  document?: {
    title: string;
    content: string;
  };
  table?: {
    name: string;
    description: string;
    schema: {
      fields: Array<{
        name: string;
        type: string;
        required?: boolean;
        options?: any;
        description?: string;
      }>;
    };
  };
  message: string;
}

interface UseAIDocumentWriterOptions {
  databaseId: string;
  onDocumentCreated?: (docId: string, title: string) => void;
  onTableCreated?: (tableId: string, name: string) => void;
}

export function useAIDocumentWriter({ databaseId, onDocumentCreated, onTableCreated }: UseAIDocumentWriterOptions) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [createdResource, setCreatedResource] = useState<{ type: 'document' | 'table'; id: string; name: string } | null>(null);
  const navigate = useNavigate();

  const processAIAction = useCallback(async (prompt: string): Promise<{ handled: boolean; message: string }> => {
    setIsProcessing(true);
    setStatus('Analyzing your request...');
    setCreatedResource(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get existing tables and documents for context
      const [tables, documents] = await Promise.all([
        tableService.getUserTableProjects(user.id, databaseId).catch(() => []),
        documentService.getDatabaseDocuments(databaseId).catch(() => [])
      ]);

      const existingTables = (tables || []).map(t => ({
        id: t.id,
        name: t.name,
        fieldCount: t.schema?.fields?.length || 0
      }));

      const existingDocuments = (documents || []).map(d => ({
        id: d.id,
        title: d.title
      }));

      // Call the AI action edge function
      setStatus('Processing with AI...');
      const { data, error } = await supabase.functions.invoke('database-ai-actions', {
        body: {
          prompt,
          databaseId,
          userId: user.id,
          existingTables,
          existingDocuments
        }
      });

      if (error) throw error;

      const result = data as AIActionResult;

      // Handle create_document action
      if (result.action === 'create_document' && result.document) {
        setStatus(`Creating document: ${result.document.title}...`);
        
        // Convert markdown content to Lexical editor format
        const lexicalContent = convertMarkdownToLexical(result.document.content);
        
        const doc = await documentService.createDocument({
          database_id: databaseId,
          title: result.document.title,
          content: lexicalContent
        });

        setCreatedResource({ type: 'document', id: doc.id, name: doc.title });
        onDocumentCreated?.(doc.id, doc.title);
        toast.success(`Document "${doc.title}" created successfully!`);
        
        setIsProcessing(false);
        setStatus('');
        return { 
          handled: true, 
          message: `${result.message}\n\n✅ Document "${doc.title}" has been created.` 
        };
      }

      // Handle create_table action
      if (result.action === 'create_table' && result.table) {
        setStatus(`Creating table: ${result.table.name}...`);
        
        // Convert AI schema to table schema format
        type ValidFieldType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'image' | 'pdf' | 'codescript' | 'reference' | 'multireference' | 'document' | 'multidocument' | 'json' | 'email' | 'password' | 'timestamp';
        
        const tableSchema = {
          id: crypto.randomUUID(),
          name: result.table.name,
          fields: result.table.schema.fields.map(field => ({
            id: crypto.randomUUID(),
            name: field.name,
            type: mapFieldType(field.type) as ValidFieldType,
            required: field.required || false,
            options: field.options,
            description: field.description
          }))
        };

        const table = await tableService.createTableProject({
          name: result.table.name,
          description: result.table.description || '',
          user_id: user.id,
          database_id: databaseId,
          schema: tableSchema,
          records: []
        });

        setCreatedResource({ type: 'table', id: table.id, name: table.name });
        onTableCreated?.(table.id, table.name);
        toast.success(`Table "${table.name}" created successfully!`);
        
        setIsProcessing(false);
        setStatus('');
        return { 
          handled: true, 
          message: `${result.message}\n\n✅ Table "${table.name}" has been created with ${tableSchema.fields.length} fields.` 
        };
      }

      // For query or none actions, just return the message
      setIsProcessing(false);
      setStatus('');
      return { handled: false, message: result.message };

    } catch (error) {
      console.error('AI Document Writer error:', error);
      setIsProcessing(false);
      setStatus('');
      toast.error('Failed to process AI action');
      return { handled: false, message: 'Sorry, I encountered an error processing your request.' };
    }
  }, [databaseId, onDocumentCreated, onTableCreated]);

  const navigateToResource = useCallback(() => {
    if (!createdResource) return;
    
    if (createdResource.type === 'document') {
      navigate(`/database/${databaseId}/docs/${createdResource.id}`);
    } else if (createdResource.type === 'table') {
      navigate(`/database/${databaseId}/tables/${createdResource.id}`);
    }
  }, [createdResource, databaseId, navigate]);

  return {
    processAIAction,
    isProcessing,
    status,
    createdResource,
    navigateToResource
  };
}

// Helper function to map AI field types to table field types
function mapFieldType(type: string): string {
  const typeMap: Record<string, string> = {
    'string': 'text',
    'text': 'text',
    'number': 'number',
    'integer': 'number',
    'float': 'number',
    'date': 'date',
    'datetime': 'timestamp',
    'boolean': 'boolean',
    'bool': 'boolean',
    'select': 'select',
    'dropdown': 'select',
    'multiselect': 'multiselect',
    'multi-select': 'multiselect',
    'email': 'email',
    'textarea': 'textarea',
    'longtext': 'textarea',
    'image': 'image',
    'file': 'pdf',
    'json': 'json',
    'password': 'password'
  };
  return typeMap[type.toLowerCase()] || 'text';
}

// Helper to create a proper text node with all required properties
function createTextNode(text: string, format: number = 0): any {
  return {
    type: 'text',
    text: text,
    detail: 0,
    format: format,
    mode: 'normal',
    style: '',
    version: 1
  };
}

// Helper to create a proper paragraph node
function createParagraphNode(children: any[]): any {
  return {
    type: 'paragraph',
    children: children,
    direction: 'ltr',
    format: '',
    indent: 0,
    textFormat: 0,
    version: 1
  };
}

// Helper to create a proper heading node
function createHeadingNode(tag: string, children: any[]): any {
  return {
    type: 'heading',
    tag: tag,
    children: children,
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1
  };
}

// Helper to create a proper list item node
function createListItemNode(children: any[], value: number = 1): any {
  return {
    type: 'listitem',
    children: children,
    direction: 'ltr',
    format: '',
    indent: 0,
    value: value,
    version: 1
  };
}

// Helper to create a proper list node
function createListNode(listType: 'bullet' | 'number', children: any[]): any {
  return {
    type: 'list',
    listType: listType,
    start: 1,
    tag: listType === 'bullet' ? 'ul' : 'ol',
    children: children,
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1
  };
}

// Helper function to convert markdown to Lexical editor format
function convertMarkdownToLexical(markdown: string): any {
  const lines = markdown.split('\n');
  const children: any[] = [];
  
  let currentList: any[] | null = null;
  let listType: 'bullet' | 'number' | null = null;
  let listItemCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines but close any open list
    if (line.trim() === '') {
      if (currentList && currentList.length > 0) {
        children.push(createListNode(listType!, currentList));
        currentList = null;
        listType = null;
        listItemCounter = 1;
      }
      continue;
    }

    // Handle headers
    const h1Match = line.match(/^# (.+)$/);
    const h2Match = line.match(/^## (.+)$/);
    const h3Match = line.match(/^### (.+)$/);
    
    if (h1Match) {
      children.push(createHeadingNode('h1', [createTextNode(h1Match[1])]));
      continue;
    }
    
    if (h2Match) {
      children.push(createHeadingNode('h2', [createTextNode(h2Match[1])]));
      continue;
    }
    
    if (h3Match) {
      children.push(createHeadingNode('h3', [createTextNode(h3Match[1])]));
      continue;
    }

    // Handle bullet lists
    const bulletMatch = line.match(/^[-*] (.+)$/);
    if (bulletMatch) {
      if (!currentList || listType !== 'bullet') {
        if (currentList && currentList.length > 0) {
          children.push(createListNode(listType!, currentList));
        }
        currentList = [];
        listType = 'bullet';
        listItemCounter = 1;
      }
      currentList.push(createListItemNode([createTextNode(bulletMatch[1])], listItemCounter++));
      continue;
    }

    // Handle numbered lists
    const numberMatch = line.match(/^\d+\. (.+)$/);
    if (numberMatch) {
      if (!currentList || listType !== 'number') {
        if (currentList && currentList.length > 0) {
          children.push(createListNode(listType!, currentList));
        }
        currentList = [];
        listType = 'number';
        listItemCounter = 1;
      }
      currentList.push(createListItemNode([createTextNode(numberMatch[1])], listItemCounter++));
      continue;
    }

    // Close any open list before adding a paragraph
    if (currentList && currentList.length > 0) {
      children.push(createListNode(listType!, currentList));
      currentList = null;
      listType = null;
      listItemCounter = 1;
    }

    // Handle regular paragraphs with inline formatting
    const textChildren = parseInlineFormatting(line);
    children.push(createParagraphNode(textChildren));
  }

  // Close any remaining list
  if (currentList && currentList.length > 0) {
    children.push(createListNode(listType!, currentList));
  }

  return {
    root: {
      type: 'root',
      children: children.length > 0 ? children : [createParagraphNode([createTextNode('')])],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1
    }
  };
}

// Helper to parse inline markdown formatting (bold, italic)
function parseInlineFormatting(text: string): any[] {
  const result: any[] = [];
  let currentText = text;
  
  // Simple approach: just return plain text for now
  // More complex parsing could be added later
  const boldRegex = /\*\*(.+?)\*\*/g;
  const italicRegex = /\*(.+?)\*/g;
  
  // For simplicity, just return the text with markdown stripped
  currentText = currentText.replace(boldRegex, '$1').replace(italicRegex, '$1');
  
  if (currentText.trim()) {
    result.push(createTextNode(currentText));
  }
  
  return result.length > 0 ? result : [createTextNode('')];
}
