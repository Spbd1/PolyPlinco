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
    await mock.fulfill(requested.requestId, 1)
    await expect(mock.fulfill(requested.requestId, 2)).to.be.revertedWith("Already fulfilled")
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
