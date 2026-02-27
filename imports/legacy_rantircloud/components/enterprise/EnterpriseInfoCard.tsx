import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Github } from "lucide-react";
import { EnterpriseBadge } from "@/components/EnterpriseBadge";
import enterpriseBackground from "@/assets/enterprise-card-background-1.png";

export function EnterpriseInfoCard() {
  return (
    <Card className="relative overflow-hidden border shadow-lg w-[480px] -mt-[50px]">
      <div 
        className="absolute bottom-0 right-0 opacity-60 w-[300px] h-full"
        style={{
          backgroundImage: `url(${enterpriseBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'bottom right',
        }}
      />
      <CardContent className="relative p-6 space-y-4">
        <div className="flex justify-between items-start">
          <EnterpriseBadge />
        </div>
        
        <div className="space-y-3">
          <h3 className="font-medium text-foreground">Rantir Cloud is Coming Soon</h3>
          <p className="text-sm text-muted-foreground">
            In the meantime, build with SDK kits and full open source repos of our visual builder and Rantir Studio's Drawtir
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://webtir.com', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Webtir.com
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://drawtir.com', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Drawtir.com
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://github.com/RantirAI/webtir2-1', '_blank')}
          >
            <Github className="h-4 w-4 mr-2" />
            Webtir Repo
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://github.com/RantirAI/drawtir', '_blank')}
          >
            <Github className="h-4 w-4 mr-2" />
            Drawtir Repo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
