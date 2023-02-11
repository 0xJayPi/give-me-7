const { ethers, upgrades } = require("hardhat")

module.exports = async function () {
    console.log("------| Deploying Proxy with GiveMe7v1...")
    const giveMe7v1 = await ethers.getContractFactory("GiveMe7v1")

    const proxy = await upgrades.deployProxy(giveMe7v1)
    await proxy.deployed()
    console.log(`Proxy address is ${proxy.address}`)
    console.log("Proxy Deployed!")
}

module.exports.tags = ["v1", "all", "proxy"]
