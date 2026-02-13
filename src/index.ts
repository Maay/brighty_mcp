#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { accountTools } from "./tools/accounts.js";
import { payoutTools } from "./tools/payouts.js";
import { transferTools } from "./tools/transfers.js";
import { cardTools } from "./tools/cards.js";
import { memberTools } from "./tools/members.js";
import { setupTools } from "./tools/setup.js";

const server = new McpServer({
  name: "brighty-mcp",
  version: "1.0.0",
});

// Register all tools
const allTools = {
  ...setupTools,
  ...accountTools,
  ...payoutTools,
  ...transferTools,
  ...cardTools,
  ...memberTools,
};

for (const [name, tool] of Object.entries(allTools)) {
  // MCP SDK 1.25+ expects Zod raw shapes directly, not JSON Schema
  const shape = tool.inputSchema.shape;
  const hasParams = Object.keys(shape).length > 0;

  if (hasParams) {
    server.tool(
      name,
      tool.description,
      shape,
      async (args: Record<string, unknown>) => {
        try {
          const result = await (tool.handler as (input: unknown) => Promise<unknown>)(args);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  } else {
    server.tool(
      name,
      tool.description,
      async () => {
        try {
          const result = await (tool.handler as (input: unknown) => Promise<unknown>)({});
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
