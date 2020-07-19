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

    // Store the bet to the queue

    // Distribute
    // check the result

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
        b.bettor = msg.sender;
        b.answerBlockNumber = block.number + BET_BLOCK_INTERVAL;
        b.challs = challs;

        _bets[_tail] = b;
        _tail++;

        return true;
    }

    function popBet(uint256 index) internal returns (bool) {
        delete _bets[index];
        return true;
    }
}
