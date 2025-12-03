"use client"

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi"
import { formatEther } from "viem"
import { POLY_PLINKO_TOKEN_ADDRESS, TOKEN_ABI } from "@/lib/contracts"
import { useToast } from "@/hooks/use-toast"

export function useTokenBalance() {
  const { address } = useAccount()

  const { data: balance, refetch } = useReadContract({
    address: POLY_PLINKO_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  return {
    balance,
    balanceFormatted: balance ? formatEther(balance) : "0",
    refetch,
  }
}

export function useTokenInfo() {
  const { data: totalSupply } = useReadContract({
    address: POLY_PLINKO_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: "totalSupply",
  })

  const { data: name } = useReadContract({
    address: POLY_PLINKO_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: "name",
  })

  const { data: symbol } = useReadContract({
    address: POLY_PLINKO_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: "symbol",
  })

  return {
    totalSupply,
    totalSupplyFormatted: totalSupply ? formatEther(totalSupply) : "0",
    name,
    symbol,
  }
}

export function useTokenApproval(spenderAddress: string) {
  const { address } = useAccount()
  const { toast } = useToast()

  const { data: allowance, refetch } = useReadContract({
    address: POLY_PLINKO_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: "allowance",
    args: address && spenderAddress ? [address, spenderAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!(address && spenderAddress),
    },
  })

  const { data: hash, writeContract, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const approve = async (amount: bigint) => {
    try {
      writeContract({
        address: POLY_PLINKO_TOKEN_ADDRESS as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: "approve",
        args: [spenderAddress as `0x${string}`, amount],
      })
    } catch (err) {
      console.error("[v0] Approval error:", err)
      toast({
        title: "Approval Failed",
        description: "Failed to approve token spending",
        variant: "destructive",
      })
    }
  }

  return {
    allowance,
    approve,
    isPending,
    isConfirming,
    isSuccess,
    refetch,
  }
}
