const fs = require("node:fs")

const artifact = JSON.parse(fs.readFileSync("artifacts/contracts/PolyPlinkoGame.sol/PolyPlinkoGame.json", "utf8"))
const source = fs.readFileSync("lib/contracts.ts", "utf8")
const required = [
  "playPlinko", "getPlayerGames", "getLossMiningTierInfo", "getSwapQuoteMaticToTokens",
  "getSwapQuoteTokensToMatic", "swapExactMaticForTokens", "swapExactTokensForMatic",
  "buybackAndBurn", "getAvailableBankroll", "GameSettled", "GameRequested",
]
const names = new Set(artifact.abi.filter((x) => x.name).map((x) => x.name))
const abiMissing = required.filter((name) => !names.has(name))
const sourceMissing = required.filter((name) => !source.includes(name))
const missing = [...new Set([...abiMissing, ...sourceMissing])]
if (missing.length) throw new Error(`Contract ABI drift detected: ${missing.join(", ")}`)
console.log(`ABI check passed (${required.length} frontend-facing entries)`) 
