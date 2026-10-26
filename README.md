# mcp-npm-registry

Search npm packages, get metadata, versions, and download statistics.

> **Free API** — No API key required.

## Tools

| Tool | Description |
|------|-------------|
| `search` | Search npm packages. |
| `get_package` | Get package metadata. |
| `get_versions` | List all versions of a package. |
| `get_downloads` | Get download counts for a package. |
| `compare_packages` | Compare download stats of multiple packages. |

## Installation

```bash
git clone https://github.com/PetrefiedThunder/mcp-npm-registry.git
cd mcp-npm-registry
npm install
npm run build
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "npm-registry": {
      "command": "node",
      "args": ["/path/to/mcp-npm-registry/dist/index.js"]
    }
  }
}
```

## Usage with npx

```bash
npx mcp-npm-registry
```

## License

Apache-2.0
