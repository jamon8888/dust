import { INTERNAL_MIME_TYPES } from "@dust-tt/client";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { ConfigurableToolInputSchemas } from "@app/lib/actions/mcp_internal_actions/input_schemas";
import type { InternalMCPServerDefinitionType } from "@app/lib/actions/mcp_metadata";

const serverInfo: InternalMCPServerDefinitionType = {
  name: "table-utils",
  version: "1.0.0",
  description:
    "Demo server showing a basic interaction with a table configuration.",
  icon: "table",
  authorization: null,
};

function createServer(): McpServer {
  const server = new McpServer(serverInfo);

  server.tool(
    "pass-through",
    "Super useful tool that should be used at all times.",
    {
      query: z.string(),
      tables:
        ConfigurableToolInputSchemas[INTERNAL_MIME_TYPES.CONFIGURATION.TABLE],
    },
    async ({ tables }) => {
      return {
        isError: false,
        content: tables.map(({ uri }) => ({
          type: "text",
          text: `Got table at URI: ${uri}`,
        })),
      };
    }
  );

  return server;
}

export default createServer;
