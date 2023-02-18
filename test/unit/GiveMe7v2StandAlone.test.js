const { assert, expect } = require("chai")
const { ethers, network, deployments } = require("hardhat")
const chainId = network.config.chainId

chainId != 31337
    ? describe.skip
    : describe("GiveMe7v2StandAlone Unit Testing", () => {
          let giveMe7v2, vrfCoordinatorV2Mock, txResponse, txReceipt

          beforeEach(async () => {
              //   await deployments.fixture(["v2", "mocks"])
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              giveMe7v2 = await ethers.getContract("GiveMe7v2StandAlone")
          })

          describe("constructor", async () => {
              it("Initializes the contract correctly", async () => {
                  const vrfAddress = await giveMe7v2.getVrfCoord()
                  assert.equal(vrfAddress, vrfCoordinatorV2Mock.address)
              })
          })

          describe("rollTheDice", async () => {
              beforeEach(async () => {
                  txResponse = await giveMe7v2.rollTheDice({
                      value: ethers.utils.parseEther("0.01"),
                  })
                  txReceipt = await txResponse.wait()
              })

              it("Should emit event RequestRandomNumbers", async () => {
                  await expect(txResponse).to.emit(giveMe7v2, "RequestRandomNumbers")
                  //   console.log(
                  //       `Random numbers requested, requestId: ${txReceipt.events[1].args.requestId}`
                  //   )
              })

              it("Should fulfillRandomWords", async () => {
                  //   console.log("Listening for Roll event")
                  await new Promise(async (resolve, reject) => {
                      giveMe7v2.once("Roll", async () => {
                          //   console.log("Dice rolled!!!")
                          resolve()
                      })

                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          giveMe7v2.address
                      )
                      //   console.log(
                      //       `RequestId: ${txReceipt.events[1].args.requestId}. Contract: ${giveMe7v2.address}`
                      //   )
                  })
              })
          })

          describe("rollTheDice and find winner", async () => {
              it("Should find a Winner", async () => {
                  //   console.log("Listening for Roll event")
                  let winnerFound = false
                  do {
                      await new Promise(async (resolve, reject) => {
                          giveMe7v2.once("Winner", async () => {
                              //   console.log("Winner Found!!")
                              winnerFound = true
                              resolve()
                          })

                          //   console.log("Rolling the Dice")
                          txResponse = await giveMe7v2.rollTheDice({
                              value: ethers.utils.parseEther("0.01"),
                          })
                          txReceipt = await txResponse.wait()

                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              txReceipt.events[1].args.requestId,
                              giveMe7v2.address
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