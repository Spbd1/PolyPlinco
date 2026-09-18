import { createConfig, http } from "wagmi"
import { localhost, polygon, polygonAmoy } from "wagmi/chains"
import { injected } from "wagmi/connectors"

export const wagmiConfig = createConfig({
  chains: [localhost, polygon, polygonAmoy],
  connectors: [
    injected(),
  ],
  transports: {
    [localhost.id]: http(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"),
    [polygon.id]: http(),
    [polygonAmoy.id]: http(),
  },
})
