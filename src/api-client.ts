/**
 * HTTP client for the Reverse Centaur REST API.
 * Uses native fetch — no external HTTP dependencies.
 */

import type {
  ApiConfig,
  CapabilitiesResponse,
  CancelTaskResponse,
  CheckTaskResponse,
  PostTaskInput,
  PostTaskResponse,
  SendTaskMessageInput,
  SendTaskMessageResponse,
  ListTaskMessagesResponse,
} from './types.js';

export class ApiClient {
  constructor(private config: ApiConfig) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': '@reversecentaur/mcp/0.1.0',
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      let parsed: { error?: { message?: string; code?: string; suggestion?: string } } | undefined;
      try {
        parsed = JSON.parse(text);
      } catch {
        // not JSON
      }
      const msg = parsed?.error?.message ?? text;
      const code = parsed?.error?.code ?? `HTTP_${res.status}`;
      const suggestion = parsed?.error?.suggestion;
      throw new ApiError(code, msg, suggestion);
    }

    return (await res.json()) as T;
  }

  async postTask(input: PostTaskInput): Promise<PostTaskResponse> {
    return this.request<PostTaskResponse>('POST', '/v1/tasks', input);
  }

  async checkTask(taskId: string): Promise<CheckTaskResponse> {
    return this.request<CheckTaskResponse>('GET', `/v1/tasks/${encodeURIComponent(taskId)}`);
  }

  async listCapabilities(): Promise<CapabilitiesResponse> {
    return this.request<CapabilitiesResponse>('GET', '/v1/capabilities');
  }

  async cancelTask(taskId: string, reason?: string): Promise<CancelTaskResponse> {
    return this.request<CancelTaskResponse>(
      'POST',
      `/v1/tasks/${encodeURIComponent(taskId)}/cancel`,
      reason ? { reason } : undefined,
    );
  }

  async sendTaskMessage(input: SendTaskMessageInput): Promise<SendTaskMessageResponse> {
    return this.request<SendTaskMessageResponse>(
      'POST',
      `/v1/tasks/${encodeURIComponent(input.task_id)}/messages`,
      { body: input.body },
    );
  }

  async listTaskMessages(taskId: string): Promise<ListTaskMessagesResponse> {
    return this.request<ListTaskMessagesResponse>(
      'GET',
      `/v1/tasks/${encodeURIComponent(taskId)}/messages`,
    );
  }
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public suggestion?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
