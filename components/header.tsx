"use client"

import { useAccount, useBalance } from "wagmi"
import Link from "next/link"
import { formatEther } from "viem"
import { WalletConnectButton } from "@/components/wallet-connect-button"

export function Header() {
  const { address, isConnected } = useAccount()

  const { data: balanceData } = useBalance({
    address: address,
    query: {
      enabled: !!address,
    },
  })

  const balance = balanceData ? Number.parseFloat(formatEther(balanceData.value)).toFixed(4) : "0.00"

  return (
    <header className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <span className="text-2xl">🎰</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                PolyPlinko
              </h1>
              <p className="text-xs text-slate-500">Provably Fair on Polygon</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {/* Navigation Links */}
            <Link
              href="/how-to-play"
              className="text-sm text-slate-400 hover:text-purple-400 transition-colors font-medium"
            >
              How to Play
            </Link>
            <Link
              href="/whitepaper"
              className="text-sm text-slate-400 hover:text-blue-400 transition-colors font-medium"
            >
              Whitepaper
            </Link>

            {/* Network Badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-900/30 border border-purple-700/50">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-sm font-medium text-purple-300">Polygon</span>
            </div>

            {isConnected && address && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div>
                  <p className="text-xs text-slate-500">Balance</p>
                  <p className="text-sm font-semibold text-white">{balance} MATIC</p>
                </div>
              </div>
            )}

            <WalletConnectButton />
          </div>
        </div>
      </div>
    </header>
  )
}
