
export function getUserFriendlyError(errorMessage: string): string {
  const errorMap: Record<string, string> = {
    'Invalid or inactive flow': 'This chat service is currently unavailable. Please try again later.',
    'Flow ID is required': 'This chat service is not properly configured.',
    'Domain not allowed for this flow': 'This chat service is not available on this website.',
    'Origin required for domain-restricted flow': 'This chat service is not available on this website.',
    'Message is required': 'Please enter a message.',
  };

  for (const [key, friendly] of Object.entries(errorMap)) {
    if (errorMessage.includes(key)) return friendly;
  }

  return 'Something went wrong. Please try again.';
}

export function getEmulatorFriendlyError(errorMessage: string): string {
  const errorMap: Record<string, string> = {
    'Invalid or inactive flow': "This flow hasn't been deployed yet. Deploy it from the Chat Widget settings to test it here.",
    'Flow ID is required': 'No flow project found. Please save your flow first.',
    'Domain not allowed for this flow': 'Domain restriction is blocking this request.',
    'Message is required': 'Please enter a message.',
  };

  for (const [key, friendly] of Object.entries(errorMap)) {
    if (errorMessage.includes(key)) return friendly;
  }

  return 'Something went wrong. Please try again.';
}
