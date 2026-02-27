import { AppComponent, ComponentType, ComponentStyle } from '@/types/appBuilder';
import { useAppBuilderStore } from '@/stores/appBuilderStore';

interface ComponentBuildStep {
  component: AppComponent;
  delay: number;
  parentId?: string;
  message?: string;
}

export class ProgressiveComponentBuilder {
  private buildQueue: ComponentBuildStep[] = [];
  private isBuilding = false;

  async buildComponentProgressively(
    componentDefinition: any,
    targetParentId?: string,
    onProgress?: (message: string) => void,
    onComplete?: () => void
  ): Promise<void> {
    if (this.isBuilding) {
      console.warn('Progressive builder is already running');
      return;
    }

    this.isBuilding = true;
    this.buildQueue = [];

    try {
      console.log('Starting progressive build with:', componentDefinition);
      
      // Parse the component definition and create build steps
      this.createBuildSteps(componentDefinition, targetParentId);

      console.log('Created build steps:', this.buildQueue.length);

      // Execute build steps progressively
      await this.executeBuildSteps(onProgress);

      onComplete?.();
    } catch (error) {
      console.error('Progressive build failed:', error);
      throw error;
    } finally {
      this.isBuilding = false;
      this.buildQueue = [];
    }
  }

  private createBuildSteps(componentDef: any, parentId?: string, depth = 0): void {
    if (!componentDef) return;

    // Create the main AppComponent
    const component: AppComponent = {
      id: componentDef.id || `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: this.mapComponentType(componentDef.type) as ComponentType,
      props: this.parseProps(componentDef.props, componentDef.style),
      style: this.parseStyle(componentDef.style),
      children: []
    };

    // Add step for this component
    this.buildQueue.push({
      component,
      delay: 30, // Instant rendering - batch all components quickly
      parentId,
      message: this.getProgressMessage(component, depth)
    });

    // Add steps for children recursively
    if (componentDef.children && Array.isArray(componentDef.children)) {
      componentDef.children.forEach((child: any) => {
        this.createBuildSteps(child, component.id, depth + 1);
      });
    }
  }

  // Map component types to existing system
  private mapComponentType(type: string): string {
    const typeMap: Record<string, string> = {
      'container': 'container',
      'text': 'text',
      'button': 'button',
      'card': 'card',
      'input': 'input',
      'form': 'form',
      'image': 'image',
      'table': 'table'
    };
    return typeMap[type] || type;
  }

  // Parse props from the user format
  private parseProps(props: any, style: any): any {
    const parsedProps: any = { ...props };
    
    // Convert text content to children for text components
    if (props?.content) {
      parsedProps.children = props.content;
      delete parsedProps.content;
    }
    
    // Convert button content to children
    if (props?.content && parsedProps.type === 'button') {
      parsedProps.children = props.content;
      delete parsedProps.content;
    }
    
    // Add className from style if needed
    if (props?.className) {
      parsedProps.className = props.className;
    }
    
    return parsedProps;
  }

  // Parse style object to component style
  private parseStyle(styleObj: any): ComponentStyle {
    if (!styleObj) return {};
    
    const combinedStyle: ComponentStyle = {};
    
    // Layout styles
    if (styleObj.layout) {
      combinedStyle.layout = {
        display: styleObj.layout.display,
        flexDirection: styleObj.layout.flexDirection,
        justifyContent: styleObj.layout.justifyContent,
        alignItems: styleObj.layout.alignItems,
        gap: styleObj.layout.gap
      };
    }
    
    // Typography styles  
    if (styleObj.typography) {
      combinedStyle.typography = {
        fontSize: styleObj.typography.fontSize,
        fontWeight: styleObj.typography.fontWeight,
        textAlign: styleObj.typography.textAlign,
        color: styleObj.typography.color,
        lineHeight: styleObj.typography.lineHeight
      };
    }
    
    // Background styles
    if (styleObj.colors?.backgroundColor) {
      combinedStyle.background = {
        color: styleObj.colors.backgroundColor
      };
    }
    
    // Border styles
    if (styleObj.effects?.borderRadius || styleObj.colors?.borderColor) {
      combinedStyle.border = {
        ...(styleObj.colors?.borderColor && { color: styleObj.colors.borderColor }),
        ...(styleObj.effects?.borderRadius && { radius: parseFloat(styleObj.effects.borderRadius) })
      };
    }
    
    // Spacing styles
    if (styleObj.layout?.padding || styleObj.layout?.margin) {
      combinedStyle.spacing = {
        ...(styleObj.layout?.padding && { padding: parseFloat(styleObj.layout.padding) }),
        ...(styleObj.layout?.margin && { margin: parseFloat(styleObj.layout.margin) })
      };
    }
    
    // Sizing styles
    if (styleObj.layout?.maxWidth || styleObj.layout?.width || styleObj.layout?.height) {
      combinedStyle.sizing = {
        ...(styleObj.layout?.maxWidth && { maxWidth: styleObj.layout.maxWidth }),
        ...(styleObj.layout?.width && { width: styleObj.layout.width }),
        ...(styleObj.layout?.height && { height: styleObj.layout.height })
      };
    }
    
    return combinedStyle;
  }

  private async executeBuildSteps(onProgress?: (message: string) => void): Promise<void> {
    const { addComponent } = useAppBuilderStore.getState();

    for (let i = 0; i < this.buildQueue.length; i++) {
      const step = this.buildQueue[i];
      
      console.log(`Building step ${i + 1}/${this.buildQueue.length}:`, step.component);
      
      // Show progress message
      if (onProgress) {
        onProgress(step.message || `Adding ${step.component.type} component...`);
      }

      // Add the component to the canvas
      try {
        if (step.parentId) {
          // Add as child to specific parent
          console.log('Adding as child to parent:', step.parentId);
          addComponent(step.component, step.parentId);
        } else {
          // Add to root level
          console.log('Adding to root level');
          addComponent(step.component);
        }
      } catch (error) {
        console.error('Failed to add component:', error);
        // Continue with other components
      }

      // Minimal delay for React batching
      if (i < this.buildQueue.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }
  }

  private getProgressMessage(component: AppComponent, depth: number): string {
    const typeMessages: Record<string, string> = {
      container: depth === 0 ? 'Creating main container...' : 'Adding layout section...',
      card: 'Building card component...',
      text: 'Adding text content...',
      button: 'Creating interactive button...',
      form: 'Setting up form structure...',
      input: 'Adding input field...',
      image: 'Placing image element...',
      table: 'Building data table...',
      navigation: 'Creating navigation menu...'
    };

    return typeMessages[component.type] || `Adding ${component.type} component...`;
  }

  // Parse pricing card format specifically
  static parsePricingCard(pricingCardData: any): any {
    if (!pricingCardData.components || !Array.isArray(pricingCardData.components)) {
      return pricingCardData;
    }

    // Return the first component which should be the main container
    return pricingCardData.components[0];
  }

  // Helper to validate component structure
  private validateComponent(component: any): boolean {
    return !!(component && component.type && (component.id || component.type));
  }
}

export const progressiveBuilder = new ProgressiveComponentBuilder();