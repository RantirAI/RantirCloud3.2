import { AppComponent, ComponentType } from '@/types/appBuilder';
import { getDefaultPropsForComponent } from '@/lib/componentPropertyConfig';

export interface FormTemplate {
  type: ComponentType;
  name: string;
  description: string;
  icon: any;
  createComponents: () => AppComponent[];
}

const generateId = () => `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Form type configurations for auto-populating form wrapper
export const formTypeConfigs = {
  login: {
    title: 'Sign In',
    fields: [
      { type: 'input', inputType: 'email', placeholder: 'Email address', required: true },
      { type: 'password-input', placeholder: 'Password', required: true }
    ],
    submitText: 'Sign In',
    submitAction: 'authenticate'
  },
  register: {
    title: 'Create Account',
    fields: [
      { type: 'input', inputType: 'text', placeholder: 'Full Name', required: true },
      { type: 'input', inputType: 'email', placeholder: 'Email address', required: true },
      { type: 'password-input', placeholder: 'Password', required: true, showStrength: true },
      { type: 'password-input', placeholder: 'Confirm Password', required: true }
    ],
    submitText: 'Create Account',
    submitAction: 'register'
  },
  'user-profile': {
    title: 'Profile Settings',
    fields: [
      { type: 'input', inputType: 'text', placeholder: 'Display Name', required: false },
      { type: 'input', inputType: 'email', placeholder: 'Email', required: true, disabled: true },
      { type: 'textarea', placeholder: 'Bio', required: false }
    ],
    submitText: 'Save Changes',
    submitAction: 'updateProfile'
  },
  contact: {
    title: 'Contact Us',
    fields: [
      { type: 'input', inputType: 'text', placeholder: 'Your Name', required: true },
      { type: 'input', inputType: 'email', placeholder: 'Email address', required: true },
      { type: 'input', inputType: 'text', placeholder: 'Subject', required: false },
      { type: 'textarea', placeholder: 'Your Message', required: true }
    ],
    submitText: 'Send Message',
    submitAction: 'submitForm'
  },
  custom: {
    title: 'Form',
    fields: [
      { type: 'input', inputType: 'text', placeholder: 'Field 1', required: false }
    ],
    submitText: 'Submit',
    submitAction: 'submitForm'
  }
};

export type FormType = keyof typeof formTypeConfigs;

export const formComponentTemplates: FormTemplate[] = [
  {
    type: 'form-wrapper' as ComponentType,
    name: 'Form Wrapper',
    description: 'Smart form container with pre-configured input and submit button',
    icon: null,
    createComponents: () => {
      const formId = generateId();
      const inputId = generateId();
      const buttonId = generateId();

      return [{
        id: formId,
        type: 'form-wrapper' as ComponentType,
        props: {
          ...getDefaultPropsForComponent('form-wrapper'),
          formType: 'custom',
          submitAction: 'submitForm',
          validationMode: 'onSubmit',
          showSuccessMessage: true,
          successMessage: 'Form submitted successfully!'
        },
        style: {
          sizing: { width: '100%', maxWidth: '480px' },
          spacing: { padding: 24 },
          border: { width: 1, color: 'hsl(var(--border))', radius: 12, style: 'solid' },
          background: { color: 'hsl(var(--card))' }
        },
        children: [
          {
            id: inputId,
            type: 'input',
            props: {
              ...getDefaultPropsForComponent('input'),
              label: 'Field',
              placeholder: 'Enter value...',
              required: false
            },
            style: {
              sizing: { width: '100%' },
              spacing: { margin: { bottom: 16 } }
            },
            children: []
          },
          {
            id: buttonId,
            type: 'button',
            props: {
              ...getDefaultPropsForComponent('button'),
              text: 'Submit',
              variant: 'default',
              fullWidth: true
            },
            style: {},
            children: [],
            actions: [{
              id: 'submit-action',
              trigger: 'click',
              type: 'executeCode',
              config: { code: 'console.log("Form submitted");' }
            }]
          }
        ]
      }];
    }
  },
  {
    type: 'form-wizard' as ComponentType,
    name: 'Form Wizard',
    description: 'Multi-step form with progress indicators',
    icon: null,
    createComponents: () => {
      const wizardId = generateId();

      return [{
        id: wizardId,
        type: 'form-wizard' as ComponentType,
        props: {
          ...getDefaultPropsForComponent('form-wizard'),
          steps: ['Step 1', 'Step 2', 'Step 3'],
          currentStep: 0,
          stepStyle: 'numbers',
          showStepCount: true,
          allowStepSkip: false,
          validationMode: 'onStepChange'
        },
        style: {
          sizing: { width: '100%', maxWidth: '600px' },
          spacing: { padding: 24 },
          border: { width: 1, color: 'hsl(var(--border))', radius: 12, style: 'solid' },
          background: { color: 'hsl(var(--card))' }
        },
        children: []
      }];
    }
  },
  {
    type: 'password-input' as ComponentType,
    name: 'Password Input',
    description: 'Password input with show/hide toggle',
    icon: null,
    createComponents: () => {
      const inputId = generateId();

      return [{
        id: inputId,
        type: 'password-input' as ComponentType,
        props: {
          ...getDefaultPropsForComponent('password-input'),
          label: 'Password',
          placeholder: 'Enter password...',
          showToggle: true,
          showStrength: false,
          required: false
        },
        style: {
          sizing: { width: '100%' }
        },
        children: []
      }];
    }
  },
  {
    type: 'radio-group' as ComponentType,
    name: 'Radio Group',
    description: 'Group of radio buttons for single selection',
    icon: null,
    createComponents: () => {
      const groupId = generateId();

      return [{
        id: groupId,
        type: 'radio-group' as ComponentType,
        props: {
          ...getDefaultPropsForComponent('radio-group'),
          groupName: 'radioGroup',
          options: 'Option 1\nOption 2\nOption 3',
          defaultValue: '',
          orientation: 'vertical',
          required: false
        },
        style: {},
        children: []
      }];
    }
  },
  {
    type: 'checkbox-group' as ComponentType,
    name: 'Checkbox Group',
    description: 'Group of checkboxes for multiple selection',
    icon: null,
    createComponents: () => {
      const groupId = generateId();

      return [{
        id: groupId,
        type: 'checkbox-group' as ComponentType,
        props: {
          ...getDefaultPropsForComponent('checkbox-group'),
          groupName: 'checkboxGroup',
          options: 'Option 1\nOption 2\nOption 3',
          defaultValues: [],
          orientation: 'vertical',
          minSelections: 0,
          maxSelections: 0,
          required: false
        },
        style: {},
        children: []
      }];
    }
  }
];

export const getFormTemplate = (type: ComponentType): FormTemplate | undefined => {
  return formComponentTemplates.find(template => template.type === type);
};

// Helper to generate form wrapper children based on form type
export const generateFormChildren = (formType: FormType): AppComponent[] => {
  const config = formTypeConfigs[formType];
  if (!config) return [];

  const children: AppComponent[] = [];

  // Add title
  const titleId = generateId();
  children.push({
    id: titleId,
    type: 'heading',
    props: {
      ...getDefaultPropsForComponent('heading'),
      content: config.title,
      level: 2
    },
    style: {
      typography: { fontSize: '24px', fontWeight: '600', textAlign: 'center' },
      spacing: { margin: { bottom: 24 } }
    },
    children: []
  });

  // Add fields
  config.fields.forEach((field, index) => {
    const fieldId = generateId();
    const isLast = index === config.fields.length - 1;

    if (field.type === 'password-input') {
      children.push({
        id: fieldId,
        type: 'password-input' as ComponentType,
        props: {
          ...getDefaultPropsForComponent('password-input'),
          placeholder: field.placeholder,
          required: field.required,
          showToggle: true,
          showStrength: (field as any).showStrength || false
        },
        style: {
          sizing: { width: '100%' },
          spacing: { margin: { bottom: isLast ? 24 : 12 } }
        },
        children: []
      });
    } else if (field.type === 'textarea') {
      children.push({
        id: fieldId,
        type: 'textarea',
        props: {
          ...getDefaultPropsForComponent('textarea'),
          placeholder: field.placeholder,
          required: field.required,
          rows: 4
        },
        style: {
          sizing: { width: '100%' },
          spacing: { margin: { bottom: isLast ? 24 : 12 } }
        },
        children: []
      });
    } else {
      children.push({
        id: fieldId,
        type: 'input',
        props: {
          ...getDefaultPropsForComponent('input'),
          placeholder: field.placeholder,
          inputType: (field as any).inputType || 'text',
          required: field.required,
          disabled: (field as any).disabled || false
        },
        style: {
          sizing: { width: '100%' },
          spacing: { margin: { bottom: isLast ? 24 : 12 } }
        },
        children: []
      });
    }
  });

  // Add submit button
  const buttonId = generateId();
  children.push({
    id: buttonId,
    type: 'button',
    props: {
      ...getDefaultPropsForComponent('button'),
      text: config.submitText,
      variant: 'default',
      fullWidth: true
    },
    style: {},
    children: [],
    actions: [{
      id: 'form-submit',
      trigger: 'click',
      type: config.submitAction as any,
      config: {}
    }]
  });

  return children;
};
