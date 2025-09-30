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
  const { rpc, sendAndConfirmTransaction } = useSolanaClient();
  const signer = useWalletUiSigner({ account })
  const [counterAddress, setCounterAddress] = useState<Address | null>(null)

  const { useProgramMutation, useProgramQuery } = useCounterProgram()

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

  const incrementMutation = useProgramMutation({
    instruction: 'increment',
    onSuccess: (signature) => {
      console.log('Increment successful:', signature)
      toastTx(signature)
    },
    onError: (error) => {
      toast.error(`increment onerror', ${error}`)
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
    account: 'counter',
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
              signer
            })}
          } 
          disabled={initializeMutation.isPending}>
          {initializeMutation.isPending ? 'Initializing...' : 'Initialize Counter'}
        </Button>
        {initializeMutation.error && (
          <p className="text-sm text-red-600">{initializeMutation.error.message}</p>
        )}
      </div>
    )
  }

  console.log('counterQuery.data', counterQuery.data);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Counter using createProgramHook</h2>
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
          <div className="text-6xl font-bold text-black">{counterQuery.data.data.count}</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => incrementMutation.mutateAsync({counter: counterAddress, signer})}
          disabled={incrementMutation.isPending || !counterQuery.data}
          variant="default"
        >
          {incrementMutation.isPending ? 'Incrementing...' : 'Increment'}
        </Button>

        <Button
          onClick={() => {decrementMutation.mutateAsync({counter: counterAddress, signer})}}
          disabled={decrementMutation.isPending || !counterQuery.data}
          variant="secondary"
        >
          {decrementMutation.isPending ? 'Decrementing...' : 'Decrement'}
        </Button>

        <Button
          onClick={() => setMutation.mutateAsync({
            counter: counterAddress,
            value: 11,
            signer,
          })}
          disabled={setMutation.isPending || !counterQuery.data}
          variant="outline"
        >
          {setMutation.isPending ? 'Setting...' : 'Set to 11'}
        </Button>

        <Button
          onClick={() => closeMutation.mutateAsync({
            payer: signer,
            counter: counterAddress,
            signer,
          })}
          disabled={!counterAddress || closeMutation.isPending}
          variant="destructive"
        >
          {closeMutation.isPending ? 'Closing...' : 'Close Account'}
        </Button>
      </div>

      {(incrementMutation.error || decrementMutation.error || setMutation.error || closeMutation.error) && (
        <div className="bg-red-50 text-red-800 p-3 rounded text-sm">
          {incrementMutation.error?.message || 
           decrementMutation.error?.message || 
           setMutation.error?.message || 
           closeMutation.error?.message}
        </div>
      )}
    </div>
  )
}