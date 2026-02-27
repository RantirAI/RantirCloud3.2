import { useState } from 'react';
import { Loader2, VideoOff, RefreshCw, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DocumentVideoProps {
  videoUrl?: string;
  videoPrompt?: string;
  thumbnailUrl?: string;
  className?: string;
  onRegenerate?: () => void;
  isGenerating?: boolean;
  status?: string;
}

export function DocumentVideo({ 
  videoUrl, 
  videoPrompt, 
  thumbnailUrl,
  className,
  onRegenerate,
  isGenerating,
  status 
}: DocumentVideoProps) {
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);

  if (isGenerating || status === 'processing') {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center bg-muted/50 rounded-lg p-8 min-h-[240px]",
        className
      )}>
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground font-medium">Generating video...</p>
        <p className="text-xs text-muted-foreground/70 mt-1">This may take 1-3 minutes</p>
        {videoPrompt && (
          <p className="text-xs text-muted-foreground/70 mt-3 max-w-md text-center italic">
            "{videoPrompt}"
          </p>
        )}
      </div>
    );
  }

  if (!videoUrl || error) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center bg-muted/30 rounded-lg p-8 min-h-[240px] border-2 border-dashed border-muted-foreground/20",
        className
      )}>
        <VideoOff className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          {error ? 'Failed to load video' : 'No video'}
        </p>
        {videoPrompt && (
          <p className="text-xs text-muted-foreground/70 mt-2 max-w-md text-center">
            Prompt: {videoPrompt}
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
            Generate Video
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden bg-black", className)}>
      {!playing && thumbnailUrl ? (
        <div className="relative">
          <img 
            src={thumbnailUrl} 
            alt="Video thumbnail" 
            className="w-full h-auto"
          />
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          >
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="h-8 w-8 text-black ml-1" fill="currentColor" />
            </div>
          </button>
        </div>
      ) : (
        <video
          src={videoUrl}
          controls
          autoPlay={playing}
          className="w-full h-auto"
          onError={() => setError(true)}
        >
          Your browser does not support the video tag.
        </video>
      )}
      {onRegenerate && (
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
