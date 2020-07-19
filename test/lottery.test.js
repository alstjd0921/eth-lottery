const Lottery = artifacts.require("Lottery");
const assertRevert = require("./assertRevert");
const expectEvent = require("./expectEvent");

contract("Lottery", function ([deployer, user1, user2]) {
  let lottery;
  let bet_block_interval = 3;

  beforeEach(async () => {
    lottery = await Lottery.new();
  });

  it("getPot should return current pot", async () => {
    let pot = await lottery.getPot();
    assert.equal(pot, 0);
  });

  describe.only("Bet", function () {
    it("should fail when the bet money is not 0.005 ETH", async () => {
      // Fail transaction
      // transacntion object {chainId, value, to, from, gas(Limit), gasPrice}
      await assertRevert(
        lottery.bet("0xab", {
          from: user1,
          value: 4 * 10 ** 15,
        })
      );
    });

    it("should put the bet to the bet queue with 1 bet", async () => {
      // Bet
      let receipt = await lottery.bet("0xab", {
        from: user1,
        value: 5 * 10 ** 15,
      });

      let pot = await lottery.getPot();
      assert.equal(pot, 0);

      // Check contract balance == 0.005
      let contractBalance = await web3.eth.getBalance(lottery.address);
      assert.equal(contractBalance, 5 * 10 ** 15);

      // Check bet info
      let currentBlockNumber = await web3.eth.getBlockNumber();
      let bet = await lottery.getBetInfo(0);

      assert.equal(
        bet.answerBlockNumber,
        currentBlockNumber + bet_block_interval
      );
      assert.equal(bet.bettor, user1);
      assert.equal(bet.challs, "0xab");

      // Check event log
      await expectEvent.inLogs(receipt.logs, "BET");
    });
  });
});