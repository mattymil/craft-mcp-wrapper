# Craft MCP Wrapper

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

A Model Context Protocol (MCP) server that wraps multiple Craft document APIs and makes them accessible to AI assistants like Perplexity AI, Claude Desktop, VS Code, and Cursor.

> **Note:** This is an open-source project. Contributions are welcome!

📚 **Quick Links:** [Quick Start](QUICKSTART.md) | [Contributing](CONTRIBUTING.md) | [AWS Deployment](DEPLOYMENT.md) | [Status](DEPLOYMENT_STATUS.md)

## Overview

This MCP server provides a unified interface to search and read content from multiple Craft documents simultaneously. It aggregates results across configured documents while gracefully handling failures, making it ideal for querying distributed knowledge bases.

## Features

- **5 MCP Tools:**
  - `list_documents` - List all configured Craft documents
  - `search_all_notes` - Search across all documents with aggregation
  - `search_document` - Search within a specific document
  - `read_document` - Read entire document structure
  - `read_block` - Read a specific block by ID

- **Dual Transport Modes:**
  - **Stdio Mode** - For local AI assistants (Perplexity local, Claude Desktop)
  - **SSE Mode** - HTTP/SSE transport for remote connections

- **Robust Error Handling:**
  - Graceful degradation when individual APIs fail
  - Partial results with error context
  - Input validation with Zod schemas

- **Easy Configuration:**
  - JSON-based document configuration
  - Environment variables for server settings
  - No authentication required for Craft public share links

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mattymil/craft-mcp-wrapper.git
   cd craft-mcp-wrapper
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure your Craft documents** (see Configuration section below)

4. **Build the project:**
   ```bash
   npm run build
   ```

## Configuration

### Document Configuration (`config.json`)

Edit `config.json` to add your Craft document share links:

```json
{
  "documents": [
    {
      "name": "Notes",
      "apiEndpoint": "https://connect.craft.do/links/3W1oJ86UXUR/api/v1"
    },
    {
      "name": "Bonhoeffer Notes",
      "apiEndpoint": "https://connect.craft.do/links/97vrIxn0L2x/api/v1"
    }
  ]
}
```

**To add more documents:**
1. Get the Craft share link for your document
2. Add `/api/v1` to the end of the link
3. Add a new entry with a friendly name and the API endpoint

### Environment Variables (`.env`)

Copy `.env.example` to `.env` and configure as needed:

```bash
# Transport mode: "stdio" or "sse"
MCP_TRANSPORT=stdio

# SSE mode configuration (only used when MCP_TRANSPORT=sse)
PORT=3000
SSE_ENDPOINT=/sse

# Optional: API key for SSE authentication
# MCP_API_KEY=your-secret-key-here
```

## Running the Server

### Local Development

#### Stdio Mode (Default)

For local AI assistants like Claude Desktop or Perplexity (local):

```bash
npm start
```

This starts the server in stdio mode, communicating via standard input/output.

#### SSE Mode (HTTP Server)

For remote connections or testing:

```bash
npm run start:sse
```

Or explicitly:

```bash
node build/index.js --sse
```

The server will start on port 3000 (configurable via `PORT` env variable) with:
- SSE endpoint: `http://localhost:3000/sse`
- Messages endpoint: `http://localhost:3000/messages` 
- Health check: `http://localhost:3000/health`

#### Local Lambda Testing

Test Lambda function locally with serverless-offline:

```bash
npm run offline
```

This starts a local API Gateway emulator on `http://localhost:3000`

#### Development Mode

Auto-reload on file changes:

```bash
# Stdio mode
npm run dev

# SSE mode
npm run dev:sse
```

### AWS Lambda Deployment

Deploy the server as an AWS Lambda function with API Gateway.

#### Prerequisites

1. **AWS CLI configured:**
   ```bash
   aws configure
   ```
   Provide your AWS Access Key ID, Secret Access Key, and default region.

2. **AWS credentials:** Ensure you have permissions to create:
   - Lambda functions
   - API Gateway HTTP APIs
   - CloudWatch Logs
   - IAM roles

#### Deploy to AWS

**Deploy to default stage (dev):**
```bash
npm run deploy
```

**Deploy to specific stages:**
```bash
# Development
npm run deploy:dev

# Production
npm run deploy:prod
```

After deployment, Serverless Framework will output:
- API Gateway endpoint URL
- Lambda function name
- CloudFormation stack name

#### View Deployment Info

```bash
npm run info
```

#### View Lambda Logs

```bash
# Tail logs in real-time
npm run logs

# Stage-specific logs
npm run logs:dev
npm run logs:prod
```

#### Remove Lambda Deployment

```bash
# Remove default stage
npm run remove

# Remove specific stages
npm run remove:dev
npm run remove:prod
```

#### Environment Variables for Lambda

Set environment variables in `serverless.yml` or via command line:

```bash
# Set API key for authentication
export MCP_API_KEY="your-secret-key"
npm run deploy
```

Or edit `serverless.yml`:
```yaml
provider:
  environment:
    MCP_API_KEY: ${env:MCP_API_KEY, 'default-key'}
```

#### Lambda Configuration

Default settings in `serverless.yml`:
- **Runtime:** Node.js 20.x
- **Memory:** 512 MB
- **Timeout:** 30 seconds
- **Region:** us-east-1

Modify these in `serverless.yml` as needed.

#### API Gateway Endpoints

After deployment, your Lambda provides a REST API at:

```
https://{api-id}.execute-api.{region}.amazonaws.com/
```

Endpoints:
- `GET /health` - Health check
  ```bash
  curl https://{api-id}.execute-api.{region}.amazonaws.com/health
  ```
  
- `GET /tools` - List available tools
  ```bash
  curl https://{api-id}.execute-api.{region}.amazonaws.com/tools
  ```
  
- `POST /tools/call` - Execute a tool
  ```bash
  curl -X POST https://{api-id}.execute-api.{region}.amazonaws.com/tools/call \
    -H "Content-Type: application/json" \
    -d '{"name": "list_documents", "arguments": {}}'
  ```

**Note:** The Lambda deployment uses a simple REST API rather than the full MCP protocol. For MCP protocol support (required by Perplexity), use the local stdio or SSE server.

#### Cost Estimates

**AWS Lambda:**
- Free tier: 1M requests/month + 400,000 GB-seconds compute
- After free tier: $0.20 per 1M requests + $0.0000166667 per GB-second

**API Gateway:**
- Free tier: None
- HTTP API: $1.00 per million requests

**Example:** 10,000 requests/month with 512MB, 3s avg execution:
- Lambda: Free (within free tier)
- API Gateway: $0.01/month
- **Total: ~$0.01/month**

#### Lambda Limitations

- **Cold starts:** First request after idle period may be slower (1-2 seconds)
- **REST API only:** Lambda provides a REST API, not full MCP protocol (use local server for MCP clients)
- **No stdio mode:** Stdio mode is not supported in Lambda (serverless environment)
- **No SSE/streaming:** Lambda REST API uses request/response, not Server-Sent Events
- **Timeout:** Maximum 30 seconds (configurable up to 15 minutes)

## Connecting AI Assistants

### Perplexity AI

**⚠️ Important:** Perplexity requires the full MCP protocol via stdio mode. Use the local server, not Lambda.

**Stdio Configuration:**
Add to Perplexity's MCP settings:

```json
{
  "mcpServers": {
    "craft-wrapper": {
      "command": "node",
      "args": ["<path-to-project>/build/index.js"]
    }
  }
}
```

Replace `<path-to-project>` with the absolute path to your installation. For example:
```json
{
  "mcpServers": {
    "craft-wrapper": {
      "command": "node",
      "args": ["/Users/username/projects/craft-mcp-wrapper/build/index.js"]
    }
  }
}
```

**Note:** The `MCP_TRANSPORT` environment variable defaults to stdio, so you don't need to specify it unless you've changed the default in your `.env` file.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "craft-wrapper": {
      "command": "node",
      "args": ["<path-to-project>/build/index.js"]
    }
  }
}
```

### VS Code / Cursor

For MCP-compatible extensions, configure the server path in your workspace settings:

```json
{
  "mcp.servers": {
    "craft-wrapper": {
      "command": "node",
      "args": ["<path-to-project>/build/index.js"]
    }
  }
}
```

### Remote SSE Connection

If using SSE mode remotely (local server only):

```
Server URL: http://your-server:3000/sse
```

With authentication (if `MCP_API_KEY` is set):
```
http://your-server:3000/sse?api_key=your-secret-key-here
```

### Lambda REST API (For Custom Integrations)

The Lambda deployment provides a REST API for custom integrations that don't require the MCP protocol:

**Base URL:** `https://{api-id}.execute-api.{region}.amazonaws.com`

**Example - List Documents:**
```bash
curl -X POST https://lwysu30rw8.execute-api.us-east-1.amazonaws.com/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "list_documents", "arguments": {}}'
```

**Example - Search All Notes:**
```bash
curl -X POST https://lwysu30rw8.execute-api.us-east-1.amazonaws.com/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "search_all_notes",
    "arguments": {
      "query": "leadership",
      "caseSensitive": false
    }
  }'
```

**Response Format:**
```json
{
  "success": true,
  "result": {
    // Tool-specific result data
  }
}
```

## Tools Documentation

### 1. `list_documents`

Lists all configured Craft documents.

**Parameters:** None

**Example Response:**
```json
{
  "documents": [
    {
      "name": "Notes",
      "apiEndpoint": "https://connect.craft.do/links/3W1oJ86UXUR/api/v1"
    },
    {
      "name": "Bonhoeffer Notes",
      "apiEndpoint": "https://connect.craft.do/links/97vrIxn0L2x/api/v1"
    }
  ],
  "count": 2
}
```

**Use Case:** Discover available documents before searching.

### 2. `search_all_notes`

Search across all configured documents simultaneously.

**Parameters:**
- `query` (string, required) - Search pattern
- `caseSensitive` (boolean, optional) - Case-sensitive search (default: false)

**Example JSON-RPC Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "search_all_notes",
    "arguments": {
      "query": "leadership",
      "caseSensitive": false
    }
  },
  "id": 1
}
```

**Example Response:**
```json
{
  "query": "leadership",
  "caseSensitive": false,
  "totalResults": 5,
  "documentsSearched": 2,
  "results": [
    {
      "documentName": "Notes",
      "results": [
        {
          "block": { "id": "...", "content": "..." },
          "documentName": "Notes"
        }
      ]
    },
    {
      "documentName": "Bonhoeffer Notes",
      "results": [...]
    }
  ]
}
```

**Use Case:** Find content across your entire Craft knowledge base without knowing which document contains it.

### 3. `search_document`

Search within a specific Craft document.

**Parameters:**
- `documentName` (string, required) - Name of the document
- `query` (string, required) - Search pattern
- `caseSensitive` (boolean, optional) - Case-sensitive search (default: false)

**Example JSON-RPC Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "search_document",
    "arguments": {
      "documentName": "Notes",
      "query": "meeting notes",
      "caseSensitive": false
    }
  },
  "id": 2
}
```

**Use Case:** Targeted search when you know which document contains the information.

### 4. `read_document`

Read the entire structure of a Craft document.

**Parameters:**
- `documentName` (string, required) - Name of the document
- `maxDepth` (number, optional) - Maximum depth of block hierarchy

**Example JSON-RPC Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "read_document",
    "arguments": {
      "documentName": "Notes",
      "maxDepth": 3
    }
  },
  "id": 3
}
```

**Use Case:** Retrieve complete document structure for analysis or export.

### 5. `read_block`

Read a specific block by its ID.

**Parameters:**
- `documentName` (string, required) - Name of the document
- `blockId` (string, required) - ID of the block

**Example JSON-RPC Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "read_block",
    "arguments": {
      "documentName": "Notes",
      "blockId": "block-123-abc"
    }
  },
  "id": 4
}
```

**Use Case:** Retrieve specific content when you have a block ID from a previous search.

## Testing

### Run Test Suite

```bash
npm run build
npm run test
```

The test suite validates:
- All 5 tools with valid inputs
- Error handling with invalid inputs
- Configuration loading
- API response structures

### Manual Testing (SSE Mode)

**Start the server:**
```bash
npm run start:sse
```

**Test health endpoint:**
```bash
curl http://localhost:3000/health
```

**Test SSE connection:**
```bash
curl http://localhost:3000/sse
```

**List available tools:**
```bash
curl -X POST http://localhost:3000/messages \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

## Architecture

### High-Level Design

```
┌─────────────────────┐
│   AI Assistant      │
│ (Perplexity/Claude) │
└──────────┬──────────┘
           │ MCP Protocol
           │ (stdio or SSE)
┌──────────┴──────────┐
│   MCP Server        │
│  (craft-wrapper)    │
│                     │
│  ┌───────────────┐  │
│  │ Tool Registry │  │
│  └───────┬───────┘  │
│          │          │
│  ┌───────┴───────┐  │
│  │ Craft API     │  │
│  │ Client        │  │
│  │ (axios)       │  │
│  └───────┬───────┘  │
└──────────┼──────────┘
           │
    ┌──────┴───────┐
    │              │
┌───┴────┐   ┌────┴──┐
│Craft   │   │Craft  │
│Doc 1   │   │Doc 2  │
└────────┘   └───────┘
```

### Aggregation Strategy

When `search_all_notes` is called:
1. Create parallel promises for each configured document
2. Use `Promise.allSettled()` to handle failures gracefully
3. Collect successful results with document name context
4. Include error messages for failed requests
5. Return aggregated results with summary statistics

### Error Handling

- **Invalid document names:** Returns error with list of available documents
- **Network failures:** Caught and returned as structured errors
- **Malformed responses:** Wrapped in error objects
- **Partial failures:** Results from successful APIs still returned

## Troubleshooting

### Common Issues

**"Failed to load config.json"**
- Ensure `config.json` exists in the project root
- Verify JSON syntax is valid
- Check that all required fields are present

**"Port 3000 already in use" (SSE mode)**
- Change the port: `PORT=3001 npm run start:sse`
- Or update `.env` file

**"No active SSE connection found"**
- Ensure you've opened the SSE endpoint (`/sse`) before sending messages
- Check that the connection hasn't been closed

**Network errors / timeout**
- Verify Craft share links are still valid
- Check internet connectivity
- Increase timeout in `craft-api.ts` if needed (currently 30s)

**Tools not appearing in AI assistant**
- Rebuild the project: `npm run build`
- Restart the AI assistant
- Check server logs for errors (stderr in stdio mode)

### Known Limitations

- **Lambda = REST API only:** The Lambda deployment provides a REST API, not the full MCP protocol. For MCP clients (Perplexity, Claude Desktop), use the local stdio/SSE server.
- **Perplexity requires local server:** Perplexity's MCP connector requires stdio mode, which only works with the local server.
- **Read-only:** This MVP only supports READ operations (search, fetch). Write operations (insert, update, delete) are not implemented.
- **Authentication:** Craft APIs must be publicly accessible share links. Private documents with authentication are not supported yet.
- **Rate limiting:** No built-in rate limiting. Consider adding if making many requests.

## License

MIT

## Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
git clone https://github.com/mattymil/craft-mcp-wrapper.git
cd craft-mcp-wrapper
npm install
npm run build
```

### Running Tests

```bash
npm run test
```

## Support

If you encounter any issues or have questions:
- Open an issue on [GitHub](https://github.com/mattymil/craft-mcp-wrapper/issues)
- Check existing issues for solutions
- Review the [Troubleshooting](#troubleshooting) section

---

**Built with:**
- [Model Context Protocol](https://modelcontextprotocol.io) by Anthropic
- [Craft.do](https://craft.do) Document API
- TypeScript, Express, Axios, Zod

## Star History

If you find this project useful, please consider giving it a ⭐ on GitHub!

## Related Projects

- [MCP Specification](https://github.com/modelcontextprotocol/specification)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Craft API Documentation](https://support.craft.do/hc/en-us/articles/360017505798-API-Documentation)
