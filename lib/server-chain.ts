import { defineChain } from "viem"
import { polygon, polygonAmoy } from "viem/chains"

export const localChain = defineChain({ id: 1337, name: "Hardhat Local", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"] } } })
export const serverChain = process.env.NEXT_PUBLIC_NETWORK_ID === "1337" ? localChain : process.env.NEXT_PUBLIC_NETWORK_ID === "80002" ? polygonAmoy : polygon
export const serverRpcUrl = process.env.NEXT_PUBLIC_NETWORK_ID === "1337" ? (process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545") : process.env.POLYGON_RPC_URL
