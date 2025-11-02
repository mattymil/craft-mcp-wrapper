#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { Config } from "./types.js";
import {
  searchAllNotesSchema,
  searchDocumentSchema,
  readDocumentSchema,
  readBlockSchema,
} from "./types.js";
import {
  listDocuments,
  searchAllNotes,
  searchDocument,
  readDocument,
  readBlock,
} from "./tools.js";
import { startSSEServer } from "./server.js";

// Load environment variables
dotenv.config();

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load and validate configuration from config.json
 *
 * @returns Configuration object
 */
function loadConfig(): Config {
  try {
    const configPath = join(__dirname, "..", "config.json");
    const configData = readFileSync(configPath, "utf-8");
    const config: Config = JSON.parse(configData);

    if (!config.documents || !Array.isArray(config.documents)) {
      throw new Error("Invalid config: documents array is required");
    }

    if (config.documents.length === 0) {
      throw new Error("Invalid config: at least one document is required");
    }

    for (const doc of config.documents) {
      if (!doc.name || !doc.apiEndpoint) {
        throw new Error(
          "Invalid config: each document must have name and apiEndpoint"
        );
      }
    }

    return config;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Failed to load config.json:", error.message);
    }
    process.exit(1);
  }
}

/**
 * Create and configure the MCP server
 *
 * @param config - Application configuration
 * @returns Configured MCP server
 */
function createMCPServer(config: Config): Server {
  const server = new Server(
    {
      name: "craft-wrapper",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle tools/list requests
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "list_documents",
          description:
            "List all available Craft documents configured in the server",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "search_all_notes",
          description:
            "Search across all configured Craft documents. Returns aggregated results with document name context. Gracefully handles failures from individual documents.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query pattern",
              },
              caseSensitive: {
                type: "boolean",
                description:
                  "Whether search is case-sensitive (default: false)",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "search_document",
          description:
            "Search within a specific Craft document by name. Returns matching blocks with context.",
          inputSchema: {
            type: "object",
            properties: {
              documentName: {
                type: "string",
                description: "Name of the document to search",
              },
              query: {
                type: "string",
                description: "Search query pattern",
              },
              caseSensitive: {
                type: "boolean",
                description:
                  "Whether search is case-sensitive (default: false)",
              },
            },
            required: ["documentName", "query"],
          },
        },
        {
          name: "read_document",
          description:
            "Read the entire structure of a Craft document, including all blocks and their hierarchy",
          inputSchema: {
            type: "object",
            properties: {
              documentName: {
                type: "string",
                description: "Name of the document to read",
              },
              maxDepth: {
                type: "number",
                description:
                  "Maximum depth of block hierarchy to fetch (optional)",
              },
            },
            required: ["documentName"],
          },
        },
        {
          name: "read_block",
          description:
            "Read a specific block from a Craft document by its ID",
          inputSchema: {
            type: "object",
            properties: {
              documentName: {
                type: "string",
                description: "Name of the document containing the block",
              },
              blockId: {
                type: "string",
                description: "ID of the block to read",
              },
            },
            required: ["documentName", "blockId"],
          },
        },
      ],
    };
  });

  // Handle tools/call requests
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: any;

      switch (name) {
        case "list_documents":
          result = await listDocuments(config);
          break;

        case "search_all_notes": {
          const parsed = searchAllNotesSchema.parse(args);
          result = await searchAllNotes(
            config,
            parsed.query,
            parsed.caseSensitive
          );
          break;
        }

        case "search_document": {
          const parsed = searchDocumentSchema.parse(args);
          result = await searchDocument(
            config,
            parsed.documentName,
            parsed.query,
            parsed.caseSensitive
          );
          break;
        }

        case "read_document": {
          const parsed = readDocumentSchema.parse(args);
          result = await readDocument(
            config,
            parsed.documentName,
            parsed.maxDepth
          );
          break;
        }

        case "read_block": {
          const parsed = readBlockSchema.parse(args);
          result = await readBlock(
            config,
            parsed.documentName,
            parsed.blockId
          );
          break;
        }

        default:
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: `Unknown tool: ${name}`,
                }),
              },
            ],
            isError: true,
          };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error:
                error instanceof Error ? error.message : "Unknown error",
            }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Main entry point
 */
async function main() {
  // Load configuration
  const config = loadConfig();

  console.error(
    `Loaded configuration with ${config.documents.length} document(s)`
  );

  // Create MCP server
  const server = createMCPServer(config);

  // Determine transport mode (prioritize command-line args over env vars)
  const args = process.argv.slice(2);
  const useSSE = args.includes("--sse") || args.includes("-s");
  const transport = useSSE ? "sse" : (process.env.MCP_TRANSPORT || "stdio");

  if (transport === "sse") {
    // SSE mode
    const port = parseInt(process.env.PORT || "3000", 10);
    const apiKey = process.env.MCP_API_KEY;

    if (apiKey) {
      console.error("Authentication enabled");
    }

    await startSSEServer(server, port, apiKey);
  } else {
    // Stdio mode
    console.error("Starting Craft MCP Server in stdio mode...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Craft MCP Server running on stdio");
  }
}

// Run main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});