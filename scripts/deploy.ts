import hre, { ethers } from "hardhat"

async function main() {
  const [deployer] = await ethers.getSigners()
  const network = await ethers.provider.getNetwork()
  const expectedChainId = hre.network.name === "polygonAmoy" ? 80002n : hre.network.name === "polygon" ? 137n : network.chainId
  const localNetwork = network.chainId === 1337n
  if (network.chainId !== expectedChainId) {
    throw new Error(`Refusing deployment: network ${hre.network.name} returned chainId ${network.chainId}, expected ${expectedChainId}`)
  }
  if (network.chainId === 137n && process.env.DEPLOY_MAINNET !== "YES_I_UNDERSTAND_POLYGON_MAINNET") {
    throw new Error("Mainnet deployment disabled: set DEPLOY_MAINNET=YES_I_UNDERSTAND_POLYGON_MAINNET for explicit opt-in")
  }
  if (network.chainId === 80002n && hre.network.name !== "polygonAmoy") {
    throw new Error("Amoy deployment must use the polygonAmoy Hardhat network")
  }
  let coordinator = process.env.VRF_COORDINATOR
  // Use the local mock through the same request/callback state machine as
  // testnet. localMode is reserved for deterministic unit fixtures.
  if (localNetwork && !coordinator) {
    const mock = await (await ethers.getContractFactory("LocalVRFCoordinatorV2PlusMock")).deploy()
    await mock.waitForDeployment()
    coordinator = await mock.getAddress()
  }
  if (!coordinator) throw new Error("VRF_COORDINATOR is required outside local development")
  if (!localNetwork && (!process.env.VRF_SUBSCRIPTION_ID || process.env.VRF_SUBSCRIPTION_ID === "0")) {
    throw new Error("VRF_SUBSCRIPTION_ID is required outside local development")
  }
  if (!localNetwork && (!process.env.VRF_KEY_HASH || process.env.VRF_KEY_HASH === ethers.ZeroHash)) {
    throw new Error("VRF_KEY_HASH is required outside local development")
  }
  if (network.chainId === 80002n && coordinator.toLowerCase() !== "0x343300b5d84d444b2adc9116fef1bed02be49cf2") {
    throw new Error("Refusing Amoy deployment: VRF_COORDINATOR does not match the current official Chainlink Amoy coordinator")
  }
  const localMode = false
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log("Deploying contracts with account:", deployer.address)
  console.log("Account balance (wei):", balance.toString())
  const factory = await ethers.getContractFactory("PolyPlinkoGame")
  const game = await factory.deploy(
    deployer.address,
    coordinator,
    process.env.VRF_SUBSCRIPTION_ID || 0,
    process.env.VRF_KEY_HASH || ethers.ZeroHash,
    process.env.VRF_REQUEST_CONFIRMATIONS || 3,
    process.env.VRF_CALLBACK_GAS_LIMIT || 2000000,
    localMode,
  )
  const gameDeploymentTx = game.deploymentTransaction()
  if (!gameDeploymentTx) throw new Error("Missing game deployment transaction")
  await game.waitForDeployment()
  const gameAddress = await game.getAddress()
  const tokenAddress = await game.pplToken()
  const gameReceipt = await gameDeploymentTx.wait()
  console.log(JSON.stringify({
    network: hre.network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    game: gameAddress,
    token: tokenAddress,
    gameDeploymentTx: gameDeploymentTx.hash,
    gameDeploymentBlock: gameReceipt?.blockNumber ?? null,
    coordinator,
    subscriptionId: process.env.VRF_SUBSCRIPTION_ID,
    keyHash: process.env.VRF_KEY_HASH,
    requestConfirmations: process.env.VRF_REQUEST_CONFIRMATIONS || "3",
    callbackGasLimit: process.env.VRF_CALLBACK_GAS_LIMIT || "2000000",
    localMode,
  }))
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
