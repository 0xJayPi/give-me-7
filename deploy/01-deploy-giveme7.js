const { ethers, upgrades } = require("hardhat")

module.exports = async function () {
    const giveMe7v1 = await ethers.getContractFactory("GiveMe7v1")

    const proxy = await upgrades.deployProxy(giveMe7v1)
    await proxy.deployed()
    console.log(`Proxy address is ${proxy.address}`)
}

module.exports.tags = ["v1", "all"]
