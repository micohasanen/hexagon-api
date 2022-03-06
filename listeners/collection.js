const ABI_ERC721 = require("../abis/ERC721.json")
const GetProvider = require("../utils/ChainProvider")
const { addTransfer } = require("../queue/Queue")

module.exports = async (collection) => {
  try {
    const { Provider } = GetProvider(collection.chain)
    const contract = new Provider.eth.Contract(ABI_ERC721, collection.address)
    const listener = contract.events.allEvents({
      fromBlock: 'latest'
    })

    listener.on('data', (data) => {
      if (data.event === 'Transfer') {
        delete data.signature
        addTransfer({
          ...data,
          chain: collection.chain,
          fromAddress: data.returnValues.from,
          toAddress: data.returnValues.to,
          tokenId: data.returnValues.tokenId,
          tokenAddress: data.address 
        })
      }
    })

    console.log("Setup listener for", collection.name)
  } catch (error) {
    console.error(error)
  }
}

// https://speedy-nodes-nyc.moralis.io/886f17949de1effe3749e465/eth/mainnet
