
export enum TransactionDbType {
    null,
    input,
    output,
    virtual,
    core,
    anchor_ref,
}


export enum TransactionIntent {
    'money.spend' = 'money.spend'
}

export interface SignatureContainer {
    __t: 'vsc-sig',
    sigs: Array<{
        alg: string
        kid: string
        sig: string
    }>
}

/**
 * Offchain transaction format
 */
export interface TransactionContainerV2 {
    __t: 'vsc-tx'
    __v: '0.2'
    headers: {
        payer?: string
        lock_block?: number
        expire_block?: number
        nonce?: number
        required_auths: Array<string>
        //Tuple of transaction intent enum and arguments as querystring
        intents?: null | Array<[TransactionIntent, string]> 
        type: TransactionDbType
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