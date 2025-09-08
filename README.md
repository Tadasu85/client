# VSC Client

A TypeScript client for the VSC network with support for Hive, EVM, and offchain authentication.

## Features

- **Multi-blockchain Support**: Hive, EVM, and offchain authentication
- **Modern Hive Authentication**: Support for both KeychainSDK and Aioha
- **TypeScript**: Full type safety and modern ES modules
- **Documentation**: Auto-generated API documentation via TypeDoc
- **CI/CD**: Automated testing, building, and deployment

## Documentation

Visit our [GitHub Pages documentation](https://tadasu85.github.io/client/) for the complete API reference.

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run linting
npm run lint

# Generate documentation
npm run docs

# Development mode
npm run dev
```

## Testing

The project includes comprehensive test suites for all authentication methods and blockchain interactions.

## Hive Authentication

The VSC client uses Aioha for unified Hive authentication, supporting multiple providers:

### Aioha with Keychain Provider
```typescript
import { vClient, type AiohaConfig } from '@vsc.eco/client'

const aiohaConfig: AiohaConfig = {
  appName: "VSC Client",
  appDescription: "VSC Network Client with Keychain Support"
}

const client = new vClient({
  api: 'https://api.vsc.eco',
  loginType: 'hive'
})

await client.loginWithHive({
  hiveName: 'your-username',
  provider: 'keychain',
  aiohaConfig
})
```

### Aioha with HiveAuth Provider (Modern Web3)
```typescript
import { vClient, type AiohaConfig } from '@vsc.eco/client'

const aiohaConfig: AiohaConfig = {
  appName: "VSC Client",
  appDescription: "VSC Network Client with HiveAuth Support",
  appIcon: "https://your-app-icon.com/icon.png"
}

const client = new vClient({
  api: 'https://api.vsc.eco',
  loginType: 'hive'
})

await client.loginWithHive({
  hiveName: 'your-username',
  provider: 'hiveauth',
  aiohaConfig,
  options: {
    displayQr: (data) => console.log('QR Code:', data)
  }
})
```

### Supported Aioha Providers
- `keychain` - Traditional Hive Keychain
- `hivesigner` - HiveSigner integration
- `hiveauth` - Modern web3 authentication
- `ledger` - Ledger hardware wallet
- `peakvault` - PeakVault wallet
- `custom` - Custom provider

## Examples

See `src/examples/hive-auth-examples.ts` for comprehensive examples of all authentication methods.