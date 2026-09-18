import { ethers } from "hardhat"

async function main() {
  const [owner] = await ethers.getSigners()
  const mock = await (await ethers.getContractFactory("LocalVRFCoordinatorV2PlusMock")).deploy()
  await mock.waitForDeployment()
  const game = await (await ethers.getContractFactory("PolyPlinkoGame")).deploy(
    owner.address, await mock.getAddress(), 0, ethers.ZeroHash, 3, 2_000_000, false,
  )
  await game.waitForDeployment()
  for (let rows = 8; rows <= 32; rows++) {
    for (let risk = 0; risk < 3; risk++) {
      const rtp = await game.getExpectedRtpBps(rows, risk)
      console.log(`${rows}\t${risk}\t${rtp}\t${10000n - rtp}`)
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
