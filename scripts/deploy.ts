/**
 * Deployment script for PolyPlinko contracts
 *
 * Usage:
 * npx hardhat run scripts/deploy.ts --network polygon
 */

import { ethers } from "hardhat"

async function main() {
  const [deployer] = await ethers.getSigners()

  console.log("Deploying contracts with account:", deployer.address)
  console.log("Account balance:", (await deployer.getBalance()).toString())

  // Deploy PolyPlinkoGame (will auto-deploy token)
  const PolyPlinkoGame = await ethers.getContractFactory("PolyPlinkoGame")
  const game = await PolyPlinkoGame.deploy(deployer.address)

  await game.deployed()

  console.log("PolyPlinkoGame deployed to:", game.address)

  // Get token address
  const tokenAddress = await game.pplToken()
  console.log("PolyPlinkoToken deployed to:", tokenAddress)

  console.log("\n=== Next Steps ===")
  console.log("1. Update .env with:")
  console.log(`   NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=${game.address}`)
  console.log(`   NEXT_PUBLIC_PPL_CONTRACT_ADDRESS=${tokenAddress}`)
  console.log("\n2. Seed liquidity:")
  console.log("   npx hardhat run scripts/seed-liquidity.ts --network polygon")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
