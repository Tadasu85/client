import Crypto from 'crypto'
import PQueue from 'p-queue'
import { vClient, vTransaction } from '..'
import Web3 from 'web3'

const queue = new PQueue({ concurrency: 10 })

const coreSecret = '44ab29dc82f227322cb924cdc66815da8edc9cb0b409f5ced26ced57e6077aa6'

// eslint-disable-next-line @typescript-eslint/no-floating-promises
;(async () => {
  try {
    for (let i = 0; i < 1; i++) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      queue.add(async () => {
        const secret = Crypto.createHash('sha256')
          .update(`${coreSecret}-${i}`)
          .digest()
          .toString('hex')

        const client = new vClient({
          api: 'http://localhost:1337',
          loginType: 'offchain',
        })
        // const keyPrivate = new Ed25519Provider(secret)
        // const did = new DID({ provider: keyPrivate, resolver: KeyResolver.getResolver() })
        // await did.authenticate()

        // await client.login(did)
        const provider = new Web3()
        // const act = provider.wallet.add(secret)

        console.log(secret)
        const account = provider.eth.accounts.privateKeyToAccount(`0x${secret}`)
        const addr = account.address

        console.log(addr)
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        await client.loginWithETH(provider, addr, `0x${secret}`)
        const tx = new vTransaction()
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        tx.setTx({
          op: 'call_contract',
          action: 'testJSON',
          contract_id: 'vs41q9c3ygynfp6kl86qnlaswuwvam748s5lvugns5schg4hte5vhusnx7sg5u8falrt',
          payload: {
            hello: 'World',
          },
        })
        //8 hundred
        for (let j = 0; j < 1; j++) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          await tx.broadcast(client)
        }
      })
    }
  } catch (error) {
    console.error('Test failed:', error)
  }
})()
