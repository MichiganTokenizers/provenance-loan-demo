import axios from 'axios'

export type PrepareAssetResponse = {
  ok: boolean
  messages: Array<{ typeUrl: string; value: any }>
  fee: { amount: Array<{ denom: string; amount: string }>; gas: string }
  memo: string
  chainId: string
  rpc: string
  assetClassId: string
  assetId: string
  scopeId: string
  sessionId: string
  recordId: string
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

export async function prepareLoanAssetForKeplr(params: {
  token: string
  loanId: string
  borrowerAddress: string
  metadata?: Record<string, any>
}): Promise<PrepareAssetResponse> {
  const resp = await axios.post(
    `${API_BASE}/blockchain/keplr/prepare-asset`,
    {
      loanId: params.loanId,
      borrowerAddress: params.borrowerAddress,
      metadata: params.metadata || {}
    },
    {
      headers: { Authorization: `Bearer ${params.token}` }
    }
  )
  return resp.data.data as PrepareAssetResponse
}

export async function confirmBroadcastedTx(params: {
  token: string
  loanId: string
  txHash: string
}) {
  const resp = await axios.post(
    `${API_BASE}/blockchain/keplr/confirm`,
    { loanId: params.loanId, txHash: params.txHash },
    { headers: { Authorization: `Bearer ${params.token}` } }
  )
  return resp.data.data
}

export async function signAndBroadcastWithKeplr(
  chainId: string,
  rpc: string,
  messages: Array<{ typeUrl: string; value: any }>,
  fee: { amount: Array<{ denom: string; amount: string }>; gas: string },
  memo: string
): Promise<string> {
  // Ensure Keplr is installed
  if (!window.keplr || !window.getOfflineSignerAuto) {
    throw new Error('Keplr not available')
  }

  // Suggest chain if needed (for testnet defaults)
  // In production, pre-configure chain via Keplr extension or app settings
  await window.keplr.enable(chainId)
  const signer = await window.getOfflineSignerAuto(chainId)
  const accounts = await signer.getAccounts()
  const fromAddress = accounts[0]?.address
  if (!fromAddress) throw new Error('No Keplr account found')

  const { SigningStargateClient } = await import('@cosmjs/stargate')
  const { Registry } = await import('@cosmjs/proto-signing')

  // Use default registry; custom type registrations can be added if needed
  const registry = new Registry()
  const client = await SigningStargateClient.connectWithSigner(rpc, signer, { registry })

  const encodedMsgs = messages.map((m) => ({ typeUrl: m.typeUrl, value: m.value }))
  const result = await client.signAndBroadcast(fromAddress, encodedMsgs, fee, memo)
  if (result.code && result.code !== 0) {
    throw new Error(`Broadcast failed: ${result.rawLog}`)
  }
  return result.transactionHash
}

declare global {
  interface Window {
    keplr?: any
    getOfflineSignerAuto?: (chainId: string) => Promise<any>
  }
}


