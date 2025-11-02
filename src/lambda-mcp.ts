import { Handler, APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
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
import { IncomingMessage, ServerResponse } from "http";
import { Readable, Writable } from "stream";

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Global config and server (reused across warm invocations)
let config: Config | null = null;
let mcpServer: Server | null = null;

/**
 * Load configuration from config.json
 */
function loadConfig(): Config {
  if (!config) {
    try {
      const configPath = join(__dirname, "..", "config.json");
      const configData = readFileSync(configPath, "utf-8");
      config = JSON.parse(configData);
      console.log(`Loaded config with ${config!.documents.length} documents`);
    } catch (error) {
      console.error("Failed to load config.json:", error);
      throw error;
    }
  }
  return config!;
}

/**
 * Create and configure the MCP server
 */
function createMCPServer(cfg: Config): Server {
  if (mcpServer) {
    return mcpServer;
  }

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

  // Register tools/list handler
  server.setRequestHandler("tools/list" as any, async () => {
    return {
      tools: [
        {
          name: "list_documents",
          description: "List all available Craft documents configured in the server",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "search_all_notes",
          description: "Search across all configured Craft documents. Returns aggregated results with document name context.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query pattern" },
              caseSensitive: { type: "boolean", description: "Whether search is case-sensitive (default: false)" },
            },
            required: ["query"],
          },
        },
        {
          name: "search_document",
          description: "Search within a specific Craft document by name.",
          inputSchema: {
            type: "object",
            properties: {
              documentName: { type: "string", description: "Name of the document to search" },
              query: { type: "string", description: "Search query pattern" },
              caseSensitive: { type: "boolean", description: "Whether search is case-sensitive (default: false)" },
            },
            required: ["documentName", "query"],
          },
        },
        {
          name: "read_document",
          description: "Read the entire structure of a Craft document",
          inputSchema: {
            type: "object",
            properties: {
              documentName: { type: "string", description: "Name of the document to read" },
              maxDepth: { type: "number", description: "Maximum depth of block hierarchy to fetch (optional)" },
            },
            required: ["documentName"],
          },
        },
        {
          name: "read_block",
          description: "Read a specific block from a Craft document by its ID",
          inputSchema: {
            type: "object",
            properties: {
              documentName: { type: "string", description: "Name of the document containing the block" },
              blockId: { type: "string", description: "ID of the block to read" },
            },
            required: ["documentName", "blockId"],
          },
        },
      ],
    };
  });

  // Register tools/call handler
  server.setRequestHandler("tools/call" as any, async (request: any) => {
    const { name, arguments: args } = request.params;

    try {
      let result: any;

      switch (name) {
        case "list_documents":
          result = await listDocuments(cfg);
          break;
        case "search_all_notes": {
          const parsed = searchAllNotesSchema.parse(args);
          result = await searchAllNotes(cfg, parsed.query, parsed.caseSensitive);
          break;
        }
        case "search_document": {
          const parsed = searchDocumentSchema.parse(args);
          result = await searchDocument(cfg, parsed.documentName, parsed.query, parsed.caseSensitive);
          break;
        }
        case "read_document": {
          const parsed = readDocumentSchema.parse(args);
          result = await readDocument(cfg, parsed.documentName, parsed.maxDepth);
          break;
        }
        case "read_block": {
          const parsed = readBlockSchema.parse(args);
          result = await readBlock(cfg, parsed.documentName, parsed.blockId);
          break;
        }
        default:
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
            isError: true,
          };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }) }],
        isError: true,
      };
    }
  });

  mcpServer = server;
  return server;
}

/**
 * Convert API Gateway event to Node.js HTTP request/response objects
 */
function createMockHttpObjects(event: APIGatewayProxyEvent): {
  req: IncomingMessage;
  res: ServerResponse;
  promise: Promise<APIGatewayProxyResult>;
} {
  let resolvePromise: (result: APIGatewayProxyResult) => void;
  const promise = new Promise<APIGatewayProxyResult>((resolve) => {
    resolvePromise = resolve;
  });

  // Create mock readable stream for request body
  const reqStream = new Readable({
    read() {
      if (event.body) {
        this.push(event.body);
      }
      this.push(null);
    },
  }) as any;

  // Add IncomingMessage properties
  reqStream.method = event.httpMethod || "GET";
  reqStream.url = event.path || "/";
  reqStream.headers = event.headers || {};
  reqStream.httpVersion = "1.1";
  
  const req = reqStream as IncomingMessage;

  // Create mock writable stream for response
  let statusCode = 200;
  let responseHeaders: Record<string, string> = {};
  let body = "";

  const resStream = new Writable({
    write(chunk, encoding, callback) {
      body += chunk.toString();
      callback();
    },
  }) as any;

  resStream.writeHead = (code: number, headers?: any) => {
    statusCode = code;
    if (headers) {
      responseHeaders = { ...responseHeaders, ...headers };
    }
  };

  resStream.setHeader = (name: string, value: string) => {
    responseHeaders[name] = value;
  };

  resStream.getHeader = (name: string) => responseHeaders[name];

  resStream.end = (data?: any) => {
    if (data) {
      body += data.toString();
    }
    resolvePromise!({
      statusCode,
      headers: responseHeaders,
      body,
    });
  };

  const res = resStream as ServerResponse;

  return { req, res, promise };
}

/**
 * Lambda handler
 */
export const handler: Handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log(`Lambda invocation: ${event.httpMethod} ${event.path}`);

  try {
    // Load config and create server
    const cfg = loadConfig();
    const server = createMCPServer(cfg);

    // Create HTTP mocks
    const { req, res, promise } = createMockHttpObjects(event);

    // Create transport and connect
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    await server.connect(transport);

    // Handle the request
    await transport.handleRequest(req, res);

    // Wait for response
    return await promise;
  } catch (error) {
    console.error("Lambda handler error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
