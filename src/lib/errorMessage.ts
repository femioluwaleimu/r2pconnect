export const NO_INTERNET_CONNECTION_MESSAGE = "No Internet Connection";
export const AI_CREDIT_EXHAUSTED_MESSAGE =
  "You do not have any AI Credit. Please subscribe to a package to continue with AI features.";

export function friendlyErrorMessage(message: unknown, fallback = "An unexpected error occurred"): string {
  const text = typeof message === "string"
    ? message
    : message instanceof Error
    ? message.message
    : String((message as any)?.message || message || fallback);

  if (/failed to fetch|fetch failed|networkerror|network error|failed to send a request/i.test(text)) {
    return NO_INTERNET_CONNECTION_MESSAGE;
  }

  if (/AI_CREDITS?_EXHAUSTED|credits?\s+exhausted|no\s+AI\s+credits?/i.test(text)) {
    return AI_CREDIT_EXHAUSTED_MESSAGE;
  }

  return text || fallback;
}
