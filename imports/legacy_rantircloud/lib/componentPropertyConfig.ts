
import { ComponentType } from '@/types/appBuilder';

export type PropertyFieldType = 
  | 'text' 
  | 'number' 
  | 'select' 
  | 'checkbox' 
  | 'color' 
  | 'slider' 
  | 'textarea' 
  | 'url'
  | 'spacing'
  | 'dimension'
  | 'alignment'
  | 'color-advanced'
  | 'variable-binding'
  | 'database-binding'
  | 'interactions'
  | 'border-radius'
  | 'border'
  | 'icon-picker'
  | 'class-selector'
  | 'typography'
  | 'chart-field'
  | 'box-shadows'
  | 'filters'
  | 'transitions'
  | 'transforms'
  | 'items-editor'
  | 'active-item-selector'
  | 'code-editor';

export interface PropertyField {
  name: string;
  label: string;
  type: PropertyFieldType;
  category: 'content' | 'behavior' | 'styling' | 'layout' | 'data' | 'interactions';
  defaultValue?: any;
  options?: { label: string; value: any }[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  description?: string;
  spacingType?: 'padding' | 'margin';
  allowVariableBinding?: boolean;
}

export interface ComponentPropertyConfig {
  [key: string]: PropertyField[];
}

// Common spacing properties for all components
const spacingProperties: PropertyField[] = [
  { name: 'spacingControl', label: 'Padding & Margin', type: 'spacing', category: 'layout', spacingType: 'padding', defaultValue: { 
    margin: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px' },
    padding: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px' }
  } }
];

// Common class properties for all components
const classProperties: PropertyField[] = [
  { name: 'classes', label: 'Classes', type: 'class-selector', category: 'styling', defaultValue: [] }
];

const sizingProperties: PropertyField[] = [
  { name: 'width', label: 'Width', type: 'dimension', category: 'layout', defaultValue: { value: 'auto', unit: 'auto' } },
  { name: 'height', label: 'Height', type: 'dimension', category: 'layout', defaultValue: { value: 'auto', unit: 'auto' } },
  { name: 'minWidth', label: 'Min Width', type: 'dimension', category: 'layout', defaultValue: { value: '0', unit: 'px' } },
  { name: 'minHeight', label: 'Min Height', type: 'dimension', category: 'layout', defaultValue: { value: '0', unit: 'px' } },
  { name: 'maxWidth', label: 'Max Width', type: 'dimension', category: 'layout', defaultValue: { value: 'none', unit: 'auto' } },
  { name: 'maxHeight', label: 'Max Height', type: 'dimension', category: 'layout', defaultValue: { value: 'none', unit: 'auto' } }
];

// Layout properties
const layoutProperties: PropertyField[] = [
  { name: 'display', label: 'Display', type: 'select', category: 'layout', defaultValue: 'block', options: [
    { label: 'Block', value: 'block' },
    { label: 'Inline', value: 'inline' },
    { label: 'Inline Block', value: 'inline-block' },
    { label: 'Flex', value: 'flex' },
    { label: 'Inline Flex', value: 'inline-flex' },
    { label: 'Grid', value: 'grid' },
    { label: 'Inline Grid', value: 'inline-grid' },
    { label: 'None', value: 'none' }
  ]}
];

// Flex child properties
const flexChildProperties: PropertyField[] = [
  { name: 'alignSelf', label: 'Align Self', type: 'select', category: 'layout', defaultValue: 'auto', options: [
    { label: 'Auto', value: 'auto' },
    { label: 'Flex Start', value: 'flex-start' },
    { label: 'Center', value: 'center' },
    { label: 'Flex End', value: 'flex-end' },
    { label: 'Stretch', value: 'stretch' },
    { label: 'Baseline', value: 'baseline' }
  ]},
  { name: 'justifySelf', label: 'Justify Self', type: 'select', category: 'layout', defaultValue: 'auto', options: [
    { label: 'Auto', value: 'auto' },
    { label: 'Flex Start', value: 'flex-start' },
    { label: 'Center', value: 'center' },
    { label: 'Flex End', value: 'flex-end' },
    { label: 'Stretch', value: 'stretch' }
  ]},
  { name: 'flexGrow', label: 'Flex Grow', type: 'number', category: 'layout', defaultValue: 0, min: 0, max: 10 },
  { name: 'flexShrink', label: 'Flex Shrink', type: 'number', category: 'layout', defaultValue: 1, min: 0, max: 10 },
  { name: 'flexBasis', label: 'Flex Basis', type: 'dimension', category: 'layout', defaultValue: { value: 'auto', unit: 'auto' } },
  { name: 'order', label: 'Order', type: 'number', category: 'layout', defaultValue: 0, min: -100, max: 100 }
];

// Background properties
const backgroundProperties: PropertyField[] = [
  { name: 'backgroundColor', label: 'BG Color', type: 'color-advanced', category: 'styling', defaultValue: 'transparent' },
  { name: 'backgroundGradient', label: 'Gradient', type: 'text', category: 'styling', defaultValue: '', placeholder: 'linear-gradient(...)' },
  { name: 'backgroundImage', label: 'BG Image', type: 'url', category: 'styling', defaultValue: '', placeholder: 'Enter image URL' }
];

// Border properties
const borderProperties: PropertyField[] = [
  { 
    name: 'border', 
    label: 'Borders', 
    type: 'border', 
    category: 'styling', 
    defaultValue: { 
      width: '0', 
      style: 'none', 
      color: '#000000', 
      unit: 'px',
      sides: { top: false, right: false, bottom: false, left: false }
    }
  },
  { name: 'borderRadius', label: 'Border Radius', type: 'border-radius', category: 'styling', defaultValue: { topLeft: '0', topRight: '0', bottomRight: '0', bottomLeft: '0', unit: 'px' } }
];

// Effects properties
const effectsProperties: PropertyField[] = [
  { name: 'boxShadow', label: 'Box Shadow', type: 'select', category: 'styling', defaultValue: 'none', options: [
    { label: 'None', value: 'none' },
    { label: 'Small', value: 'sm' },
    { label: 'Medium', value: 'md' },
    { label: 'Large', value: 'lg' },
    { label: 'Extra Large', value: 'xl' }
  ]},
  { name: 'shadowX', label: 'Shadow X', type: 'number', category: 'styling', defaultValue: 0, min: -50, max: 50 },
  { name: 'shadowY', label: 'Shadow Y', type: 'number', category: 'styling', defaultValue: 0, min: -50, max: 50 },
  { name: 'shadowBlur', label: 'Shadow Blur', type: 'number', category: 'styling', defaultValue: 0, min: 0, max: 100 },
  { name: 'shadowSpread', label: 'Shadow Spread', type: 'number', category: 'styling', defaultValue: 0, min: -50, max: 50 },
  { name: 'shadowColor', label: 'Shadow Color', type: 'color-advanced', category: 'styling', defaultValue: 'rgba(0,0,0,0.1)' },
  { name: 'blurAmount', label: 'Blur', type: 'number', category: 'styling', defaultValue: 0, min: 0, max: 20 }
];

// Transform properties
const transformProperties: PropertyField[] = [
  { name: 'translateX', label: 'Translate X', type: 'number', category: 'styling', defaultValue: 0, min: -500, max: 500 },
  { name: 'translateY', label: 'Translate Y', type: 'number', category: 'styling', defaultValue: 0, min: -500, max: 500 },
  { name: 'skewX', label: 'Skew X', type: 'number', category: 'styling', defaultValue: 0, min: -45, max: 45 },
  { name: 'skewY', label: 'Skew Y', type: 'number', category: 'styling', defaultValue: 0, min: -45, max: 45 },
  { name: 'rotate', label: 'Rotate', type: 'number', category: 'styling', defaultValue: 0, min: -360, max: 360 },
  { name: 'scale', label: 'Scale', type: 'number', category: 'styling', defaultValue: 100, min: 10, max: 500 }
];

// Position properties
const positionProperties: PropertyField[] = [
  { name: 'position', label: 'Position', type: 'select', category: 'layout', defaultValue: 'static', options: [
    { label: 'Static', value: 'static' },
    { label: 'Relative', value: 'relative' },
    { label: 'Absolute', value: 'absolute' },
    { label: 'Fixed', value: 'fixed' },
    { label: 'Sticky', value: 'sticky' }
  ]},
  { name: 'top', label: 'Top', type: 'dimension', category: 'layout', defaultValue: { value: 'auto', unit: 'auto' } },
  { name: 'right', label: 'Right', type: 'dimension', category: 'layout', defaultValue: { value: 'auto', unit: 'auto' } },
  { name: 'bottom', label: 'Bottom', type: 'dimension', category: 'layout', defaultValue: { value: 'auto', unit: 'auto' } },
  { name: 'left', label: 'Left', type: 'dimension', category: 'layout', defaultValue: { value: 'auto', unit: 'auto' } },
  { name: 'zIndex', label: 'Z Index', type: 'number', category: 'layout', defaultValue: 'auto', min: -1000, max: 1000 }
];

// 3D Transform properties
const transform3DProperties: PropertyField[] = [
  { name: 'rotateX', label: '3D Rotate X', type: 'number', category: 'styling', defaultValue: 0, min: -360, max: 360 },
  { name: 'rotateY', label: '3D Rotate Y', type: 'number', category: 'styling', defaultValue: 0, min: -360, max: 360 },
  { name: 'rotateZ', label: '3D Rotate Z', type: 'number', category: 'styling', defaultValue: 0, min: -360, max: 360 },
  { name: 'perspective', label: 'Perspective', type: 'number', category: 'styling', defaultValue: 1000, min: 100, max: 5000 }
];

export const componentPropertyConfig: ComponentPropertyConfig = {
  text: [
    { name: 'content', label: 'Content', type: 'variable-binding', category: 'content', defaultValue: 'Sample text', placeholder: 'Enter text content', allowVariableBinding: true },
    { name: 'tag', label: 'HTML Tag', type: 'select', category: 'content', defaultValue: 'p', options: [
      { label: 'Paragraph', value: 'p' },
      { label: 'Span', value: 'span' },
      { label: 'Div', value: 'div' }
    ]},
    { 
      name: 'typography', 
      label: 'Typography', 
      type: 'typography', 
      category: 'styling', 
      defaultValue: {
        fontFamily: 'Inter, sans-serif',
        fontSize: '16',
        fontWeight: '400',
        lineHeight: '1.5',
        textAlign: 'left',
        fontStyle: 'normal',
        textDecoration: 'none',
        letterSpacing: '0',
        textTransform: 'none',
        color: '#000000'
      }
    },
    { name: 'clickActions', label: 'Click Actions', type: 'interactions', category: 'interactions', defaultValue: [] },
    ...classProperties,
    ...layoutProperties,
    ...positionProperties,
    ...flexChildProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...effectsProperties,
    ...transformProperties,
    ...transform3DProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  heading: [
    { name: 'content', label: 'Content', type: 'variable-binding', category: 'content', defaultValue: 'Sample Heading', placeholder: 'Enter heading text', allowVariableBinding: true },
    { name: 'level', label: 'Heading Level', type: 'select', category: 'content', defaultValue: 1, options: [
      { label: 'H1', value: 1 },
      { label: 'H2', value: 2 },
      { label: 'H3', value: 3 },
      { label: 'H4', value: 4 },
      { label: 'H5', value: 5 },
      { label: 'H6', value: 6 }
    ]},
    { 
      name: 'typography', 
      label: 'Typography', 
      type: 'typography', 
      category: 'styling', 
      defaultValue: {
        fontFamily: 'Inter, sans-serif',
        fontSize: '24',
        fontWeight: '600',
        lineHeight: '1.3',
        textAlign: 'left',
        fontStyle: 'normal',
        textDecoration: 'none',
        letterSpacing: '0',
        textTransform: 'none',
        color: '#000000'
      }
    },
    { name: 'clickActions', label: 'Click Actions', type: 'interactions', category: 'interactions', defaultValue: [] },
    ...classProperties,
    ...layoutProperties,
    ...positionProperties,
    ...flexChildProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...effectsProperties,
    ...transformProperties,
    ...transform3DProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  button: [
    { name: 'text', label: 'Button Text', type: 'variable-binding', category: 'content', defaultValue: 'Button', placeholder: 'Enter button text', allowVariableBinding: true },
    { name: 'icon', label: 'Icon', type: 'icon-picker', category: 'content', defaultValue: '' },
    { name: 'iconPosition', label: 'Icon Position', type: 'select', category: 'content', defaultValue: 'left', options: [
      { label: 'Before Text', value: 'left' },
      { label: 'After Text', value: 'right' }
    ]},
    { name: 'variant', label: 'Variant', type: 'select', category: 'styling', defaultValue: 'default', options: [
      { label: 'Default', value: 'default' },
      { label: 'Destructive', value: 'destructive' },
      { label: 'Outline', value: 'outline' },
      { label: 'Secondary', value: 'secondary' },
      { label: 'Ghost', value: 'ghost' },
      { label: 'Link', value: 'link' }
    ]},
    { name: 'size', label: 'Size', type: 'select', category: 'styling', defaultValue: 'sm', options: [
      { label: 'Small', value: 'sm' },
      { label: 'Default', value: 'default' },
      { label: 'Large', value: 'lg' },
      { label: 'Icon', value: 'icon' }
    ]},
    { name: 'backgroundColor', label: 'Background Color', type: 'color-advanced', category: 'styling', defaultValue: 'hsl(var(--primary))' },
    { 
      name: 'typography', 
      label: 'Typography', 
      type: 'typography', 
      category: 'styling', 
      defaultValue: {
        fontFamily: 'Inter, sans-serif',
        fontSize: '14',
        fontWeight: '500',
        lineHeight: '1.5',
        textAlign: 'center',
        fontStyle: 'normal',
        textDecoration: 'none',
        letterSpacing: '0',
        textTransform: 'none',
        color: 'hsl(var(--primary-foreground))'
      }
    },
    { name: 'disabled', label: 'Disabled', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'fullWidth', label: 'Full Width', type: 'checkbox', category: 'layout', defaultValue: false },
    { name: 'clickActions', label: 'Click Actions', type: 'interactions', category: 'interactions', defaultValue: [] },
    ...classProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...effectsProperties,
    ...layoutProperties,
    ...flexChildProperties,
    ...sizingProperties,
    { name: 'spacingControl', label: 'Padding & Margin', type: 'spacing', category: 'layout', spacingType: 'padding', defaultValue: { 
      margin: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px' },
      padding: { top: '0', right: '10', bottom: '0', left: '10', unit: 'px' }
    }}
  ],

  input: [
    { name: 'label', label: 'Label', type: 'text', category: 'content', defaultValue: '', placeholder: 'Enter field label' },
    { name: 'placeholder', label: 'Placeholder', type: 'text', category: 'content', defaultValue: 'Enter text...', placeholder: 'Enter placeholder text' },
    { name: 'inputType', label: 'Input Type', type: 'select', category: 'behavior', defaultValue: 'text', options: [
      { label: 'Text', value: 'text' },
      { label: 'Email', value: 'email' },
      { label: 'Password', value: 'password' },
      { label: 'Number', value: 'number' },
      { label: 'Tel', value: 'tel' },
      { label: 'URL', value: 'url' }
    ]},
    { name: 'defaultValue', label: 'Default Value', type: 'text', category: 'content', defaultValue: '', placeholder: 'Enter default value' },
    { name: 'required', label: 'Required', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'disabled', label: 'Disabled', type: 'checkbox', category: 'behavior', defaultValue: false },
    ...classProperties,
    ...layoutProperties,
    ...flexChildProperties,
    ...backgroundProperties,
    ...sizingProperties,
    ...borderProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  textarea: [
    { name: 'label', label: 'Label', type: 'text', category: 'content', defaultValue: '', placeholder: 'Enter field label' },
    { name: 'placeholder', label: 'Placeholder', type: 'text', category: 'content', defaultValue: 'Enter text...', placeholder: 'Enter placeholder text' },
    { name: 'rows', label: 'Rows', type: 'number', category: 'layout', defaultValue: 3, min: 1, max: 20 },
    { name: 'defaultValue', label: 'Default Value', type: 'textarea', category: 'content', defaultValue: '', placeholder: 'Enter default content' },
    { name: 'required', label: 'Required', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'disabled', label: 'Disabled', type: 'checkbox', category: 'behavior', defaultValue: false },
    ...classProperties,
    ...layoutProperties,
    ...flexChildProperties,
    ...backgroundProperties,
    ...sizingProperties,
    ...borderProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  section: [
    { name: 'gap', label: 'Gap', type: 'select', category: 'layout', defaultValue: 'none', options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
      { label: 'Extra Large', value: 'xl' }
    ]},
    { name: 'alignment', label: 'Alignment', type: 'select', category: 'layout', defaultValue: 'start', options: [
      { label: 'Start', value: 'start' },
      { label: 'Center', value: 'center' },
      { label: 'End', value: 'end' },
      { label: 'Stretch', value: 'stretch' }
    ]},
    ...classProperties,
    ...layoutProperties,
    ...flexChildProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...effectsProperties,
    ...transformProperties,
    ...transform3DProperties,
    ...positionProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  div: [
    ...classProperties,
    ...layoutProperties,
    ...flexChildProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...effectsProperties,
    ...transformProperties,
    ...transform3DProperties,
    ...positionProperties,
    // Div-specific sizing - defaults to auto so imported components don't get overridden
    { name: 'width', label: 'Width', type: 'dimension', category: 'layout', defaultValue: { value: 'auto', unit: 'auto' } },
    { name: 'height', label: 'Height', type: 'dimension', category: 'layout', defaultValue: { value: 'auto', unit: 'auto' } },
    { name: 'minWidth', label: 'Min Width', type: 'dimension', category: 'layout', defaultValue: { value: '0', unit: 'px' } },
    { name: 'minHeight', label: 'Min Height', type: 'dimension', category: 'layout', defaultValue: { value: '0', unit: 'px' } },
    { name: 'maxWidth', label: 'Max Width', type: 'dimension', category: 'layout', defaultValue: { value: 'none', unit: 'auto' } },
    { name: 'maxHeight', label: 'Max Height', type: 'dimension', category: 'layout', defaultValue: { value: 'none', unit: 'auto' } },
    ...spacingProperties
  ],

  container: [
    { name: 'gap', label: 'Gap', type: 'select', category: 'layout', defaultValue: 'none', options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
      { label: 'Extra Large', value: 'xl' }
    ]},
    { name: 'alignment', label: 'Alignment', type: 'select', category: 'layout', defaultValue: 'start', options: [
      { label: 'Start', value: 'start' },
      { label: 'Center', value: 'center' },
      { label: 'End', value: 'end' },
      { label: 'Stretch', value: 'stretch' }
    ]},
    ...classProperties,
    ...layoutProperties,
    ...flexChildProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...effectsProperties,
    ...transformProperties,
    ...transform3DProperties,
    ...positionProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  row: [
    { name: 'gap', label: 'Gap', type: 'select', category: 'layout', defaultValue: 'none', options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
      { label: 'Extra Large', value: 'xl' }
    ]},
    { name: 'alignment', label: 'Vertical Alignment', type: 'select', category: 'layout', defaultValue: 'start', options: [
      { label: 'Start', value: 'start' },
      { label: 'Center', value: 'center' },
      { label: 'End', value: 'end' },
      { label: 'Stretch', value: 'stretch' }
    ]},
    { name: 'justification', label: 'Horizontal Alignment', type: 'select', category: 'layout', defaultValue: 'start', options: [
      { label: 'Start', value: 'start' },
      { label: 'Center', value: 'center' },
      { label: 'End', value: 'end' },
      { label: 'Between', value: 'between' },
      { label: 'Around', value: 'around' },
      { label: 'Evenly', value: 'evenly' }
    ]},
    ...classProperties,
    ...layoutProperties,
    ...flexChildProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...effectsProperties,
    ...transformProperties,
    ...transform3DProperties,
    ...positionProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  column: [
    { name: 'gap', label: 'Gap', type: 'select', category: 'layout', defaultValue: 'none', options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
      { label: 'Extra Large', value: 'xl' }
    ]},
    { name: 'alignment', label: 'Horizontal Alignment', type: 'select', category: 'layout', defaultValue: 'start', options: [
      { label: 'Start', value: 'start' },
      { label: 'Center', value: 'center' },
      { label: 'End', value: 'end' },
      { label: 'Stretch', value: 'stretch' }
    ]},
    { name: 'justification', label: 'Vertical Alignment', type: 'select', category: 'layout', defaultValue: 'start', options: [
      { label: 'Start', value: 'start' },
      { label: 'Center', value: 'center' },
      { label: 'End', value: 'end' },
      { label: 'Between', value: 'between' },
      { label: 'Around', value: 'around' },
      { label: 'Evenly', value: 'evenly' }
    ]},
    ...classProperties,
    ...layoutProperties,
    ...flexChildProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...effectsProperties,
    ...transformProperties,
    ...transform3DProperties,
    ...positionProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  grid: [
    { name: 'gridCols', label: 'Columns', type: 'select', category: 'layout', defaultValue: 2, options: [
      { label: '1 Column', value: 1 },
      { label: '2 Columns', value: 2 },
      { label: '3 Columns', value: 3 },
      { label: '4 Columns', value: 4 },
      { label: '6 Columns', value: 6 },
      { label: '12 Columns', value: 12 }
    ]},
    { name: 'gridGap', label: 'Gap', type: 'select', category: 'layout', defaultValue: 'md', options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
      { label: 'Extra Large', value: 'xl' }
    ]},
    ...classProperties,
    ...layoutProperties,
    ...flexChildProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...effectsProperties,
    ...transformProperties,
    ...transform3DProperties,
    ...positionProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  image: [
    { name: 'src', label: 'Image URL', type: 'url', category: 'content', defaultValue: '/placeholder.svg', placeholder: 'Enter image URL' },
    { name: 'alt', label: 'Alt Text', type: 'text', category: 'content', defaultValue: 'Image', placeholder: 'Enter alt text' },
    { name: 'objectFit', label: 'Image Style', type: 'select', category: 'styling', defaultValue: 'cover', options: [
      { label: 'Cover', value: 'cover' },
      { label: 'Contain', value: 'contain' },
      { label: 'Fill', value: 'fill' },
      { label: 'None', value: 'none' },
      { label: 'Scale Down', value: 'scale-down' }
    ]},
    { name: 'lazy', label: 'Lazy Loading', type: 'checkbox', category: 'behavior', defaultValue: true },
    ...classProperties,
    ...layoutProperties,
    ...flexChildProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...effectsProperties,
    ...positionProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  video: [
    { name: 'src', label: 'Video URL', type: 'url', category: 'content', defaultValue: '', placeholder: 'Enter video URL (MP4, WebM, etc.)' },
    { name: 'poster', label: 'Poster Image', type: 'url', category: 'content', defaultValue: '', placeholder: 'Thumbnail before playback' },
    { name: 'controls', label: 'Show Controls', type: 'checkbox', category: 'behavior', defaultValue: true },
    { name: 'autoplay', label: 'Autoplay', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'loop', label: 'Loop', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'muted', label: 'Muted', type: 'checkbox', category: 'behavior', defaultValue: false },
    ...classProperties,
    ...layoutProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...effectsProperties,
    ...positionProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  audio: [
    { name: 'src', label: 'Audio URL', type: 'url', category: 'content', defaultValue: '', placeholder: 'Enter audio URL (MP3, WAV, etc.)' },
    { name: 'controls', label: 'Show Controls', type: 'checkbox', category: 'behavior', defaultValue: true },
    { name: 'autoplay', label: 'Autoplay', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'loop', label: 'Loop', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'muted', label: 'Muted', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'preload', label: 'Preload', type: 'select', category: 'behavior', defaultValue: 'metadata', options: [
      { label: 'None', value: 'none' },
      { label: 'Metadata', value: 'metadata' },
      { label: 'Auto', value: 'auto' }
    ]},
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  card: [
    { name: 'title', label: 'Title', type: 'variable-binding', category: 'content', defaultValue: '', placeholder: 'Enter card title', allowVariableBinding: true },
    { name: 'dataSource', label: 'Data Source', type: 'database-binding', category: 'data', description: 'Connect to display database record' },
    { name: 'showAllFields', label: 'Show All Fields', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'cardActions', label: 'Card Actions', type: 'interactions', category: 'interactions', defaultValue: [] },
    ...classProperties,
    ...layoutProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...effectsProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  checkbox: [
    { name: 'label', label: 'Label', type: 'text', category: 'content', defaultValue: 'Checkbox', placeholder: 'Enter label text' },
    { name: 'checked', label: 'Checked', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'disabled', label: 'Disabled', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'required', label: 'Required', type: 'checkbox', category: 'behavior', defaultValue: false },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  radio: [
    { name: 'options', label: 'Options (one per line)', type: 'textarea', category: 'content', defaultValue: 'Option 1\nOption 2\nOption 3', placeholder: 'Enter options, one per line' },
    { name: 'defaultValue', label: 'Default Selection', type: 'text', category: 'behavior', defaultValue: '', placeholder: 'Enter default option' },
    { name: 'orientation', label: 'Orientation', type: 'select', category: 'layout', defaultValue: 'vertical', options: [
      { label: 'Vertical', value: 'vertical' },
      { label: 'Horizontal', value: 'horizontal' }
    ]},
    { name: 'disabled', label: 'Disabled', type: 'checkbox', category: 'behavior', defaultValue: false },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  select: [
    { name: 'label', label: 'Label', type: 'text', category: 'content', defaultValue: '', placeholder: 'Enter field label' },
    { name: 'placeholder', label: 'Placeholder', type: 'text', category: 'content', defaultValue: 'Select an option', placeholder: 'Enter placeholder text' },
    { name: 'options', label: 'Options (one per line)', type: 'textarea', category: 'content', defaultValue: 'Option 1\nOption 2\nOption 3', placeholder: 'Enter options, one per line' },
    { name: 'defaultValue', label: 'Default Selection', type: 'text', category: 'behavior', defaultValue: '', placeholder: 'Enter default option' },
    { name: 'disabled', label: 'Disabled', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'required', label: 'Required', type: 'checkbox', category: 'behavior', defaultValue: false },
    ...classProperties,
    ...layoutProperties,
    ...flexChildProperties,
    ...sizingProperties,
    ...borderProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  switch: [
    { name: 'label', label: 'Label', type: 'text', category: 'content', defaultValue: 'Switch', placeholder: 'Enter label text' },
    { name: 'checked', label: 'Checked', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'disabled', label: 'Disabled', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'size', label: 'Size', type: 'select', category: 'styling', defaultValue: 'default', options: [
      { label: 'Small', value: 'sm' },
      { label: 'Default', value: 'default' },
      { label: 'Large', value: 'lg' }
    ]},
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  slider: [
    { name: 'min', label: 'Minimum', type: 'number', category: 'behavior', defaultValue: 0 },
    { name: 'max', label: 'Maximum', type: 'number', category: 'behavior', defaultValue: 100 },
    { name: 'step', label: 'Step', type: 'number', category: 'behavior', defaultValue: 1, min: 0.1 },
    { name: 'defaultValue', label: 'Default Value', type: 'number', category: 'behavior', defaultValue: 50 },
    { name: 'disabled', label: 'Disabled', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'showValue', label: 'Show Value', type: 'checkbox', category: 'behavior', defaultValue: true },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  alert: [
    { name: 'title', label: 'Title', type: 'text', category: 'content', defaultValue: '', placeholder: 'Enter alert title' },
    { name: 'description', label: 'Description', type: 'textarea', category: 'content', defaultValue: 'This is an alert message', placeholder: 'Enter alert description' },
    { name: 'variant', label: 'Variant', type: 'select', category: 'styling', defaultValue: 'default', options: [
      { label: 'Default', value: 'default' },
      { label: 'Destructive', value: 'destructive' }
    ]},
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  badge: [
    { name: 'text', label: 'Text', type: 'text', category: 'content', defaultValue: 'Badge', placeholder: 'Enter badge text' },
    { name: 'variant', label: 'Variant', type: 'select', category: 'styling', defaultValue: 'default', options: [
      { label: 'Default', value: 'default' },
      { label: 'Secondary', value: 'secondary' },
      { label: 'Destructive', value: 'destructive' },
      { label: 'Outline', value: 'outline' }
    ]},
    { name: 'size', label: 'Size', type: 'select', category: 'styling', defaultValue: 'default', options: [
      { label: 'Small', value: 'sm' },
      { label: 'Default', value: 'default' },
      { label: 'Large', value: 'lg' }
    ]},
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  progress: [
    { name: 'value', label: 'Value', type: 'slider', category: 'behavior', defaultValue: 33, min: 0, max: 100 },
    { name: 'max', label: 'Maximum', type: 'number', category: 'behavior', defaultValue: 100, min: 1 },
    { name: 'showValue', label: 'Show Value', type: 'checkbox', category: 'behavior', defaultValue: true },
    { name: 'animated', label: 'Animated', type: 'checkbox', category: 'behavior', defaultValue: false },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  avatar: [
    { name: 'src', label: 'Image URL', type: 'url', category: 'content', defaultValue: '', placeholder: 'Enter image URL' },
    { name: 'fallback', label: 'Fallback Text', type: 'text', category: 'content', defaultValue: 'U', placeholder: 'Enter fallback text' },
    { name: 'size', label: 'Size', type: 'select', category: 'styling', defaultValue: 'default', options: [
      { label: 'Small', value: 'sm' },
      { label: 'Default', value: 'default' },
      { label: 'Large', value: 'lg' },
      { label: 'Extra Large', value: 'xl' }
    ]},
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  label: [
    { name: 'text', label: 'Text', type: 'text', category: 'content', defaultValue: 'Label', placeholder: 'Enter label text' },
    { name: 'htmlFor', label: 'For (HTML ID)', type: 'text', category: 'behavior', defaultValue: '', placeholder: 'Enter target input ID' },
    { name: 'required', label: 'Required Indicator', type: 'checkbox', category: 'behavior', defaultValue: false },
    { 
      name: 'typography', 
      label: 'Typography', 
      type: 'typography', 
      category: 'styling', 
      defaultValue: {
        fontFamily: 'Inter, sans-serif',
        fontSize: '14',
        fontWeight: '500',
        lineHeight: '1.5',
        textAlign: 'left',
        color: '#000000',
        fontStyle: 'normal',
        textDecoration: 'none',
        letterSpacing: '0',
        textTransform: 'none'
      }
    },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  separator: [
    { name: 'lineStyle', label: 'Line Style', type: 'select', category: 'content', defaultValue: 'solid', options: [
      { label: 'Solid', value: 'solid' },
      { label: 'Dotted', value: 'dotted' },
      { label: 'Dashed', value: 'dashed' }
    ]},
    ...classProperties,
    ...layoutProperties,
    ...positionProperties,
    ...flexChildProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...effectsProperties,
    ...transformProperties,
    ...transform3DProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  icon: [
    { name: 'iconName', label: 'Icon', type: 'icon-picker', category: 'content', defaultValue: 'Home2' },
    { name: 'iconVariant', label: 'Icon Style', type: 'select', category: 'content', defaultValue: 'Bold', options: [
      { label: 'Linear', value: 'Linear' },
      { label: 'Outline', value: 'Outline' },
      { label: 'Bold', value: 'Bold' },
      { label: 'Bulk', value: 'Bulk' },
      { label: 'Broken', value: 'Broken' },
      { label: 'TwoTone', value: 'TwoTone' }
    ]},
    { name: 'clickActions', label: 'Click Actions', type: 'interactions', category: 'interactions', defaultValue: [] },
    ...classProperties,
    ...layoutProperties,
    ...positionProperties,
    ...flexChildProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...effectsProperties,
    ...transformProperties,
    ...transform3DProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  // Data Display Components
  'data-table': [
    { name: 'title', label: 'Table Title', type: 'variable-binding', category: 'content', defaultValue: 'Data Table', allowVariableBinding: true },
    { name: 'dataSource', label: 'Data Source', type: 'database-binding', category: 'data', description: 'Connect to a database table' },
    { name: 'columns', label: 'Visible Columns', type: 'select', category: 'data', defaultValue: 'all', options: [
      { label: 'All Columns', value: 'all' },
      { label: 'Custom Selection', value: 'custom' }
    ]},
    { name: 'itemsPerPage', label: 'Items Per Page', type: 'number', category: 'behavior', defaultValue: 10, min: 1, max: 100 },
    { name: 'showSearch', label: 'Show Search', type: 'checkbox', category: 'behavior', defaultValue: true },
    { name: 'showPagination', label: 'Show Pagination', type: 'checkbox', category: 'behavior', defaultValue: true },
    { name: 'allowSorting', label: 'Allow Sorting', type: 'checkbox', category: 'behavior', defaultValue: true },
    { name: 'rowActions', label: 'Row Actions', type: 'interactions', category: 'interactions', defaultValue: [] },
    ...classProperties,
    ...effectsProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  'datatable': [
    { name: 'title', label: 'Table Title', type: 'variable-binding', category: 'content', defaultValue: 'Data Table', allowVariableBinding: true },
    { name: 'dataSource', label: 'Data Source', type: 'database-binding', category: 'data', description: 'Connect to a database table' },
    { name: 'columns', label: 'Visible Columns', type: 'select', category: 'data', defaultValue: 'all', options: [
      { label: 'All Columns', value: 'all' },
      { label: 'Custom Selection', value: 'custom' }
    ]},
    { name: 'itemsPerPage', label: 'Items Per Page', type: 'number', category: 'behavior', defaultValue: 10, min: 1, max: 100 },
    { name: 'showSearch', label: 'Show Search', type: 'checkbox', category: 'behavior', defaultValue: true },
    { name: 'showPagination', label: 'Show Pagination', type: 'checkbox', category: 'behavior', defaultValue: true },
    { name: 'allowSorting', label: 'Allow Sorting', type: 'checkbox', category: 'behavior', defaultValue: true },
    { name: 'rowActions', label: 'Row Actions', type: 'interactions', category: 'interactions', defaultValue: [] },
    ...classProperties,
    ...effectsProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  chart: [
    // Content Properties
    { name: 'title', label: 'Chart Title', type: 'variable-binding', category: 'content', defaultValue: 'Advanced Chart', allowVariableBinding: true },
    { name: 'subtitle', label: 'Subtitle', type: 'variable-binding', category: 'content', defaultValue: '', allowVariableBinding: true, placeholder: 'Optional chart subtitle' },
    
    // Data Properties - use chart-field type for automatic field dropdowns
    { name: 'dataSource', label: 'Data Source', type: 'database-binding', category: 'data', description: 'Connect to a database table for chart data' },
    { name: 'xField', label: 'X-Axis Field', type: 'chart-field', category: 'data', placeholder: 'Select field for X-axis', description: 'Field to use for categories/labels' },
    { name: 'yField', label: 'Y-Axis Field', type: 'chart-field', category: 'data', placeholder: 'Select field for Y-axis', description: 'Field to use for values' },
    { name: 'y2Field', label: 'Secondary Y-Axis', type: 'chart-field', category: 'data', placeholder: 'Optional second Y-axis', description: 'Optional field for comparison' },
    { name: 'groupByField', label: 'Group By', type: 'chart-field', category: 'data', placeholder: 'Field to group data by', description: 'Optional grouping field' },
    
    // Chart Type
    { name: 'chartType', label: 'Chart Type', type: 'select', category: 'styling', defaultValue: 'bar', options: [
      { label: 'Bar Chart', value: 'bar' },
      { label: 'Stacked Bar Chart', value: 'stacked-bar' },
      { label: 'Line Chart', value: 'line' },
      { label: 'Area Chart', value: 'area' },
      { label: 'Pie Chart', value: 'pie' },
      { label: 'Donut Chart', value: 'donut' },
      { label: 'Scatter Plot', value: 'scatter' },
      { label: 'Radar Chart', value: 'radar' },
      { label: 'Funnel Chart', value: 'funnel' },
      { label: 'Composed Chart', value: 'composed' }
    ]},
    
    // Styling Properties
    { name: 'colorScheme', label: 'Color Scheme', type: 'select', category: 'styling', defaultValue: 'modern', options: [
      { label: 'Modern', value: 'modern' },
      { label: 'Vibrant', value: 'vibrant' },
      { label: 'Pastel', value: 'pastel' },
      { label: 'Professional', value: 'professional' },
      { label: 'Ocean', value: 'ocean' },
      { label: 'Forest', value: 'forest' },
      { label: 'Sunset', value: 'sunset' },
      { label: 'Monochrome', value: 'monochrome' }
    ]},
    { name: 'customColors', label: 'Custom Colors (comma separated)', type: 'text', category: 'styling', placeholder: '#ff0000, #00ff00, #0000ff', description: 'Override color scheme with custom hex colors' },
    { name: 'theme', label: 'Theme', type: 'select', category: 'styling', defaultValue: 'light', options: [
      { label: 'Light', value: 'light' },
      { label: 'Dark', value: 'dark' }
    ]},
    
    // Display Options
    { name: 'showLegend', label: 'Show Legend', type: 'checkbox', category: 'styling', defaultValue: true },
    { name: 'legendPosition', label: 'Legend Position', type: 'select', category: 'styling', defaultValue: 'bottom', options: [
      { label: 'Top', value: 'top' },
      { label: 'Bottom', value: 'bottom' }
    ]},
    { name: 'showGrid', label: 'Show Grid', type: 'checkbox', category: 'styling', defaultValue: true },
    { name: 'showTooltip', label: 'Show Tooltip', type: 'checkbox', category: 'styling', defaultValue: true },
    { name: 'showValues', label: 'Show Values on Chart', type: 'checkbox', category: 'styling', defaultValue: false },
    
    // Axis Labels
    { name: 'xAxisLabel', label: 'X-Axis Label', type: 'text', category: 'styling', defaultValue: '', placeholder: 'X-axis label' },
    { name: 'yAxisLabel', label: 'Y-Axis Label', type: 'text', category: 'styling', defaultValue: '', placeholder: 'Y-axis label' },
    
    // Chart Behavior
    { name: 'animation', label: 'Enable Animation', type: 'checkbox', category: 'behavior', defaultValue: true },
    { name: 'responsive', label: 'Responsive', type: 'checkbox', category: 'behavior', defaultValue: true },
    { name: 'stacked', label: 'Stacked (for applicable charts)', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'curved', label: 'Curved Lines (for line/area charts)', type: 'checkbox', category: 'behavior', defaultValue: false },
    
    // Size
    { name: 'height', label: 'Height (px)', type: 'number', category: 'layout', defaultValue: 400, min: 200, max: 800 },
    
    // Interactions
    { name: 'chartActions', label: 'Chart Actions', type: 'interactions', category: 'interactions', defaultValue: [] },
    
    ...classProperties,
    ...effectsProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  list: [
    { name: 'title', label: 'List Title', type: 'variable-binding', category: 'content', defaultValue: 'List', allowVariableBinding: true },
    { name: 'dataSource', label: 'Data Source', type: 'database-binding', category: 'data', description: 'Connect to a database table for list items' },
    { name: 'itemTemplate', label: 'Item Template', type: 'select', category: 'styling', defaultValue: 'simple', options: [
      { label: 'Simple', value: 'simple' },
      { label: 'Card', value: 'card' },
      { label: 'Detailed', value: 'detailed' }
    ]},
    { name: 'showSearch', label: 'Show Search', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'itemActions', label: 'Item Actions', type: 'interactions', category: 'interactions', defaultValue: [] },
    ...classProperties,
    ...effectsProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  'data-display': [
    { name: 'displayMode', label: 'Display Mode', type: 'select', category: 'behavior', defaultValue: 'list', options: [
      { label: 'List View', value: 'list' },
      { label: 'Card Grid', value: 'cards' },
      { label: 'Table View', value: 'table' }
    ]},
    { name: 'template', label: 'Template', type: 'select', category: 'behavior', defaultValue: 'simple-list', options: [
      { label: 'Simple List', value: 'simple-list' },
      { label: 'Detailed List', value: 'detailed-list' },
      { label: 'Rich List', value: 'rich-list' },
      { label: 'Basic Cards', value: 'basic-cards' },
      { label: 'Image Cards', value: 'image-cards' },
      { label: 'Detailed Cards', value: 'detailed-cards' },
      { label: 'Compact Cards', value: 'compact-cards' },
      { label: 'Data Table', value: 'data-table' }
    ]},
    { name: 'dataSource', label: 'Data Source', type: 'database-binding', category: 'data', description: 'Connect to database table' },
    { name: 'fieldMappings', label: 'Field Mappings', type: 'text', category: 'data', defaultValue: [
      { id: 'title', displayName: 'Title', sourceField: '', type: 'text', visible: true, order: 0 }
    ] },
    { name: 'showSearch', label: 'Show Search', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'showPagination', label: 'Show Pagination', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'itemsPerPage', label: 'Items per Page', type: 'number', category: 'behavior', defaultValue: 10, min: 1, max: 100 },
    { name: 'allowSorting', label: 'Allow Sorting', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'cardsPerRow', label: 'Cards per Row', type: 'number', category: 'layout', defaultValue: 3, min: 1, max: 4 },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  'login-form': [
    { name: 'title', label: 'Title', type: 'text', category: 'content', defaultValue: 'Sign In', placeholder: 'Enter form title' },
    { name: 'description', label: 'Description', type: 'text', category: 'content', defaultValue: '', placeholder: 'Enter form description' },
    { name: 'emailPlaceholder', label: 'Email Placeholder', type: 'text', category: 'content', defaultValue: 'Enter your email', placeholder: 'Email field placeholder' },
    { name: 'passwordPlaceholder', label: 'Password Placeholder', type: 'text', category: 'content', defaultValue: 'Enter your password', placeholder: 'Password field placeholder' },
    { name: 'submitText', label: 'Submit Button Text', type: 'text', category: 'content', defaultValue: 'Sign In', placeholder: 'Submit button text' },
    { name: 'onSuccessAction', label: 'Success Action', type: 'interactions', category: 'interactions', defaultValue: [] },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  'register-form': [
    { name: 'title', label: 'Title', type: 'text', category: 'content', defaultValue: 'Create Account', placeholder: 'Enter form title' },
    { name: 'description', label: 'Description', type: 'text', category: 'content', defaultValue: '', placeholder: 'Enter form description' },
    { name: 'emailPlaceholder', label: 'Email Placeholder', type: 'text', category: 'content', defaultValue: 'Enter your email', placeholder: 'Email field placeholder' },
    { name: 'passwordPlaceholder', label: 'Password Placeholder', type: 'text', category: 'content', defaultValue: 'Create a password', placeholder: 'Password field placeholder' },
    { name: 'submitText', label: 'Submit Button Text', type: 'text', category: 'content', defaultValue: 'Create Account', placeholder: 'Submit button text' },
    { name: 'onSuccessAction', label: 'Success Action', type: 'interactions', category: 'interactions', defaultValue: [] },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  'user-profile': [
    { name: 'title', label: 'Title', type: 'text', category: 'content', defaultValue: 'User Profile', placeholder: 'Enter component title' },
    { name: 'notLoggedInText', label: 'Not Logged In Text', type: 'text', category: 'content', defaultValue: 'Please log in to view your profile', placeholder: 'Text when not logged in' },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  'auth-status': [
    { name: 'loggedInText', label: 'Logged In Text', type: 'text', category: 'content', defaultValue: '', placeholder: 'Text when logged in (leave empty for email)' },
    { name: 'loggedOutText', label: 'Logged Out Text', type: 'text', category: 'content', defaultValue: 'Not signed in', placeholder: 'Text when logged out' },
    { name: 'showStatus', label: 'Show Status Badge', type: 'checkbox', category: 'behavior', defaultValue: false },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  // Dynamic List
  'dynamic-list': [
    { name: 'databaseConnection', label: 'Database Connection', type: 'database-binding', category: 'data', defaultValue: null },
    { name: 'itemsPerPage', label: 'Items Per Page', type: 'number', category: 'behavior', defaultValue: 10, min: 1, max: 100 },
    { name: 'paginationType', label: 'Pagination Type', type: 'select', category: 'behavior', defaultValue: 'numbered', options: [
      { label: 'Numbered', value: 'numbered' },
      { label: 'Load More', value: 'loadMore' },
      { label: 'Infinite Scroll', value: 'infinite' }
    ]},
    { name: 'gap', label: 'Gap', type: 'select', category: 'layout', defaultValue: 'md', options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
      { label: 'Extra Large', value: 'xl' }
    ]},
    { name: 'showSearch', label: 'Show Search', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'showSort', label: 'Show Sort', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'emptyMessage', label: 'Empty Message', type: 'text', category: 'content', defaultValue: 'No items found.' },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  // Pro Dynamic List
  'pro-dynamic-list': [
    { name: 'databaseConnection', label: 'Database Connection', type: 'database-binding', category: 'data', defaultValue: null },
    { name: 'itemsPerPage', label: 'Items Per Page', type: 'number', category: 'behavior', defaultValue: 10, min: 1, max: 100 },
    { name: 'paginationType', label: 'Pagination Type', type: 'select', category: 'behavior', defaultValue: 'numbered', options: [
      { label: 'Numbered', value: 'numbered' },
      { label: 'Load More', value: 'loadMore' },
      { label: 'Infinite Scroll', value: 'infinite' }
    ]},
    { name: 'gap', label: 'Gap', type: 'select', category: 'layout', defaultValue: 'md', options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
      { label: 'Extra Large', value: 'xl' }
    ]},
    { name: 'showSearch', label: 'Show Search', type: 'checkbox', category: 'behavior', defaultValue: true },
    { name: 'showSort', label: 'Show Sort', type: 'checkbox', category: 'behavior', defaultValue: true },
    { name: 'showFilters', label: 'Show Filters', type: 'checkbox', category: 'behavior', defaultValue: true },
    { name: 'showPagination', label: 'Show Pagination', type: 'checkbox', category: 'behavior', defaultValue: true },
    { name: 'showSelection', label: 'Show Selection', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'autoRefresh', label: 'Auto Refresh (seconds)', type: 'number', category: 'behavior', defaultValue: 0, min: 0, max: 300 },
    { name: 'emptyMessage', label: 'Empty Message', type: 'text', category: 'content', defaultValue: 'No items found.' },
    { name: 'viewMode', label: 'Default View Mode', type: 'select', category: 'behavior', defaultValue: 'list', options: [
      { label: 'List', value: 'list' },
      { label: 'Grid', value: 'grid' }
    ]},
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  // Dynamic Grid
  'dynamic-grid': [
    { name: 'databaseConnection', label: 'Database Connection', type: 'database-binding', category: 'data', defaultValue: null },
    { name: 'columns', label: 'Columns', type: 'number', category: 'layout', defaultValue: 3, min: 1, max: 12 },
    { name: 'itemsPerPage', label: 'Items Per Page', type: 'number', category: 'behavior', defaultValue: 12, min: 1, max: 100 },
    { name: 'paginationType', label: 'Pagination Type', type: 'select', category: 'behavior', defaultValue: 'numbered', options: [
      { label: 'Numbered', value: 'numbered' },
      { label: 'Load More', value: 'loadMore' },
      { label: 'Infinite Scroll', value: 'infinite' }
    ]},
    { name: 'gap', label: 'Gap', type: 'select', category: 'layout', defaultValue: 'md', options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
      { label: 'Extra Large', value: 'xl' }
    ]},
    { name: 'showSearch', label: 'Show Search', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'showSort', label: 'Show Sort', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'emptyMessage', label: 'Empty Message', type: 'text', category: 'content', defaultValue: 'No items found.' },
    { name: 'responsiveColumns', label: 'Responsive Columns', type: 'textarea', category: 'layout', defaultValue: JSON.stringify({
      sm: 1,
      md: 2,
      lg: 3,
      xl: 4
    }, null, 2), placeholder: 'JSON object for responsive columns' },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ]
};

componentPropertyConfig['theme-toggle'] = [
  {
    name: 'style',
    label: 'Style',
    type: 'select',
    category: 'content',
    options: [
      { label: 'Button', value: 'button' },
      { label: 'Switch', value: 'switch' },
      { label: 'Segmented', value: 'segmented' }
    ],
    defaultValue: 'button'
  },
  {
    name: 'size',
    label: 'Size',
    type: 'select',
    category: 'content',
    options: [
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' }
    ],
    defaultValue: 'md'
  },
  {
    name: 'showLabels',
    label: 'Show Labels',
    type: 'checkbox',
    category: 'content',
    defaultValue: true
  },
  {
    name: 'orientation',
    label: 'Orientation',
    type: 'select',
    category: 'content',
    options: [
      { label: 'Horizontal', value: 'horizontal' },
      { label: 'Vertical', value: 'vertical' }
    ],
    defaultValue: 'horizontal'
  },
  {
    name: 'lightLabel',
    label: 'Light Mode Label',
    type: 'text',
    category: 'content',
    defaultValue: 'Light',
    placeholder: 'Enter light mode label'
  },
  {
    name: 'darkLabel',
    label: 'Dark Mode Label',
    type: 'text',
    category: 'content',
    defaultValue: 'Dark',
    placeholder: 'Enter dark mode label'
  },
  {
    name: 'systemLabel',
    label: 'System Mode Label',
    type: 'text',
    category: 'content',
    defaultValue: 'Auto',
    placeholder: 'Enter system mode label'
  },
  ...classProperties,
  ...effectsProperties,
  ...spacingProperties
];

// Blockquote component properties
componentPropertyConfig.blockquote = [
  { name: 'content', label: 'Quote Text', type: 'variable-binding', category: 'content', defaultValue: 'Quote text here...', placeholder: 'Enter quote text', allowVariableBinding: true },
  { name: 'citation', label: 'Citation', type: 'text', category: 'content', defaultValue: '', placeholder: 'Author or source' },
  { name: 'color', label: 'Text Color', type: 'color-advanced', category: 'styling', defaultValue: '' },
  { name: 'borderColor', label: 'Border Color', type: 'color-advanced', category: 'styling', defaultValue: '' },
  { name: 'borderWidth', label: 'Border Width', type: 'number', category: 'styling', defaultValue: 4, min: 1, max: 10 },
  { 
    name: 'typography', 
    label: 'Typography', 
    type: 'typography', 
    category: 'styling', 
    defaultValue: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '16',
      fontWeight: '400',
      lineHeight: '1.6',
      textAlign: 'left',
      fontStyle: 'italic',
      textDecoration: 'none',
      letterSpacing: '0',
      textTransform: 'none'
    }
  },
  { name: 'clickActions', label: 'Click Actions', type: 'interactions', category: 'interactions', defaultValue: [] },
  ...classProperties,
  ...layoutProperties,
  ...flexChildProperties,
  ...backgroundProperties,
  ...borderProperties,
  ...effectsProperties,
  ...sizingProperties,
  ...spacingProperties
];

// Inline code component properties - minimal props for inline element
componentPropertyConfig.code = [
  { name: 'content', label: 'Code', type: 'code-editor', category: 'content', defaultValue: '<div>Code</div>', placeholder: 'Enter code' },
  { name: 'backgroundColor', label: 'Background Color', type: 'color-advanced', category: 'styling', defaultValue: '' },
  { name: 'borderRadius', label: 'Border Radius', type: 'border-radius', category: 'styling', defaultValue: { topLeft: '4', topRight: '4', bottomRight: '4', bottomLeft: '4', unit: 'px' } },
  { 
    name: 'typography', 
    label: 'Typography', 
    type: 'typography', 
    category: 'styling', 
    defaultValue: {
      fontFamily: 'monospace',
      fontSize: '14',
      fontWeight: '400',
      lineHeight: '1.4',
      textAlign: 'left',
      fontStyle: 'normal',
      textDecoration: 'none',
      letterSpacing: '0',
      textTransform: 'none'
    }
  },
  ...classProperties,
  ...layoutProperties,
  ...positionProperties,
  ...flexChildProperties,
  ...backgroundProperties,
  ...borderProperties,
  ...effectsProperties,
  ...transformProperties,
  ...transform3DProperties,
  ...sizingProperties,
  ...spacingProperties
];

// Code block component properties - block element with full styling like all other elements
componentPropertyConfig.codeblock = [
  { name: 'content', label: 'Code', type: 'code-editor', category: 'content', defaultValue: 'function example() {\n  return "Hello World";\n}', placeholder: 'Enter code block content' },
  { name: 'showLineNumbers', label: 'Show Line Numbers', type: 'checkbox', category: 'content', defaultValue: false },
  { 
    name: 'typography', 
    label: 'Typography', 
    type: 'typography', 
    category: 'styling', 
    defaultValue: {
      fontFamily: 'monospace',
      fontSize: '14',
      fontWeight: '400',
      lineHeight: '1.5',
      textAlign: 'left',
      fontStyle: 'normal',
      textDecoration: 'none',
      letterSpacing: '0',
      textTransform: 'none'
    }
  },
  ...classProperties,
  ...spacingProperties,
  ...sizingProperties,
  ...positionProperties,
  ...backgroundProperties,
  ...borderProperties,
  ...effectsProperties,
  ...transformProperties,
  ...transform3DProperties,
];

// Link component properties - minimal props for inline link element
componentPropertyConfig.link = [
  { name: 'content', label: 'Link Text', type: 'variable-binding', category: 'content', defaultValue: 'Link text', placeholder: 'Enter link text', allowVariableBinding: true },
  { name: 'href', label: 'URL', type: 'url', category: 'content', defaultValue: '#', placeholder: 'Enter URL or page path' },
  { name: 'target', label: 'Open In', type: 'select', category: 'behavior', defaultValue: '_self', options: [
    { label: 'Same Tab', value: '_self' },
    { label: 'New Tab', value: '_blank' }
  ]},
  { name: 'showIcon', label: 'Show External Icon', type: 'checkbox', category: 'content', defaultValue: false },
  { name: 'color', label: 'Text Color', type: 'color-advanced', category: 'styling', defaultValue: '' },
  { name: 'hoverColor', label: 'Hover Color', type: 'color-advanced', category: 'styling', defaultValue: '' },
  { name: 'underline', label: 'Underline', type: 'select', category: 'styling', defaultValue: 'none', options: [
    { label: 'Always', value: 'always' },
    { label: 'On Hover', value: 'hover' },
    { label: 'Never', value: 'none' }
  ]},
  { 
    name: 'typography', 
    label: 'Typography', 
    type: 'typography', 
    category: 'styling', 
    defaultValue: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '16',
      fontWeight: '400',
      lineHeight: '1.5',
      textAlign: 'left',
      fontStyle: 'normal',
      textDecoration: 'none',
      letterSpacing: '0',
      textTransform: 'none'
    }
  },
  { name: 'clickActions', label: 'Click Actions', type: 'interactions', category: 'interactions', defaultValue: [] },
  ...classProperties,
  ...layoutProperties,
  ...flexChildProperties,
  ...backgroundProperties,
  ...borderProperties,
  ...effectsProperties,
  ...positionProperties,
  ...sizingProperties,
  ...spacingProperties
];

// Form Wrapper - smart form container
componentPropertyConfig['form-wrapper'] = [
  { name: 'formType', label: 'Form Type', type: 'select', category: 'data', defaultValue: 'custom', options: [
    { label: 'Login', value: 'login' },
    { label: 'Register', value: 'register' },
    { label: 'User Profile', value: 'user-profile' },
    { label: 'Contact', value: 'contact' },
    { label: 'Custom', value: 'custom' }
  ]},
  { name: 'autoPopulate', label: 'Auto-populate from Form Type', type: 'checkbox', category: 'data', defaultValue: false, description: 'Automatically generate form fields based on selected form type' },
  { name: 'dataSource', label: 'Load From Database', type: 'database-binding', category: 'data', description: 'Auto-populate from Data Form Builder' },
  { name: 'formAction', label: 'Form Action URL', type: 'url', category: 'data', defaultValue: '', placeholder: 'https://api.example.com/submit' },
  { name: 'formMethod', label: 'Form Method', type: 'select', category: 'data', defaultValue: 'POST', options: [
    { label: 'POST', value: 'POST' },
    { label: 'GET', value: 'GET' },
    { label: 'PUT', value: 'PUT' }
  ]},
  { name: 'submitAction', label: 'Submit Action', type: 'select', category: 'behavior', defaultValue: 'submitForm', options: [
    { label: 'Submit Form', value: 'submitForm' },
    { label: 'Authenticate', value: 'authenticate' },
    { label: 'Register', value: 'register' },
    { label: 'Update Profile', value: 'updateProfile' },
    { label: 'API Call', value: 'apiCall' },
    { label: 'Custom Code', value: 'custom' }
  ]},
  { name: 'validationMode', label: 'Validation Mode', type: 'select', category: 'behavior', defaultValue: 'onSubmit', options: [
    { label: 'On Submit', value: 'onSubmit' },
    { label: 'On Change', value: 'onChange' },
    { label: 'On Blur', value: 'onBlur' }
  ]},
  { name: 'showSuccessMessage', label: 'Show Success Message', type: 'checkbox', category: 'behavior', defaultValue: true },
  { name: 'successMessage', label: 'Success Message', type: 'text', category: 'content', defaultValue: 'Form submitted successfully!', placeholder: 'Success message' },
  { name: 'redirectUrl', label: 'Redirect URL', type: 'url', category: 'behavior', defaultValue: '', placeholder: 'URL after submission' },
  ...classProperties,
  ...layoutProperties,
  ...backgroundProperties,
  ...borderProperties,
  ...effectsProperties,
  ...sizingProperties,
  ...spacingProperties
];

// Form Wizard - multi-step form
componentPropertyConfig['form-wizard'] = [
  { name: 'steps', label: 'Steps (one per line)', type: 'textarea', category: 'data', defaultValue: 'Step 1\nStep 2\nStep 3', placeholder: 'Enter step names' },
  { name: 'currentStep', label: 'Starting Step', type: 'number', category: 'behavior', defaultValue: 0, min: 0 },
  { name: 'stepStyle', label: 'Step Style', type: 'select', category: 'styling', defaultValue: 'numbers', options: [
    { label: 'Numbers', value: 'numbers' },
    { label: 'Dots', value: 'dots' },
    { label: 'Progress Bar', value: 'progress' },
    { label: 'Stepper', value: 'stepper' }
  ]},
  { name: 'navigationStyle', label: 'Navigation Style', type: 'select', category: 'styling', defaultValue: 'buttons', options: [
    { label: 'Buttons', value: 'buttons' },
    { label: 'Arrows', value: 'arrows' },
    { label: 'None', value: 'none' }
  ]},
  { name: 'showStepCount', label: 'Show Step Count', type: 'checkbox', category: 'content', defaultValue: true },
  { name: 'allowStepSkip', label: 'Allow Step Skip', type: 'checkbox', category: 'behavior', defaultValue: false },
  { name: 'validationMode', label: 'Validation Mode', type: 'select', category: 'behavior', defaultValue: 'onStepChange', options: [
    { label: 'On Step Change', value: 'onStepChange' },
    { label: 'On Submit', value: 'onSubmit' }
  ]},
  ...classProperties,
  ...layoutProperties,
  ...backgroundProperties,
  ...borderProperties,
  ...effectsProperties,
  ...sizingProperties,
  ...spacingProperties
];

// Password Input - dedicated password field with toggle
componentPropertyConfig['password-input'] = [
  { name: 'label', label: 'Label', type: 'text', category: 'data', defaultValue: '', placeholder: 'Enter field label' },
  { name: 'placeholder', label: 'Placeholder', type: 'text', category: 'data', defaultValue: 'Enter password...', placeholder: 'Placeholder text' },
  { name: 'defaultValue', label: 'Default Value', type: 'text', category: 'data', defaultValue: '', placeholder: 'Default value' },
  { name: 'showToggle', label: 'Show/Hide Toggle', type: 'checkbox', category: 'content', defaultValue: true },
  { name: 'showStrength', label: 'Strength Indicator', type: 'checkbox', category: 'content', defaultValue: false },
  { name: 'minLength', label: 'Min Length', type: 'number', category: 'behavior', defaultValue: 0, min: 0 },
  { name: 'requireSpecialChars', label: 'Require Special Characters', type: 'checkbox', category: 'behavior', defaultValue: false },
  { name: 'required', label: 'Required', type: 'checkbox', category: 'behavior', defaultValue: false },
  { name: 'disabled', label: 'Disabled', type: 'checkbox', category: 'behavior', defaultValue: false },
  ...classProperties,
  ...layoutProperties,
  ...flexChildProperties,
  ...backgroundProperties,
  ...sizingProperties,
  ...borderProperties,
  ...effectsProperties,
  ...spacingProperties
];

// Radio Group - for form grouping
componentPropertyConfig['radio-group'] = [
  { name: 'groupName', label: 'Group Name', type: 'text', category: 'data', defaultValue: 'radioGroup', placeholder: 'Form field name' },
  { name: 'label', label: 'Label', type: 'text', category: 'data', defaultValue: '', placeholder: 'Group label' },
  { name: 'options', label: 'Options (one per line)', type: 'textarea', category: 'data', defaultValue: 'Option 1\nOption 2\nOption 3', placeholder: 'Enter options' },
  { name: 'defaultValue', label: 'Default Selection', type: 'text', category: 'data', defaultValue: '', placeholder: 'Default value' },
  { name: 'orientation', label: 'Orientation', type: 'select', category: 'layout', defaultValue: 'vertical', options: [
    { label: 'Vertical', value: 'vertical' },
    { label: 'Horizontal', value: 'horizontal' }
  ]},
  { name: 'required', label: 'Required', type: 'checkbox', category: 'behavior', defaultValue: false },
  { name: 'disabled', label: 'Disabled', type: 'checkbox', category: 'behavior', defaultValue: false },
  ...classProperties,
  ...effectsProperties,
  ...spacingProperties
];

// Checkbox Group - for multiple selections
componentPropertyConfig['checkbox-group'] = [
  { name: 'groupName', label: 'Group Name', type: 'text', category: 'data', defaultValue: 'checkboxGroup', placeholder: 'Form field name' },
  { name: 'label', label: 'Label', type: 'text', category: 'data', defaultValue: '', placeholder: 'Group label' },
  { name: 'options', label: 'Options (one per line)', type: 'textarea', category: 'data', defaultValue: 'Option 1\nOption 2\nOption 3', placeholder: 'Enter options' },
  { name: 'defaultValues', label: 'Default Selections', type: 'textarea', category: 'data', defaultValue: '', placeholder: 'One per line' },
  { name: 'orientation', label: 'Orientation', type: 'select', category: 'layout', defaultValue: 'vertical', options: [
    { label: 'Vertical', value: 'vertical' },
    { label: 'Horizontal', value: 'horizontal' }
  ]},
  { name: 'minSelections', label: 'Min Selections', type: 'number', category: 'behavior', defaultValue: 0, min: 0 },
  { name: 'maxSelections', label: 'Max Selections', type: 'number', category: 'behavior', defaultValue: 0, min: 0, description: '0 = unlimited' },
  { name: 'required', label: 'Required', type: 'checkbox', category: 'behavior', defaultValue: false },
  { name: 'disabled', label: 'Disabled', type: 'checkbox', category: 'behavior', defaultValue: false },
  ...classProperties,
  ...effectsProperties,
  ...spacingProperties
];

// Horizontal Navigation
componentPropertyConfig['nav-horizontal'] = [
  { name: 'logo', label: 'Logo URL', type: 'url', category: 'data', defaultValue: '', placeholder: 'Logo image URL' },
  { name: 'logoPosition', label: 'Logo Position', type: 'select', category: 'layout', defaultValue: 'left', options: [
    { label: 'Left', value: 'left' },
    { label: 'Center', value: 'center' }
  ]},
  { name: 'menuItems', label: 'Menu Items (JSON)', type: 'textarea', category: 'data', defaultValue: '[\n  { "label": "Home", "href": "/" },\n  { "label": "About", "href": "/about" }\n]', placeholder: 'Menu items JSON' },
  { name: '_dropdownType', label: 'Dropdown Type', type: 'select', category: 'behavior', defaultValue: 'standard', options: [
    { label: 'Small Dropdown', value: 'standard' },
    { label: 'Mega Menu', value: 'mega' }
  ]},
  { name: '_megaColumns', label: 'Mega Menu Columns', type: 'number', category: 'behavior', defaultValue: 3, min: 2, max: 4 },
  { name: 'hamburgerMenu', label: 'Mobile Hamburger Menu', type: 'checkbox', category: 'behavior', defaultValue: true },
  { name: 'mobileBreakpoint', label: 'Mobile Breakpoint (px)', type: 'number', category: 'behavior', defaultValue: 768, min: 320, max: 1200 },
  { name: 'tabletBreakpoint', label: 'Tablet Breakpoint (px)', type: 'number', category: 'behavior', defaultValue: 1024, min: 640, max: 1600 },
  { name: 'sticky', label: 'Sticky Navigation', type: 'checkbox', category: 'behavior', defaultValue: false },
  ...classProperties,
  ...layoutProperties,
  ...backgroundProperties,
  ...borderProperties,
  ...effectsProperties,
  ...sizingProperties,
  ...spacingProperties
];

// Vertical Navigation (Sidebar Menu)
componentPropertyConfig['nav-vertical'] = [
  { name: 'logo', label: 'Logo URL', type: 'url', category: 'data', defaultValue: '', placeholder: 'Logo image URL' },
  { name: 'menuItems', label: 'Menu Items (JSON)', type: 'textarea', category: 'data', defaultValue: '[\n  { "label": "Dashboard", "href": "/", "icon": "Home" },\n  { "label": "Settings", "href": "/settings", "icon": "Settings" }\n]', placeholder: 'Menu items JSON' },
  { name: '_dropdownType', label: 'Dropdown Type', type: 'select', category: 'behavior', defaultValue: 'standard', options: [
    { label: 'Small Dropdown', value: 'standard' },
    { label: 'Mega Menu', value: 'mega' }
  ]},
  { name: '_megaColumns', label: 'Mega Menu Columns', type: 'number', category: 'behavior', defaultValue: 3, min: 2, max: 4 },
  { name: 'collapsible', label: 'Collapsible', type: 'checkbox', category: 'behavior', defaultValue: true },
  { name: 'defaultCollapsed', label: 'Start Collapsed', type: 'checkbox', category: 'behavior', defaultValue: false },
  { name: 'iconOnly', label: 'Icon Only Mode', type: 'checkbox', category: 'behavior', defaultValue: false },
  { name: 'mobileBreakpoint', label: 'Mobile Breakpoint (px)', type: 'number', category: 'behavior', defaultValue: 768, min: 320, max: 1200 },
  ...classProperties,
  ...layoutProperties,
  ...backgroundProperties,
  ...borderProperties,
  ...effectsProperties,
  ...sizingProperties,
  ...spacingProperties
];

// Accordion component properties
componentPropertyConfig.accordion = [
  { name: 'type', label: 'Type', type: 'select', category: 'behavior', defaultValue: 'single', options: [
    { label: 'Single (one open at a time)', value: 'single' },
    { label: 'Multiple (many can be open)', value: 'multiple' }
  ]},
  { name: 'collapsible', label: 'Allow Collapse All', type: 'checkbox', category: 'behavior', defaultValue: true },
  { name: 'defaultValue', label: 'Default Open Section', type: 'active-item-selector', category: 'behavior', defaultValue: 'item-1' },
  { name: 'orientation', label: 'Orientation', type: 'select', category: 'layout', defaultValue: 'vertical', options: [
    { label: 'Vertical', value: 'vertical' },
    { label: 'Horizontal (Sideways)', value: 'horizontal' }
  ]},
  { name: 'direction', label: 'Content Position', type: 'select', category: 'behavior', defaultValue: 'default', options: [
    { label: 'Default (Below)', value: 'default' },
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' }
  ]},
  { name: 'variant', label: 'Style Variant', type: 'select', category: 'behavior', defaultValue: 'default', options: [
    { label: 'Default', value: 'default' },
    { label: 'Boxed', value: 'boxed' },
    { label: 'Flush', value: 'flush' },
    { label: 'Separated', value: 'separated' },
    { label: 'Minimal', value: 'minimal' },
    { label: 'Elevated', value: 'elevated' },
    { label: 'Outlined', value: 'outlined' },
    { label: 'Ghost', value: 'ghost' }
  ]},
  { name: 'activeColor', label: 'Active Item Color', type: 'color-advanced', category: 'behavior', defaultValue: '' },
  { name: 'bordered', label: 'Show Borders', type: 'checkbox', category: 'styling', defaultValue: true },
  { name: 'separated', label: 'Separated Items', type: 'checkbox', category: 'styling', defaultValue: true },
  { name: 'iconPosition', label: 'Icon Position', type: 'select', category: 'styling', defaultValue: 'right', options: [
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' }
  ]},
  { name: 'showIcons', label: 'Show Section Icons', type: 'checkbox', category: 'styling', defaultValue: false },
  { name: 'easing', label: 'Animation Easing', type: 'select', category: 'behavior', defaultValue: 'ease', options: [
    { label: 'Ease', value: 'ease' },
    { label: 'Linear', value: 'linear' },
    { label: 'Ease In', value: 'ease-in' },
    { label: 'Ease Out', value: 'ease-out' },
    { label: 'Ease In Out', value: 'ease-in-out' }
  ]},
  { name: 'animationDuration', label: 'Animation Duration (ms)', type: 'number', category: 'behavior', defaultValue: 200, min: 0, max: 1000 },
  { name: 'items', label: 'Accordion Sections', type: 'items-editor', category: 'content', defaultValue: [
    { id: 'item-1', title: 'Section 1', icon: '', content: 'Content for section 1' },
    { id: 'item-2', title: 'Section 2', icon: '', content: 'Content for section 2' },
    { id: 'item-3', title: 'Section 3', icon: '', content: 'Content for section 3' }
  ]},
  ...classProperties,
  ...layoutProperties,
  ...backgroundProperties,
  ...borderProperties,
  ...effectsProperties,
  ...sizingProperties,
  ...spacingProperties
];

// Accordion Item - child of accordion
componentPropertyConfig['accordion-item'] = [
  { name: 'title', label: 'Title', type: 'text', category: 'content', defaultValue: 'Section', placeholder: 'Section title' },
  { name: 'defaultOpen', label: 'Open by Default', type: 'checkbox', category: 'behavior', defaultValue: false },
  ...classProperties,
  ...backgroundProperties,
  ...borderProperties,
  ...spacingProperties
];

// Accordion Header - child of accordion-item
componentPropertyConfig['accordion-header'] = [
  { name: 'content', label: 'Header Text', type: 'text', category: 'content', defaultValue: 'Section Title', placeholder: 'Header text' },
  { 
    name: 'typography', 
    label: 'Typography', 
    type: 'typography', 
    category: 'styling', 
    defaultValue: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '14',
      fontWeight: '500',
      lineHeight: '1.5',
      textAlign: 'left',
      fontStyle: 'normal',
      textDecoration: 'none',
      letterSpacing: '0',
      textTransform: 'none',
      color: '#000000'
    }
  },
  ...classProperties,
  ...backgroundProperties,
  ...spacingProperties
];

// Accordion Content - child of accordion-item
componentPropertyConfig['accordion-content'] = [
  { name: 'content', label: 'Content', type: 'textarea', category: 'content', defaultValue: 'Content for this section...', placeholder: 'Section content' },
  ...classProperties,
  ...backgroundProperties,
  ...borderProperties,
  ...spacingProperties
];

// Tab Item - child of tabs
componentPropertyConfig['tab-item'] = [
  { name: 'label', label: 'Tab Label', type: 'text', category: 'content', defaultValue: 'Tab', placeholder: 'Tab label' },
  { name: 'defaultActive', label: 'Active by Default', type: 'checkbox', category: 'behavior', defaultValue: false },
  ...classProperties,
  ...spacingProperties
];

// Tab Trigger - child of tab-item
componentPropertyConfig['tab-trigger'] = [
  { name: 'content', label: 'Trigger Text', type: 'text', category: 'content', defaultValue: 'Tab', placeholder: 'Tab trigger text' },
  { 
    name: 'typography', 
    label: 'Typography', 
    type: 'typography', 
    category: 'styling', 
    defaultValue: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '14',
      fontWeight: '500',
      lineHeight: '1.5',
      textAlign: 'center',
      fontStyle: 'normal',
      textDecoration: 'none',
      letterSpacing: '0',
      textTransform: 'none',
      color: '#000000'
    }
  },
  ...classProperties,
  ...backgroundProperties,
  ...spacingProperties
];

// Tab Content - child of tab-item
componentPropertyConfig['tab-content'] = [
  { name: 'content', label: 'Content', type: 'textarea', category: 'content', defaultValue: 'Tab content...', placeholder: 'Tab content' },
  ...classProperties,
  ...backgroundProperties,
  ...borderProperties,
  ...spacingProperties
];

// Calendar component properties
componentPropertyConfig.calendar = [
  { name: 'mode', label: 'Selection Mode', type: 'select', category: 'behavior', defaultValue: 'single', options: [
    { label: 'Single Date', value: 'single' },
    { label: 'Multiple Dates', value: 'multiple' },
    { label: 'Date Range', value: 'range' }
  ]},
  { name: 'defaultMonth', label: 'Default Month', type: 'text', category: 'behavior', defaultValue: '', placeholder: 'YYYY-MM (e.g., 2024-01)' },
  { name: 'showOutsideDays', label: 'Show Outside Days', type: 'checkbox', category: 'behavior', defaultValue: true },
  { name: 'weekStartsOn', label: 'Week Starts On', type: 'select', category: 'behavior', defaultValue: '0', options: [
    { label: 'Sunday', value: '0' },
    { label: 'Monday', value: '1' },
    { label: 'Saturday', value: '6' }
  ]},
  { name: 'numberOfMonths', label: 'Number of Months', type: 'number', category: 'behavior', defaultValue: 1, min: 1, max: 3 },
  { name: 'fixedWeeks', label: 'Fixed Weeks (6 rows)', type: 'checkbox', category: 'behavior', defaultValue: false },
  { name: 'showWeekNumber', label: 'Show Week Numbers', type: 'checkbox', category: 'behavior', defaultValue: false },
  { name: 'disabledDates', label: 'Disabled Dates (JSON)', type: 'textarea', category: 'data', defaultValue: '', placeholder: '["2024-01-01", "2024-12-25"]' },
  { name: 'minDate', label: 'Min Date', type: 'text', category: 'data', defaultValue: '', placeholder: 'YYYY-MM-DD' },
  { name: 'maxDate', label: 'Max Date', type: 'text', category: 'data', defaultValue: '', placeholder: 'YYYY-MM-DD' },
  ...classProperties,
  ...backgroundProperties,
  ...borderProperties,
  ...effectsProperties,
  ...sizingProperties,
  ...spacingProperties
];

// DatePicker component properties
componentPropertyConfig.datepicker = [
  { name: 'label', label: 'Label', type: 'text', category: 'content', defaultValue: '', placeholder: 'Field label' },
  { name: 'placeholder', label: 'Placeholder', type: 'text', category: 'content', defaultValue: 'Pick a date', placeholder: 'Placeholder text' },
  { name: 'format', label: 'Date Format', type: 'select', category: 'behavior', defaultValue: 'PPP', options: [
    { label: 'Long (January 1, 2024)', value: 'PPP' },
    { label: 'Short (Jan 1, 2024)', value: 'PP' },
    { label: 'Numeric (01/01/2024)', value: 'P' },
    { label: 'ISO (2024-01-01)', value: 'yyyy-MM-dd' }
  ]},
  { name: 'mode', label: 'Selection Mode', type: 'select', category: 'behavior', defaultValue: 'single', options: [
    { label: 'Single Date', value: 'single' },
    { label: 'Date Range', value: 'range' }
  ]},
  { name: 'minDate', label: 'Min Date', type: 'text', category: 'data', defaultValue: '', placeholder: 'YYYY-MM-DD' },
  { name: 'maxDate', label: 'Max Date', type: 'text', category: 'data', defaultValue: '', placeholder: 'YYYY-MM-DD' },
  { name: 'disablePastDates', label: 'Disable Past Dates', type: 'checkbox', category: 'behavior', defaultValue: false },
  { name: 'disableFutureDates', label: 'Disable Future Dates', type: 'checkbox', category: 'behavior', defaultValue: false },
  { name: 'clearable', label: 'Show Clear Button', type: 'checkbox', category: 'behavior', defaultValue: true },
  { name: 'showTodayButton', label: 'Show Today Button', type: 'checkbox', category: 'behavior', defaultValue: false },
  { name: 'closeOnSelect', label: 'Close on Select', type: 'checkbox', category: 'behavior', defaultValue: true },
  { name: 'required', label: 'Required', type: 'checkbox', category: 'behavior', defaultValue: false },
  { name: 'disabled', label: 'Disabled', type: 'checkbox', category: 'behavior', defaultValue: false },
  ...classProperties,
  ...layoutProperties,
  ...backgroundProperties,
  ...borderProperties,
  ...effectsProperties,
  ...sizingProperties,
  ...spacingProperties
];

// Tabs component properties
componentPropertyConfig.tabs = [
  { name: 'defaultValue', label: 'Active Tab', type: 'active-item-selector', category: 'behavior', defaultValue: 'tab-1' },
  { name: 'orientation', label: 'Orientation', type: 'select', category: 'layout', defaultValue: 'horizontal', options: [
    { label: 'Horizontal', value: 'horizontal' },
    { label: 'Vertical', value: 'vertical' }
  ]},
  { name: 'direction', label: 'Content Position', type: 'select', category: 'behavior', defaultValue: 'default', options: [
    { label: 'Default (Below)', value: 'default' },
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' }
  ]},
  { name: 'variant', label: 'Style Variant', type: 'select', category: 'behavior', defaultValue: 'default', options: [
    { label: 'Default', value: 'default' },
    { label: 'Pills', value: 'pills' },
    { label: 'Pills Outline', value: 'pills-outline' },
    { label: 'Underline', value: 'underline' },
    { label: 'Underline Bold', value: 'underline-bold' },
    { label: 'Boxed', value: 'boxed' },
    { label: 'Segmented', value: 'segmented' },
    { label: 'Segmented Rounded', value: 'segmented-rounded' },
    { label: 'Minimal', value: 'minimal' },
    { label: 'Cards', value: 'cards' }
  ]},
  { name: 'fullWidth', label: 'Full Width Tabs', type: 'checkbox', category: 'layout', defaultValue: false },
  { name: 'showIcons', label: 'Show Tab Icons', type: 'checkbox', category: 'styling', defaultValue: false },
  { name: 'iconPosition', label: 'Icon Position', type: 'select', category: 'styling', defaultValue: 'left', options: [
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' },
    { label: 'Top', value: 'top' }
  ]},
  { name: 'showBadges', label: 'Show Badges', type: 'checkbox', category: 'styling', defaultValue: false },
  { name: 'activeColor', label: 'Active Tab Color', type: 'color-advanced', category: 'behavior', defaultValue: '' },
  { name: 'destroyInactive', label: 'Destroy Inactive Content', type: 'checkbox', category: 'behavior', defaultValue: false },
  { name: 'easing', label: 'Animation Easing', type: 'select', category: 'behavior', defaultValue: 'ease', options: [
    { label: 'Ease', value: 'ease' },
    { label: 'Linear', value: 'linear' },
    { label: 'Ease In', value: 'ease-in' },
    { label: 'Ease Out', value: 'ease-out' },
    { label: 'Ease In Out', value: 'ease-in-out' }
  ]},
  { name: 'animationDuration', label: 'Animation Duration (ms)', type: 'number', category: 'behavior', defaultValue: 200, min: 0, max: 1000 },
  { name: 'items', label: 'Tab Items', type: 'items-editor', category: 'content', defaultValue: [
    { id: 'tab-1', label: 'Tab 1', icon: '', badge: '', content: 'Content for Tab 1' },
    { id: 'tab-2', label: 'Tab 2', icon: '', badge: '', content: 'Content for Tab 2' },
    { id: 'tab-3', label: 'Tab 3', icon: '', badge: '', content: 'Content for Tab 3' }
  ]},
  ...classProperties,
  ...layoutProperties,
  ...backgroundProperties,
  ...borderProperties,
  ...effectsProperties,
  ...sizingProperties,
  ...spacingProperties
];

// Dropdown Menu component properties
componentPropertyConfig['dropdown-menu'] = [
  { name: 'triggerText', label: 'Trigger Text', type: 'text', category: 'content', defaultValue: 'Open Menu', placeholder: 'Button text' },
  { name: 'triggerVariant', label: 'Trigger Variant', type: 'select', category: 'styling', defaultValue: 'outline', options: [
    { label: 'Default', value: 'default' },
    { label: 'Outline', value: 'outline' },
    { label: 'Ghost', value: 'ghost' },
    { label: 'Secondary', value: 'secondary' }
  ]},
  { name: 'menuType', label: 'Menu Type', type: 'select', category: 'behavior', defaultValue: 'standard', options: [
    { label: 'Standard Dropdown', value: 'standard' },
    { label: 'Mega Menu', value: 'mega' }
  ]},
  { name: 'items', label: 'Menu Items (JSON)', type: 'textarea', category: 'data', defaultValue: '[\n  { "label": "Profile", "href": "/profile" },\n  { "label": "Settings", "href": "/settings" },\n  { "type": "separator" },\n  { "label": "Logout", "href": "/logout" }\n]', placeholder: 'Menu items JSON' },
  { name: 'align', label: 'Alignment', type: 'select', category: 'layout', defaultValue: 'start', options: [
    { label: 'Start', value: 'start' },
    { label: 'Center', value: 'center' },
    { label: 'End', value: 'end' }
  ]},
  { name: 'megaColumns', label: 'Mega Menu Columns', type: 'number', category: 'layout', defaultValue: 3, min: 1, max: 6 },
  ...classProperties,
  ...effectsProperties,
  ...spacingProperties
];

// ============================================
// CAROUSEL COMPONENT (Slider/Slideshow)
// ============================================

// Carousel - main slider container
componentPropertyConfig.carousel = [
  { name: 'activeSlide', label: 'Active Slide', type: 'active-item-selector', category: 'behavior', defaultValue: 'slide-1' },
  { name: 'autoplay', label: 'Autoplay', type: 'checkbox', category: 'behavior', defaultValue: false },
  { name: 'autoplayDelay', label: 'Autoplay Delay (ms)', type: 'number', category: 'behavior', defaultValue: 3000, min: 500, max: 10000 },
  { name: 'loop', label: 'Loop', type: 'checkbox', category: 'behavior', defaultValue: true },
  { name: 'orientation', label: 'Orientation', type: 'select', category: 'layout', defaultValue: 'horizontal', options: [
    { label: 'Horizontal', value: 'horizontal' },
    { label: 'Vertical', value: 'vertical' }
  ]},
  { name: 'slidesToShow', label: 'Slides to Show', type: 'number', category: 'layout', defaultValue: 1, min: 1, max: 5 },
  { name: 'gap', label: 'Slide Gap', type: 'number', category: 'layout', defaultValue: 16, min: 0, max: 100 },
  { name: 'showArrows', label: 'Show Navigation Arrows', type: 'checkbox', category: 'behavior', defaultValue: true },
  { name: 'arrowPosition', label: 'Arrow Position', type: 'select', category: 'styling', defaultValue: 'inside', options: [
    { label: 'Inside', value: 'inside' },
    { label: 'Outside', value: 'outside' },
    { label: 'Bottom', value: 'bottom' }
  ]},
  { name: 'arrowStyle', label: 'Arrow Style', type: 'select', category: 'styling', defaultValue: 'circle', options: [
    { label: 'Circle', value: 'circle' },
    { label: 'Square', value: 'square' },
    { label: 'Ghost', value: 'ghost' },
    { label: 'Minimal', value: 'minimal' }
  ]},
  { name: 'showDots', label: 'Show Dots Indicator', type: 'checkbox', category: 'behavior', defaultValue: true },
  { name: 'dotPosition', label: 'Dot Position', type: 'select', category: 'styling', defaultValue: 'bottom', options: [
    { label: 'Bottom', value: 'bottom' },
    { label: 'Top', value: 'top' },
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' }
  ]},
  { name: 'dotStyle', label: 'Dot Style', type: 'select', category: 'styling', defaultValue: 'dots', options: [
    { label: 'Dots', value: 'dots' },
    { label: 'Lines', value: 'lines' },
    { label: 'Numbers', value: 'numbers' },
    { label: 'Thumbnails', value: 'thumbnails' }
  ]},
  { name: 'easing', label: 'Animation Easing', type: 'select', category: 'behavior', defaultValue: 'ease-out', options: [
    { label: 'Ease', value: 'ease' },
    { label: 'Ease Out', value: 'ease-out' },
    { label: 'Ease In', value: 'ease-in' },
    { label: 'Ease In Out', value: 'ease-in-out' },
    { label: 'Linear', value: 'linear' }
  ]},
  { name: 'animationDuration', label: 'Animation Duration (ms)', type: 'number', category: 'behavior', defaultValue: 300, min: 100, max: 2000 },
  { name: 'dragEnabled', label: 'Enable Drag/Swipe', type: 'checkbox', category: 'behavior', defaultValue: true },
  { name: 'items', label: 'Slides', type: 'items-editor', category: 'content', defaultValue: [
    { id: 'slide-1', label: 'Slide 1', content: 'Content for Slide 1' },
    { id: 'slide-2', label: 'Slide 2', content: 'Content for Slide 2' },
    { id: 'slide-3', label: 'Slide 3', content: 'Content for Slide 3' }
  ]},
  ...classProperties,
  ...layoutProperties,
  ...backgroundProperties,
  ...borderProperties,
  ...effectsProperties,
  ...sizingProperties,
  ...spacingProperties
];

// Carousel Slide - child of carousel
componentPropertyConfig['carousel-slide'] = [
  { name: 'label', label: 'Slide Label', type: 'text', category: 'content', defaultValue: 'Slide', placeholder: 'Slide label' },
  ...classProperties,
  ...backgroundProperties,
  ...borderProperties,
  ...spacingProperties
];

// Carousel Slide Content - content container within a slide (droppable)
componentPropertyConfig['carousel-slide-content'] = [
  { name: 'content', label: 'Content', type: 'textarea', category: 'content', defaultValue: 'Slide content...', placeholder: 'Slide content' },
  ...classProperties,
  ...layoutProperties,
  ...backgroundProperties,
  ...borderProperties,
  ...sizingProperties,
  ...spacingProperties
];

export function getPropertiesForComponent(componentType: ComponentType): PropertyField[] {
  // Try main config first, then check additional configs
  const mainConfig = componentPropertyConfig[componentType];
  if (mainConfig) return mainConfig;
  
  // Try importing additional configs
  try {
    const { additionalComponentConfigs } = require('./componentPropertyConfigExtensions');
    return additionalComponentConfigs[componentType] || [];
  } catch (error) {
    console.warn(`No property config found for component type: ${componentType}`);
    return [];
  }
}

export function getDefaultPropsForComponent(componentType: ComponentType): Record<string, any> {
  const properties = getPropertiesForComponent(componentType);
  const defaultProps: Record<string, any> = {};
  
  properties.forEach(prop => {
    if (prop.defaultValue !== undefined) {
      defaultProps[prop.name] = prop.defaultValue;
    }
  });
  
  // Special handling for heading elements - adjust typography based on level and set semantic tag
  if (componentType === 'heading') {
    const level = defaultProps.level || 1;
    defaultProps.tag = `h${level}`;
    const headingTypographyDefaults: Record<number, any> = {
      1: { fontFamily: 'Inter, sans-serif', fontSize: '36', fontWeight: '700', lineHeight: '1.2', textAlign: 'left', color: '#000000', fontStyle: 'normal', textDecoration: 'none', letterSpacing: '0', textTransform: 'none' },
      2: { fontFamily: 'Inter, sans-serif', fontSize: '30', fontWeight: '600', lineHeight: '1.2', textAlign: 'left', color: '#000000', fontStyle: 'normal', textDecoration: 'none', letterSpacing: '0', textTransform: 'none' },
      3: { fontFamily: 'Inter, sans-serif', fontSize: '24', fontWeight: '600', lineHeight: '1.3', textAlign: 'left', color: '#000000', fontStyle: 'normal', textDecoration: 'none', letterSpacing: '0', textTransform: 'none' },
      4: { fontFamily: 'Inter, sans-serif', fontSize: '20', fontWeight: '600', lineHeight: '1.3', textAlign: 'left', color: '#000000', fontStyle: 'normal', textDecoration: 'none', letterSpacing: '0', textTransform: 'none' },
      5: { fontFamily: 'Inter, sans-serif', fontSize: '18', fontWeight: '600', lineHeight: '1.4', textAlign: 'left', color: '#000000', fontStyle: 'normal', textDecoration: 'none', letterSpacing: '0', textTransform: 'none' },
      6: { fontFamily: 'Inter, sans-serif', fontSize: '16', fontWeight: '600', lineHeight: '1.4', textAlign: 'left', color: '#000000', fontStyle: 'normal', textDecoration: 'none', letterSpacing: '0', textTransform: 'none' },
    };
    defaultProps.typography = headingTypographyDefaults[level] || headingTypographyDefaults[1];
    defaultProps.fontSize = parseInt(defaultProps.typography.fontSize);
  }
  
  return defaultProps;
}

export function getCategorizedProperties(componentType: ComponentType): Record<string, PropertyField[]> {
  const properties = getPropertiesForComponent(componentType);
  const categorized: Record<string, PropertyField[]> = {
    content: [],
    behavior: [],
    styling: [],
    layout: [],
    data: [],
    interactions: []
  };
  
  properties.forEach(prop => {
    if (categorized[prop.category]) {
      categorized[prop.category].push(prop);
    }
  });
  
  return categorized;
}

// Custom property components for complex configurations
export function getCustomPropertyComponent(componentType: ComponentType) {
  switch (componentType) {
    case 'sidebar':
      return 'SidebarProperties';
    case 'nav-horizontal':
      return 'NavHorizontalProperties';
    case 'nav-vertical':
      return 'NavVerticalProperties';
    default:
      return null;
  }
}
