import { useEffect } from 'react';
import { AIWallSidebar } from '@/components/ai-wall/AIWallSidebar';
import { AIWallCanvas } from '@/components/ai-wall/AIWallCanvas';
import { useAIWallStore } from '@/stores/aiWallStore';
import { generateDesign } from '@/services/aiWallService';
import { toast } from 'sonner';

export default function AIWall() {
  const {
    prompt,
    selectedPreset,
    setIsGenerating,
    addGeneration,
    updateGenerationVariants,
    addChatMessage,
    uploadedDesignImage,
    savedStyle,
    previewingVariant,
    appendSectionsToVariant,
  } = useAIWallStore();

  useEffect(() => {
    return () => {};
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    const isAppendMode = !!previewingVariant;

    // Add user message to chat
    addChatMessage({ role: 'user', content: prompt.trim() });

    // Add analyzing message
    addChatMessage({
      role: 'system',
      content: isAppendMode
        ? 'Adding sections to the current design...'
        : 'Analyzing your design intent...',
    });

    setIsGenerating(true);

    try {
      const { generation, reasoning } = await generateDesign({
        prompt: prompt.trim(),
        preset: selectedPreset,
        referenceImage: uploadedDesignImage || undefined,
        savedStyle: savedStyle || undefined,
        totalDesigns: isAppendMode ? 1 : 4,
        onBatchComplete: (variants) => {
          if (!isAppendMode) {
            updateGenerationVariants(variants);
          }
        },
      });

      // In append mode, take the generated components and append them
      if (isAppendMode && generation.variants.length > 0) {
        const newComponents = generation.variants[0].components;
        if (newComponents.length > 0) {
          appendSectionsToVariant(previewingVariant.id, newComponents);
          addChatMessage({
            role: 'generation',
            content: `Added ${newComponents.length} new section${newComponents.length !== 1 ? 's' : ''} to the design`,
            metadata: {
              generationId: generation.id,
              successCount: newComponents.length,
              totalCount: newComponents.length,
            },
          });
          toast.success(`Added ${newComponents.length} section${newComponents.length !== 1 ? 's' : ''} to your design!`);
        } else {
          toast.warning('No sections were generated. Try a different prompt.');
        }
      } else {
        // Normal flow — add reasoning messages
        if (reasoning.intent) {
          addChatMessage({
            role: 'system',
            content: `Identified design direction: ${reasoning.intent.industry || 'general'} with ${reasoning.intent.mood || 'modern'} mood.`,
            metadata: { intent: reasoning.intent },
          });
        }

        if (reasoning.tokens) {
          addChatMessage({
            role: 'system',
            content: 'Generated design tokens — colors, typography, and spacing.',
            metadata: { tokens: reasoning.tokens },
          });
        }

        addGeneration(generation);

        const successCount = generation.variants.filter(v => v.components.length > 0).length;

        addChatMessage({
          role: 'generation',
          content: `${successCount} design variant${successCount !== 1 ? 's' : ''} ready`,
          metadata: {
            generationId: generation.id,
            successCount,
            totalCount: successCount,
          },
        });

        if (successCount > 0) {
          toast.success(`Generated ${successCount} design variant${successCount !== 1 ? 's' : ''}!`);
        } else {
          toast.info('No designs were generated. Try a different prompt.');
        }
      }
    } catch (error) {
      console.error('[AI Wall] Generation error:', error);
      addChatMessage({
        role: 'error',
        content: 'Failed to generate designs. Please try again.',
      });
      toast.error('Failed to generate designs. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-[calc(100vh-48px)] flex bg-background overflow-hidden">
      <AIWallSidebar onGenerate={handleGenerate} />
      <AIWallCanvas />
    </div>
  );
}
