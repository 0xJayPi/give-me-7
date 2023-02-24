// TODO: Do I need this contract? If so
// TODO: NatSpec
// TODO: refactor

//SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "hardhat/console.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

error GiveMe7v2__NotEnoughEth();
error GiveMe7v2__TransferFailed();
error GiveMe7v2__NotOwner();

contract GiveMe7v2StandAlone is VRFConsumerBaseV2 {
    /**
     * Todo:
     * 1-Refactor needed for variables, immutable, constants, add s_ for storage
     * 2-resetPrize() in the constructor/initializer?
     */
    uint256 private nonce;
    uint256 private prize;
    mapping(uint256 => address) players;

    // Chainlink VRF Variables
    VRFCoordinatorV2Interface private vrfCoordinator;
    uint64 private subscriptionId;
    bytes32 private gasLane;
    uint32 private callbackGasLimit;
    uint16 private REQUEST_CONFIRMATIONS = 3;
    uint32 private NUM_WORDS = 1;

    event RequestRandomNumbers(uint256 indexed requestId);
    event Roll(address indexed player, uint256 roll);
    event Winner(address indexed winner, uint256 amount);

    receive() external payable {}

    // Payable??
    constructor(
        address _vrfCoordinatorV2,
        uint64 _subscriptionId,
        bytes32 _gasLane,
        uint32 _callbackGasLimit
    ) VRFConsumerBaseV2(_vrfCoordinatorV2) {
        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        subscriptionId = _subscriptionId;
        gasLane = _gasLane;
        callbackGasLimit = _callbackGasLimit;

        resetPrize(); // May be removed
        nonce = 0;
        prize = 0;
    }

    function rollTheDice() public payable {
        if (msg.value < 0.002 ether) {
            revert GiveMe7v2__NotEnoughEth();
        }

        // bytes32 prevHash = blockhash(block.number - 1);
        // bytes32 hash = keccak256(abi.encodePacked(prevHash, address(this), nonce));
        // uint256 roll = uint256(hash) % 9;

        nonce++;
        prize += ((msg.value * 90) / 100);

        // Request random numbers to the VRF Coordinator
        uint256 requestId = vrfCoordinator.requestRandomWords(
            gasLane,
            subscriptionId,
            REQUEST_CONFIRMATIONS,
            callbackGasLimit,
            NUM_WORDS
        );
        emit RequestRandomNumbers(requestId);
        players[requestId] = msg.sender;
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        console.log("fulfillRandomWords called");
        uint256 roll = randomWords[0] % 9;

        emit Roll(msg.sender, roll);
        console.log("Dice rolled ", roll);

        if (roll != 7) {
            return;
        }

        uint256 amount = prize;
        (bool sent, ) = players[requestId].call{value: amount}("");
        if (!sent) {
            revert GiveMe7v2__TransferFailed();
        }

        resetPrize();
        emit Winner(msg.sender, amount);
        console.log("Winner event emitted!");
    }

    function getNonce() public view returns (uint256) {
        return nonce;
    }

    function getPrize() public view returns (uint256) {
        return prize;
    }

    function getVrfCoord() public view returns (address) {
        return address(vrfCoordinator);
    }

    function resetPrize() private {
        prize = ((address(this).balance * 90) / 100);
    }
}
