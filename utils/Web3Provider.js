const Web3 = require("web3")
const RPC = process.env.NODE_ENV === 'production' ? process.env.RPC_POLYGON :  process.env.RPC_MUMBAI
const currentChain = process.env.NODE_ENV === 'production' ? 'polygon' : 'mumbai'
const Provider = new Web3(RPC)

module.exports = { Provider, Web3, currentChain }