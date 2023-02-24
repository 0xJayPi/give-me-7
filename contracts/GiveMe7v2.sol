//SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "./chainlink/VRFConsumerBaseV2Upgradeable.sol";

error GiveMe7v2__NotEnoughEth();
error GiveMe7v2__TransferFailed();
error GiveMe7v2__NotOwner();

/**
 * @notice GiveMev1Storage is used to faciliate the storage allocation restrictions of proxies
 * @dev I found that the easiest way to avoid storage collisions when having inheritance is to inherit variables from previous instance
 */
contract GiveMe7v1Storage {
    uint256 internal nonce;
    uint256 internal prize;
    address internal owner;
}

/**
 * @title GiveMe7v2, Proxy POC
 * @author @0xJayPi
 * @notice A simple dice game with a Octahedron, get a 7 to win the prize
 * @dev This contract is part of a Proxy POC. v2 solves vulnerability of v1 by implementing CL VRF for randomnness
 * @dev See https://docs.chain.link/vrf/v2/introduction/
 * @custom:poc This is a Proxy POC
 */
contract GiveMe7v2 is Initializable, GiveMe7v1Storage, VRFConsumerBaseV2Upgradeable {
    // TODO: refactor variables (s_, i_, etc.)

    // This mapping is used to track which address made each request of random number. Thus, who won and who lost
    mapping(uint256 => address) players;

    // Chainlink VRF Variables
    VRFCoordinatorV2Interface private vrfCoordinator;
    uint64 private subscriptionId;
    bytes32 private gasLane;
    uint32 private callbackGasLimit;
    uint16 private REQUEST_CONFIRMATIONS;
    uint32 private NUM_WORDS;

    event RequestRandomNumbers(uint256 indexed requestId);
    event Roll(address indexed player, uint256 roll);
    event Winner(address indexed winner, uint256 amount);

    /**
     * @notice Modifier to limit access to only the owner for functions when added
     * @dev I didn't used the Ownable.sol contract to avoid complicating further the inheritance when using proxies
     */
    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert GiveMe7v2__NotOwner();
        }
        _;
    }

    /**
     * @notice Function needed to let the contract receive ETH
     */
    // TODO: Use fallback()
    receive() external payable {}

    /**
     * @notice This function makes the work of a constructor()
     * @dev I relied to onlyOwner since the initializer doesn't apply when not deploying the first instance
     * @param _vrfCoordinatorV2 Address of the VRF Coordinator contract
     * @param _subscriptionId Subscription ID needed to request random numbers to the VRF Coordinator
     * @param _gasLane A parameter required by the VRF Coordinator
     * @param _callbackGasLimit A parameter required by the VRF Coordinator
     */
    function setVRF(
        address _vrfCoordinatorV2,
        uint64 _subscriptionId,
        bytes32 _gasLane,
        uint32 _callbackGasLimit
    ) public onlyOwner {
        __VRFConsumerBaseV2Upgradeable_init(_vrfCoordinatorV2);
        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        subscriptionId = _subscriptionId;
        gasLane = _gasLane;
        callbackGasLimit = _callbackGasLimit;
        REQUEST_CONFIRMATIONS = 3;
        NUM_WORDS = 1;
    }

    /**
     * @notice Roll the dice using on-chain randomness
     * @dev requestRandomeWords() calls the VRF Coordinator, which then callbacks fulfillRandomWords()
     */
    function rollTheDice() public payable {
        if (msg.value < 0.002 ether) {
            revert GiveMe7v2__NotEnoughEth();
        }

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

        console.log("Random numbers requested");
        console.log(address(this));
        emit RequestRandomNumbers(requestId);
        players[requestId] = msg.sender;
    }

    /**
     * @notice Function that receives true random numbers
     * @dev This function is called back by the VRF Coordinator provide the random number
     * @param requestId The ID of the request sent to the VRF Coordinator
     * @param randomWords An array of random numbers, as many items as requested
     */
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

    /** @notice Getter for the nonce
     * @dev I chose to use internal variables and getters for security reasons
     * @return Current nonce
     */
    function getNonce() public view returns (uint256) {
        return nonce;
    }

    /** @notice Getter for the prize
     * @dev I chose to use internal variables and getters for security reasons
     * @return Current prize
     */
    function getPrize() public view returns (uint256) {
        return prize;
    }

    /** @notice Getter for the VRF Coordinator address
     * @dev I chose to use internal variables and getters for security reasons
     * @return Address of the VRF Coordinator
     */
    function getVrfCoord() public view returns (address) {
        return address(vrfCoordinator);
    }

    /** @notice Reset the prize when there's a winner
     * @dev Prize resets to 90% of this contract balance
     */
    function resetPrize() private {
        prize = ((address(this).balance * 90) / 100);
    }
}
