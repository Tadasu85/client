import { Ed25519Provider } from 'key-did-provider-ed25519'
import { DID } from 'dids'
import KeyResolver from 'key-did-resolver'
import { hexToUint8Array, vClient, vTransaction } from '..'
export const runTestBench = async (): Promise<string> => {
  try {
    // All async operations are properly awaited
    const client = new vClient({
      api: 'http://127.0.0.1:1337',
      loginType: 'offchain',
    })
    const secret = hexToUint8Array(
      '44ab29dc82f227322cb924cdc66815da8edc9cb0b409f5ced26ced57e6077aa6',
    )
    const keyPrivate = new Ed25519Provider(secret)
    const did = new DID({ provider: keyPrivate, resolver: KeyResolver.getResolver() })
    await did.authenticate()

    await client.login(did)
    const tx = new vTransaction()
    tx.setTx({
      op: 'call_contract',
      action: 'testJSON',
      contract_id: 'vs41q9c3ygq38nldzh209g5aw0knllm45px5ycrwx5sv0jxddmd9ve4r0z6frcvv9h2j',
      payload: {
        hello: 'World',
      },
    })
    await tx.broadcast(client)
    return 'success' // Return a value to satisfy the promise
  } catch (error) {
    console.error('Error in testBench:', error)
    throw error // Re-throw to properly handle the error
  }
}

// For direct execution
if (require.main === module) {
  runTestBench()
    .then(() => {
      console.log('Test completed successfully')
    })
    .catch((error) => {
      console.error('Error in main async function:', error)
      process.exit(1)
    })
}
