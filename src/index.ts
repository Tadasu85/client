import { DID } from "dids";
import { Client as HiveClient, HivemindAPI, PrivateKey } from '@hiveio/dhive';
import { KeychainSDK } from "keychain-sdk";
import { encodePayload } from 'dag-jose-utils';
import Axios from "axios";
import { submitTxQuery } from "./queries";
import { TransactionContainerV2, TransactionDbType, TxSchema } from "./types";
import { base64UrlToUint8Array, convertEIP712Type, getNonce, hexToUint8Array, uint8ArrayToBase64Url } from "./utils";
import Web3, { Web3BaseWalletAccount } from "web3";
import { hashTypedData, recoverTypedDataAddress, recoverAddress } from 'viem';
import { encode, decode } from '@ipld/dag-cbor';

export { hexToUint8Array } from './utils';

let hiveClient = new HiveClient('https://api.hive.blog');

/**
 * Sets the Hive API endpoint(s) for the client.
 * 
 * @param {string | string[]} api - The API endpoint(s) to set.
 */
export function setHiveAPI(api: string | string[]) {
  hiveClient = new HiveClient(api);
}

/**
 * Class for building and managing transactions.
 */
class TxBuilder {

  /**
   * Sets the payer for the transaction.
   * 
   * @param {string} payer - The payer for the transaction.
   * @returns {TxBuilder} The current instance for chaining.
   */
  setPayer(payer: string): this {
    return this;
  }

  /**
   * Not implemented in VSC network yet
   * @param name 
   * @param options 
   * @returns 
   */
  addIntent(name: string, options?: any): this {
    return this;
  }

  /**
   * Not implemented in VSC network yet
   * @param name 
   * @returns 
   */
  removeIntent(name: string): this {
    return this;
  }


  setOp(): this {

    return this
  }

  asTx() {

  }
}

interface callContractTx {
  op: 'call_contract';
  action: string;
  contract_id: string;
  payload: any;
}

type TransactionDataCommon = callContractTx;

/**
 * Class representing a transaction in the VSC network.
 */
export class vTransaction {
  signature: object | null;
  txData: TransactionDataCommon | null;
  cachedNonce: any;

  constructor() {
    this.txData = null;
  }

  /**
   * Sets the transaction data.
   * 
   * @param {TransactionDataCommon} txData - The transaction data.
   * @returns {Promise<void>}
   */
  async setTx(txData: TransactionDataCommon) {
    // if(!ajv.validate(TxSchema, txData)) {
    //   throw new Error('Invalid TX data')
    // }

    this.txData = txData
  }

  /**
   * Signs the transaction with the provided DID.
   * 
   * @param {DID} did - The DID used to sign the transaction.
   * @returns {Promise<void>}
   */
  async sign(did: DID) {
    // Implementation to be added
  }

  /**
   * Broadcasts the transaction to the VSC network.
   * 
   * @param {vClient} client - The client to use for broadcasting the transaction.
   * @param {object} [options] - Optional parameters for broadcasting.
   * @param {boolean} [options.cacheNonce] - Whether to cache the nonce.
   * @returns {Promise<{id: string | null}>} The result of the broadcast.
   */
  async broadcast(client: vClient, options?: { cacheNonce?: boolean }): Promise<{ id: string | null }> {
    if (!this.txData) {
      throw new Error('No TX specified!');
    }
    if (client.loginInfo.type === 'hive') {
      await hiveClient.broadcast.json({
        id: 'vsc.tx',
        required_auths: [client.hiveName],
        required_posting_auths: [],
        json: JSON.stringify({
          __t: 'vsc-tx',
          __v: '0.1',
          net_id: 'testnet/0bf2e474-6b9e-4165-ad4e-a0d78968d20c',
          headers: {},
          tx: this.txData,
        }),
      }, PrivateKey.fromString(client.secrets.active || client.secrets.posting));
    } else if (client.loginInfo.type === 'offchain') {
      if (!this.cachedNonce) {
        this.cachedNonce = await getNonce(client._did.id, `${client._args.api}/api/v1/graphql`);
      }

      const txData: TransactionContainerV2 = {
        __v: '0.2',
        __t: 'vsc-tx',
        headers: {
          type: TransactionDbType.input,
          nonce: this.cachedNonce,
          required_auths: [client._did.id],
        },
        tx: this.txData
      }
      const types = convertEIP712Type(txData)

      this.cachedNonce = this.cachedNonce + 1


      //Create JWS signed by DID
      const jws = await client._did.createDagJWS(txData)

      //Convert JWS into separate sig & tx data
      const arr = base64UrlToUint8Array(jws.jws.signatures[0].protected)
      const textDecoder = new TextDecoder();
      const decodedString = textDecoder.decode(arr);
      const protectedVal = JSON.parse(decodedString);
      const did = protectedVal.kid.split('#')[0];

      const sigs = [
        {
          alg: protectedVal.alg,
          //Key id copy
          kid: did,
          sig: jws.jws.signatures[0].signature,
        },
      ];
      const sigEncoded = uint8ArrayToBase64Url((await encodePayload({
        __t: 'vsc-sig',
        sigs,
      })).linkedBlock);

      const encodedTx = uint8ArrayToBase64Url(jws.linkedBlock);

      const { data } = await Axios.post(`${client._args.api}/api/v1/graphql`, {
        query: submitTxQuery,
        variables: {
          tx: encodedTx,
          sig: sigEncoded,
        },
      });
      if (data.data) {
        const submitResult = data.data.submitTransactionV1;
        return {
          id: submitResult.id,
        };
      }
    } else if (client.loginInfo.type === 'evm') {
      const did = `did:pkh:eip155:1${client.loginInfo.id}`;
      if (!this.cachedNonce) {
        this.cachedNonce = await getNonce(did, `${client._args.api}/api/v1/graphql`);
      }
      const txData: TransactionContainerV2 = {
        __v: '0.2',
        __t: 'vsc-tx',
        headers: {
          type: TransactionDbType.input,
          nonce: this.cachedNonce,
          required_auths: [`did:pkh:eip155:1:${client.loginInfo.id}`],
        },
        tx: this.txData
      }
      const types = convertEIP712Type(decode(encode(txData)))

      const hash = hashTypedData({
        ...types as any
      })
      const signature = client.loginInfo.wallet.sign(hash).signature

      console.log('recovered address', await recoverTypedDataAddress({
        ...types as any,
        signature
      }), client.web3.eth.accounts.recover(hash, signature), await recoverAddress({ hash, signature: signature as any }))

      // const signature = await client.web3.eth.signTypedData(client.loginInfo.id, {
      //   ...types,
      // } as any)

      const sigs = [
        {
          t: 'eip191',
          //Key id copy
          s: signature
        }
      ]
      const sigEncoded = uint8ArrayToBase64Url((await encodePayload({
        __t: 'vsc-sig',
        sigs,
      })).linkedBlock);
      const txEncoded = uint8ArrayToBase64Url((await encodePayload(txData)).linkedBlock);

      const { data } = await Axios.post(`${client._args.api}/api/v1/graphql`, {
        query: submitTxQuery,
        variables: {
          tx: txEncoded,
          sig: sigEncoded,
        },
      });
      if (data.data) {
        const submitResult = data.data.submitTransactionV1;
        console.log(submitResult)
        return {
          id: submitResult.id,
        };
      }
    }
    return {
      id: null,
    };
  }
}

/**
 * Interface representing the arguments for the VSC client.
 */
export interface vClientArgs {
  /**
   * Determines whether the VSC client interacts with Hive on-chain or off-chain data.
   */
  loginType: 'hive' | 'offchain';

  /**
   * The VSC API endpoint.
   */
  api: string;
}

/**
 * Class representing a VSC client.
 */
export class vClient {
  loggedIn: boolean;
  _args: vClientArgs;
  _did: DID;
  secrets: {
    posting?: string;
    active?: string;
  };
  _keychain: KeychainSDK;
  hiveName: string;
  web3: Web3;
  loginInfo: {
    wallet?: Web3BaseWalletAccount;
    id: any;
    type: any;
  };

  constructor(args: vClientArgs) {
    this.loggedIn = false;
    this._args = args;

    this.loginInfo = {
      id: null,
      type: null,
    };
  }

  /**
   * Placeholder function for calling methods.
   */
  async call() {
    // Implementation to be added
  }

  /**
   * Logs in the client using the provided DID.
   * 
   * @param {DID} did - The DID to use for login.
   * @returns {Promise<void>}
   */
  async login(did: DID) {
    if (this._args.loginType === 'hive') {
      throw new Error('args.loginType must be set to "offchain"');
    }
    if (!did.authenticated) {
      throw new Error('DID Not authenticated! Must run await did.authenticate()');
    }
    this._did = did;
    this.loginInfo.id = did.id;
    this.loginInfo.type = 'offchain';
  }

  /**
   * Logs in the client using Hive credentials.
   * 
   * @param {object} args - The Hive login arguments.
   * @param {string} args.hiveName - The Hive username.
   * @param {'hive_keychain' | 'direct'} args.provider - The provider to use for Hive login.
   * @param {string} [args.posting] - The Hive posting key.
   * @param {string} [args.active] - The Hive active key.
   * @returns {Promise<void>}
   */
  async loginWithHive(args: {
    hiveName: string;
    provider: 'hive_keychain' | 'direct';
    posting?: string;
    active?: string;
  }) {
    if (args.provider === 'hive_keychain') {
      if (!(window as any).hive_keychain) {
        throw new Error('Hive keychain not available');
      }
      this._keychain = new KeychainSDK(window);
      this.loggedIn = true;
    } else if (args.provider === 'direct') {
      if (!args.posting && !args.active) {
        throw new Error('Missing posting or active key');
      }
      this.secrets.posting = args.posting;
      this.secrets.active = args.active;
      this.loggedIn = true;
    } else {
      throw new Error('Invalid Provider');
    }
    this.loginInfo.id = args.hiveName;
    this.loginInfo.type = 'evm';
  }

  /**
   * Logs in the client using Ethereum credentials.
   * 
   * @param {Web3} web3 - The Web3 instance.
   * @param {string} address - The Ethereum address.
   * @param {string} secret - The Ethereum private key.
   * @returns {Promise<void>}
   */
  async loginWithETH(web3: Web3, address: string, secret: string) {
    this.web3 = web3;
    this.loginInfo.id = address;
    this.loginInfo.type = 'evm';
    this.loginInfo.wallet = web3.eth.accountProvider.privateKeyToAccount(secret);
  }

  /**
   * Placeholder function for signing methods.
   */
  async _sign() {
    // Implementation to be added
  }
}