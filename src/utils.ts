import Axios from 'axios'
// import DagCbor from 'ipld-dag-cbor'
import * as dagCBOR from '@ipld/dag-cbor'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'

async function createCID(obj) {
  const bytes = dagCBOR.encode(obj)
  const hash = await sha256.digest(bytes)
  const cid = CID.create(1, dagCBOR.code, hash)
  return cid
}

export function hexToUint8Array(hex: string) {
  if (hex.length % 2 !== 0) {
    throw new Error('Hex string must have an even length')
  }
  const array = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    array[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return array
}

export async function convertTxJws(args: { sig: string; tx: string }) {
  const tx = base64UrlToUint8Array(args.tx as string)
  const sigDecoded = dagCBOR.decode(base64UrlToUint8Array(args.sig as string)) as {
    __t: 'vsc-sig'
    sigs: [
      {
        alg: string
        kid: string
        sig: Buffer
      },
    ]
  }

  const cid = await createCID(tx)

  const jwsDagOutput = []
  for (const sigVal of sigDecoded.sigs) {
    jwsDagOutput.push({
      jws: {
        payload: uint8ArrayToBase64Url(cid.bytes),
        signatures: [
          {
            protected: uint8ArrayToBase64Url(
              hexToUint8Array(
                JSON.stringify({
                  alg: sigVal.alg,
                  kid: [sigVal.kid, sigVal.kid.split(':')[2]].join('#'),
                }),
              ),
            ),
            signature: sigVal.sig,
          },
        ],
        link: cid,
      },
      linkedBlock: tx,
    })
  }
  return jwsDagOutput
}

export async function getNonce(keyGroup: string, api: string) {
  const { data } = await Axios.post(api as string, {
    query: `
            query SubmitTx($keyGroup: String!) {
                getAccountNonce(keyGroup: $keyGroup) {
                    nonce
                }
            }
        `,
    variables: {
      keyGroup,
    },
  })
  return data.data.getAccountNonce.nonce
}

/**
 * Converts Number to uint256 or other type where applicable
 * @param type
 * @returns
 */
function eip712Type(type: string) {
  if (type === 'number') {
    return 'uint256'
  } else {
    return type
  }
}

function convertJsTypeToTypedData(
  a: Record<string, unknown>,
  prefix?: string,
): {
  values: Array<{ name: string; type: string }>
  types: Array<{ name: string; definition: Array<{ name: string; type: string }> }>
} {
  const types = []
  const values = []
  if (typeof a === 'object') {
    for (const key in a) {
      const value = a[key]

      console.log(typeof value, 'object')
      if (typeof value === 'object') {
        if (Array.isArray(value)) {
          values.push({
            name: key,
            //Check first element and determine if array
            type: `${eip712Type(typeof value[0])}[]`,
          })
        } else {
          const { values: returnedValues, types: returnedTypes } = convertJsTypeToTypedData(
            value as Record<string, unknown>,
            `${prefix}.${key}`,
          )

          console.log(prefix, key, values, types)
          //Push subtypes
          types.push(...(returnedTypes as Array<unknown>))
          //Push self type
          types.push({
            name: `${prefix}.${key}`,
            definition: returnedValues,
          })
          values.push({
            name: key,
            type: `${prefix}.${key}`,
          })
        }
      } else {
        values.push({
          name: key,
          type: eip712Type(typeof value),
        })
      }
    }

    return {
      values: values,
      types: types,
    }
  } else {
    return {
      values: [
        {
          name: prefix,
          type: eip712Type(typeof a),
        },
      ],
      types: [],
    }
  }
}

export function convertEIP712Type(
  a: Record<string, unknown>,
  type = 'tx_container_v0',
  networkName = 'vsc-mainnet',
) {
  const typedDataPartial = convertJsTypeToTypedData(a, type)

  const obj: Record<string, unknown> = {}
  for (const value of typedDataPartial.types) {
    obj[value.name] = value.definition
  }

  const out = {
    EIP712Domain: [{ name: 'name', type: 'string' }],
    types: {
      ...obj,
      [type]: typedDataPartial.values,
    },
    primaryType: type,
    message: a,
    domain: {
      name: networkName,
    },
  }
  return out
}

function base64UrlToBase64(base64url: string): string {
  return base64url.replace(/-/g, '+').replace(/_/g, '/')
}

// Function to decode a base64 string to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

// Combining the functions to decode a base64 URL-safe string to Uint8Array
export function base64UrlToUint8Array(base64url: string) {
  const base64 = base64UrlToBase64(base64url)
  return base64ToUint8Array(base64)
}

export function uint8ArrayToBase64Url(uint8Array: Uint8Array) {
  // Convert Uint8Array to a binary string
  const binaryString = String.fromCharCode.apply(null, uint8Array as unknown as number[])
  // Encode binary string to base64
  const base64 = btoa(binaryString as string)
  // Convert base64 to base64url by replacing characters
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
