#!/usr/bin/env sh
# Adds the Kema Invoice connector to Claude Code. The first tool call opens the
# OAuth consent page; tokens are stored by Claude Code.
claude mcp add kema-invoice --transport http --url https://mcp.kema-studio.com/api/mcp
