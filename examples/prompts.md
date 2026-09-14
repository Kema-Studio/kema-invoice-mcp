# Prompt playbook

Kema Invoice tools are designed for natural-language delegation. These prompts work as-is in Claude once the connector is enabled; adapt names and amounts.

## From a request to a sent invoice

> Create an invoice for Dupont SARL: 3 days of consulting at €800 per day, due in 30 days. Show it to me before issuing.

> Looks good. Issue it and send the PDF link.

The agent calls `create_invoice`, then `issue_invoice` (which triggers Factur-X generation and transmission), then `get_invoice_pdf`.

## Follow-up and cash

> List my unpaid invoices older than 30 days.

> Mark FAC-2026-0412 as paid, received today by bank transfer.

## Quotes and retainers

> Draft a quote for Atelier Brumaire: website redesign, €6,400 excl. VAT, valid 30 days, and send it.

> The client accepted DEV-2026-0031: convert it into an invoice.

> Ask Dupont SARL for a €2,000 retainer before we start, then apply it to their next invoice.

## Fixing a mistake

An issued Factur-X invoice cannot be edited. The agent knows the compliant path:

> The address on FAC-2026-0398 is wrong. Fix it.

It calls `rectify_invoice`, which creates a credit note and a corrected invoice, and returns the links.

## Reporting

> How much did I invoice this quarter, and what is still outstanding?

> What did my agent do this week?

`get_revenue_summary` and `list_mcp_activity` answer both.
