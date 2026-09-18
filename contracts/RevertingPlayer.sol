// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPolyPlinkoGame {
    struct GameConfig {
        uint8 rows;
        uint16 balls;
        uint8 risk;
        uint256 betPerBall;
    }

    function playPlinko(GameConfig calldata config) external payable;
}

contract RevertingPlayer {
    function play(address game, uint256 betPerBall) external payable {
        IPolyPlinkoGame(game).playPlinko{value: msg.value}(IPolyPlinkoGame.GameConfig(16, 1, 1, betPerBall));
    }

    receive() external payable { revert("receiver rejects payout"); }
}
