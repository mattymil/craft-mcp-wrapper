# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

### Build and Development
- **Build:** `npm run build` - Compiles TypeScript to build/ directory
- **Dev (stdio):** `npm run dev` - Auto-rebuild and restart in stdio mode
- **Dev (SSE):** `npm run dev:sse` - Auto-rebuild and restart in SSE mode

### Running the Server
- **Start (stdio):** `npm start` - Run in stdio mode (for MCP clients like Claude Desktop, Perplexity)
- **Start (SSE):** `npm run start:sse` - Run HTTP/SSE server on port 3000

### Testing
- **Run tests:** `npm run build && npm run test` - Build first, then run test.ts
- **Test locally with Lambda:** `npm run offline` - Start serverless-offline on port 3000

### AWS Lambda Deployment
- **Deploy:** `npm run deploy` - Build and deploy to AWS Lambda (dev stage)
- **Deploy prod:** `npm run deploy:prod` - Deploy to production stage
- **View logs:** `npm run logs` - Tail Lambda logs in real-time
- **Remove:** `npm run remove` - Delete Lambda deployment
- **Info:** `npm run info` - View deployment information

## Architecture

### Transport Modes
The server supports two transport modes controlled by CLI args or `MCP_TRANSPORT` env var:

1. **Stdio Mode (Default):** For local MCP clients (Perplexity, Claude Desktop)
   - Entry: `src/index.ts` → `StdioServerTransport`
   - Communication via stdin/stdout with MCP protocol
   
2. **SSE Mode:** For HTTP/SSE connections
   - Entry: `src/index.ts` → `src/server.ts` → Express app with SSE endpoints
   - Endpoints: `/sse` (SSE), `/messages` (POST), `/health` (GET)

3. **Lambda Mode:** AWS Lambda with API Gateway
   - Entry: `src/lambda.ts` → Express app wrapped with serverless-http
   - REST API (not full MCP protocol)

### Core Components

**src/index.ts**
- Main entry point
- Handles transport selection (stdio vs SSE)
- Creates MCP server with tool handlers
- Implements performance tracking and response truncation

**src/tools.ts**
- Implements 5 MCP tools: `list_documents`, `search_all_notes`, `search_document`, `read_document`, `read_block`
- Response truncation logic via `truncateResponse()` and `truncateObject()`
- Aggregates results from multiple Craft documents using `Promise.allSettled()`

**src/craft-api.ts**
- API client for Craft document endpoints
- `fetchBlocks()` - GET /blocks with optional id/maxDepth
- `searchBlocks()` - GET /blocks/search with pattern matching
- 30s timeout on all requests

**src/server.ts**
- Express app creation with SSE transport
- Connection management for SSE clients
- Optional API key authentication
- Used by both SSE mode and Lambda

**src/types.ts**
- TypeScript interfaces and Zod schemas
- Key types: `Config`, `DocumentConfig`, `Block`, `SearchResult`
- Zod schemas for tool parameter validation

### Configuration

**config.json** (required)
```json
{
  "documents": [
    {
      "name": "Document Name",
      "apiEndpoint": "https://connect.craft.do/links/SHARE_LINK/api/v1"
    }
  ]
}
```

**.env** (optional)
- `MCP_TRANSPORT`: "stdio" or "sse" (default: stdio)
- `PORT`: SSE server port (default: 3000)
- `MCP_API_KEY`: Optional authentication for SSE mode
- `MAX_RESPONSE_SIZE`: Response size limit in bytes (default: 1048576 = 1MB)

### Error Handling Strategy
- All API calls use `Promise.allSettled()` for graceful degradation
- Individual document failures don't prevent other results from returning
- Errors are structured with `documentName` context
- Invalid document names return available document list
- Network timeouts handled with 30s limit

### Performance Optimization
- Responses truncated if exceeding `MAX_RESPONSE_SIZE`
- Performance metrics logged to stderr: `[PERF] timestamp tool_name duration size`
- Compact JSON (no pretty-printing) to reduce payload size ~40%
- Truncation warnings: `[WARN] Response truncated: X bytes exceeds limit of Y bytes`

## Development Notes

### TypeScript Configuration
- Target: ES2022, Module: ESNext
- Output: build/ directory
- ES modules (type: "module" in package.json)
- Must use .js extensions in imports despite .ts source files

### Testing Approach
- Manual test script in test.ts (not automated unit tests)
- Tests all 5 tools with real API calls
- Run after building: `npm run build && npm run test`

### Lambda Limitations
- Lambda provides REST API, not full MCP protocol
- Cannot use stdio mode (serverless environment)
- No SSE/streaming support in Lambda mode
- For MCP clients (Perplexity, Claude Desktop), use local stdio server

### Deployment Dependencies
- Build artifacts in build/
- config.json required at runtime
- node_modules included in Lambda package (excluding dev dependencies)
- serverless.yml defines AWS infrastructure

### Local Production Deployment
- Production location: `/usr/local/lib/craft-wrapper/build/`
- MCP clients should reference this path for production use
