"use client"

import Link from "next/link"
import { Send, Github } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-slate-800/50 bg-slate-950/80 backdrop-blur-sm mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <span className="text-2xl">🎰</span>
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                PolyPlinko
              </h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Provably fair Plinko on Polygon with loss-mining rewards and deflationary tokenomics.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/" className="text-slate-400 hover:text-purple-400 transition-colors">
                  Play Game
                </Link>
              </li>
              <li>
                <Link href="/how-to-play" className="text-slate-400 hover:text-purple-400 transition-colors">
                  How to Play
                </Link>
              </li>
              <li>
                <Link href="/whitepaper" className="text-slate-400 hover:text-purple-400 transition-colors">
                  Whitepaper
                </Link>
              </li>
              <li>
                <a
                  href="https://polygonscan.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-purple-400 transition-colors"
                >
                  View on PolygonScan
                </a>
              </li>
            </ul>
          </div>

          {/* Connect - Only Telegram and GitHub */}
          <div>
            <h4 className="font-semibold text-white mb-4">Connect</h4>
            <div className="space-y-3">
              <a
                href="https://t.me/polyplinko"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-slate-400 hover:text-purple-400 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-800/50 group-hover:bg-purple-600/20 flex items-center justify-center transition-colors">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium">Telegram</div>
                  <div className="text-xs text-slate-500">Join our community</div>
                </div>
              </a>
              <a
                href="https://github.com/polyplinko"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-slate-400 hover:text-purple-400 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-800/50 group-hover:bg-purple-600/20 flex items-center justify-center transition-colors">
                  <Github className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium">GitHub</div>
                  <div className="text-xs text-slate-500">View source code</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} PolyPlinko. All rights reserved.</p>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
              Built on Polygon PoS
            </span>
            <span className="hidden md:inline">•</span>
            <span>Powered by Chainlink VRF</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
