import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UiWalletAccount, useWalletUiSigner, ellipsify } from '@wallet-ui/react'
import { useSolanaClient } from "@gillsdk/react";
import type { Address } from 'gill'
import { useVaultProgram } from '@/hooks/useVaultProgram'
import { toast } from 'sonner'
import { toastTx } from '@/components/toast-tx'
import { AppExplorerLink } from '@/components/app-explorer-link'
import { getProgramDerivedAddress, getAddressEncoder, address as createAddress } from 'gill'

const LAMPORTS_PER_SOL = 1_000_000_000;
const PROGRAM_ID = createAddress("ArXdRsT2zBK98eX6yMh2qMTPGgsLnG4hrXbX95ZjqeZ3")



export function VaultExample({ account }: { account: UiWalletAccount }) {
  const { rpc } = useSolanaClient();
  const signer = useWalletUiSigner({ account })
  const [vaultStateAddress, setVaultStateAddress] = useState<Address | null>(null)
  const [vaultAddress, setVaultAddress] = useState<Address | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  const { useProgramMutation, useProgramQuery } = useVaultProgram()

  useEffect(() => {
    async function derivePDAs() {
      if (!signer?.address) return;
      
      const [vaultState] = await getProgramDerivedAddress({
        programAddress: PROGRAM_ID,
        seeds: ["state",
          getAddressEncoder().encode(createAddress(signer.address))
        ]
      })
      
      const [vault] = await getProgramDerivedAddress({
        programAddress: PROGRAM_ID,
        seeds: ["vault",
          getAddressEncoder().encode(createAddress(signer.address)),
          getAddressEncoder().encode(createAddress(vaultState))
        ]
      })

      console.log('vaultState', vaultState);
      console.log('vault', vault);
      
      setVaultStateAddress(vaultState)
      setVaultAddress(vault)
    }
    
    derivePDAs()
  }, [signer?.address])

  const initializeMutation = useProgramMutation({
    instruction: 'initialize',
    onMutate: (data) => {
      console.log('initializeMutation data:', data)
      setVaultAddress(data.vault);
    },
    onSuccess: (signature) => {
      console.log('Initialize successful:', signature)
      toastTx(signature)
    },
    onError: (error) => {
      setVaultAddress(null);
      toast.error(`Initialize failed: ${error.message}`)
    },
  })

  const depositMutation = useProgramMutation({
    instruction: 'deposit',
    defaultSigners: signer,
    onSuccess: (signature) => {
      console.log('Deposit successful:', signature)
      toastTx(signature)
      setDepositAmount('')
    },
    onError: (error) => {
      toast.error(`Deposit failed: ${error.message}`)
    },
  })

  const withdrawMutation = useProgramMutation({
    instruction: 'withdraw',
    defaultSigners: signer,
    onSuccess: (signature) => {
      console.log('Withdraw successful:', signature)
      toastTx(signature)
      setWithdrawAmount('')
    },
    onError: (error) => {
      toast.error(`Withdraw failed: ${error.message}`)
    },
  })

  const closeMutation = useProgramMutation({
    instruction: 'close',
    defaultSigners: signer,
    onSuccess: (signature) => {
      console.log('Close successful:', signature)
      toastTx(signature)
      setVaultAddress(null)
    },
    onError: (error) => {
      toast.error(`Close failed: ${error.message}`)
    },
  })

  const vaultStateQuery = useProgramQuery({
    account: 'vaultState',
    address: vaultStateAddress!,
    rpc,
    enabled: !!vaultStateAddress,
  })

  const [vaultBalance, setVaultBalance] = useState<bigint>(0n)

  useEffect(() => {
    async function fetchBalance() {
      if (!vaultAddress) return
      try {
        const accountInfo = await rpc.getAccountInfo(vaultAddress, { encoding: 'base64' }).send()
        if (accountInfo.value) {
          setVaultBalance(BigInt(accountInfo.value.lamports))
        }
      } catch (error) {
        console.error('Error fetching vault balance:', error)
      }
    }
    
    if (vaultStateQuery.data) {
      fetchBalance()
    }
  }, [vaultAddress, rpc, vaultStateQuery.data])

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    
    depositMutation.mutate({
      user: signer,
      vault: vaultAddress!,
      vaultState: vaultStateAddress!,
      amount: Math.floor(amount * LAMPORTS_PER_SOL),
    })
  }

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    
    withdrawMutation.mutate({
      user: signer,
      vault: vaultAddress!,
      vaultState: vaultStateAddress!,
      amount: Math.floor(amount * LAMPORTS_PER_SOL),
    })
  }

  const isInitialized = vaultStateQuery.data && !vaultStateQuery.isError

  if (!isInitialized) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Create a Vault with createProgramHook</h2>
        <p className="text-sm text-gray-600">
          Initialize a vault to securely store SOL. The vault uses PDAs (Program Derived Addresses) for security.
        </p>
        {vaultStateAddress && vaultAddress && (
          <div className="text-xs text-gray-500 space-y-1">
            <p>Vault State: {ellipsify(vaultStateAddress)}</p>
            <p>Vault: {ellipsify(vaultAddress!)}</p>
          </div>
        )}
        <Button 
          onClick={() => {
            console.log("Signer object:", signer);
            console.log("Has address?", 'address' in signer);
            initializeMutation.mutate({
              user: signer,
              vaultState: vaultStateAddress!,
              vault: vaultAddress!,
              signer: signer,
            })
          }} 
          disabled={initializeMutation.isPending || !vaultStateAddress}
        >
          {initializeMutation.isPending ? 'Initializing...' : 'Initialize Vault'}
        </Button>
        {initializeMutation.error && (
          <p className="text-sm text-red-600">
            {initializeMutation.error?.message}
          </p>
        )}
      </div>
    )
  }

  const balanceInSol = (Number(vaultBalance) / LAMPORTS_PER_SOL).toFixed(4)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">
          Vault using createProgramHook
        </h2>
        <div className="space-y-1 text-xs text-gray-500">
          <AppExplorerLink address={vaultStateAddress!} label={`State: ${ellipsify(vaultStateAddress!)}`} />
          <AppExplorerLink address={vaultAddress!} label={`Vault: ${ellipsify(vaultAddress!)}`} />
        </div>
      </div>

      {/* Balance Display */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-8 text-center">
        {vaultStateQuery.isLoading && <p className="text-gray-500">Loading vault...</p>}
        {/* {vaultStateQuery.isError && vaultStateQuery.error && (
          <p className="text-red-600 text-sm">{vaultStateQuery.error.message}</p>
        )} */}
        {vaultStateQuery.data && (
          <div>
            <p className="text-sm text-gray-600 mb-1">Vault Balance</p>
            <div className="text-5xl font-bold text-purple-900">{balanceInSol} SOL</div>
            <div className="text-xs text-gray-500 mt-3 space-y-1">
              <p>Owner: {ellipsify(account.address)}</p>
              <p>Vault Bump: {vaultStateQuery.data.data.vaultBump}</p>
              <p>State Bump: {vaultStateQuery.data.data.stateBump}</p>
            </div>
          </div>
        )}
      </div>

      {/* Deposit Section */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Deposit SOL</h3>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Amount in SOL (e.g., 0.1)"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            step="0.01"
            min="0"
            disabled={depositMutation.isPending}
          />
          <Button
            onClick={handleDeposit}
            disabled={depositMutation.isPending || !depositAmount}
            className="whitespace-nowrap"
          >
            {depositMutation.isPending ? 'Depositing...' : 'Deposit'}
          </Button>
        </div>
      </div>

      {/* Withdraw Section */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Withdraw SOL</h3>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Amount in SOL (e.g., 0.1)"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            step="0.01"
            min="0"
            disabled={withdrawMutation.isPending}
          />
          <Button
            onClick={handleWithdraw}
            disabled={withdrawMutation.isPending || !withdrawAmount}
            variant="secondary"
            className="whitespace-nowrap"
          >
            {withdrawMutation.isPending ? 'Withdrawing...' : 'Withdraw'}
          </Button>
        </div>
        <Button
          onClick={() => {
            setWithdrawAmount(balanceInSol)
          }}
          variant="outline"
          size="sm"
          disabled={withdrawMutation.isPending}
        >
          Withdraw All
        </Button>
      </div>

      {/* Close Vault Section */}
      <div className="pt-4 border-t">
        <Button
          onClick={() => closeMutation.mutate({
            signer: signer,
            vaultState: vaultStateAddress!,
            vault: vaultAddress!,
          })}
          disabled={closeMutation.isPending}
          variant="destructive"
        >
          {closeMutation.isPending ? 'Closing...' : 'Close Vault'}
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          Closing the vault will return all remaining SOL to your wallet and delete the accounts.
        </p>
      </div>

      {/* Error Messages */}
      {(depositMutation.error || withdrawMutation.error || closeMutation.error) && (
        <div className="bg-red-50 text-red-800 p-3 rounded text-sm">
          {depositMutation.error?.message || 
           withdrawMutation.error?.message || 
           closeMutation.error?.message}
        </div>
      )}
    </div>  
  )
}
