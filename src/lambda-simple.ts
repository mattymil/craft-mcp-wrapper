import { Handler, APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { readFileSync } from "fs";
import { join } from "path";
import type { Config } from "./types.js";
import {
  listDocuments,
  searchAllNotes,
  searchDocument,
  readDocument,
  readBlock,
} from "./tools.js";

// Global config (loaded once per Lambda container)
let config: Config | null = null;

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
 * Lambda handler - Simple REST API
 */
const handler: Handler = async (
  event: any
): Promise<APIGatewayProxyResult> => {
  // API Gateway HTTP API v2 uses different structure
  const path = event.rawPath || event.path || "/";
  const method = event.requestContext?.http?.method || event.httpMethod || "GET";
  
  console.log(`Request: ${method} ${path}`);
  console.log(`RouteKey: ${event.routeKey}`);
  console.log(`Event keys: ${Object.keys(event).join(", ")}`);

  // Load config on first invocation
  const cfg = loadConfig();

  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    // Health check
    if (path === "/health") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: "ok", documents: cfg.documents.length }),
      };
    }

    // List documents
    if (path === "/documents" && method === "GET") {
      const result = await listDocuments(cfg);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result),
      };
    }

    // Search all notes
    if (path === "/search" && method === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { query, caseSensitive } = body;
      
      if (!query) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "query parameter required" }),
        };
      }

      const result = await searchAllNotes(cfg, query, caseSensitive);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result),
      };
    }

    // Search specific document
    if (path.startsWith("/search/") && method === "POST") {
      const documentName = path.split("/")[2];
      const body = JSON.parse(event.body || "{}");
      const { query, caseSensitive } = body;

      if (!query) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "query parameter required" }),
        };
      }

      const result = await searchDocument(cfg, documentName, query, caseSensitive);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result),
      };
    }

    // Read document
    if (path.startsWith("/document/") && method === "GET") {
      const documentName = path.split("/")[2];
      const maxDepth = event.queryStringParameters?.maxDepth 
        ? parseInt(event.queryStringParameters.maxDepth) 
        : undefined;

      const result = await readDocument(cfg, documentName, maxDepth);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result),
      };
    }

    // Read block
    if (path.match(/^\/document\/[^/]+\/block\/[^/]+$/) && method === "GET") {
      const parts = path.split("/");
      const documentName = parts[2];
      const blockId = parts[4];

      const result = await readBlock(cfg, documentName, blockId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result),
      };
    }

    // Not found
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (error) {
    console.error("Handler error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

// CommonJS export
module.exports = { handler };
export { handler };
