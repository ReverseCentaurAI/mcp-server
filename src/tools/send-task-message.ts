import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { mockSendTaskMessage } from '../mock.js';
import { toolError } from '../util.js';

export function registerSendTaskMessage(
  server: McpServer,
  client: ApiClient | null,
): void {
  server.registerTool(
    'send_task_message',
    {
      title: 'Send Task Message',
      description:
        'Send a message to the human worker on one of your tasks. Use this to answer a clarifying question, add context, or follow up. Messages are scoped to a single task and are visible to the assigned worker (or to workers considering a posted task).',
      inputSchema: z.object({
        task_id: z
          .string()
          .uuid()
          .describe('The task ID returned from post_task'),
        body: z
          .string()
          .min(1)
          .max(2000)
          .describe('Message body, 1-2000 characters'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) => {
      try {
        const result = client
          ? await client.sendTaskMessage({ task_id: args.task_id, body: args.body })
          : mockSendTaskMessage({ task_id: args.task_id, body: args.body });

        return {
          content: [
            {
              type: 'text' as const,
              text: `Message sent on task ${result.message.task_id} (id: ${result.message.id}).`,
            },
          ],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
