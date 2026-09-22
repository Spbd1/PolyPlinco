import { expect } from "chai"
import { ethers } from "hardhat"

const { lossCentricModel, oldModel, SCALE, MINING_SUPPLY, TOKENS_PER_TIER } = require("../scripts/loss-mining-reference.cjs")

describe("Loss-mining precision-safe arithmetic", function () {
  async function deploy() {
    const [owner, player, , dev] = await ethers.getSigners()
    const Mock = await ethers.getContractFactory("LocalVRFCoordinatorV2PlusMock")
    const mock = await Mock.deploy()
    await mock.waitForDeployment()
    const Game = await ethers.getContractFactory("PolyPlinkoGame")
    const game = await Game.deploy(dev.address, await mock.getAddress(), 7, ethers.ZeroHash, 3, 500000, false)
    await game.waitForDeployment()
    await game.seedInitialLiquidityAndBankroll(ethers.parseEther("90000"), { value: ethers.parseEther("100") })
    return { owner, player, dev, mock, game }
  }

  async function setMiningEmitted(game: any, value: bigint) {
    await ethers.provider.send("hardhat_setStorageAt", [
      await game.getAddress(), "0x" + "00".repeat(31) + "14", ethers.zeroPadValue(ethers.toBeHex(value), 32),
    ])
  }

  async function request(game: any, player: any, betPerBall = ethers.parseEther("0.1")) {
    const tx = await game.connect(player).playPlinko(
      { rows: 16, balls: 1, risk: 1, betPerBall }, { value: betPerBall },
    )
    const receipt = await tx.wait()
    return receipt.logs
      .map((log: any) => { try { return game.interface.parseLog(log) } catch { return null } })
      .find((event: any) => event?.name === "GameRequested").args
  }

  async function fulfill(game: any, mock: any, requestId: bigint) {
    const coordinator = await mock.getAddress()
    await ethers.provider.send("hardhat_impersonateAccount", [coordinator])
    await ethers.provider.send("hardhat_setBalance", [coordinator, ethers.toBeHex(ethers.parseEther("1"))])
    try {
      const tx = await game.connect(await ethers.getSigner(coordinator)).rawFulfillRandomWords(
        requestId, [1], { gasLimit: 2_000_000 },
      )
      return await tx.wait()
    } finally {
      await ethers.provider.send("hardhat_stopImpersonatingAccount", [coordinator])
    }
  }

  it("settles the exact former zero-progress boundary case and releases liability", async function () {
    const { game, player, mock } = await deploy()
    const tier = await game.TOKENS_PER_TIER()
    await setMiningEmitted(game, tier)
    const requested = await request(game, player)
    const lockedBefore = await game.lockedBankroll()
    const receipt = await fulfill(game, mock, requested.requestId)
    const settled = await game.games(requested.gameId)

    expect(receipt.status).to.equal(1)
    expect(settled.settled).to.equal(true)
    expect(await game.lockedBankroll()).to.be.lt(lockedBefore)
  })

  it("preserves scaled loss across every tier and handles token-wei dust", function () {
    for (const loss of [0n, 1n, 2n, 3n, 9n, 10n, 11n, 49n, 50n, 51n, SCALE, 10n * SCALE]) {
      for (const start of [0n, 1n, TOKENS_PER_TIER - 1n, TOKENS_PER_TIER, MINING_SUPPLY - 1n]) {
        const result = lossCentricModel(loss, start)
        expect(result.totalMinted).to.be.gte(0n)
        expect(result.miningEmitted).to.be.lte(MINING_SUPPLY)
        expect(result.remainingLossX18).to.be.lte(loss * SCALE)
        for (const tier of result.tiers) {
          expect(tier.costX18).to.be.gt(0n)
          expect(tier.costX18).to.be.lte(loss * SCALE)
        }
      }
    }
  })

  it("matches the independent model across deterministic multi-tier states", function () {
    let seed = 0x123456789n
    for (let index = 0; index < 2_000; index++) {
      seed = (seed * 6364136223846793005n + 1442695040888963407n) & ((1n << 64n) - 1n)
      const loss = seed % (2_560n * SCALE)
      seed = (seed * 6364136223846793005n + 1442695040888963407n) & ((1n << 64n) - 1n)
      const start = seed % MINING_SUPPLY
      const result = lossCentricModel(loss, start)
      expect(result.miningEmitted - start).to.equal(result.totalMinted)
      expect(result.remainingLossX18 + result.tiers.reduce((sum: bigint, tier: any) => sum + tier.costX18, 0n))
        .to.equal(loss * SCALE)
    }
  })

  it("identifies the old reverse-conversion zero-progress state", function () {
    const loss = 33_470_000_000_000_000n
    const start = 100_000n * SCALE
    const old = oldModel(loss, start, 1_000n)
    const next = lossCentricModel(loss, start)
    expect(old.terminated).to.equal(false)
    expect(old.iterations).to.equal(1_000n)
    expect(next.totalMinted).to.equal(1_115_666_666_666_666_666n)
    expect(next.remainingLossX18).to.equal(20_000_000_000_000_000n)
  })
})
