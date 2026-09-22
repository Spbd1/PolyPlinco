"use client"

import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmissionChart } from "@/components/whitepaper/emission-chart"
import { SupplyBurnChart } from "@/components/whitepaper/supply-burn-chart"
import { PricePressureChart } from "@/components/whitepaper/price-pressure-chart"

const sections = [
  { id: "abstract", title: "Abstract" },
  { id: "vision", title: "Vision & Motivation" },
  { id: "overview", title: "System Overview" },
  { id: "mechanics", title: "Game Mechanics & Fairness" },
  { id: "tokenomics", title: "Tokenomics" },
  { id: "mining", title: "Loss-Mining Emission Model" },
  { id: "vault", title: "Vault, Swap & Post-Emission Supply Reduction" },
  { id: "economics", title: "Economic Intuition" },
  { id: "risk", title: "Risk & Responsibility" },
  { id: "roadmap", title: "Roadmap & Future Directions" },
]

export default function WhitepaperPage() {
  const [activeSection, setActiveSection] = useState("abstract")

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100

      for (const section of sections) {
        const element = document.getElementById(section.id)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const top = element.offsetTop - 80
      window.scrollTo({ top, behavior: "smooth" })
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Game
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Table of Contents - Left Sidebar */}
          <aside className="lg:w-64 lg:sticky lg:top-24 lg:h-fit">
            <Card className="p-4 bg-slate-900/50 border-slate-800">
              <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-4">Table of Contents</h2>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`block w-full text-left text-sm py-2 px-3 rounded-lg transition-all ${
                      activeSection === section.id
                        ? "bg-purple-900/50 text-purple-300 font-medium border-l-2 border-purple-500"
                        : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1 max-w-4xl">
            {/* Header */}
            <div className="mb-12">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4">
                PolyPlinko Whitepaper
              </h1>
              <p className="text-xl text-slate-400">A Provably Fair, Capped-Emission Plinko Protocol Designed for Polygon PoS</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="px-4 py-2 rounded-lg bg-purple-900/30 border border-purple-700/50">
                  <span className="text-sm text-purple-300">Version 1.0</span>
                </div>
                <div className="px-4 py-2 rounded-lg bg-blue-900/30 border border-blue-700/50">
                  <span className="text-sm text-blue-300">December 2025</span>
                </div>
              </div>
            </div>

            {/* Key Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
              <Card className="p-6 bg-gradient-to-br from-purple-900/20 to-purple-900/5 border-purple-700/50">
                <div className="text-sm text-purple-300 mb-1">Maximum Supply Cap</div>
                <div className="text-3xl font-bold text-white">1,000,000</div>
                <div className="text-sm text-slate-400 mt-1">PPL Tokens</div>
              </Card>
              <Card className="p-6 bg-gradient-to-br from-blue-900/20 to-blue-900/5 border-blue-700/50">
                <div className="text-sm text-blue-300 mb-1">House Edge</div>
                <div className="text-3xl font-bold text-white">~10%</div>
                <div className="text-sm text-slate-400 mt-1">Per Ball</div>
              </Card>
              <Card className="p-6 bg-gradient-to-br from-cyan-900/20 to-cyan-900/5 border-cyan-700/50">
                <div className="text-sm text-cyan-300 mb-1">Mining Emission</div>
                <div className="text-3xl font-bold text-white">900,000</div>
                <div className="text-sm text-slate-400 mt-1">PPL Tokens</div>
              </Card>
            </div>

            {/* Sections */}
            <div className="space-y-12">
              {/* Abstract */}
              <section id="abstract" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-white mb-6 pb-3 border-b border-slate-800">1. Abstract</h2>
                <div className="prose prose-invert max-w-none space-y-4 text-slate-300 leading-relaxed">
                  <p>
                    PolyPlinko is an on-chain Plinko protocol designed for Polygon PoS. It combines a transparent game
                    of chance with a capped-emission token and internal reserve system. The current repository is
                    locally implemented and tested; no public-chain deployment is represented by this document.
                  </p>
                  <p>
                    Instead of treating each game as an isolated bet, PolyPlinko turns long-term participation into a
                    structured, tokenized exposure:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>
                      Players interact with a Plinko game with a clearly defined mathematical edge (~10% per ball).
                    </li>
                    <li>A portion of player losses is converted into PPL tokens through a loss-mining schedule.</li>
                    <li>
                      Once mining is complete, eligible subsequent losses can create automatic buyback pressure on PPL,
                      subject to available AMM liquidity and protocol guards.
                    </li>
                  </ul>
                  <p>The result is a design where:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>The underlying game remains a probabilistic, risky activity, and players can lose money.</li>
                    <li>
                      At the same time, the protocol gives participants token exposure through capped emission,
                      conditional buyback, and burn mechanics. Token rewards do not reimburse gambling losses.
                    </li>
                  </ul>
                  <Card className="mt-6 p-6 bg-amber-900/10 border-amber-700/50">
                    <p className="text-sm text-amber-300 font-medium">
                      PolyPlinko is not a guarantee of profit, not an investment product, and not financial advice.
                      However, its architecture aims to move away from purely extractive gambling models toward
                      transparent, on-chain participation with long-term orientation.
                    </p>
                  </Card>
                </div>
              </section>

              {/* Vision & Motivation */}
              <section id="vision" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-white mb-6 pb-3 border-b border-slate-800">
                  2. Vision & Motivation
                </h2>
                <div className="prose prose-invert max-w-none space-y-4 text-slate-300 leading-relaxed">
                  <h3 className="text-xl font-semibold text-white mt-6">An Alternative to Traditional Gambling</h3>
                  <p>Traditional online gambling platforms share a common pattern:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>The house has a mathematical edge, but odds are often opaque or difficult to verify.</li>
                    <li>Players either lose or win on a short time horizon.</li>
                    <li>
                      Almost all value flows to the operator; there is little or no shared upside for participants.
                    </li>
                    <li>Losses simply become operator profit with no lasting benefit to the player.</li>
                  </ul>

                  <Card className="mt-6 p-6 bg-purple-900/10 border-purple-700/50">
                    <h4 className="font-semibold text-purple-300 mb-3">Our Ethical Framework</h4>
                    <p className="text-sm text-slate-400 mb-4">
                      PolyPlinko is designed with a fundamentally different philosophy.{" "}
                      <strong>We do not promise that "nobody loses"</strong> – this is still a game of chance with real
                      risk. Players can and will lose MATIC, and outcomes remain random.
                    </p>
                    <p className="text-sm text-slate-400">
                      Instead, the protocol records loss-related token mechanics transparently, without promising
                      recovery or value. Depending on the emission phase, a positive net loss may interact with the
                      protocol in these ways:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 ml-4 mt-3 text-sm text-slate-400">
                      <li>It is accounted for alongside the house bankroll and protected liabilities</li>
                      <li>During emission, it can mint capped PPL rewards; after exhaustion, it can trigger a guarded PPL buyback</li>
                      <li>Post-mining buybacks burn 30% of purchased PPL, while other independent burn paths may also apply</li>
                    </ol>
                  </Card>

                  <p className="mt-6">PolyPlinko explores a different approach built on three pillars:</p>
                  <div className="grid gap-4 mt-4">
                    <Card className="p-4 bg-purple-900/10 border-purple-700/30">
                      <h3 className="font-semibold text-purple-300 mb-2">Radical Transparency</h3>
                      <p className="text-sm text-slate-400">
                        All game outcomes are driven by verifiable, on-chain randomness. House edge, multipliers, and
                        emission schedules are mathematically defined and auditable.
                      </p>
                    </Card>
                    <Card className="p-4 bg-blue-900/10 border-blue-700/30">
                      <h3 className="font-semibold text-blue-300 mb-2">Explicit Economics</h3>
                      <p className="text-sm text-slate-400">
                        House edge, capped emission tiers, swap fees, burn mechanics, and game-admission limits are
                        encoded in smart contracts with explicit, testable math.
                      </p>
                    </Card>
                    <Card className="p-4 bg-cyan-900/10 border-cyan-700/30">
                      <h3 className="font-semibold text-cyan-300 mb-2">Long-term Alignment</h3>
                      <p className="text-sm text-slate-400">
                        Player losses may create token exposure according to the active phase; token value is variable
                        and rewards do not make a losing wager profitable.
                      </p>
                    </Card>
                  </div>

                  <Card className="mt-6 p-6 bg-red-900/10 border-red-700/50">
                    <p className="text-sm text-red-300 font-medium">
                      <strong>Critical Disclaimer:</strong> PolyPlinko is still a game of chance. It is not a guaranteed
                      investment, and participants should only use funds they can afford to lose. This protocol is
                      experimental and high-risk.
                    </p>
                  </Card>
                </div>
              </section>

              {/* System Overview */}
              <section id="overview" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-white mb-6 pb-3 border-b border-slate-800">
                  3. System Overview
                </h2>
                <div className="prose prose-invert max-w-none space-y-6 text-slate-300 leading-relaxed">
                  <p>PolyPlinko is designed around three main components for Polygon PoS:</p>

                  <Card className="p-6 bg-slate-900/50 border-slate-700">
                    <h3 className="text-xl font-semibold text-purple-400 mb-3">1. Plinko Game Contract</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                      <li>Accepts bets in MATIC.</li>
                      <li>Uses an authenticated VRF callback architecture intended for Chainlink VRF v2.5-style production use.</li>
                      <li>Applies predefined multiplier tables with approximately 90.03%–90.48% RTP, depending on configuration.</li>
                      <li>Transfers winnings directly to the player's address.</li>
                      <li>
                        Routes portions of net losses to:
                        <ul className="list-circle list-inside ml-6 mt-1">
                          <li>PPL loss-mining emission (while available).</li>
                          <li>Post-mining buyback and vault accumulation.</li>
                        </ul>
                      </li>
                    </ul>
                  </Card>

                  <Card className="p-6 bg-slate-900/50 border-slate-700">
                    <h3 className="text-xl font-semibold text-blue-400 mb-3">2. PPL Token (ERC-20)</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                      <li>Maximum supply cap: 1,000,000 PPL; initial supply and later capped emission are separate phases.</li>
                      <li>
                        Post-emission supply-reduction mechanics via:
                        <ul className="list-circle list-inside ml-6 mt-1">
                          <li>Swap fees and burns.</li>
                          <li>Buyback & burn from the vault.</li>
                        </ul>
                      </li>
                      <li>Distributed over time through loss-mining and protocol operations.</li>
                    </ul>
                  </Card>

                  <Card className="p-6 bg-slate-900/50 border-slate-700">
                    <h3 className="text-xl font-semibold text-cyan-400 mb-3">3. Vault & Swap System</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                      <li>Maintains distinct internal AMM reserves, a native fee bucket, house bankroll, and protected liabilities.</li>
                      <li>Provides an internal MATIC ↔ PPL swap using constant-product-style reserve math.</li>
                      <li>Collects swap fees and can trigger automatic or owner-operated buyback-and-burn actions.</li>
                      <li>Does not guarantee liquidity, price stability, profitability, or uninterrupted availability.</li>
                    </ul>
                  </Card>
                </div>
              </section>

              {/* Game Mechanics */}
              <section id="mechanics" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-white mb-6 pb-3 border-b border-slate-800">
                  4. Game Mechanics & Fairness
                </h2>
                <div className="prose prose-invert max-w-none space-y-4 text-slate-300 leading-relaxed">
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <Card className="p-4 bg-purple-900/10 border-purple-700/30 text-center">
                      <div className="text-2xl font-bold text-purple-300 mb-1">Up to 32</div>
                      <div className="text-sm text-slate-400">Rows</div>
                    </Card>
                    <Card className="p-4 bg-blue-900/10 border-blue-700/30 text-center">
                      <div className="text-2xl font-bold text-blue-300 mb-1">3 Levels</div>
                      <div className="text-sm text-slate-400">Risk Settings</div>
                    </Card>
                    <Card className="p-4 bg-cyan-900/10 border-cyan-700/30 text-center">
                      <div className="text-2xl font-bold text-cyan-300 mb-1">Up to 256</div>
                      <div className="text-sm text-slate-400">Balls per Play</div>
                    </Card>
                  </div>

                  <h3 className="text-xl font-semibold text-white mt-6">Randomness & Fairness</h3>
                  <p>
                    In the intended public-chain configuration, each paid play requests randomness through an
                    authenticated Chainlink VRF v2.5-style coordinator flow. Local development and tests use the
                    repository's mock coordinator path; that local path is not a substitute for production VRF
                    validation.
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>A random seed is generated and stored on-chain.</li>
                    <li>
                      For each ball, deterministic hashing (e.g. keccak256(seed, gameId, ballIndex)) produces
                      independent random values.
                    </li>
                    <li>
                      These random values are mapped to final slots using the mathematically known binomial
                      probabilities for Plinko.
                    </li>
                  </ul>

                  <Card className="mt-6 p-6 bg-green-900/10 border-green-700/50">
                    <h4 className="font-semibold text-green-300 mb-2">Authenticated Randomness & Settlement</h4>
                    <p className="text-sm text-slate-400">
                      The authoritative paid result is stored and settled on-chain from the coordinator response, and
                      the deterministic result mapping can be recomputed from the stored seed. This describes the
                      intended authenticated flow, not a claim that public-chain deployment or external VRF operation
                      has already been validated.
                    </p>
                  </Card>
                  <Card className="mt-6 p-6 bg-amber-900/10 border-amber-700/50">
                    <p className="text-sm text-amber-300">
                      <strong>VRF liveness note:</strong> If the external randomness fulfillment does not arrive, a
                      submitted game can remain pending and its liability can remain reserved. The current
                      implementation does not yet include an expiry/refund recovery path for an indefinitely
                      unfulfilled request.
                    </p>
                  </Card>
                </div>
              </section>

              {/* Tokenomics */}
              <section id="tokenomics" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-white mb-6 pb-3 border-b border-slate-800">5. Tokenomics</h2>
                <div className="prose prose-invert max-w-none space-y-6 text-slate-300 leading-relaxed">
                  <div className="grid gap-4">
                    <Card className="p-4 bg-slate-900/50 border-slate-700">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-white">Token Name</span>
                        <span className="text-purple-400">PolyPlinko Token (PPL)</span>
                      </div>
                    </Card>
                    <Card className="p-4 bg-slate-900/50 border-slate-700">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-white">Standard</span>
                        <span className="text-blue-400">ERC-20</span>
                      </div>
                    </Card>
                    <Card className="p-4 bg-slate-900/50 border-slate-700">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-white">Chain</span>
                        <span className="text-cyan-400">Polygon PoS</span>
                      </div>
                    </Card>
                    <Card className="p-4 bg-slate-900/50 border-slate-700">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-white">Maximum Supply Cap</span>
                        <span className="text-green-400">1,000,000 PPL maximum cap</span>
                      </div>
                    </Card>
                  </div>

                  <h3 className="text-xl font-semibold text-white mt-8">Allocation Breakdown</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card className="p-6 bg-purple-900/10 border-purple-700/30">
                      <div className="text-3xl font-bold text-purple-300 mb-2">10,000</div>
                      <div className="text-sm text-slate-400 mb-3">1% - Developer Allocation</div>
                      <p className="text-xs text-slate-500">Minted once to the configured developer address at genesis</p>
                    </Card>
                    <Card className="p-6 bg-blue-900/10 border-blue-700/30">
                      <div className="text-3xl font-bold text-blue-300 mb-2">90,000</div>
                      <div className="text-sm text-slate-400 mb-3">9% - Game/Protocol Allocation</div>
                      <p className="text-xs text-slate-500">Available to the game contract; deployment configuration determines initial AMM seeding</p>
                    </Card>
                    <Card className="p-6 bg-cyan-900/10 border-cyan-700/30">
                      <div className="text-3xl font-bold text-cyan-300 mb-2">900,000</div>
                      <div className="text-sm text-slate-400 mb-3">90% - Loss-Mining Pool</div>
                      <p className="text-xs text-slate-500">Distributed to players based on net losses</p>
                    </Card>
                  </div>

                  <Card className="mt-6 p-6 bg-red-900/10 border-red-700/50">
                    <p className="text-sm text-red-300 font-medium">
                      The maximum supply is capped at 1,000,000 PPL. The initial 100,000 PPL is followed by up to
                      900,000 PPL of capped loss-mining emission; after mining exhaustion, no new mining tokens can
                      be minted and burn mechanisms may reduce totalSupply.
                    </p>
                  </Card>
                  <Card className="mt-6 p-6 bg-slate-900/60 border-slate-700">
                    <h3 className="text-lg font-semibold text-purple-300 mb-3">Wager Accounting & Treasury Admission</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-400">
                      <li>Each wager accrues a 1% developer fee as a protected, pull-based liability; it is not pushed during game creation.</li>
                      <li>The remaining 99% is the net wager used for payout and positive net-loss accounting. Loss mining uses <code className="text-purple-300">max(99% of total wager − payout, 0)</code>.</li>
                      <li>A new game must fit within free house bankroll, defined as <code className="text-purple-300">max(houseBankroll − lockedBankroll, 0)</code>.</li>
                      <li>Its maximum possible payout must also be no more than 5% of that current free bankroll. Existing pending games therefore reduce capacity for later games.</li>
                      <li>The total-wager ceiling is owner-configurable and initializes at 1,000 native units; swaps are bounded separately by a 100-native-unit input/value limit, reserve-impact checks, and minimum-liquidity checks.</li>
                    </ul>
                    <p className="text-xs text-slate-500 mt-4">This limits new exposure using maximum liability rather than win probability. It reduces insolvency risk but does not guarantee profit, availability, or successful external VRF fulfillment.</p>
                  </Card>
                </div>
              </section>

              {/* Loss-Mining Model */}
              <section id="mining" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-white mb-6 pb-3 border-b border-slate-800">
                  6. Loss-Mining Emission Model
                </h2>
                <div className="prose prose-invert max-w-none space-y-4 text-slate-300 leading-relaxed">
                  <Card className="mb-6 p-6 bg-cyan-900/10 border-cyan-700/50">
                    <h3 className="text-lg font-semibold text-cyan-300 mb-3">A Novel Fair Distribution Mechanism</h3>
                    <p className="text-sm text-slate-400 mb-3">
                      To the best of our knowledge, the Loss-Mining Pool represents one of the first token distribution
                      systems where:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-400 ml-4">
                      <li>
                        <strong>Token allocation is directly proportional to realized net loss</strong>, not to
                        arbitrary staking, pre-sales, or insider allocations
                      </li>
                      <li>
                        <strong>Early participants earn tokens at lower "loss cost"</strong> (0.02 MATIC per PPL), while
                        later participants face progressively higher costs (up to 0.10 MATIC)
                      </li>
                      <li>
                        <strong>Distribution curve is transparent and predictable</strong>, encoded in smart contracts
                        and auditable by anyone
                      </li>
                    </ul>
                    <p className="text-sm text-slate-400 mt-4">
                      This creates a system where the main way to earn significant token allocations is to{" "}
                      <strong>actually participate in the game</strong> and accept the associated risk – not through
                      privileged access or insider deals.
                    </p>
                  </Card>

                  <p>
                    The loss-mining model converts part of players' net losses into PPL tokens. The key idea:{" "}
                    <span className="text-purple-400 font-semibold">
                      earlier participants mine tokens more cheaply; later participants face higher "loss cost" per
                      token.
                    </span>
                  </p>
                  <p>
                    Net loss is calculated after the 1% developer fee is accounted for:{" "}
                    <code className="text-purple-400 bg-slate-900/50 px-2 py-1 rounded">max(99% of total wager − payout, 0)</code>.
                    The fee remains a protected liability and is withdrawn separately; PPL rewards are not a refund or
                    reimbursement of the wager.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-6">Mining Tiers</h3>
                  <p>The 900,000 emission tokens are split into 9 tiers of 100,000 PPL each:</p>

                  <div className="grid gap-3 mt-4">
                    {[
                      { tier: 1, cost: "0.02" },
                      { tier: 2, cost: "0.03" },
                      { tier: 3, cost: "0.04" },
                      { tier: 4, cost: "0.05" },
                      { tier: 5, cost: "0.06" },
                      { tier: 6, cost: "0.07" },
                      { tier: 7, cost: "0.08" },
                      { tier: 8, cost: "0.09" },
                      { tier: 9, cost: "0.10" },
                    ].map(({ tier, cost }) => (
                      <Card key={tier} className="p-4 bg-slate-900/30 border-slate-700/50">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-white">Tier {tier}</span>
                          <span className="text-slate-400">100,000 PPL</span>
                          <span className="text-purple-400 font-mono">1 PPL = {cost} MATIC loss</span>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <Card className="mt-6 p-6 bg-blue-900/10 border-blue-700/50">
                    <h4 className="font-semibold text-blue-300 mb-2">Progressive Scarcity</h4>
                    <p className="text-sm text-slate-400">
                      As tiers are filled, the "price" in terms of loss per token increases stepwise. Early users
                      receive more PPL for the same loss, while over time, marginal PPL becomes more expensive to mine,
                      increasing scarcity.
                    </p>
                  </Card>

                  {/* Chart A */}
                  <div className="mt-8">
                    <EmissionChart miningEmitted={350000} />
                  </div>

                  <h3 className="text-xl font-semibold text-white mt-8">How Mining Works Per Game</h3>
                  <ol className="list-decimal list-inside space-y-3 ml-4">
                    <li>
                      Compute the player's net result:{" "}
                      <code className="text-purple-400 bg-slate-900/50 px-2 py-1 rounded">
                        netLoss = max(totalBet – totalPayout, 0)
                      </code>
                    </li>
                    <li>If netLoss = 0, no mining occurs.</li>
                    <li>
                      While netLoss remains and tokens are available:
                      <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                        <li>Determine current tier (based on tokens already emitted).</li>
                        <li>Calculate tokens this loss can buy at the tier's MATIC-per-token value.</li>
                        <li>Deduct the implied loss amount from netLoss.</li>
                        <li>Mint those tokens to the player.</li>
                      </ul>
                    </li>
                    <li>Once 900,000 PPL have been emitted, mining stops permanently.</li>
                  </ol>

                  <Card className="mt-6 p-6 bg-amber-900/10 border-amber-700/50">
                    <p className="text-sm text-amber-300">
                      <strong>Important:</strong> This model does not make losing profitable. Instead, it softens losses
                      by linking them to a quantifiable share of the protocol's token, with increasing marginal cost
                      over time.
                    </p>
                  </Card>
                </div>
              </section>

              {/* Vault & Post-Emission Supply Reduction */}
              <section id="vault" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-white mb-6 pb-3 border-b border-slate-800">
                  7. Vault, Swap & Post-Emission Supply Reduction
                </h2>
                <div className="prose prose-invert max-w-none space-y-4 text-slate-300 leading-relaxed">
                  <p>
                  During the capped emission phase, totalSupply can increase as loss-mining rewards are issued, up to
                  the 1,000,000 PPL maximum. After mining exhaustion, burn mechanisms can reduce totalSupply and may
                  create post-emission supply reduction; neither token scarcity nor price appreciation is guaranteed.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-6">Swap System</h3>
                  <p>PolyPlinko includes a simple AMM-style swap for PPL:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Users can swap MATIC ↔ PPL directly in the protocol.</li>
                    <li>The internal pool maintains native and PPL reserves and applies constant-product-style reserve pricing.</li>
                    <li>Each user-initiated swap charges a 5% fee on the input side.</li>
                    <li>Trades are subject to reserve/liquidity checks, a maximum input/value bound, and a 30% reserve-impact limit.</li>
                  </ul>

                  <div className="grid md:grid-cols-2 gap-4 mt-6">
                    <Card className="p-6 bg-purple-900/10 border-purple-700/30">
                      <h4 className="font-semibold text-purple-300 mb-3">MATIC → PPL</h4>
                      <ul className="text-sm space-y-2">
                        <li>• 5% of input MATIC goes to vault</li>
                        <li>• Remaining 95% used for trade</li>
                        <li>• MATIC fees accumulate over time</li>
                      </ul>
                    </Card>
                    <Card className="p-6 bg-blue-900/10 border-blue-700/30">
                      <h4 className="font-semibold text-blue-300 mb-3">PPL → MATIC</h4>
                      <ul className="text-sm space-y-2">
                        <li>• 5% of input PPL is burned</li>
                        <li>• Remaining 95% used for trade</li>
                        <li>• Reduces circulating supply</li>
                      </ul>
                    </Card>
                  </div>
                  <Card className="mt-6 p-6 bg-amber-900/10 border-amber-700/50">
                    <h4 className="font-semibold text-amber-300 mb-2">AMM and Market-Ordering Risk</h4>
                    <p className="text-sm text-slate-400">
                      This is an internal reserve-priced AMM, not an external Uniswap pool. It uses trade-size and
                      reserve-impact bounds, but no independent oracle or complete MEV protection. Spot prices can be
                      moved by trades, and public-mempool sandwich or other ordering strategies remain possible. PPL
                      liquidity, execution price, and buyback value are not guaranteed.
                    </p>
                  </Card>

                  <h3 className="text-xl font-semibold text-white mt-8">Buyback & Burn from Vault</h3>
                  <p>There are separate buyback-and-burn paths:</p>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>Accumulated native fee balance can trigger an automatic threshold buyback, and the owner can separately call the owner-operated buyback path.</li>
                    <li>Those paths buy PPL from the internal reserve pool and burn the acquired PPL.</li>
                    <li>After mining exhaustion, a player-loss buyback uses 70% of applicable positive net loss; 30% of those purchased PPL is burned and 70% is sent to the player.</li>
                  </ol>
                  <p className="mt-4">This has two effects:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Reduces circulating supply of PPL.</li>
                    <li>Can create buy pressure and reduce supply, subject to liquidity, execution, and market conditions; it is not a price guarantee.</li>
                  </ul>

                  {/* Chart B */}
                  <div className="mt-8">
                    <SupplyBurnChart />
                  </div>

                  <h3 className="text-xl font-semibold text-white mt-8">Post-Mining Behavior</h3>
                  <p>Once all 900,000 mining tokens have been emitted:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>No additional mining PPL can be minted after the 900,000-PPL mining allocation is exhausted; the 1,000,000-PPL value is a maximum supply cap.</li>
                    <li>Loss-mining transitions to a buyback mode, using existing supply from the AMM.</li>
                  </ul>

                  <Card className="mt-6 p-6 bg-cyan-900/10 border-cyan-700/50">
                    <h4 className="font-semibold text-cyan-300 mb-3">Separate Native and PPL Post-Mining Splits</h4>
                    <p className="text-sm text-slate-400 mb-4">
                      For each game where netLoss {">"} 0 after mining is complete:
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-3xl font-bold text-cyan-300 mb-1">70%</div>
                        <p className="text-sm text-slate-400">
                          Routed to <strong>automatic buyback</strong>: native funds purchase PPL from the swap pool.
                          Of the purchased PPL, 30% is permanently burned and 70% is sent to the losing player.
                        </p>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-slate-300 mb-1">30%</div>
                        <p className="text-sm text-slate-400">
                          Retained by the <strong>house / protocol balance</strong> for system stability. This is a
                          native-asset split and is separate from the 30% PPL burn / 70% player split.
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="mt-6 p-6 bg-purple-900/10 border-purple-700/50">
                    <h4 className="font-semibold text-purple-300 mb-3">Understanding the 30% House Allocation</h4>
                    <p className="text-sm text-slate-400 mb-3">
                      The 30% retained by the house is <strong>not simply "house profit"</strong>. Instead, it serves
                      multiple functions that may indirectly benefit long-term participants:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-400 ml-4">
                      <li>
                        <strong>System Resilience:</strong> Supports bankroll accounting and protected-liability
                        coverage against variance; it does not guarantee payment in every operational circumstance
                      </li>
                      <li>
                        <strong>Future Buyback & Burn:</strong> Accumulated vault funds can be used for periodic buyback
                        operations, removing PPL from circulation
                      </li>
                      <li>
                        <strong>Long-term Deflationary Pressure:</strong> By reducing circulating supply over time,
                        vault burns may support higher scarcity (though price is never guaranteed)
                      </li>
                    </ul>
                    <p className="text-sm text-slate-500 italic mt-4">
                      Remember: These are intended mechanisms. Actual outcomes depend on market conditions, usage
                      patterns, and many factors beyond protocol control. Token value can decline despite these
                      features.
                    </p>
                  </Card>

                  <p className="mt-6">This design creates:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Conditional PPL demand after mining exhaustion when eligible losses, available liquidity, and protocol guards allow a buyback to execute.</li>
                    <li>
                      A post-mining mechanism where 70% of purchased PPL is sent to the losing player, while 30% is
                      permanently burned; this is separate from capped mining issuance.
                    </li>
                    <li>
                      Native house retention of 30% that supports protocol accounting and may fund future operations;
                      it is not a guarantee of long-term token performance.
                    </li>
                    <li>
                      The 5% swap fee on user-initiated trades continues to burn PPL and grow reserves, enhancing the
                      deflationary profile.
                    </li>
                  </ul>
                </div>
              </section>

              {/* Economic Intuition */}
              <section id="economics" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-white mb-6 pb-3 border-b border-slate-800">
                  8. Economic Intuition: From Gambling to Long-Term Participation
                </h2>
                <div className="prose prose-invert max-w-none space-y-4 text-slate-300 leading-relaxed">
                  <p>From a mathematical standpoint, each Plinko ball remains a game of chance:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Outcomes are random and verifiable.</li>
                    <li>Verified RTP is approximately 90.03%–90.48% across supported configurations, implying a gross house edge of approximately 9.52%–9.97%.</li>
                    <li>Players can lose part or all of their stake in any given game.</li>
                  </ul>

                  <p className="mt-6">
                    However, the PolyPlinko architecture introduces three key differences compared to traditional,
                    purely extractive gambling:
                  </p>

                  <div className="grid gap-4 mt-6">
                    <Card className="p-6 bg-gradient-to-r from-purple-900/20 to-purple-900/5 border-purple-700/50">
                      <h3 className="text-lg font-semibold text-purple-300 mb-3">
                        1. Losses Generate a Persistent Asset
                      </h3>
                      <p className="text-sm text-slate-400">
                        Part of a player's positive net loss can result in PPL via capped mining or, after exhaustion,
                        a guarded buyback. Token value is variable, AMM realization is subject to liquidity and
                        slippage, and these rewards do not reimburse the wager or make losing profitable.
                      </p>
                    </Card>

                    <Card className="p-6 bg-gradient-to-r from-blue-900/20 to-blue-900/5 border-blue-700/50">
                      <h3 className="text-lg font-semibold text-blue-300 mb-3">2. Capped Emission, Then Possible Deflation</h3>
                      <ul className="text-sm text-slate-400 space-y-2">
                        <li>• Supply begins at 100,000 PPL and can increase through capped loss-mining emission up to the 1,000,000 PPL maximum.</li>
                        <li>
                          • After mining completes, no new mining tokens are created. Eligible losses may use 70% of
                          applicable native value for buyback; purchased PPL is split 30% burn / 70% player.
                        </li>
                        <li>
                          • Swap fees and buyback-and-burn operations can reduce totalSupply, creating potential
                          scarcity pressure without guaranteeing price support.
                        </li>
                      </ul>
                    </Card>

                    <Card className="p-6 bg-gradient-to-r from-cyan-900/20 to-cyan-900/5 border-cyan-700/50">
                      <h3 className="text-lg font-semibold text-cyan-300 mb-3">3. Alignment with Long-Term Health</h3>
                      <p className="text-sm text-slate-400 mb-3">If the protocol sees sustained usage over years:</p>
                      <ul className="text-sm text-slate-400 space-y-2">
                        <li>• Swap volume grows, generating more burn fees</li>
                        <li>• House reserves retain the 30% post-mining allocation</li>
                        <li>• Successful post-mining buybacks can create additional demand pressure</li>
                        <li>• Circulating supply may gradually decline due to burns</li>
                      </ul>
                      <p className="text-sm text-slate-500 italic mt-3">
                        These factors <strong>can contribute to</strong> potentially stronger price support over time,
                        though no outcome is guaranteed. Market dynamics, user behavior, and external factors can
                        overwhelm these mechanics.
                      </p>
                    </Card>
                  </div>

                  {/* Chart C */}
                  <div className="mt-8">
                    <PricePressureChart />
                  </div>

                  <Card className="mt-6 p-6 bg-green-900/10 border-green-700/50">
                    <p className="text-sm text-green-300">
                      <strong>Bottom Line:</strong> PolyPlinko does not remove risk or guarantee profit. However, it
                      transforms the experience from pure extraction into transparent, long-term participation where
                      losses contribute to a measurable, on-chain asset with built-in deflationary pressure.
                    </p>
                  </Card>
                </div>
              </section>

              {/* Risk & Responsibility */}
              <section id="risk" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-white mb-6 pb-3 border-b border-slate-800">
                  9. Risk, Responsibility & Regulatory Notes
                </h2>
                <div className="prose prose-invert max-w-none space-y-4 text-slate-300 leading-relaxed">
                  <Card className="p-6 bg-red-900/20 border-red-700/50">
                    <h3 className="text-lg font-semibold text-red-300 mb-4">High-Risk Protocol Warning</h3>
                    <p className="text-sm text-red-200 mb-4">
                      Despite its tokenomics and deflationary mechanics, PolyPlinko is still a high-risk application:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-red-200">
                      <li>Game outcomes are random and beyond user control.</li>
                      <li>Users can lose all the MATIC they stake in the game.</li>
                      <li>PPL token price is entirely market-driven and may fall to zero.</li>
                    </ul>
                  </Card>

                  <h3 className="text-xl font-semibold text-white mt-8">Important Points</h3>

                  <div className="space-y-4">
                    <Card className="p-4 bg-slate-900/50 border-slate-700">
                      <h4 className="font-semibold text-amber-300 mb-2">No Guarantees of Profit</h4>
                      <p className="text-sm text-slate-400">
                        The system uses explicit probability, accounting, and exposure controls; these do not assure
                        gains, solvency under every external condition, or uninterrupted service.
                      </p>
                    </Card>

                    <Card className="p-4 bg-slate-900/50 border-slate-700">
                      <h4 className="font-semibold text-amber-300 mb-2">Not Investment Advice</h4>
                      <p className="text-sm text-slate-400">
                        Nothing in this protocol or whitepaper should be interpreted as financial, legal, or tax advice.
                      </p>
                    </Card>

                    <Card className="p-4 bg-slate-900/50 border-slate-700">
                      <h4 className="font-semibold text-amber-300 mb-2">Regulation</h4>
                      <p className="text-sm text-slate-400">
                        Depending on jurisdiction, PolyPlinko may be considered a game of chance, a financial product,
                        or something else. Users are responsible for understanding and complying with applicable laws
                        where they live.
                      </p>
                    </Card>

                    <Card className="p-4 bg-slate-900/50 border-slate-700">
                      <h4 className="font-semibold text-amber-300 mb-2">Self-Responsibility</h4>
                      <p className="text-sm text-slate-400">
                        Users should only risk funds they can afford to lose and should approach PolyPlinko as an
                        experimental, high-volatility protocol.
                      </p>
                    </Card>
                  </div>

                  <Card className="mt-6 p-6 bg-slate-900/70 border-slate-700">
                    <p className="text-sm text-slate-300 text-center">
                      While the project aims to shift incentives away from pure short-term gambling toward long-term
                      participation,{" "}
                      <span className="text-amber-400 font-semibold">it does not eliminate uncertainty or risk.</span>
                    </p>
                  </Card>
                  <Card className="mt-8 p-6 bg-slate-900/70 border-slate-700">
                    <h3 className="text-lg font-semibold text-cyan-300 mb-3">Current Status & Trust Boundaries</h3>
                    <p className="text-sm text-slate-400 mb-3">
                      The repository implementation, treasury accounting, tokenomics, simulations, and frontend are
                      locally implemented and tested. No public-chain deployment, real Chainlink VRF validation, or
                      independent external smart-contract audit is represented here. Broad real-money launch and
                      legal/compliance review remain incomplete.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-400">
                      <li>Users sign paid transactions with their own wallets; the web server is not intended to hold privileged blockchain keys or choose paid outcomes.</li>
                      <li>The owner can pause game/swap activity, withdraw safely available protocol funds, update the developer address, adjust the maximum total bet, and operate the owner buyback-and-burn path, subject to contract checks.</li>
                      <li>The owner has no arbitrary PPL mint authority. MAX_SUPPLY and the mining allocation remain enforced, and the 30% post-mining burn and 5% new-game liability cap have no mutable owner setter.</li>
                      <li>Server compromise can still disrupt or misrepresent the user interface; users should verify wallet transaction details and on-chain receipts.</li>
                    </ul>
                  </Card>
                </div>
              </section>

              {/* Roadmap */}
              <section id="roadmap" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-white mb-6 pb-3 border-b border-slate-800">
                  10. Roadmap & Future Directions
                </h2>
                <div className="prose prose-invert max-w-none space-y-4 text-slate-300 leading-relaxed">
                  <p>Potential future directions include:</p>

                  <div className="grid gap-4 mt-6">
                    <Card className="p-6 bg-slate-900/50 border-slate-700 hover:border-purple-700/50 transition-colors">
                      <h3 className="text-lg font-semibold text-purple-400 mb-2">Advanced Analytics UI</h3>
                      <p className="text-sm text-slate-400 mb-3">Real-time charts and dashboards:</p>
                      <ul className="list-disc list-inside text-sm text-slate-500 space-y-1">
                        <li>Vault balance over time</li>
                        <li>Burned PPL supply tracking</li>
                        <li>Cumulative loss-mining distribution by address</li>
                        <li>Live game statistics and player rankings</li>
                      </ul>
                    </Card>

                    <Card className="p-6 bg-slate-900/50 border-slate-700 hover:border-blue-700/50 transition-colors">
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Governance Hooks</h3>
                      <p className="text-sm text-slate-400 mb-3">
                        Allowing PPL holders to vote on protocol parameters:
                      </p>
                      <ul className="list-disc list-inside text-sm text-slate-500 space-y-1">
                        <li>Fee parameters adjustments</li>
                        <li>Buyback schedules and timing</li>
                        <li>New games and features</li>
                        <li>Protocol upgrades and improvements</li>
                      </ul>
                    </Card>

                    <Card className="p-6 bg-slate-900/50 border-slate-700 hover:border-cyan-700/50 transition-colors">
                      <h3 className="text-lg font-semibold text-cyan-400 mb-2">Additional Games</h3>
                      <p className="text-sm text-slate-400">
                        Integrating other provably fair games that share the same token, vault, and deflationary
                        infrastructure. Potential additions: dice, roulette, crash, and more.
                      </p>
                    </Card>

                    <Card className="p-6 bg-slate-900/50 border-slate-700 hover:border-green-700/50 transition-colors">
                      <h3 className="text-lg font-semibold text-green-400 mb-2">Cross-Chain Expansion</h3>
                      <p className="text-sm text-slate-400">
                        Bridging PPL to other networks (Ethereum, Arbitrum, Optimism) while preserving total supply and
                        deflationary mechanics across chains.
                      </p>
                    </Card>
                  </div>

                  <Card className="mt-8 p-6 bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-cyan-900/20 border-purple-700/50">
                    <h3 className="text-xl font-semibold text-white mb-4">Long-Term Vision</h3>
                    <p className="text-sm text-slate-300">
                      To build a transparent, composable gambling-meets-DeFi primitive where:
                    </p>
                    <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 mt-3">
                      <li>The house edge remains explicit and bounded.</li>
                      <li>
                        Users retain a verifiable history of participation and a tokenized link to future protocol
                        activity.
                      </li>
                      <li>
                        The protocol can evolve toward richer forms of on-chain entertainment and coordinated value
                        sharing.
                      </li>
                    </ul>
                  </Card>
                </div>
              </section>
            </div>

            {/* Bottom Disclaimer */}
            <Card className="mt-12 p-6 bg-amber-900/20 border-amber-700/50">
              <p className="text-sm text-amber-300 text-center">
                <strong>Disclaimer:</strong> PolyPlinko is a high-risk protocol. This whitepaper is informational only
                and does not constitute financial, investment, legal, or tax advice. Users are responsible for
                understanding and accepting all risks before participating.
              </p>
            </Card>
          </main>
        </div>
      </div>
    </div>
  )
}
