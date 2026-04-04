#!/usr/bin/env node

/**
 * @reversecentaur/mcp — CLI entry point
 *
 * Starts the Reverse Centaur MCP server with stdio transport.
 * Configure via environment variables:
 *   REVERSECENTAUR_API_URL   — API base URL (default: https://api.reversecentaur.ai)
 *   REVERSECENTAUR_API_KEY   — API key for authentication
 *   REVERSECENTAUR_MOCK_MODE — Set to "true" for local testing without API calls
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Fatal error starting MCP server:', error);
  process.exit(1);
});
