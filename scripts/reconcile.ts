import { ethers } from "hardhat"

const GAME_ADDRESS = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS

async function main() {
  if (!GAME_ADDRESS || !ethers.isAddress(GAME_ADDRESS)) throw new Error("NEXT_PUBLIC_GAME_CONTRACT_ADDRESS must be a deployed contract address")
  const provider = ethers.provider
  const network = await provider.getNetwork()
  const game = await ethers.getContractAt("PolyPlinkoGame", GAME_ADDRESS)
  const tokenAddress = await game.pplToken()
  const token = await ethers.getContractAt("PolyPlinkoToken", tokenAddress)
  const balance = await provider.getBalance(GAME_ADDRESS)
  const gameCount = await game.gameIdCounter()
  const pending: Array<Record<string, string>> = []

  for (let id = 0n; id < gameCount; id++) {
    const stored = await game.games(id)
    if (!stored.settled) {
      pending.push({
        gameId: id.toString(),
        requestId: stored.requestId.toString(),
        player: stored.player,
        createdAt: stored.createdAt.toString(),
      })
    }
  }

  const report = {
    network: { chainId: network.chainId.toString() },
    contracts: { game: GAME_ADDRESS, token: tokenAddress },
    native: {
      contractBalance: balance.toString(),
      houseBankroll: (await game.houseBankroll()).toString(),
      lockedBankroll: (await game.lockedBankroll()).toString(),
      claimableLiabilities: (await game.totalPendingWithdrawals()).toString(),
      devFeesAccrued: (await game.devFeesAccrued()).toString(),
      ammReserve: (await game.reserveMatic()).toString(),
      vault: (await game.vaultMatic()).toString(),
    },
    token: {
      totalSupply: (await token.totalSupply()).toString(),
      maxSupply: (await token.MAX_SUPPLY()).toString(),
      ammReserve: (await game.reserveToken()).toString(),
      gameBalance: (await token.balanceOf(GAME_ADDRESS)).toString(),
    },
    vrf: {
      coordinator: await game.randomnessCoordinator(),
      subscriptionId: (await game.vrfSubscriptionId()).toString(),
      keyHash: await game.vrfKeyHash(),
      callbackGasLimit: (await game.vrfCallbackGasLimit()).toString(),
      pending,
    },
    reconciliation: {
      nativeProtectedLeAssets: ((await game.houseBankroll()) + (await game.reserveMatic()) + (await game.vaultMatic()) + (await game.totalPendingWithdrawals()) + (await game.devFeesAccrued()) <= balance),
      lockedLeHouse: (await game.lockedBankroll()) <= (await game.houseBankroll()),
      tokenReserveLeGameBalance: (await game.reserveToken()) <= (await token.balanceOf(GAME_ADDRESS)),
      supplyLeMax: (await token.totalSupply()) <= (await token.MAX_SUPPLY()),
    },
  }
  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
