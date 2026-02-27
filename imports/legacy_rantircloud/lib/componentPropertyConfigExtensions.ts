/**
 * Extended component property configurations
 * For components missing from the main config file
 */

import { PropertyField } from './componentPropertyConfig';

// Common reusable property sets
const classProperties: PropertyField[] = [
  { name: 'classes', label: 'Classes', type: 'class-selector', category: 'styling', defaultValue: [] }
];

const spacingProperties: PropertyField[] = [
  { name: 'spacingControl', label: 'Padding & Margin', type: 'spacing', category: 'layout', spacingType: 'padding', defaultValue: { 
    margin: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px' },
    padding: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px' }
  } }
];

const sizingProperties: PropertyField[] = [
  { name: 'width', label: 'Width', type: 'dimension', category: 'layout', defaultValue: { value: 'auto', unit: 'auto' } },
  { name: 'height', label: 'Height', type: 'dimension', category: 'layout', defaultValue: { value: 'auto', unit: 'auto' } },
  { name: 'minWidth', label: 'Min Width', type: 'dimension', category: 'layout', defaultValue: { value: '0', unit: 'px' } },
  { name: 'minHeight', label: 'Min Height', type: 'dimension', category: 'layout', defaultValue: { value: '0', unit: 'px' } },
  { name: 'maxWidth', label: 'Max Width', type: 'dimension', category: 'layout', defaultValue: { value: 'none', unit: 'auto' } },
  { name: 'maxHeight', label: 'Max Height', type: 'dimension', category: 'layout', defaultValue: { value: 'none', unit: 'auto' } }
];

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

const backgroundProperties: PropertyField[] = [
  { name: 'backgroundColor', label: 'BG Color', type: 'color-advanced', category: 'styling', defaultValue: 'transparent' },
  { name: 'backgroundGradient', label: 'Gradient', type: 'text', category: 'styling', defaultValue: '', placeholder: 'linear-gradient(...)' },
  { name: 'backgroundImage', label: 'BG Image', type: 'url', category: 'styling', defaultValue: '', placeholder: 'Enter image URL' }
];

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

// Transform properties
const transformProperties: PropertyField[] = [
  { name: 'translateX', label: 'Translate X', type: 'number', category: 'styling', defaultValue: 0, min: -500, max: 500 },
  { name: 'translateY', label: 'Translate Y', type: 'number', category: 'styling', defaultValue: 0, min: -500, max: 500 },
  { name: 'rotate', label: 'Rotate', type: 'number', category: 'styling', defaultValue: 0, min: -360, max: 360 },
  { name: 'scale', label: 'Scale', type: 'number', category: 'styling', defaultValue: 1, min: 0, max: 5, step: 0.1 },
  { name: 'scaleX', label: 'Scale X', type: 'number', category: 'styling', defaultValue: 1, min: 0, max: 5, step: 0.1 },
  { name: 'scaleY', label: 'Scale Y', type: 'number', category: 'styling', defaultValue: 1, min: 0, max: 5, step: 0.1 },
  { name: 'skewX', label: 'Skew X', type: 'number', category: 'styling', defaultValue: 0, min: -90, max: 90 },
  { name: 'skewY', label: 'Skew Y', type: 'number', category: 'styling', defaultValue: 0, min: -90, max: 90 },
  { name: 'transformOrigin', label: 'Transform Origin', type: 'select', category: 'styling', defaultValue: 'center', options: [
    { label: 'Center', value: 'center' },
    { label: 'Top Left', value: 'top left' },
    { label: 'Top Center', value: 'top center' },
    { label: 'Top Right', value: 'top right' },
    { label: 'Center Left', value: 'center left' },
    { label: 'Center Right', value: 'center right' },
    { label: 'Bottom Left', value: 'bottom left' },
    { label: 'Bottom Center', value: 'bottom center' },
    { label: 'Bottom Right', value: 'bottom right' }
  ]}
];

// 3D Transform properties
const transform3DProperties: PropertyField[] = [
  { name: 'rotateX', label: '3D Rotate X', type: 'number', category: 'styling', defaultValue: 0, min: -360, max: 360 },
  { name: 'rotateY', label: '3D Rotate Y', type: 'number', category: 'styling', defaultValue: 0, min: -360, max: 360 },
  { name: 'perspective', label: 'Perspective', type: 'number', category: 'styling', defaultValue: 0, min: 0, max: 2000 },
  { name: 'backfaceVisibility', label: 'Backface Visibility', type: 'select', category: 'styling', defaultValue: 'visible', options: [
    { label: 'Visible', value: 'visible' },
    { label: 'Hidden', value: 'hidden' }
  ]}
];

/**
 * Additional component property configurations
 * These are added to the main config via the componentPropertyConfig object
 */
export const additionalComponentConfigs: Record<string, PropertyField[]> = {
  navigation: [
    { name: 'orientation', label: 'Orientation', type: 'select', category: 'layout', defaultValue: 'horizontal', options: [
      { label: 'Horizontal', value: 'horizontal' },
      { label: 'Vertical', value: 'vertical' }
    ]},
    { name: 'variant', label: 'Variant', type: 'select', category: 'styling', defaultValue: 'default', options: [
      { label: 'Default', value: 'default' },
      { label: 'Pills', value: 'pills' },
      { label: 'Underline', value: 'underline' }
    ]},
    ...classProperties,
    ...layoutProperties,
    ...flexChildProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...effectsProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  header: [
    { name: 'title', label: 'Title', type: 'text', category: 'content', defaultValue: 'Header', placeholder: 'Enter header title' },
    { name: 'showLogo', label: 'Show Logo', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'logoUrl', label: 'Logo URL', type: 'url', category: 'content', defaultValue: '', placeholder: 'Enter logo URL' },
    ...classProperties,
    ...layoutProperties,
    ...flexChildProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...effectsProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  footer: [
    { name: 'content', label: 'Content', type: 'textarea', category: 'content', defaultValue: 'Footer content', placeholder: 'Enter footer content' },
    { name: 'alignment', label: 'Text Alignment', type: 'alignment', category: 'styling', defaultValue: 'center' },
    ...classProperties,
    ...layoutProperties,
    ...flexChildProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...effectsProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  form: [
    { name: 'title', label: 'Form Title', type: 'text', category: 'content', defaultValue: '', placeholder: 'Enter form title' },
    { name: 'submitText', label: 'Submit Button Text', type: 'text', category: 'content', defaultValue: 'Submit', placeholder: 'Enter button text' },
    { name: 'gap', label: 'Field Gap', type: 'select', category: 'layout', defaultValue: 'md', options: [
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' }
    ]},
    { name: 'onSubmitActions', label: 'Submit Actions', type: 'interactions', category: 'interactions', defaultValue: [] },
    ...classProperties,
    ...layoutProperties,
    ...flexChildProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...effectsProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  spacer: [
    { name: 'height', label: 'Height', type: 'dimension', category: 'layout', defaultValue: { value: '20', unit: 'px' } },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  divider: [
    { name: 'orientation', label: 'Orientation', type: 'select', category: 'layout', defaultValue: 'horizontal', options: [
      { label: 'Horizontal', value: 'horizontal' },
      { label: 'Vertical', value: 'vertical' }
    ]},
    { name: 'thickness', label: 'Thickness', type: 'number', category: 'styling', defaultValue: 1, min: 1, max: 10 },
    { name: 'color', label: 'Color', type: 'color-advanced', category: 'styling', defaultValue: '#e5e7eb' },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  blockquote: [
    { name: 'content', label: 'Content', type: 'textarea', category: 'content', defaultValue: 'Quote text', placeholder: 'Enter quote text' },
    { name: 'author', label: 'Author', type: 'text', category: 'content', defaultValue: '', placeholder: 'Author name' },
    { name: 'fontSize', label: 'Font Size', type: 'number', category: 'styling', defaultValue: 16, min: 8, max: 72 },
    { name: 'color', label: 'Text Color', type: 'color-advanced', category: 'styling', defaultValue: '#6b7280' },
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

  // code: inline code element - renders code on canvas with syntax highlighting
  // Data & Settings: code-editor for editing, language selector
  // Canvas: renders the code with styling
  code: [
    { name: 'content', label: 'Code', type: 'code-editor', category: 'content', defaultValue: 'const example = "code";', placeholder: 'Enter code' },
    { name: 'language', label: 'Language', type: 'select', category: 'content', defaultValue: 'javascript', options: [
      { label: 'JavaScript', value: 'javascript' },
      { label: 'TypeScript', value: 'typescript' },
      { label: 'HTML', value: 'html' },
      { label: 'CSS', value: 'css' },
      { label: 'JSON', value: 'json' },
      { label: 'Python', value: 'python' },
      { label: 'Bash', value: 'bash' }
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

  // codeblock: editable code block - shows editable text on canvas (NOT rendered)
  // Data & Settings: code-editor only (no language/color settings)
  // Canvas: directly editable text area
  codeblock: [
    { name: 'content', label: 'Code', type: 'code-editor', category: 'content', defaultValue: 'function example() {\n  return "Hello World";\n}', placeholder: 'Enter code block' },
    { name: 'showLineNumbers', label: 'Show Line Numbers', type: 'checkbox', category: 'behavior', defaultValue: true },
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

  link: [
    { name: 'content', label: 'Link Text', type: 'variable-binding', category: 'content', defaultValue: 'Link', placeholder: 'Enter link text', allowVariableBinding: true },
    { name: 'href', label: 'URL', type: 'url', category: 'content', defaultValue: '', placeholder: 'Enter URL' },
    { name: 'target', label: 'Target', type: 'select', category: 'behavior', defaultValue: '_self', options: [
      { label: 'Same Window', value: '_self' },
      { label: 'New Window', value: '_blank' }
    ]},
    { name: 'showIcon', label: 'Show External Icon', type: 'checkbox', category: 'content', defaultValue: false },
    { name: 'underline', label: 'Underline', type: 'select', category: 'styling', defaultValue: 'always', options: [
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
        textTransform: 'none',
        color: '#3b82f6'
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

  sidebar: [
    { name: 'position', label: 'Position', type: 'select', category: 'layout', defaultValue: 'left', options: [
      { label: 'Left', value: 'left' },
      { label: 'Right', value: 'right' }
    ]},
    { name: 'collapsible', label: 'Collapsible', type: 'checkbox', category: 'behavior', defaultValue: true },
    { name: 'defaultOpen', label: 'Default Open', type: 'checkbox', category: 'behavior', defaultValue: true },
    ...classProperties,
    ...effectsProperties,
    ...layoutProperties,
    ...backgroundProperties,
    ...borderProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  tabs: [
    { name: 'defaultTab', label: 'Default Tab', type: 'text', category: 'behavior', defaultValue: '0', placeholder: 'Enter default tab index' },
    { name: 'orientation', label: 'Orientation', type: 'select', category: 'layout', defaultValue: 'horizontal', options: [
      { label: 'Horizontal', value: 'horizontal' },
      { label: 'Vertical', value: 'vertical' }
    ]},
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  accordion: [
    { name: 'type', label: 'Type', type: 'select', category: 'behavior', defaultValue: 'single', options: [
      { label: 'Single', value: 'single' },
      { label: 'Multiple', value: 'multiple' }
    ]},
    { name: 'collapsible', label: 'Collapsible', type: 'checkbox', category: 'behavior', defaultValue: true },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  calendar: [
    { name: 'mode', label: 'Mode', type: 'select', category: 'behavior', defaultValue: 'single', options: [
      { label: 'Single', value: 'single' },
      { label: 'Multiple', value: 'multiple' },
      { label: 'Range', value: 'range' }
    ]},
    { name: 'showOutsideDays', label: 'Show Outside Days', type: 'checkbox', category: 'behavior', defaultValue: true },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  modal: [
    { name: 'title', label: 'Title', type: 'text', category: 'content', defaultValue: 'Modal Title', placeholder: 'Enter modal title' },
    { name: 'description', label: 'Description', type: 'textarea', category: 'content', defaultValue: '', placeholder: 'Enter description' },
    { name: 'closeOnOutsideClick', label: 'Close on Outside Click', type: 'checkbox', category: 'behavior', defaultValue: true },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  dialog: [
    { name: 'title', label: 'Title', type: 'text', category: 'content', defaultValue: 'Dialog', placeholder: 'Enter dialog title' },
    { name: 'description', label: 'Description', type: 'textarea', category: 'content', defaultValue: '', placeholder: 'Enter description' },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  loading: [
    { name: 'text', label: 'Loading Text', type: 'text', category: 'content', defaultValue: 'Loading...', placeholder: 'Enter loading text' },
    { name: 'size', label: 'Size', type: 'select', category: 'styling', defaultValue: 'md', options: [
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' }
    ]},
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  spinner: [
    { name: 'size', label: 'Size', type: 'select', category: 'styling', defaultValue: 'md', options: [
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' }
    ]},
    { name: 'color', label: 'Color', type: 'color-advanced', category: 'styling', defaultValue: '#3b82f6' },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  skeleton: [
    { name: 'variant', label: 'Variant', type: 'select', category: 'styling', defaultValue: 'rectangular', options: [
      { label: 'Text', value: 'text' },
      { label: 'Circular', value: 'circular' },
      { label: 'Rectangular', value: 'rectangular' }
    ]},
    { name: 'width', label: 'Width', type: 'dimension', category: 'layout', defaultValue: { value: '100', unit: '%' } },
    { name: 'height', label: 'Height', type: 'dimension', category: 'layout', defaultValue: { value: '20', unit: 'px' } },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  combobox: [
    { name: 'label', label: 'Label', type: 'text', category: 'content', defaultValue: '', placeholder: 'Enter field label' },
    { name: 'placeholder', label: 'Placeholder', type: 'text', category: 'content', defaultValue: 'Search...', placeholder: 'Enter placeholder' },
    { name: 'options', label: 'Options (one per line)', type: 'textarea', category: 'content', defaultValue: 'Option 1\nOption 2\nOption 3', placeholder: 'Enter options, one per line' },
    { name: 'emptyText', label: 'Empty State Text', type: 'text', category: 'content', defaultValue: 'No results found.', placeholder: 'Text when no results' },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  'input-otp': [
    { name: 'length', label: 'Number of Digits', type: 'number', category: 'behavior', defaultValue: 6, min: 4, max: 8 },
    { name: 'label', label: 'Label', type: 'text', category: 'content', defaultValue: '', placeholder: 'Enter field label' },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  toggle: [
    { name: 'text', label: 'Text', type: 'text', category: 'content', defaultValue: 'Toggle', placeholder: 'Enter toggle text' },
    { name: 'pressed', label: 'Pressed', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'disabled', label: 'Disabled', type: 'checkbox', category: 'behavior', defaultValue: false },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  'toggle-group': [
    { name: 'type', label: 'Type', type: 'select', category: 'behavior', defaultValue: 'single', options: [
      { label: 'Single', value: 'single' },
      { label: 'Multiple', value: 'multiple' }
    ]},
    { name: 'options', label: 'Options (one per line)', type: 'textarea', category: 'content', defaultValue: 'Option 1\nOption 2\nOption 3', placeholder: 'Enter options, one per line' },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  breadcrumb: [
    { name: 'items', label: 'Items (one per line)', type: 'textarea', category: 'content', defaultValue: 'Home\nProducts\nItem', placeholder: 'Enter breadcrumb items' },
    { name: 'separator', label: 'Separator', type: 'text', category: 'styling', defaultValue: '/', placeholder: 'Separator character' },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  pagination: [
    { name: 'totalPages', label: 'Total Pages', type: 'number', category: 'behavior', defaultValue: 10, min: 1 },
    { name: 'currentPage', label: 'Current Page', type: 'number', category: 'behavior', defaultValue: 1, min: 1 },
    { name: 'showFirstLast', label: 'Show First/Last Buttons', type: 'checkbox', category: 'behavior', defaultValue: true },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  collapsible: [
    { name: 'title', label: 'Title', type: 'text', category: 'content', defaultValue: 'Collapsible', placeholder: 'Enter title' },
    { name: 'defaultOpen', label: 'Default Open', type: 'checkbox', category: 'behavior', defaultValue: false },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  carousel: [
    { name: 'autoplay', label: 'Autoplay', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'interval', label: 'Autoplay Interval (ms)', type: 'number', category: 'behavior', defaultValue: 3000, min: 1000, max: 10000 },
    { name: 'showDots', label: 'Show Dots', type: 'checkbox', category: 'behavior', defaultValue: true },
    { name: 'showArrows', label: 'Show Arrows', type: 'checkbox', category: 'behavior', defaultValue: true },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  datepicker: [
    { name: 'label', label: 'Label', type: 'text', category: 'content', defaultValue: '', placeholder: 'Enter field label' },
    { name: 'format', label: 'Date Format', type: 'text', category: 'behavior', defaultValue: 'MM/DD/YYYY', placeholder: 'Enter date format' },
    { name: 'placeholder', label: 'Placeholder', type: 'text', category: 'content', defaultValue: 'Select a date', placeholder: 'Enter placeholder' },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  'scroll-area': [
    { name: 'maxHeight', label: 'Max Height', type: 'dimension', category: 'layout', defaultValue: { value: '400', unit: 'px' } },
    { name: 'orientation', label: 'Scrollbar Orientation', type: 'select', category: 'layout', defaultValue: 'vertical', options: [
      { label: 'Vertical', value: 'vertical' },
      { label: 'Horizontal', value: 'horizontal' },
      { label: 'Both', value: 'both' }
    ]},
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  'aspect-ratio': [
    { name: 'ratio', label: 'Aspect Ratio', type: 'select', category: 'layout', defaultValue: '16/9', options: [
      { label: '16:9', value: '16/9' },
      { label: '4:3', value: '4/3' },
      { label: '1:1', value: '1/1' },
      { label: '21:9', value: '21/9' }
    ]},
    ...classProperties,
    ...effectsProperties,
    ...sizingProperties,
    ...spacingProperties
  ],

  resizable: [
    { name: 'defaultSize', label: 'Default Size (%)', type: 'number', category: 'layout', defaultValue: 50, min: 10, max: 90 },
    { name: 'minSize', label: 'Min Size (%)', type: 'number', category: 'layout', defaultValue: 20, min: 5, max: 50 },
    { name: 'direction', label: 'Direction', type: 'select', category: 'layout', defaultValue: 'horizontal', options: [
      { label: 'Horizontal', value: 'horizontal' },
      { label: 'Vertical', value: 'vertical' }
    ]},
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  fileupload: [
    { name: 'label', label: 'Label', type: 'text', category: 'content', defaultValue: 'Upload File', placeholder: 'Enter field label' },
    { name: 'accept', label: 'Accepted File Types', type: 'text', category: 'behavior', defaultValue: '', placeholder: 'e.g., .jpg,.png,.pdf' },
    { name: 'multiple', label: 'Multiple Files', type: 'checkbox', category: 'behavior', defaultValue: false },
    { name: 'maxSize', label: 'Max File Size (MB)', type: 'number', category: 'behavior', defaultValue: 10, min: 1, max: 100 },
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ],

  keyboard: [
    { name: 'keys', label: 'Key Combination', type: 'text', category: 'content', defaultValue: 'Ctrl+K', placeholder: 'e.g., Ctrl+K' },
    { name: 'size', label: 'Size', type: 'select', category: 'styling', defaultValue: 'default', options: [
      { label: 'Small', value: 'sm' },
      { label: 'Default', value: 'default' },
      { label: 'Large', value: 'lg' }
    ]},
    ...classProperties,
    ...effectsProperties,
    ...spacingProperties
  ]
};
