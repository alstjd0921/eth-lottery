const Lottery = artifacts.require("Lottery");
const assertRevert = require("./assertRevert");
const expectEvent = require("./expectEvent");
const {
  assert
} = require("chai");

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

  describe("Bet", function () {
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

  describe.only('isMatch', function () {
    let blockHash = '0xabec17438e4f0afb9cc8b77ce84bb7fd501497cfa9a1695095247daa5b4b7bcc';

    it('should be BettingResult.Win when two characters match', async () => {
      let matchingResult = await lottery.isMatch('0xab', blockHash);
      console.log('Win match : ', matchingResult);
      assert.equal(matchingResult, 1);
    })

    it('should be BettingResult.Fail when unmatch', async () => {
      let matchingResult = await lottery.isMatch('0xcd', blockHash);
      console.log('Fail match : ', matchingResult);
      assert.equal(matchingResult, 0);
    })

    it('should be BettingResult.Draw when one character match', async () => {
      let matchingResult = await lottery.isMatch('0xaf', blockHash);
      assert.equal(matchingResult, 2);

      matchingResult = await lottery.isMatch('0xfb', blockHash);
      assert.equal(matchingResult, 2);
    })
  })
});