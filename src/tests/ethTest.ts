import Crypto from 'crypto'
import PQueue from 'p-queue'
import { vClient, vTransaction } from '..'
import Web3 from 'web3'

const queue = new PQueue({ concurrency: 10 })

const coreSecret = '44ab29dc82f227322cb924cdc66815da8edc9cb0b409f5ced26ced57e6077aa6'
void (async () => {
  for (let x = 0; x < 1; x++) {
    queue.add(async () => {
      let secret

      if (x === 0) {
      } else {
        // secret = Buffer.from(coreSecret, 'hex')
      }
      secret = Crypto.createHash('sha256').update(`${coreSecret}-${x}`).digest().toString('hex')

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
      const account = provider.accountProvider.privateKeyToAccount(`0x${secret}`)
      const addr = account.address

      console.log(addr)
      await client.loginWithETH(provider, addr, `0x${secret}`)
      const tx = new vTransaction()
      tx.setTx({
        op: 'call_contract',
        action: 'testJSON',
        contract_id: 'vs41q9c3ygynfp6kl86qnlaswuwvam748s5lvugns5schg4hte5vhusnx7sg5u8falrt',
        payload: {
          hello: 'World',
        },
      })
      //8 hundred
      for (let x = 0; x < 1; x++) {
        await tx.broadcast(client)
      }
    })
  }
})()
