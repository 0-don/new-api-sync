# new-api-sync

Sync pricing, groups, and channels from multiple upstream new-api providers to your own instance.

## Features

- **Multi-provider support**: Sync from multiple upstream new-api sites
- **Automatic token creation**: Creates tokens on upstream providers automatically
- **Idempotent**: Safe to run multiple times - upserts everything, deletes stale channels
- **Failover routing**: Configures auto-group with cheapest-first ordering
- **Pricing sync**: Syncs both input (ModelRatio) and output (CompletionRatio) pricing

## Quick Start

1. Copy the example config:

   ```bash
   cp config.example.json config.json
   ```

2. Edit `config.json` with your providers:

   ```json
   {
     "target": {
       "url": "https://your-instance.example.com",
       "adminToken": "sk-xxx"
     },
     "providers": [
       {
         "name": "newapi",
         "baseUrl": "https://www.newapi.ai",
         "accessToken": "your-system-access-token",
         "enabledGroups": ["aws-q", "cc", "gemini"],
         "priority": 10
       }
     ]
   }
   ```

3. Run sync:
   ```bash
   bun run sync
   ```

## Configuration

### Target

Your new-api instance where channels and settings will be synced.

### Providers

| Field           | Description                                              |
| --------------- | -------------------------------------------------------- |
| `name`          | Unique identifier, used as channel prefix                |
| `baseUrl`       | Provider URL (e.g., `https://www.newapi.ai`)             |
| `accessToken`   | System Access Token from provider's account settings     |
| `enabledGroups` | (Optional) Subset of groups to sync. Omit for all groups |
| `priority`      | (Optional) Higher = preferred in failover (default: 0)   |

## How It Works

1. For each provider: fetch `/api/pricing`, filter groups, ensure tokens exist
2. Merge all providers: GroupRatio, AutoGroups (cheapest first), ModelRatio, CompletionRatio
3. Update target options
4. Sync channels: upsert new, delete stale

### Channel Naming

Channels are named `{provider}-{group}`: `newapi-aws-q`, `newapi-cc`, etc.

### Failover Order

<!-- AutoGroups sorted by ratio (cheapest first). Failed requests retry on next cheapest.

## Pricing & Margin Calculation

### The Arbitrage

Chinese API providers price in CNY. We convert **1 CNY = 1 USD** when reselling to international customers.

Actual exchange rate: **1 USD = ~7.3 CNY**

This means every token sold has a built-in ~7.3x gross margin from the FX spread alone.

### Example: claude-opus-4-5-20251101 (ikun, 0.5x multiplier)

| Step | Input/M | Output/M |
|------|---------|----------|
| Ikun listed price | ¥2 CNY | ¥10 CNY |
| After 0.5x multiplier (our cost) | ¥1 CNY | ¥5 CNY |
| Our cost in USD (÷7.3) | $0.137 | $0.685 |
| We charge users (1 CNY = 1 USD) | $1.00 | $5.00 |
| **Gross margin** | **7.3x** | **7.3x** |

### After Fees & German Taxes (Einzelunternehmer)

Per M output tokens (€4.24 revenue):

| Deduction | Amount |
|-----------|--------|
| Revenue | €4.24 |
| Stripe (~2.9% + €0.25) | -€0.37 |
| Cost (ikun via Alipay) | -€0.58 |
| Gewerbesteuer (~14%) | -€0.46 |
| Einkommensteuer + Soli (~32%) | -€1.04 |
| **Net profit** | **~€1.79** |

**Effective net margin: ~2.6x**

### Subscription Tier ($20/month)

$20/month → $40 in token credits (2x value). Rate limited per 6h and weekly.

| | Pay-as-you-go | Subscription |
|--|---------------|-------------|
| User pays | $5/M output | $2.50/M output (effective) |
| Your cost | $0.685/M | $0.685/M |
| Gross margin | 7.3x | 3.65x |
| Net after taxes | ~2.6x | ~1.8x |

**Worst case (subscriber uses all $40):**
- Your actual cost: $40 × ($0.685/$5) = $5.48
- You collected: $20
- Gross margin: 3.65x

**Best case (subscriber doesn't use all credits):**
- Unused tokens = pure profit
- $20 guaranteed revenue regardless of usage

**Floor:** even at full usage, net profit per subscriber is ~$14.52/month before taxes.

### Notes

- VAT (USt 19%) charged on top to EU customers, remitted via OSS — net neutral
- Non-EU customers: no VAT
- Alipay receipts + ikun dashboard = Betriebsausgabe documentation (confirm with Steuerberater)
- §13b reverse-charge applies on Chinese service imports -->

## Multi-Provider Example

```json
{
  "target": {
    "url": "https://your-instance.example.com",
    "adminToken": "sk-xxx"
  },
  "providers": [
    {
      "name": "newapi",
      "baseUrl": "https://www.newapi.ai",
      "accessToken": "token-1",
      "enabledGroups": ["aws-q", "cc", "gemini"],
      "priority": 10
    },
    {
      "name": "provider2",
      "baseUrl": "https://other-newapi.example.com",
      "accessToken": "token-2",
      "priority": 5
    }
  ]
}
```
