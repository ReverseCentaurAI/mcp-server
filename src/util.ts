import { ApiError } from './api-client.js';

export function toolError(error: unknown) {
  if (error instanceof ApiError) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `${error.code}: ${error.message}${error.suggestion ? `\nSuggestion: ${error.suggestion}` : ''}`,
        },
      ],
      isError: true,
    };
  }

  const message =
    error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true,
  };
}
