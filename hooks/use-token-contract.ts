"use client"

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi"
import { formatEther } from "viem"
import { POLY_PLINKO_TOKEN_ADDRESS, TOKEN_ABI, isConfiguredAddress, requireConfiguredAddress, requireExpectedChain } from "@/lib/contracts"
import { useToast } from "@/hooks/use-toast"

export function useTokenBalance() {
  const { address } = useAccount()

  const { data: balance, refetch } = useReadContract({
    address: POLY_PLINKO_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConfiguredAddress(POLY_PLINKO_TOKEN_ADDRESS),
    },
  })

  const balanceValue = typeof balance === "bigint" ? balance : 0n
  return {
    balance: balanceValue,
    balanceFormatted: formatEther(balanceValue),
    refetch,
  }
}

export function useTokenInfo() {
  const { data: totalSupply } = useReadContract({
    address: POLY_PLINKO_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: "totalSupply",
    query: { enabled: isConfiguredAddress(POLY_PLINKO_TOKEN_ADDRESS) },
  })

  const { data: name } = useReadContract({
    address: POLY_PLINKO_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: "name",
    query: { enabled: isConfiguredAddress(POLY_PLINKO_TOKEN_ADDRESS) },
  })

  const { data: symbol } = useReadContract({
    address: POLY_PLINKO_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: "symbol",
    query: { enabled: isConfiguredAddress(POLY_PLINKO_TOKEN_ADDRESS) },
  })

  const totalSupplyValue = typeof totalSupply === "bigint" ? totalSupply : 0n
  return {
    totalSupply: totalSupplyValue,
    totalSupplyFormatted: formatEther(totalSupplyValue),
    name: typeof name === "string" ? name : "",
    symbol: typeof symbol === "string" ? symbol : "",
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
      enabled: !!(address && spenderAddress) && isConfiguredAddress(POLY_PLINKO_TOKEN_ADDRESS),
    },
  })

  const { data: hash, writeContractAsync, isPending } = useWriteContract()
  const chainId = useChainId()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const approve = async (amount: bigint) => {
    try {
      requireExpectedChain(chainId)
      const tokenAddress = requireConfiguredAddress(POLY_PLINKO_TOKEN_ADDRESS, "PPL token")
      await writeContractAsync({
        address: tokenAddress,
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
    allowance: typeof allowance === "bigint" ? allowance : 0n,
    approve,
    isPending,
    isConfirming,
    isSuccess,
    refetch,
  }
}
