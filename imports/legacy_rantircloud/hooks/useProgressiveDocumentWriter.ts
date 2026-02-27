import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ContentSection {
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'image' | 'chart' | 'video';
  level?: number;
  content: string;
  items?: string[];
  // Media fields
  imagePrompt?: string;
  imageUrl?: string;
  chartConfig?: {
    type: 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'scatter';
    data: Array<{ name: string; value: number; [key: string]: any }>;
    title?: string;
    xAxisKey?: string;
    yAxisKey?: string;
  };
  videoPrompt?: string;
  videoUrl?: string;
}

interface UseProgressiveDocumentWriterOptions {
  databaseId: string;
  onSectionAdded?: (sectionIndex: number, totalSections: number) => void;
  onComplete?: (documentId: string) => void;
}

export function useProgressiveDocumentWriter({ 
  databaseId, 
  onSectionAdded, 
  onComplete 
}: UseProgressiveDocumentWriterOptions) {
  const [isWriting, setIsWriting] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [totalSections, setTotalSections] = useState(0);
  const [documentId, setDocumentId] = useState<string | null>(null);

  // Helper to create a proper text node with all required properties
  const createTextNode = (text: string): any => ({
    type: 'text',
    text: text,
    detail: 0,
    format: 0,
    mode: 'normal',
    style: '',
    version: 1
  });

  // Helper to create a proper list item node
  const createListItemNode = (children: any[], value: number): any => ({
    type: 'listitem',
    children: children,
    direction: 'ltr',
    format: '',
    indent: 0,
    value: value,
    version: 1
  });

  // Generate image using AI
  const generateImage = async (prompt: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-document-image', {
        body: { prompt, databaseId }
      });
      if (error) {
        console.error('Image generation error:', error);
        return null;
      }
      return data?.imageUrl || null;
    } catch (err) {
      console.error('Failed to generate image:', err);
      return null;
    }
  };

  const sectionToLexicalNode = async (section: ContentSection): Promise<any> => {
    switch (section.type) {
      case 'heading':
        const tag = section.level === 1 ? 'h1' : section.level === 2 ? 'h2' : 'h3';
        return {
          type: 'heading',
          tag,
          children: [createTextNode(section.content)],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1
        };
      
      case 'paragraph':
        return {
          type: 'paragraph',
          children: [createTextNode(section.content)],
          direction: 'ltr',
          format: '',
          indent: 0,
          textFormat: 0,
          version: 1
        };
      
      case 'list':
        const listItems = (section.items || []).map((item, index) => 
          createListItemNode([createTextNode(item)], index + 1)
        );
        return {
          type: 'list',
          listType: 'bullet',
          start: 1,
          tag: 'ul',
          children: listItems,
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1
        };
      
      case 'code':
        return {
          type: 'code',
          language: 'javascript',
          children: [createTextNode(section.content)],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1
        };

      case 'image':
        // Generate image if we have a prompt but no URL
        let imageUrl = section.imageUrl;
        if (!imageUrl && section.imagePrompt) {
          imageUrl = await generateImage(section.imagePrompt);
        }
        
        // Use proper image node that Lexical can render
        return {
          type: 'image',
          imageUrl: imageUrl,
          imagePrompt: section.imagePrompt || section.content,
          alt: section.content || 'AI Generated Image',
          version: 1
        };

      case 'chart':
        // Use proper chart node that Lexical can render
        return {
          type: 'chart',
          chartConfig: section.chartConfig || {
            type: 'bar',
            data: [],
            title: section.content
          },
          version: 1
        };

      case 'video':
        // Use proper video node that Lexical can render
        return {
          type: 'video',
          videoUrl: section.videoUrl || null,
          videoPrompt: section.videoPrompt || section.content,
          version: 1
        };
      
      default:
        return {
          type: 'paragraph',
          children: [createTextNode(section.content)],
          direction: 'ltr',
          format: '',
          indent: 0,
          textFormat: 0,
          version: 1
        };
    }
  };

  const createEmptyDocument = async (title: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const emptyContent = {
      root: {
        type: 'root',
        children: [],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1
      }
    };

    const { data: doc, error } = await supabase
      .from('documents')
      .insert({
        database_id: databaseId,
        title,
        content: emptyContent,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return doc.id;
  };

  const appendSectionToDocument = async (docId: string, section: ContentSection): Promise<void> => {
    // Get current document content
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('content')
      .eq('id', docId)
      .single();

    if (fetchError) throw fetchError;

    const currentContent = doc.content as any;
    const lexicalNode = await sectionToLexicalNode(section);

    // Append new node to existing content
    const updatedContent = {
      ...currentContent,
      root: {
        ...currentContent.root,
        children: [...(currentContent.root?.children || []), lexicalNode]
      }
    };

    // Update document
    const { error: updateError } = await supabase
      .from('documents')
      .update({ content: updatedContent })
      .eq('id', docId);

    if (updateError) throw updateError;
  };

  const writeDocument = useCallback(async (title: string, sections: ContentSection[]): Promise<string> => {
    setIsWriting(true);
    setTotalSections(sections.length);
    setCurrentSection(0);

    try {
      // Step 1: Create empty document
      const docId = await createEmptyDocument(title);
      setDocumentId(docId);

      // Step 2: Progressively add each section with delay for visual effect
      for (let i = 0; i < sections.length; i++) {
        setCurrentSection(i + 1);
        
        await appendSectionToDocument(docId, sections[i]);
        onSectionAdded?.(i + 1, sections.length);
        
        // Small delay between sections for visual progressive effect
        if (i < sections.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }

      onComplete?.(docId);
      return docId;
    } finally {
      setIsWriting(false);
    }
  }, [databaseId, onSectionAdded, onComplete]);

  return {
    writeDocument,
    isWriting,
    currentSection,
    totalSections,
    documentId,
    progress: totalSections > 0 ? Math.round((currentSection / totalSections) * 100) : 0
  };
}
