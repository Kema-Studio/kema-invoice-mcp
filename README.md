# Kema Invoice MCP connector

**Kema Invoice is compliant e-invoicing software that AI agents can operate through the Model Context Protocol.** Connect the remote MCP server to Claude, Cursor or any MCP client, authorize once with OAuth 2.1, and your agent can create, issue, send and track invoices, quotes and retainers in plain language. Invoices are generated as Factur-X (EN 16931) and transmitted through an accredited platform. Nothing to install: the server runs at `https://mcp.kema-studio.com/api/mcp`.

[Website](https://invoice.kema-studio.com) · [Documentation](https://docs.kema-studio.com/invoice) · [Connect your agent](https://docs.kema-studio.com/invoice/guide-utilisateur/connecter-votre-agent-mcp) · [MCP Registry entry](https://registry.modelcontextprotocol.io/v0.1/servers/com.kema-studio%2Finvoice/versions/1.0.0) · [Version française](#version-française)

## What this repository is

The connector is a **remote** MCP server (Streamable HTTP + OAuth 2.1). There is no package to install and the server code is not published here. This repository holds what an integrator or a directory needs:

| File | Purpose |
|---|---|
| [`tools.json`](tools.json) | The 41 tools with title, description, group and access hints. Generated from the server code, never edited by hand. |
| [`server.json`](server.json) | The declaration published to the official MCP Registry (`com.kema-studio/invoice`). |
| [`examples/`](examples) | Ready-to-paste client configurations and a prompt playbook. |
| [`scripts/verify-connection.ts`](scripts/verify-connection.ts) | A small open-source script that runs the OAuth flow and lists the tools, to check a connection end to end. |
| [`CHANGELOG.md`](CHANGELOG.md) | Connector versions. |

## Connect in two minutes

| Client | How |
|---|---|
| **claude.ai / Claude Desktop** | Settings › Connectors › Add custom connector, paste `https://mcp.kema-studio.com/api/mcp`, authorize once. |
| **Claude Code** | `claude mcp add kema-invoice --transport http --url https://mcp.kema-studio.com/api/mcp` |
| **Cursor** | Add [`examples/cursor-mcp.json`](examples/cursor-mcp.json) to `.cursor/mcp.json`. |
| **Any MCP client** | Streamable HTTP transport, URL above, OAuth 2.1 with PKCE and dynamic client registration (RFC 7591). Authorization server metadata is discovered from `/.well-known/oauth-protected-resource`. |

The first call opens a consent page on `auth.kema-studio.com`. You sign in with your Kema Invoice account, approve, and the client stores the token. Access can be revoked at any time from the app or from the client.

No account yet? [Create one](https://invoice.kema-studio.com): 14-day trial with 10 invoices included, one user, no credit card. Then a single plan at €10 per user per month excl. VAT, every feature included, cancel at any time.

## What your agent can do

<!-- tools:en:start -->
### Invoices (16)

| Tool | What it does | Access |
|---|---|---|
| `create_invoice` | Create an invoice for a company, with line items. In this product, creating an invoice means issuing it: after this call, show the user a short summary (client, lines, totals) and, on their approval, call issue_invoice with confirm:true. Keep it as a draft only if the user explicitly wants to review or edit it in the app first. VAT is computed automatically by strict server-side fiscal rules (scenario + defaults) - never ask the user for a VAT rate. The fiscal scenario and client snapshot are frozen at creation. | write |
| `issue_invoice` | Issue a Draft invoice: the legal act of creating it (the product calls this 'Créer la facture'). The invoice becomes a definitive legal document (status Sent, displayed as 'Créée'): IRREVERSIBLE under French law, undone only with a credit note. ALWAYS show the user the invoice summary and get their explicit approval before calling with confirm:true; without confirm, returns a preview. Fiscal certification happens inside this call and is internal plumbing: once it returns, tell the user the invoice is created and nothing more. NEVER mention certification, fiscal status, immutability or processing to the user unless this tool returns an error. | write, destructive |
| `list_invoices` | List the authenticated tenant's invoices, most recent first. Supports filtering by status, document type, and a free-text search on invoice number or client name, plus pagination. | read |
| `get_invoice` | Fetch a single invoice by id, including its line items, client, and totals. Returns null-shaped error if the invoice is not visible to the caller. | read |
| `get_invoice_pdf` | Return a temporary (1 hour) signed download URL for an invoice's PDF. Works for any document visible to the caller: imported invoices return their uploaded file; invoices issued in Kema Invoice (by the app or an agent) are rendered server-side with the workspace branding and, once certified, embed the Factur-X XML. Drafts render too (flagged is_draft: true) but are not legal documents yet. | read |
| `update_invoice` | Update fields of a Draft invoice (dates, payment terms, notes, or reassign the company). Only Draft invoices can be modified - a Sent/certified invoice is immutable. | write |
| `delete_invoice` | Soft-delete a Draft invoice. Irreversible from the user's view. Call with confirm:true to actually delete; without it, returns a preview of what would be deleted. | write, destructive |
| `cancel_invoice` | Cancel a DRAFT invoice (status → Cancelled). Irreversible. Issued documents (Sent, Overdue, Paid) are fiscal records and cannot be cancelled outright: use create_credit_note, which issues a certified credit note (avoir) and cancels the original. Call with confirm:true to act; otherwise returns a preview. | write, destructive |
| `mark_invoice_paid` | Mark a Sent or Overdue invoice as Paid. Optionally set the payment date (defaults to now). | write |
| `add_invoice_item` | Add a line item to a Draft invoice. Totals are recalculated automatically. | write |
| `update_invoice_item` | Update a line item on a Draft invoice. Totals are recalculated automatically. Item ids come from get_invoice or add_invoice_item. | write |
| `delete_invoice_item` | Remove a line item from a Draft invoice. Totals are recalculated automatically. Item ids come from get_invoice or add_invoice_item. Call with confirm:true to delete; without it, returns a preview of the item. | write, destructive |
| `reorder_invoice_items` | Set the display order of an invoice's line items. Pass the full desired order: every item id with its 0-based display_order. Item ids come from get_invoice or add_invoice_item. | write |
| `update_invoice_matter` | Attach or detach the matter (dossier) on an invoice. Purely organizational - allowed even after the invoice is Sent, but not on a Cancelled invoice. Pass matter_id null to detach. | write |
| `check_certification_status` | Maintenance tool: refresh an issued document's fiscal certification state from the certification provider and reconcile it into the database. Certification is internal plumbing that completes on its own after issue_invoice: NEVER call this proactively, and never bring certification up with the user. Use it only when the user explicitly asks about certification, or after issue_invoice returned a certification error. | write |
| `create_credit_note` | Cancel a Sent or Paid invoice by issuing a credit note (avoir). The credit note is a legal fiscal document (fiscally certified when the original was certified) and is IMMUTABLE once created. IRREVERSIBLE. ALWAYS get the user's explicit approval before calling with confirm:true. Without confirm, returns a preview. | write, destructive |

### Rectification and import (3)

| Tool | What it does | Access |
|---|---|---|
| `rectify_invoice` | Create a rectifying invoice (facture rectificative) for a Sent or Paid invoice: a NEW Draft invoice pre-filled from the original (same client, copied line items unless overridden) and legally linked to it. The original is marked Rectified only when the rectificative is issued. Call with confirm:true to create; without it, returns a preview. | write |
| `get_rectification_links` | For one invoice, return the rectification chain: the original it replaces (if it is a rectificative) and/or the rectificative that replaced it (if it was rectified). Both null when the invoice is not part of a chain. | read |
| `import_external_invoice` | Import a historical/external invoice with its OWN invoice number (kept verbatim), totals, and status - no line items. Use for migrating past invoices issued outside Kema Invoice; NOT for creating new invoices (use create_invoice). | write |

### Quotes (5)

| Tool | What it does | Access |
|---|---|---|
| `create_quote` | Create a Draft quote (devis) for a company. Quotes are not fiscal documents - no certification. Dates default server-side (issue today, due/valid +30 days). Requires a matter id (dossier) the quote belongs to. | write |
| `send_quote` | Transition a Draft quote to Sent (the client-facing state). No certification is involved - quotes are commercial documents. French B2B validation (SIREN/VAT) applies when the tenant is French. | write, destructive |
| `accept_quote` | Mark a Sent quote as Accepted by the client. Follow up with convert_quote_to_invoice to bill it. | write, destructive |
| `reject_quote` | Mark a Sent quote as Rejected by the client. This ends the quote's lifecycle. Call with confirm:true to apply; without it, returns a preview. | write, destructive |
| `convert_quote_to_invoice` | Create a new Draft invoice from an Accepted quote (line items copied, source_quote_id set for traceability). The invoice then follows the normal lifecycle (issue_invoice to make it legally binding). Call with confirm:true to apply; without it, returns a preview. | write |

### Retainers (6)

| Tool | What it does | Access |
|---|---|---|
| `create_provision` | Create a provision document (avance sur honoraires, retainer) in Draft status for a company, optionally attached to a matter. NOT issued or certified - use send_provision for the legal issuance. VAT is computed automatically by strict server-side fiscal rules - never ask the user for a VAT rate. Provisions use their own PROV number series and, once paid, become a client credit deductible from the final invoice (apply_provisions_to_invoice). | write |
| `send_provision` | Issue a Draft provision: the legal act of creating it. The provision becomes a definitive legal document (status Sent, PROV series): IRREVERSIBLE and legally binding under French law. ALWAYS show the user the provision details and get their explicit approval before calling with confirm:true; without confirm, returns a preview. Fiscal certification happens inside this call and is internal plumbing: once it returns, tell the user the provision is created and nothing more. NEVER mention certification, fiscal status, immutability or processing to the user unless this tool returns an error. | write, destructive |
| `mark_provision_paid` | Mark an issued provision (status Sent/Overdue) as Paid. A paid provision becomes a client credit that can be deducted from that client's final invoice with apply_provisions_to_invoice. | write |
| `list_available_provisions` | List PAID provisions (avances sur honoraires, retainers) that have not been applied to a final invoice yet - the deductible client credit. Without matter_id, lists the standalone retainers (no matter), which is the normal case in Kema Invoice; with matter_id, lists that matter's retainers. Use before apply_provisions_to_invoice. | read |
| `apply_provisions_to_invoice` | Deduct one or more PAID provisions from a DRAFT final invoice of the same client (and of the same matter when one is attached). Updates the invoice's advances_total and amount_due. Reversible while the invoice is still Draft (remove_provision_from_invoice). | write |
| `remove_provision_from_invoice` | Detach a provision from a DRAFT final invoice and recalculate its advances_total / amount_due. The provision becomes available again for that matter. | write |

### Customers (5)

| Tool | What it does | Access |
|---|---|---|
| `list_companies` | List the authenticated tenant's client companies (name, email, VAT/tax id, country). Useful to resolve a company id before other lookups. | read |
| `get_company` | Fetch one customer company with the full billing-relevant record: legal identity, VAT/SIREN, address, contact details, and client profile classification. | read |
| `create_company` | Create a customer company for the tenant. A VAT/tax id is required later to bill it as B2B. | write |
| `update_company` | Update fields of an existing client company (name, contact info, address, VAT number, SIREN). Only provided fields change. Fixing the VAT number / SIREN / address here is often required before an invoice for this client can be certified. | write |
| `delete_company` | Soft-delete a client company. Blocked when contacts are still linked to it. Call with confirm:true to delete; without it, returns a preview. | write, destructive |

### Customer profiles (3)

| Tool | What it does | Access |
|---|---|---|
| `get_invoice_client_profile` | Per-company invoicing defaults (payment terms, delivery channel, custom invoice prefix). Returns {profile: null} when the company has none - profiles are created lazily. | read |
| `upsert_invoice_client_profile` | Create or update a company's invoicing defaults (payment terms, delivery channel, invoice prefix). These defaults pre-fill future invoices for that client. | write |
| `delete_invoice_client_profile` | Remove a company's invoicing defaults (the company itself is untouched). Call with confirm:true to actually delete; without it, returns a preview. | write, destructive |

### Reporting (3)

| Tool | What it does | Access |
|---|---|---|
| `get_revenue_summary` | Aggregate revenue figures: collected in the period (by payment date), current outstanding and overdue (point-in-time), documents issued in the period, draft count, and net credit-note effect. Defaults to the current month. | read |
| `get_settings` | Read-only snapshot of the tenant's invoicing settings: legal identity, fiscal country and regime, default VAT rate and payment terms, billing email, and the caller's UI language. Settings can only be CHANGED from the app. | read |
| `list_mcp_activity` | The tenant's recent agent activity log: one entry per successful MCP tool call (tool name, related invoice number when known, timestamp). Newest first. | read |
<!-- tools:en:end -->

Design rules the server follows: one title per tool, `readOnlyHint` on reads and an explicit `destructiveHint` on writes, a description on every parameter, an `outputSchema` and `structuredContent` on every result. Tool names are frozen: your prompts and automations keep working across versions.

A refused call (no active subscription, quota reached) is returned as a tool result written for the model, not as a transport error: the connector stays connected and keeps listing its tools.

## Try it

Ask your agent, in your language:

- "Invoice 3 days of consulting to Dupont SARL at €800 per day."
- "List my unpaid invoices and mark FAC-2026-0412 as paid."
- "Turn quote DEV-2026-0031 into an invoice and send it."

More in [`examples/prompts.md`](examples/prompts.md).

## Compliance and data

- Invoices are produced as **Factur-X** (PDF/A-3 with embedded EN 16931 XML) and transmitted through an **accredited platform**, ready for the French e-invoicing mandate.
- Data is hosted in the **European Union** (database and authentication on AWS eu-north-1, Stockholm; edge and storage in the EU). Sub-processors and retention periods are listed in the [privacy policy](https://docs.kema-studio.com/invoice/aspects-legaux/politique-de-confidentialite).
- Every MCP call is logged in the app under **Agent activity**, so you always see what your agent did.
- [Terms](https://docs.kema-studio.com/invoice/aspects-legaux/cgu) · [Legal notice](https://docs.kema-studio.com/invoice/aspects-legaux/mentions-legales)

## Verify a connection

```bash
git clone https://github.com/Kema-Studio/kema-invoice-mcp && cd kema-invoice-mcp
npm install
npm run verify        # opens the consent page, then lists the tools
```

## Support

- Questions about your account or your invoices: support from the app (Help button), or hello@kema-studio.com.
- Bugs of the connector itself (a tool that errors, a schema problem): [open an issue](../../issues/new/choose).

## License

The contents of this repository (documentation, examples, scripts) are released under the [MIT License](LICENSE). The Kema Invoice service and its server are proprietary software of Kema Studio.

---

## Version française

**Kema Invoice est un logiciel de facturation électronique conforme que les agents IA pilotent par le Model Context Protocol.** Branchez le serveur MCP distant à Claude, Cursor ou tout client MCP, autorisez une fois en OAuth 2.1, et votre agent crée, émet, envoie et suit factures, devis et provisions en langage naturel. Les factures sont produites en Factur-X (EN 16931) et transmises par une plateforme agréée. Rien à installer : le serveur répond sur `https://mcp.kema-studio.com/api/mcp`.

### Se connecter

| Client | Comment |
|---|---|
| **claude.ai / Claude Desktop** | Paramètres › Connecteurs › Ajouter un connecteur personnalisé, coller `https://mcp.kema-studio.com/api/mcp`, autoriser une fois. |
| **Claude Code** | `claude mcp add kema-invoice --transport http --url https://mcp.kema-studio.com/api/mcp` |
| **Cursor** | Ajouter [`examples/cursor-mcp.json`](examples/cursor-mcp.json) à `.cursor/mcp.json`. |
| **Autre client MCP** | Transport Streamable HTTP, OAuth 2.1 avec PKCE et enregistrement dynamique de client (RFC 7591). |

Pas encore de compte ? [Créez-le](https://invoice.kema-studio.com) : essai de 14 jours avec 10 factures incluses, un utilisateur, sans carte bancaire. Ensuite une offre unique à 10 € HT par utilisateur et par mois, toutes fonctionnalités comprises, sans engagement.

### Ce que votre agent sait faire

<!-- tools:fr:start -->
### Factures (16)

| Outil | Ce qu'il fait | Accès |
|---|---|---|
| `create_invoice` | Create an invoice for a company, with line items. In this product, creating an invoice means issuing it: after this call, show the user a short summary (client, lines, totals) and, on their approval, call issue_invoice with confirm:true. Keep it as a draft only if the user explicitly wants to review or edit it in the app first. VAT is computed automatically by strict server-side fiscal rules (scenario + defaults) - never ask the user for a VAT rate. The fiscal scenario and client snapshot are frozen at creation. | écriture |
| `issue_invoice` | Issue a Draft invoice: the legal act of creating it (the product calls this 'Créer la facture'). The invoice becomes a definitive legal document (status Sent, displayed as 'Créée'): IRREVERSIBLE under French law, undone only with a credit note. ALWAYS show the user the invoice summary and get their explicit approval before calling with confirm:true; without confirm, returns a preview. Fiscal certification happens inside this call and is internal plumbing: once it returns, tell the user the invoice is created and nothing more. NEVER mention certification, fiscal status, immutability or processing to the user unless this tool returns an error. | écriture, destructif |
| `list_invoices` | List the authenticated tenant's invoices, most recent first. Supports filtering by status, document type, and a free-text search on invoice number or client name, plus pagination. | lecture |
| `get_invoice` | Fetch a single invoice by id, including its line items, client, and totals. Returns null-shaped error if the invoice is not visible to the caller. | lecture |
| `get_invoice_pdf` | Return a temporary (1 hour) signed download URL for an invoice's PDF. Works for any document visible to the caller: imported invoices return their uploaded file; invoices issued in Kema Invoice (by the app or an agent) are rendered server-side with the workspace branding and, once certified, embed the Factur-X XML. Drafts render too (flagged is_draft: true) but are not legal documents yet. | lecture |
| `update_invoice` | Update fields of a Draft invoice (dates, payment terms, notes, or reassign the company). Only Draft invoices can be modified - a Sent/certified invoice is immutable. | écriture |
| `delete_invoice` | Soft-delete a Draft invoice. Irreversible from the user's view. Call with confirm:true to actually delete; without it, returns a preview of what would be deleted. | écriture, destructif |
| `cancel_invoice` | Cancel a DRAFT invoice (status → Cancelled). Irreversible. Issued documents (Sent, Overdue, Paid) are fiscal records and cannot be cancelled outright: use create_credit_note, which issues a certified credit note (avoir) and cancels the original. Call with confirm:true to act; otherwise returns a preview. | écriture, destructif |
| `mark_invoice_paid` | Mark a Sent or Overdue invoice as Paid. Optionally set the payment date (defaults to now). | écriture |
| `add_invoice_item` | Add a line item to a Draft invoice. Totals are recalculated automatically. | écriture |
| `update_invoice_item` | Update a line item on a Draft invoice. Totals are recalculated automatically. Item ids come from get_invoice or add_invoice_item. | écriture |
| `delete_invoice_item` | Remove a line item from a Draft invoice. Totals are recalculated automatically. Item ids come from get_invoice or add_invoice_item. Call with confirm:true to delete; without it, returns a preview of the item. | écriture, destructif |
| `reorder_invoice_items` | Set the display order of an invoice's line items. Pass the full desired order: every item id with its 0-based display_order. Item ids come from get_invoice or add_invoice_item. | écriture |
| `update_invoice_matter` | Attach or detach the matter (dossier) on an invoice. Purely organizational - allowed even after the invoice is Sent, but not on a Cancelled invoice. Pass matter_id null to detach. | écriture |
| `check_certification_status` | Maintenance tool: refresh an issued document's fiscal certification state from the certification provider and reconcile it into the database. Certification is internal plumbing that completes on its own after issue_invoice: NEVER call this proactively, and never bring certification up with the user. Use it only when the user explicitly asks about certification, or after issue_invoice returned a certification error. | écriture |
| `create_credit_note` | Cancel a Sent or Paid invoice by issuing a credit note (avoir). The credit note is a legal fiscal document (fiscally certified when the original was certified) and is IMMUTABLE once created. IRREVERSIBLE. ALWAYS get the user's explicit approval before calling with confirm:true. Without confirm, returns a preview. | écriture, destructif |

### Rectification et import (3)

| Outil | Ce qu'il fait | Accès |
|---|---|---|
| `rectify_invoice` | Create a rectifying invoice (facture rectificative) for a Sent or Paid invoice: a NEW Draft invoice pre-filled from the original (same client, copied line items unless overridden) and legally linked to it. The original is marked Rectified only when the rectificative is issued. Call with confirm:true to create; without it, returns a preview. | écriture |
| `get_rectification_links` | For one invoice, return the rectification chain: the original it replaces (if it is a rectificative) and/or the rectificative that replaced it (if it was rectified). Both null when the invoice is not part of a chain. | lecture |
| `import_external_invoice` | Import a historical/external invoice with its OWN invoice number (kept verbatim), totals, and status - no line items. Use for migrating past invoices issued outside Kema Invoice; NOT for creating new invoices (use create_invoice). | écriture |

### Devis (5)

| Outil | Ce qu'il fait | Accès |
|---|---|---|
| `create_quote` | Create a Draft quote (devis) for a company. Quotes are not fiscal documents - no certification. Dates default server-side (issue today, due/valid +30 days). Requires a matter id (dossier) the quote belongs to. | écriture |
| `send_quote` | Transition a Draft quote to Sent (the client-facing state). No certification is involved - quotes are commercial documents. French B2B validation (SIREN/VAT) applies when the tenant is French. | écriture, destructif |
| `accept_quote` | Mark a Sent quote as Accepted by the client. Follow up with convert_quote_to_invoice to bill it. | écriture, destructif |
| `reject_quote` | Mark a Sent quote as Rejected by the client. This ends the quote's lifecycle. Call with confirm:true to apply; without it, returns a preview. | écriture, destructif |
| `convert_quote_to_invoice` | Create a new Draft invoice from an Accepted quote (line items copied, source_quote_id set for traceability). The invoice then follows the normal lifecycle (issue_invoice to make it legally binding). Call with confirm:true to apply; without it, returns a preview. | écriture |

### Provisions (6)

| Outil | Ce qu'il fait | Accès |
|---|---|---|
| `create_provision` | Create a provision document (avance sur honoraires, retainer) in Draft status for a company, optionally attached to a matter. NOT issued or certified - use send_provision for the legal issuance. VAT is computed automatically by strict server-side fiscal rules - never ask the user for a VAT rate. Provisions use their own PROV number series and, once paid, become a client credit deductible from the final invoice (apply_provisions_to_invoice). | écriture |
| `send_provision` | Issue a Draft provision: the legal act of creating it. The provision becomes a definitive legal document (status Sent, PROV series): IRREVERSIBLE and legally binding under French law. ALWAYS show the user the provision details and get their explicit approval before calling with confirm:true; without confirm, returns a preview. Fiscal certification happens inside this call and is internal plumbing: once it returns, tell the user the provision is created and nothing more. NEVER mention certification, fiscal status, immutability or processing to the user unless this tool returns an error. | écriture, destructif |
| `mark_provision_paid` | Mark an issued provision (status Sent/Overdue) as Paid. A paid provision becomes a client credit that can be deducted from that client's final invoice with apply_provisions_to_invoice. | écriture |
| `list_available_provisions` | List PAID provisions (avances sur honoraires, retainers) that have not been applied to a final invoice yet - the deductible client credit. Without matter_id, lists the standalone retainers (no matter), which is the normal case in Kema Invoice; with matter_id, lists that matter's retainers. Use before apply_provisions_to_invoice. | lecture |
| `apply_provisions_to_invoice` | Deduct one or more PAID provisions from a DRAFT final invoice of the same client (and of the same matter when one is attached). Updates the invoice's advances_total and amount_due. Reversible while the invoice is still Draft (remove_provision_from_invoice). | écriture |
| `remove_provision_from_invoice` | Detach a provision from a DRAFT final invoice and recalculate its advances_total / amount_due. The provision becomes available again for that matter. | écriture |

### Clients (5)

| Outil | Ce qu'il fait | Accès |
|---|---|---|
| `list_companies` | List the authenticated tenant's client companies (name, email, VAT/tax id, country). Useful to resolve a company id before other lookups. | lecture |
| `get_company` | Fetch one customer company with the full billing-relevant record: legal identity, VAT/SIREN, address, contact details, and client profile classification. | lecture |
| `create_company` | Create a customer company for the tenant. A VAT/tax id is required later to bill it as B2B. | écriture |
| `update_company` | Update fields of an existing client company (name, contact info, address, VAT number, SIREN). Only provided fields change. Fixing the VAT number / SIREN / address here is often required before an invoice for this client can be certified. | écriture |
| `delete_company` | Soft-delete a client company. Blocked when contacts are still linked to it. Call with confirm:true to delete; without it, returns a preview. | écriture, destructif |

### Profils client (3)

| Outil | Ce qu'il fait | Accès |
|---|---|---|
| `get_invoice_client_profile` | Per-company invoicing defaults (payment terms, delivery channel, custom invoice prefix). Returns {profile: null} when the company has none - profiles are created lazily. | lecture |
| `upsert_invoice_client_profile` | Create or update a company's invoicing defaults (payment terms, delivery channel, invoice prefix). These defaults pre-fill future invoices for that client. | écriture |
| `delete_invoice_client_profile` | Remove a company's invoicing defaults (the company itself is untouched). Call with confirm:true to actually delete; without it, returns a preview. | écriture, destructif |

### Pilotage (3)

| Outil | Ce qu'il fait | Accès |
|---|---|---|
| `get_revenue_summary` | Aggregate revenue figures: collected in the period (by payment date), current outstanding and overdue (point-in-time), documents issued in the period, draft count, and net credit-note effect. Defaults to the current month. | lecture |
| `get_settings` | Read-only snapshot of the tenant's invoicing settings: legal identity, fiscal country and regime, default VAT rate and payment terms, billing email, and the caller's UI language. Settings can only be CHANGED from the app. | lecture |
| `list_mcp_activity` | The tenant's recent agent activity log: one entry per successful MCP tool call (tool name, related invoice number when known, timestamp). Newest first. | lecture |
<!-- tools:fr:end -->

### Conformité et données

Factures **Factur-X** (PDF/A-3 avec XML EN 16931) transmises par une **plateforme agréée** ; données hébergées dans l'**Union européenne** (base et authentification sur AWS eu-north-1, Stockholm) ; chaque appel MCP journalisé dans l'app, rubrique **Activité de l'agent**. [Politique de confidentialité](https://docs.kema-studio.com/invoice/aspects-legaux/politique-de-confidentialite) · [CGU](https://docs.kema-studio.com/invoice/aspects-legaux/cgu) · [Mentions légales](https://docs.kema-studio.com/invoice/aspects-legaux/mentions-legales).

### Support

Compte et factures : depuis l'app (bouton Aide) ou hello@kema-studio.com. Bug du connecteur : [ouvrir une issue](../../issues/new/choose).
