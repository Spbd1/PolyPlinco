import nextVitals from "eslint-config-next/core-web-vitals"

const config = [
  { ignores: ["typechain-types/**", ".next/**", "artifacts/**", "cache/**"] },
  ...nextVitals,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
]

export default config
