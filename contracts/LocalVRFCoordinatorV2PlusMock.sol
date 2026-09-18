// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/// @dev Deterministic local coordinator. It deliberately exposes fulfillment
/// only to tests and is never a valid production coordinator.
contract LocalVRFCoordinatorV2PlusMock {
    uint256 public nextRequestId = 1;
    mapping(uint256 => address) public consumers;
    mapping(uint256 => bool) public fulfilled;

    function requestRandomWords(VRFV2PlusClient.RandomWordsRequest calldata) external returns (uint256 requestId) {
        requestId = nextRequestId++;
        consumers[requestId] = msg.sender;
    }

    function fulfill(uint256 requestId, uint256 randomness) external {
        address consumer = consumers[requestId];
        require(consumer != address(0), "Unknown request");
        require(!fulfilled[requestId], "Already fulfilled");
        fulfilled[requestId] = true;
        uint256[] memory words = new uint256[](1);
        words[0] = randomness;
        (bool ok, ) = consumer.call(abi.encodeWithSignature("rawFulfillRandomWords(uint256,uint256[])", requestId, words));
        require(ok, "Consumer fulfillment failed");
    }
}
