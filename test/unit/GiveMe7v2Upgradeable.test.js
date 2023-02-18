const { assert, expect } = require("chai")
const { ethers, network, deployments, upgrades } = require("hardhat")
const chainId = network.config.chainId
const { networkConfig } = require("../../helper-hardhat-config")
const FUND_LINK = ethers.utils.parseEther("100")

chainId != 31337
    ? describe.skip
    : describe("GiveMe7v2 Unit Testing", () => {
          let proxy, vrfCoordinatorV2Mock, txResponse, txReceipt

          beforeEach(async () => {
              //   console.log("------| Deploying Proxy with GiveMe7v2...")

              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              const vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
              txResponse = await vrfCoordinatorV2Mock.createSubscription()
              txReceipt = await txResponse.wait()
              const subscriptionId = txReceipt.events[0].args.subId
              await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_LINK)
              //   console.log(`Mock subscription complete. Subscription ID: ${subscriptionId}`)

              const arguments = [
                  vrfCoordinatorV2Address,
                  subscriptionId,
                  networkConfig[chainId]["gasLane"],
                  networkConfig[chainId]["callbackGasLimit"],
              ]

              const giveMe7v2 = await ethers.getContractFactory("GiveMe7v2")

              proxy = await upgrades.deployProxy(giveMe7v2, arguments)
              await proxy.deployed()

              txResponse = await vrfCoordinatorV2Mock.addConsumer(subscriptionId, proxy.address)
              txReceipt = await txResponse.wait()
              //   const evtSubId = txReceipt.events[0].args.subId
              //   const evtSubscriber = txReceipt.events[0].args.consumer
              //   console.log(`consumer ${evtSubscriber} subscribed to ${evtSubId}`)

              //   console.log(`Proxy address is ${proxy.address}`)
              //   console.log("Proxy Deployed!")
          })

          //   describe("constructor", async () => {
          //       it("Initializes the contract correctly", async () => {
          //           const vrfAddress = await giveMe7v2.getVrfCoord()
          //           assert.equal(vrfAddress, vrfCoordinatorV2Mock.address)
          //       })
          //   })

          describe("rollTheDice", async () => {
              beforeEach(async () => {
                  txResponse = await proxy.rollTheDice({
                      value: ethers.utils.parseEther("0.01"),
                  })
                  txReceipt = await txResponse.wait()
                  //   console.log(
                  //       `RequestId: ${txReceipt.events[1].args.requestId}. Contract: ${proxy.address}`
                  //   )
              })

              it("Should emit event RequestRandomNumbers", async () => {
                  await expect(txResponse).to.emit(proxy, "RequestRandomNumbers")
                  //   console.log(
                  //       `Random numbers requested, requestId: ${txReceipt.events[1].args.requestId}`
                  //   )
              })

              it("Should fulfillRandomWords", async () => {
                  txResponse = await vrfCoordinatorV2Mock.fulfillRandomWords(
                      txReceipt.events[1].args.requestId,
                      proxy.address
                  )

                  txReceipt = await txResponse.wait()
                  await expect(txResponse).to.emit(proxy, "Roll")
                  //   console.log(txReceipt.events[1].event)
              })
          })

          describe("rollTheDice and find winner", async () => {
              it("Should find a Winner", async () => {
                  //   console.log("Listening for Roll event")
                  let winnerFound = false
                  do {
                      await new Promise(async (resolve, reject) => {
                          proxy.once("Winner", async () => {
                              //   console.log("Winner Found!!")
                              winnerFound = true
                              resolve()
                          })

                          //   console.log("Rolling the Dice")
                          txResponse = await proxy.rollTheDice({
                              value: ethers.utils.parseEther("0.01"),
                          })
                          txReceipt = await txResponse.wait()

                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              txReceipt.events[1].args.requestId,
                              proxy.address
                          )
                          setTimeout(() => {
                              //   console.log("No winner, trying again...")
                              resolve("timeout")
                          }, 10000)
                      })
                  } while (!winnerFound)

                  //   console.log(
                  //       `RequestId: ${txReceipt.events[1].args.requestId}. Contract: ${giveMe7v2.address}`
                  //   )
              })
          })
      })
