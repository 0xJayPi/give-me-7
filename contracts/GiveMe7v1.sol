//SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

error GiveMe7v1__NotEnoughEth();
error GiveMe7v1__TransferFailed();

contract GiveMe7v1 is Initializable {
    uint256 public nonce;
    uint256 public prize;

    event Roll(address indexed player, uint256 roll);
    event Winner(address winner, uint256 amount);

    function initialize() public payable initializer {
        resetPrize();
        nonce = 0;
        prize = 0;
    }

    function resetPrize() private {
        prize = ((address(this).balance * 10) / 100);
    }

    function rollTheDice() public payable {
        if (msg.value < 0.002 ether) {
            revert GiveMe7v1__NotEnoughEth();
        }

        bytes32 prevHash = blockhash(block.number - 1);
        bytes32 hash = keccak256(abi.encodePacked(prevHash, address(this), nonce));
        uint256 roll = uint256(hash) % 8;

        nonce++;
        prize += ((msg.value * 40) / 100);

        emit Roll(msg.sender, roll);
        console.log("Dice rolled ", roll);

        if (roll != 7) {
            return;
        }

        uint256 amount = prize;
        (bool sent, ) = msg.sender.call{value: amount}("");
        if (!sent) {
            revert GiveMe7v1__TransferFailed();
        }

        resetPrize();
        emit Winner(msg.sender, amount);
    }

    receive() external payable {}
}
