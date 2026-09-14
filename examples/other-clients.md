# Other MCP clients (n8n, custom agents)

Any client that speaks MCP over **Streamable HTTP** with **OAuth 2.1** works.

- Endpoint: `https://mcp.kema-studio.com/api/mcp`
- Authorization: OAuth 2.1, PKCE (S256), dynamic client registration (RFC 7591). Metadata: `https://mcp.kema-studio.com/.well-known/oauth-protected-resource`, then the authorization server metadata it points to.
- Protocol: JSON-RPC 2.0, `initialize` → `tools/list` → `tools/call`. Every tool returns `structuredContent` matching its `outputSchema`.

In **n8n**, use the *MCP Client Tool* node with the Streamable HTTP transport and the endpoint above; complete the OAuth authorization once from the credential screen.

For a reference implementation of the full flow in TypeScript, see [`../scripts/verify-connection.ts`](../scripts/verify-connection.ts).
