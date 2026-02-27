import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

interface PricingCardProps {
  planId: string;
  name: string;
  price: number;
  priceId: string;
  features: string[];
  isCurrentPlan?: boolean;
  isPopular?: boolean;
}

export function PricingCard({ 
  planId, 
  name, 
  price, 
  priceId, 
  features, 
  isCurrentPlan = false,
  isPopular = false 
}: PricingCardProps) {
  const { createCheckout, loading } = useSubscription();

  const handleSubscribe = async () => {
    await createCheckout(priceId);
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-200",
      isCurrentPlan && "border-primary shadow-lg",
      isPopular && "border-primary shadow-md"
    )}>
      {isPopular && (
        <div className="absolute top-0 left-0 right-0">
          <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
            Most Popular
          </div>
        </div>
      )}
      
      {isCurrentPlan && (
        <Badge className="absolute top-4 right-4" variant="default">
          Current Plan
        </Badge>
      )}

      <CardHeader className={cn(isPopular && "pt-8")}>
        <CardTitle className="text-xl">{name}</CardTitle>
        <CardDescription>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-bold text-foreground">
              ${price.toLocaleString()}
            </span>
            <span className="text-muted-foreground">/month</span>
          </div>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Check className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm">{feature}</span>
          </div>
        ))}
      </CardContent>

      <CardFooter>
        {isCurrentPlan ? (
          <Button variant="outline" className="w-full" disabled>
            Current Plan
          </Button>
        ) : (
          <Button 
            className="w-full" 
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? 'Processing...' : `Subscribe for $${price}/month`}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}