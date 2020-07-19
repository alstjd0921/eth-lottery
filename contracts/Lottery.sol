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

    address public owner;

    uint256 internal constant BLOCK_LIMIT = 256;
    uint256 internal constant BET_BLOCK_INTERVAL = 3;
    uint256 internal constant BET_AMOUNT = 5 * 10**15; // 0.005 ETH

    uint256 private _pot;

    enum BlockStatus {Checkable, NotReavealed, BlockLimitPassed}
    enum BettingResult {Fail, Win, Draw}

    event BET(
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

    // Bet
    /**
     * @dev Bet. User should send 0.005 ETH with 1 byte character.
     * Information that stored in queue will be dealt in distribute function
     * @param challs character that user bet on
     * @return results
     * check function worked well
     */
    function bet(bytes1 challs) public payable returns (bool results) {
        // check ether is sent
        require(msg.value == BET_AMOUNT, "Not enough ETH");

        // push bet to queue
        require(pushBet(challs), "Fail to add a new Bet Info");

        // event log
        emit BET(
            _tail - 1,
            msg.sender,
            msg.value,
            challs,
            block.number + BET_BLOCK_INTERVAL
        );

        return true;
    }

    // Distribute
    function distribute() public {
        BetInfo memory b;
        BlockStatus currBlockStatus;

        uint256 curr;
        for (curr = _head; curr < _tail; curr++) {
            b = _bets[curr];
            currBlockStatus = getBlockStatus(b.answerBlockNumber);

            // Checkable : block.number > answerBlockNumber && block.number - BLOCK_LIMIT < answerBlockNumber
            if (currBlockStatus == BlockStatus.Checkable) {
                // if win, bettor gets pot
                // if fail, bettor's money goes pot
                // if draw, refund bettor's money
            }

            // Uncheckable (Not mined) : block.number <= answerBlockNumber
            if (currBlockStatus == BlockStatus.NotReavealed) {
                break;
            }

            // Uncheckable (Block limit passed) : block.number >= answerBlockNumber + BLOCK_LIMIT
            if (currBlockStatus == BlockStatus.BlockLimitPassed) {
                // refund
                // emit refund event
            }

            popBet(curr);
        }
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
        // challs 0xab          byte
        // answer 0xab....ff 32 bytes

        bytes1 c1 = challs;
        bytes1 c2 = challs;

        bytes1 a1 = answer[0];
        bytes1 a2 = answer[0];

        // Get first char
        c1 = c1 >> 4; // 0xab -> 0x0a
        c1 = c1 << 4; // 0x0a -> 0xa0
        a1 = a1 >> 4;
        a2 = a1 << 4;

        // Get second char
        c2 = c2 << 4; // 0xab -> 0xb0
        c2 = c2 >> 4; // 0xb0 -> 0x0b
        a2 = a2 << 4;
        a2 = a2 >> 4;

        if (a1 == c1 && a2 == c2) {
            return BettingResult.Win;
        }

        if (a1 == c1 || a2 == c2) {
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
            block.number - BLOCK_LIMIT < answerBlockNumber
        ) {
            return BlockStatus.Checkable;
        }

        if (block.number <= answerBlockNumber) {
            return BlockStatus.NotReavealed;
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
        b.answerBlockNumber = block.number + BET_BLOCK_INTERVAL; // 32 byte (20000 gas)
        b.challs = challs; // byte (20000 gas (calc with bettor gas))

        _bets[_tail] = b;
        _tail++; // 32 byte edit (20000 gas)

        return true;
    }

    function popBet(uint256 index) internal returns (bool) {
        delete _bets[index];
        return true;
    }
}
