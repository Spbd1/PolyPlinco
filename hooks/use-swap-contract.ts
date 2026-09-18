"use client"

import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi"
import { formatEther } from "viem"
import { POLY_PLINKO_GAME_ADDRESS, GAME_ABI } from "@/lib/contracts"
import { useToast } from "@/hooks/use-toast"

export function useSwap() {
  const { toast } = useToast()
  const { data: hash, writeContract, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const swapMaticForTokens = async (maticAmount: bigint, minTokensOut: bigint) => {
    try {
      writeContract({
        address: POLY_PLINKO_GAME_ADDRESS as `0x${string}`,
        abi: GAME_ABI,
        functionName: "swapExactMaticForTokens",
        args: [minTokensOut],
        value: maticAmount,
      })
    } catch (err) {
      console.error("[v0] Swap MATIC->PPL error:", err)
      toast({
        title: "Swap Failed",
        description: error?.message || "Failed to swap MATIC for PPL",
        variant: "destructive",
      })
    }
  }

  const swapTokensForMatic = async (tokenAmount: bigint, minMaticOut: bigint) => {
    try {
      writeContract({
        address: POLY_PLINKO_GAME_ADDRESS as `0x${string}`,
        abi: GAME_ABI,
        functionName: "swapExactTokensForMatic",
        args: [tokenAmount, minMaticOut],
      })
    } catch (err) {
      console.error("[v0] Swap PPL->MATIC error:", err)
      toast({
        title: "Swap Failed",
        description: error?.message || "Failed to swap PPL for MATIC",
        variant: "destructive",
      })
    }
  }

  return {
    swapMaticForTokens,
    swapTokensForMatic,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error,
  }
}

export function useSwapQuotes() {
  const { data: reserveMatic } = useReadContract({
    address: POLY_PLINKO_GAME_ADDRESS as `0x${string}`,
    abi: GAME_ABI,
    functionName: "reserveMatic",
  })

  const { data: reserveToken } = useReadContract({
    address: POLY_PLINKO_GAME_ADDRESS as `0x${string}`,
    abi: GAME_ABI,
    functionName: "reserveToken",
  })

  const reserveMaticValue = typeof reserveMatic === "bigint" ? reserveMatic : 0n
  const reserveTokenValue = typeof reserveToken === "bigint" ? reserveToken : 0n
  const getQuoteMaticToTokens = (maticIn: bigint): bigint => {
    if (reserveMaticValue === 0n || reserveTokenValue === 0n) return 0n

    // Apply 5% fee
    const maticAfterFee = (maticIn * 95n) / 100n

    // Constant product formula: tokensOut = (maticIn * reserveToken) / (reserveMatic + maticIn)
    return (maticAfterFee * reserveTokenValue) / (reserveMaticValue + maticAfterFee)
  }

  const getQuoteTokensToMatic = (tokensIn: bigint): bigint => {
    if (reserveMaticValue === 0n || reserveTokenValue === 0n) return 0n

    // Apply 5% fee (tokens are burned)
    const tokensAfterFee = (tokensIn * 95n) / 100n

    // Constant product formula: maticOut = (tokensIn * reserveMatic) / (reserveToken + tokensIn)
    return (tokensAfterFee * reserveMaticValue) / (reserveTokenValue + tokensAfterFee)
  }

  return {
    reserveMatic: reserveMaticValue,
    reserveToken: reserveTokenValue,
    getQuoteMaticToTokens,
    getQuoteTokensToMatic,
  }
}

export function useBuybackAndBurn() {
  const { toast } = useToast()
  const { data: hash, writeContract, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const { data: totalBurned } = useReadContract({
    address: POLY_PLINKO_GAME_ADDRESS as `0x${string}`,
    abi: GAME_ABI,
    functionName: "totalTokensBurned",
  })

  const buybackAndBurn = async () => {
    try {
      writeContract({
        address: POLY_PLINKO_GAME_ADDRESS as `0x${string}`,
        abi: GAME_ABI,
        functionName: "buybackAndBurn",
      })

      toast({
        title: "Buyback Initiated",
        description: "Transaction sent. Waiting for confirmation...",
      })
    } catch (err) {
      console.error("[v0] Buyback error:", err)
      toast({
        title: "Buyback Failed",
        description: "Failed to execute buyback and burn",
        variant: "destructive",
      })
    }
  }

  return {
    buybackAndBurn,
    isPending,
    isConfirming,
    isSuccess,
    totalBurned,
    totalBurnedFormatted: typeof totalBurned === "bigint" ? formatEther(totalBurned) : "0",
  }
}
