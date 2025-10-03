import { createProgramHook } from "@gillsdk/react";
import { 
  getInitializeInstruction, 
  getDepositInstruction,
  getWithdrawInstruction,
  getCloseInstruction,
  fetchVaultState,
} from 'anchor/src/vault/client/js'
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { address } from 'gill'
import { createSolanaClient } from "gill";

const PROGRAM_ID = address("ArXdRsT2zBK98eX6yMh2qMTPGgsLnG4hrXbX95ZjqeZ3")


export function useVaultProgram() {
  const signAndSend = useWalletUiSignAndSend()
  const { rpc } = createSolanaClient({
    urlOrMoniker: "devnet",
  });
  

  const hooks = createProgramHook({
    instructions: {
      initialize: getInitializeInstruction,
      deposit: getDepositInstruction,
      withdraw: getWithdrawInstruction,
      close: getCloseInstruction,
    },
    accounts: {
      vaultState: fetchVaultState,
    },
    signAndSend,
    rpc,
    programAddress: PROGRAM_ID,
  })

  return {
    ...hooks,
  }
}
