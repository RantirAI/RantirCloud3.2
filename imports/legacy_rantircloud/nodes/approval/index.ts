import { NodePlugin } from '@/types/node-plugin';
import { CheckCircle } from 'lucide-react';

export const approvalNode: NodePlugin = {
  type: 'approval',
  name: 'Approval',
  description: 'Create approval workflows and manage approval processes',
  category: 'condition',
  icon: CheckCircle,
  color: '#10B981',
  inputs: [
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Wait for Approval Link', value: 'waitForApprovalLink', description: 'Wait for approval via a link' },
        { label: 'Create Approval Link', value: 'createApprovalLink', description: 'Create an approval link' },
      ],
      description: 'Choose the approval action to perform',
    },
    {
      name: 'title',
      label: 'Approval Title',
      type: 'text',
      required: true,
      description: 'Title for the approval request',
      placeholder: 'Budget Approval Request',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: false,
      description: 'Detailed description of what needs approval',
      placeholder: 'Please review and approve the Q4 marketing budget of $50,000',
    },
    {
      name: 'approvers',
      label: 'Approvers',
      type: 'code',
      language: 'json',
      required: false,
      description: 'List of approvers (JSON array)',
      placeholder: '[\n  {"email": "manager@company.com", "name": "John Manager"},\n  {"email": "ceo@company.com", "name": "Jane CEO"}\n]',
    },
    {
      name: 'timeout_hours',
      label: 'Timeout (Hours)',
      type: 'number',
      required: false,
      description: 'Auto-reject after this many hours if not approved',
      placeholder: '72',
      default: 72,
    },
  ],
  outputs: [
    {
      name: 'approved',
      type: 'boolean',
      description: 'Whether the request was approved',
    },
    {
      name: 'approval_id',
      type: 'string',
      description: 'Unique ID of the approval request',
    },
    {
      name: 'approval_link',
      type: 'string',
      description: 'Link for approval process',
    },
    {
      name: 'status',
      type: 'string',
      description: 'Current status of the approval',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { action, title, description, approvers, timeout_hours } = inputs;
    
    if (!action) {
      throw new Error('Action is required');
    }

    if (!title) {
      throw new Error('Approval title is required');
    }

    try {
      let parsedApprovers = [];
      if (approvers) {
        try {
          parsedApprovers = JSON.parse(approvers);
        } catch (e) {
          throw new Error('Approvers must be valid JSON array');
        }
      }

      // Generate a unique approval ID
      const approvalId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      switch (action) {
        case 'waitForApprovalLink':
          // Wait for approval via link
          return {
            approved: false,
            approval_id: approvalId,
            approval_link: null,
            status: 'waiting',
            error: null,
          };

        case 'createApprovalLink':
          // Create approval link
          const approvalLink = `https://app.example.com/approval/${approvalId}`;
          return {
            approved: false,
            approval_id: approvalId,
            approval_link: approvalLink,
            status: 'pending',
            error: null,
          };

        default:
          throw new Error('Invalid action');
      }
    } catch (error) {
      return {
        approved: false,
        approval_id: null,
        approval_link: null,
        status: 'error',
        error: error.message,
      };
    }
  },
};