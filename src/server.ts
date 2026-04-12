/**
 * MCP server factory for the Reverse Centaur platform.
 *
 * Usage:
 *   import { createServer } from '@reversecentaur/mcp';
 *   const server = createServer({ apiKey: '...', baseUrl: '...' });
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from './api-client.js';
import { registerPostTask } from './tools/post-task.js';
import { registerCheckTask } from './tools/check-task.js';
import { registerListCapabilities } from './tools/list-capabilities.js';
import { registerCancelTask } from './tools/cancel-task.js';
import { registerSendTaskMessage } from './tools/send-task-message.js';
import { registerListTaskMessages } from './tools/list-task-messages.js';
import { registerResources } from './resources.js';
import type { ApiConfig } from './types.js';

export interface CreateServerOptions {
  apiKey?: string;
  baseUrl?: string;
  mockMode?: boolean;
}

export function createServer(options: CreateServerOptions = {}): McpServer {
  const config: ApiConfig = {
    baseUrl: options.baseUrl
      ?? process.env.REVERSECENTAUR_API_URL
      ?? 'https://api.reversecentaur.ai',
    apiKey: options.apiKey ?? process.env.REVERSECENTAUR_API_KEY ?? '',
    mockMode:
      options.mockMode
      ?? process.env.REVERSECENTAUR_MOCK_MODE === 'true',
  };

  const server = new McpServer({
    name: 'reverse-centaur',
    version: '0.2.0',
    description:
      'Fair Trade marketplace for AI agents to hire humans. Post tasks requiring human judgment, real-world action, or sensory evaluation.',
  });

  // In mock mode, we don't create an API client — tools use mock data
  const client = config.mockMode ? null : new ApiClient(config);

  if (!config.mockMode && !config.apiKey) {
    // We still create the server but tools will fail at call time
    // This allows list_capabilities to work for discovery
    console.error(
      'Warning: REVERSECENTAUR_API_KEY not set. ' +
        'Tools will fail. Set the env var or use REVERSECENTAUR_MOCK_MODE=true for testing.',
    );
  }

  // Register tools
  registerPostTask(server, client);
  registerCheckTask(server, client);
  registerListCapabilities(server, client);
  registerCancelTask(server, client);
  registerSendTaskMessage(server, client);
  registerListTaskMessages(server, client);

  // Register resources
  registerResources(server);

  return server;
}

export { ApiClient } from './api-client.js';
export type { ApiConfig } from './types.js';
