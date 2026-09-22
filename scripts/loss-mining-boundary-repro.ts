import { ethers } from "hardhat"

async function main() {
  const [, player, , dev] = await ethers.getSigners()
  const Mock = await ethers.getContractFactory("LocalVRFCoordinatorV2PlusMock")
  const mock = await Mock.deploy()
  await mock.waitForDeployment()
  const Game = await ethers.getContractFactory("PolyPlinkoGame")
  const game = await Game.deploy(dev.address, await mock.getAddress(), 7, ethers.ZeroHash, 3, 500000, false)
  await game.waitForDeployment()
  await game.seedInitialLiquidityAndBankroll(ethers.parseEther("90000"), { value: ethers.parseEther("100") })

  const tierCapacity = await game.TOKENS_PER_TIER()
  const emitted = tierCapacity
  await ethers.provider.send("hardhat_setStorageAt", [
    await game.getAddress(),
    ethers.zeroPadValue("0x14", 32),
    ethers.zeroPadValue(ethers.toBeHex(emitted), 32),
  ])

  const betPerBall = ethers.parseEther("0.1")
  const tx = await game.connect(player).playPlinko(
    { rows: 16, balls: 1, risk: 1, betPerBall },
    { value: betPerBall },
  )
  const receipt = await tx.wait()
  const requested = receipt.logs
    .map((log: any) => { try { return game.interface.parseLog(log) } catch { return null } })
    .find((event: any) => event?.name === "GameRequested")
  const gameId = requested.args.gameId as bigint
  const requestId = requested.args.requestId as bigint

  const hash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256", "uint256", "uint256"], [1n, gameId, 0n],
  ))
  const roll = BigInt(hash) % 1_000_000n
  let cumulative = 0n
  let slot = 0
  for (let index = 0; index <= 16; index++) {
    cumulative += BigInt(await game.getSlotWeight(16, index))
    if (roll < cumulative) { slot = index; break }
  }
  const multiplier = BigInt(await game.getSlotMultiplier(16, 1, slot))
  const payout = (betPerBall * multiplier) / 10_000n
  const devFee = betPerBall / 100n
  const netLoss = betPerBall > devFee + payout ? betPerBall - devFee - payout : 0n
  const price = (await game.PRICE_BASE()) + (await game.PRICE_STEP()) * (emitted / tierCapacity)
  const tierRemaining = tierCapacity - (emitted % tierCapacity)
  const tokensAffordable = (netLoss * 1_000_000_000_000_000_000n) / price
  const tokensToMint = tokensAffordable < tierRemaining ? tokensAffordable : tierRemaining
  const lossConsumed = (tokensToMint * price) / 1_000_000_000_000_000_000n

  console.log(JSON.stringify({
    gameId: gameId.toString(), requestId: requestId.toString(), rows: 16, balls: 1,
    betPerBall: betPerBall.toString(), roll: roll.toString(), slot,
    multiplierBps: multiplier.toString(), payout: payout.toString(), devFee: devFee.toString(),
    netLoss: netLoss.toString(), emitted: emitted.toString(), currentTier: (emitted / tierCapacity).toString(),
    tierStart: (emitted / tierCapacity * tierCapacity).toString(),
    tierEnd: ((emitted / tierCapacity + 1n) * tierCapacity).toString(),
    tierRemaining: tierRemaining.toString(), pricePerToken: price.toString(),
    tokensAffordable: tokensAffordable.toString(), tokensToMint: tokensToMint.toString(),
    lossConsumed: lossConsumed.toString(), callbackGasLimit: "2000000",
  }, null, 2))

  const coordinator = await mock.getAddress()
  await ethers.provider.send("hardhat_impersonateAccount", [coordinator])
  await ethers.provider.send("hardhat_setBalance", [coordinator, ethers.toBeHex(ethers.parseEther("1"))])
  try {
    const callback = await game.connect(await ethers.getSigner(coordinator)).rawFulfillRandomWords(
      requestId, [1], { gasLimit: 2_000_000 },
    )
    const callbackReceipt = await callback.wait()
    console.log(`callback: settled (gasUsed=${callbackReceipt?.gasUsed?.toString()})`)
  } catch (error: any) {
    console.log(`callback: failed (${error.shortMessage || error.message})`)
  } finally {
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [coordinator])
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
