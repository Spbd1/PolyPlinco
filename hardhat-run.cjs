process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "commonjs", moduleResolution: "node" })
require("hardhat/internal/cli/bootstrap")
