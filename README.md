# brighty-mcp

MCP server for [Brighty](https://brighty.app) corporate banking API. Enables Claude Code, Claude Desktop, and other MCP clients to manage Brighty business accounts, cards, payouts, transfers, and team members through natural language.

## Requirements

- Node.js >= 18

## Getting Your API Key

1. Log in to the [Brighty Business Portal](https://business.brighty.app)
2. Go to **Account > Business** ([direct link](https://business.brighty.app/account/business))
3. Click **Create API Token**
4. Copy the token — you will need it for configuration below

> Only the business **Owner** can create API tokens.

## Installation

### Claude Code (recommended)

```bash
claude mcp add brighty -- npx -y brighty-mcp
```

Then set the API key:

```bash
claude mcp set-env brighty BRIGHTY_API_KEY your-api-key
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "brighty": {
      "command": "npx",
      "args": ["-y", "brighty-mcp"],
      "env": {
        "BRIGHTY_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Global install

```bash
npm install -g brighty-mcp
```

Then use `"command": "brighty-mcp"` instead of the npx variant in any config above.

### Runtime setup (without env var)

If you prefer not to store the key in config, you can configure it at runtime. Ask Claude:

> "Set up Brighty with API key `your-api-key`"

This saves the key to `~/.brighty/config.json` via the `brighty_setup` tool.

## Configuration

The server looks for the API key in this order:

1. `BRIGHTY_API_KEY` environment variable (recommended for CI/automation)
2. `~/.brighty/config.json` config file (created by `brighty_setup` tool)

## Available Tools

### Setup

| Tool | Description |
|------|-------------|
| `brighty_setup` | Save API key to `~/.brighty/config.json` |
| `brighty_status` | Check if API key is configured and test the connection |

### Accounts

| Tool | Description |
|------|-------------|
| `brighty_list_accounts` | List all accounts (filter by type, holderId) |
| `brighty_get_account` | Get account details by ID |
| `brighty_create_account` | Create new account |
| `brighty_terminate_account` | Close an account (must have zero balance) |
| `brighty_get_account_addresses` | Get routing and crypto deposit addresses |

### Payouts

| Tool | Description |
|------|-------------|
| `brighty_list_payouts` | List all payout batches |
| `brighty_create_payout` | Create a new payout batch |
| `brighty_get_payout` | Get payout details |
| `brighty_start_payout` | Execute all transfers in a payout |
| `brighty_create_internal_transfer` | Add Brighty-to-Brighty transfer to a payout |
| `brighty_create_external_transfer` | Add fiat or crypto transfer to a payout |

### Transfers

| Tool | Description |
|------|-------------|
| `brighty_transfer_own` | Transfer between own accounts (supports cross-currency) |
| `brighty_transfer_intent` | Calculate exchange rate and fees before transfer |

### Cards

| Tool | Description |
|------|-------------|
| `brighty_list_cards` | List all business cards |
| `brighty_get_card` | Get card details |
| `brighty_order_card` | Order a new virtual card |
| `brighty_freeze_card` | Freeze a card |
| `brighty_unfreeze_card` | Unfreeze a card |
| `brighty_set_card_limits` | Update daily/monthly spending limits |
| `brighty_list_card_designs` | List available card designs |
| `brighty_get_virtual_card_product` | Get virtual card product info and fees |

### Members

| Tool | Description |
|------|-------------|
| `brighty_list_members` | List business members |
| `brighty_add_members` | Invite new members by email |
| `brighty_remove_members` | Remove members from business |

## Usage Examples

Once configured, ask Claude things like:

- "List my Brighty accounts"
- "What's the balance on my EUR account?"
- "Transfer 100 EUR from account X to account Y"
- "Create a payout batch for salaries"
- "Freeze card ending in 1234"
- "Add john@example.com as a team member"

### Invoice Payment

Send an invoice (image or PDF) and ask:

> "Pay this invoice from my EUR account"

Claude will extract the recipient, IBAN, amount, currency, and reference from the invoice, create a payout, and ask you to confirm before executing.

### Mass Payouts

Send a list of payments in any format (plain text, CSV, or Excel):

> Pay salaries:
> - John Doe, DE89370400440532013000, 3500 EUR
> - Jane Smith, FR7630006000011234567890189, 4200 EUR

Claude will parse all recipients, create a payout batch, show a summary, and execute after your confirmation.

## Development

```bash
npm install
npm run build    # compile TypeScript to dist/
npm run dev      # run with tsx (hot reload)
```

## API Reference

Full Brighty API documentation: [apidocs.brighty.app](https://apidocs.brighty.app/docs/api/brighty-api)

## License

MIT
