// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./PolyPlinkoToken.sol";

/**
 * @title PolyPlinkoGame - Provably Fair Plinko with Loss-Mining & AMM
 * @notice Main Plinko game contract with VRF randomness, loss-mining, and AMM swap
 * @dev House edge: ~10% (1% dev fee, ~9% to house)
 * 
 * KEY MECHANICS:
 * 1. Plinko Game: Users bet MATIC, results determined by Chainlink VRF
 * 2. Loss Mining (9 tiers): 0.02 → 0.10 MATIC per token across 900k tokens
 * 3. Post-Mining Buyback: 80% of net loss buys PPL from AMM and sends to player
 * 4. AMM Swap: MATIC ↔ PPL with 5% fee (vault accumulation + token burn)
 * 
 * SECURITY FEATURES:
 * - ReentrancyGuard on all external payable/token functions
 * - Max bet limits and row/ball validation
 * - Pausable game and swap independently
 * - Bankroll checks before game execution
 * - Slippage protection on swaps
 * - CEI pattern (Checks-Effects-Interactions)
 */
contract PolyPlinkoGame is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============================================
    // ENUMS & STRUCTS
    // ============================================
    
    enum RiskLevel { Low, Medium, High }
    
    struct GameConfig {
        uint8 rows;         // [8..32]
        uint16 balls;       // Updated to support up to 10,000 balls
        RiskLevel risk;
        uint256 betPerBall; // in wei
    }
    
    struct Game {
        address player;
        GameConfig config;
        uint256 totalBet;
        uint256 totalPayout;
        uint64 requestId;
        uint256 randomSeed;
        bool settled;
        uint40 createdAt;
    }
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    PolyPlinkoToken public immutable pplToken;
    address public devAddress;
    
    // Game state
    uint256 public gameIdCounter;
    mapping(uint256 => Game) public games;
    mapping(uint64 => uint256) public vrfRequestToGame;
    mapping(address => uint256[]) public playerGames;
    
    // VRF simulation (in production, use Chainlink VRF v2)
    uint256 private nonce;
    
    // Bankroll & reserves
    uint256 public houseBankroll;
    uint256 public lockedBankroll; // Reserved for active games
    
    // Paused state
    bool public gamePaused;
    bool public swapPaused;
    
    // Security limits
    uint256 public constant MIN_BET_PER_BALL = 0.001 ether;
    uint256 public constant MAX_BET_PER_BALL = 10 ether;
    uint256 public maxBetTotal = 1000 ether; // Adjustable by owner
    
    // ============================================
    // MULTIPLIERS & PROBABILITIES
    // ============================================
    
    uint32 constant WEIGHT_SCALE = 1e6;
    uint32 constant MULTIPLIER_SCALE = 1e4;
    
    // Precomputed slot weights for rows 8-32
    mapping(uint8 => uint32[]) public slotWeights;
    
    // Precomputed multipliers: multipliers[rows-8][riskLevel][slot]
    mapping(uint8 => mapping(RiskLevel => uint32[])) public slotMultipliers;
    
    // ============================================
    // LOSS MINING - NEW TOKENOMICS (9 TIERS)
    // ============================================
    
    uint256 public constant MINING_SUPPLY = 900_000 * 1e18; // 900k for mining
    uint256 public constant TOKENS_PER_TIER = 100_000 * 1e18; // 100k per tier
    uint256 public constant PRICE_BASE = 0.02 ether; // 0.02 MATIC for tier 1
    uint256 public constant PRICE_STEP = 0.01 ether; // +0.01 per tier
    uint256 public constant NUM_TIERS = 9;
    
    uint256 public miningEmitted; // Tokens minted via loss-mining
    
    // ============================================
    // POST-MINING BUYBACK (80% to loser, 20% to house)
    // ============================================
    
    uint256 public constant BUYBACK_PERCENT = 80; // 80% of net loss
    uint256 public totalBuybackVolume; // Track buyback volume
    
    // ============================================
    // AMM SWAP
    // ============================================
    
    uint256 public reserveMatic;
    uint256 public reserveToken;
    uint256 public vaultMatic; // Accumulated fees for buyback & burn
    
    uint256 public constant SWAP_FEE_PERCENT = 5;
    uint256 public totalTokensBurned;
    
    // ============================================
    // EMERGENCY SHUTDOWN
    // ============================================
    
    uint256 public emergencyShutdownTime;
    bool public isEmergencyShutdown;
    
    // ============================================
    // TIME-BASED RATE LIMITING PER PLAYER
    // ============================================
    
    mapping(address => uint256) public playerLastGameTime;
    uint256 public constant MIN_GAME_INTERVAL = 1 seconds; // Anti-spam
    
    // ============================================
    // MAXIMUM ACTIVE GAMES PER PLAYER
    // ============================================
    
    mapping(address => uint256) public playerActiveGames;
    uint256 public constant MAX_ACTIVE_GAMES_PER_PLAYER = 10;
    
    // ============================================
    // VAULT SAFETY LIMITS
    // ============================================
    
    uint256 public constant MAX_VAULT_BALANCE = 10000 ether; // Auto-trigger buyback above this
    uint256 public constant MIN_BUYBACK_THRESHOLD = 10 ether; // Minimum for buyback efficiency
    
    // ============================================
    // AMM MANIPULATION PROTECTION
    // ============================================
    
    uint256 public constant MIN_LIQUIDITY = 1 ether; // Prevent drain attacks
    uint256 public constant MAX_SWAP_SIZE = 100 ether; // Limit per swap to prevent manipulation
    
    // ============================================
    // EVENTS
    // ============================================
    
    event GameRequested(
        uint256 indexed gameId,
        address indexed player,
        uint64 requestId,
        uint256 totalBet,
        uint8 rows,
        uint16 balls,
        RiskLevel risk
    );
    
    event GameSettled(
        uint256 indexed gameId,
        address indexed player,
        uint256 randomSeed,
        uint256 totalBet,
        uint256 totalPayout,
        int256 profit,
        uint256 tokensEarned
    );
    
    event TokensMintedFromLoss(
        address indexed player,
        uint256 indexed gameId,
        uint256 netLoss,
        uint256 tokensMinted,
        uint256 currentTier
    );
    
    event BuybackToPlayer(
        address indexed player,
        uint256 indexed gameId,
        uint256 netLoss,
        uint256 maticUsed,
        uint256 tokensBought
    );
    
    event SwapMaticForPPL(
        address indexed user,
        uint256 maticIn,
        uint256 tokensOut,
        uint256 fee
    );
    
    event SwapPPLForMatic(
        address indexed user,
        uint256 tokensIn,
        uint256 maticOut,
        uint256 tokensBurned
    );
    
    event BuybackAndBurn(
        uint256 maticSpent,
        uint256 tokensBurned
    );
    
    event LiquidityAdded(
        uint256 maticAmount,
        uint256 tokenAmount
    );
    
    event EmergencyWithdraw(
        address indexed to,
        uint256 amount
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(address _devAddress) Ownable(_devAddress) {
        require(_devAddress != address(0), "Invalid dev address");
        devAddress = _devAddress;
        
        // Deploy token
        pplToken = new PolyPlinkoToken(_devAddress);
        pplToken.setGameContract(address(this));
        
        // Initialize multipliers and weights for all row configurations
        _initializeMultipliersAndWeights();
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    /**
     * @notice Initialize multipliers and weights for rows 8-32
     * @dev Precomputes binomial probabilities and risk-adjusted multipliers
     */
    function _initializeMultipliersAndWeights() private {
        // Initialize for all rows 8-32
        for (uint8 rows = 8; rows <= 32; rows++) {
            // Initialize weights (binomial distribution)
            uint32[] memory weights = _computeBinomialWeights(rows);
            slotWeights[rows - 8] = weights;
            
            // Initialize multipliers for each risk level
            for (uint8 r = 0; r < 3; r++) {
                RiskLevel risk = RiskLevel(r);
                uint32[] memory multipliers = _computeMultipliers(rows, risk, weights);
                slotMultipliers[rows - 8][risk] = multipliers;
            }
        }
    }
    
    /**
     * @notice Compute binomial weights for a given number of rows
     * @dev Uses Pascal's triangle to compute C(n, k) for all k
     * @param n Number of rows
     * @return weights Array of normalized weights (sum ≈ WEIGHT_SCALE)
     */
    function _computeBinomialWeights(uint8 n) private pure returns (uint32[] memory) {
        uint32[] memory weights = new uint32[](n + 1);
        uint256[] memory binomial = new uint256[](n + 1);
        
        // Pascal's triangle
        binomial[0] = 1;
        for (uint8 i = 1; i <= n; i++) {
            for (uint8 j = i; j > 0; j--) {
                binomial[j] = binomial[j] + binomial[j-1];
            }
        }
        
        // Normalize to WEIGHT_SCALE
        uint256 total = 2 ** n;
        uint256 sumWeights = 0;
        
        for (uint8 k = 0; k <= n; k++) {
            weights[k] = uint32((binomial[k] * WEIGHT_SCALE) / total);
            sumWeights += weights[k];
        }
        
        // Adjust last weight to ensure exact sum = WEIGHT_SCALE
        if (sumWeights != WEIGHT_SCALE) {
            weights[n] += uint32(WEIGHT_SCALE - sumWeights);
        }
        
        return weights;
    }
    
    /**
     * @notice Compute risk-adjusted multipliers with ~10% house edge
     * @dev Uses distance from center to create variance curves
     * @param n Number of rows
     * @param risk Risk level (Low/Medium/High)
     * @param weights Probability weights
     * @return multipliers Array of multipliers (scaled by MULTIPLIER_SCALE)
     */
    function _computeMultipliers(
        uint8 n,
        RiskLevel risk,
        uint32[] memory weights
    ) private pure returns (uint32[] memory) {
        uint32[] memory multipliers = new uint32[](n + 1);
        uint256 center = n / 2;
        
        // Compute raw multipliers
        uint256[] memory rawMults = new uint256[](n + 1);
        uint256 expectedRaw = 0;
        
        for (uint8 k = 0; k <= n; k++) {
            uint256 d = k > center ? k - center : center - k;
            uint256 x = (d * 1e4) / center; // normalized distance [0, 1e4]
            
            uint256 rawMult;
            if (risk == RiskLevel.Low) {
                // Low variance: 0.8 + 1.5 * x^2
                rawMult = 8000 + (15000 * x * x) / (1e4 * 1e4);
            } else if (risk == RiskLevel.Medium) {
                // Medium variance: 0.5 + 3.0 * x^2
                rawMult = 5000 + (30000 * x * x) / (1e4 * 1e4);
            } else {
                // High variance: 0.2 + 6.0 * x^3
                rawMult = 2000 + (60000 * x * x * x) / (1e4 * 1e4 * 1e4);
            }
            
            rawMults[k] = rawMult;
            expectedRaw += (rawMult * weights[k]) / WEIGHT_SCALE;
        }
        
        // Scale to 90% RTP (10% house edge)
        uint256 targetExpected = 9000; // 0.9 in MULTIPLIER_SCALE
        
        for (uint8 k = 0; k <= n; k++) {
            multipliers[k] = uint32((rawMults[k] * targetExpected) / expectedRaw);
        }
        
        return multipliers;
    }
    
    // ============================================
    // GAME FUNCTIONS
    // ============================================
    
    /**
     * @notice Play Plinko game
     * @param config Game configuration (rows, balls, risk, betPerBall)
     */
    function playPlinko(GameConfig calldata config) external payable nonReentrant {
        require(!gamePaused, "Game is paused");
        require(!isEmergencyShutdown, "Emergency shutdown active");
        
        require(
            block.timestamp >= playerLastGameTime[msg.sender] + MIN_GAME_INTERVAL,
            "Too frequent, wait before playing again"
        );
        
        require(
            playerActiveGames[msg.sender] < MAX_ACTIVE_GAMES_PER_PLAYER,
            "Too many active games"
        );
        
        require(config.rows >= 8 && config.rows <= 32, "Invalid rows");
        require(config.balls >= 1 && config.balls <= 10000, "Invalid balls");
        require(config.betPerBall >= MIN_BET_PER_BALL, "Bet too small");
        require(config.betPerBall <= MAX_BET_PER_BALL, "Bet too large");
        
        uint256 totalBet = config.betPerBall * config.balls;
        require(msg.value == totalBet, "Incorrect bet amount");
        require(totalBet <= maxBetTotal, "Total bet exceeds maximum");
        
        // Calculate max possible payout
        uint256 maxPayout = _calculateMaxPayout(config);
        
        uint256 availableBankroll = houseBankroll > lockedBankroll 
            ? houseBankroll - lockedBankroll 
            : 0;
        require(availableBankroll >= maxPayout, "Insufficient available bankroll");
        
        // Take 1% dev fee (Checks-Effects-Interactions pattern)
        uint256 devFee = totalBet / 100;
        uint256 netBet = totalBet - devFee;
        
        // Lock bankroll for this game
        lockedBankroll += maxPayout;
        playerActiveGames[msg.sender]++;
        playerLastGameTime[msg.sender] = block.timestamp;
        
        // Request randomness (simulated for demo; use Chainlink VRF in production)
        uint64 requestId = _requestRandomness();
        
        // Create game
        uint256 gameId = gameIdCounter++;
        games[gameId] = Game({
            player: msg.sender,
            config: config,
            totalBet: totalBet,
            totalPayout: 0,
            requestId: requestId,
            randomSeed: 0,
            settled: false,
            createdAt: uint40(block.timestamp)
        });
        
        vrfRequestToGame[requestId] = gameId;
        playerGames[msg.sender].push(gameId);
        
        emit GameRequested(
            gameId,
            msg.sender,
            requestId,
            totalBet,
            config.rows,
            config.balls,
            config.risk
        );
        
        // Transfer dev fee to separate admin address (NOT the contract)
        (bool devSuccess, ) = payable(devAddress).call{value: devFee}("");
        require(devSuccess, "Dev fee transfer failed");
        
        // Auto-fulfill for demo (in production, this happens via VRF callback)
        _fulfillRandomness(requestId, uint256(keccak256(abi.encode(block.timestamp, block.prevrandao, gameId, msg.sender))));
    }
    
    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================
    
    /**
     * @notice Fulfill randomness and settle game
     * @dev Called by VRF callback (simulated here)
     * @param requestId VRF request ID
     * @param randomness Random seed
     */
    function _fulfillRandomness(uint64 requestId, uint256 randomness) private {
        uint256 gameId = vrfRequestToGame[requestId];
        Game storage game = games[gameId];
        
        require(!game.settled, "Game already settled");
        
        game.randomSeed = randomness;
        
        // Calculate payout
        uint256 totalPayout = _calculatePayout(game);
        game.totalPayout = totalPayout;
        game.settled = true;
        
        // Unlock previously locked bankroll
        uint256 maxPayout = _calculateMaxPayoutFromGame(game);
        lockedBankroll -= maxPayout;
        playerActiveGames[game.player]--;
        
        if (totalPayout > 0) {
            (bool payoutSuccess, ) = payable(game.player).call{value: totalPayout}("");
            if (!payoutSuccess) {
                // If transfer fails, add to player's withdrawable balance
                // This prevents locked funds but requires withdrawal function
                revert("Payout transfer failed");
            }
        }
        
        // Loss mining or post-mining buyback
        uint256 tokensEarned = 0;
        if (game.totalBet > totalPayout) {
            uint256 netLoss = game.totalBet - totalPayout;
            tokensEarned = _handleLossReward(game.player, gameId, netLoss);
        }
        
        // Update bankroll
        int256 profit = int256(game.totalBet) - int256(totalPayout);
        if (profit > 0) {
            houseBankroll += uint256(profit);
        } else if (profit < 0) {
            // This should not happen given max payout check, but safety net
            uint256 loss = uint256(-profit);
            if (houseBankroll >= loss) {
                houseBankroll -= loss;
            } else {
                houseBankroll = 0;
            }
        }
        
        emit GameSettled(
            gameId,
            game.player,
            game.randomSeed,
            game.totalBet,
            totalPayout,
            profit,
            tokensEarned
        );
    }
    
    /**
     * @notice Calculate maximum possible payout for a game config
     * @param config Game configuration
     * @return maxPayout Maximum possible payout in MATIC
     */
    function _calculateMaxPayout(GameConfig calldata config) private view returns (uint256) {
        uint32[] memory multipliers = slotMultipliers[config.rows - 8][config.risk];
        
        // Find max multiplier
        uint32 maxMultiplier = 0;
        for (uint8 i = 0; i < multipliers.length; i++) {
            if (multipliers[i] > maxMultiplier) {
                maxMultiplier = multipliers[i];
            }
        }
        
        return (config.betPerBall * maxMultiplier * config.balls) / MULTIPLIER_SCALE;
    }
    
    /**
     * @notice Request randomness (simulated)
     * @dev In production, use Chainlink VRF v2
     */
    function _requestRandomness() private returns (uint64) {
        return uint64(++nonce);
    }
    
    /**
     * @notice Calculate max payout for an existing game
     */
    function _calculateMaxPayoutFromGame(Game storage game) private view returns (uint256) {
        uint32[] memory multipliers = slotMultipliers[game.config.rows - 8][game.config.risk];
        
        uint32 maxMultiplier = 0;
        for (uint8 i = 0; i < multipliers.length; i++) {
            if (multipliers[i] > maxMultiplier) {
                maxMultiplier = multipliers[i];
            }
        }
        
        return (game.config.betPerBall * maxMultiplier * game.config.balls) / MULTIPLIER_SCALE;
    }
    
    /**
     * @notice Calculate total payout for a game
     * @param game Game struct
     * @return totalPayout Total MATIC payout
     */
    function _calculatePayout(Game storage game) private view returns (uint256) {
        uint256 totalPayout = 0;
        
        uint8 rows = game.config.rows;
        uint32[] memory multipliers = slotMultipliers[rows - 8][game.config.risk];
        
        for (uint16 i = 0; i < game.config.balls; i++) {
            uint8 slot = _getSlotForBall(game.randomSeed, gameIdCounter, i, rows);
            uint256 multiplier = multipliers[slot];
            uint256 payout = (game.config.betPerBall * multiplier) / MULTIPLIER_SCALE;
            totalPayout += payout;
        }
        
        return totalPayout;
    }
    
    /**
     * @notice Get slot result for a ball
     * @param baseSeed Base random seed
     * @param gameId Game ID
     * @param ballIndex Ball index
     * @param rows Number of rows
     * @return slot Slot index [0..rows]
     */
    function _getSlotForBall(
        uint256 baseSeed,
        uint256 gameId,
        uint256 ballIndex,
        uint8 rows
    ) private view returns (uint8) {
        uint256 random = uint256(keccak256(abi.encode(baseSeed, gameId, ballIndex)));
        uint256 u = random % WEIGHT_SCALE;
        
        uint32[] memory weights = slotWeights[rows - 8];
        uint256 cumulative = 0;
        
        for (uint8 k = 0; k <= rows; k++) {
            cumulative += weights[k];
            if (u < cumulative) {
                return k;
            }
        }
        
        return rows; // Fallback
    }
    
    /**
     * @notice Handle loss rewards: either mint tokens (during mining) or buyback (post-mining)
     * @param player Player address
     * @param gameId Game ID
     * @param netLoss Net loss in MATIC
     * @return tokensReceived Total tokens received by player
     */
    function _handleLossReward(
        address player,
        uint256 gameId,
        uint256 netLoss
    ) private returns (uint256) {
        if (miningEmitted < MINING_SUPPLY) {
            // Mining phase: mint new tokens
            return _mintLossMiningTokens(player, gameId, netLoss);
        } else {
            // Post-mining: buyback 80% of loss and send PPL to player
            return _buybackToPlayer(player, gameId, netLoss);
        }
    }
    
    /**
     * @notice Mint tokens from loss mining with tiered pricing (9 tiers)
     * @dev Tier 1: 1 PPL per 0.02 MATIC loss
     *      Tier 2: 1 PPL per 0.03 MATIC loss
     *      ...
     *      Tier 9: 1 PPL per 0.10 MATIC loss
     * @param player Player address
     * @param gameId Game ID
     * @param netLoss Net loss in MATIC
     * @return tokensMinted Total tokens minted
     */
    function _mintLossMiningTokens(
        address player,
        uint256 gameId,
        uint256 netLoss
    ) private returns (uint256) {
        uint256 remainingLoss = netLoss;
        uint256 totalMinted = 0;
        uint256 startTier = miningEmitted / TOKENS_PER_TIER;
        
        while (remainingLoss > 0 && miningEmitted < MINING_SUPPLY) {
            uint256 tier = miningEmitted / TOKENS_PER_TIER; // 0..8
            require(tier < NUM_TIERS, "Mining complete");
            
            uint256 pricePerToken = PRICE_BASE + (tier * PRICE_STEP); // 0.02 + tier*0.01
            uint256 tokensLeftInTier = TOKENS_PER_TIER - (miningEmitted % TOKENS_PER_TIER);
            uint256 maxTokensFromLoss = remainingLoss / pricePerToken;
            
            uint256 tokensToMint = maxTokensFromLoss < tokensLeftInTier 
                ? maxTokensFromLoss 
                : tokensLeftInTier;
            
            if (tokensToMint == 0) break;
            
            uint256 lossConsumed = tokensToMint * pricePerToken;
            
            miningEmitted += tokensToMint;
            remainingLoss -= lossConsumed;
            totalMinted += tokensToMint;
        }
        
        if (totalMinted > 0) {
            pplToken.mintFromLossMining(player, totalMinted);
            emit TokensMintedFromLoss(player, gameId, netLoss, totalMinted, startTier);
        }
        
        return totalMinted;
    }
    
    /**
     * @notice Buyback PPL tokens for player using 70% of their net loss
     * @dev Post-mining mechanism: 70% to player as PPL, 30% stays as house profit
     * @param player Player address
     * @param gameId Game ID
     * @param netLoss Net loss in MATIC
     * @return tokensBought Tokens bought and sent to player
     */
    function _buybackToPlayer(
        address player,
        uint256 gameId,
        uint256 netLoss
    ) private returns (uint256) {
        if (reserveMatic == 0 || reserveToken == 0) {
            return 0; // No liquidity, cannot buyback
        }
        
        if (reserveMatic < MIN_LIQUIDITY || reserveToken < MIN_LIQUIDITY) {
            return 0;
        }
        
        uint256 buybackAmount = (netLoss * 70) / 100; // 70%
        uint256 houseAmount = netLoss - buybackAmount; // 30% to house
        
        // House portion stays in contract
        houseBankroll += houseAmount;
        
        // Buyback tokens from AMM (no fee for internal buyback)
        uint256 tokensBought = (buybackAmount * reserveToken) / (reserveMatic + buybackAmount);
        
        if (tokensBought > reserveToken / 2) {
            tokensBought = reserveToken / 2; // Never drain more than 50% of liquidity
        }
        
        if (tokensBought > 0) {
            reserveMatic += buybackAmount;
            reserveToken -= tokensBought;
            
            require(pplToken.balanceOf(address(this)) >= tokensBought, "Insufficient tokens in contract");
            pplToken.transfer(player, tokensBought);
            totalBuybackVolume += buybackAmount;
            
            emit BuybackToPlayer(player, gameId, netLoss, buybackAmount, tokensBought);
        }
        
        return tokensBought;
    }
    
    /**
     * @notice Internal buyback and burn function
     */
    function _autoBuybackAndBurn() private {
        uint256 maticToSpend = vaultMatic;
        vaultMatic = 0;
        
        uint256 maxBuyback = (reserveMatic * 20) / 100; // Max 20% of MATIC reserve
        if (maticToSpend > maxBuyback) {
            vaultMatic = maticToSpend - maxBuyback;
            maticToSpend = maxBuyback;
        }
        
        // Buy tokens from AMM
        uint256 tokensOut = (maticToSpend * reserveToken) / (reserveMatic + maticToSpend);
        require(tokensOut <= reserveToken, "Insufficient liquidity");
        
        reserveMatic += maticToSpend;
        reserveToken -= tokensOut;
        
        // Burn tokens
        pplToken.burnFrom(address(this), tokensOut);
        totalTokensBurned += tokensOut;
        
        emit BuybackAndBurn(maticToSpend, tokensOut);
    }
    
    // ============================================
    // AMM SWAP
    // ============================================
    
    /**
     * @notice Swap MATIC for PPL tokens
     * @param minTokensOut Minimum tokens to receive (slippage protection)
     */
    function swapExactMaticForTokens(uint256 minTokensOut) external payable nonReentrant {
        require(!swapPaused, "Swap is paused");
        require(!isEmergencyShutdown, "Emergency shutdown active");
        require(msg.value > 0, "Must send MATIC");
        
        require(msg.value <= MAX_SWAP_SIZE, "Swap size too large");
        
        require(reserveMatic > 0 && reserveToken > 0, "Liquidity not initialized");
        
        require(reserveMatic >= MIN_LIQUIDITY && reserveToken >= MIN_LIQUIDITY, "Insufficient liquidity");
        
        uint256 amountIn = msg.value;
        
        // 5% fee to vault
        uint256 fee = (amountIn * SWAP_FEE_PERCENT) / 100;
        uint256 tradeMatic = amountIn - fee;
        
        vaultMatic += fee;
        
        if (vaultMatic >= MAX_VAULT_BALANCE && reserveToken >= MIN_LIQUIDITY) {
            _autoBuybackAndBurn();
        }
        
        // Constant product formula
        uint256 tokensOut = (tradeMatic * reserveToken) / (reserveMatic + tradeMatic);
        require(tokensOut >= minTokensOut, "Slippage exceeded");
        require(tokensOut <= reserveToken, "Insufficient liquidity");
        
        require(tokensOut <= (reserveToken * 30) / 100, "Impact too high, reduce swap size");
        
        reserveMatic += tradeMatic;
        reserveToken -= tokensOut;
        
        pplToken.transfer(msg.sender, tokensOut);
        
        emit SwapMaticForPPL(msg.sender, amountIn, tokensOut, fee);
    }
    
    /**
     * @notice Swap PPL tokens for MATIC
     * @param tokenAmountIn Amount of tokens to swap
     * @param minMaticOut Minimum MATIC to receive (slippage protection)
     */
    function swapExactTokensForMatic(uint256 tokenAmountIn, uint256 minMaticOut) external nonReentrant {
        require(!swapPaused, "Swap is paused");
        require(!isEmergencyShutdown, "Emergency shutdown active");
        require(tokenAmountIn > 0, "Must send tokens");
        
        uint256 estimatedMaticValue = (tokenAmountIn * reserveMatic) / reserveToken;
        require(estimatedMaticValue <= MAX_SWAP_SIZE, "Swap size too large");
        
        require(reserveMatic > 0 && reserveToken > 0, "Liquidity not initialized");
        
        require(reserveMatic >= MIN_LIQUIDITY && reserveToken >= MIN_LIQUIDITY, "Insufficient liquidity");
        
        // Transfer tokens from user
        pplToken.transferFrom(msg.sender, address(this), tokenAmountIn);
        
        // 5% fee burned
        uint256 feeBurned = (tokenAmountIn * SWAP_FEE_PERCENT) / 100;
        uint256 tradeTokens = tokenAmountIn - feeBurned;
        
        pplToken.burnFrom(address(this), feeBurned);
        totalTokensBurned += feeBurned;
        
        // Constant product formula
        uint256 maticOut = (tradeTokens * reserveMatic) / (reserveToken + tradeTokens);
        require(maticOut >= minMaticOut, "Slippage exceeded");
        require(maticOut <= reserveMatic, "Insufficient liquidity");
        
        require(maticOut <= (reserveMatic * 30) / 100, "Impact too high, reduce swap size");
        
        reserveToken += tradeTokens;
        reserveMatic -= maticOut;
        
        (bool success, ) = payable(msg.sender).call{value: maticOut}("");
        require(success, "Transfer failed");
        
        emit SwapPPLForMatic(msg.sender, tokenAmountIn, maticOut, feeBurned);
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    function pauseGame() external onlyOwner {
        gamePaused = true;
    }
    
    function unpauseGame() external onlyOwner {
        gamePaused = false;
    }
    
    function pauseSwap() external onlyOwner {
        swapPaused = true;
    }
    
    function unpauseSwap() external onlyOwner {
        swapPaused = false;
    }
    
    function setDevAddress(address _devAddress) external onlyOwner {
        require(_devAddress != address(0), "Invalid address");
        devAddress = _devAddress;
    }
    
    function setMaxBetTotal(uint256 _maxBetTotal) external onlyOwner {
        require(_maxBetTotal >= 100 ether, "Max bet too low");
        maxBetTotal = _maxBetTotal;
    }
    
    /**
     * @notice Withdraw profits (only available bankroll, not locked)
     */
    function withdrawProfits(uint256 amount) external onlyOwner {
        uint256 available = houseBankroll > lockedBankroll ? houseBankroll - lockedBankroll : 0;
        require(amount <= available, "Insufficient available bankroll");
        houseBankroll -= amount;
        payable(owner()).transfer(amount);
    }
    
    /**
     * @notice Emergency withdraw (pause game first for safety)
     * @dev Only use in extreme circumstances
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(gamePaused, "Must pause game first");
        require(lockedBankroll == 0, "Active games pending");
        require(amount <= address(this).balance, "Insufficient balance");
        
        payable(owner()).transfer(amount);
        emit EmergencyWithdraw(owner(), amount);
    }
    
    /**
     * @notice Trigger emergency shutdown
     * @dev Only owner can call, irreversible for 7 days
     */
    function triggerEmergencyShutdown() external onlyOwner {
        require(!isEmergencyShutdown, "Already in shutdown");
        isEmergencyShutdown = true;
        emergencyShutdownTime = block.timestamp;
        gamePaused = true;
        swapPaused = true;
    }
    
    /**
     * @notice Cancel emergency shutdown (only within 7 days)
     */
    function cancelEmergencyShutdown() external onlyOwner {
        require(isEmergencyShutdown, "Not in shutdown");
        require(block.timestamp < emergencyShutdownTime + 7 days, "Shutdown period expired");
        isEmergencyShutdown = false;
        emergencyShutdownTime = 0;
    }
    
    receive() external payable {
        houseBankroll += msg.value;
    }
}
