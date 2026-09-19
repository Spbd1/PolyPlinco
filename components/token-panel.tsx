"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAccount } from "wagmi"
import { parseEther, formatEther } from "viem"
import { useGameStats } from "@/hooks/use-game-contract"
import { useTokenInfo, useTokenBalance, useTokenApproval } from "@/hooks/use-token-contract"
import { useSwap, useSwapQuotes, useBuybackAndBurn } from "@/hooks/use-swap-contract"
import { POLY_PLINKO_GAME_ADDRESS } from "@/lib/contracts"
import { useToast } from "@/hooks/use-toast"

export function TokenPanel() {
  const { isConnected } = useAccount()
  const { toast } = useToast()
  const [swapDirection, setSwapDirection] = useState<"maticToPpl" | "pplToMatic">("maticToPpl")
  const [amountIn, setAmountIn] = useState("")
  const [slippage, setSlippage] = useState("1.0") // 1% default slippage

  const { totalSupplyFormatted } = useTokenInfo()
  const { balanceFormatted } = useTokenBalance()
  const { miningEmitted, currentTier, pricePerToken, tokensLeftInTier } = useGameStats()
  const { reserveMatic, reserveToken, getQuoteMaticToTokens, getQuoteTokensToMatic } = useSwapQuotes()
  const { swapMaticForTokens, swapTokensForMatic, isPending: isSwapPending } = useSwap()
  const { allowance, approve, isPending: isApprovePending } = useTokenApproval(POLY_PLINKO_GAME_ADDRESS)
  const { buybackAndBurn, isPending: isBuybackPending, totalBurnedFormatted } = useBuybackAndBurn()

  const [amountOut, setAmountOut] = useState("0.00")

  // Calculate quote when input changes
  useEffect(() => {
    if (!amountIn || Number.parseFloat(amountIn) <= 0) {
      setAmountOut("0.00")
      return
    }

    try {
      const input = parseEther(amountIn)
      let output: bigint

      if (swapDirection === "maticToPpl") {
        output = getQuoteMaticToTokens(input)
      } else {
        output = getQuoteTokensToMatic(input)
      }

      setAmountOut(formatEther(output))
    } catch (err) {
      console.error("[v0] Quote calculation error:", err)
      setAmountOut("0.00")
    }
  }, [amountIn, swapDirection, getQuoteMaticToTokens, getQuoteTokensToMatic])

  const handleSwap = async () => {
    if (!isConnected) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to swap",
        variant: "destructive",
      })
      return
    }

    if (!amountIn || Number.parseFloat(amountIn) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      })
      return
    }

    try {
      const input = parseEther(amountIn)
      const output = parseEther(amountOut)
      const slippageMultiplier = 1 - Number.parseFloat(slippage) / 100
      const minOut = BigInt(Math.floor(Number(output) * slippageMultiplier))

      if (swapDirection === "maticToPpl") {
        await swapMaticForTokens(input, minOut)
      } else {
        // Check allowance first
        if (allowance && allowance < input) {
          toast({
            title: "Approval Required",
            description: "Approving token spending first...",
          })
          await approve(input)
          // Wait for approval before swapping
          return
        }

        await swapTokensForMatic(input, minOut)
      }
    } catch (err) {
      console.error("[v0] Swap error:", err)
    }
  }

  const handleBuyback = async () => {
    if (!isConnected) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet",
        variant: "destructive",
      })
      return
    }

    await buybackAndBurn()
  }

  // Format stats
  const miningEmittedFormatted = miningEmitted ? formatEther(miningEmitted) : "0"
  const tierNumber = currentTier ? Number(currentTier) + 1 : 1
  const pricePerTokenFormatted = pricePerToken ? formatEther(pricePerToken) : "0.02"
  const tokensLeftFormatted = tokensLeftInTier ? formatEther(tokensLeftInTier) : "100000"
  const miningComplete = Number(miningEmittedFormatted) >= 900000

  const reserveMaticFormatted = reserveMatic ? formatEther(reserveMatic) : "0"
  const reserveTokenFormatted = reserveToken ? formatEther(reserveToken) : "0"

  const currentPrice =
    reserveMatic && reserveToken && Number(reserveToken) > 0
      ? (Number(formatEther(reserveMatic)) / Number(formatEther(reserveToken))).toFixed(6)
      : "0"

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Token Stats */}
      <Card className="p-6 bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-white mb-6">PPL Token Stats</h2>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <p className="text-slate-400 text-sm">Total Supply (Fixed Cap)</p>
            <p className="text-2xl font-bold text-white">{Number(totalSupplyFormatted).toLocaleString()} PPL</p>
          </div>

          {isConnected && (
            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <p className="text-slate-400 text-sm">Your Balance</p>
              <p className="text-2xl font-bold text-purple-400">{Number(balanceFormatted).toFixed(2)} PPL</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <p className="text-slate-400 text-sm">Mining Emitted</p>
              <p className="text-xl font-bold text-purple-400">{Number(miningEmittedFormatted).toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">/ 900,000 max</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <p className="text-slate-400 text-sm">Total Burned</p>
              <p className="text-xl font-bold text-red-400">{Number(totalBurnedFormatted).toLocaleString()}</p>
            </div>
          </div>

          {!miningComplete ? (
            <div className="p-4 rounded-lg bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700/50">
              <p className="text-purple-300 text-sm mb-2">Loss-Mining Tier {tierNumber} of 9</p>
              <p className="text-white text-lg">
                1 PPL = <span className="font-bold">{pricePerTokenFormatted} MATIC</span> net loss
              </p>
              <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                  style={{ width: `${((100000 - Number(tokensLeftFormatted)) / 100000) * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {Number(tokensLeftFormatted).toLocaleString()} / 100,000 tokens left in tier
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-700/50">
              <p className="text-green-300 text-sm mb-2">Mining Complete - Buyback Active</p>
              <p className="text-white text-sm">All 900k mining tokens distributed. 70% of applicable net loss buys PPL; 30% of purchased PPL burns and 70% goes to the player.</p>
            </div>
          )}

          <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <p className="text-slate-400 text-sm mb-2">AMM Liquidity</p>
            <div className="space-y-1">
              <p className="text-white">{Number(reserveMaticFormatted).toFixed(2)} MATIC</p>
              <p className="text-white">{Number(reserveTokenFormatted).toLocaleString()} PPL</p>
              <p className="text-xs text-slate-500 mt-2">Current price: {currentPrice} MATIC per PPL</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Swap Interface */}
      <Card className="p-6 bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-white mb-6">Swap</h2>

        <div className="space-y-4">
          {/* Swap Direction Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSwapDirection("maticToPpl")}
              className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                swapDirection === "maticToPpl"
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                  : "bg-slate-800/50 text-slate-400 hover:text-white"
              }`}
            >
              MATIC → PPL
            </button>
            <button
              onClick={() => setSwapDirection("pplToMatic")}
              className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                swapDirection === "pplToMatic"
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                  : "bg-slate-800/50 text-slate-400 hover:text-white"
              }`}
            >
              PPL → MATIC
            </button>
          </div>

          {/* Input */}
          <div className="space-y-2">
            <Label className="text-slate-300">You Pay ({swapDirection === "maticToPpl" ? "MATIC" : "PPL"})</Label>
            <Input
              type="number"
              step="0.001"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.00"
              className="bg-slate-800/50 border-slate-700 text-white text-lg h-14"
            />
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
              <span className="text-xl">⬇</span>
            </div>
          </div>

          {/* Output */}
          <div className="space-y-2">
            <Label className="text-slate-300">You Receive ({swapDirection === "maticToPpl" ? "PPL" : "MATIC"})</Label>
            <div className="px-4 py-4 rounded-lg bg-slate-800/50 border border-slate-700 text-white text-lg">
              {Number(amountOut).toFixed(4)}
            </div>
          </div>

          {/* Slippage */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">Slippage Tolerance (%)</Label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              max="50"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-white h-10"
            />
          </div>

          {/* Fee Notice */}
          <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-700/50">
            <p className="text-sm text-yellow-300">
              5% fee applies: {swapDirection === "maticToPpl" ? "added to vault" : "tokens burned"}
            </p>
          </div>

          {/* Swap Button */}
          <Button
            onClick={handleSwap}
            disabled={isSwapPending || isApprovePending || !isConnected}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
          >
            {isApprovePending ? "Approving..." : isSwapPending ? "Swapping..." : "Swap"}
          </Button>

          {/* Buyback & Burn */}
          <div className="pt-4 border-t border-slate-700">
            <Button
              onClick={handleBuyback}
              disabled={isBuybackPending || !isConnected}
              variant="outline"
              className="w-full border-green-700/50 text-green-400 hover:bg-green-900/20 bg-transparent disabled:opacity-50"
            >
              {isBuybackPending ? "Executing..." : "Trigger Buyback & Burn"}
            </Button>
            <p className="text-xs text-slate-500 text-center mt-2">Uses vault MATIC to buy and burn PPL</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
