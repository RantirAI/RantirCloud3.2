import { useEffect } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { AppProject } from '@/types/appBuilder';

export function QuickTestApp() {
  const { setCurrentProject, setCurrentPage } = useAppBuilderStore();

  useEffect(() => {
    // Create a test project for demonstration
    const testProject: AppProject = {
      id: 'demo-test',
      name: 'Demo App - Container Test',
      description: 'Testing container drag and drop functionality',
      user_id: 'demo-user',
      pages: [{
        id: 'home',
        name: 'Home',
        route: '/',
        components: [],
        layout: { type: 'free', config: {} },
        settings: { title: 'Demo Home Page' }
      }],
      global_styles: {},
      settings: {
        theme: 'light',
        primaryColor: '#0f172a',
        fontFamily: 'Inter'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setCurrentProject(testProject);
    setCurrentPage('home');
  }, [setCurrentProject, setCurrentPage]);

  return null;
}