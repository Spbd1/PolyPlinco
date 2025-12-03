import { run } from "hardhat"

async function main() {
  const gameAddress = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS
  const tokenAddress = process.env.NEXT_PUBLIC_PPL_CONTRACT_ADDRESS

  if (!gameAddress || !tokenAddress) {
    console.error("Contract addresses not found in environment variables")
    process.exit(1)
  }

  console.log("Verifying PolyPlinkoToken...")
  try {
    await run("verify:verify", {
      address: tokenAddress,
      constructorArguments: [],
    })
    console.log("PolyPlinkoToken verified successfully")
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("PolyPlinkoToken already verified")
    } else {
      console.error("Error verifying PolyPlinkoToken:", error)
    }
  }

  console.log("\nVerifying PolyPlinkoGame...")
  try {
    await run("verify:verify", {
      address: gameAddress,
      constructorArguments: [
        tokenAddress,
        process.env.VRF_COORDINATOR,
        process.env.VRF_SUBSCRIPTION_ID,
        process.env.VRF_KEY_HASH,
        process.env.DEV_ADDRESS,
      ],
    })
    console.log("PolyPlinkoGame verified successfully")
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("PolyPlinkoGame already verified")
    } else {
      console.error("Error verifying PolyPlinkoGame:", error)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
