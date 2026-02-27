import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

interface SignatureWidgetProps {
  onSave?: (data: { name: string; date: string; signature: string }) => void;
}

export function SignatureWidget({ onSave }: SignatureWidgetProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const [signature, setSignature] = useState('');

  return (
    <Card className="p-6 space-y-4 border-2 border-dashed">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Calendar className="h-4 w-4" />
        Signature Block
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sig-name" className="text-xs">Full Name</Label>
          <Input
            id="sig-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="h-9"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="sig-date" className="text-xs">Date</Label>
          <Input
            id="sig-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="sig-signature" className="text-xs">Signature</Label>
        <div className="border-b-2 border-foreground/20 pb-1">
          <Input
            id="sig-signature"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Type or draw your signature"
            className="border-0 shadow-none focus-visible:ring-0 font-serif text-2xl italic px-2"
          />
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground">
        By signing above, you acknowledge and agree to the terms of this document.
      </p>
    </Card>
  );
}
