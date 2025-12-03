"use client"

import { useAccount, useConnect, useDisconnect } from "wagmi"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut, BarChart3 } from "lucide-react"
import { useRouter } from "next/navigation"

export function WalletConnectButton() {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()
  const router = useRouter()

  if (!isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            Connect Wallet
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
          <DropdownMenuLabel className="text-slate-300">Select Wallet</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-800" />
          {connectors.map((connector) => (
            <DropdownMenuItem
              key={connector.uid}
              onClick={() => connect({ connector })}
              className="text-slate-300 focus:bg-slate-800 focus:text-white cursor-pointer"
            >
              {connector.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="border-slate-700 bg-slate-800/50 hover:bg-slate-800">
          <User className="w-4 h-4 mr-2" />
          <span className="font-mono">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 w-48">
        <DropdownMenuLabel className="text-slate-300">My Account</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-800" />
        <DropdownMenuItem
          onClick={() => router.push("/profile")}
          className="text-slate-300 focus:bg-slate-800 focus:text-white cursor-pointer"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          View Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-slate-800" />
        <DropdownMenuItem
          onClick={() => disconnect()}
          className="text-red-400 focus:bg-slate-800 focus:text-red-400 cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
