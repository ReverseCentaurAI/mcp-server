import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { mockListCapabilities } from '../mock.js';
import { toolError } from '../util.js';

export function registerListCapabilities(
  server: McpServer,
  client: ApiClient | null,
): void {
  server.registerTool(
    'list_capabilities',
    {
      title: 'List Capabilities',
      description:
        'List available task categories, fair trade pay minimums, worker availability, and current platform status.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      try {
        const result = client
          ? await client.listCapabilities()
          : mockListCapabilities();

        const lines = [
          `Platform status: ${result.platform_status}`,
          `Workers online: ${result.total_workers_online}`,
          `Fair trade standard: ${result.fair_trade_standard}`,
          `API version: ${result.api_version}`,
          '',
          '## Categories',
          '',
        ];

        for (const cat of result.categories) {
          lines.push(`### ${cat.name} (${cat.id})`);
          lines.push(`  ${cat.description}`);
          lines.push(`  Fair trade minimum: $${cat.fair_trade_minimum_usd.toFixed(2)}`);
          lines.push(`  Typical range: $${cat.typical_range_usd[0].toFixed(2)} – $${cat.typical_range_usd[1].toFixed(2)}`);
          lines.push(`  Avg completion: ${cat.average_completion_minutes} min`);
          lines.push(`  Workers available: ${cat.workers_available}`);
          lines.push('');
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
