import { ethers } from "hardhat"

const SEED = BigInt(process.env.STRESS_SEED || "0x5eedc0de")
const ACTIONS = Number(process.env.STRESS_ACTIONS || 1000)

function nextRandom(state: bigint): bigint {
  return (state * 1103515245n + 12345n) & 0x7fffffffn
}

async function main() {
  const [owner, playerA, playerB] = await ethers.getSigners()
  const mock = await (await ethers.getContractFactory("LocalVRFCoordinatorV2PlusMock")).deploy()
  await mock.waitForDeployment()
  const game = await (await ethers.getContractFactory("PolyPlinkoGame")).deploy(
    owner.address, await mock.getAddress(), 7, ethers.ZeroHash, 3, 500000, false,
  )
  await game.waitForDeployment()
  const token = await ethers.getContractAt("PolyPlinkoToken", await game.pplToken())
  await (await game.seedInitialLiquidityAndBankroll(ethers.parseEther("90000"), { value: ethers.parseEther("100") })).wait()

  const players = [playerA, playerB]
  const rows = [8, 12, 16, 20, 24, 28, 32]
  const balls = [1, 2, 4, 8, 16, 32, 64, 128, 256]
  const pending: Array<{ requestId: bigint; gameId: bigint }> = []
  let state = SEED
  let transitions = 0
  let swaps = 0
  let failedReceivers = 0
  let expectedRejectedGames = 0

  const assertInvariants = async () => {
    const balance = await ethers.provider.getBalance(await game.getAddress())
    const protectedNative = (await game.houseBankroll()) + (await game.reserveMatic()) + (await game.vaultMatic()) + (await game.totalPendingWithdrawals()) + (await game.devFeesAccrued())
    if (protectedNative > balance) throw new Error(`native accounting exceeded assets at transition ${transitions}`)
    if ((await game.lockedBankroll()) > (await game.houseBankroll())) throw new Error(`locked bankroll exceeded house bankroll at transition ${transitions}`)
    if ((await game.houseBankroll()) > balance) throw new Error(`house bankroll exceeded assets at transition ${transitions}`)
    if ((await game.totalPendingWithdrawals()) > balance) throw new Error(`claim liabilities exceeded assets at transition ${transitions}`)
    if ((await game.reserveToken()) > (await token.balanceOf(await game.getAddress()))) throw new Error(`AMM token reserve exceeded token balance at transition ${transitions}`)
    if ((await token.totalSupply()) > (await token.MAX_SUPPLY())) throw new Error(`supply cap exceeded at transition ${transitions}`)
  }

  const captureAttemptState = async () => [
    await ethers.provider.getBalance(await game.getAddress()),
    await game.gameIdCounter(),
    await game.houseBankroll(),
    await game.lockedBankroll(),
    await game.totalPendingWithdrawals(),
    await game.devFeesAccrued(),
    await game.reserveMatic(),
    await game.reserveToken(),
    await game.vaultMatic(),
    await token.totalSupply(),
  ] as const

  for (let i = 0; i < ACTIONS; i++) {
    state = nextRandom(state)
    await ethers.provider.send("evm_increaseTime", [2])
    await ethers.provider.send("evm_mine", [])
    const player = players[i % players.length]
    const row = rows[Number(state % BigInt(rows.length))]
    state = nextRandom(state)
    const ballCount = balls[Number(state % BigInt(balls.length))]
    state = nextRandom(state)
    const risk = Number(state % 3n)
    const betPerBall = ethers.parseEther(i % 17 === 0 ? "0.01" : "0.001")
    const stateBeforeAttempt = await captureAttemptState()
    let tx
    try {
      tx = await game.connect(player).playPlinko({ rows: row, balls: ballCount, risk, betPerBall }, { value: betPerBall * BigInt(ballCount) })
    } catch (error) {
      const message = String(error)
      const expectedBankrollRejection = message.includes("reverted with reason string 'Insufficient available bankroll'")
      const expectedRiskRejection = message.includes("reverted with reason string 'Game exceeds bankroll risk limit'")
      if (!expectedBankrollRejection && !expectedRiskRejection) throw error
      expectedRejectedGames++
      const stateAfterAttempt = await captureAttemptState()
      if (stateAfterAttempt.some((value, index) => value !== stateBeforeAttempt[index])) {
        throw new Error(`expected bankroll rejection mutated state at attempted action ${i}`)
      }
      await assertInvariants()
      continue
    }
    const receipt = await tx.wait()
    const requested = receipt.logs.map((log) => { try { return game.interface.parseLog(log) } catch { return null } }).find((parsed) => parsed?.name === "GameRequested")
    if (!requested) throw new Error(`missing GameRequested at transition ${transitions}`)
    pending.push({ requestId: requested.args.requestId, gameId: requested.args.gameId })
    transitions++

    if (pending.length >= 3 || i === ACTIONS - 1) {
      state = nextRandom(state)
      const index = Number(state % BigInt(pending.length))
      const selected = pending.splice(index, 1)[0]
      await (await mock.fulfill(selected.requestId, state)).wait()
      const settled = await game.games(selected.gameId)
      if (!settled.settled) throw new Error(`game ${selected.gameId} did not settle`)
      if ((await game.games(selected.gameId)).settled !== true) throw new Error(`game ${selected.gameId} settled more than once`)
    }

    if (i > 0 && i % 20 === 0) {
      const nativeIn = ethers.parseEther("0.01")
      const quote = await game.getSwapQuoteMaticToTokens(nativeIn)
      await (await game.connect(player).swapExactMaticForTokens(quote, { value: nativeIn })).wait()
      const tokenBalance = await token.balanceOf(player.address)
      if (tokenBalance > 0n) {
        const tokenIn = tokenBalance / 2n
        if (tokenIn > 0n) {
          const tokenQuote = await game.getSwapQuoteTokensToMatic(tokenIn)
          await (await token.connect(player).approve(await game.getAddress(), tokenIn)).wait()
          await (await game.connect(player).swapExactTokensForMatic(tokenIn, tokenQuote)).wait()
        }
      }
      swaps += 2
    }

    // Exercise the failed-receiver path periodically. The payout becomes a
    // pull liability and must remain protected without blocking later games.
    if (i > 0 && i % 100 === 0) {
      const receiver = await (await ethers.getContractFactory("RevertingPlayer")).deploy()
      await receiver.waitForDeployment()
      const receiverTx = await receiver.play(await game.getAddress(), ethers.parseEther("0.01"), { value: ethers.parseEther("0.01") })
      const receiverReceipt = await receiverTx.wait()
      const receiverRequest = receiverReceipt.logs.map((log) => { try { return game.interface.parseLog(log) } catch { return null } }).find((parsed) => parsed?.name === "GameRequested")
      if (!receiverRequest) throw new Error(`missing failed-receiver request at transition ${transitions}`)
      await (await mock.fulfill(receiverRequest.args.requestId, nextRandom(state))).wait()
      failedReceivers++
    }

    await assertInvariants()
  }

  while (pending.length > 0) {
    const selected = pending.pop()!
    await (await mock.fulfill(selected.requestId, nextRandom(state))).wait()
  }
  await assertInvariants()
  console.log(JSON.stringify({ seed: `0x${SEED.toString(16)}`, actions: transitions, attemptedActions: ACTIONS, expectedRejectedGames, sequences: 1, swaps, failedReceivers, unexpectedFailures: 0 }))
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
