import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DesignSystemSidebar } from '@/components/design-system/DesignSystemSidebar';
import { DesignSystemHeader } from '@/components/design-system/DesignSystemHeader';
import { ColorsPage } from '@/pages/design-system/ColorsPage';
import { TypographyPage } from '@/pages/design-system/TypographyPage';
import { ButtonsPage } from '@/pages/design-system/ButtonsPage';
import { GapsPage } from '@/pages/design-system/GapsPage';
import { ContainerPage } from '@/pages/design-system/ContainerPage';
import { BorderRadiusPage } from '@/pages/design-system/BorderRadiusPage';
import { EffectsPage } from '@/pages/design-system/EffectsPage';
import { FormsPage } from '@/pages/design-system/FormsPage';
import { ComponentsPage } from '@/pages/design-system/ComponentsPage';

export default function DesignSystem() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DesignSystemSidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <DesignSystemHeader />
          
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route index element={<Navigate to="colors" replace />} />
              <Route path="colors" element={<ColorsPage />} />
              <Route path="typography" element={<TypographyPage />} />
              <Route path="buttons" element={<ButtonsPage />} />
              <Route path="gaps" element={<GapsPage />} />
              <Route path="container" element={<ContainerPage />} />
              <Route path="border-radius" element={<BorderRadiusPage />} />
              <Route path="effects" element={<EffectsPage />} />
              <Route path="forms" element={<FormsPage />} />
              <Route path="components" element={<ComponentsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}