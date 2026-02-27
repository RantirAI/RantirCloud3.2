import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  ExternalLink, 
  Copy, 
  Check,
  Sparkles,
  Globe,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ResearchSource {
  title: string;
  url: string;
  snippet?: string;
}

interface ResearchFinding {
  title: string;
  content: string;
}

interface ResearchResult {
  summary: string;
  findings: ResearchFinding[];
  sources: ResearchSource[];
  provider: 'gemini-deep-research' | 'openai-deep-research';
  timestamp: string;
}

interface DeepResearchResultProps {
  result: ResearchResult;
}

export function DeepResearchResult({ result }: DeepResearchResultProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const copyToClipboard = async () => {
    const text = `# Research Report\n\n## Summary\n${result.summary}\n\n${result.findings.map(f => `## ${f.title}\n${f.content}`).join('\n\n')}\n\n## Sources\n${result.sources.map(s => `- [${s.title}](${s.url})`).join('\n')}`;
    
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied", description: "Research report copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const providerLabel = result.provider === 'gemini-deep-research' 
    ? 'Gemini Deep Research' 
    : 'OpenAI Deep Research';

  const providerIcon = result.provider === 'gemini-deep-research'
    ? <Sparkles className="h-3 w-3" />
    : <Globe className="h-3 w-3" />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            {providerIcon}
            {providerLabel}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(result.timestamp).toLocaleString()}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="h-8"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          <span className="ml-1">Copy</span>
        </Button>
      </div>

      {/* Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{result.summary}</p>
        </CardContent>
      </Card>

      {/* Findings */}
      {result.findings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Research Findings</h4>
          {result.findings.map((finding, index) => (
            <Collapsible
              key={index}
              open={expandedSections.has(index)}
              onOpenChange={() => toggleSection(index)}
            >
              <Card className="overflow-hidden">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      {expandedSections.has(index) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-sm">{finding.title}</span>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-0 border-t">
                    <p className="text-sm leading-relaxed mt-3 whitespace-pre-wrap">
                      {finding.content}
                    </p>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Sources */}
      {result.sources.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Sources ({result.sources.length})
          </h4>
          <Card>
            <CardContent className="p-3 space-y-2">
              {result.sources.map((source, index) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 p-2 rounded-md hover:bg-muted transition-colors group"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-primary truncate group-hover:underline">
                      {source.title}
                    </p>
                    {source.snippet && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {source.snippet}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {source.url}
                    </p>
                  </div>
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
