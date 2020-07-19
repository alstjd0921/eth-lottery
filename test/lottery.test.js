const Lottery = artifacts.require("Lottery");
const assertRevert = require('./assertRevert');
const expectEvent = require('./expectEvent');

contract('Lottery', function ([deployer, user1, user2]) {
  let lottery;
  let betAmount = 5 * 10 ** 15;
  let betAmountBN = new web3.utils.BN('5000000000000000');
  let bet_block_interval = 3;
  beforeEach(async () => {
    lottery = await Lottery.new();

  })

  it('getPot should return current pot', async () => {
    let pot = await lottery.getPot();
    assert.equal(pot, 0)
  })

  describe('Bet', function () {
    it('should fail when the bet money is not 0.005 ETH', async () => {
      // Fail transaction
      // transaction object {chainId, value, to, from, gas(Limit), gasPrice}
      await assertRevert(lottery.bet('0xab', {
        from: user1,
        value: 4000000000000000
      }));
    })
    it('should put the bet to the bet queue with 1 bet', async () => {
      let receipt = await lottery.bet('0xab', {
        from: user1,
        value: betAmount
      })

      let pot = await lottery.getPot();
      assert.equal(pot, 0);

      // check contract balance is 0.005
      let contractBalance = await web3.eth.getBalance(lottery.address);
      assert.equal(contractBalance, betAmount)

      // check bet info 
      let currentBlockNumber = await web3.eth.getBlockNumber();

      let bet = await lottery.getBetInfo(0);
      assert.equal(bet.answerBlockNumber, currentBlockNumber + bet_block_interval);
      assert.equal(bet.bettor, user1);
      assert.equal(bet.challs, '0xab')

      // check log
      await expectEvent.inLogs(receipt.logs, 'BET')
    })
  })

  describe('Distribute', function () {
    describe('When the answer is checkable', function () {
      it('should give the user the pot when the answer matches', async () => {
        // 두 글자 다 맞았을 때
        await lottery.setAnswerForTest('0xabec17438e4f0afb9cc8b77ce84bb7fd501497cfa9a1695095247daa5b4b7bcc', {
          from: deployer
        })

        await lottery.betAndDistribute('0xef', {
          from: user2,
          value: betAmount
        }) // 1 -> bet to 4
        await lottery.betAndDistribute('0xef', {
          from: user2,
          value: betAmount
        }) // 2 -> bet to 5
        await lottery.betAndDistribute('0xab', {
          from: user1,
          value: betAmount
        }) // 3 -> bet to 6
        await lottery.betAndDistribute('0xef', {
          from: user2,
          value: betAmount
        }) // 4 -> bet to 7
        await lottery.betAndDistribute('0xef', {
          from: user2,
          value: betAmount
        }) // 5 -> bet to 8
        await lottery.betAndDistribute('0xef', {
          from: user2,
          value: betAmount
        }) // 6 -> bet to 9

        let potBefore = await lottery.getPot(); //  should be 0.01 ETH
        let user1BalanceBefore = await web3.eth.getBalance(user1);

        let receipt7 = await lottery.betAndDistribute('0xef', {
          from: user2,
          value: betAmount
        }) // 7 -> bet to 10  // transfer pot money to user1

        let potAfter = await lottery.getPot(); // should be 0
        let user1BalanceAfter = await web3.eth.getBalance(user1); // should be before + 0.015 ETH

        // check change of pot
        assert.equal(potBefore.toString(), new web3.utils.BN('10000000000000000').toString());
        assert.equal(potAfter.toString(), new web3.utils.BN('0').toString());

        // check winner's balance
        user1BalanceBefore = new web3.utils.BN(user1BalanceBefore);
        assert.equal(user1BalanceBefore.add(potBefore).add(betAmountBN).toString(), new web3.utils.BN(user1BalanceAfter).toString())

      })

      it('should give the user the amount their bet when a single character matches', async () => {
        // when single char matches
        await lottery.setAnswerForTest('0xabec17438e4f0afb9cc8b77ce84bb7fd501497cfa9a1695095247daa5b4b7bcc', {
          from: deployer
        })

        await lottery.betAndDistribute('0xef', {
          from: user2,
          value: betAmount
        }) // 1 -> 4
        await lottery.betAndDistribute('0xef', {
          from: user2,
          value: betAmount
        }) // 2 -> 5
        await lottery.betAndDistribute('0xaf', {
          from: user1,
          value: betAmount
        }) // 3 -> 6
        await lottery.betAndDistribute('0xef', {
          from: user2,
          value: betAmount
        }) // 4 -> 7
        await lottery.betAndDistribute('0xef', {
          from: user2,
          value: betAmount
        }) // 5 -> 8
        await lottery.betAndDistribute('0xef', {
          from: user2,
          value: betAmount
        }) // 6 -> 9

        let potBefore = await lottery.getPot(); //  should be 0.01 ETH
        let user1BalanceBefore = await web3.eth.getBalance(user1);

        let receipt7 = await lottery.betAndDistribute('0xef', {
          from: user2,
          value: betAmount
        }) // 7 -> 10 // transfer pot money to user1

        let potAfter = await lottery.getPot(); // should be 0.01 ETH
        let user1BalanceAfter = await web3.eth.getBalance(user1); // should be before + 0.005 ETH

        // check change of pot
        assert.equal(potBefore.toString(), potAfter.toString());

        // check winner's balance
        user1BalanceBefore = new web3.utils.BN(user1BalanceBefore);
        assert.equal(user1BalanceBefore.add(betAmountBN).toString(), new web3.utils.BN(user1BalanceAfter).toString())
      })

      it('should move stake to pot when the answer does not match at all', async () => {
        // when unmatched
        await lottery.setAnswerForTest('0xabec17438e4f0afb9cc8b77ce84bb7fd501497cfa9a1695095247daa5b4b7bcc', {
          from: deployer
        })

        await lottery.betAndDistribute('0xef', {
          from: user2,
          value: betAmount
        }) // 1 -> bet to 4
        await lottery.betAndDistribute('0xef', {
          from: user2,
          value: betAmount
        }) // 2 -> bet to 5
        await lottery.betAndDistribute('0xef', {
          from: user1,
          value: betAmount
        }) // 3 -> bet to 6
        await lottery.betAndDistribute('0xef', {
          from: user2,
          value: betAmount
        }) // 4 -> bet to 7
        await lottery.betAndDistribute('0xef', {
          from: user2,
          value: betAmount
        }) // 5 -> bet to 8
        await lottery.betAndDistribute('0xef', {
          from: user2,
          value: betAmount
        }) // 6 -> bet to 9

        let potBefore = await lottery.getPot(); //  should be 0.01 ETH
        let user1BalanceBefore = await web3.eth.getBalance(user1);

        let receipt7 = await lottery.betAndDistribute('0xef', {
          from: user2,
          value: betAmount
        }) // 7 -> 10 // transfer pot money to user1

        let potAfter = await lottery.getPot(); // should be 0.015 ETH
        let user1BalanceAfter = await web3.eth.getBalance(user1); // should be before

        // check change of pot
        assert.equal(potBefore.add(betAmountBN).toString(), potAfter.toString());

        // check winner's balance
        user1BalanceBefore = new web3.utils.BN(user1BalanceBefore);
        assert.equal(user1BalanceBefore.toString(), new web3.utils.BN(user1BalanceAfter).toString())
      })
    })
  })

  describe('isMatch', function () {
    let blockHash = '0xabec17438e4f0afb9cc8b77ce84bb7fd501497cfa9a1695095247daa5b4b7bcc'
    it('should be BettingResult.Win when two characters match', async () => {

      let matchingResult = await lottery.isMatch('0xab', blockHash);
      assert.equal(matchingResult, 1);
    })

    it('should be BettingResult.Fail when unmatch', async () => {
      let matchingResult = await lottery.isMatch('0xcd', blockHash);
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