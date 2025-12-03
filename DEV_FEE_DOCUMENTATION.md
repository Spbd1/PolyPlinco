# Dev Fee Implementation Documentation

## Overview

PolyPlinko implements a 1% development fee on every game played. This fee is automatically deducted from each bet and sent to a designated admin address that is separate from the smart contract.

## Implementation Details

### Fee Structure
- **Rate**: 1% of total bet amount
- **Calculation**: `devFee = totalBet / 100`
- **Net Bet**: `netBet = totalBet - devFee`

### Code Location
File: `contracts/PolyPlinkoGame.sol`
Function: `playPlinko()`
Lines: 397-401, 434-436

### Fee Flow

\`\`\`
User Bet (100 MATIC)
    │
    ├─► 1% (1 MATIC) → devAddress (Admin Wallet)
    │
    └─► 99% (99 MATIC) → Game Pool
            │
            ├─► Player Payout (if win)
            ├─► House Bankroll (net edge)
            └─► Loss Mining Rewards (if loss)
\`\`\`

### Security Features

1. **Separate Address**: Dev fee goes to `devAddress`, NOT the contract itself
2. **Immutable Check**: Transfer failure reverts entire transaction
3. **CEI Pattern**: Fee calculation happens before external calls
4. **ReentrancyGuard**: Protected against reentrancy attacks

### Configuration

#### Constructor
```solidity
constructor(address _devAddress) Ownable(_devAddress) {
    require(_devAddress != address(0), "Invalid dev address");
    devAddress = _devAddress;
    // ...
}
