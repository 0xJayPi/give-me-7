const { ethers, upgrades } = require("hardhat")
const { networkConfig } = require("../helper-hardhat-config")
const FUND_LINK = ethers.utils.parseEther("100")

module.exports = async function () {
    console.log("------| Deploying Proxy with GiveMe7v2...")
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock, txResponse, txReceipt

    if (chainId == 31337) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        txResponse = await vrfCoordinatorV2Mock.createSubscription()
        txReceipt = await txResponse.wait()
        subscriptionId = txReceipt.events[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_LINK)
        console.log(`Mock subscription complete. Subscription ID: ${subscriptionId}`)
    }

    const arguments = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId]["gasLane"],
        networkConfig[chainId]["callbackGasLimit"],
    ]

    const giveMe7v2 = await ethers.getContractFactory("GiveMe7v2")

    const proxy = await upgrades.deployProxy(giveMe7v2, arguments)
    await proxy.deployed()

    if (chainId == 31337) {
        txResponse = await vrfCoordinatorV2Mock.addConsumer(subscriptionId, proxy.address)
        txReceipt = await txResponse.wait()
        const evtSubId = txReceipt.events[0].args.subId
        const evtSubscriber = txReceipt.events[0].args.consumer
        console.log(`consumer ${evtSubscriber} subscribed to ${evtSubId}`)
    }
    console.log(`Proxy address is ${proxy.address}`)
    console.log("Proxy Deployed!")
}

module.exports.tags = ["v2u", "all", "proxyV2"]
