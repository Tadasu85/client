export enum TransactionIntent {
  'money.spend' = 'money.spend',
}

export interface SignatureContainer {
  __t: 'vsc-sig'
  sigs: Array<{
    alg: string
    kid: string
    sig: string
  }>
}

/**
 * EIP712 Typed Data structure for viem functions
 */
export interface EIP712TypedData {
  types: Record<string, unknown>
  primaryType: string
  domain: Record<string, unknown>
  message: Record<string, unknown>
}

/**
 * Offchain transaction format
 */
export interface TransactionContainerV2 {
  __t: 'vsc-tx'
  __v: '0.2'
  headers: {
    nonce?: number
    required_auths: Array<string>
  }
  tx: {
    contract_id?: string
    action?: string
    op: string
    payload: any // cid of ContractInput, ContractOutput or ContractUpdate and so on..
  }
}

export const TxSchema = {
  type: 'object',
  properties: {
    headers: {
      type: 'object',
      properties: {
        payer: {
          type: 'string',
        },
        lock_block: {
          type: 'number',
        },
        required_auths: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        intents: {
          id: 'http://jsonschema.net/Table1/Data',
          type: 'array',
          items: {
            type: 'array',
            items: [
              {
                id: 'http://jsonschema.net/Table1/Data/0/0',
                type: 'string',
              },
              {
                id: 'http://jsonschema.net/Table1/Data/0/1',
                type: 'string',
              },
            ],
            additionalItems: false,
            required: ['0', '1'],
          },
        },
      },
      additionalProperties: false,
    },
    tx: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
        },
        op: {
          type: 'string',
        },
      },
      required: ['type'],
      additionalProperties: false,
    },
    __v: {
      type: 'string',
      value: '0.2',
    },
    __t: {
      type: 'string',
      enum: ['vsc-tx'],
    },
  },
  required: ['headers', '__v', '__t', 'tx'],
  additionalProperties: false,
}
