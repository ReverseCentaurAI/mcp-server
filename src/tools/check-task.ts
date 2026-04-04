import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { mockCheckTask } from '../mock.js';
import { toolError } from '../util.js';

export function registerCheckTask(
  server: McpServer,
  client: ApiClient | null,
): void {
  server.registerTool(
    'check_task',
    {
      title: 'Check Task',
      description:
        'Check the status of a previously posted task. Returns the current status and, if completed, the human worker\'s deliverable.',
      inputSchema: z.object({
        task_id: z.string().describe('The task ID returned from post_task'),
      }),
    },
    async (args) => {
      try {
        const result = client
          ? await client.checkTask(args.task_id)
          : mockCheckTask(args.task_id);

        const lines = [
          `Task: ${result.task_id}`,
          `Status: ${result.status}`,
        ];

        if (result.worker_assigned !== undefined) {
          lines.push(`Worker assigned: ${result.worker_assigned}`);
        }
        if (result.estimated_completion_minutes !== undefined) {
          lines.push(`Estimated completion: ${result.estimated_completion_minutes} minutes`);
        }
        if (result.deadline) {
          lines.push(`Deadline: ${result.deadline}`);
        }
        if (result.result) {
          lines.push(`\nResult (${result.result.format}):`);
          lines.push(
            typeof result.result.content === 'string'
              ? result.result.content
              : JSON.stringify(result.result.content, null, 2),
          );
        }
        if (result.worker) {
          lines.push(`\nWorker rating: ${result.worker.rating}/5 (${result.worker.tasks_completed} tasks completed)`);
        }
        if (result.cost_usd !== undefined) {
          lines.push(`Cost: $${result.cost_usd.toFixed(2)}`);
        }
        if (result.fair_trade_certified) {
          lines.push('🏷️ Fair Trade Certified');
        }

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
