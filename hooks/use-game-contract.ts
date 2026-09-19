"use client"

import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId } from "wagmi"
import { POLY_PLINKO_GAME_ADDRESS, GAME_ABI, requireConfiguredAddress, requireExpectedChain, isConfiguredAddress, type GameConfig } from "@/lib/contracts"
import { useToast } from "@/hooks/use-toast"

export function usePlayPlinko() {
  const { toast } = useToast()
  const { data: hash, writeContractAsync, isPending, error } = useWriteContract()
  const chainId = useChainId()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const playPlinko = async (config: GameConfig) => {
    try {
      const totalBet = config.betPerBall * BigInt(config.balls)

      const gameAddress = requireConfiguredAddress(POLY_PLINKO_GAME_ADDRESS, "PolyPlinko game")
      requireExpectedChain(chainId)

      await writeContractAsync({
        address: gameAddress,
        abi: GAME_ABI,
        functionName: "playPlinko",
        args: [config],
        value: totalBet,
      })
    } catch (err) {
      console.error("[v0] Play Plinko error:", err)
      const message = err instanceof Error ? err.message : error?.message || "Failed to send transaction"
      const riskLimited = message.includes("Game exceeds bankroll risk limit")
      toast({
        title: riskLimited ? "Bet Exceeds Risk Limit" : "Transaction Failed",
        description: riskLimited ? "This bet exceeds the current bankroll risk limit." : message,
        variant: "destructive",
      })
    }
  }

  return {
    playPlinko,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error,
  }
}

export function useGameStats() {
  const enabled = isConfiguredAddress(POLY_PLINKO_GAME_ADDRESS)
  const { data: houseBankroll } = useReadContract({
    address: POLY_PLINKO_GAME_ADDRESS as `0x${string}`,
    abi: GAME_ABI,
    functionName: "houseBankroll",
    query: { enabled },
  })

  const { data: miningEmitted } = useReadContract({
    address: POLY_PLINKO_GAME_ADDRESS as `0x${string}`,
    abi: GAME_ABI,
    functionName: "miningEmitted",
    query: { enabled },
  })

  const { data: tierInfo } = useReadContract({
    address: POLY_PLINKO_GAME_ADDRESS as `0x${string}`,
    abi: GAME_ABI,
    functionName: "getLossMiningTierInfo",
    query: { enabled },
  })

  const { data: lockedBankroll } = useReadContract({
    address: POLY_PLINKO_GAME_ADDRESS as `0x${string}`,
    abi: GAME_ABI,
    functionName: "lockedBankroll",
    query: { enabled },
  })

  const houseBankrollValue = typeof houseBankroll === "bigint" ? houseBankroll : 0n
  const lockedBankrollValue = typeof lockedBankroll === "bigint" ? lockedBankroll : 0n
  const miningEmittedValue = typeof miningEmitted === "bigint" ? miningEmitted : 0n
  const tierValues = Array.isArray(tierInfo) ? tierInfo as unknown as readonly [bigint, bigint, bigint] : undefined
  const availableBankroll = houseBankrollValue > lockedBankrollValue ? houseBankrollValue - lockedBankrollValue : 0n

  return {
    houseBankroll: houseBankrollValue,
    availableBankroll,
    lockedBankroll: lockedBankrollValue,
    miningEmitted: miningEmittedValue,
    currentTier: tierValues?.[0],
    pricePerToken: tierValues?.[1],
    tokensLeftInTier: tierValues?.[2],
  }
}
