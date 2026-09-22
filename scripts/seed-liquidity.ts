import { ethers } from "hardhat"

async function main() {
  const [deployer] = await ethers.getSigners()

  const gameAddress = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS
  const initialMaticLiquidity = process.env.INITIAL_MATIC_LIQUIDITY || "1000"
  // The constructor mints 90,000 PPL to the game contract for the initial
  // game/protocol allocation. Do not default above that balance.
  const initialTokenLiquidity = process.env.INITIAL_TOKEN_LIQUIDITY || "90000"

  if (!gameAddress) {
    console.error("Game contract address not found")
    process.exit(1)
  }

  console.log("Seeding initial liquidity...")
  console.log("Deployer:", deployer.address)
  console.log("Game Contract:", gameAddress)
  console.log(`Liquidity: ${initialMaticLiquidity} MATIC + ${initialTokenLiquidity} PPL`)

  const game = await ethers.getContractAt("PolyPlinkoGame", gameAddress)

  const maticAmount = ethers.parseEther(initialMaticLiquidity)
  const tokenAmount = ethers.parseEther(initialTokenLiquidity)

  console.log("\nSending seed transaction...")
  const tx = await game.seedInitialLiquidityAndBankroll(tokenAmount, {
    value: maticAmount,
    gasLimit: 2000000,
  })

  console.log("Transaction hash:", tx.hash)
  console.log("Waiting for confirmation...")

  await tx.wait()

  console.log("✅ Liquidity seeded successfully!")

  // Check reserves
  const reserveMatic = await game.reserveMatic()
  const reserveToken = await game.reserveToken()
  const houseBankroll = await game.houseBankroll()

  console.log("\nCurrent state:")
  console.log("Reserve MATIC:", ethers.formatEther(reserveMatic))
  console.log("Reserve PPL:", ethers.formatEther(reserveToken))
  console.log("House Bankroll:", ethers.formatEther(houseBankroll))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
