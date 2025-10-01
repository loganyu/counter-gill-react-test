import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UiWalletAccount, useWalletUiSigner, ellipsify } from '@wallet-ui/react'
import { useSolanaClient } from "@gillsdk/react";
import { generateKeyPairSigner } from 'gill'
import type { Address } from 'gill'
import { useCounterProgram } from '@/hooks/useCounterProgram'
import { toast } from 'sonner'
import { toastTx } from '@/components/toast-tx'
import { AppExplorerLink } from '@/components/app-explorer-link'

export function CounterExample({ account }: { account: UiWalletAccount }) {
  const { rpc } = useSolanaClient();
  const signer = useWalletUiSigner({ account })
  const [counterAddress, setCounterAddress] = useState<Address | null>(null)
  const [counterType, setCounterType] = useState<'simple' | 'withPda'>('simple')
  const [pdaAddress, setPdaAddress] = useState<Address | null>(null)

  const { useProgramMutation, useProgramQuery, authorityPda } = useCounterProgram()

  useState(() => { authorityPda.then(pda => setPdaAddress(pda)) })

  const initializeMutation = useProgramMutation({
    instruction: 'initialize',
    onMutate: (data) => {
      setCounterAddress(data.counter.address);
    },
    onSuccess: (signature) => {
      console.log('Initialize successful:', signature)
      toastTx(signature)
    },
    onError: (error) => {
      setCounterAddress(null);
      toast.error(`initialize onerror', ${error}`)
    },
  })

  const initializeWithPdaMutation = useProgramMutation({
    instruction: 'initializeWithPda',
    onMutate: async (data) => {
      setCounterAddress(data.counter.address)
      setCounterType('withPda')
    },
    onSuccess: (signature) => {
      console.log('Initialize with PDA successful:', signature)
      toastTx(signature)
    },
    onError: (error) => {
      setCounterAddress(null)
      toast.error(`Initialize with PDA failed: ${error.message}`)
    },
  })

  const incrementMutation = useProgramMutation({
    instruction: 'increment',
    defaultSigners: signer,
    onSuccess: (signature) => {
      console.log('Increment successful:', signature)
      toastTx(signature)
    },
    onError: (error) => {
      toast.error(`increment onerror', ${error}`)
    },
  })

  const incrementWithPdaMutation = useProgramMutation({
    instruction: 'incrementWithPda',
    onSuccess: (signature) => {
      console.log('Increment with PDA successful:', signature)
      toastTx(signature)
    },
    onError: (error) => {
      toast.error(`Increment with PDA failed: ${error.message}`)
    },
  })

  const decrementMutation = useProgramMutation({
    instruction: 'decrement',
    onSuccess: (signature) => {
      console.log('Decrement successful:', signature)
      toastTx(signature)
    },
    onError: (error) => {
      toast.error(`decrement onerror', ${error}`)
    },
  })

  const setMutation = useProgramMutation({
    instruction: 'set',
    defaultSigners: signer,
    onSuccess: (signature) => {
      console.log('Set successful:', signature)
      toastTx(signature)
    },
    onError: (error) => {
      toast.error(`set onerror', ${error}`)
    },
  })

  const closeMutation = useProgramMutation({
    instruction: 'close',
    defaultSigners: signer,
    onSuccess: (signature) => {
      console.log('Close successful:', signature)
      toastTx(signature)
      setCounterAddress(null)
    },
    onError: (error) => {
      toast.error(`close onerror', ${error}`)
    },
  })  

  const counterQuery = useProgramQuery({
    account: counterType === 'simple' ? 'counter' : 'counterWithAuthority',
    address: counterAddress!,
    rpc,
    enabled: !!counterAddress,
  })

  if (!counterAddress) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Create a Counter with createProgramHook</h2>
        <Button 
          onClick={async () => {
            const counter = await generateKeyPairSigner()
            initializeMutation.mutate({
              counter,
              payer: signer,
              signer: signer,
            })}
          } 
          disabled={initializeMutation.isPending}>
          {initializeMutation.isPending ? 'Initializing...' : 'Initialize Simple Counter'}
        </Button>

        <Button 
          onClick={async () => {
            const counter = await generateKeyPairSigner()
            initializeWithPdaMutation.mutate({
              counter,
              payer: signer,
              authority: pdaAddress!,
              signer: signer,
            })
          }} 
          disabled={initializeWithPdaMutation.isPending}
          variant="secondary"
        >
          {initializeWithPdaMutation.isPending ? 'Initializing...' : 'Initialize PDA Counter'}
        </Button>
        {(initializeMutation.error || initializeWithPdaMutation.error) && (
          <p className="text-sm text-red-600">
            {initializeMutation.error?.message || initializeWithPdaMutation.error?.message}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">
          Counter using createProgramHook ({counterType === 'simple' ? 'Simple' : 'PDA'})
        </h2>
        {initializeMutation.isSuccess && (
          <AppExplorerLink address={counterAddress} label={ellipsify(counterAddress)} />
        )}
      </div>

      <div className="bg-white border rounded-lg p-6 text-center">
        {counterQuery.isLoading && <p className="text-gray-500">Loading...</p>}
        {counterQuery.isError && (
          <p className="text-red-600 text-sm">{counterQuery.error.message}</p>
        )}
        {counterQuery.data && (
          <>
            {console.log('[CounterExample] Rendering count:', counterQuery.data.data.count)}
            <div className="text-6xl font-bold text-black">{counterQuery.data.data.count}</div>
          </>
        )}
      </div>

      {counterType === 'simple' ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 font-semibold">Simple Counter (requires authority signer)</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => incrementMutation.mutate({
                counter: counterAddress,
                authority: signer,
                signer: signer,
              })}
              disabled={incrementMutation.isPending || !counterQuery.data}
              variant="default"
            >
              {incrementMutation.isPending ? 'Incrementing...' : 'Increment (with signer)'}
            </Button>

            <Button
              onClick={() => decrementMutation.mutate({
                counter: counterAddress,
                signer: [],
              })}
              disabled={decrementMutation.isPending || !counterQuery.data}
              variant="secondary"
            >
              {decrementMutation.isPending ? 'Decrementing...' : 'Decrement (no signer)'}
            </Button>

            <Button
              onClick={() => setMutation.mutate({
                counter: counterAddress,
                authority: signer,
                value: 42,
              })}
              disabled={setMutation.isPending || !counterQuery.data}
              variant="outline"
            >
              {setMutation.isPending ? 'Setting...' : 'Set to 42 (with signer)'}
            </Button>

            <Button
              onClick={() => closeMutation.mutate({
                payer: signer,
                counter: counterAddress,
              })}
              disabled={!counterAddress || closeMutation.isPending}
              variant="destructive"
            >
              {closeMutation.isPending ? 'Closing...' : 'Close Account'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 font-semibold">PDA Counter (authority is PDA)</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => incrementWithPdaMutation.mutate({
                counter: counterAddress,
                authority: pdaAddress!,
              })}
              disabled={incrementWithPdaMutation.isPending || !counterQuery.data}
              variant="default"
            >
              {incrementWithPdaMutation.isPending ? 'Incrementing...' : 'Increment (PDA signs)'}
            </Button>

            <Button
              onClick={() => decrementMutation.mutate({
                counter: counterAddress,
              })}
              disabled={decrementMutation.isPending || !counterQuery.data}
              variant="secondary"
            >
              {decrementMutation.isPending ? 'Decrementing...' : 'Decrement (no signer)'}
            </Button>

            <Button
              onClick={() => closeMutation.mutate({
                payer: signer,
                counter: counterAddress,
              })}
              disabled={!counterAddress || closeMutation.isPending}
              variant="destructive"
            >
              {closeMutation.isPending ? 'Closing...' : 'Close Account'}
            </Button>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {(incrementMutation.error || incrementWithPdaMutation.error || decrementMutation.error || setMutation.error || closeMutation.error) && (
        <div className="bg-red-50 text-red-800 p-3 rounded text-sm">
          {incrementMutation.error?.message || 
           incrementWithPdaMutation.error?.message ||
           decrementMutation.error?.message || 
           setMutation.error?.message || 
           closeMutation.error?.message}
        </div>
      )}
    </div>
  )
}