/**
 * Connects to the Kema Invoice MCP server as a real client would: discovers the
 * OAuth 2.1 metadata, registers a client dynamically, opens the consent page,
 * exchanges the code, then lists the tools. Nothing is stored on disk.
 *
 *   npm run verify
 *   MCP_URL=https://mcp.kema-studio.com/api/mcp npm run verify
 */
import http from "node:http"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { UnauthorizedError, type OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js"
import type { OAuthClientInformationMixed, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js"

const MCP_URL = process.env.MCP_URL ?? "https://mcp.kema-studio.com/api/mcp"
const CALLBACK_PORT = Number(process.env.CALLBACK_PORT ?? 8765)
const REDIRECT_URL = `http://localhost:${CALLBACK_PORT}/callback`

/** Minimal in-memory provider: enough for one run, nothing persisted. */
class MemoryProvider implements OAuthClientProvider {
  private _client?: OAuthClientInformationMixed
  private _tokens?: OAuthTokens
  private _verifier?: string
  authorizationUrl?: URL

  get redirectUrl() {
    return REDIRECT_URL
  }
  get clientMetadata() {
    return {
      client_name: "kema-invoice-mcp verify script",
      redirect_uris: [REDIRECT_URL],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }
  }
  clientInformation() {
    return this._client
  }
  saveClientInformation(info: OAuthClientInformationMixed) {
    this._client = info
  }
  tokens() {
    return this._tokens
  }
  saveTokens(tokens: OAuthTokens) {
    this._tokens = tokens
  }
  redirectToAuthorization(url: URL) {
    this.authorizationUrl = url
  }
  saveCodeVerifier(v: string) {
    this._verifier = v
  }
  codeVerifier() {
    if (!this._verifier) throw new Error("code verifier missing")
    return this._verifier
  }
}

function waitForCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", REDIRECT_URL)
      if (url.pathname !== "/callback") {
        res.writeHead(404).end()
        return
      }
      const code = url.searchParams.get("code")
      const error = url.searchParams.get("error")
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      res.end(code ? "<p>Authorized. You can close this tab.</p>" : `<p>Authorization failed: ${error ?? "no code"}</p>`)
      server.close()
      code ? resolve(code) : reject(new Error(`authorization failed: ${error ?? "no code"}`))
    })
    server.listen(CALLBACK_PORT)
  })
}

async function main() {
  const provider = new MemoryProvider()
  const client = new Client({ name: "kema-invoice-mcp-verify", version: "1.0.0" })
  let transport = new StreamableHTTPClientTransport(new URL(MCP_URL), { authProvider: provider })

  console.log(`Connecting to ${MCP_URL} …`)
  try {
    await client.connect(transport)
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error
    if (!provider.authorizationUrl) throw new Error("no authorization URL produced")
    console.log("\nOpen this URL in your browser and approve access:\n")
    console.log(provider.authorizationUrl.toString(), "\n")
    const code = await waitForCode()
    await transport.finishAuth(code)
    transport = new StreamableHTTPClientTransport(new URL(MCP_URL), { authProvider: provider })
    await client.connect(transport)
  }

  const { tools } = await client.listTools()
  console.log(`Connected. ${tools.length} tools exposed:\n`)
  for (const t of tools) console.log(`  ${t.name.padEnd(34)} ${t.title ?? ""}`)
  await client.close()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
