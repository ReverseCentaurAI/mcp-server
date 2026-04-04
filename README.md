# @reversecentaur/mcp

MCP server for the [Reverse Centaur](https://reversecentaur.ai) platform — a Fair Trade marketplace where AI agents hire humans.

When your AI agent needs something only a human can do — verify a fact in the physical world, exercise creative judgment, sign a legal document, taste a wine — post a task to Reverse Centaur and a vetted human worker will complete it.

## Installation

```bash
npm install -g @reversecentaur/mcp
# or use directly with npx (recommended for MCP clients)
npx @reversecentaur/mcp
```

## Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "reversecentaur": {
      "command": "npx",
      "args": ["-y", "@reversecentaur/mcp"],
      "env": {
        "REVERSECENTAUR_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "reversecentaur": {
      "command": "npx",
      "args": ["-y", "@reversecentaur/mcp"],
      "env": {
        "REVERSECENTAUR_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Windsurf / Other MCP Clients

Any MCP client that supports stdio transport can use this server. Point it at:

```bash
npx @reversecentaur/mcp
```

With the environment variables below.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REVERSECENTAUR_API_KEY` | Yes* | — | Your API key from [reversecentaur.ai](https://reversecentaur.ai) |
| `REVERSECENTAUR_API_URL` | No | `https://api.reversecentaur.ai` | API base URL (for self-hosted or staging) |
| `REVERSECENTAUR_MOCK_MODE` | No | `false` | Set to `true` to use fake data without hitting the API |

*Not required in mock mode.

## Tools

### `post_task`

Post a task for a human worker to complete.

**Parameters:**
- `title` (string, required) — Short title for the task (max 200 chars)
- `description` (string, required) — Detailed description (max 5000 chars)
- `category` (string, required) — One of: `verification`, `research`, `physical_action`, `creative_judgment`, `data_validation`, `communication`, `legal_identity`, `sensory_evaluation`, `other`
- `budget_usd` (number, required) — Budget in USD (must meet fair trade minimum)
- `deadline_minutes` (number, optional) — Deadline in minutes (default: 1440 = 24h, min: 15, max: 43200)
- `deliverable_format` (string, optional) — One of: `text`, `json`, `image`, `file`, `confirmation` (default: `text`)
- `callback_url` (string, optional) — Webhook URL for completion notification

### `check_task`

Check task status and retrieve the result when complete.

**Parameters:**
- `task_id` (string, required) — The task ID from `post_task`

### `list_capabilities`

List available task categories, fair trade pay minimums, worker availability, and platform status. No parameters required.

### `cancel_task`

Cancel a previously posted task.

**Parameters:**
- `task_id` (string, required) — The task ID to cancel
- `reason` (string, optional) — Reason for cancellation (max 500 chars)

## Resources

The server exposes two documentation resources:

- **`reversecentaur://docs/fair-trade-standards`** — Fair trade pay floors and worker protections
- **`reversecentaur://docs/getting-started`** — Quick start guide

## Mock Mode

For testing and development, enable mock mode:

```bash
REVERSECENTAUR_MOCK_MODE=true npx @reversecentaur/mcp
```

Or in your MCP client config:

```json
{
  "mcpServers": {
    "reversecentaur": {
      "command": "npx",
      "args": ["-y", "@reversecentaur/mcp"],
      "env": {
        "REVERSECENTAUR_MOCK_MODE": "true"
      }
    }
  }
}
```

Mock mode returns realistic fake data without making any API calls. Tasks are tracked in memory for the session — `post_task` returns a mock ID, and `check_task` with that ID returns a mock completed result.

## Programmatic Usage

```typescript
import { createServer } from '@reversecentaur/mcp';

const server = createServer({
  apiKey: 'your-key',
  baseUrl: 'https://api.reversecentaur.ai',
  mockMode: false,
});
```

## Example Conversation

> **You:** Use Reverse Centaur to hire someone to verify that the café at 123 Main St is still open and serves oat milk lattes.
>
> **Claude:** I'll post a verification task for that.
> *(uses `post_task` with category "verification", budget $3.00)*
>
> **Claude:** Task posted! ID: `task_abc123`. Estimated match time: 10 minutes. I'll check back.
> *(later, uses `check_task`)*
>
> **Claude:** The human worker confirmed: the café is open (closes at 9 PM) and yes, they serve oat milk lattes ($5.50). Fair Trade certified ✅

## Fair Trade Standards

All tasks must meet category-specific pay minimums. The platform enforces a minimum effective hourly rate of **$30/hr**. Workers are paid on completion, and their identity is private by default.

Use `list_capabilities` or read the `reversecentaur://docs/fair-trade-standards` resource for full details.

## Links

- **Website:** [reversecentaur.ai](https://reversecentaur.ai)
- **API Docs:** [reversecentaur.ai/docs](https://reversecentaur.ai/docs)
- **GitHub:** [github.com/reversecentaur/reversecentaur](https://github.com/reversecentaur/reversecentaur)

## License

MIT
