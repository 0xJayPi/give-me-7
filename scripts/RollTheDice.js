const { ethers, networl } = require("hardhat")

async function mockVRF() {
    const giveMe7v2 = await ethers.getContract("GiveMe7v2")
    const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")

    const txResponse = await giveMe7v2.rollTheDice({ value: ethers.utils.parseEther("0.1") })
    const txReceipt = await txResponse.wait()
    const requestId = txReceipt.events[1].args.requestId

    console.log(`Random numbers requested, ID: ${requestId}`)

    const txResponseM = await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, giveMe7v2.address)
    const txReceiptM = await txResponseM.wait()
    console.log(
        `requestId: ${txReceiptM.events[1].args.requestId}`,
        "\t",
        `outPutSeed: ${txReceiptM.events[1].args.outPutSeed}`,
        "\t",
        `payment: ${txReceiptM.events[1].args.payment}`,
        "\t",
        `success: ${txReceiptM.events[1].args.success}`
    )
    console.log("Random Numbers fulfilled!!")
}

mockVRF()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
