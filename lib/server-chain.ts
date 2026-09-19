import { defineChain } from "viem"
import { polygon, polygonAmoy } from "viem/chains"

const networkId = process.env.NEXT_PUBLIC_NETWORK_ID
const isProduction = process.env.NODE_ENV === "production" && process.env.APP_ENV === "production"
if (isProduction && (!networkId || !["137", "80002"].includes(networkId) || !process.env.POLYGON_RPC_URL)) {
  throw new Error("Production server blockchain configuration is incomplete")
}

export const localChain = defineChain({ id: 1337, name: "Hardhat Local", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"] } } })
export const serverChain = networkId === "1337" ? localChain : networkId === "80002" ? polygonAmoy : polygon
export const serverRpcUrl = networkId === "1337" ? (process.env.NEXT_PUBLIC_RPC_URL || (isProduction ? undefined : "http://127.0.0.1:8545")) : process.env.POLYGON_RPC_URL
