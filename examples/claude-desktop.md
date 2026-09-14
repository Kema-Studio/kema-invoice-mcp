# Claude Desktop and claude.ai

Kema Invoice is a remote connector: there is no `claude_desktop_config.json` entry to write and no process to run.

1. Open **Settings › Connectors**.
2. **Add custom connector**, name it `Kema Invoice`, paste `https://mcp.kema-studio.com/api/mcp`.
3. Click **Connect**: a consent page opens on `auth.kema-studio.com`. Sign in with your Kema Invoice account and approve.
4. Back in Claude, the connector shows as connected and its tools are available in every conversation where you enable it.

To revoke access: remove the connector in Claude, or revoke the client from the app (Settings › Agent activity).
