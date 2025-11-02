# Contributing to Craft MCP Wrapper

Thank you for your interest in contributing to Craft MCP Wrapper! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We're here to build something useful together.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue on GitHub with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Your environment (OS, Node.js version, etc.)
- Any relevant logs or error messages

### Suggesting Enhancements

We welcome feature requests! Please open an issue with:
- A clear description of the enhancement
- Use cases and why it would be valuable
- Any implementation ideas you might have

### Pull Requests

1. **Fork the repository** and create your branch from `main`
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add tests if applicable
   - Update documentation as needed

4. **Build and test**
   ```bash
   npm run build
   npm run test
   ```

5. **Commit your changes**
   - Use clear, descriptive commit messages
   - Reference any related issues

6. **Push to your fork and submit a pull request**
   ```bash
   git push origin feature/my-new-feature
   ```

## Development Setup

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- A Craft account with shared documents (for testing)

### Local Development

1. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/craft-mcp-wrapper.git
   cd craft-mcp-wrapper
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy configuration files:
   ```bash
   cp config.example.json config.json
   cp .env.example .env
   ```

4. Edit `config.json` with your Craft document share links

5. Build the project:
   ```bash
   npm run build
   ```

6. Run in development mode:
   ```bash
   npm run dev        # stdio mode
   npm run dev:sse    # SSE mode
   ```

### Project Structure

```
craft-mcp-wrapper/
├── src/
│   ├── index.ts         # Main entry point (local server)
│   ├── lambda.ts        # AWS Lambda handler
│   ├── server.ts        # Express/SSE server
│   ├── tools.ts         # MCP tool implementations
│   ├── craft-api.ts     # Craft API client
│   └── types.ts         # TypeScript types & schemas
├── test.ts              # Test suite
├── config.json          # Configuration (gitignored)
└── README.md            # Documentation
```

## Coding Standards

### TypeScript
- Use TypeScript for all code
- Define proper types (avoid `any` when possible)
- Use async/await for asynchronous code
- Add JSDoc comments for public functions

### Error Handling
- Use try-catch blocks for async operations
- Provide meaningful error messages
- Gracefully handle failures (especially for multi-document operations)

### Code Style
- Use 2 spaces for indentation
- Use double quotes for strings
- Add trailing commas in multi-line objects/arrays
- Run the TypeScript compiler to check for errors

### Testing
- Test new features when possible
- Include both success and error cases
- Update existing tests if you change functionality

## Areas Where We Need Help

- **Documentation improvements** - Better examples, clearer explanations
- **Testing** - More comprehensive test coverage
- **Error handling** - Better error messages and recovery
- **Performance** - Optimization for large documents
- **Features** - See open issues for feature requests
- **Bug fixes** - Check issues labeled "bug"

## Questions?

Feel free to open an issue with the "question" label if you need help or clarification on anything.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
