const Web3 = require("web3")

const MumbaiProvider = new Web3(process.env.RPC_MUMBAI)
const PolygonProvider = new Web3(process.env.RPC_POLYGON)
const ETHProvider = new Web3(process.env.RPC_ETH)
const AVAXProvider = new Web3(process.env.RPC_AVAX)
const BSCProvider = new Web3(process.env.RPC_BSC)

function getProvider (chain) {
  switch (chain) {
    case 'mumbai':
      return MumbaiProvider
    case 'polygon':
      return PolygonProvider
    case 'eth':
      return ETHProvider
    case 'avalanche':
      return AVAXProvider
    case 'bsc':
      return BSCProvider
  }
}

module.exports = (chain) => { 
  const currentChain = chain
  const Provider = getProvider(chain)
  return { Provider, currentChain } 
}