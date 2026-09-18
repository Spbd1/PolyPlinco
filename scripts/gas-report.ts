import { ethers } from "hardhat"

async function main() {
  const [owner, player, seller] = await ethers.getSigners()
  const mock = await (await ethers.getContractFactory("LocalVRFCoordinatorV2PlusMock")).deploy()
  const deployReceipt = await mock.deploymentTransaction()?.wait()
  const game = await (await ethers.getContractFactory("PolyPlinkoGame")).deploy(owner.address, await mock.getAddress(), 0, ethers.ZeroHash, 3, 500000, false)
  const gameReceipt = await game.deploymentTransaction()?.wait()
  await game.seedInitialLiquidityAndBankroll(ethers.parseEther("90000"), { value: ethers.parseEther("100") })
  const config = { rows: 16, balls: 1, risk: 1, betPerBall: ethers.parseEther("0.01") }
  const oneBall = await game.connect(player).playPlinko.estimateGas(config, { value: config.betPerBall })
  const maxConfig = { ...config, balls: 256 }
  const tx = await game.connect(player).playPlinko(maxConfig, { value: config.betPerBall * 256n })
  const receipt = await tx.wait()
  const requested = receipt!.logs.map((l) => { try { return game.interface.parseLog(l) } catch { return null } }).find((x) => x?.name === "GameRequested")!
  const callback = await mock.fulfill.estimateGas(requested.args.requestId, 1)
  const buy = await game.connect(seller).swapExactMaticForTokens.estimateGas(0, { value: ethers.parseEther("0.01") })
  await (await game.connect(seller).swapExactMaticForTokens(0, { value: ethers.parseEther("0.01") })).wait()
  const token = await ethers.getContractAt("PolyPlinkoToken", await game.pplToken())
  await token.connect(seller).approve(await game.getAddress(), ethers.MaxUint256)
  const sell = await game.connect(seller).swapExactTokensForMatic.estimateGas(ethers.parseEther("1"), 0)
  const lossTx = await game.connect(seller).playPlinko(config, { value: config.betPerBall })
  const lossReceipt = await lossTx.wait()
  const lossRequest = lossReceipt!.logs.map((l) => { try { return game.interface.parseLog(l) } catch { return null } }).find((x) => x?.name === "GameRequested")!
  const lossMining = await mock.fulfill.estimateGas(lossRequest.args.requestId, 0)
  const result = {
    network: "hardhat/local",
    deployment: { coordinator: deployReceipt?.gasUsed?.toString(), game: gameReceipt?.gasUsed?.toString() },
    gameCreateOneBall: oneBall.toString(),
    callback256Balls: callback.toString(),
    swapBuy: buy.toString(),
    swapSell: sell.toString(),
    lossMiningTierCrossing: lossMining.toString(),
    note: "256 balls is the application maximum; production callbackGasLimit must exceed the measured callback gas with safety headroom.",
  }
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
