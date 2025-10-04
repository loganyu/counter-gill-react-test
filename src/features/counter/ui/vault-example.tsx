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
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { getProgramDerivedAddress, getAddressEncoder, generateKeyPairSigner, address as createAddress} from 'gill'

import {
  getAssociatedTokenAccountAddress,
  TOKEN_PROGRAM_ADDRESS,
} from "gill/programs";


const TOKEN_MINT = createAddress("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")

const PROGRAM_ID = createAddress("4trU6PxX9bq7yAkFaCr4SmfbzddSEbbnufuZ8CjpBy1R")

export function VaultExample({ account }: { account: UiWalletAccount }) {
  const { rpc } = useSolanaClient();
  const signer = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()

  // State for the PDAs
  const [vaultAddress, setVaultAddress] = useState<Address | null>(null);
  const [vaultAuthorityAddress, setVaultAuthorityAddress] = useState<Address | null>(null);

  // State for bumps
  const [vaultBump, setVaultBump] = useState<number | null>(null);
  const [authorityBump, setAuthorityBump] = useState<number | null>(null);
  
  // UI state
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [vaultBalance, setVaultBalance] = useState<number>(0);


  const { useProgramMutation, useProgramQuery } = useVaultProgram()

  useEffect(() => {
    async function derivePDAs() {
      if (!signer?.address) return;
      
      const [derivedVaultAddress, derivedVaultBump] = await getProgramDerivedAddress({
        programAddress: PROGRAM_ID,
        seeds: [
          new TextEncoder().encode("vault"),
          getAddressEncoder().encode(createAddress(TOKEN_MINT)),
          getAddressEncoder().encode(createAddress(signer.address))
        ]
      });
      
      const [derivedAuthorityAddress, derivedAuthorityBump] = await getProgramDerivedAddress({
        programAddress: PROGRAM_ID,
        seeds: [
          new TextEncoder().encode("authority"),
          getAddressEncoder().encode(derivedVaultAddress)
        ]
      });

      setVaultAddress(derivedVaultAddress);
      setVaultBump(derivedVaultBump);
      setVaultAuthorityAddress(derivedAuthorityAddress);
      setAuthorityBump(derivedAuthorityBump);
    }
    
    derivePDAs()
  }, [signer?.address])

  useEffect(() => {
    async function fetchMintInfo() {
      try {
        const mintInfo = await rpc.getAccountInfo(TOKEN_MINT).send();
        if (mintInfo.value) {
            // A simple way to get decimals from raw mint data (at byte 44)
            // const decimals = mintInfo.value.data[44];
            // setTokenDecimals(Number(decimals));
        }
      } catch (error) {
        console.error("Failed to fetch token mint info:", error);
      }
    }
    fetchMintInfo();
  }, [rpc]);

  const initializeVaultMutation = useProgramMutation({
    instruction: 'initializeVault',
    onSuccess: (signature) => {
      console.log('Initialize vault successful:', signature)
      toastTx(signature)
    },
    onError: (error) => {
      toast.error(`Initialize failed: ${error.message}`)
    },
  })


  const depositMutation = useProgramMutation({
    instruction: 'deposit',
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
    onSuccess: (signature) => {
      console.log('Withdraw successful:', signature)
      toastTx(signature)
      setWithdrawAmount('')
    },
    onError: (error) => {
      toast.error(`Withdraw failed: ${error.message}`)
    },
  })

  // const closeMutation = useProgramMutation({
  //   instruction: 'close',
  //   onSuccess: (signature) => {
  //     console.log('Close successful:', signature)
  //     toastTx(signature)
  //     setVaultAddress(null)
  //   },
  //   onError: (error) => {
  //     toast.error(`Close failed: ${error.message}`)
  //   },
  // })

  const vaultQuery = useProgramQuery({
    account: 'vault',
    address: vaultAddress!,
    enabled: !!vaultAddress,
    rpc
  })

  useEffect(() => {
    async function fetchBalance() {
      if (!vaultQuery.data?.data.tokenAccount) return
      
      try {
        const balance = await rpc.getTokenAccountBalance(vaultQuery.data.data.tokenAccount).send();
        const amountAsNumber = Number(balance.value.amount);
        const divisor = 10 ** balance.value.decimals;
        const readableBalance = amountAsNumber / divisor;
        setVaultBalance(readableBalance);
        
      } catch (error) {
        console.error('Error fetching token balance:', error)
      }
    }
    
    fetchBalance()
  }, [vaultQuery.data, rpc])

  const handleInitialize = async () => {
    if (!signer || !vaultAddress || vaultBump === null || !vaultAuthorityAddress || authorityBump === null) {
        return;
    }
    // The `initializeVault` instruction creates a new token account.
    // This new account needs to sign the transaction to authorize its own creation.
    const newTokenAccount = await generateKeyPairSigner();

    initializeVaultMutation.mutate({
        params: {
          vault: vaultAddress,
          vaultAuthority: vaultAuthorityAddress,
          tokenAccount: newTokenAccount,
          mint: TOKEN_MINT,
          payer: signer,
          bump: vaultBump,
          authorityBump: authorityBump,
        },
        signer,
        signAndSend,
        rpc,
    });
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const ata = await getAssociatedTokenAccountAddress(TOKEN_MINT, signer.address, TOKEN_PROGRAM_ADDRESS);

    const params = {
      vault: vaultAddress!,
      vaultAuthority: vaultAuthorityAddress!,
      mint: TOKEN_MINT,
      userTokenAccount: ata,
      vaultTokenAccount: vaultQuery.data!.data.tokenAccount,
      authority: signer,
      amount: BigInt(amount * (10 ** 6)),
    }

    depositMutation.mutate({
      params,
      signer,
      signAndSend,
      rpc,
    })
  }

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const ata = await getAssociatedTokenAccountAddress(TOKEN_MINT, signer.address, TOKEN_PROGRAM_ADDRESS);
    
    withdrawMutation.mutate({
      params: {
        vault: vaultAddress!,
        vaultAuthority: vaultAuthorityAddress!,
        userTokenAccount: ata,
        mint: TOKEN_MINT,
        vaultTokenAccount: vaultQuery.data!.data.tokenAccount,
        authority: signer,
        amount: BigInt(amount * (10 ** 6)),
      },
      signer,
      signAndSend,
      rpc,
    })
  }

  const isInitialized = vaultQuery.data && !vaultQuery.isError

  if (!isInitialized) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Create a Vault with createProgramHook</h2>
        <p className="text-sm text-gray-600">
          Initialize a vault to securely store SOL. The vault uses PDAs (Program Derived Addresses) for security.
        </p>
        {vaultAddress && vaultAuthorityAddress && (
          <div className="text-xs text-gray-500 space-y-1">
            <p>Vault PDA: {vaultAddress}</p>
            <p>Authority PDA: {vaultAuthorityAddress!}</p>
          </div>
        )}
        <Button 
          onClick={handleInitialize} 
          disabled={initializeVaultMutation.isPending || !vaultAddress || !vaultAuthorityAddress}
        >
          {initializeVaultMutation.isPending ? 'Initializing...' : 'Initialize Vault'}
        </Button>
        {initializeVaultMutation.error && (
          <p className="text-sm text-red-600">
            {initializeVaultMutation.error?.message}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">
          Vault using createProgramHook
        </h2>
        <div className="space-y-1 text-xs text-gray-500">
          <AppExplorerLink address={vaultAddress!} label={`Vault Address: ${ellipsify(vaultAddress!)}`} />
          <AppExplorerLink address={vaultQuery.data.data.tokenAccount!} label={`Token Account: ${ellipsify(vaultQuery.data.data.tokenAccount!)}`} />
        </div>
      </div>

      {/* Balance Display */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-8 text-center">
        {vaultQuery.isLoading && <p className="text-gray-500">Loading vault...</p>}
        {vaultQuery.data && (
          <div>
            <p className="text-sm text-gray-600 mb-1">Vault Balance</p>
            <div className="text-5xl font-bold text-green-900">{vaultBalance} tokens</div>
            <div className="text-xs text-gray-500 mt-3 space-y-1">
              <p>Owner: {ellipsify(vaultQuery.data.data.authority)}</p>
              <p>Bump: {vaultQuery.data.data.bump}</p>
              <p>Authority Bump: {vaultQuery.data.data.authorityBump}</p>
            </div>
          </div>
        )}
      </div>

      {/* Deposit Section */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Deposit Tokens</h3>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Amount in tokens"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            step="1"
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
        <h3 className="text-lg font-semibold">Withdraw Tokens</h3>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Amount in tokens"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            step="1"
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
      </div>

      {/* Close Vault Section
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
      </div> */}

      {/* Error Messages */}
      {(depositMutation.error || withdrawMutation.error ) && (
        <div className="bg-red-50 text-red-800 p-3 rounded text-sm">
          {depositMutation.error?.message || 
           withdrawMutation.error?.message }
        </div>
      )}
    </div>  
  )
}
