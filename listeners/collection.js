const ethers = require("ethers")
const address = "0x59468516a8259058bad1ca5f8f4bff190d30e066"
const abi = require("../abis/ERC721.json")
// const { Provider } = require("../utils/provider")
const { Moralis } = require("../utils/Moralis")

module.exports = async () => {
  try {
    const options = { address, chain: 'eth' }
    // const transfers = await Moralis.Web3API.token.getContractNFTTransfers(options)
    
    
  } catch (error) {
    console.error(error)
  }
}

// https://speedy-nodes-nyc.moralis.io/886f17949de1effe3749e465/eth/mainnet
