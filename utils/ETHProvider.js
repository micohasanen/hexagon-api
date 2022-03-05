const Web3 = require("web3")
const RPC = process.env.RPC_ETH
const currentChain = 'eth'
const ETHProvider = new Web3(new Web3.providers.WebsocketProvider(RPC, 
    {
      clientConfig:{
      maxReceivedFrameSize: 10000000000,
      maxReceivedMessageSize: 10000000000,
      } 
    }
  ))

module.exports = { ETHProvider, Web3, currentChain }