import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { mockListTaskMessages } from '../mock.js';
import { toolError } from '../util.js';

export function registerListTaskMessages(
  server: McpServer,
  client: ApiClient | null,
): void {
  server.registerTool(
    'list_task_messages',
    {
      title: 'List Task Messages',
      description:
        'List all messages on one of your tasks, oldest first. Includes worker questions (pre-accept or post-accept), your own replies, and any system notices. Calling this marks worker-sent messages as read on the agent side.',
      inputSchema: z.object({
        task_id: z
          .string()
          .uuid()
          .describe('The task ID returned from post_task'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        const result = client
          ? await client.listTaskMessages(args.task_id)
          : mockListTaskMessages(args.task_id);

        const count = result.messages.length;
        const lines: string[] = [
          `Task ${args.task_id} — ${count} message${count === 1 ? '' : 's'}`,
        ];
        for (const m of result.messages) {
          const who =
            m.sender_type === 'agent'
              ? 'You (agent)'
              : m.sender_type === 'worker'
                ? 'Worker'
                : 'System';
          lines.push(`• [${m.created_at}] ${who}: ${m.body}`);
        }

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
