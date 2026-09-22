const fs = require("node:fs")

const source = fs.readFileSync("scripts/deploy.ts", "utf8")

const checks = [
  [/expectedChainId/, "chain-id guard"],
  [/DEPLOY_MAINNET.*YES_I_UNDERSTAND_POLYGON_MAINNET/, "explicit mainnet opt-in"],
  [/VRF_COORDINATOR is required outside local development/, "coordinator required"],
  [/VRF_SUBSCRIPTION_ID is required outside local development/, "subscription required"],
  [/VRF_KEY_HASH is required outside local development/, "key hash required"],
  [/const localMode = false/, "public deployment localMode disabled"],
  [/callbackGasLimit/, "callback gas configured"],
  [/new PolyPlinkoToken|pplToken/, "token deployment path"],
]

for (const [pattern, label] of checks) {
  if (!pattern.test(source)) throw new Error(`Deployment configuration check failed: ${label}`)
}

console.log(`Deployment configuration checks passed (${checks.length})`)
