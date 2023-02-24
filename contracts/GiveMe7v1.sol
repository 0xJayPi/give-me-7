//SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

error GiveMe7v1__NotEnoughEth();
error GiveMe7v1__TransferFailed();
error GiveMe7v1__NotOwner();

/**
 * @title GiveMe7v1, Proxy POC
 * @author @0xJayPi
 * @notice A simple dice game with a Octahedron, get a 7 to win the prize
 * @dev This contract is part of a Proxy POC. v1 is hackeable because it uses on-chain randomness, which is later fixed by implementing CL VRF on v2
 * @custom:poc This is a Proxy POC
 */
contract GiveMe7v1 is Initializable {
    uint256 internal s_nonce;
    uint256 internal s_prize;
    address internal s_owner;

    event Roll(address indexed player, uint256 roll);
    event Winner(address indexed winner, uint256 amount);

    /**
     * @notice Function needed to let the contract receive ETH
     */
    receive() external payable {}

    /**
     * @notice Function initialize() is used instead of the constructor()
     * @dev Initializer is used by the uprades module (hardhat) to indentify this function during deployment
     */
    function initialize() public payable initializer {
        resetPrize();
        s_nonce = 0;
        s_prize = 0;
        s_owner = msg.sender;
    }

    /**
     * @notice Roll the dice using on-chain randomness
     * @dev If not 7, the transaction is reverted
     */
    function rollTheDice() public payable {
        if (msg.value < 0.002 ether) {
            revert GiveMe7v1__NotEnoughEth();
        }

        bytes32 prevHash = blockhash(block.number - 1);
        bytes32 hash = keccak256(abi.encodePacked(prevHash, address(this), s_nonce));
        uint256 roll = uint256(hash) % 9;

        s_nonce++;
        s_prize += ((msg.value * 90) / 100);

        emit Roll(msg.sender, roll);
        console.log("Dice rolled ", roll);

        if (roll != 7) {
            return;
        }

        resetPrize();

        (bool sent, ) = msg.sender.call{value: s_prize}("");
        if (!sent) {
            revert GiveMe7v1__TransferFailed();
        }

        emit Winner(msg.sender, s_prize);
    }

    /** @notice Getter for the nonce
     * @dev I chose to use internal variables and getters for security reasons
     * @return Current nonce
     */
    function getNonce() public view returns (uint256) {
        return s_nonce;
    }

    /** @notice Getter for the prize
     * @dev I chose to use internal variables and getters for security reasons
     * @return Current prize amount
     */
    function getPrize() public view returns (uint256) {
        return s_prize;
    }

    /** @notice Reset the prize when there's a winner
     * @dev Prize resets to 90% of this contract balance
     */
    function resetPrize() private {
        s_prize = ((address(this).balance * 90) / 100);
    }
}
