# Changelog

All notable changes to PolyPlinko will be documented in this file.

## [2.0.0] - 2025-12-01

### Added
- **Demo Mode**: Free play with up to 10 balls per day without wallet connection
  - Local storage tracking of daily usage
  - Automatic reset at midnight
  - Toggle switch in game controls
  - Clear messaging about remaining plays
  
- **Sound Effects System**: Web Audio API integration
  - Ball drop sounds (subtle tones)
  - Win sounds (small, medium, big - different melodies)
  - Loss sound (somber tone)
  - Mute/unmute toggle in controls
  
- **Big Win Celebrations**: Special effects for 2x+ profit
  - Full-screen yellow gradient overlay
  - Animated "BIG WIN!" text with bounce
  - Rotating sparkle icons
  - Epic ascending chord sound
  
- **Whitepaper Page**: Comprehensive technical documentation
  - Interactive emission tier charts
  - Supply and burn dynamics visualization
  - Conceptual price pressure modeling
  - Sticky table of contents with scroll-spy
  - Back button to return to game
  
- **How to Play Page**: Complete user guide
  - Game mechanics explanation
  - Tokenomics breakdown
  - Loss-mining details
  - AMM and swap mechanics
  - Strategy tips
  
- **Footer Component**: Site-wide footer
  - Quick links to game and docs
  - Resource links (contracts, docs, GitHub)
  - Social media placeholders
  - Legal disclaimers

### Changed
- **Minimum Bet**: Now 0.01 POL (down from 0.001)
- **Loss-Mining Tiers**: Changed from 10 tiers (0.1-1.0 MATIC) to 9 tiers (0.02-0.10 MATIC)
- **Post-Mining Split**: Changed from 80/20 to 70/30 (70% buyback to player, 30% to vault)
- **Pin Layout**: Reduced curve for more triangular/linear pin arrangement
- **Slot Labels**: Improved spacing to prevent overlap on high row counts
- **Token Symbol**: Changed from generic to "PPL" throughout UI

### Fixed
- **Number Overflow**: Bet amount and total bet display now properly formatted
- **Slot Overlap**: Bottom multipliers no longer topple with high row counts
- **Pin Curve**: Less curved pin layout for better visual clarity
- **Min Bet Validation**: Frontend enforces 0.01 POL minimum

### Security
- Added demo mode isolation (no real funds interaction)
- Improved input validation for bet amounts
- Enhanced bankroll protection with locked reserve tracking

## [1.0.0] - 2025-11-28

### Added
- Initial release
- Plinko game with VRF randomness
- Loss-mining token distribution
- AMM swap with 5% fee and burn
- Real-time game animations
- Token dashboard
- Recent games history
- Inline wallet connection
- Smart contract deployment scripts

---

## Version History Legend

- **Added**: New features
- **Changed**: Changes to existing functionality  
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements
