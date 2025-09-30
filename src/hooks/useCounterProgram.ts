import { createProgramHook } from "@gillsdk/react";
import { 
  getIncrementInstruction, 
  getInitializeInstruction, 
  getDecrementInstruction,
  fetchCounter,
  getSetInstruction,
  getCloseInstruction,
} from 'anchor/src/client/js'
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill'

export function useCounterProgram() {
  const signAndSend = useWalletUiSignAndSend()
  
  return createProgramHook({
    instructions: {
      initialize: getInitializeInstruction,
      increment: getIncrementInstruction,
      decrement: getDecrementInstruction,
      set: getSetInstruction,
      close: getCloseInstruction,
    },
    accounts: {
      counter: fetchCounter,
    },
    signAndSend,
  })
}