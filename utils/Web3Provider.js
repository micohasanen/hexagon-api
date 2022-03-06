const Web3 = require("web3")
const RPC = process.env.NODE_ENV === 'production' ? process.env.RPC_POLYGON :  process.env.RPC_MUMBAI
const currentChain = process.env.NODE_ENV === 'production' ? 'polygon' : 'mumbai'
const Provider = new Web3(new Web3.providers.WebsocketProvider(RPC, 
  {
    clientConfig:{
    maxReceivedFrameSize: 10000000000,
    maxReceivedMessageSize: 10000000000,
    } 
  }
))
Provider.eth.handleRevert = true

module.exports = { Provider, Web3, currentChain }