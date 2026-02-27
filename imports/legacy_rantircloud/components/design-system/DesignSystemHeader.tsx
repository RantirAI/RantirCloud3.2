import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLocation } from 'react-router-dom';
import { 
  Download, 
  Share, 
  Settings, 
  Eye, 
  Code,
  Palette,
  Type,
  Square,
  Move,
  Container,
  CornerDownRight,
  Sparkles,
  FormInput,
  Layout,
} from 'lucide-react';

const pageData = {
  '/design-system/colors': {
    title: 'Colors',
    icon: Palette,
    description: 'Manage your color palette and design tokens',
    badge: 'Foundation'
  },
  '/design-system/typography': {
    title: 'Typography',
    icon: Type,
    description: 'Define font families, sizes, and text styles',
    badge: 'Foundation'
  },
  '/design-system/buttons': {
    title: 'Buttons',
    icon: Square,
    description: 'Create and customize button components',
    badge: 'Components'
  },
  '/design-system/gaps': {
    title: 'Gaps',
    icon: Move,
    description: 'Set spacing tokens and layout gaps',
    badge: 'Layout'
  },
  '/design-system/container': {
    title: 'Container',
    icon: Container,
    description: 'Configure container sizes and responsive breakpoints',
    badge: 'Layout'
  },
  '/design-system/border-radius': {
    title: 'Border Radius',
    icon: CornerDownRight,
    description: 'Define rounded corners and border styles',
    badge: 'Foundation'
  },
  '/design-system/effects': {
    title: 'Effects',
    icon: Sparkles,
    description: 'Add shadows, gradients, and visual effects',
    badge: 'Effects'
  },
  '/design-system/forms': {
    title: 'Forms',
    icon: FormInput,
    description: 'Build and validate form components',
    badge: 'Components'
  },
  '/design-system/components': {
    title: 'Components',
    icon: Layout,
    description: 'Browse and manage UI component library',
    badge: 'Components'
  }
};

export function DesignSystemHeader() {
  const location = useLocation();
  const currentPage = pageData[location.pathname] || pageData['/design-system/colors'];
  const Icon = currentPage.icon;

  return (
    <header className="h-16 border-b border-border bg-background px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2" />
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{currentPage.title}</h2>
              <Badge variant="secondary" className="text-xs">
                {currentPage.badge}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{currentPage.description}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <Button variant="outline" size="sm">
          <Code className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button variant="outline" size="sm">
          <Share className="h-4 w-4 mr-2" />
          Share
        </Button>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}