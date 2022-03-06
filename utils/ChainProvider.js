const Web3 = require("web3")
const config = {
  clientConfig:{
  maxReceivedFrameSize: 10000000000,
  maxReceivedMessageSize: 10000000000,
  } 
}

const MumbaiProvider = new Web3(new Web3.providers.WebsocketProvider(process.env.RPC_MUMBAI, config))
const PolygonProvider = new Web3(new Web3.providers.WebsocketProvider(process.env.RPC_POLYGON, config))
const ETHProvider = new Web3(new Web3.providers.WebsocketProvider(process.env.RPC_ETH, config))

function getProvider (chain) {
  switch (chain) {
    case 'mumbai':
      return MumbaiProvider
    case 'polygon':
      return PolygonProvider
    case 'eth':
      return ETHProvider
  }
}

module.exports = (chain) => { 
  const currentChain = chain
  const Provider = getProvider(chain)
  return { Provider, currentChain } 
}