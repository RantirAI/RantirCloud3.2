export function parseCsvToSubscribers(csvContent: string) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  
  const subscribers = lines.slice(1).map(line => {
    const values = line.split(',');
    const subscriber: any = {};
    
    headers.forEach((header, index) => {
      subscriber[header.trim()] = values[index]?.trim() || '';
    });
    
    // Map to expected format for import function
    return {
      email: subscriber.email,
      name: subscriber.name,
      plan: subscriber.plan_description,
      workspaceName: subscriber['Workspace Name'],
      customerId: subscriber.customer_id,
      monthlyValue: subscriber.subscription_monthly_value
    };
  });
  
  return subscribers;
}