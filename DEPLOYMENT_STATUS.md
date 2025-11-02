# Deployment Status

## ✅ Current Status

All systems operational! Both local and cloud deployments are working.

## Local Server (MCP Protocol)

### Stdio Mode (For Perplexity & Claude Desktop)
```bash
npm start
# or
node build/index.js
```

**Status:** ✅ Working  
**Use for:** Perplexity AI, Claude Desktop, VS Code MCP extensions

**Perplexity Configuration:**
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

*Replace `<path-to-project>` with your installation path*
```

### SSE Mode (For Testing/Remote MCP)
```bash
npm run start:sse
```

**Status:** ✅ Working  
**Endpoints:**
- SSE: http://localhost:3000/sse
- Messages: http://localhost:3000/messages
- Health: http://localhost:3000/health

## AWS Lambda (REST API)

**Status:** ✅ Deployed and working  
**Base URL:** https://lwysu30rw8.execute-api.us-east-1.amazonaws.com

### Available Endpoints

#### Health Check
```bash
curl https://lwysu30rw8.execute-api.us-east-1.amazonaws.com/health
```

Response:
```json
{
  "status": "ok",
  "service": "craft-mcp-wrapper",
  "documentsConfigured": 2
}
```

#### List Tools
```bash
curl https://lwysu30rw8.execute-api.us-east-1.amazonaws.com/tools
```

#### Call a Tool
```bash
curl -X POST https://lwysu30rw8.execute-api.us-east-1.amazonaws.com/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "list_documents", "arguments": {}}'
```

Response:
```json
{
  "success": true,
  "result": {
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
}
```

### Example Tool Calls

**Search all notes:**
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

**Search specific document:**
```bash
curl -X POST https://lwysu30rw8.execute-api.us-east-1.amazonaws.com/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "search_document",
    "arguments": {
      "documentName": "Notes",
      "query": "meeting",
      "caseSensitive": false
    }
  }'
```

**Read document:**
```bash
curl -X POST https://lwysu30rw8.execute-api.us-east-1.amazonaws.com/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "read_document",
    "arguments": {
      "documentName": "Notes",
      "maxDepth": 3
    }
  }'
```

## Important Notes

### For Perplexity Users
- ⚠️ **Use the LOCAL server** with stdio mode
- The Lambda REST API does NOT support the MCP protocol
- Configuration: `node <path-to-project>/build/index.js`

### For Custom Integrations
- ✅ Use the Lambda REST API for custom HTTP integrations
- No MCP client library required
- Simple JSON request/response format

### Deployment Commands

**Deploy to Lambda:**
```bash
npm run deploy
```

**View logs:**
```bash
npm run logs
```

**Remove deployment:**
```bash
npm run remove
```

## Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│                 Craft MCP Wrapper                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  LOCAL SERVER                                       │
│  ├─ Stdio Mode (MCP Protocol)                      │
│  │  └─ For: Perplexity, Claude Desktop             │
│  │                                                  │
│  └─ SSE Mode (MCP Protocol)                        │
│     └─ For: Remote MCP connections                 │
│                                                     │
│  AWS LAMBDA                                         │
│  └─ REST API (Simple HTTP)                         │
│     └─ For: Custom integrations                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Testing

All endpoints tested and working:
- ✅ Local stdio mode
- ✅ Local SSE mode  
- ✅ Lambda health endpoint
- ✅ Lambda tools list
- ✅ Lambda tool execution (list_documents tested)

## Configured Documents

Configure your Craft documents in `config.json`. Example:

```json
{
  "documents": [
    {
      "name": "My Notes",
      "apiEndpoint": "https://connect.craft.do/links/YOUR_SHARE_LINK/api/v1"
    }
  ]
}
```

---

**Project:** [github.com/mattymil/craft-mcp-wrapper](https://github.com/mattymil/craft-mcp-wrapper)  
Last updated: 2025-11-02
