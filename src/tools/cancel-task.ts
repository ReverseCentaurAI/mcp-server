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
        'Cancel a previously posted task. Use when the task is no longer needed or was posted in error. ' +
        'If no worker has been assigned, the full budget is refunded. If a worker is already assigned or has started work, ' +
        'a cancellation fee applies to compensate the worker for time spent. The response includes the exact refund amount and any fees. ' +
        'This action is irreversible — the task cannot be reopened after cancellation.',
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
