import { ethers } from "hardhat"

async function deployFixture() {
  const [owner, player] = await ethers.getSigners()
  const mock = await (await ethers.getContractFactory("LocalVRFCoordinatorV2PlusMock")).deploy()
  const deployReceipt = await mock.deploymentTransaction()?.wait()
  const game = await (await ethers.getContractFactory("PolyPlinkoGame")).deploy(
    owner.address, await mock.getAddress(), 0, ethers.ZeroHash, 3, 2_000_000, false,
  )
  const gameReceipt = await game.deploymentTransaction()?.wait()
  await game.seedInitialLiquidityAndBankroll(ethers.parseEther("90000"), { value: ethers.parseEther("100") })
  return { owner, player, mock, game, deployReceipt, gameReceipt }
}

async function measureCallback(balls: number, postMining: boolean, seed: bigint) {
  const { player, mock, game } = await deployFixture()
  if (postMining) {
    await ethers.provider.send("hardhat_setStorageAt", [
      await game.getAddress(),
      ethers.zeroPadValue("0x14", 32),
      ethers.zeroPadValue(ethers.toBeHex(await game.MINING_SUPPLY()), 32),
    ])
  }
  const betPerBall = ethers.parseEther("0.01")
  const tx = await game.connect(player).playPlinko(
    { rows: 16, balls, risk: 1, betPerBall },
    { value: betPerBall * BigInt(balls) },
  )
  const receipt = await tx.wait()
  const requested = receipt!.logs
    .map((log) => { try { return game.interface.parseLog(log) } catch { return null } })
    .find((event) => event?.name === "GameRequested")
  if (!requested) throw new Error("GameRequested event missing")
  const estimated = await mock.fulfill.estimateGas(requested.args.requestId, seed)
  const fulfillReceipt = await (await mock.fulfill(requested.args.requestId, seed)).wait()
  const settled = await game.games(requested.args.gameId)
  return {
    balls,
    postMining,
    seed: seed.toString(),
    estimate: estimated.toString(),
    actual: fulfillReceipt?.gasUsed?.toString(),
    totalPayout: settled.totalPayout.toString(),
    netBet: (betPerBall * BigInt(balls) * 99n / 100n).toString(),
    burned: (await game.totalTokensBurned()).toString(),
  }
}

async function main() {
  const ballCounts = [1, 32, 128, 256]
  const regular = []
  for (const balls of ballCounts) regular.push(await measureCallback(balls, false, 1n))

  // Seed 1 is a losing 256-ball post-mining path in this local fixture, so
  // this includes the fixed PPL split and real burn in the callback estimate.
  const postMining256 = await measureCallback(256, true, 1n)
  const base = await deployFixture()
  const oneBall = await base.game.connect(base.player).playPlinko.estimateGas(
    { rows: 16, balls: 1, risk: 1, betPerBall: ethers.parseEther("0.01") },
    { value: ethers.parseEther("0.01") },
  )

  console.log(JSON.stringify({
    network: "hardhat/local",
    deployment: { coordinator: base.deployReceipt?.gasUsed?.toString(), game: base.gameReceipt?.gasUsed?.toString() },
    gameCreateOneBall: oneBall.toString(),
    callbackByBalls: regular,
    postMiningCallback256: postMining256,
    callbackGasLimit: "2000000",
    note: "256 balls is the application maximum; callbackGasLimit must retain safety headroom for the measured post-mining branch.",
  }, null, 2))
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
