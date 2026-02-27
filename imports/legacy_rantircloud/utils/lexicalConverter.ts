// Shared utility for converting AI sections to Lexical format
// Supports: heading, paragraph, list, code, chart, image, video

export interface AISection {
  type: string;
  level?: number;
  content?: string;
  items?: string[];
  chartConfig?: any;
  chartType?: string;
  chartData?: any[];
  chartTitle?: string;
  // Image fields
  src?: string;
  url?: string;
  imageUrl?: string;
  imagePrompt?: string;
  alt?: string;
  caption?: string;
  // Video fields
  videoUrl?: string;
  videoPrompt?: string;
  title?: string;
  thumbnailUrl?: string;
}

export const convertSectionsToLexical = (sections: AISection[]): any => {
  const children: any[] = [];
  
  for (const section of sections) {
    switch (section.type) {
      case 'heading':
        const tag = section.level === 1 ? 'h1' : section.level === 2 ? 'h2' : 'h3';
        children.push({
          type: 'heading',
          tag,
          children: [{ type: 'text', text: section.content || '', detail: 0, format: 0, mode: 'normal', style: '', version: 1 }],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1
        });
        break;
        
      case 'paragraph':
        children.push({
          type: 'paragraph',
          children: [{ type: 'text', text: section.content || '', detail: 0, format: 0, mode: 'normal', style: '', version: 1 }],
          direction: 'ltr',
          format: '',
          indent: 0,
          textFormat: 0,
          version: 1
        });
        break;
        
      case 'list':
        if (section.items && section.items.length > 0) {
          children.push({
            type: 'list',
            listType: 'bullet',
            start: 1,
            tag: 'ul',
            children: section.items.map((item, idx) => ({
              type: 'listitem',
              children: [{ type: 'text', text: item, detail: 0, format: 0, mode: 'normal', style: '', version: 1 }],
              direction: 'ltr',
              format: '',
              indent: 0,
              value: idx + 1,
              version: 1
            })),
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1
          });
        }
        break;
        
      case 'code':
        children.push({
          type: 'paragraph',
          children: [{ type: 'text', text: section.content || '', detail: 0, format: 16, mode: 'normal', style: '', version: 1 }],
          direction: 'ltr',
          format: '',
          indent: 0,
          textFormat: 0,
          version: 1
        });
        break;
        
      case 'chart':
        // Create chart node for Lexical
        const chartConfig = section.chartConfig || {
          type: section.chartType || 'bar',
          data: section.chartData || [],
          title: section.chartTitle || section.title || 'Chart'
        };
        children.push({
          type: 'chart',
          chartConfig: chartConfig,
          version: 1
        });
        break;
        
      case 'image':
        // Create image node for Lexical - prioritize generated imageUrl, then src, then url
        const imageUrl = section.imageUrl || section.src || section.url || null;
        const imagePrompt = section.imagePrompt || section.alt || section.caption || section.content || '';
        children.push({
          type: 'image',
          imageUrl: imageUrl,
          imagePrompt: imagePrompt,
          alt: section.alt || section.caption || section.content || 'Image',
          version: 1
        });
        break;
        
      case 'video':
        // Create video node for Lexical - prioritize generated videoUrl, then src, then url
        const videoUrl = section.videoUrl || section.src || section.url || null;
        const videoPrompt = section.videoPrompt || section.title || section.caption || section.content || '';
        children.push({
          type: 'video',
          videoUrl: videoUrl,
          videoPrompt: videoPrompt,
          thumbnailUrl: section.thumbnailUrl,
          version: 1
        });
        break;
    }
  }
  
  return {
    root: {
      type: 'root',
      children: children.length > 0 ? children : [
        { type: 'paragraph', children: [{ type: 'text', text: '', detail: 0, format: 0, mode: 'normal', style: '', version: 1 }], direction: 'ltr', format: '', indent: 0, textFormat: 0, version: 1 }
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1
    }
  };
};
