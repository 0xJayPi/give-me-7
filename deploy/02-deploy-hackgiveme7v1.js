const { ethers } = require("hardhat")

module.exports = async function () {
    const { deploy } = deployments

    const deployer = (await getNamedAccounts()).deployer
    const accounts = await ethers.getSigners()
    const user = accounts[1]

    const giveMe7v1 = await deploy("GiveMe7v1Standalone", {
        from: deployer,
        log: true,
    })

    const riggedRoll = await deploy("RiggedRoll", {
        from: deployer,
        args: [giveMe7v1.address],
        log: true,
    })

    await user.sendTransaction({
        to: riggedRoll.address,
        value: ethers.utils.parseEther("10"),
    })
}

module.exports.tags = ["hackv1", "all"]
