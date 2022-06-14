const Web3 = require("web3")
const config = require("../config")

function randomRPC (rpcs) {
  return rpcs[Math.floor(Math.random()*rpcs.length)]
}

async function getProvider (chainLabel) {
  const chain = config.chains.find((c) => c.label === chainLabel)
  const RPC = randomRPC(chain.rpcEndpoints)
  const web3 = new Web3(RPC)

  // TODO: implement a check if endpoint is offline

  return web3
}

module.exports = async (chain) => { 
  const currentChain = chain
  const Provider = await getProvider(chain)
  return { Provider, currentChain } 
}