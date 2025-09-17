export const submitTxQuery = `
query SubmitTx($sig: String!, $tx: String!) {
    submitTransactionV1(sig: $sig, tx: $tx) {
        id
    }
}
`

export const getNonceQuery = `
query GetNonce($keyGroup: String!) {
  getAccountNonce(keyGroup: $keyGroup) {
    nonce
  }
}
`
