#!/usr/bin/env node

/**
 * Reverse Centaur MCP server — Streamable HTTP transport
 *
 * Runs an HTTP server that speaks the MCP Streamable HTTP protocol,
 * with optional OAuth 2.0 authentication. Required for the Anthropic
 * Claude Directory and any remote MCP client.
 *
 * Environment variables:
 *   PORT                       — HTTP port (default: 3001)
 *   REVERSECENTAUR_API_URL     — API base URL
 *   REVERSECENTAUR_API_KEY     — API key (used when OAuth is off)
 *   REVERSECENTAUR_MOCK_MODE   — "true" for mock data
 *   REVERSECENTAUR_OAUTH       — "true" to enable OAuth 2.0
 *
 * Flags:
 *   --oauth   Enable OAuth 2.0 authentication
 */

import { randomUUID } from 'node:crypto';
import { createServer } from './server.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { getOAuthProtectedResourceMetadataUrl, mcpAuthMetadataRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { ReversecentaurOAuthProvider, TEST_API_KEY } from './oauth-provider.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Request, Response, RequestHandler } from 'express';

// ─── Config ─────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const useOAuth =
  process.argv.includes('--oauth') ||
  process.env.REVERSECENTAUR_OAUTH === 'true';

// Public base URL for OAuth metadata. Must be HTTPS in production.
// For local dev behind a tunnel (ngrok, cloudflared), set MCP_PUBLIC_URL.
const publicBaseUrl = process.env.MCP_PUBLIC_URL ?? `https://mcp.reversecentaur.ai`;

// ─── Express app ────────────────────────────────────────────────────
const app = createMcpExpressApp({ host: '0.0.0.0' });

// ─── OAuth setup (optional) ─────────────────────────────────────────
let authMiddleware: RequestHandler | null = null;
let oauthProvider: ReversecentaurOAuthProvider | null = null;

if (useOAuth) {
  const serverUrl = new URL(`${publicBaseUrl}/mcp`);
  const issuerUrl = new URL(publicBaseUrl);
  oauthProvider = new ReversecentaurOAuthProvider();

  // Mount the full OAuth auth router (handles /authorize, /token,
  // /register, /.well-known/oauth-authorization-server, etc.)
  app.use(
    mcpAuthRouter({
      provider: oauthProvider,
      issuerUrl,
      scopesSupported: ['mcp:tools'],
      resourceName: 'Reverse Centaur MCP Server',
      resourceServerUrl: serverUrl,
    }),
  );

  authMiddleware = requireBearerAuth({
    verifier: oauthProvider,
    requiredScopes: [],
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(serverUrl),
  });

  console.log('OAuth 2.0 enabled — clients must authenticate before using tools');
} else {
  console.log('OAuth disabled — using API key from environment');
}

// ─── Session management ─────────────────────────────────────────────
const transports = new Map<string, StreamableHTTPServerTransport>();

function getOrCreateServer(req: Request): McpServer {
  // When OAuth is enabled, check if the token maps to the test key
  // and enable mock mode accordingly
  const authToken = req.headers.authorization?.replace('Bearer ', '');
  if (oauthProvider && authToken) {
    const apiKey = oauthProvider.getApiKeyForToken(authToken);
    if (apiKey === TEST_API_KEY) {
      return createServer({ mockMode: true });
    }
    if (apiKey) {
      return createServer({ apiKey });
    }
  }

  return createServer();
}

// ─── MCP POST endpoint ──────────────────────────────────────────────
const mcpPostHandler: RequestHandler = async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports.has(sessionId)) {
      transport = transports.get(sessionId)!;
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New session
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid: string) => {
          transports.set(sid, transport);
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) transports.delete(sid);
      };

      const server = getOrCreateServer(req);
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID' },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
};

// ─── MCP GET endpoint (SSE streams) ─────────────────────────────────
const mcpGetHandler: RequestHandler = async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  await transports.get(sessionId)!.handleRequest(req, res);
};

// ─── MCP DELETE endpoint (session termination) ──────────────────────
const mcpDeleteHandler: RequestHandler = async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  await transports.get(sessionId)!.handleRequest(req, res);
};

// ─── Mount routes (with optional auth middleware) ────────────────────
if (authMiddleware) {
  app.post('/mcp', authMiddleware, mcpPostHandler);
  app.get('/mcp', authMiddleware, mcpGetHandler);
  app.delete('/mcp', authMiddleware, mcpDeleteHandler);
} else {
  app.post('/mcp', mcpPostHandler);
  app.get('/mcp', mcpGetHandler);
  app.delete('/mcp', mcpDeleteHandler);
}

// ─── Health check ───────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    server: 'reverse-centaur-mcp',
    transport: 'streamable-http',
    oauth: useOAuth,
    sessions: transports.size,
  });
});

// ─── Start ──────────────────────────────────────────────────────────
app.listen(PORT, (error?: Error) => {
  if (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
  console.log(`Reverse Centaur MCP server (HTTP) listening on port ${PORT}`);
  console.log(`  MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`  Health check: http://localhost:${PORT}/health`);
  if (useOAuth) {
    console.log(`  OAuth metadata: http://localhost:${PORT}/.well-known/oauth-authorization-server`);
    console.log(`  Test API key for reviewers: ${TEST_API_KEY}`);
  }
});

// ─── Graceful shutdown ──────────────────────────────────────────────
async function shutdown() {
  console.log('Shutting down...');
  for (const [sid, transport] of transports) {
    try {
      await transport.close();
    } catch {
      // ignore
    }
    transports.delete(sid);
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
