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

The VSC client now supports both traditional and modern Hive authentication methods:

### KeychainSDK (Traditional)
```typescript
import { vClient } from '@vsc.eco/client'

const client = new vClient({
  api: 'https://api.vsc.eco',
  loginType: 'hive'
})

await client.loginWithHive({
  hiveName: 'your-username',
  provider: 'hive_keychain'
})
```

### Aioha (Modern)
```typescript
import { vClient, type AiohaConfig } from '@vsc.eco/client'

const aiohaConfig: AiohaConfig = {
  appName: "VSC Client",
  appDescription: "VSC Network Client with Aioha Support",
  hivesigner: {
    app: 'vsc.client',
    callbackURL: 'https://your-app.com/callback',
    scope: ['login', 'vote', 'comment', 'transfer']
  }
}

const client = new vClient({
  api: 'https://api.vsc.eco',
  loginType: 'hive'
})

await client.loginWithHive({
  hiveName: 'your-username',
  provider: 'aioha',
  aiohaConfig
})
```

### Direct Keys (Development/Testing)
```typescript
await client.loginWithHive({
  hiveName: 'your-username',
  provider: 'direct',
  posting: 'your-posting-key',
  active: 'your-active-key'
})
```

## Examples

See `src/examples/hive-auth-examples.ts` for comprehensive examples of all authentication methods.