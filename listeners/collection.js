const ABI_ERC721 = require("../abis/ERC721.json")
const { ETHProvider } = require("../utils/ETHProvider")
const { Provider, currentChain } = require("../utils/Web3Provider")
const { Moralis } = require("../utils/Moralis")
const TransferController = require("../controllers/TransferController")

module.exports = async (collection) => {
  try {
    if (collection.chain === currentChain) {
      const contract = new Provider.eth.Contract(ABI_ERC721, collection.address)

      contract.events.Transfer({ fromBlock: 'latest' })
      .on('data', (data) => {
        console.log(data)
      })

      console.log("Setup Listener for", collection.name)
    } 
    /* 
    else if (collection.chain === 'eth') {
      const contract = new ETHProvider.eth.Contract(ABI_ERC721, collection.address)

      const listener = contract.events.allEvents({
        fromBlock: 0
      })

      listener.on('data', (data) => {
       if (data.event === 'Transfer') {
          delete data.signature
          TransferController.add({ 
            ...data, 
            fromAddress: data.returnValues.from,
            toAddress: data.returnValues.to,
            tokenId: data.returnValues.tokenId,
            tokenAddress: data.address 
          })
       }
      })

      console.log("Setup Listener for", collection.name)
    }
    */
  } catch (error) {
    console.error(error)
  }
}

// https://speedy-nodes-nyc.moralis.io/886f17949de1effe3749e465/eth/mainnet
