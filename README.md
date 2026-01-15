# proxy-sync

Declarative multi-provider sync for new-api instances. Sync pricing, groups, and channels from multiple upstream new-api providers to your own instance with automatic failover.

## Features

- **Multi-provider support**: Sync from multiple upstream new-api sites
- **Automatic token creation**: Creates tokens on upstream providers automatically
- **Idempotent**: Run multiple times safely - upserts everything, deletes stale resources
- **Failover routing**: Configures auto-group with cheapest-first ordering
- **Model pricing sync**: Syncs both input (ModelRatio) and output (CompletionRatio) pricing

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
         "auth": {
           "accessToken": "your-access-token",
           "userId": 123
         },
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

```json
{
  "target": {
    "url": "https://your-instance.example.com",
    "adminToken": "sk-xxx"
  }
}
```

### Providers

Upstream new-api sites to sync from. Each provider requires:

| Field | Description |
|-------|-------------|
| `name` | Unique identifier, used as group prefix (e.g., `newapi-aws-q`) |
| `baseUrl` | Provider URL (e.g., `https://www.newapi.ai`) |
| `auth.accessToken` | Your access token from the provider's account settings |
| `auth.userId` | Your user ID on the provider |
| `enabledGroups` | (Optional) Subset of groups to sync. Omit for all groups |
| `priority` | (Optional) Higher = preferred in failover (default: 0) |

## How It Works

### Sync Flow

```
1. For each provider:
   - Fetch /api/pricing → groups, models, ratios
   - Filter to enabledGroups (if specified)
   - Ensure tokens exist on upstream (create if missing)
   - Collect: prefixed groups, model ratios, channel specs

2. Merge all providers:
   - GroupRatio: { "newapi-aws-q": 0.15, "provider2-cheap": 0.2, ... }
   - AutoGroups: sorted by ratio (cheapest first)
   - ModelRatio + CompletionRatio: merged (lowest wins for duplicates)

3. Update target options

4. Sync channels:
   - Upsert: create or update each provider-group channel
   - Delete: remove stale channels (provider prefix match but not in config)
```

### Channel Naming

Channels are named `{provider}-{group}`:
- `newapi-aws-q`
- `newapi-cc`
- `provider2-cheap`

### Failover Order

AutoGroups are sorted by ratio (cheapest first). When a request fails on one channel, it automatically retries on the next cheapest option.

Example order:
```
newapi-aws-q (0.15x) → provider2-cheap (0.2x) → newapi-gemini (0.6x) → newapi-cc (1.0x)
```

### Token Management

Tokens are created on upstream providers with:
- Name: `{tokenNamePrefix}-{group}` (e.g., `proxy-sync-aws-q`)
- Unlimited quota
- Never expires

Existing tokens with matching names are reused.

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
      "auth": {
        "accessToken": "your-access-token",
        "userId": 123
      },
      "enabledGroups": ["aws-q", "cc", "gemini"],
      "priority": 10
    },
    {
      "name": "provider2",
      "baseUrl": "https://other-newapi.example.com",
      "auth": {
        "accessToken": "other-access-token",
        "userId": 456
      },
      "priority": 5
    }
  ]
}
```

Result on your instance:
- **Groups**: `newapi-aws-q`, `newapi-cc`, `newapi-gemini`, `provider2-*`, `auto`
- **Channels**: One per provider-group combination
- **AutoGroups**: All groups sorted by ratio for failover

## Programmatic Usage

```typescript
import { sync } from "./src/sync";
import { loadConfig } from "./src/lib/config";

const config = await loadConfig("./config.json");
const report = await sync(config);
```

## Cron Setup

Run sync periodically to keep pricing up to date:

```bash
# Every hour
0 * * * * cd /path/to/proxy-sync && bun run sync >> /var/log/proxy-sync.log 2>&1
```

## File Structure

```
proxy-sync/
├── src/
│   ├── main.ts              # Entry point + exports
│   ├── sync.ts              # Main sync orchestration
│   ├── types.ts             # All type definitions
│   ├── clients/
│   │   ├── upstream-client.ts  # Fetch pricing, create/get tokens on upstream
│   │   └── target-client.ts    # Update options, upsert/delete channels on target
│   └── lib/
│       ├── config.ts        # JSON loader
│       └── utils.ts         # Logging helpers
├── config.json              # Your config (gitignored)
├── config.example.json      # Example config
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT
