import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { mockPostTask } from '../mock.js';
import { TASK_CATEGORIES, DELIVERABLE_FORMATS } from '../types.js';
import { toolError } from '../util.js';

export function registerPostTask(
  server: McpServer,
  client: ApiClient | null,
): void {
  server.registerTool(
    'post_task',
    {
      title: 'Post Task',
      description:
        'Post a task for a human worker to complete via the Reverse Centaur Fair Trade marketplace. ' +
        'Tasks must meet category-specific fair trade pay minimums.',
      inputSchema: z.object({
        title: z.string().max(200).describe('Short title for the task'),
        description: z
          .string()
          .max(5000)
          .describe('Detailed description of what the human should do'),
        category: z
          .enum(TASK_CATEGORIES)
          .describe('Task category (determines fair trade minimum)'),
        budget_usd: z
          .number()
          .min(1)
          .describe('Budget in USD (must meet fair trade minimum for category)'),
        deadline_minutes: z
          .number()
          .int()
          .min(15)
          .max(43200)
          .optional()
          .default(1440)
          .describe('Deadline in minutes from now (default: 1440 = 24h)'),
        deliverable_format: z
          .enum(DELIVERABLE_FORMATS)
          .optional()
          .default('text')
          .describe('Expected format of the deliverable'),
        callback_url: z
          .string()
          .url()
          .optional()
          .describe('Webhook URL to receive task completion notification'),
      }),
    },
    async (args) => {
      try {
        const result = client
          ? await client.postTask(args)
          : mockPostTask(args);

        return {
          content: [
            {
              type: 'text' as const,
              text: [
                `✅ Task posted: ${result.task_id}`,
                `Status: ${result.status}`,
                `Budget: $${result.budget_usd.toFixed(2)}`,
                `Fair trade minimum met: ${result.fair_trade_minimum_met}`,
                `Estimated match time: ${result.estimated_match_time_minutes} minutes`,
                `Deadline: ${result.deadline}`,
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
