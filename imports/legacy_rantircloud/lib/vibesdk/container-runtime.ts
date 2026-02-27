import { WebContainer } from '@webcontainer/api';

export class RantirContainerRuntime {
  private container: WebContainer | null = null;
  private isBooting = false;
  private previewUrl: string | null = null;

  async initialize(files: Record<string, string>): Promise<void> {
    if (this.container || this.isBooting) {
      console.log('Container already initialized or booting');
      return;
    }

    try {
      this.isBooting = true;
      console.log('Booting WebContainer...');
      
      // Retry logic for instance limits
      let retries = 3;
      while (retries > 0) {
        try {
          this.container = await WebContainer.boot();
          console.log('WebContainer booted successfully');
          break;
        } catch (bootError: any) {
          retries--;
          if (bootError?.message?.includes('Unable to create more instances') && retries > 0) {
            console.log(`Instance limit reached, retrying in 2s... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            throw bootError;
          }
        }
      }

      if (!this.container) {
        throw new Error('Failed to boot WebContainer after retries');
      }

      // Mount project files
      await this.mountFiles(files);
      
      // Create package.json if it doesn't exist
      if (!files['package.json']) {
        await this.createDefaultPackageJson();
      }

      // Install dependencies
      await this.installDependencies();
      
    } catch (error) {
      console.error('Error initializing container:', error);
      this.container = null;
      throw error;
    } finally {
      this.isBooting = false;
    }
  }

  async mountFiles(files: Record<string, string>): Promise<void> {
    if (!this.container) throw new Error('Container not initialized');

    const fileTree: Record<string, any> = {};
    
    for (const [path, content] of Object.entries(files)) {
      const parts = path.split('/');
      let current = fileTree;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = { directory: {} };
        }
        current = current[parts[i]].directory;
      }
      
      const fileName = parts[parts.length - 1];
      current[fileName] = { file: { contents: content } };
    }

    await this.container.mount(fileTree);
    console.log('Files mounted successfully');
  }

  async updateFile(path: string, content: string): Promise<void> {
    if (!this.container) throw new Error('Container not initialized');
    
    try {
      await this.container.fs.writeFile(path, content);
      console.log(`Updated file: ${path}`);
    } catch (error) {
      console.error(`Error updating file ${path}:`, error);
      throw error;
    }
  }

  async runPreview(): Promise<string> {
    if (!this.container) throw new Error('Container not initialized');

    try {
      // Start dev server
      const process = await this.container.spawn('npm', ['run', 'dev']);
      
      // Listen for server ready event
      return new Promise((resolve, reject) => {
        this.container!.on('server-ready', (port, url) => {
          this.previewUrl = url;
          console.log(`Server ready on port ${port}: ${url}`);
          resolve(url);
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          reject(new Error('Server startup timeout'));
        }, 30000);
      });
    } catch (error) {
      console.error('Error running preview:', error);
      throw error;
    }
  }

  getPreviewUrl(): string | null {
    return this.previewUrl;
  }

  async teardown(): Promise<void> {
    if (this.container) {
      await this.container.teardown();
      this.container = null;
      this.previewUrl = null;
      console.log('Container torn down');
    }
  }

  private async createDefaultPackageJson(): Promise<void> {
    if (!this.container) return;

    const defaultPackageJson = {
      name: 'rantir-preview',
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      },
      dependencies: {
        'react': '^18.3.1',
        'react-dom': '^18.3.1'
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.3.0',
        'vite': '^5.0.0'
      }
    };

    await this.container.fs.writeFile(
      'package.json',
      JSON.stringify(defaultPackageJson, null, 2)
    );
  }

  private async installDependencies(): Promise<void> {
    if (!this.container) return;

    console.log('Installing dependencies...');
    const install = await this.container.spawn('npm', ['install']);
    
    const exitCode = await install.exit;
    if (exitCode !== 0) {
      throw new Error('Failed to install dependencies');
    }
    
    console.log('Dependencies installed successfully');
  }
}
