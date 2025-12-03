import { createConfig, http } from "wagmi"
import { polygon, polygonAmoy } from "wagmi/chains"
import { injected, walletConnect } from "wagmi/connectors"

export const wagmiConfig = createConfig({
  chains: [polygon, polygonAmoy],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "demo",
    }),
  ],
  transports: {
    [polygon.id]: http(),
    [polygonAmoy.id]: http(),
  },
})
