import Link from "next/link"
import { Footer } from "@/components/footer"

export default function HowToPlayPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <span className="text-2xl">🎰</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  PolyPlinko
                </h1>
                <p className="text-xs text-slate-500">Provably Fair on Polygon</p>
              </div>
            </Link>
            <Link
              href="/"
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
            >
              Play Now
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center">How to Play</h1>
        <p className="text-xl text-slate-400 text-center mb-12">Everything you need to know about PolyPlinko</p>

        <div className="space-y-12">
          {/* Getting Started */}
          <section className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-3xl">🎮</span> Getting Started
            </h2>
            <div className="space-y-4 text-slate-300">
              <p>
                PolyPlinko is a Plinko game designed for Polygon PoS. No registration required – just connect
                your wallet and start playing!
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Visit the game page and configure your bet settings</li>
                <li>Click "Play" – your wallet will prompt you to connect if needed</li>
                <li>Confirm the transaction with MATIC for your bet</li>
                <li>
                  Watch as Chainlink VRF generates provably random results and balls drop through the Plinko board
                </li>
                <li>Receive your payout instantly if you win, or earn PPL tokens if you lose!</li>
              </ol>
            </div>
          </section>

          {/* Game Settings */}
          <section className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-3xl">⚙️</span> Game Settings
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-purple-400 mb-2">Bet Amount</h3>
                <p className="text-slate-300">
                  Set your bet per ball in MATIC (minimum 0.001 MATIC). Your total bet will be bet amount × number of
                  balls.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-purple-400 mb-2">Risk Level</h3>
                <div className="space-y-3 mt-3">
                  <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
                    <h4 className="font-semibold text-green-400 mb-1">Low Risk</h4>
                    <p className="text-sm text-slate-300">
                      Smaller variance with multipliers clustered around 1x. More consistent, smaller wins.
                    </p>
                  </div>
                  <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                    <h4 className="font-semibold text-yellow-400 mb-1">Medium Risk</h4>
                    <p className="text-sm text-slate-300">
                      Balanced variance. Good mix of small and medium wins with occasional big hits.
                    </p>
                  </div>
                  <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
                    <h4 className="font-semibold text-red-400 mb-1">High Risk</h4>
                    <p className="text-sm text-slate-300">
                      High variance! Low center multipliers but massive edge multipliers. Big risk, big reward.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-purple-400 mb-2">Rows</h3>
                <p className="text-slate-300">
                  Choose between 8 and 32 rows. More rows means more possible outcomes and generally higher maximum
                  multipliers on the edges.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-purple-400 mb-2">Number of Balls</h3>
                <p className="text-slate-300">
                  Drop between 1 and 256 balls per game for paid players. Free demo mode allows up to 10 balls per
                  day. More balls increase excitement but also gas costs.
                </p>
              </div>
            </div>
          </section>

          {/* House Edge */}
          <section className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-3xl">📊</span> House Edge & Payouts
            </h2>
            <div className="space-y-4 text-slate-300">
              <p>
                PolyPlinko has configuration-dependent RTP of approximately <span className="text-purple-400 font-semibold">90.03%–90.48%</span>,
                corresponding to a gross expected house edge of approximately 9.52%–9.97%.
              </p>
              <div className="bg-slate-800/50 p-4 rounded-lg space-y-2">
                <p className="font-semibold text-white">How is the expected margin accounted for?</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>
                    <span className="text-purple-400 font-semibold">1%</span> - Developer fee, accrued as a protected
                    pull-based liability
                  </li>
                  <li>
                    <span className="text-purple-400 font-semibold">Remaining margin</span> - House accounting and
                    protected-liability coverage; this does not guarantee profit or uninterrupted availability
                  </li>
                </ul>
              </div>
              <p>
                Multipliers are calculated using binomial probability distributions and scaled to the current
                configuration-dependent RTP range.
              </p>
            </div>
          </section>

          {/* Provably Fair */}
          <section className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-3xl">🔒</span> Provably Fair Gaming
            </h2>
            <div className="space-y-4 text-slate-300">
              <p>
                Paid production games use <span className="text-purple-400 font-semibold">Chainlink VRF v2.5</span> for
                verifiable randomness; local development uses the authenticated mock coordinator. This means:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Paid production is intended to use authenticated Chainlink VRF; local development uses a mock coordinator.</li>
                <li>Each settled game records its random seed and settlement on-chain.</li>
                <li>You can verify any game's fairness by checking the VRF request on-chain</li>
                <li>
                  Ball outcomes are deterministically derived from the seed using keccak256 hashing – same seed always
                  produces same result
                </li>
              </ul>
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mt-4">
                <p className="text-sm font-mono text-blue-300">randomForBall = keccak256(vrfSeed, gameId, ballIndex)</p>
              </div>
            </div>
          </section>

          {/* Tokenomics */}
          <section className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-3xl">💎</span> PPL Token & Loss-Mining
            </h2>
            <div className="space-y-4 text-slate-300">
              <p>
                PolyPlinko Token (PPL) is the native ERC-20 token with a{" "}
                <span className="text-purple-400 font-semibold">maximum supply cap of 1,000,000 tokens</span>; supply begins at 100,000 PPL, can rise through capped loss-mining, and can later decline through burns.
              </p>

              <div>
                <h3 className="text-xl font-semibold text-purple-400 mb-3">Loss-Mining Rewards (9 Tiers)</h3>
                <p className="mb-3">
                  When you lose a game, you may receive PPL based on your net loss. PPL rewards do not reimburse the
                  gambling loss, and token value can change.
                </p>
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <p className="font-semibold text-white mb-2">Mining Phase (900,000 PPL):</p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                    <li>
                      <span className="text-purple-400">Tier 1:</span> 1 PPL per 0.02 MATIC net loss (100k tokens)
                    </li>
                    <li>
                      <span className="text-purple-400">Tier 2:</span> 1 PPL per 0.03 MATIC net loss (100k tokens)
                    </li>
                    <li>
                      <span className="text-purple-400">Tier 3:</span> 1 PPL per 0.04 MATIC net loss (100k tokens)
                    </li>
                    <li className="text-slate-500">... continues increasing by 0.01 per tier ...</li>
                    <li>
                      <span className="text-purple-400">Tier 9:</span> 1 PPL per 0.10 MATIC net loss (100k tokens)
                    </li>
                  </ul>
                  <p className="mt-3 text-sm text-slate-400">
                    As more tokens are minted, the "price" increases – early players get better rates!
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-purple-400 mb-3">Post-Mining Buyback (After 900k tokens)</h3>
                <p className="mb-3">
                  Once all 900,000 mining tokens are distributed, the system switches to an automatic buyback mechanism:
                </p>
                <div className="bg-green-900/20 border border-green-700/50 p-4 rounded-lg">
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li>
                      <span className="text-green-400 font-semibold">70% of your net loss</span> is used to buy PPL
                      tokens from the AMM
                    </li>
                    <li>
                      <span className="text-purple-300 font-semibold">30% of the purchased PPL</span> is permanently
                      burned
                    </li>
                    <li>
                      <span className="text-green-300 font-semibold">70% of the purchased PPL</span> is sent to you
                    </li>
                    <li><span className="text-slate-400">30% of your net loss</span> remains with the protocol</li>
                    <li>These are two separate splits: native funds and purchased PPL.</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-purple-400 mb-3">Token Allocation</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                    <span>Loss-Mining Rewards</span>
                    <span className="font-semibold text-purple-400">900,000 PPL (90%)</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                    <span>Vault & AMM Liquidity</span>
                    <span className="font-semibold text-blue-400">90,000 PPL (9%)</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                    <span>Developer Allocation</span>
                    <span className="font-semibold text-green-400">10,000 PPL (1%)</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* DEX & Swap */}
          <section className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-3xl">🔄</span> DEX & Deflationary Mechanics
            </h2>
            <div className="space-y-4 text-slate-300">
              <p>
                PolyPlinko features an integrated AMM (Automated Market Maker) for swapping between MATIC and PPL
                tokens.
              </p>

              <div>
                <h3 className="text-xl font-semibold text-purple-400 mb-3">5% Swap Fee</h3>
                <p className="mb-3">Every swap incurs a 5% protocol fee that creates deflationary pressure:</p>
                <div className="space-y-3">
                  <div className="p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                    <h4 className="font-semibold text-purple-400 mb-1">MATIC → PPL Swaps</h4>
                    <p className="text-sm">
                      5% of MATIC goes to the vault. The vault accumulates fees and can perform buyback & burn
                      operations.
                    </p>
                  </div>
                  <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
                    <h4 className="font-semibold text-red-400 mb-1">PPL → MATIC Swaps</h4>
                    <p className="text-sm">5% of PPL tokens are burned immediately, reducing total supply forever.</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg">
                <p className="font-semibold text-white mb-2">Constant Product Formula:</p>
                <p className="text-sm font-mono text-slate-300">k = reserveMATIC × reservePPL (constant)</p>
                <p className="text-sm mt-2 text-slate-400">
                  Prices are determined automatically by the ratio of reserves. More trading = more burns =
                  deflationary!
                </p>
              </div>
            </div>
          </section>

          {/* Demo & Paid Limits */}
          <section className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-3xl">🎯</span> Daily Limits
            </h2>
            <div className="space-y-4 text-slate-300">
              <p>PolyPlinko offers both free demo mode and paid play with different daily limits:</p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-6 bg-cyan-900/20 border border-cyan-700/50 rounded-lg">
                  <h3 className="text-xl font-semibold text-cyan-400 mb-3">Free Demo Mode</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      • <span className="font-semibold">10 balls per day</span>
                    </p>
                    <p>• No wallet connection required</p>
                    <p>• No real money involved</p>
                    <p>• Perfect for testing and learning</p>
                    <p>• Resets daily at midnight</p>
                  </div>
                </div>

                <div className="p-6 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                  <h3 className="text-xl font-semibold text-purple-400 mb-3">Paid Players</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      • <span className="font-semibold">256 balls per game</span>
                    </p>
                    <p>• Wallet connection required</p>
                    <p>• Real MATIC bets (min 0.01 POL)</p>
                    <p>• Earn PPL tokens on losses</p>
                    <p>• Win real payouts</p>
                    <p>• Limit resets daily at midnight</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 mt-4">
                <p className="text-sm">
                  <span className="font-semibold text-yellow-400">Note:</span> Daily limits are tracked locally and
                  reset at midnight in your timezone. These limits help promote responsible gaming and prevent excessive
                  gambling.
                </p>
              </div>
            </div>
          </section>

          {/* Instant Results Feature */}
          <section className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-3xl">⚡</span> Instant Results Mode
            </h2>
            <div className="space-y-4 text-slate-300">
              <p>Choose how you want to experience your games:</p>

              <div className="space-y-3">
                <div className="p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                  <h4 className="font-semibold text-purple-400 mb-1">Animation Mode (Default)</h4>
                  <p className="text-sm">
                    Watch realistic ball physics as they bounce between pins and settle into slots. Perfect for single
                    or small batch games (1-100 balls).
                  </p>
                </div>

                <div className="p-4 bg-cyan-900/20 border border-cyan-700/50 rounded-lg">
                  <h4 className="font-semibold text-cyan-400 mb-1">Instant Results Mode</h4>
                  <p className="text-sm">
                    Skip animations and see your final results immediately. Ideal for large batch games (100+ balls)
                    where you want to see outcomes quickly.
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-400">
                Toggle between modes using the "Instant Results" switch in the game controls panel.
              </p>
            </div>
          </section>

          {/* Tips & Strategy */}
          <section className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-3xl">💡</span> Tips & Strategy
            </h2>
            <div className="space-y-3 text-slate-300">
              <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                <h4 className="font-semibold text-blue-400 mb-1">Start Small</h4>
                <p className="text-sm">
                  Test different risk levels and row counts with small bets to find your preferred style.
                </p>
              </div>
              <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
                <h4 className="font-semibold text-green-400 mb-1">Loss-Mining Reward Disclosure</h4>
                <p className="text-sm">
                  Early players get better token rates. PPL rewards do not make losing profitable, reimburse losses,
                  or guarantee future value.
                </p>
              </div>
              <div className="p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                <h4 className="font-semibold text-purple-400 mb-1">High Risk = High Variance</h4>
                <p className="text-sm">
                  High risk mode can have long losing streaks but massive wins. Only play what you can afford to lose.
                </p>
              </div>
              <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                <h4 className="font-semibold text-yellow-400 mb-1">Responsible Gaming</h4>
                <p className="text-sm">
                  Set limits for yourself. Remember: the house edge means the game favors the house over time.
                </p>
              </div>
            </div>
          </section>

          {/* Technical Details */}
          <section className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-3xl">⚡</span> Technical Details
            </h2>
            <div className="space-y-4 text-slate-300">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Network</h4>
                  <p className="text-sm">Polygon PoS (Chain ID: 137)</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Gas Token</h4>
                  <p className="text-sm">MATIC</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Randomness</h4>
                  <p className="text-sm">Chainlink VRF v2</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Smart Contracts</h4>
                  <p className="text-sm">Solidity 0.8.x with OpenZeppelin</p>
                </div>
              </div>
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <p className="text-sm font-semibold text-white mb-2">Open Source & Verifiable</p>
                <p className="text-sm">
                  All smart contracts are verified on PolygonScan. You can audit the code and verify game results
                  on-chain.
                </p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-2xl p-8 border border-purple-700/50 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Play?</h2>
            <p className="text-slate-300 mb-6">
              Experience provably fair Plinko with loss-mining rewards on Polygon PoS
            </p>
            <Link
              href="/"
              className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/50"
            >
              Start Playing Now
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
