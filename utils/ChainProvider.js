const Web3 = require("web3")
const config = {
  clientConfig:{
  maxReceivedFrameSize: 10000000000,
  maxReceivedMessageSize: 10000000000,
  } 
}

const MumbaiProvider = new Web3(process.env.RPC_MUMBAI)
const PolygonProvider = new Web3(process.env.RPC_POLYGON)
const ETHProvider = new Web3(process.env.RPC_ETH)

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