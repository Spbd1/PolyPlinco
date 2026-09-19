// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./PolyPlinkoToken.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title PolyPlinkoGame - Provably Fair Plinko with Loss-Mining & AMM
 * @notice Main Plinko game contract with VRF randomness, loss-mining, and AMM swap
 * @dev House edge: ~10% (1% dev fee, ~9% to house)
 * 
 * KEY MECHANICS:
 * 1. Plinko Game: Users bet MATIC, results determined by Chainlink VRF
 * 2. Loss Mining (9 tiers): 0.02 → 0.10 MATIC per token across 900k tokens
 * 3. Post-Mining Buyback: 70% of net loss buys PPL from AMM; 30% of purchased PPL burns and 70% goes to player
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
        uint16 balls;       // Maximum 256 balls; bounded for VRF callback gas
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
    uint256 public devFeesAccrued;
    
    // Game state
    uint256 public gameIdCounter;
    mapping(uint256 => Game) public games;
    mapping(uint64 => uint256) public vrfRequestToGame;
    mapping(address => uint256[]) public playerGames;
    
    // VRF v2.5 subscription configuration. localMode is only for local/CI mocks.
    uint256 private nonce;
    address public randomnessCoordinator;
    uint256 public vrfSubscriptionId;
    bytes32 public vrfKeyHash;
    uint16 public vrfRequestConfirmations;
    uint32 public vrfCallbackGasLimit;
    bool public localMode;
    mapping(address => uint256) public pendingWithdrawals;
    uint256 public totalPendingWithdrawals;
    
    // Bankroll & reserves
    uint256 public houseBankroll;
    uint256 public lockedBankroll; // Reserved for active games
    
    // Paused state
    bool public gamePaused;
    bool public swapPaused;
    
    // Security limits
    uint256 public constant MIN_BET_PER_BALL = 0.001 ether;
    uint256 public constant MAX_BET_PER_BALL = 10 ether;
    uint256 public constant MAX_GAME_LIABILITY_BPS = 500; // 5% of current free house bankroll
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
    // POST-MINING BUYBACK: native split is 70% buyback / 30% retained.
    // Purchased PPL is separately split 30% burn / 70% player.
    // ============================================
    
    uint256 public constant BUYBACK_PERCENT = 70; // 70% of net loss
    uint256 public constant POST_MINING_BURN_BPS = 3000; // 30% of purchased PPL
    uint256 public constant BPS_DENOMINATOR = 10_000;
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

    event DevFeesWithdrawn(address indexed recipient, uint256 amount);
    
    event EmergencyWithdraw(
        address indexed to,
        uint256 amount
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(
        address _devAddress,
        address _randomnessCoordinator,
        uint256 _subscriptionId,
        bytes32 _keyHash,
        uint16 _requestConfirmations,
        uint32 _callbackGasLimit,
        bool _localMode
    ) Ownable(msg.sender) {
        require(_devAddress != address(0), "Invalid dev address");
        require(_randomnessCoordinator != address(0), "Invalid VRF coordinator");
        require(!_localMode || block.chainid == 1337 || block.chainid == 31337, "Local mode only on local chain");
        devAddress = _devAddress;
        randomnessCoordinator = _randomnessCoordinator;
        vrfSubscriptionId = _subscriptionId;
        vrfKeyHash = _keyHash;
        vrfRequestConfirmations = _requestConfirmations;
        vrfCallbackGasLimit = _callbackGasLimit;
        localMode = _localMode;
        // The game owns its token so initialization cannot be hijacked by the
        // developer EOA or another account.
        pplToken = new PolyPlinkoToken(_devAddress, address(this));
        pplToken.initializeVaultAllocation();

        // Weights are computed in memory on demand. This keeps deployment gas
        // bounded and avoids a constructor that cannot fit Polygon limits.
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
        require(config.balls >= 1 && config.balls <= 256, "Invalid balls");
        require(config.betPerBall >= MIN_BET_PER_BALL, "Bet too small");
        require(config.betPerBall <= MAX_BET_PER_BALL, "Bet too large");
        
        uint256 totalBet = config.betPerBall * config.balls;
        require(msg.value == totalBet, "Incorrect bet amount");
        require(totalBet <= maxBetTotal, "Total bet exceeds maximum");
        
        // Calculate max possible payout
        uint256 maxPayout = _calculateMaxPayout(config);
        
        uint256 freeHouseBankroll = _freeHouseBankroll();
        require(freeHouseBankroll >= maxPayout, "Insufficient available bankroll");
        require(
            maxPayout <= (freeHouseBankroll * MAX_GAME_LIABILITY_BPS) / BPS_DENOMINATOR,
            "Game exceeds bankroll risk limit"
        );
        
        // Take 1% dev fee (Checks-Effects-Interactions pattern)
        uint256 devFee = totalBet / 100;
        uint256 netBet = totalBet - devFee;
        
        // Lock bankroll for this game
        lockedBankroll += maxPayout;
        houseBankroll += netBet;
        playerActiveGames[msg.sender]++;
        playerLastGameTime[msg.sender] = block.timestamp;
        
        // Create the pending game before requesting so even a coordinator that
        // responds in the same transaction cannot target an uninitialized id.
        uint256 gameId = gameIdCounter++;
        games[gameId] = Game({
            player: msg.sender,
            config: config,
            totalBet: totalBet,
            totalPayout: 0,
            requestId: 0,
            randomSeed: 0,
            settled: false,
            createdAt: uint40(block.timestamp)
        });

        uint256 requestId256 = _requestRandomness();
        require(requestId256 <= type(uint64).max, "Request id overflow");
        uint64 requestId = uint64(requestId256);
        games[gameId].requestId = requestId;
        
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
        
        // Accrue the fee for pull-based withdrawal. A reverting developer
        // receiver must never be able to block a player's game request.
        devFeesAccrued += devFee;
        
    }
    
    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================
    
    /**
     * @notice Fulfill randomness and settle game
     * @dev Called by VRF callback (simulated here)
     * @param requestId VRF request ID
     * @param randomWords VRF output words
     */
    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external {
        require(msg.sender == randomnessCoordinator, "Only coordinator can fulfill");
        require(randomWords.length > 0, "No random words");
        require(requestId <= type(uint64).max, "Request id overflow");
        _fulfillRandomness(uint64(requestId), randomWords[0]);
    }

    function _fulfillRandomness(uint64 requestId, uint256 randomness) private {
        uint256 gameId = vrfRequestToGame[requestId];
        Game storage game = games[gameId];
        
        require(game.player != address(0), "Unknown request");
        require(game.requestId == requestId, "Unknown request");
        require(!game.settled, "Game already settled");
        
        game.randomSeed = randomness;
        
        // Calculate payout
        uint256 totalPayout = _calculatePayout(gameId);
        game.totalPayout = totalPayout;
        game.settled = true;
        
        // Unlock previously locked bankroll
        uint256 maxPayout = _calculateMaxPayoutFromGame(game);
        lockedBankroll -= maxPayout;
        playerActiveGames[game.player]--;
        
        if (totalPayout > 0) {
            (bool payoutSuccess, ) = payable(game.player).call{value: totalPayout}("");
            if (!payoutSuccess) {
                pendingWithdrawals[game.player] += totalPayout;
                totalPendingWithdrawals += totalPayout;
            }
        }
        
        // Loss mining or post-mining buyback
        uint256 tokensEarned = 0;
        uint256 netBet = game.totalBet - (game.totalBet / 100);
        if (netBet > totalPayout) {
            uint256 netLoss = netBet - totalPayout;
            tokensEarned = _handleLossReward(game.player, gameId, netLoss);
        }
        
        // Update bankroll
        int256 profit = int256(netBet) - int256(totalPayout);
        if (houseBankroll >= totalPayout) houseBankroll -= totalPayout;
        else revert("Accounting underflow");
        
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
    function _calculateMaxPayout(GameConfig calldata config) private pure returns (uint256) {
        uint32[] memory multipliers = _computeMultipliers(config.rows, config.risk, _computeBinomialWeights(config.rows));
        
        // Find max multiplier
        uint32 maxMultiplier = 0;
        for (uint8 i = 0; i < multipliers.length; i++) {
            if (multipliers[i] > maxMultiplier) {
                maxMultiplier = multipliers[i];
            }
        }
        
        return (config.betPerBall * maxMultiplier * config.balls) / MULTIPLIER_SCALE;
    }

    function _freeHouseBankroll() private view returns (uint256) {
        return houseBankroll > lockedBankroll ? houseBankroll - lockedBankroll : 0;
    }
    
    function _requestRandomness() private returns (uint256) {
        if (localMode) return ++nonce;
        return IVRFCoordinatorV2Plus(randomnessCoordinator).requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: vrfKeyHash,
                subId: vrfSubscriptionId,
                requestConfirmations: vrfRequestConfirmations,
                callbackGasLimit: vrfCallbackGasLimit,
                numWords: 1,
                extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}))
            })
        );
    }
    
    /**
     * @notice Calculate max payout for an existing game
     */
    function _calculateMaxPayoutFromGame(Game storage game) private view returns (uint256) {
        uint32[] memory multipliers = _computeMultipliers(game.config.rows, game.config.risk, _computeBinomialWeights(game.config.rows));
        
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
     * @param gameId Stored game id
     * @return totalPayout Total MATIC payout
     */
    function _calculatePayout(uint256 gameId) private view returns (uint256) {
        Game storage game = games[gameId];
        uint256 totalPayout = 0;
        
        uint8 rows = game.config.rows;
        uint32[] memory weights = _computeBinomialWeights(rows);
        uint32[] memory multipliers = _computeMultipliers(rows, game.config.risk, weights);
        
        for (uint16 i = 0; i < game.config.balls; i++) {
            uint8 slot = _getSlotForBall(game.randomSeed, gameId, i, rows, weights);
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
        uint8 rows,
        uint32[] memory weights
    ) private pure returns (uint8) {
        uint256 random = uint256(keccak256(abi.encode(baseSeed, gameId, ballIndex)));
        uint256 u = random % WEIGHT_SCALE;
        
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
            // Post-mining: buy back 70% of net loss, burn 30% of purchased
            // PPL, and send the remaining 70% to the player.
            return _buybackToPlayer(player, gameId, netLoss);
        }
    }

    /** @notice Seed the independent AMM reserve and house bankroll once. */
    function seedInitialLiquidityAndBankroll(uint256 tokenAmount) external payable onlyOwner {
        require(reserveMatic == 0 && reserveToken == 0, "Liquidity already initialized");
        require(msg.value > 0 && tokenAmount > 0, "Invalid liquidity");
        require(pplToken.balanceOf(address(this)) >= tokenAmount, "Insufficient token allocation");
        reserveMatic = msg.value / 2;
        houseBankroll = msg.value - reserveMatic;
        reserveToken = tokenAmount;
        emit LiquidityAdded(reserveMatic, tokenAmount);
    }

    function getPlayerGames(address player) external view returns (uint256[] memory) { return playerGames[player]; }
    function getAvailableBankroll() external view returns (uint256) {
        return _freeHouseBankroll();
    }

    function getLossMiningTierInfo() external view returns (uint256 tier, uint256 pricePerToken, uint256 tokensLeftInTier) {
        tier = miningEmitted / TOKENS_PER_TIER;
        if (tier >= NUM_TIERS) return (NUM_TIERS, 0, 0);
        pricePerToken = PRICE_BASE + tier * PRICE_STEP;
        tokensLeftInTier = TOKENS_PER_TIER - (miningEmitted % TOKENS_PER_TIER);
    }

    function getSlotWeight(uint8 rows, uint8 slot) external pure returns (uint32) {
        require(rows >= 8 && rows <= 32 && slot <= rows, "Invalid slot");
        return _computeBinomialWeights(rows)[slot];
    }

    function getSlotMultiplier(uint8 rows, RiskLevel risk, uint8 slot) external pure returns (uint32) {
        require(rows >= 8 && rows <= 32 && slot <= rows, "Invalid slot");
        return _computeMultipliers(rows, risk, _computeBinomialWeights(rows))[slot];
    }

    function getExpectedRtpBps(uint8 rows, RiskLevel risk) external pure returns (uint256) {
        require(rows >= 8 && rows <= 32, "Invalid rows");
        uint32[] memory weights = _computeBinomialWeights(rows);
        uint32[] memory multipliers = _computeMultipliers(rows, risk, weights);
        uint256 weighted = 0;
        for (uint8 slot = 0; slot <= rows; slot++) weighted += uint256(weights[slot]) * multipliers[slot];
        return weighted / WEIGHT_SCALE;
    }

    function getSwapQuoteMaticToTokens(uint256 maticIn) external view returns (uint256) {
        require(reserveMatic > 0 && reserveToken > 0, "Liquidity not initialized");
        uint256 tradeMatic = maticIn - (maticIn * SWAP_FEE_PERCENT / 100);
        return tradeMatic * reserveToken / (reserveMatic + tradeMatic);
    }

    function getSwapQuoteTokensToMatic(uint256 tokensIn) external view returns (uint256) {
        require(reserveMatic > 0 && reserveToken > 0, "Liquidity not initialized");
        uint256 tradeTokens = tokensIn - (tokensIn * SWAP_FEE_PERCENT / 100);
        return tradeTokens * reserveMatic / (reserveToken + tradeTokens);
    }

    function withdrawPendingPayout() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No pending payout");
        pendingWithdrawals[msg.sender] = 0;
        totalPendingWithdrawals -= amount;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
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
            // remainingLoss and pricePerToken are native wei; convert the
            // whole-token result into ERC-20 base units exactly once.
            uint256 maxTokensFromLoss = (remainingLoss * 1e18) / pricePerToken;
            
            uint256 tokensToMint = maxTokensFromLoss < tokensLeftInTier 
                ? maxTokensFromLoss 
                : tokensLeftInTier;
            
            if (tokensToMint == 0) break;
            
            uint256 lossConsumed = (tokensToMint * pricePerToken) / 1e18;
            
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
     * @notice Buyback PPL using 70% of the player's net loss
     * @dev Native side: 70% buys PPL and 30% remains with the house.
     *      PPL side: 30% is permanently burned and 70% goes to the player.
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
        
        uint256 buybackAmount = (netLoss * BUYBACK_PERCENT) / 100;
        // Buyback tokens from AMM (no fee for internal buyback)
        uint256 tokensBought = (buybackAmount * reserveToken) / (reserveMatic + buybackAmount);
        
        if (tokensBought > reserveToken / 2) {
            tokensBought = reserveToken / 2; // Never drain more than 50% of liquidity
        }
        
        if (tokensBought > 0) {
            // The net bet is already included in houseBankroll. Move only the
            // buyback portion into the AMM; the remaining 30% stays in the
            // house without being added a second time.
            require(houseBankroll >= buybackAmount, "Insufficient house bankroll");
            houseBankroll -= buybackAmount;
            reserveMatic += buybackAmount;
            reserveToken -= tokensBought;
            
            require(pplToken.balanceOf(address(this)) >= tokensBought, "Insufficient tokens in contract");
            uint256 burnAmount = (tokensBought * POST_MINING_BURN_BPS) / BPS_DENOMINATOR;
            uint256 playerAmount = tokensBought - burnAmount;
            if (burnAmount > 0) {
                pplToken.burnFrom(address(this), burnAmount);
                totalTokensBurned += burnAmount;
            }
            IERC20(address(pplToken)).safeTransfer(player, playerAmount);
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

    function buybackAndBurn() external onlyOwner nonReentrant {
        require(vaultMatic > 0, "Vault is empty");
        require(reserveMatic > 0 && reserveToken > 0, "Liquidity not initialized");
        uint256 maticToSpend = vaultMatic;
        vaultMatic = 0;
        uint256 tokensOut = (maticToSpend * reserveToken) / (reserveMatic + maticToSpend);
        reserveMatic += maticToSpend;
        reserveToken -= tokensOut;
        if (tokensOut > 0) {
            pplToken.burnFrom(address(this), tokensOut);
            totalTokensBurned += tokensOut;
        }
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
        
        IERC20(address(pplToken)).safeTransfer(msg.sender, tokensOut);
        
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
        
        require(reserveMatic > 0 && reserveToken > 0, "Liquidity not initialized");
        
        require(reserveMatic >= MIN_LIQUIDITY && reserveToken >= MIN_LIQUIDITY, "Insufficient liquidity");

        uint256 estimatedMaticValue = (tokenAmountIn * reserveMatic) / reserveToken;
        require(estimatedMaticValue <= MAX_SWAP_SIZE, "Swap size too large");
        
        // Transfer tokens from user
        IERC20(address(pplToken)).safeTransferFrom(msg.sender, address(this), tokenAmountIn);
        
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

    /** @notice Withdraw accrued developer fees without coupling game requests to receiver behavior. */
    function withdrawDevFees(uint256 amount) external nonReentrant {
        require(msg.sender == devAddress, "Only dev can withdraw");
        require(amount > 0 && amount <= devFeesAccrued, "Invalid dev fee amount");
        devFeesAccrued -= amount;
        (bool success, ) = payable(devAddress).call{value: amount}("");
        require(success, "Dev fee transfer failed");
        emit DevFeesWithdrawn(devAddress, amount);
    }
    
    function setMaxBetTotal(uint256 _maxBetTotal) external onlyOwner {
        require(_maxBetTotal >= 100 ether, "Max bet too low");
        maxBetTotal = _maxBetTotal;
    }
    
    /**
     * @notice Withdraw profits (only available bankroll, not locked)
     */
    function withdrawProfits(uint256 amount) external onlyOwner {
        uint256 available = _freeHouseBankroll();
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
        uint256 protectedFunds = reserveMatic + vaultMatic + totalPendingWithdrawals + devFeesAccrued;
        require(amount <= address(this).balance - protectedFunds, "Insufficient free balance");
        
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
