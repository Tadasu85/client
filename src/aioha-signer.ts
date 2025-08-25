import { Aioha, KeyTypes, initAioha, Providers } from '@aioha/aioha'
import { Client as HiveClient } from '@hiveio/dhive'
import { TransactionContainerV2 } from './types'

export interface AiohaConfig {
  appName: string
  appDescription: string
  appIcon?: string
  hivesigner?: {
    app: string
    callbackURL: string
    scope: string[]
    apiURL?: string
  }
}

export class AiohaHiveSigner {
  private aioha: Aioha
  private hiveClient: HiveClient
  private isInitialized: boolean = false

  constructor(config: AiohaConfig) {
    this.hiveClient = new HiveClient('https://api.hive.blog')

    // Initialize Aioha with the provided configuration
    this.aioha = initAioha({
      hiveauth: {
        name: config.appName,
        description: config.appDescription,
        icon: config.appIcon || 'https://avatars.githubusercontent.com/u/133249767',
      },
      hivesigner: config.hivesigner
        ? {
            app: config.hivesigner.app,
            callbackURL: config.hivesigner.callbackURL,
            scope: config.hivesigner.scope,
            apiURL: config.hivesigner.apiURL || 'https://hive-api.web3telekom.xyz/',
          }
        : undefined,
    })
  }

  /**
   * Check if Aioha is available and initialized
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && this.aioha !== null
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.aioha.isLoggedIn()
  }

  /**
   * Get current logged-in user
   */
  getCurrentUser(): string | null {
    return this.aioha.getCurrentUser()
  }

  /**
   * Login with Aioha using specified provider
   */
  async login(
    provider: 'keychain' | 'hivesigner' | 'hiveauth' | 'ledger' | 'peakvault' | 'custom',
    username: string,
    options?: {
      msg?: string
      keyType?: KeyTypes
      displayQr?: (data: string) => void
    },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let aiohaProvider: Providers

      switch (provider) {
        case 'keychain':
          aiohaProvider = Providers.Keychain
          break
        case 'hiveauth':
          aiohaProvider = Providers.HiveAuth
          break
        case 'hivesigner':
          aiohaProvider = Providers.HiveSigner
          break
        case 'ledger':
          aiohaProvider = Providers.Ledger
          break
        case 'peakvault':
          aiohaProvider = Providers.PeakVault
          break
        default:
          aiohaProvider = Providers.Custom
      }

      const login = await this.aioha.login(aiohaProvider, username, {
        msg: options?.msg || 'Sign into VSC Client',
        hiveauth: options?.displayQr
          ? {
              cbWait: (payload: string) => {
                if (options.displayQr) {
                  options.displayQr(payload)
                }
              },
            }
          : undefined,
        keyType: options?.keyType || KeyTypes.Posting,
      })

      if (login.success) {
        this.isInitialized = true
      }

      return login
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Logout from Aioha
   */
  async logout(): Promise<void> {
    await this.aioha.logout()
    this.isInitialized = false
  }

  /**
   * Sign and broadcast a custom JSON transaction
   */
  async signCustomJSON(
    auth: 'active' | 'posting',
    id: string,
    tx: TransactionContainerV2,
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    try {
      const keyType = auth === 'active' ? KeyTypes.Active : KeyTypes.Posting
      const res = await this.aioha.customJSON(keyType, id, tx)

      if (!res.success) {
        // Handle the error case properly
        const errorResult = res as any
        throw new Error((errorResult.error as string) || 'Unknown error occurred')
      }

      return {
        success: true,
        result: (res as any).result,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Sign and broadcast a transfer transaction
   */
  async signTransfer(tx: {
    from: string
    to: string
    amount: string
    memo: string
    token: 'HIVE' | 'HBD'
  }): Promise<{ success: boolean; result?: string; error?: string }> {
    try {
      const transferOp = [
        'transfer',
        {
          from: tx.from,
          to: tx.to,
          amount: tx.amount,
          memo: tx.memo,
        },
      ]

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await this.aioha.signAndBroadcastTx([transferOp] as any, KeyTypes.Active)

      if (res.success) {
        return {
          success: true,
          result: res.result,
        }
      } else {
        // Handle the error case properly
        const errorResult = res as any
        throw new Error(
          `Transfer unsuccessful: ${(errorResult.error as string) || 'Unknown error'}`,
        )
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Set custom Hive API endpoint
   */
  setHiveAPI(api: string | string[]): void {
    this.hiveClient = new HiveClient(api)
  }

  /**
   * Get the underlying Aioha instance for advanced usage
   */
  getAiohaInstance(): Aioha {
    return this.aioha
  }

  /**
   * Listen to account change events
   */
  onAccountChanged(callback: (username: string | null) => void): void {
    this.aioha.on('account_changed', () => {
      callback(this.aioha.getCurrentUser())
    })
  }
}
