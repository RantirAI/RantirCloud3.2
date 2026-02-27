import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppBuilderStore } from '@/stores/appBuilderStore';

const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface TemplateBlocksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateBlocksDialog({ open, onOpenChange }: TemplateBlocksDialogProps) {
  const { addComponent, selectedComponent, currentProject, currentPage } = useAppBuilderStore();

  const templates = [
    {
      id: 'hero-section',
      name: 'Hero Section',
      description: 'A hero section with heading, text, and button',
      template: {
        type: 'container' as const,
        props: {
          gap: 'lg'
        },
        style: {
          layout: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          },
          spacing: {
            padding: { top: 80, bottom: 80, left: 20, right: 20 }
          },
          background: {
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }
        },
        children: [
          {
            type: 'heading' as const,
            props: {
              content: 'Welcome to Our Platform',
              level: 1
            },
            style: {
              typography: {
                fontSize: '3xl',
                fontWeight: 'bold',
                textAlign: 'center',
                color: '#ffffff'
              },
              spacing: {
                margin: { bottom: 20 }
              }
            }
          },
          {
            type: 'text' as const,
            props: {
              content: 'Build amazing applications with our powerful tools and intuitive interface.'
            },
            style: {
              typography: {
                fontSize: 'lg',
                textAlign: 'center',
                color: '#e5e7eb'
              },
              spacing: {
                margin: { bottom: 30 }
              },
              sizing: {
                maxWidth: '600px'
              }
            }
          },
          {
            type: 'button' as const,
            props: {
              text: 'Get Started',
              variant: 'default',
              size: 'lg'
            },
            style: {
              background: {
                color: '#ffffff'
              },
              typography: {
                color: '#1f2937'
              }
            }
          }
        ]
      }
    },
    {
      id: 'feature-grid',
      name: 'Feature Grid',
      description: 'A 3-column grid of feature cards',
      template: {
        type: 'grid' as const,
        props: {
          gridCols: 3,
          gridGap: 'lg'
        },
        style: {
          spacing: {
            padding: { top: 60, bottom: 60, left: 20, right: 20 }
          }
        },
        children: Array.from({ length: 3 }, (_, i) => ({
          type: 'card' as const,
          props: {
            title: `Feature ${i + 1}`
          },
          style: {
            border: {
              width: 1,
              color: '#e5e7eb',
              radius: 8
            },
            spacing: {
              padding: { top: 30, bottom: 30, left: 20, right: 20 }
            },
            background: {
              color: '#ffffff'
            }
          },
          children: [
            {
              type: 'heading' as const,
              props: {
                content: `Amazing Feature ${i + 1}`,
                level: 3
              },
              style: {
                typography: {
                  fontSize: 'xl',
                  fontWeight: 'semibold'
                },
                spacing: {
                  margin: { bottom: 15 }
                }
              }
            },
            {
              type: 'text' as const,
              props: {
                content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.'
              },
              style: {
                typography: {
                  color: '#6b7280'
                }
              }
            }
          ]
        }))
      }
    },
    {
      id: 'contact-form',
      name: 'Contact Form',
      description: 'A simple contact form with validation',
      template: {
        type: 'container' as const,
        props: {
          gap: 'md'
        },
        style: {
          sizing: {
            maxWidth: '500px'
          },
          spacing: {
            margin: { left: 'auto', right: 'auto' },
            padding: { top: 40, bottom: 40, left: 20, right: 20 }
          }
        },
        children: [
          {
            type: 'heading' as const,
            props: {
              content: 'Contact Us',
              level: 2
            },
            style: {
              typography: {
                fontSize: '2xl',
                fontWeight: 'bold',
                textAlign: 'center'
              },
              spacing: {
                margin: { bottom: 30 }
              }
            }
          },
          {
            type: 'input' as const,
            props: {
              placeholder: 'Your Name',
              inputType: 'text',
              required: true
            },
            style: {
              spacing: {
                margin: { bottom: 20 }
              }
            }
          },
          {
            type: 'input' as const,
            props: {
              placeholder: 'Your Email',
              inputType: 'email',
              required: true
            },
            style: {
              spacing: {
                margin: { bottom: 20 }
              }
            }
          },
          {
            type: 'textarea' as const,
            props: {
              placeholder: 'Your Message',
              rows: 4,
              required: true
            },
            style: {
              spacing: {
                margin: { bottom: 30 }
              }
            }
          },
          {
            type: 'button' as const,
            props: {
              text: 'Send Message',
              variant: 'default',
              fullWidth: true
            }
          }
        ]
      }
    }
  ];

  const handleAddTemplate = (template: any) => {
    const addComponentRecursively = (componentTemplate: any, parentId?: string): string => {
      const componentId = uuidv4();
      const component = {
        id: componentId,
        type: componentTemplate.type,
        props: componentTemplate.props || {},
        style: componentTemplate.style || {},
        children: [],
        actions: [],
        conditions: []
      };

      addComponent(component, parentId);

      // Add children recursively
      if (componentTemplate.children) {
        componentTemplate.children.forEach((child: any) => {
          addComponentRecursively(child, componentId);
        });
      }

      return componentId;
    };

    addComponentRecursively(template.template, selectedComponent);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Component Templates</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="border rounded-lg p-4 space-y-3">
                <div className="h-32 bg-muted rounded border-2 border-dashed flex items-center justify-center">
                  <span className="text-sm text-muted-foreground">Preview</span>
                </div>
                
                <div>
                  <h3 className="font-semibold text-sm">{template.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                </div>
                
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleAddTemplate(template)}
                >
                  Add Template
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}