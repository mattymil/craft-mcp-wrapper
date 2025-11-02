# Quick Start Guide

Get up and running with Craft MCP Wrapper in 5 minutes!

## Prerequisites

- Node.js 20+ installed ([download here](https://nodejs.org/))
- A Craft account with at least one shared document

## Installation

### 1. Clone and Install

```bash
git clone https://github.com/mattymil/craft-mcp-wrapper.git
cd craft-mcp-wrapper
npm install
```

### 2. Configure Your Documents

Get your Craft share links:
1. Open a Craft document
2. Click Share → Get Link
3. Copy the share link (looks like `https://connect.craft.do/links/XXXXX`)

Create your config file:
```bash
cp config.example.json config.json
```

Edit `config.json`:
```json
{
  "documents": [
    {
      "name": "My Notes",
      "apiEndpoint": "https://connect.craft.do/links/YOUR_LINK_HERE/api/v1"
    }
  ]
}
```

**Important:** Add `/api/v1` to the end of your share link!

### 3. Build the Project

```bash
npm run build
```

## Usage

### For Perplexity AI

1. Start the server:
   ```bash
   npm start
   ```

2. Add to Perplexity's MCP settings:
   ```json
   {
     "mcpServers": {
       "craft-wrapper": {
         "command": "node",
         "args": ["/absolute/path/to/craft-mcp-wrapper/build/index.js"]
       }
     }
   }
   ```

3. Restart Perplexity and you're done! 🎉

### For Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "craft-wrapper": {
      "command": "node",
      "args": ["/absolute/path/to/craft-mcp-wrapper/build/index.js"]
    }
  }
}
```

### Test It Works

Run the test suite:
```bash
npm run test
```

You should see successful results for all 5 tools!

## Available Tools

Once connected, your AI assistant can use these tools:

1. **list_documents** - See all your configured Craft documents
2. **search_all_notes** - Search across all documents at once
3. **search_document** - Search within a specific document
4. **read_document** - Read an entire document structure
5. **read_block** - Read a specific block by ID

## Example Prompts

Try asking your AI assistant:

- "What Craft documents do I have access to?"
- "Search all my notes for mentions of 'project planning'"
- "Read my 'Meeting Notes' document"
- "Find all references to 'budget' in my notes"

## Troubleshooting

### "Failed to load config.json"
- Make sure you created `config.json` from `config.example.json`
- Check that the JSON syntax is valid
- Verify you added `/api/v1` to your share links

### "Network error" or timeouts
- Verify your share links are still active in Craft
- Check your internet connection
- Try accessing the share link directly in a browser

### AI assistant doesn't see the tools
- Make sure you used the absolute path in the configuration
- Rebuild the project: `npm run build`
- Restart your AI assistant completely

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check out [CONTRIBUTING.md](CONTRIBUTING.md) to contribute
- Deploy to AWS Lambda for remote access (see [DEPLOYMENT.md](DEPLOYMENT.md))

## Need Help?

- [Open an issue](https://github.com/mattymil/craft-mcp-wrapper/issues)
- Check the [Troubleshooting section](README.md#troubleshooting)
- Review [existing issues](https://github.com/mattymil/craft-mcp-wrapper/issues?q=is%3Aissue)

---

Happy searching! 🔍✨
