import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

export function EffectsPage() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="text-center py-12">
        <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Effects</h1>
        <p className="text-muted-foreground mb-4">
          Shadows, gradients, and visual effects will be available soon
        </p>
        <Badge variant="outline">Coming Soon</Badge>
      </div>
    </div>
  );
}