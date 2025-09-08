import { vClient, type AiohaConfig } from '../index'

/**
 * Example: Using Aioha with Keychain provider
 */
export async function exampleAiohaKeychainAuth() {
  const client = new vClient({
    api: 'https://api.vsc.eco',
    loginType: 'hive',
  })

  const aiohaConfig: AiohaConfig = {
    appName: 'VSC Client',
    appDescription: 'VSC Network Client with Keychain Support',
  }

  try {
    await client.loginWithHive({
      hiveName: 'your-hive-username',
      provider: 'keychain',
      aiohaConfig,
    })

    console.log('Logged in with Aioha (Keychain):', client.loginInfo.id)
    console.log('Provider:', client.loginInfo.provider)

    return client
  } catch (error) {
    console.error('Aioha Keychain login failed:', error)
    throw error
  }
}

/**
 * Example: Using modern Aioha authentication
 */
export async function exampleAiohaAuth() {
  const client = new vClient({
    api: 'https://api.vsc.eco',
    loginType: 'hive',
  })

  const aiohaConfig: AiohaConfig = {
    appName: 'VSC Client',
    appDescription: 'VSC Network Client with Aioha Support',
    appIcon: 'https://avatars.githubusercontent.com/u/133249767',
    hivesigner: {
      app: 'vsc.client',
      callbackURL: 'https://your-app.com/callback',
      scope: ['login', 'vote', 'comment', 'transfer'],
    },
  }

  try {
    await client.loginWithHive({
      hiveName: 'your-hive-username',
      provider: 'keychain',
      aiohaConfig,
    })

    console.log('Logged in with Aioha:', client.loginInfo.id)
    console.log('Provider:', client.loginInfo.provider)

    // Set up account change listener
    client.onAiohaAccountChanged((username) => {
      console.log('Account changed to:', username)
    })

    // Set custom Hive API if needed
    client.setAiohaHiveAPI('https://api.hive.blog')

    return client
  } catch (error) {
    console.error('Aioha login failed:', error)
    throw error
  }
}

/**
 * Example: Using Aioha with HiveAuth provider (modern web3 auth)
 */
export async function exampleAiohaHiveAuth() {
  const client = new vClient({
    api: 'https://api.vsc.eco',
    loginType: 'hive',
  })

  const aiohaConfig: AiohaConfig = {
    appName: 'VSC Client',
    appDescription: 'VSC Network Client with HiveAuth Support',
    appIcon: 'https://avatars.githubusercontent.com/u/133249767',
  }

  try {
    await client.loginWithHive({
      hiveName: 'your-hive-username',
      provider: 'hiveauth',
      aiohaConfig,
      options: {
        displayQr: (data: string) => {
          console.log('QR Code data:', data)
          // Display QR code to user
        },
      },
    })

    console.log('Logged in with Aioha (HiveAuth):', client.loginInfo.id)
    console.log('Provider:', client.loginInfo.provider)

    return client
  } catch (error) {
    console.error('Aioha HiveAuth login failed:', error)
    throw error
  }
}

/**
 * Example: Trying different Aioha providers with fallback
 */
export async function exampleAiohaProviderFallback() {
  const client = new vClient({
    api: 'https://api.vsc.eco',
    loginType: 'hive',
  })

  const aiohaConfig: AiohaConfig = {
    appName: 'VSC Client',
    appDescription: 'VSC Network Client with Provider Fallback',
    hivesigner: {
      app: 'vsc.client',
      callbackURL: 'https://your-app.com/callback',
      scope: ['login'],
    },
  }

  const providers: Array<'keychain' | 'hivesigner' | 'hiveauth' | 'ledger' | 'peakvault'> = [
    'keychain',
    'hivesigner',
    'hiveauth',
  ]

  for (const provider of providers) {
    try {
      await client.loginWithHive({
        hiveName: 'your-hive-username',
        provider,
        aiohaConfig,
      })

      console.log(`Successfully logged in with Aioha (${provider})`)
      console.log('Aioha user:', client.getAiohaUser())
      console.log('Is Aioha logged in:', client.isAiohaLoggedIn())

      return client
    } catch (error) {
      console.log(`Aioha ${provider} failed, trying next provider...`)
      console.error(`${provider} error:`, error)
    }
  }

  throw new Error('All Aioha providers failed')
}

/**
 * Example: Using Aioha for advanced operations
 */
export async function exampleAiohaAdvanced() {
  const client = new vClient({
    api: 'https://api.vsc.eco',
    loginType: 'hive',
  })

  const aiohaConfig: AiohaConfig = {
    appName: 'VSC Client',
    appDescription: 'VSC Network Client with Advanced Aioha Features',
  }

  await client.loginWithHive({
    hiveName: 'your-hive-username',
    provider: 'keychain', // or any other Aioha provider
    aiohaConfig,
  })

  // Get the Aioha instance for advanced operations
  const aioha = client.getAioha()
  if (aioha) {
    // You can use Aioha directly for custom operations
    const isAvailable = aioha.isAvailable()
    const isLoggedIn = aioha.isLoggedIn()
    const currentUser = aioha.getCurrentUser()

    console.log('Aioha status:', { isAvailable, isLoggedIn, currentUser })

    // Set up custom event listeners
    aioha.onAccountChanged((username) => {
      console.log('Aioha account changed:', username)
    })
  }

  return client
}
