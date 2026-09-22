import fs from "node:fs"
import path from "node:path"
import hre, { ethers } from "hardhat"

type Spec = {
  token: Record<string, any>
  mining: Record<string, any>
  game: Record<string, any>
  fees: Record<string, any>
  treasury: Record<string, any>
  postMining: Record<string, any>
  amm: Record<string, any>
  vrf: Record<string, any>
}

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`)
}

function assertSource(source: string, expression: RegExp, label: string) {
  if (!expression.test(source)) throw new Error(`${label}: source guard not found`)
}

async function main() {
  const spec = JSON.parse(fs.readFileSync(path.join(process.cwd(), "protocol-spec.json"), "utf8")) as Spec
  const gameSource = fs.readFileSync(path.join(process.cwd(), "contracts/PolyPlinkoGame.sol"), "utf8")

  const [owner] = await ethers.getSigners()
  const mock = await (await ethers.getContractFactory("LocalVRFCoordinatorV2PlusMock")).deploy()
  await mock.waitForDeployment()
  const game = await (await ethers.getContractFactory("PolyPlinkoGame")).deploy(
    owner.address, await mock.getAddress(), 7, ethers.ZeroHash, 3, spec.vrf.defaultCallbackGasLimit, false,
  )
  await game.waitForDeployment()
  const token = await ethers.getContractAt("PolyPlinkoToken", await game.pplToken())

  assertEqual((await token.MAX_SUPPLY()).toString(), spec.token.maxSupply, "MAX_SUPPLY")
  assertEqual((await token.DEV_ALLOCATION()).toString(), spec.token.developerAllocation, "developer allocation")
  assertEqual((await token.VAULT_ALLOCATION()).toString(), spec.token.gameAllocation, "game allocation")
  assertEqual((await token.MINING_ALLOCATION()).toString(), spec.token.miningAllocation, "mining allocation")
  assertEqual((await game.MINING_SUPPLY()).toString(), spec.token.miningAllocation, "game mining supply")
  assertEqual((await game.TOKENS_PER_TIER()).toString(), spec.mining.tierCapacity, "tier capacity")
  assertEqual((await game.NUM_TIERS()).toString(), String(spec.mining.tierCount), "tier count")
  assertEqual((await game.PRICE_BASE()).toString(), ethers.parseEther(spec.mining.lossCostPerPplNative[0]).toString(), "tier price base")
  assertEqual((await game.PRICE_STEP()).toString(), ethers.parseEther("0.01").toString(), "tier price step")

  assertEqual((await game.SWAP_FEE_PERCENT()).toString(), String(spec.fees.swapBps / 100), "swap fee")
  assertEqual((await game.MAX_GAME_LIABILITY_BPS()).toString(), String(spec.treasury.maxGameLiabilityBps), "liability cap")
  assertEqual((await game.BUYBACK_PERCENT()).toString(), String(spec.postMining.nativeBuybackBps / 100), "native buyback")
  assertEqual((await game.POST_MINING_BURN_BPS()).toString(), String(spec.postMining.purchasedPplBurnBps), "PPL burn")
  assertEqual((await game.BPS_DENOMINATOR()).toString(), "10000", "BPS denominator")
  assertEqual((await game.MAX_SWAP_SIZE()).toString(), ethers.parseEther(spec.amm.maximumSwapInputNative).toString(), "max swap input")
  assertEqual((await game.MIN_LIQUIDITY()).toString(), ethers.parseEther(spec.amm.minimumLiquidityNative).toString(), "minimum native liquidity")
  assertEqual((await game.vrfCallbackGasLimit()).toString(), String(spec.vrf.defaultCallbackGasLimit), "callback gas limit")
  assertEqual((await game.maxBetTotal()).toString(), ethers.parseEther(spec.game.initialMaxBetTotalNative).toString(), "initial max total bet")

  assertSource(gameSource, /config\.rows\s*>=\s*8\s*&&\s*config\.rows\s*<=\s*32/, "row range")
  assertSource(gameSource, /config\.balls\s*>=\s*1\s*&&\s*config\.balls\s*<=\s*256/, "ball range")
  assertSource(gameSource, /enum RiskLevel \{ Low, Medium, High \}/, "risk levels")
  assertSource(gameSource, /uint256 public constant MIN_BET_PER_BALL = 0\.001 ether/, "minimum bet")
  assertSource(gameSource, /uint256 public constant MAX_BET_PER_BALL = 10 ether/, "maximum bet")

  console.log(`Protocol specification check passed on ${hre.network.name}: ${spec.schemaVersion}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
