// SPDX-License-Identifier: MIT
pragma solidity >=0.4.21 <0.7.0;

contract Lottery {
    struct BetInfo {
        uint256 answerBlockNumber;
        address payable bettor;
        bytes1 challs;
    }

    uint256 private _tail;
    uint256 private _head;
    mapping(uint256 => BetInfo) private _bets;

    address payable public owner;

    uint256 private _pot;
    bool private mode = false; // false: use answer for test, ture: use real block hash
    bytes32 public answerForTest;

    uint256 internal constant BLOCK_LIMIT = 256;
    uint256 internal constant BET_BLOCK_INTERVAL = 3;
    uint256 internal constant BET_AMOUNT = 5 * 10**15; // 0.005 ETH

    enum BlockStatus {Checkable, NotRevealed, BlockLimitPassed}
    enum BettingResult {Fail, Win, Draw}

    event BET(
        uint256 index,
        address indexed bettor,
        uint256 amount,
        bytes1 challs,
        uint256 answerBlockNumber
    );
    event WIN(
        uint256 index,
        address bettor,
        uint256 amount,
        bytes1 challs,
        bytes1 answer,
        uint256 answerBlockNumber
    );
    event FAIL(
        uint256 index,
        address bettor,
        uint256 amount,
        bytes1 challs,
        bytes1 answer,
        uint256 answerBlockNumber
    );
    event DRAW(
        uint256 index,
        address bettor,
        uint256 amount,
        bytes1 challs,
        bytes1 answer,
        uint256 answerBlockNumber
    );
    event REFUND(
        uint256 index,
        address bettor,
        uint256 amount,
        bytes1 challs,
        uint256 answerBlockNumber
    );

    constructor() public {
        owner = msg.sender;
    }

    function getPot() public view returns (uint256 pot) {
        return _pot;
    }

    /**
     * @dev Bet and distribute. User should send 0.005 ETH with 1 byte character.
     * Information that stored in queue will be dealt in distribute function
     * @param challs character that user bet on
     * @return result
     * check function worked well
     */
    function betAndDistribute(bytes1 challs)
        public
        payable
        returns (bool result)
    {
        bet(challs);

        distribute();

        return true;
    }

    /**
     * @dev Bet. User should send 0.005 ETH with 1 byte character.
     * Information that stored in queue will be dealt in distribute function
     * @param challs character that user bet on
     * @return result
     * check function worked well
     */
    function bet(bytes1 challs) public payable returns (bool result) {
        // Check the proper ether is sent
        require(msg.value == BET_AMOUNT, "Not enough ETH");

        // Push bet to the queue
        require(pushBet(challs), "Fail to add a new Bet Info");

        // Emit event
        emit BET(
            _tail - 1,
            msg.sender,
            msg.value,
            challs,
            block.number + BET_BLOCK_INTERVAL
        );

        return true;
    }

    /**
     * @dev check betting result value and distribute pot money
     * Fail: Stake goes pot, Win: Get Pot money, Draw | Unable to check answer: Get only bet amount
     */
    function distribute() public {
        uint256 curr;
        uint256 transferAmount;

        BetInfo memory b;
        BlockStatus currBlockStatus;
        BettingResult currBettingResult;

        for (curr = _head; curr < _tail; curr++) {
            b = _bets[curr];
            currBlockStatus = getBlockStatus(b.answerBlockNumber);
            // Checkable : block.number > AnswerBlockNumber && block.number  <  BLOCK_LIMIT + AnswerBlockNumber 1
            if (currBlockStatus == BlockStatus.Checkable) {
                bytes32 answerBlockHash = getAnswerBlockHash(
                    b.answerBlockNumber
                );
                currBettingResult = isMatch(b.challs, answerBlockHash);
                // if win, bettor gets pot
                if (currBettingResult == BettingResult.Win) {
                    // transfer pot
                    transferAmount = transferAfterPayingFee(
                        b.bettor,
                        _pot + BET_AMOUNT
                    );

                    // pot = 0
                    _pot = 0;

                    // emit WIN
                    emit WIN(
                        curr,
                        b.bettor,
                        transferAmount,
                        b.challs,
                        answerBlockHash[0],
                        b.answerBlockNumber
                    );
                }
                // if fail, bettor's money goes pot
                if (currBettingResult == BettingResult.Fail) {
                    // pot = pot + BET_AMOUNT
                    _pot += BET_AMOUNT;
                    // emit FAIL
                    emit FAIL(
                        curr,
                        b.bettor,
                        0,
                        b.challs,
                        answerBlockHash[0],
                        b.answerBlockNumber
                    );
                }

                // if draw, refund bettor's money
                if (currBettingResult == BettingResult.Draw) {
                    // transfer only BET_AMOUNT
                    transferAmount = transferAfterPayingFee(
                        b.bettor,
                        BET_AMOUNT
                    );

                    // emit DRAW
                    emit DRAW(
                        curr,
                        b.bettor,
                        transferAmount,
                        b.challs,
                        answerBlockHash[0],
                        b.answerBlockNumber
                    );
                }
            }

            // Not Revealed : block.number <= AnswerBlockNumber 2
            if (currBlockStatus == BlockStatus.NotRevealed) {
                break;
            }

            // Block Limit Passed : block.number >= AnswerBlockNumber + BLOCK_LIMIT 3
            if (currBlockStatus == BlockStatus.BlockLimitPassed) {
                // refund
                transferAmount = transferAfterPayingFee(b.bettor, BET_AMOUNT);
                // emit refund
                emit REFUND(
                    curr,
                    b.bettor,
                    transferAmount,
                    b.challs,
                    b.answerBlockNumber
                );
            }

            popBet(curr);
        }
        _head = curr;
    }

    function transferAfterPayingFee(address payable addr, uint256 amount)
        internal
        returns (uint256)
    {
        // uint256 fee = amount / 100;
        uint256 fee = 0;
        uint256 amountWithoutFee = amount - fee;

        // transfer to addr
        addr.transfer(amountWithoutFee);

        // transfer to owner
        owner.transfer(fee);

        return amountWithoutFee;
    }

    function setAnswerForTest(bytes32 answer) public returns (bool result) {
        require(
            msg.sender == owner,
            "Only owner can set the answer for test mode"
        );
        answerForTest = answer;
        return true;
    }

    function getAnswerBlockHash(uint256 answerBlockNumber)
        internal
        view
        returns (bytes32 answer)
    {
        return mode ? blockhash(answerBlockNumber) : answerForTest;
    }

    /**
     * @dev check betting chars match with answer
     * @param challs betting chars
     * @param answer block hash
     * @return result
     */
    function isMatch(bytes1 challs, bytes32 answer)
        public
        pure
        returns (BettingResult)
    {
        bytes1 c1 = challs;
        bytes1 c2 = challs;

        bytes1 a1 = answer[0];
        bytes1 a2 = answer[0];

        // Get first number
        c1 = c1 >> 4; // 0xab -> 0x0a
        c1 = c1 << 4; // 0x0a -> 0xa0
        a1 = a1 >> 4;
        a1 = a1 << 4;

        // Get Second number
        c2 = c2 << 4; // 0xab -> 0xb0
        c2 = c2 >> 4; // 0xb0 -> 0x0b
        a2 = a2 << 4;
        a2 = a2 >> 4;

        if (a1 == c1 && a2 == c2) {
            return BettingResult.Win;
        } else if (a1 == c1 || a2 == c2) {
            return BettingResult.Draw;
        }

        return BettingResult.Fail;
    }

    function getBlockStatus(uint256 answerBlockNumber)
        internal
        view
        returns (BlockStatus)
    {
        if (
            block.number > answerBlockNumber &&
            block.number < BLOCK_LIMIT + answerBlockNumber
        ) {
            return BlockStatus.Checkable;
        }

        if (block.number <= answerBlockNumber) {
            return BlockStatus.NotRevealed;
        }

        if (block.number >= answerBlockNumber + BLOCK_LIMIT) {
            return BlockStatus.BlockLimitPassed;
        }

        return BlockStatus.BlockLimitPassed; // refund when something works wrong
    }

    function getBetInfo(uint256 index)
        public
        view
        returns (
            uint256 answerBlockNumber,
            address bettor,
            bytes1 challs
        )
    {
        BetInfo memory b = _bets[index];
        answerBlockNumber = b.answerBlockNumber;
        bettor = b.bettor;
        challs = b.challs;
    }

    function pushBet(bytes1 challs) internal returns (bool) {
        BetInfo memory b;
        b.bettor = msg.sender; // 20 byte
        b.answerBlockNumber = block.number + BET_BLOCK_INTERVAL; // 32byte  20000 gas
        b.challs = challs; // byte // 20000 gas (calc with b.bettor)

        _bets[_tail] = b;
        _tail++; // 32byte edit 5000 gas

        return true;
    }

    function popBet(uint256 index) internal returns (bool) {
        delete _bets[index];
        return true;
    }
}
