export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function toRecord<T = any>(v: unknown): Record<string, T> {
  return (typeof v === 'object' && v !== null) ? v as Record<string, T> : {};
}