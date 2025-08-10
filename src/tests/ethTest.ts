import Crypto from 'crypto'
import PQueue from 'p-queue'
import { vClient, vTransaction } from '..'
import Web3 from 'web3'

const queue = new PQueue({ concurrency: 10 })

const coreSecret = '44ab29dc82f227322cb924cdc66815da8edc9cb0b409f5ced26ced57e6077aa6'
export const runEthTest = async (): Promise<void> => {
  const promises = []
  for (let x = 0; x < 1; x++) {
    const promise = queue.add(async (): Promise<string> => {
      try {
        const secret = Crypto.createHash('sha256')
          .update(`${coreSecret}-${x}`)
          .digest()
          .toString('hex')

        if (x === 0) {
          // Handle case 0 if needed
        } else {
          // secret = Buffer.from(coreSecret, 'hex')
        }

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
        for (let i = 0; i < 1; i++) {
          await tx.broadcast(client)
        }
        return 'success' // Return a value to satisfy the promise
      } catch (error) {
        console.error('Error in queue task:', error)
        throw error // Re-throw to properly handle the error
      }
    })
    promises.push(promise)
  }

  // Wait for all queue tasks to complete
  await Promise.all(promises)
}

// For direct execution
if (require.main === module) {
  runEthTest()
    .then(() => {
      console.log('Test completed successfully')
    })
    .catch((error) => {
      console.error('Error in main async function:', error)
      process.exit(1)
    })
}
