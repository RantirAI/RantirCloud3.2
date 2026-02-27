import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const CALENDLY_LINK = 'https://calendly.com/rantir/30min';

interface CreditPack {
  id: string;
  tier: number;
  credits: number;
  price: number;
}

const creditPackPrices = [99, 199, 189, 279, 369, 459, 549, 629];

const creditPacks: CreditPack[] = creditPackPrices.map((price, i) => ({
  id: `credit-pack-${i + 1}`,
  tier: i + 1,
  credits: (i + 1) * 200,
  price,
}));

export function AICreditPacks() {
  const handlePurchase = () => {
    window.open(CALENDLY_LINK, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">AI Credit Add-ons</h2>
        </div>
        <p className="text-muted-foreground">
          Boost your AI capabilities with additional credits
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {creditPacks.map((pack) => (
          <Card 
            key={pack.id} 
            className={cn(
              "relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50",
              pack.tier === 4 && "border-primary shadow-md"
            )}
          >
            {pack.tier === 4 && (
              <Badge className="absolute top-2 right-2 bg-primary text-xs">
                Popular
              </Badge>
            )}
            
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Tier {pack.tier}
              </CardTitle>
              <CardDescription>
                <span className="text-2xl font-bold text-foreground">{pack.credits.toLocaleString()}</span>
                <span className="text-muted-foreground"> credits</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="pb-2">
              <div className="text-sm text-muted-foreground">
                ${pack.price}/pack
              </div>
            </CardContent>

            <CardFooter>
              <Button 
                variant={pack.tier === 4 ? "default" : "outline"}
                size="sm"
                className="w-full"
                onClick={handlePurchase}
              >
                Add Credits
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Schedule a call to purchase AI credit packs for your account
      </p>
    </div>
  );
}
