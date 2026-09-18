"use client"

import { useEffect, useState } from "react"
import { usePublicClient, useAccount } from "wagmi"
import { parseAbiItem, formatEther } from "viem"
import { POLY_PLINKO_GAME_ADDRESS, requireConfiguredAddress } from "@/lib/contracts"

export interface GameEvent {
  isDemo?: boolean
  gameId: string
  player: string
  randomSeed: string
  totalBet: string
  totalPayout: string
  profit: string
  tokensEarned: string
  timestamp: number
  transactionHash: string
}

export function useGameEvents(limit = 10) {
  const [events, setEvents] = useState<GameEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const publicClient = usePublicClient()
  const { address } = useAccount()

  useEffect(() => {
    const fetchEvents = async () => {
      if (!publicClient) return

      try {
        setIsLoading(true)
        const gameAddress = requireConfiguredAddress(POLY_PLINKO_GAME_ADDRESS, "PolyPlinko game")
        const latestBlock = await publicClient.getBlockNumber()
        const fromBlock = latestBlock > 100_000n ? latestBlock - 100_000n : 0n

        // Keep browser history queries bounded. Full history belongs in an
        // indexer; scanning from genesis on every render amplifies RPC load.
        const logs = await publicClient.getLogs({
          address: gameAddress,
          event: parseAbiItem(
            "event GameSettled(uint256 indexed gameId, address indexed player, uint256 randomSeed, uint256 totalBet, uint256 totalPayout, int256 profit, uint256 tokensEarned)",
          ),
          fromBlock,
          toBlock: latestBlock,
        })

        // Filter by current user if address is provided
        const filteredLogs = address
          ? logs.filter((log) => log.args.player?.toLowerCase() === address.toLowerCase())
          : logs

        // Convert to GameEvent format
        const gameEvents: GameEvent[] = await Promise.all(
          filteredLogs
            .slice(-limit)
            .reverse()
            .map(async (log) => {
              const block = await publicClient.getBlock({ blockNumber: log.blockNumber })

              return {
                gameId: log.args.gameId?.toString() || "0",
                player: log.args.player || "",
                randomSeed: log.args.randomSeed?.toString() || "0",
                totalBet: formatEther(log.args.totalBet || 0n),
                totalPayout: formatEther(log.args.totalPayout || 0n),
                profit: formatEther(log.args.profit || 0n),
                tokensEarned: formatEther(log.args.tokensEarned || 0n),
                timestamp: Number(block.timestamp),
                transactionHash: log.transactionHash,
              }
            }),
        )

        setEvents(gameEvents)
      } catch (err) {
        console.error("[v0] Failed to fetch game events:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [publicClient, address, limit])

  return { events, isLoading }
}

// Hook to listen for new game settlements in real-time
export function useWatchGameSettled(onGameSettled?: (event: GameEvent) => void) {
  const publicClient = usePublicClient()
  const { address } = useAccount()

  useEffect(() => {
    if (!publicClient || !onGameSettled) return

    const unwatch = publicClient.watchEvent({
      address: POLY_PLINKO_GAME_ADDRESS as `0x${string}`,
      event: parseAbiItem(
        "event GameSettled(uint256 indexed gameId, address indexed player, uint256 randomSeed, uint256 totalBet, uint256 totalPayout, int256 profit, uint256 tokensEarned)",
      ),
      onLogs: async (logs) => {
        for (const log of logs) {
          // Only trigger for current user's games
          if (address && log.args.player?.toLowerCase() === address.toLowerCase()) {
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber })

            onGameSettled({
              gameId: log.args.gameId?.toString() || "0",
              player: log.args.player || "",
              randomSeed: log.args.randomSeed?.toString() || "0",
              totalBet: formatEther(log.args.totalBet || 0n),
              totalPayout: formatEther(log.args.totalPayout || 0n),
              profit: formatEther(log.args.profit || 0n),
              tokensEarned: formatEther(log.args.tokensEarned || 0n),
              timestamp: Number(block.timestamp),
              transactionHash: log.transactionHash,
            })
          }
        }
      },
    })

    return () => {
      unwatch()
    }
  }, [publicClient, address, onGameSettled])
}
