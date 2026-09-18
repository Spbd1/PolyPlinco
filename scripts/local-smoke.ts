import { ethers } from "hardhat"

async function main() {
  const [, player] = await ethers.getSigners()
  const address = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS
  if (!address) throw new Error("NEXT_PUBLIC_GAME_CONTRACT_ADDRESS is required")
  const game = await ethers.getContractAt("PolyPlinkoGame", address)
  const token = await ethers.getContractAt("PolyPlinkoToken", await game.pplToken())
  const before = await token.balanceOf(player.address)
  const config = { rows: 16, balls: 2, risk: 1, betPerBall: ethers.parseEther("0.01") }
  const tx = await game.connect(player).playPlinko(config, { value: ethers.parseEther("0.02") })
  const receipt = await tx.wait()
  const requested = receipt?.logs.map((log) => { try { return game.interface.parseLog(log) } catch { return null } }).find((x) => x?.name === "GameRequested")
  if (requested) await (await ethers.getContractAt("LocalVRFCoordinatorV2PlusMock", await game.randomnessCoordinator())).fulfill(requested.args.requestId, 0)
  const settled = await game.games(requested?.args.gameId || 0)
  const after = await token.balanceOf(player.address)
  const quote = await game.getSwapQuoteMaticToTokens(ethers.parseEther("1"))
  await (await game.connect(player).swapExactMaticForTokens(quote, { value: ethers.parseEther("1") })).wait()
  console.log(JSON.stringify({ gameId: (requested?.args.gameId || 0).toString(), payout: settled.totalPayout.toString(), tokensEarned: (after - before).toString(), swapQuote: quote.toString(), block: receipt?.blockNumber }))
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
