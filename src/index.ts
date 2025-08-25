import { DID } from 'dids'
import { Client as HiveClient, PrivateKey } from '@hiveio/dhive'
import { KeychainSDK } from 'keychain-sdk'
import { encodePayload } from 'dag-jose-utils'
import Axios from 'axios'
import { submitTxQuery } from './queries'
import { TransactionContainerV2, TransactionDbType, EIP712TypedData } from './types'
import { base64UrlToUint8Array, convertEIP712Type, getNonce, uint8ArrayToBase64Url } from './utils'
import Web3, { Web3BaseWalletAccount } from 'web3'
import { hashTypedData, recoverTypedDataAddress, recoverAddress } from 'viem'
import { encode, decode } from '@ipld/dag-cbor'
import { AiohaHiveSigner, type AiohaConfig } from './aioha-signer'

export { hexToUint8Array } from './utils'
export { AiohaHiveSigner, type AiohaConfig } from './aioha-signer'

let hiveClient = new HiveClient('https://api.hive.blog')

export function setHiveAPI(api: string | string[]) {
  hiveClient = new HiveClient(api)
}

class TxBuilder {
  setPayer(payer: string): this {
    return this
  }

  /**
   * Not implemented in VSC network yet
   * @param name
   * @param options
   * @returns
   */
  addIntent(name: string, options?: any): this {
    return this
  }

  /**
   * Not implemented in VSC network yet
   * @param name
   * @returns
   */
  removeIntent(name: string): this {
    return this
  }

  setOp(): this {
    return this
  }

  asTx() {}
}

interface callContractTx {
  op: 'call_contract'
  action: string
  contract_id: string
  payload: any
}

type TransactionDataCommon = callContractTx

export class vTransaction {
  signature: Record<string, unknown> | null
  txData: TransactionDataCommon | null
  cachedNonce: any
  constructor() {
    this.txData = null
  }

  async setTx(txData: TransactionDataCommon) {
    // if(!ajv.validate(TxSchema, txData)) {
    //   throw new Error('Invalid TX data')
    // }

    this.txData = txData
  }

  async sign(did: DID) {}

  async broadcast(
    client: vClient,
    options?: { cacheNonce?: boolean },
  ): Promise<{ id: string | null }> {
    if (!this.txData) {
      throw new Error('No TX specified!')
    }
    if (client.loginInfo.type === 'hive') {
      if (client.loginInfo.provider === 'aioha' && client._aioha) {
        // Use Aioha for signing and broadcasting
        const txData: TransactionContainerV2 = {
          __v: '0.2',
          __t: 'vsc-tx',
          headers: {
            type: TransactionDbType.input,
            required_auths: [client.hiveName],
          },
          tx: this.txData,
        }

        const result = await client._aioha.signCustomJSON('posting', 'vsc-tx', txData)
        if (!result.success) {
          throw new Error(`Aioha signing failed: ${result.error}`)
        }

        return {
          id: result.result || null,
        }
      } else if (
        client.loginInfo.provider === 'keychain' ||
        client.loginInfo.provider === 'direct'
      ) {
        // Use traditional KeychainSDK or direct key approach
        await hiveClient.broadcast.json(
          {
            id: 'vsc-tx',
            required_auths: [client.hiveName],
            required_posting_auths: [],
            json: JSON.stringify({
              __t: 'vsc-tx',
              __v: '0.1',
              net_id: 'vsc-mainnet',
              headers: {},
              tx: this.txData,
            }),
          },
          PrivateKey.fromString(client.secrets.active || client.secrets.posting),
        )
      } else {
        throw new Error('No valid Hive authentication method available')
      }
    } else if (client.loginInfo.type === 'offchain') {
      if (!this.cachedNonce) {
        this.cachedNonce = await getNonce(client._did.id, `${client._args.api}/api/v1/graphql`)
      }

      const txData: TransactionContainerV2 = {
        __v: '0.2',
        __t: 'vsc-tx',
        headers: {
          type: TransactionDbType.input,
          nonce: this.cachedNonce,
          required_auths: [client._did.id],
        },
        tx: this.txData,
      }
      const types = convertEIP712Type(txData as unknown as Record<string, unknown>)

      this.cachedNonce = this.cachedNonce + 1

      //Create JWS signed by DID
      const jws = await client._did.createDagJWS(txData)

      //Convert JWS into separate sig & tx data
      const arr = base64UrlToUint8Array(jws.jws.signatures[0].protected)
      const textDecoder = new TextDecoder()
      const decodedString = textDecoder.decode(arr)
      const protectedVal = JSON.parse(decodedString)
      const did = protectedVal.kid.split('#')[0]

      const sigs = [
        {
          alg: protectedVal.alg,
          //Key id copy
          kid: did,
          sig: jws.jws.signatures[0].signature,
        },
      ]
      const sigEncoded = uint8ArrayToBase64Url(
        (
          await encodePayload({
            __t: 'vsc-sig',
            sigs,
          })
        ).linkedBlock,
      )

      const encodedTx = uint8ArrayToBase64Url(jws.linkedBlock)
      // const convertJws = await convertTxJws({
      //   sig: sigEncoded,
      //   tx: encodedTx
      // });

      // const verifResult = await client._did.verifyJWS(convertJws.jws as any)
      const { data } = await Axios.post(`${client._args.api}/api/v1/graphql`, {
        query: submitTxQuery,
        variables: {
          tx: encodedTx,
          sig: sigEncoded,
        },
      })
      console.log(data)
      if (data.data) {
        const submitResult = data.data.submitTransactionV1
        return {
          id: submitResult.id,
        }
      }
    } else if (client.loginInfo.type === 'evm') {
      const did = `did:pkh:eip155:1${client.loginInfo.id}`
      if (!this.cachedNonce) {
        this.cachedNonce = await getNonce(did, `${client._args.api}/api/v1/graphql`)
      }
      const txData: TransactionContainerV2 = {
        __v: '0.2',
        __t: 'vsc-tx',
        headers: {
          type: TransactionDbType.input,
          nonce: this.cachedNonce,
          required_auths: [`did:pkh:eip155:1:${client.loginInfo.id}`],
        },
        tx: this.txData,
      }
      const types = convertEIP712Type(decode(encode(txData)) as unknown as Record<string, unknown>)

      console.log(types)
      const hash = hashTypedData(types as EIP712TypedData)
      const signature = client.loginInfo.wallet.sign(hash).signature

      console.log(
        'recovered address',
        await recoverTypedDataAddress({
          ...(types as EIP712TypedData),
          signature: signature as `0x${string}`,
        }),
        client.web3.eth.accounts.recover(hash, signature),
        await recoverAddress({ hash, signature: signature as any }),
      )

      // const signature = await client.web3.eth.signTypedData(client.loginInfo.id, {
      //   ...types,
      // } as any)

      const sigs = [
        {
          t: 'eip191',
          //Key id copy
          s: signature,
        },
      ]
      console.log(txData, sigs)
      const sigEncoded = uint8ArrayToBase64Url(
        (
          await encodePayload({
            __t: 'vsc-sig',
            sigs,
          })
        ).linkedBlock,
      )
      const txEncoded = uint8ArrayToBase64Url((await encodePayload(txData)).linkedBlock)

      const { data } = await Axios.post(`${client._args.api}/api/v1/graphql`, {
        query: submitTxQuery,
        variables: {
          tx: txEncoded,
          sig: sigEncoded,
        },
      })
      console.log(data)
      if (data.data) {
        const submitResult = data.data.submitTransactionV1
        console.log(submitResult)
        return {
          id: submitResult.id,
        }
      }
    }
    return {
      id: null,
    }
  }
}

export interface vClientArgs {
  /**
   * Decide whether the VSC client should interact with hive on chain or offchain data.
   */
  loginType: 'hive' | 'offchain'

  /**
   * VSC API
   */
  api: string
}

export class vClient {
  loggedIn: boolean
  _args: vClientArgs
  _did: DID
  secrets: {
    posting?: string
    active?: string
  }
  _keychain: KeychainSDK | null
  _aioha: AiohaHiveSigner | null
  hiveName: string
  web3: Web3
  loginInfo: {
    wallet?: Web3BaseWalletAccount
    id: any
    type: any
    provider?: 'keychain' | 'aioha' | 'direct'
  }

  constructor(args: vClientArgs) {
    this.loggedIn = false
    this._args = args
    this.secrets = {}
    this._keychain = null
    this._aioha = null

    this.loginInfo = {
      id: null,
      type: null,
    }
  }

  async call() {}

  async login(did: DID) {
    if (this._args.loginType === 'hive') {
      throw new Error('args.loginType must be set to "offchain"')
    }
    if (!did.authenticated) {
      throw new Error('DID Not authenticated! Must run await did.authenticate()')
    }
    this._did = did
    this.loginInfo.id = did.id
    this.loginInfo.type = 'offchain'
  }

  async loginWithHive(args: {
    hiveName: string
    provider: 'hive_keychain' | 'aioha' | 'direct'
    posting?: string
    active?: string
    aiohaConfig?: AiohaConfig
  }) {
    if (args.provider === 'hive_keychain') {
      if (!(window as any).hive_keychain) {
        throw new Error('Hive keychain not available')
      }
      this._keychain = new KeychainSDK(window)
      this.loginInfo.provider = 'keychain'
      this.loggedIn = true
    } else if (args.provider === 'aioha') {
      if (!args.aiohaConfig) {
        throw new Error('Aioha configuration is required when using Aioha provider')
      }
      this._aioha = new AiohaHiveSigner(args.aiohaConfig)
      this.loginInfo.provider = 'aioha'
      this.loggedIn = true
    } else if (args.provider === 'direct') {
      if (!args.posting && !args.active) {
        throw new Error('Missing posting or active key')
      }
      this.secrets.posting = args.posting
      this.secrets.active = args.active
      this.loginInfo.provider = 'direct'
      this.loggedIn = true
    } else {
      throw new Error('Invalid Provider')
    }
    this.loginInfo.id = args.hiveName
    this.loginInfo.type = 'hive'
  }

  async loginWithETH(web3: Web3, address, secret) {
    this.web3 = web3
    this.loginInfo.id = address
    this.loginInfo.type = 'evm'
    this.loginInfo.wallet = web3.eth.accounts.privateKeyToAccount(secret as string)
    this.loggedIn = true
  }

  async _sign() {}

  /**
   * Get the Aioha instance if available
   */
  getAioha(): AiohaHiveSigner | null {
    return this._aioha
  }

  /**
   * Check if Aioha is available and logged in
   */
  isAiohaLoggedIn(): boolean {
    return this._aioha?.isLoggedIn() || false
  }

  /**
   * Get current Aioha user
   */
  getAiohaUser(): string | null {
    return this._aioha?.getCurrentUser() || null
  }

  /**
   * Set custom Hive API for Aioha
   */
  setAiohaHiveAPI(api: string | string[]): void {
    if (this._aioha) {
      this._aioha.setHiveAPI(api)
    }
  }

  /**
   * Listen to Aioha account changes
   */
  onAiohaAccountChanged(callback: (username: string | null) => void): void {
    if (this._aioha) {
      this._aioha.onAccountChanged(callback)
    }
  }
}
