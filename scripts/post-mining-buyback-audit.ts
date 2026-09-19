import { ethers } from "hardhat"

type Snapshot = {
  totalSupply: string
  ammPplReserve: string
  ammNativeReserve: string
  gamePplBalance: string
  playerPplBalance: string
  devPplBalance: string
  houseBankroll: string
  vaultMatic: string
  devFeesAccrued: string
  lockedBankroll: string
  actualNativeBalance: string
}

async function snapshot(game: any, token: any, player: string, dev: string): Promise<Snapshot> {
  const gameAddress = await game.getAddress()
  return {
    totalSupply: (await token.totalSupply()).toString(),
    ammPplReserve: (await game.reserveToken()).toString(),
    ammNativeReserve: (await game.reserveMatic()).toString(),
    gamePplBalance: (await token.balanceOf(gameAddress)).toString(),
    playerPplBalance: (await token.balanceOf(player)).toString(),
    devPplBalance: (await token.balanceOf(dev)).toString(),
    houseBankroll: (await game.houseBankroll()).toString(),
    vaultMatic: (await game.vaultMatic()).toString(),
    devFeesAccrued: (await game.devFeesAccrued()).toString(),
    lockedBankroll: (await game.lockedBankroll()).toString(),
    actualNativeBalance: (await ethers.provider.getBalance(gameAddress)).toString(),
  }
}

function delta(after: Snapshot, before: Snapshot): Record<string, string> {
  const result: Record<string, string> = {}
  for (const key of Object.keys(before) as Array<keyof Snapshot>) {
    result[key] = (BigInt(after[key]) - BigInt(before[key])).toString()
  }
  return result
}

async function main() {
  const [owner, player] = await ethers.getSigners()
  const mock = await (await ethers.getContractFactory("LocalVRFCoordinatorV2PlusMock")).deploy()
  await mock.waitForDeployment()
  const game = await (await ethers.getContractFactory("PolyPlinkoGame")).deploy(
    owner.address, await mock.getAddress(), 7, ethers.ZeroHash, 3, 2_000_000, false,
  )
  await game.waitForDeployment()
  const token = await ethers.getContractAt("PolyPlinkoToken", await game.pplToken())

  await game.seedInitialLiquidityAndBankroll(ethers.parseEther("90000"), { value: ethers.parseEther("100") })

  const miningSupply = await game.MINING_SUPPLY()
  await ethers.provider.send("hardhat_setStorageAt", [
    await game.getAddress(),
    ethers.zeroPadValue("0x14", 32),
    ethers.zeroPadValue(ethers.toBeHex(miningSupply), 32),
  ])

  const before = await snapshot(game, token, player.address, owner.address)
  const bet = ethers.parseEther("0.01")
  const playTx = await game.connect(player).playPlinko(
    { rows: 16, balls: 1, risk: 1, betPerBall: bet },
    { value: bet },
  )
  const playReceipt = await playTx.wait()
  const requested = playReceipt.logs
    .map((log: any) => { try { return game.interface.parseLog(log) } catch { return null } })
    .find((parsed: any) => parsed?.name === "GameRequested")
  if (!requested) throw new Error("GameRequested event not found")

  const fulfillmentSeed = BigInt(process.env.VRF_SEED || "0")
  const fulfillReceipt = await (await mock.fulfill(requested.args.requestId, fulfillmentSeed)).wait()
  const after = await snapshot(game, token, player.address, owner.address)
  const settled = await game.games(requested.args.gameId)
  const settledEvents = fulfillReceipt.logs
    .map((log: any) => { try { return game.interface.parseLog(log) } catch { return null } })
    .filter(Boolean)
    .map((event: any) => ({ name: event.name, args: Object.fromEntries(event.fragment.inputs.map((input: any, i: number) => [input.name || String(i), String(event.args[i])])) }))

  const ownerBurnBefore = {
    totalSupply: (await token.totalSupply()).toString(),
    reservePpl: (await game.reserveToken()).toString(),
    gamePplBalance: (await token.balanceOf(await game.getAddress())).toString(),
    vaultMatic: (await game.vaultMatic()).toString(),
  }
  const feeSwap = await game.connect(player).swapExactMaticForTokens(0, { value: ethers.parseEther("0.1") })
  await feeSwap.wait()
  const ownerBuyback = await game.connect(owner).buybackAndBurn()
  const ownerBuybackReceipt = await ownerBuyback.wait()
  const ownerBurnAfter = {
    totalSupply: (await token.totalSupply()).toString(),
    reservePpl: (await game.reserveToken()).toString(),
    gamePplBalance: (await token.balanceOf(await game.getAddress())).toString(),
    vaultMatic: (await game.vaultMatic()).toString(),
  }
  const ownerEvents = ownerBuybackReceipt.logs
    .map((log: any) => { try { return game.interface.parseLog(log) } catch { return null } })
    .filter(Boolean)
    .map((event: any) => ({ name: event.name, args: Object.fromEntries(event.fragment.inputs.map((input: any, i: number) => [input.name || String(i), String(event.args[i])])) }))
  const buybackEvent = settledEvents.find((event: any) => event.name === "BuybackToPlayer")
  const boughtPpl = buybackEvent ? BigInt(buybackEvent.args.tokensBought) : 0n
  const automaticBurn = BigInt(before.totalSupply) - BigInt(after.totalSupply)
  const automaticPlayerAmount = BigInt(after.playerPplBalance) - BigInt(before.playerPplBalance)

  console.log(JSON.stringify({
    game: await game.getAddress(),
    token: await token.getAddress(),
    player: player.address,
    miningEmitted: (await game.miningEmitted()).toString(),
    gameId: requested.args.gameId.toString(),
    requestId: requested.args.requestId.toString(),
    fulfillmentSeed: fulfillmentSeed.toString(),
    settled: settled.settled,
    totalPayout: settled.totalPayout.toString(),
    before,
    after,
    delta: delta(after, before),
    playTx: playTx.hash,
    fulfillmentTx: fulfillReceipt.hash,
    automaticPlayerBuyback: {
      purchasedPpl: boughtPpl.toString(),
      burnedPpl: automaticBurn.toString(),
      playerPpl: automaticPlayerAmount.toString(),
      splitIdentity: automaticBurn + automaticPlayerAmount === boughtPpl,
    },
    ownerBuybackBurn: {
      feeSwapTx: feeSwap.hash,
      tx: ownerBuyback.hash,
      block: ownerBuybackReceipt.blockNumber,
      before: ownerBurnBefore,
      after: ownerBurnAfter,
      totalSupplyDelta: (BigInt(ownerBurnAfter.totalSupply) - BigInt(ownerBurnBefore.totalSupply)).toString(),
      events: ownerEvents,
    },
    events: settledEvents,
  }, null, 2))
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
