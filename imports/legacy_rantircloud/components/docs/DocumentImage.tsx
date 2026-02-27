import { useState } from 'react';
import { Loader2, ImageOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DocumentImageProps {
  imageUrl?: string;
  imagePrompt?: string;
  alt?: string;
  className?: string;
  onRegenerate?: () => void;
  isGenerating?: boolean;
}

export function DocumentImage({ 
  imageUrl, 
  imagePrompt, 
  alt, 
  className,
  onRegenerate,
  isGenerating 
}: DocumentImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (isGenerating) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center bg-muted/50 rounded-lg p-8 min-h-[200px]",
        className
      )}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Generating image...</p>
        {imagePrompt && (
          <p className="text-xs text-muted-foreground/70 mt-2 max-w-md text-center italic">
            "{imagePrompt}"
          </p>
        )}
      </div>
    );
  }

  if (!imageUrl || error) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center bg-muted/30 rounded-lg p-8 min-h-[200px] border-2 border-dashed border-muted-foreground/20",
        className
      )}>
        <ImageOff className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          {error ? 'Failed to load image' : 'No image'}
        </p>
        {imagePrompt && (
          <p className="text-xs text-muted-foreground/70 mt-2 max-w-md text-center">
            Prompt: {imagePrompt}
          </p>
        )}
        {onRegenerate && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRegenerate}
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate Image
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden", className)}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <img
        src={imageUrl}
        alt={alt || imagePrompt || 'Generated image'}
        className={cn(
          "w-full h-auto transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
      {onRegenerate && loaded && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 opacity-0 hover:opacity-100 transition-opacity"
          onClick={onRegenerate}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
