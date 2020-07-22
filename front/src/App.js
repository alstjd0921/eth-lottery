import React, { Component } from 'react';
import './App.css';

import Web3 from 'web3';

let lotteryAddress = '0xd8C338bE0bc58Ab271f60833d497EA47b2CeF0A2';
let lotteryABI = [ { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [ { "indexed": false, "internalType": "uint256", "name": "index", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "bettor", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "bytes1", "name": "challs", "type": "bytes1" }, { "indexed": false, "internalType": "uint256", "name": "answerBlockNumber", "type": "uint256" } ], "name": "BET", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": false, "internalType": "uint256", "name": "index", "type": "uint256" }, { "indexed": false, "internalType": "address", "name": "bettor", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "bytes1", "name": "challs", "type": "bytes1" }, { "indexed": false, "internalType": "bytes1", "name": "answer", "type": "bytes1" }, { "indexed": false, "internalType": "uint256", "name": "answerBlockNumber", "type": "uint256" } ], "name": "DRAW", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": false, "internalType": "uint256", "name": "index", "type": "uint256" }, { "indexed": false, "internalType": "address", "name": "bettor", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "bytes1", "name": "challs", "type": "bytes1" }, { "indexed": false, "internalType": "bytes1", "name": "answer", "type": "bytes1" }, { "indexed": false, "internalType": "uint256", "name": "answerBlockNumber", "type": "uint256" } ], "name": "FAIL", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": false, "internalType": "uint256", "name": "index", "type": "uint256" }, { "indexed": false, "internalType": "address", "name": "bettor", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "bytes1", "name": "challs", "type": "bytes1" }, { "indexed": false, "internalType": "uint256", "name": "answerBlockNumber", "type": "uint256" } ], "name": "REFUND", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": false, "internalType": "uint256", "name": "index", "type": "uint256" }, { "indexed": false, "internalType": "address", "name": "bettor", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "bytes1", "name": "challs", "type": "bytes1" }, { "indexed": false, "internalType": "bytes1", "name": "answer", "type": "bytes1" }, { "indexed": false, "internalType": "uint256", "name": "answerBlockNumber", "type": "uint256" } ], "name": "WIN", "type": "event" }, { "inputs": [], "name": "answerForTest", "outputs": [ { "internalType": "bytes32", "name": "", "type": "bytes32" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "bytes1", "name": "challs", "type": "bytes1" } ], "name": "bet", "outputs": [ { "internalType": "bool", "name": "result", "type": "bool" } ], "stateMutability": "payable", "type": "function" }, { "inputs": [ { "internalType": "bytes1", "name": "challs", "type": "bytes1" } ], "name": "betAndDistribute", "outputs": [ { "internalType": "bool", "name": "result", "type": "bool" } ], "stateMutability": "payable", "type": "function" }, { "inputs": [], "name": "distribute", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "uint256", "name": "index", "type": "uint256" } ], "name": "getBetInfo", "outputs": [ { "internalType": "uint256", "name": "answerBlockNumber", "type": "uint256" }, { "internalType": "address", "name": "bettor", "type": "address" }, { "internalType": "bytes1", "name": "challs", "type": "bytes1" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getPot", "outputs": [ { "internalType": "uint256", "name": "pot", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "bytes1", "name": "challs", "type": "bytes1" }, { "internalType": "bytes32", "name": "answer", "type": "bytes32" } ], "name": "isMatch", "outputs": [ { "internalType": "enum Lottery.BettingResult", "name": "", "type": "uint8" } ], "stateMutability": "pure", "type": "function" }, { "inputs": [], "name": "owner", "outputs": [ { "internalType": "address payable", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "bytes32", "name": "answer", "type": "bytes32" } ], "name": "setAnswerForTest", "outputs": [ { "internalType": "bool", "name": "result", "type": "bool" } ], "stateMutability": "nonpayable", "type": "function" } ];

class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      betRecords: [],
      winRecords: [],
      failRecords: [],
      pot: 'N/A',
      challs: ['A', 'B'],
      finalRecords: [{
        bettor:'N/A',
        index:'N/A',
        challs:'N/A',
        answer:'N/A',
        targetBlockNumber:'N/A',
        pot:'N/A'
      }]
    }
  }
  async componentDidMount() {
    await this.initWeb3();
    // await this.pollData();
    setInterval(this.pollData, 1000);
  }

  pollData = async () => {
    await this.getPot();
    await this.getBetEvents();
    await this.getWinEvents();
    await this.getFailEvents();
    this.makeFinalRecords();

  }

  initWeb3 = async () => {
    if (window.ethereum) {
      console.log('Recent mode')
      this.web3 = new Web3(window.ethereum);
      try {
          // Request account access if needed
          await window.ethereum.enable();
          // Acccounts now exposed
          // this.web3.eth.sendTransaction({/* ... */});
      } catch (error) {
          // User denied account access...
          console.log(`User denied account access error : ${error}`)
      }
    } else {
      console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    }

    let accounts = await this.web3.eth.getAccounts();
    this.account = accounts[0];

    this.lotteryContract = new this.web3.eth.Contract(lotteryABI, lotteryAddress);
    
  }

  getPot = async () => {
    
    let pot = await this.lotteryContract.methods.getPot().call();
    let potString = this.web3.utils.fromWei(pot.toString(), 'ether');
    this.setState({pot:potString})

  }

  makeFinalRecords = () => {

    let f = 0, w = 0;
    const records = [...this.state.betRecords];
    for(let i=0;i<this.state.betRecords.length;i+=1) {
      if(this.state.winRecords.length > 0 && this.state.betRecords[i].index === this.state.winRecords[w].index){
        records[i].win = 'WIN'
        records[i].answer = records[i].challs;
        records[i].pot = this.web3.utils.fromWei(this.state.winRecords[w].amount, 'ether');
        if(this.state.winRecords.length - 1 > w) w++;

      } else if(this.state.failRecords.length > 0 && this.state.betRecords[i].index === this.state.failRecords[f].index){
        
        records[i].win = 'FAIL'
        records[i].answer = this.state.failRecords[f].answer;
        records[i].pot = 0;
        if(this.state.failRecords.length - 1 > f) f++;

      } else {
        records[i].answer = 'Not Revealed';
      }
    }

    this.setState({finalRecords:records})
  }

  getBetEvents = async () => {
    const records = [];
    let events = await this.lotteryContract.getPastEvents('BET', {fromBlock:0, toBlock:'latest'});
    
    for(let i=0;i<events.length;i+=1){
      const record = {}
      record.index = parseInt(events[i].returnValues.index, 10).toString();
      record.bettor = events[i].returnValues.bettor.slice(0,4) + '...' + events[i].returnValues.bettor.slice(40,42);
      record.betBlockNumber = events[i].blockNumber;
      record.targetBlockNumber = events[i].returnValues.answerBlockNumber.toString();
      record.challs = events[i].returnValues.challs;
      record.win = 'Not Revealed';
      record.answer = '0xab';
      records.unshift(record);
    }

    this.setState({betRecords:records})
  }

  getFailEvents = async () => {
    const records = [];
    let events = await this.lotteryContract.getPastEvents('FAIL', {fromBlock:0, toBlock:'latest'});
    
    for(let i=0;i<events.length;i+=1){
      const record = {}
      record.index = parseInt(events[i].returnValues.index, 10).toString();
      record.answer = events[i].returnValues.answer;
      records.unshift(record);
    }
    console.log(records);
    this.setState({failRecords:records})
  }

  getWinEvents = async () => {
    const records = [];
    let events = await this.lotteryContract.getPastEvents('WIN', {fromBlock:0, toBlock:'latest'});
    
    for(let i=0;i<events.length;i+=1){
      const record = {}
      record.index = parseInt(events[i].returnValues.index, 10).toString();
      record.amount = parseInt(events[i].returnValues.amount, 10).toString();
      records.unshift(record);
    }
    this.setState({winRecords:records})
  }

  bet = async () => {
    let challs = '0x' + this.state.challs[0].toLowerCase() + this.state.challs[1].toLowerCase();
    let nonce = await this.web3.eth.getTransactionCount(this.account);
    this.lotteryContract.methods.betAndDistribute(challs).send({from:this.account, value:5000000000000000, gas:300000, nonce:nonce})
  }

  onClickCard = (_Character) => {
    this.setState({
      challs : [this.state.challs[1], _Character]
    })
  }

  getCard = (_Character, _cardStyle) => {
    let _card = '';
    if(_Character === '0'){
      _card = '0'
    }
    if(_Character === '1'){
      _card = '1'
    }
    if(_Character === '2'){
      _card = '2'
    }
    if(_Character === '3'){
      _card = '3'
    }
    if(_Character === '4'){
      _card = '4'
    }
    if(_Character === '5'){
      _card = '5'
    }
    if(_Character === '6'){
      _card = '6'
    }
    if(_Character === '7'){
      _card = '7'
    }
    if(_Character === '8'){
      _card = '8'
    }
    if(_Character === '9'){
      _card = '9'
    }
    if(_Character === 'A'){
      _card = 'A'
    }
    if(_Character === 'B'){
      _card = 'B'
    }
    if(_Character === 'C'){
      _card = 'C'
    }
    if(_Character === 'D'){
      _card = 'D'
    }
    if(_Character === 'E'){
      _card = 'E'
    }
    if(_Character === 'F'){
      _card = 'F'
    }

    return (
      <button type='button' className={_cardStyle} onClick = {() => {this.onClickCard(_Character)}}>
          {_card}
      </button>
    )
  }

  render() {
    return (
      <div className="App">
        
        {/* Header - Pot, Betting characters */}
        <div className="container">
          <div className="jumbotron">
            <h1>Lottery Current Pot : {this.state.pot}</h1>
            <br/>
            <br/>
            <p>Betting amount : 0.005 ETH (Fee : amount / 100)</p>
            <p>Your Bet : {this.state.challs[0]} {this.state.challs[1]}</p>
          </div>
        </div>

        {/* Card section */}
        <div className="container">
          <div className="btn-group btn-group-lg">
            {this.getCard('0', 'btn btn-dark')}
            {this.getCard('1', 'btn btn-dark')}
            {this.getCard('2', 'btn btn-dark')}
            {this.getCard('3', 'btn btn-dark')}
            {this.getCard('4', 'btn btn-dark')}
            {this.getCard('5', 'btn btn-dark')}
            {this.getCard('6', 'btn btn-dark')}
            {this.getCard('7', 'btn btn-dark')}
            {this.getCard('8', 'btn btn-dark')}
            {this.getCard('9', 'btn btn-dark')}
            {this.getCard('A', 'btn btn-dark')}
            {this.getCard('B', 'btn btn-dark')}
            {this.getCard('C', 'btn btn-dark')}
            {this.getCard('D', 'btn btn-dark')}
            {this.getCard('E', 'btn btn-dark')}
            {this.getCard('F', 'btn btn-dark')}
          </div>
        </div>
        <br></br>
        <div className="container">
          <button className="btn btn-danger btn-lg" onClick={this.bet}>BET!</button>
        </div>
        <br></br>
        <br></br>
        <div className="container">
          <table className="table table-dark table-striped">
            <thead>
              <tr>
                <th>Index</th>
                <th>Address</th>
                <th>Challenge</th>
                <th>Answer</th>
                <th>Pot</th>
                <th>Status</th>
                <th>AnswerBlockNumber</th>
              </tr>
            </thead>
            <tbody>
              {
                this.state.finalRecords.map((record, index) => {
                  return (
                    <tr key={index}>
                      <td>{record.index}</td>
                      <td>{record.bettor}</td>
                      <td>{record.challs}</td>
                      <td>{record.answer}</td>
                      <td>{record.pot}</td>
                      <td>{record.win}</td>
                      <td>{record.targetBlockNumber}</td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}
// index address challenge answer pot status answerBlockNumber
export default App;
