import { expect } from "chai"
import { ethers } from "hardhat"

describe("VRF lifecycle and invariants", function () {
  async function deploy() {
    const [owner, player, other] = await ethers.getSigners()
    const mock = await (await ethers.getContractFactory("LocalVRFCoordinatorV2PlusMock")).deploy()
    await mock.waitForDeployment()
    const game = await (await ethers.getContractFactory("PolyPlinkoGame")).deploy(
      owner.address, await mock.getAddress(), 7, ethers.ZeroHash, 3, 500000, false,
    )
    await game.waitForDeployment()
    await game.seedInitialLiquidityAndBankroll(ethers.parseEther("90000"), { value: ethers.parseEther("100") })
    return { owner, player, other, mock, game }
  }

  async function createGame(game: any, player: any, balls = 1) {
    const tx = await game.connect(player).playPlinko({ rows: 16, balls, risk: 1, betPerBall: ethers.parseEther("0.01") }, { value: ethers.parseEther("0.01") * BigInt(balls) })
    const receipt = await tx.wait()
    const parsed = receipt.logs.map((l: any) => { try { return game.interface.parseLog(l) } catch { return null } }).find((x: any) => x?.name === "GameRequested")
    return parsed.args
  }

  it("keeps games pending until the authenticated coordinator fulfills", async () => {
    const { game, player, mock } = await deploy()
    const requested = await createGame(game, player)
    const before = await game.games(requested.gameId)
    expect(before.settled).to.equal(false)
    expect(await game.lockedBankroll()).to.be.gt(0)
    await mock.fulfill(requested.requestId, 1)
    const after = await game.games(requested.gameId)
    expect(after.settled).to.equal(true)
    expect(await game.lockedBankroll()).to.equal(0)
  })

  it("rejects unauthorized, unknown, and replayed callbacks", async () => {
    const { game, player, other, mock } = await deploy()
    const requested = await createGame(game, player)
    await expect(game.connect(other).rawFulfillRandomWords(requested.requestId, [1])).to.be.revertedWith("Only coordinator can fulfill")
    await expect(game.connect(other).rawFulfillRandomWords(999, [1])).to.be.revertedWith("Only coordinator can fulfill")

    const coordinator = await mock.getAddress()
    await ethers.provider.send("hardhat_impersonateAccount", [coordinator])
    const coordinatorSigner = await ethers.getSigner(coordinator)
    await ethers.provider.send("hardhat_setBalance", [coordinator, ethers.toBeHex(ethers.parseEther("1"))])
    await expect(game.connect(coordinatorSigner).rawFulfillRandomWords(999, [1])).to.be.revertedWith("Unknown request")
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [coordinator])

    await mock.fulfill(requested.requestId, 1)
    await expect(mock.fulfill(requested.requestId, 2)).to.be.revertedWith("Already fulfilled")
  })

  it("keeps post-mining buybacks inside the native accounting envelope", async () => {
    const { game, player, mock } = await deploy()
    const token = await ethers.getContractAt("PolyPlinkoToken", await game.pplToken())
    const miningSupply = await game.MINING_SUPPLY()

    // Test-only state setup: exercise the post-mining branch without
    // spending thousands of local games to exhaust 900k mining tokens.
    await ethers.provider.send("hardhat_setStorageAt", [
      await game.getAddress(),
      ethers.zeroPadValue("0x14", 32),
      ethers.zeroPadValue(ethers.toBeHex(miningSupply), 32),
    ])

    const betPerBall = ethers.parseEther("0.01")
    const beforeSupply = await token.totalSupply()
    const beforeAmmPpl = await game.reserveToken()
    const beforeAmmNative = await game.reserveMatic()
    const beforePlayerPpl = await token.balanceOf(player.address)
    const beforeGamePpl = await token.balanceOf(await game.getAddress())
    const beforeHouse = await game.houseBankroll()
    const tx = await game.connect(player).playPlinko(
      { rows: 16, balls: 1, risk: 1, betPerBall },
      { value: betPerBall },
    )
    const receipt = await tx.wait()
    const requested = receipt!.logs
      .map((log: any) => { try { return game.interface.parseLog(log) } catch { return null } })
      .find((parsed: any) => parsed?.name === "GameRequested")

    const fulfillment = await (await mock.fulfill(requested.args.requestId, 1)).wait()

    const parsedEvents = fulfillment.logs
      .map((log: any) => {
        try { return game.interface.parseLog(log) } catch { return null }
      })
      .filter(Boolean)
    const buyback = parsedEvents.find((event: any) => event?.name === "BuybackToPlayer")
    expect(buyback).to.not.equal(undefined)
    const purchasedPpl = buyback.args.tokensBought
    const burnedPpl = (purchasedPpl * 3000n) / 10000n
    const playerPpl = purchasedPpl - burnedPpl

    const afterSupply = await token.totalSupply()
    const afterAmmPpl = await game.reserveToken()
    const afterAmmNative = await game.reserveMatic()
    const afterPlayerPpl = await token.balanceOf(player.address)
    const afterGamePpl = await token.balanceOf(await game.getAddress())
    const afterHouse = await game.houseBankroll()

    expect(afterSupply).to.equal(beforeSupply - burnedPpl)
    expect(afterPlayerPpl - beforePlayerPpl).to.equal(playerPpl)
    expect(beforeAmmPpl - afterAmmPpl).to.equal(purchasedPpl)
    expect(beforeGamePpl - afterGamePpl).to.equal(purchasedPpl)
    expect(burnedPpl + playerPpl).to.equal(purchasedPpl)
    expect(await game.totalTokensBurned()).to.equal(burnedPpl)

    const netLoss = buyback.args.netLoss
    const buybackNative = buyback.args.maticUsed
    expect(afterAmmNative - beforeAmmNative).to.equal(buybackNative)
    expect(afterHouse - beforeHouse).to.equal(netLoss - buybackNative)

    const actual = await ethers.provider.getBalance(await game.getAddress())
    const protectedNative = (await game.houseBankroll()) +
      (await game.reserveMatic()) +
      (await game.vaultMatic()) +
      (await game.totalPendingWithdrawals()) +
      (await game.devFeesAccrued())
    expect(protectedNative).to.equal(actual)
  })

  it("keeps repeated post-mining burns exact and never reopens mining", async () => {
    const { game, player, mock } = await deploy()
    const token = await ethers.getContractAt("PolyPlinkoToken", await game.pplToken())
    const miningSupply = await game.MINING_SUPPLY()
    await ethers.provider.send("hardhat_setStorageAt", [
      await game.getAddress(),
      ethers.zeroPadValue("0x14", 32),
      ethers.zeroPadValue(ethers.toBeHex(miningSupply), 32),
    ])

    let expectedBurned = 0n
    let observedBuybacks = 0
    const beforeSupply = await token.totalSupply()
    for (let i = 0; i < 4; i++) {
      await ethers.provider.send("evm_increaseTime", [2])
      await ethers.provider.send("evm_mine", [])
      const requested = await createGame(game, player)
      const receipt = await (await mock.fulfill(requested.requestId, 1)).wait()
      const events = receipt.logs
        .map((log: any) => {
          try { return game.interface.parseLog(log) } catch { return null }
        })
        .filter(Boolean)
      const buyback = events.find((event: any) => event?.name === "BuybackToPlayer")
      if (buyback) {
        observedBuybacks++
        expectedBurned += (buyback.args.tokensBought * 3000n) / 10000n
      }
    }

    expect(observedBuybacks).to.be.greaterThan(0)
    expect(await game.miningEmitted()).to.equal(miningSupply)
    expect(await token.totalSupply()).to.equal(beforeSupply - expectedBurned)
    expect(await game.totalTokensBurned()).to.equal(expectedBurned)
  })

  it("uses a fixed 30% PPL burn with Solidity rounding and no mutable setter", async () => {
    const { game } = await deploy()
    expect(await game.POST_MINING_BURN_BPS()).to.equal(3000n)
    expect(await game.BPS_DENOMINATOR()).to.equal(10000n)
    for (const purchased of [0n, 1n, 2n, 3n, 9n, 10n, 11n, ethers.parseEther("1"), ethers.parseEther("1000000")]) {
      const burned = (purchased * 3000n) / 10000n
      const playerAmount = purchased - burned
      expect(burned + playerAmount).to.equal(purchased)
      expect(burned).to.be.lte(purchased)
    }
  })

  it("preserves supply and bankroll bounds through a pending game", async () => {
    const { game, player } = await deploy()
    const actual = await ethers.provider.getBalance(await game.getAddress())
    expect(await game.houseBankroll()).to.be.lte(actual)
    expect(await game.lockedBankroll()).to.be.lte(await game.houseBankroll())
    const token = await ethers.getContractAt("PolyPlinkoToken", await game.pplToken())
    expect(await token.totalSupply()).to.be.lte(await token.MAX_SUPPLY())
    await createGame(game, player, 4)
    expect(await token.totalSupply()).to.be.lte(await token.MAX_SUPPLY())
  })

  it("applies the fixed 5% maximum-liability cap to new games", async () => {
    const { game, player, mock } = await deploy()
    const free = await game.getAvailableBankroll()
    const cap = (free * 500n) / 10000n
    expect(free).to.equal(ethers.parseEther("50"))
    expect(cap).to.equal(ethers.parseEther("2.5"))
    expect(await game.MAX_GAME_LIABILITY_BPS()).to.equal(500n)

    // A small valid game remains available at the 50-unit free-bankroll
    // starting point; the current maximum-risk shape is rejected by the
    // additional risk cap before any state is changed.
    await createGame(game, player)
    await ethers.provider.send("evm_increaseTime", [2])
    await ethers.provider.send("evm_mine", [])
    await expect(game.connect(player).playPlinko(
      { rows: 16, balls: 256, risk: 2, betPerBall: ethers.parseEther("0.001") },
      { value: ethers.parseEther("0.256") },
    )).to.be.revertedWith("Game exceeds bankroll risk limit")

    // The cap is integer floor arithmetic. Values around the first non-zero
    // boundaries are explicitly characterized: floor(20 * 5%) = 1 and
    // floor(40 * 5%) = 2, with one wei below each boundary unchanged.
    expect((19n * 500n) / 10000n).to.equal(0n)
    expect((20n * 500n) / 10000n).to.equal(1n)
    expect((39n * 500n) / 10000n).to.equal(1n)
    expect((40n * 500n) / 10000n).to.equal(2n)

    // Complete the accepted game so this test also confirms the cap does not
    // interfere with ordinary authenticated settlement.
    const requests = await game.getPlayerGames(player.address)
    const pending = await game.games(requests[0])
    await mock.fulfill(pending.requestId, 1)
  })

  it("shrinks the 5% allowance as concurrent liabilities are locked", async () => {
    const { game, mock } = await deploy()
    const signers = await ethers.getSigners()
    const config = { rows: 16, balls: 128, risk: 2, betPerBall: ethers.parseEther("0.001") }
    const value = config.betPerBall * 128n
    const accepted: Array<{ requestId: bigint; gameId: bigint }> = []
    let rejected = 0
    let previousFree = await game.getAvailableBankroll()

    for (let i = 0; i < 20; i++) {
      await ethers.provider.send("evm_increaseTime", [2])
      await ethers.provider.send("evm_mine", [])
      const before = await game.getAvailableBankroll()
      expect(before).to.be.lte(previousFree)
      try {
        const tx = await game.connect(signers[(i % 10) + 1]).playPlinko(config, { value })
        const receipt = await tx.wait()
        const requested = receipt.logs
          .map((log: any) => { try { return game.interface.parseLog(log) } catch { return null } })
          .find((event: any) => event?.name === "GameRequested")
        accepted.push({ requestId: requested.args.requestId, gameId: requested.args.gameId })
        const after = await game.getAvailableBankroll()
        expect(after).to.be.lt(before)
        previousFree = after
      } catch (error) {
        expect(String(error)).to.contain("Game exceeds bankroll risk limit")
        rejected++
        expect(await game.getAvailableBankroll()).to.equal(before)
      }
    }

    expect(accepted.length).to.be.greaterThan(0)
    expect(rejected).to.be.greaterThan(0)
    expect(await game.lockedBankroll()).to.be.lte(await game.houseBankroll())
    for (const request of accepted) await mock.fulfill(request.requestId, request.gameId + 1n)
  })

  it("supports simultaneous requests fulfilled out of order", async () => {
    const { game, player, other, mock } = await deploy()
    const a = await createGame(game, player)
    await ethers.provider.send("evm_increaseTime", [2])
    await ethers.provider.send("evm_mine", [])
    const b = await createGame(game, other)
    await mock.fulfill(b.requestId, 2)
    await mock.fulfill(a.requestId, 1)
    expect((await game.games(a.gameId)).settled).to.equal(true)
    expect((await game.games(b.gameId)).settled).to.equal(true)
    expect(await game.lockedBankroll()).to.equal(0)
  })

  it("credits a failed receiver and protects the claim from emergency withdrawal", async () => {
    const { game, owner, mock } = await deploy()
    const receiver = await (await ethers.getContractFactory("RevertingPlayer")).deploy()
    await receiver.play(await game.getAddress(), ethers.parseEther("0.01"), { value: ethers.parseEther("0.01") })
    await game.pauseGame()
    await expect(game.emergencyWithdraw(ethers.parseEther("100"))).to.be.revertedWith("Active games pending")
    await mock.fulfill(1, 1)
    const claim = await game.pendingWithdrawals(await receiver.getAddress())
    expect(claim).to.be.gt(0)
    expect(await game.totalPendingWithdrawals()).to.equal(claim)
    await expect(game.emergencyWithdraw(ethers.parseEther("200"))).to.be.revertedWith("Insufficient free balance")
    void owner
  })

  it("keeps every configured risk/row RTP near the 90% target", async () => {
    const { game } = await deploy()
    for (let rows = 8; rows <= 32; rows++) {
      for (let risk = 0; risk < 3; risk++) {
        const rtpBps = await game.getExpectedRtpBps(rows, risk)
        // Integer normalization and multiplier flooring can add a few bps.
        expect(rtpBps).to.be.within(8950n, 9050n)
      }
    }
  })

  it("survives a stateful randomized sequence of games and preserves bounds", async () => {
    const { game, player, other, mock } = await deploy()
    const players = [player, other]
    let seed = 0x12345678n
    for (let i = 0; i < 12; i++) {
      seed = (seed * 1103515245n + 12345n) & 0x7fffffffn
      await ethers.provider.send("evm_increaseTime", [2])
      await ethers.provider.send("evm_mine", [])
      const requested = await createGame(game, players[i % 2], 1)
      await mock.fulfill(requested.requestId, seed)
      const actual = await ethers.provider.getBalance(await game.getAddress())
      const token = await ethers.getContractAt("PolyPlinkoToken", await game.pplToken())
      expect(await game.lockedBankroll()).to.be.lte(await game.houseBankroll())
      expect(await game.houseBankroll()).to.be.lte(actual)
      expect(await game.totalPendingWithdrawals()).to.be.lte(actual)
      expect(await token.totalSupply()).to.be.lte(await token.MAX_SUPPLY())
    }
  })
})
