import { createProgramHook } from "@gillsdk/react";
import { 
  getInitializeVaultInstruction,
  getDepositInstruction,
  getWithdrawInstruction,
  fetchVault,
} from 'anchor/src/vault/client/js'
import { address } from 'gill'

const PROGRAM_ID = address("4trU6PxX9bq7yAkFaCr4SmfbzddSEbbnufuZ8CjpBy1R")

export function useVaultProgram() {
  const hooks = createProgramHook({
    instructions: {
      initializeVault: getInitializeVaultInstruction,
      deposit: getDepositInstruction,
      withdraw: getWithdrawInstruction,
    },
    accounts: {
      vault: fetchVault,
    },
    programAddress: PROGRAM_ID,
  })

  return {
    ...hooks,
  }
}
