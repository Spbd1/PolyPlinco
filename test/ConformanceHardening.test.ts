import { expect } from "chai"
import { ethers } from "hardhat"

describe("Whitepaper conformance hardening", function () {
  async function deploy() {
    const [owner, player, other, dev] = await ethers.getSigners()
    const mock = await (await ethers.getContractFactory("LocalVRFCoordinatorV2PlusMock")).deploy()
    await mock.waitForDeployment()
    const game = await (await ethers.getContractFactory("PolyPlinkoGame")).deploy(
      dev.address, await mock.getAddress(), 7, ethers.ZeroHash, 3, 500000, false,
    )
    await game.waitForDeployment()
    await game.seedInitialLiquidityAndBankroll(ethers.parseEther("90000"), { value: ethers.parseEther("100") })
    const token = await ethers.getContractAt("PolyPlinkoToken", await game.pplToken())
    return { owner, player, other, dev, mock, game, token }
  }

  async function advance() {
    await ethers.provider.send("evm_increaseTime", [2])
    await ethers.provider.send("evm_mine", [])
  }

  async function request(game: any, signer: any, betPerBall = ethers.parseEther("0.01"), balls = 1) {
    const tx = await game.connect(signer).playPlinko(
      { rows: 16, balls, risk: 1, betPerBall },
      { value: betPerBall * BigInt(balls) },
    )
    const receipt = await tx.wait()
    return receipt.logs
      .map((log: any) => { try { return game.interface.parseLog(log) } catch { return null } })
      .find((event: any) => event?.name === "GameRequested").args
  }

  async function setMiningEmitted(game: any, value: bigint) {
    await ethers.provider.send("hardhat_setStorageAt", [
      await game.getAddress(),
      ethers.zeroPadValue("0x14", 32),
      ethers.zeroPadValue(ethers.toBeHex(value), 32),
    ])
  }

  async function fulfillDirect(game: any, mock: any, requestId: bigint, randomness: bigint) {
    const coordinator = await mock.getAddress()
    await ethers.provider.send("hardhat_impersonateAccount", [coordinator])
    await ethers.provider.send("hardhat_setBalance", [coordinator, ethers.toBeHex(ethers.parseEther("1"))])
    const signer = await ethers.getSigner(coordinator)
    try {
      await game.connect(signer).rawFulfillRandomWords(requestId, [randomness], { gasLimit: 2_000_000 })
    } finally {
      await ethers.provider.send("hardhat_stopImpersonatingAccount", [coordinator])
    }
  }

  it("covers tier boundary, final allocation, and permanent exhaustion", async () => {
    const { game, player, mock } = await deploy()
    const tier = await game.TOKENS_PER_TIER()
    const mining = await game.MINING_SUPPLY()

    // Leave one whole token in the tier so the test exercises a real
    // boundary without manufacturing a sub-token remainder that can round
    // lossConsumed to zero.
    await setMiningEmitted(game, tier - ethers.parseEther("1"))
    let before = await game.miningEmitted()
    const first = await request(game, player, ethers.parseEther("0.1"))
    await fulfillDirect(game, mock, first.requestId, 1n)
    expect(await game.miningEmitted()).to.be.gte(before)
    expect(await game.miningEmitted()).to.be.gt(tier)
    expect(await game.miningEmitted()).to.be.lt(tier * 2n)

    await setMiningEmitted(game, tier)
    before = await game.miningEmitted()
    const atBoundary = await request(game, player, ethers.parseEther("0.1"))
    await fulfillDirect(game, mock, atBoundary.requestId, 1n)
    expect(await game.miningEmitted()).to.be.gt(before)
    expect(await game.miningEmitted()).to.be.lt(tier * 2n)

    await setMiningEmitted(game, mining - 1n)
    for (let randomness = 1n; randomness < 32n && (await game.miningEmitted()) < mining; randomness++) {
      const final = await request(game, player, ethers.parseEther("0.1"))
      await fulfillDirect(game, mock, final.requestId, randomness)
    }
    expect(await game.miningEmitted()).to.equal(mining)

    await advance()
    const post = await request(game, player, ethers.parseEther("0.01"))
    const receipt = await (await mock.fulfill(post.requestId, 1)).wait()
    const events = receipt.logs.map((log: any) => {
      try { return game.interface.parseLog(log) } catch { return null }
    })
    expect(events.some((event: any) => event?.name === "BuybackToPlayer")).to.equal(true)
    expect(await game.miningEmitted()).to.equal(mining)
    expect(await game.miningEmitted()).to.be.lte(await game.MINING_SUPPLY())
  })

  it("protects every withdrawal bucket together", async () => {
    const { game, player, other, dev, mock } = await deploy()
    const ClaimingPlayer = await ethers.getContractFactory("ClaimingPlayer")
    const failed = await ClaimingPlayer.deploy()
    await failed.waitForDeployment()

    const pending = await request(game, player)
    expect(await game.devFeesAccrued()).to.be.gt(0)
    await game.connect(player).swapExactMaticForTokens(0, { value: ethers.parseEther("1") })
    expect(await game.vaultMatic()).to.be.gt(0)
    await failed.play(await game.getAddress(), ethers.parseEther("0.01"), { value: ethers.parseEther("0.01") })
    await mock.fulfill((await game.games(pending.gameId)).requestId, 1)
    await mock.fulfill((await game.games(1)).requestId, 1)
    const claim = await game.pendingWithdrawals(await failed.getAddress())
    expect(claim).to.be.gt(0)

    await advance()
    const active = await request(game, other)
    expect(await game.lockedBankroll()).to.be.gt(0)
    await game.pauseGame()
    await expect(game.emergencyWithdraw(1n)).to.be.revertedWith("Active games pending")
    await expect(game.withdrawProfits(await game.houseBankroll())).to.be.revertedWith("Insufficient available bankroll")

    await mock.fulfill(active.requestId, 1)
    const actual = await ethers.provider.getBalance(await game.getAddress())
    const protectedFunds = (await game.reserveMatic()) + (await game.vaultMatic()) +
      (await game.totalPendingWithdrawals()) + (await game.devFeesAccrued())
    await expect(game.emergencyWithdraw(actual - protectedFunds + 1n)).to.be.revertedWith("Insufficient free balance")

    await failed.setRejectPayout(false)
    const beforeClaim = await game.totalPendingWithdrawals()
    await failed.claim(await game.getAddress())
    expect(await game.totalPendingWithdrawals()).to.equal(beforeClaim - claim)
    await expect(failed.claim(await game.getAddress())).to.be.revertedWith("No pending payout")
    expect(await game.devFeesAccrued()).to.be.gt(0)
    expect(await game.reserveMatic()).to.be.gt(0)
    expect(await dev.getAddress()).to.equal(dev.address)
  })

  async function maxMaticForImpact(game: any) {
    const reserve = await game.reserveToken()
    const limit = (reserve * 30n) / 100n
    let low = 1n
    let high = ethers.parseEther("100")
    while (low < high) {
      const mid = (low + high + 1n) / 2n
      const quote = await game.getSwapQuoteMaticToTokens(mid)
      if (quote <= limit) low = mid
      else high = mid - 1n
    }
    return low
  }

  async function maxPplForImpact(game: any) {
    const reserveMatic = await game.reserveMatic()
    const reserveToken = await game.reserveToken()
    const reserveLimit = (reserveMatic * 30n) / 100n
    let low = 1n
    let high = reserveToken
    while (low < high) {
      const mid = (low + high + 1n) / 2n
      const estimated = (mid * reserveMatic) / reserveToken
      const quote = await game.getSwapQuoteTokensToMatic(mid)
      if (estimated <= ethers.parseEther("100") && quote <= reserveLimit) low = mid
      else high = mid - 1n
    }
    return low
  }

  it("enforces the exact native-input AMM impact boundary", async () => {
    const first = await deploy()
    const max = await maxMaticForImpact(first.game)
    expect(max).to.be.gt(0)
    await first.game.connect(first.player).swapExactMaticForTokens(0, { value: max - 1n })

    const exact = await deploy()
    const exactMax = await maxMaticForImpact(exact.game)
    await exact.game.connect(exact.player).swapExactMaticForTokens(0, { value: exactMax })

    const above = await deploy()
    const aboveMax = await maxMaticForImpact(above.game)
    await expect(above.game.connect(above.player).swapExactMaticForTokens(0, { value: aboveMax + 1n }))
      .to.be.revertedWith("Impact too high, reduce swap size")
  })

  it("enforces the exact PPL-input AMM impact boundary", async () => {
    const { game, player, other, dev, token } = await deploy()
    await game.connect(player).swapExactMaticForTokens(0, { value: ethers.parseEther("20") })
    await game.connect(other).swapExactMaticForTokens(0, { value: ethers.parseEther("20") })
    const playerAmount = await token.balanceOf(player.address)
    const otherAmount = await token.balanceOf(other.address)
    await token.connect(dev).transfer(player.address, ethers.parseEther("10000"))
    expect(playerAmount + otherAmount + ethers.parseEther("10000")).to.be.gt(await maxPplForImpact(game))
    const max = await maxPplForImpact(game)
    await token.connect(player).approve(await game.getAddress(), max)
    await game.connect(player).swapExactTokensForMatic(max, 0)

    const fresh = await deploy()
    await fresh.game.connect(fresh.player).swapExactMaticForTokens(0, { value: ethers.parseEther("20") })
    await fresh.game.connect(fresh.other).swapExactMaticForTokens(0, { value: ethers.parseEther("20") })
    const freshMax = await maxPplForImpact(fresh.game)
    await fresh.token.connect(fresh.dev).transfer(fresh.player.address, ethers.parseEther("10000"))
    await fresh.token.connect(fresh.player).approve(await fresh.game.getAddress(), freshMax + 1n)
    await expect(fresh.game.connect(fresh.player).swapExactTokensForMatic(freshMax + 1n, 0))
      .to.be.revertedWith("Impact too high, reduce swap size")
  })
})
