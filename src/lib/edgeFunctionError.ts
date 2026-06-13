/**
 * Extracts a user-friendly error message from edge function responses.
 * Handles various error response formats and provides meaningful defaults.
 */
export function getEdgeFunctionError(error: any, fallback: string = "An unexpected error occurred"): string {
  if (!error) return fallback;
  
  // If it's a string, return it directly
  if (typeof error === 'string') {
    return error;
  }

  // Try to extract actual error from context body first (highest priority)
  if (error.context?.body) {
    try {
      const body = typeof error.context.body === 'string' 
        ? JSON.parse(error.context.body) 
        : error.context.body;
      if (body.error && typeof body.error === 'string') return body.error;
      if (body.message && typeof body.message === 'string') return body.message;
    } catch {
      // continue to other checks
    }
  }
  
  // Check for structured error response from edge function
  if (error.message) {
    // Never show the generic edge function error to users
    if (error.message.includes('Edge Function returned a non-2xx status code')) {
      return fallback;
    }
    // Never show generic fetch errors
    if (error.message.includes('Failed to send a request to the Edge Function')) {
      return 'Service temporarily unavailable. Please try again.';
    }
    return error.message;
  }
  
  // Check for error property directly
  if (error.error) {
    return typeof error.error === 'string' ? error.error : fallback;
  }
  
  return fallback;
}

/**
 * Handles edge function invocation result and extracts error or data.
 * Returns a tuple of [data, errorMessage]
 */
export function handleEdgeFunctionResponse<T>(
  data: T | null,
  error: any
): [T | null, string | null] {
  if (error) {
    return [null, getEdgeFunctionError(error)];
  }
  
  // Check if data contains an error field
  if (data && typeof data === 'object' && 'error' in data) {
    return [null, (data as any).error];
  }
  
  return [data, null];
}
