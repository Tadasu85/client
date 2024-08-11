import Axios from 'axios';
import * as dagCBOR from '@ipld/dag-cbor';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';

/**
 * Creates a CID (Content Identifier) for a given object using DAG-CBOR encoding and SHA-256 hashing.
 * 
 * @param {Object} obj - The object to create a CID for.
 * @returns {Promise<CID>} The generated CID.
 */
async function createCID(obj: object): Promise<CID> {
  const bytes = dagCBOR.encode(obj);
  const hash = await sha256.digest(bytes);
  const cid = CID.create(1, dagCBOR.code, hash);
  return cid;
}

/**
 * Converts a hexadecimal string to a Uint8Array.
 * 
 * @param {string} hex - The hexadecimal string to convert.
 * @returns {Uint8Array} The resulting Uint8Array.
 * @throws {Error} If the hex string length is not even.
 */
export function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Hex string must have an even length');
  }
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    array[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return array;
}

/**
 * Converts a transaction and its signature into a JWS (JSON Web Signature) format.
 * 
 * @param {Object} args - The arguments containing the signature and transaction.
 * @param {string} args.sig - The base64Url-encoded signature.
 * @param {string} args.tx - The base64Url-encoded transaction.
 * @returns {Promise<any[]>} The resulting JWS objects.
 */
export async function convertTxJws(args: { sig: string; tx: string }): Promise<any[]> {
  const tx = base64UrlToUint8Array(args.tx);
  const sigDecoded = dagCBOR.decode(base64UrlToUint8Array(args.sig)) as {
    __t: 'vsc-sig';
    sigs: [
      {
        alg: string;
        kid: string;
        sig: Buffer;
      }
    ];
  };

  const cid = await createCID(tx);

  let jwsDagOutput = [];
  for (const sigVal of sigDecoded.sigs) {
    jwsDagOutput.push({
      jws: {
        payload: uint8ArrayToBase64Url(hexToUint8Array(cid.bytes)),
        signatures: [
          {
            protected: uint8ArrayToBase64Url(hexToUint8Array(JSON.stringify({
              alg: sigVal.alg,
              kid: [sigVal.kid, sigVal.kid.split(':')[2]].join('#')
            }))),
            signature: sigVal.sig
          }
        ],
        link: cid
      },
      linkedBlock: tx
    });
  }
  return jwsDagOutput;
}

/**
 * Retrieves the nonce for a given key group from the VSC API.
 * 
 * @param {string} keyGroup - The key group for which to get the nonce.
 * @param {string} api - The API endpoint to call.
 * @returns {Promise<number>} The retrieved nonce.
 */
export async function getNonce(keyGroup: string, api: string): Promise<number> {
  const { data } = await Axios.post(api, {
    query: `
      query SubmitTx($keyGroup: [String]!) {
        getAccountNonce(keyGroup: $keyGroup) {
          nonce
        }
      }
    `,
    variables: {
      keyGroup
    }
  });
  return data.data.getAccountNonce.nonce;
}

/**
 * Converts a JavaScript type to an EIP-712 compatible type.
 * 
 * @param {string} type - The JavaScript type to convert.
 * @returns {string} The EIP-712 type.
 */
function eip712Type(type: string): string {
  if (type === 'number') {
    return 'uint256';
  } else {
    return type;
  }
}

/**
 * Converts a JavaScript object to EIP-712 typed data format.
 * 
 * @param {Object} a - The object to convert.
 * @param {string} [prefix] - Optional prefix for nested objects.
 * @returns {Object} The converted EIP-712 typed data.
 */
function convertJsTypeToTypedData(a: object, prefix?: string): any {
  const types = [];
  const values = [];
  if (typeof a === 'object') {
    for (let key in a) {
      const value = a[key];

      if (typeof value === 'object') {
        if (Array.isArray(value)) {
          values.push({
            name: key,
            // Check first element and determine if array
            type: `${eip712Type(typeof value[0])}[]`
          });
        } else {
          const { values: returnedValues, types: returnedTypes } = convertJsTypeToTypedData(value, `${prefix}.${key}`);

          // Push subtypes
          types.push(...returnedTypes);
          // Push self type
          types.push({
            name: `${prefix}.${key}`,
            definition: returnedValues
          });
          values.push({
            name: key,
            type: `${prefix}.${key}`
          });
        }
      } else {
        values.push({
          name: key,
          type: eip712Type(typeof value)
        });
      }
    }

    return {
      values: values,
      types: types
    };
  } else {
    return {
      values: [
        {
          name: prefix,
          type: eip712Type(typeof a)
        }
      ]
    };
  }
}

/**
 * Converts an object to EIP-712 typed data format.
 * 
 * @param {any} a - The object to convert.
 * @param {string} [type='tx_container_v0'] - The type name for the primary type.
 * @returns {Object} The EIP-712 formatted typed data.
 */
export function convertEIP712Type(a: any, type: string = 'tx_container_v0'): any {
  const typedDataPartial = convertJsTypeToTypedData(a, type);

  let obj = {};
  for (let value of typedDataPartial.types) {
    obj[value.name] = value.definition;
  }

  return {
    EIP712Domain: [
      { name: "name", type: "string" },
    ],
    types: {
      ...obj,
      [type]: typedDataPartial.values
    },
    primaryType: type,
    message: a,
    domain: {
      name: "vsc.network"
    }
  };
}

/**
 * Converts a base64 URL-safe string to a standard base64 string.
 * 
 * @param {string} base64url - The base64 URL-safe string to convert.
 * @returns {string} The standard base64 string.
 */
function base64UrlToBase64(base64url: string): string {
  return base64url.replace(/-/g, '+').replace(/_/g, '/');
}

/**
 * Decodes a base64 string to a Uint8Array.
 * 
 * @param {string} base64 - The base64 string to decode.
 * @returns {Uint8Array} The resulting Uint8Array.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes a base64 URL-safe string to a Uint8Array.
 * 
 * @param {string} base64url - The base64 URL-safe string to decode.
 * @returns {Uint8Array} The resulting Uint8Array.
 */
export function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64UrlToBase64(base64url);
  return base64ToUint8Array(base64);
}

/**
 * Encodes a Uint8Array to a base64 URL-safe string.
 * 
 * @param {Uint8Array} uint8Array - The Uint8Array to encode.
 * @returns {string} The resulting base64 URL-safe string.
 */
export function uint8ArrayToBase64Url(uint8Array: Uint8Array): string {
  // Convert Uint8Array to a binary string
  const binaryString = String.fromCharCode.apply(null, uint8Array);
  // Encode binary string to base64
  const base64 = btoa(binaryString);
  // Convert base64 to base64url by replacing characters
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
