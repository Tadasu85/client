import { vClient, type AiohaConfig } from '../index'

/**
 * Example: Using traditional KeychainSDK authentication
 */
export async function exampleKeychainAuth() {
  const client = new vClient({
    api: 'https://api.vsc.eco',
    loginType: 'hive',
  })

  try {
    await client.loginWithHive({
      hiveName: 'your-hive-username',
      provider: 'hive_keychain',
    })

    console.log('Logged in with KeychainSDK:', client.loginInfo.id)
    console.log('Provider:', client.loginInfo.provider)

    return client
  } catch (error) {
    console.error('KeychainSDK login failed:', error)
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
      provider: 'aioha',
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
 * Example: Using direct key authentication (for testing/development)
 */
export async function exampleDirectKeyAuth() {
  const client = new vClient({
    api: 'https://api.vsc.eco',
    loginType: 'hive',
  })

  try {
    await client.loginWithHive({
      hiveName: 'your-hive-username',
      provider: 'direct',
      posting: 'your-posting-key', // Be careful with private keys!
      active: 'your-active-key', // Only use in secure environments
    })

    console.log('Logged in with direct keys:', client.loginInfo.id)
    console.log('Provider:', client.loginInfo.provider)

    return client
  } catch (error) {
    console.error('Direct key login failed:', error)
    throw error
  }
}

/**
 * Example: Switching between authentication methods
 */
export async function exampleSwitchAuthMethods() {
  // Start with Aioha
  const client = new vClient({
    api: 'https://api.vsc.eco',
    loginType: 'hive',
  })

  const aiohaConfig: AiohaConfig = {
    appName: 'VSC Client',
    appDescription: 'VSC Network Client',
    hivesigner: {
      app: 'vsc.client',
      callbackURL: 'https://your-app.com/callback',
      scope: ['login'],
    },
  }

  try {
    // First try Aioha
    await client.loginWithHive({
      hiveName: 'your-hive-username',
      provider: 'aioha',
      aiohaConfig,
    })

    console.log('Successfully logged in with Aioha')

    // You can check which provider is active
    if (client.loginInfo.provider === 'aioha') {
      console.log('Using Aioha authentication')
      console.log('Aioha user:', client.getAiohaUser())
      console.log('Is Aioha logged in:', client.isAiohaLoggedIn())
    }

    return client
  } catch (aiohaError) {
    console.log('Aioha failed, falling back to KeychainSDK')

    try {
      // Fallback to KeychainSDK
      await client.loginWithHive({
        hiveName: 'your-hive-username',
        provider: 'hive_keychain',
      })

      console.log('Successfully logged in with KeychainSDK')
      return client
    } catch (keychainError) {
      console.error('Both authentication methods failed')
      throw new Error(`Aioha failed: ${aiohaError}, KeychainSDK failed: ${keychainError}`)
    }
  }
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
    provider: 'aioha',
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
