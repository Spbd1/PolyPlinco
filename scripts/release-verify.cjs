/*
 * Non-destructive final release gate. It uses ephemeral Hardhat fixtures and
 * a no-money production build; it never deploys to a public chain, funds an
 * account, or sends a transaction outside the local test provider.
 */
const { spawn, spawnSync } = require("node:child_process")

const root = process.cwd()
const env = {
  ...process.env,
  APP_ENV: "public-readonly",
  NODE_ENV: "production",
  NEXT_PUBLIC_NETWORK_ID: "137",
  NEXT_PUBLIC_GAME_CONTRACT_ADDRESS: "0x0000000000000000000000000000000000000000",
  NEXT_PUBLIC_PPL_CONTRACT_ADDRESS: "0x0000000000000000000000000000000000000000",
  NEXT_PUBLIC_RPC_URL: "",
  NEXT_PUBLIC_PAID_MODE_ENABLED: "false",
}

function run(label, command, args, options = {}) {
  console.log(`\n[release] ${label}`)
  const result = spawnSync(command, args, { cwd: root, env: options.env || env, stdio: "inherit" })
  if (result.status !== 0) throw new Error(`${label} failed with exit ${result.status}`)
}

async function waitFor(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.status < 500) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function browserGate() {
  const port = 39123
  const cdpPort = 39223
  // `next start` is used for this local gate because it exercises the same
  // production output while preserving the repository's middleware runtime;
  // the Dockerfile's standalone server remains the deployment entrypoint.
  const server = spawn("node_modules/.bin/next", ["start", "-p", String(port)], {
    cwd: root,
    env,
    stdio: "inherit",
  })
  try {
    await waitFor(`http://127.0.0.1:${port}/api/health`)
    const health = await fetch(`http://127.0.0.1:${port}/api/health`)
    if (!health.ok) throw new Error(`liveness returned ${health.status}`)
    const readiness = await fetch(`http://127.0.0.1:${port}/api/health?ready=1`)
    if (readiness.status !== 503) throw new Error(`no-money readiness returned ${readiness.status}, expected 503`)
    await new Promise((resolve) => setTimeout(resolve, 750))
    run("browser interaction regression", "node", ["scripts/browser-interaction.cjs"], {
      env: { ...env, BROWSER_TEST_URL: `http://127.0.0.1:${port}`, BROWSER_TEST_CDP_PORT: String(cdpPort) },
    })
  } finally {
    server.kill("SIGTERM")
  }
}

async function main() {
  run("Solidity compile", "node", ["hardhat-test.cjs", "compile"])
  run("contract tests", "node", ["hardhat-test.cjs", "test"])
  run("ABI drift", "node", ["scripts/check-abi.cjs"])
  run("protocol specification", "node", ["hardhat-run.cjs", "run", "scripts/protocol-spec-check.ts", "--network", "hardhat"])
  run("deployment configuration", "node", ["scripts/deploy-config-check.cjs"])
  run("TypeScript", "node_modules/.bin/tsc", ["--noEmit"])
  run("ESLint", "node_modules/.bin/eslint", ["."])
  run("RTP regression", "node", ["hardhat-run.cjs", "run", "scripts/rtp-report.ts", "--network", "hardhat"])
  run("trajectory regression", "node", ["hardhat-run.cjs", "run", "scripts/plinko-trajectory-check.ts", "--network", "hardhat"])
  run("treasury simulation", "node", ["scripts/treasury-exposure-simulation.cjs"])
  run("gas matrix", "node", ["hardhat-run.cjs", "run", "scripts/gas-report.ts", "--network", "hardhat"])
  run("Next production build", "node_modules/.bin/next", ["build"])
  await browserGate()
  console.log("\n[release] PASS: all non-destructive release gates completed")
}

main().catch((error) => {
  console.error(`\n[release] FAIL: ${error.message}`)
  process.exitCode = 1
})
