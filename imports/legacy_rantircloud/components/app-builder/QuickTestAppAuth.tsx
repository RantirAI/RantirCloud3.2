import React, { useState } from 'react';
import { AppProject, AppPage } from '@/types/appBuilder';
import { AuthProvider } from './AuthProvider';
import { ComponentRenderer } from './ComponentRenderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, User, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

interface QuickTestAppAuthProps {
  project: AppProject;
  onClose: () => void;
}

function PageRenderer({ page, project }: { page: AppPage; project: AppProject }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Auth Status Bar */}
      <div className="bg-muted/50 border-b p-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4" />
            <span>Authentication Status:</span>
            {user ? (
              <Badge variant="default" className="gap-1">
                <User className="h-3 w-3" />
                Authenticated as {user.email}
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Not Authenticated
              </Badge>
            )}
          </div>
          
          {page.settings?.requireAuth && (
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" />
              Protected Page
            </Badge>
          )}
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{page.name}</h1>
          {page.settings?.description && (
            <p className="text-muted-foreground mt-1">{page.settings.description}</p>
          )}
        </div>

        {/* Render page components */}
        <div className="space-y-4">
          {page.components.map((component) => (
            <ComponentRenderer
              key={component.id}
              component={component}
              isPreview={true}
            />
          ))}
        </div>

        {page.components.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">This page is empty. Add some components to see them here.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export function QuickTestAppAuth({ project, onClose }: QuickTestAppAuthProps) {
  const [currentPageId, setCurrentPageId] = useState(() => {
    const homePage = project.pages.find(p => p.route === '/');
    return homePage?.id || project.pages[0]?.id;
  });

  const currentPage = project.pages.find(p => p.id === currentPageId);

  if (!currentPage) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No pages found in this project.</p>
            <Button onClick={onClose} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Editor
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      {/* Header */}
      <div className="bg-card border-b p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Editor
            </Button>
            
            <div>
              <h1 className="font-semibold">{project.name}</h1>
              <p className="text-sm text-muted-foreground">Preview with Authentication</p>
            </div>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            {project.pages.map((page) => (
              <Button
                key={page.id}
                variant={page.id === currentPageId ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentPageId(page.id)}
                className="gap-2"
              >
                {page.settings?.requireAuth && <Lock className="h-3 w-3" />}
                {page.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* App Content with Auth */}
      <AuthProvider
        project={project}
        currentPage={currentPage}
        onNavigate={(pageId) => setCurrentPageId(pageId)}
      >
        <PageRenderer page={currentPage} project={project} />
      </AuthProvider>
    </div>
  );
}