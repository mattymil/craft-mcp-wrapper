import { Handler, APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
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

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Global config (reused across warm invocations)
let config: Config | null = null;

/**
 * Load and validate configuration from config.json
 */
function loadConfig(): Config {
  if (config) return config;

  try {
    const configPath = join(__dirname, "..", "config.json");
    const configData = readFileSync(configPath, "utf-8");
    config = JSON.parse(configData);

    if (!config!.documents || !Array.isArray(config!.documents)) {
      throw new Error("Invalid config: documents array is required");
    }

    if (config!.documents.length === 0) {
      throw new Error("Invalid config: at least one document is required");
    }

    for (const doc of config!.documents) {
      if (!doc.name || !doc.apiEndpoint) {
        throw new Error(
          "Invalid config: each document must have name and apiEndpoint"
        );
      }
    }

    console.log(`Loaded configuration with ${config!.documents.length} documents`);
    return config!;
  } catch (error) {
    console.error("Failed to load config.json:", error);
    throw error;
  }
}

/**
 * Lambda handler function - Simple REST API for MCP tools
 */
export const handler: Handler = async (
  event: any, // HTTP API v2 format
  context: any
): Promise<any> => {
  // HTTP API v2 uses different property names
  const path = event.rawPath || event.path || '/';
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  
  console.log("Request:", {
    path,
    method,
    requestId: context.requestId,
  });

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle OPTIONS for CORS
  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  // Initialize config
  try {
    loadConfig();
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Configuration error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }

  // Health check
  if (path === "/health") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: "ok",
        service: "craft-mcp-wrapper",
        documentsConfigured: config!.documents.length,
      }),
    };
  }

  // List tools
  if (path === "/tools" && method === "GET") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        tools: [
          {
            name: "list_documents",
            description:
              "List all available Craft documents configured in the server",
          },
          {
            name: "search_all_notes",
            description:
              "Search across all configured Craft documents. Returns aggregated results with document name context.",
          },
          {
            name: "search_document",
            description:
              "Search within a specific Craft document by name. Returns matching blocks with context.",
          },
          {
            name: "read_document",
            description:
              "Read the entire structure of a Craft document, including all blocks and their hierarchy",
          },
          {
            name: "read_block",
            description:
              "Read a specific block from a Craft document by its ID",
          },
        ],
      }),
    };
  }

  // Call tool
  if (path === "/tools/call" && method === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      const { name, arguments: args } = body;

      let result: any;

      switch (name) {
        case "list_documents":
          result = await listDocuments(config!);
          break;

        case "search_all_notes": {
          const parsed = searchAllNotesSchema.parse(args);
          result = await searchAllNotes(
            config!,
            parsed.query,
            parsed.caseSensitive
          );
          break;
        }

        case "search_document": {
          const parsed = searchDocumentSchema.parse(args);
          result = await searchDocument(
            config!,
            parsed.documentName,
            parsed.query,
            parsed.caseSensitive
          );
          break;
        }

        case "read_document": {
          const parsed = readDocumentSchema.parse(args);
          result = await readDocument(
            config!,
            parsed.documentName,
            parsed.maxDepth
          );
          break;
        }

        case "read_block": {
          const parsed = readBlockSchema.parse(args);
          result = await readBlock(
            config!,
            parsed.documentName,
            parsed.blockId
          );
          break;
        }

        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: `Unknown tool: ${name}`,
            }),
          };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          result,
        }),
      };
    } catch (error) {
      console.error("Tool execution error:", error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      };
    }
  }

  // 404 for unknown routes
  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({
      error: "Not found",
      path,
    }),
  };
};
