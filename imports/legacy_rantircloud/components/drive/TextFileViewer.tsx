import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';

interface TextFileViewerProps {
  filePath: string;
  fileName: string;
}

const getLanguageFromExtension = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'json': 'json',
    'md': 'markdown',
    'css': 'css',
    'scss': 'scss',
    'html': 'html',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'txt': 'plaintext',
    'log': 'plaintext',
    'env': 'plaintext',
    'csv': 'plaintext',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'py': 'python',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'php': 'php',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
  };
  return languageMap[ext] || 'plaintext';
};

export function TextFileViewer({ filePath, fileName }: TextFileViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.statusText}`);
        }
        const text = await response.text();
        setContent(text);
      } catch (err) {
        console.error('Failed to fetch text file:', err);
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [filePath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-muted/50 rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-muted/50 rounded-lg">
        <div className="text-center text-muted-foreground">
          <p className="mb-2">Failed to load file</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  const language = getLanguageFromExtension(fileName);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className={`rounded-lg overflow-hidden border ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`} style={{ minHeight: '500px' }}>
      <Editor
        height="500px"
        language={language}
        value={content}
        theme={isDark ? 'vs-dark' : 'light'}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          domReadOnly: true,
        }}
      />
    </div>
  );
}
