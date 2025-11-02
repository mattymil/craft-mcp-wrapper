import express, { Request, Response, Application } from "express";
import cors from "cors";
import { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

/**
 * Store active SSE connections
 */
const connections = new Map<string, SSEServerTransport>();
let connectionIdCounter = 0;

/**
 * Create Express app with MCP endpoints (for Lambda or standalone)
 *
 * @param server - The MCP server instance
 * @param apiKey - Optional API key for authentication
 * @returns Express application
 */
export function createExpressApp(
  server: McpServer,
  apiKey?: string
): Application {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  /**
   * Health check endpoint
   */
  app.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      activeConnections: connections.size,
    });
  });

  /**
   * SSE endpoint for server-to-client messages
   */
  app.get("/sse", async (req: Request, res: Response) => {
    // Optional authentication
    if (apiKey) {
      const providedKey = req.query.api_key as string;
      if (providedKey !== apiKey) {
        res.status(401).send("Unauthorized: Invalid API key");
        return;
      }
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Create connection ID and transport
    const connectionId = `conn-${++connectionIdCounter}`;
    const transport = new SSEServerTransport("/messages", res);
    connections.set(connectionId, transport);

    console.log(`Client connected: ${connectionId}`);

    // Connect the MCP server to this transport
    await server.connect(transport);

    // Handle connection close
    req.on("close", () => {
      connections.delete(connectionId);
      console.log(`Client disconnected: ${connectionId}`);
    });

    // Handle errors
    res.on("error", (error) => {
      console.error(`SSE error for ${connectionId}:`, error);
      connections.delete(connectionId);
    });
  });

  /**
   * POST endpoint for client-to-server JSON-RPC 2.0 messages
   */
  app.post("/messages", async (req: Request, res: Response) => {
    // Get the most recent active transport
    const activeTransports = Array.from(connections.values());

    if (activeTransports.length === 0) {
      res.status(503).json({
        error: "No active SSE connection found",
      });
      return;
    }

    // Use the last connected transport
    const transport = activeTransports[activeTransports.length - 1];

    try {
      // Forward the message to the transport
      // Explicitly pass req.body to fix SDK issue
      await transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      console.error("Error handling POST message:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Internal server error",
        });
      }
    }
  });

  return app;
}

/**
 * Start the Express server with SSE transport for MCP
 *
 * @param server - The MCP server instance
 * @param port - Port to listen on
 * @param apiKey - Optional API key for authentication
 */
export async function startSSEServer(
  server: McpServer,
  port: number,
  apiKey?: string
): Promise<void> {
  const app = createExpressApp(server, apiKey);

  // Start the server
  app.listen(port, () => {
    console.log(`MCP SSE Server started on port ${port}`);
    console.log(`SSE endpoint: http://localhost:${port}/sse`);
    console.log(`Messages endpoint: http://localhost:${port}/messages`);
    console.log(`Health check: http://localhost:${port}/health`);
  });
}
