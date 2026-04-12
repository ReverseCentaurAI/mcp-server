/**
 * OAuth 2.0 provider for the Reverse Centaur MCP server.
 *
 * Implements the OAuthServerProvider interface from the MCP SDK.
 * Users authorize by entering their Reverse Centaur API key on a
 * simple consent page. The key is validated, and an access token is
 * issued that the MCP client (e.g. Claude) uses for subsequent requests.
 *
 * For Anthropic reviewers: use API key "rc_test_anthropic_review_2026"
 * to activate mock mode with sample data.
 */

import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type {
  OAuthServerProvider,
  AuthorizationParams,
} from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type {
  OAuthClientInformationFull,
  OAuthTokens,
  OAuthTokenRevocationRequest,
} from '@modelcontextprotocol/sdk/shared/auth.js';

// ─── Test / review API key ──────────────────────────────────────────
export const TEST_API_KEY = 'rc_test_anthropic_review_2026';

// ─── In-memory client store ─────────────────────────────────────────
export class ClientsStore implements OAuthRegisteredClientsStore {
  private clients = new Map<string, OAuthClientInformationFull>();

  async getClient(clientId: string) {
    return this.clients.get(clientId);
  }

  async registerClient(
    client: Omit<OAuthClientInformationFull, 'client_id' | 'client_id_issued_at'>,
  ): Promise<OAuthClientInformationFull> {
    const full = client as OAuthClientInformationFull;
    this.clients.set(full.client_id, full);
    return full;
  }
}

// ─── Code / token data ──────────────────────────────────────────────
interface CodeData {
  client: OAuthClientInformationFull;
  params: AuthorizationParams;
  apiKey: string;
}

interface TokenData {
  token: string;
  clientId: string;
  scopes: string[];
  expiresAt: number;
  apiKey: string;
  resource?: URL;
}

// ─── OAuth provider ─────────────────────────────────────────────────
export class ReversecentaurOAuthProvider implements OAuthServerProvider {
  readonly clientsStore = new ClientsStore();
  private codes = new Map<string, CodeData>();
  private tokens = new Map<string, TokenData>();
  private apiKeyToToken = new Map<string, string>();

  /**
   * Validate an API key. In production this would hit the real API;
   * here we accept the test key plus any key starting with "rc_".
   */
  private isValidApiKey(key: string): boolean {
    if (key === TEST_API_KEY) return true;
    return key.startsWith('rc_') && key.length >= 10;
  }

  /**
   * Renders a minimal consent page where the user enters their API key.
   * On submit, the form POSTs back to the same URL with the key.
   */
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    // If the request already carries an API key (form POST), process it
    const apiKey = (res.req as { body?: { api_key?: string } }).body?.api_key;

    if (apiKey) {
      if (!this.isValidApiKey(apiKey)) {
        res.status(400).send(this.renderPage('Invalid API key. Please try again.', params, client));
        return;
      }

      // Issue authorization code
      const code = randomUUID();
      this.codes.set(code, { client, params, apiKey });

      const target = new URL(params.redirectUri);
      target.searchParams.set('code', code);
      if (params.state) target.searchParams.set('state', params.state);
      res.redirect(target.toString());
      return;
    }

    // First visit — show the consent page
    res.status(200).send(this.renderPage(null, params, client));
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const data = this.codes.get(authorizationCode);
    if (!data) throw new Error('Invalid authorization code');
    return data.params.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<OAuthTokens> {
    const data = this.codes.get(authorizationCode);
    if (!data) throw new Error('Invalid authorization code');
    if (data.client.client_id !== client.client_id) {
      throw new Error('Authorization code was not issued to this client');
    }

    this.codes.delete(authorizationCode);

    // Reuse existing token for same API key if valid
    const existingToken = this.apiKeyToToken.get(data.apiKey);
    if (existingToken) {
      const existing = this.tokens.get(existingToken);
      if (existing && existing.expiresAt > Date.now()) {
        return {
          access_token: existingToken,
          token_type: 'bearer',
          expires_in: Math.floor((existing.expiresAt - Date.now()) / 1000),
          scope: existing.scopes.join(' '),
        };
      }
    }

    const token = randomUUID();
    const expiresAt = Date.now() + 24 * 3600 * 1000; // 24 hours
    this.tokens.set(token, {
      token,
      clientId: client.client_id,
      scopes: data.params.scopes ?? [],
      expiresAt,
      apiKey: data.apiKey,
      resource: data.params.resource,
    });
    this.apiKeyToToken.set(data.apiKey, token);

    return {
      access_token: token,
      token_type: 'bearer',
      expires_in: 24 * 3600,
      scope: (data.params.scopes ?? []).join(' '),
    };
  }

  async exchangeRefreshToken(): Promise<OAuthTokens> {
    throw new Error('Refresh tokens are not supported — re-authorize instead');
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const data = this.tokens.get(token);
    if (!data || data.expiresAt < Date.now()) {
      throw new Error('Invalid or expired token');
    }
    return {
      token,
      clientId: data.clientId,
      scopes: data.scopes,
      expiresAt: Math.floor(data.expiresAt / 1000),
    };
  }

  async revokeToken(
    _client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest,
  ): Promise<void> {
    this.tokens.delete(request.token);
  }

  /**
   * Look up the API key associated with a verified access token.
   * Used by the HTTP server to configure the MCP server in the right mode.
   */
  getApiKeyForToken(token: string): string | undefined {
    return this.tokens.get(token)?.apiKey;
  }

  // ─── HTML consent page ──────────────────────────────────────────
  private renderPage(
    error: string | null,
    _params: AuthorizationParams,
    _client: OAuthClientInformationFull,
  ): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Authorize — Reverse Centaur</title>
  <style>
    body { margin:0; padding:40px 16px; background:#f5f1e8; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
    .card { max-width:420px; margin:0 auto; background:#fffdf8; border-radius:12px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.06); }
    .header { background:#0f766e; padding:28px 24px; text-align:center; }
    .header h1 { margin:0; font-size:20px; color:#fff; }
    .header p { margin:6px 0 0; font-size:12px; color:#ccfbf1; text-transform:uppercase; letter-spacing:.5px; }
    .body { padding:24px; }
    .body label { display:block; font-size:14px; color:#333; margin-bottom:6px; }
    .body input { width:100%; padding:10px 12px; border:1px solid #d4ddd5; border-radius:6px; font-size:14px; box-sizing:border-box; }
    .body button { margin-top:16px; width:100%; padding:12px; background:#0f766e; color:#fff; border:none; border-radius:8px; font-size:15px; font-weight:600; cursor:pointer; }
    .body button:hover { background:#115e59; }
    .error { color:#b91c1c; font-size:13px; margin-bottom:12px; }
    .hint { font-size:12px; color:#888; margin-top:8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Reverse Centaur</h1>
      <p>MCP Server Authorization</p>
    </div>
    <div class="body">
      ${error ? `<p class="error">${error}</p>` : ''}
      <p style="font-size:14px;color:#333;margin:0 0 16px;">
        Enter your Reverse Centaur API key to authorize this connection.
      </p>
      <form method="POST">
        <label for="api_key">API Key</label>
        <input type="password" id="api_key" name="api_key" placeholder="rc_..." required autocomplete="off" />
        <p class="hint">Your key is validated server-side and never shared with the connecting client.</p>
        <button type="submit">Authorize</button>
      </form>
    </div>
  </div>
</body>
</html>`;
  }
}
