const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network, upgrades } = require("hardhat")
const chainId = network.config.chainId

chainId != 31337
    ? describe.skip
    : describe("GiveMe7 Unit testing", () => {
          let proxy

          beforeEach(async () => {
              const giveMe7v1 = await ethers.getContractFactory("GiveMe7v1")
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

              it("Should set initial prize", async () => {
                  assert.fail("missing code")
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
                  let tx,
                      receipt,
                      roll,
                      //   prize,
                      nonce

                  beforeEach(async () => {
                      nonce = 0

                      do {
                          tx = await proxy.rollTheDice({ value: ethers.utils.parseEther("0.01") })
                          receipt = await tx.wait()
                          roll = receipt.events[0].args.roll.toString()
                          nonce++
                      } while (roll != 7)
                  })

                  it("Should emit Winner event when rolling a 7", async () => {
                      await expect(tx).to.emit(proxy, "Winner")
                  })

                  it("Should increase nonce", async () => {
                      const newNonce = await proxy.getNonce()
                      assert.equal(newNonce.toString(), nonce.toString())
                  })
              })
          })
      })
