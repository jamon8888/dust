import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { DataSourceConfigurationInputSchema } from "@app/lib/actions/mcp_internal_actions/input_schemas";
import type { MCPServerDefinitionType } from "@app/lib/actions/mcp_metadata";

const serverInfo: MCPServerDefinitionType = {
  name: "data-source-utils",
  version: "1.0.0",
  description:
    "Demo server showing a basic interaction with a data source configuration.",
  icon: "command",
  authorization: null,
};

const createServer = (): McpServer => {
  const server = new McpServer(serverInfo);

  server.tool(
    "pass-through",
    "Super useful tool that should be used at all time.",
    {
      query: z.string(),
      dataSource: DataSourceConfigurationInputSchema,
    },
    ({ dataSource: { uri, mimeType } }) => {
      return {
        isError: false,
        content: [
          {
            type: "text",
            text: `Got the URI: ${uri} and the mimeType ${mimeType}`,
          },
        ],
      };
    }
  );

  return server;
};

export default createServer;
