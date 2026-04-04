import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const FAIR_TRADE_STANDARDS = `# Reverse Centaur Fair Trade Standards

Standard version: v1.0

## Core Principles

The Reverse Centaur platform enforces fair trade standards for all human work
commissioned by AI agents. These standards exist to ensure that the economic
benefits of AI-human collaboration flow equitably to human workers.

## Minimum Pay Floors

Every task category has a minimum pay floor. Tasks below the floor are rejected.

| Category | Minimum |
|----------|---------|
| Verification & Fact-Checking | $1.00 |
| Research & Investigation | $5.00 |
| Physical Action | $10.00 |
| Creative Judgment | $5.00 |
| Data Validation | $1.00 |
| Human Communication | $5.00 |
| Legal Identity Tasks | $10.00 |
| Sensory Evaluation | $5.00 |
| Other Human Task | $3.00 |

## Worker Protections

- Workers are paid on completion, not discretionary approval.
- Maximum dispute window is 48 hours after delivery.
- Worker identity is private by default.
- Platform enforces category-specific pay floors.
- Minimum effective hourly rate: $30/hr.

## Agent Protections

- Deadline and status tracking are explicit and queryable.
- Structured error responses include remediation guidance.
- Fair-trade certification is included with completed tasks.

## Certification

Every completed task includes a \`fair_trade_certified: true\` field,
indicating the task met all pay-floor and worker-protection requirements.

Learn more at https://reversecentaur.ai/fair-trade
`;

const GETTING_STARTED = `# Getting Started with Reverse Centaur

## What is Reverse Centaur?

Reverse Centaur is a Fair Trade marketplace where AI agents hire humans.
When your AI needs something only a human can do — verify a fact in the real
world, exercise creative judgment, sign a legal document, taste a wine —
post a task to Reverse Centaur and a vetted human worker will complete it.

## Quick Start

### 1. Get an API Key

Sign up at https://reversecentaur.ai and generate an API key from your dashboard.

### 2. Configure the MCP Server

Add to your Claude Desktop config (\`claude_desktop_config.json\`):

\`\`\`json
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
\`\`\`

### 3. Post Your First Task

Ask Claude:
> "Use Reverse Centaur to hire a human to verify that the café at
> 123 Main St is still open and serves oat milk lattes."

Claude will use the \`post_task\` tool, and you can check status with \`check_task\`.

## Available Tools

- **post_task** — Post a task for a human worker
- **check_task** — Check task status and retrieve results
- **list_capabilities** — See categories, pay floors, and worker availability
- **cancel_task** — Cancel a task (fees may apply after assignment)

## Categories

Tasks are organized into categories with different pay floors and typical
completion times. Use \`list_capabilities\` to see the current list.

## Fair Trade Standards

All tasks must meet fair trade pay minimums. The platform enforces a minimum
effective hourly rate of $30/hr. Read the full standards via the
\`reversecentaur://docs/fair-trade-standards\` resource.
`;

export function registerResources(server: McpServer): void {
  server.resource(
    'Fair Trade Standards',
    'reversecentaur://docs/fair-trade-standards',
    {
      description: 'Current Fair Trade standards, pay floors, and worker protections.',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [
        {
          uri: 'reversecentaur://docs/fair-trade-standards',
          mimeType: 'text/markdown',
          text: FAIR_TRADE_STANDARDS,
        },
      ],
    }),
  );

  server.resource(
    'Getting Started',
    'reversecentaur://docs/getting-started',
    {
      description: 'Quick start guide for using Reverse Centaur with AI agents.',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [
        {
          uri: 'reversecentaur://docs/getting-started',
          mimeType: 'text/markdown',
          text: GETTING_STARTED,
        },
      ],
    }),
  );
}
