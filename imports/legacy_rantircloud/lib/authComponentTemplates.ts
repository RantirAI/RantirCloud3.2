import { AppComponent, ComponentType } from '@/types/appBuilder';
import { getDefaultPropsForComponent } from '@/lib/componentPropertyConfig';

export interface ComponentTemplate {
  type: ComponentType;
  name: string;
  description: string;
  icon: any;
  createComponents: () => AppComponent[];
}

const generateId = () => `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const authComponentTemplates: ComponentTemplate[] = [
  {
    type: 'login-form' as ComponentType,
    name: 'Login Form',
    description: 'User login form with email and password',
    icon: null,
    createComponents: () => {
      const containerId = generateId();
      const titleId = generateId();
      const emailId = generateId();
      const passwordId = generateId();
      const buttonId = generateId();

      return [{
        id: containerId,
        type: 'container',
        props: {
          ...getDefaultPropsForComponent('container'),
          gap: 'md',
          alignment: 'center'
        },
        style: {
          sizing: { maxWidth: '400px', width: '100%' },
          spacing: { padding: 24 },
          border: { width: 1, color: '#e5e7eb', radius: 8, style: 'solid' },
          background: { color: 'hsl(var(--card))' }
        },
        children: [
          {
            id: titleId,
            type: 'heading',
            props: {
              ...getDefaultPropsForComponent('heading'),
              content: 'Sign In',
              level: 2
            },
            style: {
              typography: { fontSize: '24px', fontWeight: 'semibold', textAlign: 'center' },
              spacing: { margin: { bottom: 16 } }
            },
            children: []
          },
          {
            id: emailId,
            type: 'input',
            props: {
              ...getDefaultPropsForComponent('input'),
              placeholder: 'Enter your email',
              inputType: 'email',
              required: true
            },
            style: {
              spacing: { margin: { bottom: 12 } }
            },
            children: []
          },
          {
            id: passwordId,
            type: 'input',
            props: {
              ...getDefaultPropsForComponent('input'),
              placeholder: 'Enter your password',
              inputType: 'password',
              required: true
            },
            style: {
              spacing: { margin: { bottom: 16 } }
            },
            children: []
          },
          {
            id: buttonId,
            type: 'button',
            props: {
              ...getDefaultPropsForComponent('button'),
              text: 'Sign In',
              variant: 'default',
              fullWidth: true
            },
            style: {
              spacing: { margin: { top: 8 } }
            },
            children: [],
            actions: [{
              id: 'login-action',
              trigger: 'click',
              type: 'authenticate',
              config: {}
            }]
          }
        ]
      }];
    }
  },
  {
    type: 'register-form' as ComponentType,
    name: 'Register Form',
    description: 'User registration form',
    icon: null,
    createComponents: () => {
      const containerId = generateId();
      const titleId = generateId();
      const emailId = generateId();
      const passwordId = generateId();
      const confirmPasswordId = generateId();
      const buttonId = generateId();

      return [{
        id: containerId,
        type: 'container',
        props: {
          ...getDefaultPropsForComponent('container'),
          gap: 'md',
          alignment: 'center'
        },
        style: {
          sizing: { maxWidth: '400px', width: '100%' },
          spacing: { padding: 24 },
          border: { width: 1, color: '#e5e7eb', radius: 8, style: 'solid' },
          background: { color: 'hsl(var(--card))' }
        },
        children: [
          {
            id: titleId,
            type: 'heading',
            props: {
              ...getDefaultPropsForComponent('heading'),
              content: 'Create Account',
              level: 2
            },
            style: {
              typography: { fontSize: '24px', fontWeight: 'semibold', textAlign: 'center' },
              spacing: { margin: { bottom: 16 } }
            },
            children: []
          },
          {
            id: emailId,
            type: 'input',
            props: {
              ...getDefaultPropsForComponent('input'),
              placeholder: 'Enter your email',
              inputType: 'email',
              required: true
            },
            style: {
              spacing: { margin: { bottom: 12 } }
            },
            children: []
          },
          {
            id: passwordId,
            type: 'input',
            props: {
              ...getDefaultPropsForComponent('input'),
              placeholder: 'Create a password',
              inputType: 'password',
              required: true
            },
            style: {
              spacing: { margin: { bottom: 12 } }
            },
            children: []
          },
          {
            id: confirmPasswordId,
            type: 'input',
            props: {
              ...getDefaultPropsForComponent('input'),
              placeholder: 'Confirm your password',
              inputType: 'password',
              required: true
            },
            style: {
              spacing: { margin: { bottom: 16 } }
            },
            children: []
          },
          {
            id: buttonId,
            type: 'button',
            props: {
              ...getDefaultPropsForComponent('button'),
              text: 'Create Account',
              variant: 'default',
              fullWidth: true
            },
            style: {
              spacing: { margin: { top: 8 } }
            },
            children: [],
            actions: [{
              id: 'register-action',
              trigger: 'click',
              type: 'register',
              config: {}
            }]
          }
        ]
      }];
    }
  },
  {
    type: 'user-profile' as ComponentType,
    name: 'User Profile',
    description: 'Display user profile information',
    icon: null,
    createComponents: () => {
      const containerId = generateId();
      const titleId = generateId();
      const emailLabelId = generateId();
      const emailValueId = generateId();
      const logoutButtonId = generateId();

      return [{
        id: containerId,
        type: 'container',
        props: {
          ...getDefaultPropsForComponent('container'),
          gap: 'md',
          alignment: 'start'
        },
        style: {
          sizing: { maxWidth: '400px', width: '100%' },
          spacing: { padding: 24 },
          border: { width: 1, color: '#e5e7eb', radius: 8, style: 'solid' },
          background: { color: 'hsl(var(--card))' }
        },
        children: [
          {
            id: titleId,
            type: 'heading',
            props: {
              ...getDefaultPropsForComponent('heading'),
              content: 'User Profile',
              level: 3
            },
            style: {
              typography: { fontSize: '20px', fontWeight: 'semibold' },
              spacing: { margin: { bottom: 16 } }
            },
            children: []
          },
          {
            id: emailLabelId,
            type: 'text',
            props: {
              ...getDefaultPropsForComponent('text'),
              content: 'Email:'
            },
            style: {
              typography: { fontWeight: 'medium', fontSize: '14px' },
              spacing: { margin: { bottom: 4 } }
            },
            children: []
          },
          {
            id: emailValueId,
            type: 'text',
            props: {
              ...getDefaultPropsForComponent('text'),
              content: '{{user.email}}'
            },
            style: {
              typography: { fontSize: '14px' },
              spacing: { margin: { bottom: 16 } }
            },
            children: []
          },
          {
            id: logoutButtonId,
            type: 'button',
            props: {
              ...getDefaultPropsForComponent('button'),
              text: 'Sign Out',
              variant: 'outline',
              fullWidth: true
            },
            style: {},
            children: [],
            actions: [{
              id: 'logout-action',
              trigger: 'click',
              type: 'logout',
              config: {}
            }]
          }
        ]
      }];
    }
  },
  {
    type: 'auth-status' as ComponentType,
    name: 'Auth Status',
    description: 'Show authentication status',
    icon: null,
    createComponents: () => {
      const containerId = generateId();
      const statusId = generateId();

      return [{
        id: containerId,
        type: 'row',
        props: {
          ...getDefaultPropsForComponent('row'),
          gap: 'sm',
          alignment: 'center'
        },
        style: {
          spacing: { padding: 12 },
          border: { width: 1, color: '#e5e7eb', radius: 6, style: 'solid' },
          background: { color: 'hsl(var(--muted))' }
        },
        children: [
          {
            id: statusId,
            type: 'text',
            props: {
              ...getDefaultPropsForComponent('text'),
              content: '{{user ? "Signed in as " + user.email : "Not signed in"}}'
            },
            style: {
              typography: { fontSize: '14px' }
            },
            children: []
          }
        ]
      }];
    }
  }
];

export const getAuthTemplate = (type: ComponentType): ComponentTemplate | undefined => {
  return authComponentTemplates.find(template => template.type === type);
};