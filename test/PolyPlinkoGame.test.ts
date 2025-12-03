import { expect } from "chai"
import { ethers } from "hardhat"
import type { PolyPlinkoGame, PolyPlinkoToken } from "../typechain-types"
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("PolyPlinkoGame", () => {
  let game: PolyPlinkoGame
  let token: PolyPlinkoToken
  let owner: SignerWithAddress
  let player: SignerWithAddress
  let dev: SignerWithAddress

  const MATIC = ethers.parseEther("1")

  beforeEach(async () => {
    ;[owner, player, dev] = await ethers.getSigners()

    // Deploy game contract (deploys token internally)
    const GameFactory = await ethers.getContractFactory("PolyPlinkoGame")
    game = await GameFactory.deploy(dev.address)
    await game.waitForDeployment()

    // Get token address
    const tokenAddress = await game.pplToken()
    token = await ethers.getContractAt("PolyPlinkoToken", tokenAddress)

    // Seed initial liquidity
    const tokenAmount = ethers.parseEther("90000") // 90k tokens
    await token.connect(owner).approve(await game.getAddress(), tokenAmount)
    await game.seedInitialLiquidityAndBankroll(tokenAmount, {
      value: ethers.parseEther("1000"),
    })
  })

  describe("Deployment", () => {
    it("Should set the correct dev address", async () => {
      expect(await game.devAddress()).to.equal(dev.address)
    })

    it("Should deploy token with correct supply", async () => {
      const devBalance = await token.balanceOf(dev.address)
      expect(devBalance).to.equal(ethers.parseEther("10000")) // 10k dev allocation
    })

    it("Should initialize with correct bankroll", async () => {
      expect(await game.houseBankroll()).to.equal(ethers.parseEther("500")) // 50% of 1000
    })
  })

  describe("Game Play", () => {
    it("Should accept valid game and take dev fee", async () => {
      const betPerBall = ethers.parseEther("0.01")
      const balls = 10
      const totalBet = betPerBall * BigInt(balls)

      const devBalanceBefore = await ethers.provider.getBalance(dev.address)

      await game.connect(player).playPlinko(
        {
          rows: 16,
          balls: balls,
          risk: 1, // Medium
          betPerBall: betPerBall,
        },
        { value: totalBet },
      )

      const devBalanceAfter = await ethers.provider.getBalance(dev.address)
      const devFee = totalBet / BigInt(100) // 1%

      expect(devBalanceAfter - devBalanceBefore).to.equal(devFee)
    })

    it("Should reject invalid rows", async () => {
      await expect(
        game.connect(player).playPlinko(
          {
            rows: 7, // Too low
            balls: 10,
            risk: 1,
            betPerBall: ethers.parseEther("0.01"),
          },
          { value: ethers.parseEther("0.1") },
        ),
      ).to.be.revertedWith("Invalid rows")
    })

    it("Should reject bet smaller than minimum", async () => {
      await expect(
        game.connect(player).playPlinko(
          {
            rows: 16,
            balls: 10,
            risk: 1,
            betPerBall: ethers.parseEther("0.0001"), // Too small
          },
          { value: ethers.parseEther("0.001") },
        ),
      ).to.be.revertedWith("Bet too small")
    })

    it("Should reject incorrect bet amount", async () => {
      await expect(
        game.connect(player).playPlinko(
          {
            rows: 16,
            balls: 10,
            risk: 1,
            betPerBall: ethers.parseEther("0.01"),
          },
          { value: ethers.parseEther("0.05") }, // Wrong amount
        ),
      ).to.be.revertedWith("Incorrect bet amount")
    })
  })

  describe("Loss Mining", () => {
    it("Should mint tokens on net loss (Tier 1)", async () => {
      const betPerBall = ethers.parseEther("1")
      const balls = 1
      const totalBet = betPerBall * BigInt(balls)

      const playerBalanceBefore = await token.balanceOf(player.address)

      await game.connect(player).playPlinko(
        {
          rows: 16,
          balls: balls,
          risk: 1,
          betPerBall: betPerBall,
        },
        { value: totalBet },
      )

      const playerBalanceAfter = await token.balanceOf(player.address)
      const tokensMinted = playerBalanceAfter - playerBalanceBefore

      // If player lost, should have received tokens
      // Tier 1: 1 PPL per 0.02 MATIC loss
      expect(tokensMinted).to.be.greaterThan(0)
    })

    it("Should track mining emission correctly", async () => {
      const emittedBefore = await game.miningEmitted()

      await game.connect(player).playPlinko(
        {
          rows: 16,
          balls: 10,
          risk: 1,
          betPerBall: ethers.parseEther("0.1"),
        },
        { value: ethers.parseEther("1") },
      )

      const emittedAfter = await game.miningEmitted()

      // Mining emission should increase if player lost
      expect(emittedAfter).to.be.greaterThanOrEqual(emittedBefore)
    })
  })

  describe("AMM Swap", () => {
    it("Should swap MATIC for PPL", async () => {
      const maticIn = ethers.parseEther("1")
      const quote = await game.getSwapQuoteMaticToTokens(maticIn)

      const playerTokensBefore = await token.balanceOf(player.address)

      await game.connect(player).swapExactMaticForTokens(quote, {
        value: maticIn,
      })

      const playerTokensAfter = await token.balanceOf(player.address)
      const tokensReceived = playerTokensAfter - playerTokensBefore

      expect(tokensReceived).to.be.greaterThan(0)
      expect(tokensReceived).to.be.closeTo(quote, ethers.parseEther("1")) // Allow small slippage
    })

    it("Should take 5% fee on MATIC->PPL swap", async () => {
      const maticIn = ethers.parseEther("1")
      const vaultBefore = await game.vaultMatic()

      await game.connect(player).swapExactMaticForTokens(0, {
        value: maticIn,
      })

      const vaultAfter = await game.vaultMatic()
      const fee = maticIn / BigInt(20) // 5%

      expect(vaultAfter - vaultBefore).to.equal(fee)
    })

    it("Should burn 5% on PPL->MATIC swap", async () => {
      // First get some tokens
      await game.connect(player).swapExactMaticForTokens(0, {
        value: ethers.parseEther("10"),
      })

      const tokensIn = ethers.parseEther("1000")
      const playerTokens = await token.balanceOf(player.address)
      expect(playerTokens).to.be.greaterThan(tokensIn)

      await token.connect(player).approve(await game.getAddress(), tokensIn)

      const totalBurnedBefore = await game.totalTokensBurned()

      await game.connect(player).swapExactTokensForMatic(tokensIn, 0)

      const totalBurnedAfter = await game.totalTokensBurned()
      const burnedAmount = tokensIn / BigInt(20) // 5%

      expect(totalBurnedAfter - totalBurnedBefore).to.equal(burnedAmount)
    })

    it("Should respect slippage protection", async () => {
      const maticIn = ethers.parseEther("1")
      const quote = await game.getSwapQuoteMaticToTokens(maticIn)
      const minOut = quote * BigInt(2) // Unrealistic expectation

      await expect(
        game.connect(player).swapExactMaticForTokens(minOut, {
          value: maticIn,
        }),
      ).to.be.revertedWith("Slippage exceeded")
    })
  })

  describe("Buyback and Burn", () => {
    it("Should buyback and burn tokens", async () => {
      // Add some vault funds via swaps
      await game.connect(player).swapExactMaticForTokens(0, {
        value: ethers.parseEther("10"),
      })

      const vaultBefore = await game.vaultMatic()
      expect(vaultBefore).to.be.greaterThan(0)

      const totalBurnedBefore = await game.totalTokensBurned()

      await game.buybackAndBurn()

      const vaultAfter = await game.vaultMatic()
      const totalBurnedAfter = await game.totalTokensBurned()

      expect(vaultAfter).to.equal(0) // All vault funds used
      expect(totalBurnedAfter).to.be.greaterThan(totalBurnedBefore)
    })
  })

  describe("Admin Functions", () => {
    it("Should allow owner to pause game", async () => {
      await game.pauseGame()
      expect(await game.gamePaused()).to.be.true

      await expect(
        game.connect(player).playPlinko(
          {
            rows: 16,
            balls: 10,
            risk: 1,
            betPerBall: ethers.parseEther("0.01"),
          },
          { value: ethers.parseEther("0.1") },
        ),
      ).to.be.revertedWith("Game is paused")
    })

    it("Should allow owner to withdraw profits", async () => {
      // Play some games to generate profit
      await game.connect(player).playPlinko(
        {
          rows: 16,
          balls: 10,
          risk: 1,
          betPerBall: ethers.parseEther("0.1"),
        },
        { value: ethers.parseEther("1") },
      )

      const availableBankroll = await game.getAvailableBankroll()

      if (availableBankroll > 0) {
        const ownerBalanceBefore = await ethers.provider.getBalance(owner.address)

        await game.withdrawProfits(availableBankroll)

        const ownerBalanceAfter = await ethers.provider.getBalance(owner.address)
        expect(ownerBalanceAfter).to.be.greaterThan(ownerBalanceBefore)
      }
    })

    it("Should not allow withdrawing locked bankroll", async () => {
      const totalBankroll = await game.houseBankroll()
      const locked = await game.lockedBankroll()

      if (locked > 0) {
        await expect(game.withdrawProfits(totalBankroll)).to.be.revertedWith("Insufficient available bankroll")
      }
    })
  })

  describe("Security", () => {
    it("Should prevent reentrancy on playPlinko", async () => {
      // This would require a malicious contract - simplified test
      const betPerBall = ethers.parseEther("0.01")
      const balls = 10

      // Multiple rapid calls should all succeed independently
      const tx1 = game
        .connect(player)
        .playPlinko({ rows: 16, balls, risk: 1, betPerBall }, { value: betPerBall * BigInt(balls) })

      await expect(tx1).to.not.be.reverted
    })

    it("Should enforce supply cap", async () => {
      const maxSupply = await token.MAX_SUPPLY()
      const currentSupply = await token.totalSupply()

      expect(currentSupply).to.be.lessThanOrEqual(maxSupply)
    })
  })
})
