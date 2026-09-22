// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPolyPlinkoClaimGame {
    struct GameConfig {
        uint8 rows;
        uint16 balls;
        uint8 risk;
        uint256 betPerBall;
    }

    function playPlinko(GameConfig calldata config) external payable;
    function withdrawPendingPayout() external;
}

/// @dev Test-only receiver used to characterize deferred payout claims.
contract ClaimingPlayer {
    bool public rejectPayout = true;

    function play(address game, uint256 betPerBall) external payable {
        IPolyPlinkoClaimGame(game).playPlinko{value: msg.value}(
            IPolyPlinkoClaimGame.GameConfig(16, 1, 1, betPerBall)
        );
    }

    function setRejectPayout(bool value) external {
        rejectPayout = value;
    }

    function claim(address game) external {
        IPolyPlinkoClaimGame(game).withdrawPendingPayout();
    }

    receive() external payable {
        if (rejectPayout) revert("receiver rejects payout");
    }
}
