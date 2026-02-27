
import React from 'react';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';

export const VersionHistoryButton: React.FC = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="xs"
          className="text-xs gap-0.5"
        >
          <History className="h-3 w-3" />
          Versions
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Version History</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <div className="flex items-center gap-3 py-3 border-b">
            <div className="flex items-center justify-center rounded-full w-8 h-8 bg-gray-200 text-gray-600">T</div>
            <div>
              <div className="text-sm text-muted-foreground">Yesterday at 12:56 PM</div>
              <div className="font-medium">Version 1</div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
