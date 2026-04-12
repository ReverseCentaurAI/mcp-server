import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { mockCancelTask } from '../mock.js';
import { toolError } from '../util.js';

export function registerCancelTask(
  server: McpServer,
  client: ApiClient | null,
): void {
  server.registerTool(
    'cancel_task',
    {
      title: 'Cancel Task',
      description:
        'Cancel a previously posted task. Cancellation fees may apply if a worker has already been assigned.',
      inputSchema: z.object({
        task_id: z.string().describe('The task ID to cancel'),
        reason: z
          .string()
          .max(500)
          .optional()
          .describe('Optional reason for cancellation'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async (args) => {
      try {
        const result = client
          ? await client.cancelTask(args.task_id, args.reason)
          : mockCancelTask(args.task_id, args.reason);

        return {
          content: [
            {
              type: 'text' as const,
              text: [
                result.message,
                `Refund: $${result.refund_usd.toFixed(2)}`,
                result.cancellation_fee_usd > 0
                  ? `Cancellation fee: $${result.cancellation_fee_usd.toFixed(2)}`
                  : 'No cancellation fee.',
              ].join('\n'),
            },
          ],
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
