import { useMemo } from "react";
import { createProgramHook } from "@gillsdk/react";
import { 
  getIncrementInstruction, 
  getInitializeInstruction, 
  getDecrementInstruction,
  getSetInstruction,
  getCloseInstruction,
  getIncrementWithPdaInstruction,
  getInitializeWithPdaInstruction,
  fetchCounter,
  fetchCounterWithAuthority,
} from 'anchor/src/client/js'
import { getProgramDerivedAddress, address } from 'gill'

const PROGRAM_ID = address("B3oFEmT9LiYrbd8CknDvbkLynbcmJWWQ5cqwoXGuqRfi")

export function useCounterProgram() {
  const authorityPda = useMemo(async () => {
    const [pda] = await getProgramDerivedAddress({
      programAddress: PROGRAM_ID,
      seeds: [new TextEncoder().encode("authority")]
    })
    return pda
  }, [])

  const hooks = createProgramHook({
    instructions: {
      initialize: getInitializeInstruction,
      increment: getIncrementInstruction,
      decrement: getDecrementInstruction,
      set: getSetInstruction,
      close: getCloseInstruction,
      incrementWithPda: getIncrementWithPdaInstruction,
      initializeWithPda: getInitializeWithPdaInstruction,
    },
    accounts: {
      counter: fetchCounter,
      counterWithAuthority: fetchCounterWithAuthority,
    },
    programAddress: PROGRAM_ID,
  })

  return {
    ...hooks,
    authorityPda,
  }
}