const { assert, expect } = require("chai")
const { BigNumber } = require("ethers")
const { ethers, network, upgrades, getNamedAccounts } = require("hardhat")
const { networkConfig } = require("../../helper-hardhat-config")
const chainId = network.config.chainId
let proxy,
    txResponse,
    txReceipt,
    vrfCoordinatorV2Mock,
    nonce,
    subscriptionId,
    giveMe7v1,
    hackGiveMe7v1,
    provider,
    giveMe7v1Standalone

chainId != 31337
    ? describe.skip
    : describe("GiveMe7 Unit testing", () => {
          beforeEach(async () => {
              //   await deployments.fixture(["v1", "mocks"])

              giveMe7v1 = await ethers.getContractFactory("GiveMe7v1")
              proxy = await upgrades.deployProxy(giveMe7v1)
              await proxy.deployed()

              //   https://stackoverflow.com/questions/69825236/ethers-js-send-money-to-a-smart-contract-receive-function
              //   await proxy.call{ value: ethers.utils.parseEther("1") }("")
              //   const prize = await proxy.getPrize()
              //   console.log(`Initial prize ${prize.toString()}`)

              //   console.log(await proxy.getOwner())

              //   const provider = ethers.getDefaultProvider(network.config.url)
              //   const balance = await provider.getBalance(proxy.address)
              //   console.log(`Contract's balance is ${balance}`)
          })

          describe("initialize", () => {
              it("Variables are initialized to 0", async () => {
                  const nonce = await proxy.getNonce()
                  const prize = await proxy.getPrize()
                  assert.equal(nonce.toString(), "0")
                  assert.equal(prize.toString(), "0")
              })
          })

          describe("rollTheDice", () => {
              it("Should revert if value sent is less than 0.002 ether", async () => {
                  await expect(proxy.rollTheDice({ value: ethers.utils.parseEther("0.001") })).to
                      .be.reverted
              })

              it("Should emit Roll event", async () => {
                  const tx = proxy.rollTheDice({ value: ethers.utils.parseEther("0.01") })
                  await expect(tx).to.emit(proxy, "Roll")
              })

              it("Should increase the nonce", async () => {
                  await proxy.rollTheDice({ value: ethers.utils.parseEther("0.01") })
                  const nonce = await proxy.getNonce()
                  assert.equal(nonce.toString(), "1")
              })

              describe("find a winner", () => {
                  let roll

                  beforeEach(async () => {
                      nonce = 0

                      do {
                          txResponse = await proxy.rollTheDice({
                              value: ethers.utils.parseEther("0.01"),
                          })
                          txReceipt = await txResponse.wait()
                          roll = txReceipt.events[0].args.roll.toString()
                          nonce++
                      } while (roll != 7)
                  })

                  it("Should emit Winner event when rolling a 7", async () => {
                      await expect(txResponse).to.emit(proxy, "Winner")
                  })

                  it("Should increase nonce", async () => {
                      const newNonce = await proxy.getNonce()
                      assert.equal(newNonce.toString(), nonce.toString())
                  })
              })
              describe("Hack GiveMe7v1", () => {
                  beforeEach(async () => {
                      giveMe7v1Standalone = await ethers.getContract("GiveMe7v1Standalone")
                      hackGiveMe7v1 = await ethers.getContract("RiggedRoll")
                      const accounts = await ethers.getSigners()
                      user = accounts[1]
                      provider = await ethers.getDefaultProvider(network.config.url)
                      await hack7()
                  })

                  it("Should emit Roll event", async () => {
                      txResponse = await hackGiveMe7v1.riggedRoll()
                      await expect(txResponse).to.emit(giveMe7v1Standalone, "Roll")
                  })

                  it("Should emit Winner event", async () => {
                      txResponse = await hackGiveMe7v1.riggedRoll()
                      await expect(txResponse).to.emit(giveMe7v1Standalone, "Winner")
                  })
              })
          })

          describe("Should upgrade to GiveMe7v2", () => {
              beforeEach(async () => {
                  await proxy.rollTheDice({ value: ethers.utils.parseEther("0.01") })
                  nonce = await proxy.getNonce()

                  vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
                  txResponse = await vrfCoordinatorV2Mock.createSubscription()
                  txReceipt = await txResponse.wait()
                  subscriptionId = txReceipt.events[0].args.subId
                  await vrfCoordinatorV2Mock.fundSubscription(
                      subscriptionId,
                      ethers.utils.parseEther("100")
                  )

                  const giveMe7v2 = await ethers.getContractFactory("GiveMe7v2")
                  proxy = await upgrades.upgradeProxy(proxy.address, giveMe7v2)

                  txResponse = await proxy.setVRF(
                      vrfCoordinatorV2Mock.address,
                      subscriptionId,
                      networkConfig[chainId]["gasLane"],
                      networkConfig[chainId]["callbackGasLimit"]
                  )
                  await txResponse.wait()

                  txResponse = await vrfCoordinatorV2Mock.addConsumer(
                      subscriptionId,
                      proxy.address
                  )
                  await txResponse.wait()
              })

              describe("GiveMe7v2 Testing", () => {
                  beforeEach(async () => {
                      txResponse = await proxy.rollTheDice({
                          value: ethers.utils.parseEther("0.01"),
                      })
                      txReceipt = await txResponse.wait()
                  })

                  it("Variables are initialized with values from V1", async () => {
                      nonce++
                      const upgrNonce = await proxy.getNonce()
                      assert.equal(nonce.toString(), upgrNonce.toString())
                  })

                  it("Should allow only the Owner to call setVRF", async () => {
                      const user1 = (await getNamedAccounts()).user1
                      await expect(
                          proxy
                              .connect(user1)
                              .setVRF(
                                  vrfCoordinatorV2Mock.address,
                                  subscriptionId,
                                  networkConfig[chainId]["gasLane"],
                                  networkConfig[chainId]["callbackGasLimit"]
                              )
                      ).to.be.revertedWith("GiveMe7v2__NotOwner()")
                  })

                  it("Should RequestRandomNumbers when calling rollTheDice", async () => {
                      await expect(txResponse).to.emit(proxy, "RequestRandomNumbers")
                  })

                  it("Should fulfillRandomWords", async () => {
                      txResponse = await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          proxy.address
                      )
                      await expect(txResponse).to.emit(proxy, "Roll")
                  })

                  it("Should find a Winner", async () => {
                      let winnerFound = false
                      do {
                          await new Promise(async (resolve, reject) => {
                              proxy.once("Winner", async () => {
                                  winnerFound = true
                                  resolve()
                              })

                              txResponse = await proxy.rollTheDice({
                                  value: ethers.utils.parseEther("0.01"),
                              })
                              txReceipt = await txResponse.wait()

                              await vrfCoordinatorV2Mock.fulfillRandomWords(
                                  txReceipt.events[1].args.requestId,
                                  proxy.address
                              )
                              setTimeout(() => {
                                  resolve("timeout")
                              }, 10000)
                          })
                      } while (!winnerFound)
                  })
              })
          })
      })

async function hack7() {
    const provider = await ethers.getDefaultProvider(network.config.url)
    let expectedRoll

    while (true) {
        const latestBlockNumber = await provider.getBlockNumber()
        const block = await provider.getBlock(latestBlockNumber)
        const prevHash = block.hash
        const nonce = await giveMe7v1Standalone.getNonce()

        const hash = ethers.utils.solidityKeccak256(
            ["bytes32", "address", "uint256"],
            [prevHash, giveMe7v1Standalone.address, nonce]
        )

        const bigNum = BigNumber.from(hash)
        expectedRoll = bigNum.mod(9).toString()
        if (expectedRoll == "7") {
            break
        }

        await giveMe7v1Standalone.rollTheDice({ value: ethers.utils.parseEther("0.002") })
    }

    return expectedRoll
}
